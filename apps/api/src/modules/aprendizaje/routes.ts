import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@nativia/db';
import { AXES, findActivity, METACOGNITION_QUESTION, METACOGNITION_SCAFFOLDS } from '../contenido/index.js';
import { recordEvidence } from './mastery.js';

export async function aprendizajeRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.requireStudent);

  // ── Mapa de rutas ──────────────────────────────────────────────────────────
  app.get('/me/path', async (req) => {
    const { studentProfileId } = req.user;

    const profile = await prisma.studentProfile.findUniqueOrThrow({
      where: { id: studentProfileId },
      include: { user: true, classroom: true },
    });

    const activities = await prisma.activity.findMany({
      where: { isPublished: true, deletedAt: null },
      include: { axis: true },
      orderBy: { orderIndex: 'asc' },
    });

    const attempts = await prisma.attempt.findMany({
      where: { studentProfileId, status: 'completado', deletedAt: null },
      select: { activityId: true },
    });
    const done = new Set(attempts.map((a) => a.activityId));

    const badgeCount = await prisma.studentBadge.count({ where: { studentProfileId } });

    return {
      student: {
        firstName: profile.user.firstName,
        avatarKey: profile.avatarKey,
        grade: profile.classroom.grade,
        badgeCount,
      },
      axes: AXES.map((axis) => {
        const inAxis = activities.filter((a) => a.axis.code === axis.code);
        const completed = inAxis.filter((a) => done.has(a.id));
        const next = inAxis.find((a) => !done.has(a.id));
        return {
          code: axis.code,
          displayName: axis.displayName,
          tagline: axis.tagline,
          colorToken: axis.colorToken,
          completed: completed.length,
          total: inAxis.length,
          offlineCapable: axis.offlineCapable,
          nextActivityId: next?.id ?? null,
        };
      }),
    };
  });

  // ── Actividades de un eje ──────────────────────────────────────────────────
  app.get('/axes/:axisCode/activities', async (req) => {
    const { axisCode } = z
      .object({ axisCode: z.enum(['A', 'B', 'C', 'D']) })
      .parse(req.params);
    const { studentProfileId } = req.user;

    const activities = await prisma.activity.findMany({
      where: { isPublished: true, deletedAt: null, axis: { code: axisCode } },
      include: { axis: true },
      orderBy: { orderIndex: 'asc' },
    });

    const attempts = await prisma.attempt.findMany({
      where: { studentProfileId, deletedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    return activities.map((a, i) => {
      const attempt = attempts.find((t) => t.activityId === a.id && t.status === 'completado');
      const prevDone = i === 0 || attempts.some(
        (t) => t.activityId === activities[i - 1]?.id && t.status === 'completado',
      );
      return {
        id: a.id,
        slug: a.slug,
        title: a.title,
        subject: a.subject,
        estimatedMinutes: a.estimatedMinutes,
        // Se informa ANTES de entrar, para que el niño no se frustre a mitad
        // de camino cuando no hay red.
        requiresNetwork: !a.axis.offlineCapable,
        status: attempt ? 'completada' : prevDone ? 'disponible' : 'bloqueada',
        completionQuality: attempt
          ? attempt.hintsUsed > 0
            ? 'con_pistas'
            : 'sin_ayuda'
          : null,
      };
    });
  });

  // ── Contenido de una actividad ─────────────────────────────────────────────
  app.get('/activities/:activityId', async (req, reply) => {
    const { activityId } = z.object({ activityId: z.string() }).parse(req.params);

    const activity = await prisma.activity.findFirst({
      where: { id: activityId, isPublished: true, deletedAt: null },
      include: { axis: true },
    });
    if (!activity) return reply.code(404).send({ title: 'No encontrada', status: 404 });

    const content = findActivity(activity.slug);

    // NUNCA se envían al cliente systemPromptKey ni forbiddenAnswers: enviarlos
    // permitiría al estudiante leer la respuesta que la actividad le pide
    // encontrar.
    return {
      id: activity.id,
      slug: activity.slug,
      title: activity.title,
      axisCode: activity.axis.code,
      subject: activity.subject,
      kind: activity.kind,
      estimatedMinutes: activity.estimatedMinutes,
      pisaCompetence: activity.pisaCompetence,
      dbaReference: activity.dbaReference,
      bloomLevel: activity.bloomLevel,
      payload: sanitizePayload(activity.kind, JSON.parse(activity.payload)),
      // El árbol sí se entrega: es lo que permite completar la actividad sin
      // red. Contiene preguntas y opciones, nunca la respuesta (ADR-005).
      fallbackTree: content?.fallbackTree ?? null,
      metacognition: {
        question: METACOGNITION_QUESTION,
        scaffolds: METACOGNITION_SCAFFOLDS,
      },
    };
  });

  // ── Iniciar intento (idempotente, ADR-007) ─────────────────────────────────
  app.post('/activities/:activityId/attempts', async (req, reply) => {
    const { activityId } = z.object({ activityId: z.string() }).parse(req.params);
    const body = z
      .object({
        clientAttemptId: z.string().uuid(),
        mode: z
          .enum(['online', 'degradado_sin_red', 'degradado_sin_presupuesto', 'mock'])
          .default('online'),
      })
      .parse(req.body);

    const existing = await prisma.attempt.findUnique({
      where: { clientAttemptId: body.clientAttemptId },
    });
    if (existing) return reply.code(200).send(existing);

    const attempt = await prisma.attempt.create({
      data: {
        studentProfileId: req.user.studentProfileId,
        activityId,
        clientAttemptId: body.clientAttemptId,
        mode: body.mode,
      },
    });
    return reply.code(201).send(attempt);
  });

  // ── Cerrar intento ─────────────────────────────────────────────────────────
  app.post('/attempts/:attemptId/complete', async (req, reply) => {
    const { attemptId } = z.object({ attemptId: z.string() }).parse(req.params);
    const body = z
      .object({
        isCorrect: z.boolean().optional(),
        hintsUsed: z.number().int().min(0).default(0),
        hasValidJustification: z.boolean().default(false),
        independentVerification: z.boolean().default(false),
        verificationNote: z.string().max(500).optional(),
        metacognition: z.object({
          inputMode: z.enum(['texto', 'voz', 'opcion_andamiaje']).default('texto'),
          text: z.string().max(1000).default(''),
          scaffoldTags: z.array(z.string()).default([]),
        }),
      })
      .safeParse(req.body);

    // La respuesta metacognitiva es una regla pedagógica, aplicada en el
    // servidor y no solo en la interfaz (US-03).
    if (!body.success) {
      return reply.code(422).type('application/problem+json').send({
        type: 'https://nativia.edu.co/problems/metacognition-required',
        title: 'Falta la última pregunta',
        status: 422,
        detail: 'Cuéntanos qué aprendiste sobre cómo tú piensas.',
      });
    }
    const data = body.data;
    if (!data.metacognition.text.trim() && data.metacognition.scaffoldTags.length === 0) {
      return reply.code(422).type('application/problem+json').send({
        type: 'https://nativia.edu.co/problems/metacognition-required',
        title: 'Falta la última pregunta',
        status: 422,
        detail: 'Escribe algo o elige una de las frases. No se califica.',
      });
    }

    const attempt = await prisma.attempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: { activity: { include: { axis: true } } },
    });
    if (attempt.studentProfileId !== req.user.studentProfileId) {
      return reply.code(403).send({ title: 'No es tu intento', status: 403 });
    }

    const updated = await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        status: 'completado',
        completedAt: new Date(),
        durationSeconds: Math.round((Date.now() - attempt.startedAt.getTime()) / 1000),
        isCorrect: data.isCorrect ?? null,
        hintsUsed: data.hintsUsed,
        hasValidJustification: data.hasValidJustification,
        independentVerification: data.independentVerification,
        verificationNote: data.verificationNote ?? null,
      },
    });

    await prisma.metacognitionResponse.upsert({
      where: { attemptId },
      update: {
        text: data.metacognition.text,
        inputMode: data.metacognition.inputMode,
        scaffoldTags: data.metacognition.scaffoldTags.join('|') || null,
      },
      create: {
        attemptId,
        text: data.metacognition.text,
        inputMode: data.metacognition.inputMode,
        scaffoldTags: data.metacognition.scaffoldTags.join('|') || null,
      },
    });

    const mastery = await recordEvidence({
      studentProfileId: req.user.studentProfileId,
      pisaCompetence: attempt.activity.pisaCompetence,
      axisCode: attempt.activity.axis.code,
      activityId: attempt.activityId,
      isCorrect: data.isCorrect ?? false,
      hasValidJustification: data.hasValidJustification,
    });

    const badgesEarned = await awardBadges(req.user.studentProfileId, data);

    return { attempt: updated, badgesEarned, masteryUpdates: [mastery] };
  });

  // ── Panel de transparencia infantil (US-10) ────────────────────────────────
  app.get('/me/transparency', async (req) => {
    const profile = await prisma.studentProfile.findUniqueOrThrow({
      where: { id: req.user.studentProfileId },
      include: {
        classroom: {
          include: {
            assignments: {
              where: { role: 'titular', deletedAt: null },
              include: { user: true },
              take: 1,
            },
          },
        },
      },
    });
    const titular = profile.classroom.assignments[0]?.user;

    return {
      stored: [
        { icon: 'user', what: 'Tu nombre y tu curso', why: 'Para saber que eres tú' },
        { icon: 'target', what: 'Las actividades que haces', why: 'Para mostrarte tu avance' },
        { icon: 'message', what: 'Lo que hablas con el tutor', why: 'Tu profe puede leerlo' },
        { icon: 'pencil', what: 'Lo que escribes al final', why: 'Para que tu profe te ayude' },
      ],
      neverStored: ['Tu foto', 'Tu dirección', 'Tu teléfono'],
      whoCanSee: [
        titular
          ? `Tu profe ${titular.firstName} puede ver lo que hablas con el tutor. No es un secreto: es para poder ayudarte mejor.`
          : 'Tu profe puede ver lo que hablas con el tutor.',
      ],
    };
  });
}

