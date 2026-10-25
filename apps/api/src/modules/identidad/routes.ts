import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import argon2 from 'argon2';
import { prisma } from '@nativia/db';

export async function identidadRoutes(app: FastifyInstance) {
  // ── Paso 1 del ingreso del estudiante ──────────────────────────────────────
  app.get('/auth/classroom/:joinCode', async (req, reply) => {
    const { joinCode } = z
      .object({ joinCode: z.string().length(4) })
      .parse(req.params);

    const classroom = await prisma.classroom.findFirst({
      where: { joinCode: joinCode.toUpperCase(), deletedAt: null },
      include: {
        students: {
          where: { deletedAt: null },
          include: { user: true },
          orderBy: { createdAt: 'asc' },
        },
        assignments: {
          where: { role: 'titular', deletedAt: null },
          include: { user: true },
          take: 1,
        },
      },
    });

    if (!classroom) {
      return reply.code(404).type('application/problem+json').send({
        type: 'https://nativia.edu.co/problems/not-found',
        title: 'No encontramos ese código',
        status: 404,
        detail: 'Revisa el código con tu profe.',
      });
    }

    if (classroom.joinCodeExpires && classroom.joinCodeExpires < new Date()) {
      return reply.code(410).type('application/problem+json').send({
        type: 'https://nativia.edu.co/problems/expired-code',
        title: 'Ese código ya no sirve',
        status: 410,
        detail: 'Pídele a tu profe el código de hoy.',
      });
    }

    const titular = classroom.assignments[0]?.user;

    return {
      classroom: {
        id: classroom.id,
        grade: classroom.grade,
        section: classroom.section,
        teacherDisplayName: titular
          ? `${titular.firstName} ${titular.lastName}`
          : null,
      },
      students: classroom.students.map((s) => ({
        studentProfileId: s.id,
        firstName: s.user.firstName,
        lastName: s.user.lastName,
        avatarKey: s.avatarKey,
        requiresPin: s.graphicPinHash !== null,
      })),
    };
  });

  // ── Paso 2: avatar + PIN gráfico ───────────────────────────────────────────
  app.post('/auth/student', async (req, reply) => {
    const body = z
      .object({
        joinCode: z.string().length(4),
        studentProfileId: z.string(),
        graphicPin: z.array(z.string()).length(3).optional(),
        deviceId: z.string().optional(),
      })
      .parse(req.body);

    const profile = await prisma.studentProfile.findFirst({
      where: { id: body.studentProfileId, deletedAt: null },
      include: { user: true, classroom: true },
    });

    if (!profile || profile.classroom.joinCode !== body.joinCode.toUpperCase()) {
      return reply.code(401).type('application/problem+json').send({
        type: 'https://nativia.edu.co/problems/unauthorized',
        title: 'No pudimos entrar',
        status: 401,
        detail: 'Revisa el código y vuelve a intentar.',
      });
    }

    if (profile.graphicPinHash) {
      const ok =
        body.graphicPin &&
        (await argon2.verify(profile.graphicPinHash, body.graphicPin.join('|')));
      if (!ok) {
        return reply.code(401).type('application/problem+json').send({
          type: 'https://nativia.edu.co/problems/unauthorized',
          title: 'Esas no son tus imágenes',
          status: 401,
          detail: 'Intenta de nuevo. Si no te acuerdas, pídele ayuda a tu profe.',
        });
      }
    }

    // La ausencia de consentimiento NO es un error de credenciales: es una
    // condición de acceso (US-09).
    if (!profile.isUnlocked) {
      return reply.code(403).type('application/problem+json').send({
        type: 'https://nativia.edu.co/problems/consent-required',
        title: 'Falta la autorización de tu acudiente',
        status: 403,
        code: 'consent_required',
        detail: 'Todavía no puedes entrar. Tu profe ya lo sabe.',
      });
    }

    const accessToken = app.jwt.sign(
      {
        sub: profile.userId,
        role: 'student',
        studentProfileId: profile.id,
        classroomId: profile.classroomId,
      },
      { expiresIn: '8h' },
    );

    await prisma.user.update({
      where: { id: profile.userId },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      expiresIn: 28800,
      student: {
        studentProfileId: profile.id,
        firstName: profile.user.firstName,
        avatarKey: profile.avatarKey,
        grade: profile.classroom.grade,
        a11ySettings: JSON.parse(profile.a11ySettings || '{}'),
      },
    };
  });

  // ── Docente y coordinación ─────────────────────────────────────────────────
  app.post('/auth/teacher', async (req, reply) => {
    const body = z
      .object({ email: z.string().email(), password: z.string().min(1) })
      .parse(req.body);

    const user = await prisma.user.findFirst({
      where: { email: body.email, deletedAt: null, isActive: true },
      include: {
        assignments: {
          where: { deletedAt: null },
          include: { classroom: true },
        },
      },
    });

    if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, body.password))) {
      return reply.code(401).type('application/problem+json').send({
        type: 'https://nativia.edu.co/problems/unauthorized',
        title: 'Credenciales inválidas',
        status: 401,
      });
    }

    const accessToken = app.jwt.sign(
      { sub: user.id, role: user.role },
      { expiresIn: '12h' },
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      expiresIn: 43200,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        classrooms: user.assignments.map((a) => ({
          classroomId: a.classroomId,
          label: `${a.classroom.grade}.º ${a.classroom.section}`,
          assignmentRole: a.role,
          canViewTranscripts: a.canViewTranscripts,
        })),
      },
    };
  });
}