/**
 * Quita del payload lo que revela la respuesta, SALVO donde la corrección tiene
 * que ocurrir en el dispositivo.
 *
 * Los ejes A, C y D deben funcionar completos sin conexión (decisión del
 * cliente y requisito E-05), y eso obliga a que la validación sea local: sin
 * red no hay a quién preguntarle si la respuesta es correcta. Por tanto
 * `isSynthetic` y `validSignals` VIAJAN al cliente.
 *
 * Tensión aceptada y declarada: un estudiante con curiosidad técnica puede
 * leerlas en las herramientas del navegador. Se acepta por tres razones:
 *   1. Sin ellas no hay modo offline, que es el requisito más duro del aula.
 *   2. En los ejes C y D, acertar NO cuenta para el dominio si no se acompaña
 *      de una justificación válida (US-02) — espiar el booleano no da la señal
 *      que se pide justificar.
 *   3. Un intento resuelto sin justificación queda visible para el docente.
 *
 * El tutor socrático es distinto: ahí la respuesta NUNCA sale del servidor
 * (ADR-004), porque no hay corrección local que dependa de ella.
 */
function sanitizePayload(kind: string, payload: any): any {
  if (kind === 'tutor_socratico') {
    const { errorDescription, ...rest } = payload;
    return rest; // el error se describe solo para el tutor, nunca para el niño
  }
  return payload;
}

async function awardBadges(studentProfileId: string, data: { independentVerification: boolean }) {
  const earned: Array<{ slug: string; name: string; description: string; iconKey: string }> = [];
  if (!data.independentVerification) return earned;

  const badge = await prisma.badge.findUnique({ where: { slug: 'verificador' } });
  if (!badge) return earned;

  const already = await prisma.studentBadge.findUnique({
    where: { studentProfileId_badgeId: { studentProfileId, badgeId: badge.id } },
  });
  if (already) return earned;

  await prisma.studentBadge.create({ data: { studentProfileId, badgeId: badge.id } });
  earned.push({
    slug: badge.slug,
    name: badge.name,
    description: badge.description,
    iconKey: badge.iconKey,
  });
  return earned;
}
