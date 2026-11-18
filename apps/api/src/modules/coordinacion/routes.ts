// =============================================================================
// Rutas del panel de coordinación de un colegio (/v1/school/*).
//
// Este módulo no es dueño de ninguna tabla: arma las pantallas pidiendo los
// datos a cada módulo por su index.ts, y todo cambio queda en la auditoría.
// El colegio es siempre el del token (requireCoordinator lo fija).
//
// Qué ve coordinación (docs/09 §7.2): la organización de su colegio (cursos,
// docentes, la lista de estudiantes de cada curso con el estado de su
// autorización) y cifras por curso. El avance y las conversaciones de cada
// niño, no: son del docente titular. Una alerta se abre una por una, con
// motivo, y queda auditada.
// =============================================================================

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { activeInstitutionId } from '../../shared/tenant.js';
import { problem } from '../../shared/http.js';
import {
  asignarCurso,
  obtenerColegio,
  obtenerCurso,
  quitarAsignacion,
  regenerarCodigo,
} from '../instituciones/index.js';
import {
  crearCuentaEstudiante,
  listarAdultos,
  nombresDeUsuarios,
  obtenerAdulto,
} from '../identidad/index.js';
import {
  actividadPorCurso,
  avataresDeCurso,
  cambiarAcceso,
  crearPerfilEstudiante,
  elegirAvatar,
  estudiantesDeCurso,
  estudiantesDelColegio,
  nuevoPin,
  obtenerPerfil,
  retirarEstudiante,
} from '../aprendizaje/index.js';
import {
  audit,
  CANALES_AUTORIZACION,
  estadoAutorizaciones,
  registrarAutorizacion,
  type EstadoAutorizacion,
} from '../privacidad/index.js';
import {
  alertasAbiertasPorCurso,
  alertasDeCurso,
  compararAlertas,
  detalleAlerta,
} from '../analitica/index.js';

const etiquetaCurso = (c: { grade: number; section: string }) => `${c.grade}.º ${c.section}`;

const NOMBRE = z.string().trim().min(1).max(60);
const PARENTESCOS = ['madre', 'padre', 'acudiente', 'otro'] as const;

/** Máximo de estudiantes por envío: un curso de primaria completo. */
export const MAX_ESTUDIANTES_POR_ENVIO = 45;

const SIN_ALERTAS = { critica: 0, media: 0, baja: 0 };

function autorizacion(status: EstadoAutorizacion | undefined): 'otorgado' | 'pendiente' | 'revocado' {
  if (status === 'otorgado') return 'otorgado';
  if (status === 'revocado' || status === 'expirado') return 'revocado';
  return 'pendiente';
}

export async function coordinacionRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.requireCoordinator);

  // ── El colegio de un vistazo ──────────────────────────────────────────────
  app.get('/school', async (_req, reply) => {
    const institutionId = activeInstitutionId();
    const [colegio, adultos, estudiantes, alertas, actividad] = await Promise.all([
      obtenerColegio(institutionId),
      listarAdultos(institutionId),
      estudiantesDelColegio(),
      alertasAbiertasPorCurso(),
      actividadPorCurso(),
    ]);
    if (!colegio) return problem(reply, 404, 'No encontrado', 'Tu colegio no está activo.');

    const estados = await estadoAutorizaciones(estudiantes.map((e) => e.id));
    const porCurso = new Map<string, { students: number; authorized: number; pending: number; revoked: number }>();
    for (const e of estudiantes) {
      const c = porCurso.get(e.classroomId) ?? { students: 0, authorized: 0, pending: 0, revoked: 0 };
      c.students++;
      const a = autorizacion(estados.get(e.id)?.status);
      if (a === 'otorgado') c.authorized++;
      else if (a === 'revocado') c.revoked++;
      else c.pending++;
      porCurso.set(e.classroomId, c);
    }

    const nombre = new Map(adultos.map((a) => [a.id, `${a.firstName} ${a.lastName}`]));
    const sede = new Map(colegio.campuses.map((c) => [c.id, c.name]));

    const classrooms = colegio.classrooms.map((c) => {
      const cifras = porCurso.get(c.id) ?? { students: 0, authorized: 0, pending: 0, revoked: 0 };
      const act = actividad.get(c.id) ?? { completadasMes: 0, activos7Dias: 0 };
      return {
        id: c.id,
        label: etiquetaCurso(c),
        campusName: sede.get(c.campusId) ?? '',
        shift: c.shift,
        joinCode: c.joinCode,
        ...cifras,
        activeLast7Days: act.activos7Dias,
        completedThisMonth: act.completadasMes,
        openAlerts: alertas.get(c.id) ?? SIN_ALERTAS,
        staff: c.assignments.map((a) => ({
          userId: a.userId,
          name: nombre.get(a.userId) ?? '',
          role: a.role,
        })),
      };
    });

    const sum = (f: (c: (typeof classrooms)[number]) => number) =>
      classrooms.reduce((acc, c) => acc + f(c), 0);

    return {
      school: {
        id: colegio.id,
        name: colegio.name,
        daneCode: colegio.daneCode,
        city: colegio.city,
        sector: colegio.sector,
      },
      totals: {
        classrooms: classrooms.length,
        students: sum((c) => c.students),
        authorized: sum((c) => c.authorized),
        unauthorized: sum((c) => c.pending + c.revoked),
        teachers: adultos.filter((a) => a.role === 'teacher' && a.isActive).length,
        activeLast7Days: sum((c) => c.activeLast7Days),
        completedThisMonth: sum((c) => c.completedThisMonth),
        openCriticalAlerts: sum((c) => c.openAlerts.critica),
        classroomsWithoutTitular: classrooms.filter((c) => !c.staff.some((s) => s.role === 'titular'))
          .length,
      },
      classrooms,
      staff: adultos.map((a) => ({
        id: a.id,
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email,
        role: a.role,
        isActive: a.isActive,
        lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
        classrooms: colegio.classrooms
          .filter((c) => c.assignments.some((x) => x.userId === a.id))
          .map(etiquetaCurso),
      })),
    };
  });

  // ── Un curso: docentes, lista de estudiantes y alertas sin contenido ──────
  app.get('/school/classrooms/:classroomId', async (req, reply) => {
    const { classroomId } = z.object({ classroomId: z.string() }).parse(req.params);
    const institutionId = activeInstitutionId();
    const curso = await obtenerCurso(institutionId, classroomId);
    if (!curso) return problem(reply, 404, 'No encontrado', 'Ese curso no es de tu colegio.');

    const [perfiles, adultos, alertas] = await Promise.all([
      estudiantesDeCurso(classroomId),
      listarAdultos(institutionId),
      alertasDeCurso(classroomId),
    ]);
    const [nombres, estados] = await Promise.all([
      nombresDeUsuarios(perfiles.map((p) => p.userId)),
      estadoAutorizaciones(perfiles.map((p) => p.id)),
    ]);
    const adulto = new Map(adultos.map((a) => [a.id, a]));

    const students = perfiles
      .map((p) => {
        const n = nombres.get(p.userId);
        const estado = estados.get(p.id);
        return {
          id: p.id,
          firstName: n?.firstName ?? '',
          lastName: n?.lastName ?? '',
          avatarKey: p.avatarKey,
          consent: autorizacion(estado?.status),
          consentUpdatedAt: estado?.at.toISOString() ?? null,
          isUnlocked: p.isUnlocked,
        };
      })
      .sort((a, b) => a.firstName.localeCompare(b.firstName, 'es'));

    return {
      classroom: {
        id: curso.id,
        label: etiquetaCurso(curso),
        campusName: curso.campus.name,
        shift: curso.shift,
        year: curso.year,
        joinCode: curso.joinCode,
        joinCodeExpires: curso.joinCodeExpires?.toISOString() ?? null,
      },
      staff: curso.assignments.map((a) => {
        const u = adulto.get(a.userId);
        return {
          userId: a.userId,
          name: u ? `${u.firstName} ${u.lastName}` : '',
          role: a.role,
          isActive: u?.isActive ?? false,
        };
      }),
      students,
      // Abiertas primero; dentro de ellas, las críticas (docs/10 §5.2).
      alerts: [...alertas].sort(compararAlertas).map((a) => ({
        id: a.id,
        code: a.code,
        severity: a.severity,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        resolvedAt: a.resolvedAt?.toISOString() ?? null,
      })),
      availableStaff: adultos
        .filter((a) => a.isActive)
        .map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}`, role: a.role })),
    };
  });

  // ── Estudiantes ───────────────────────────────────────────────────────────
  // Cada uno sale con su PIN en claro, UNA vez, para imprimir su tarjeta.
  app.post('/school/classrooms/:classroomId/students', async (req, reply) => {
    const { classroomId } = z.object({ classroomId: z.string() }).parse(req.params);
    const { students } = z
      .object({
        students: z
          .array(z.object({ firstName: NOMBRE, lastName: z.string().trim().max(60).default('') }))
          .min(1)
          .max(MAX_ESTUDIANTES_POR_ENVIO),
      })
      .parse(req.body);

    const curso = await obtenerCurso(activeInstitutionId(), classroomId);
    if (!curso) return problem(reply, 404, 'No encontrado', 'Ese curso no es de tu colegio.');

    // Cuenta (identidad) y perfil (aprendizaje) son de módulos distintos y no
    // van en una transacción: si algo falla a mitad, los ya creados quedan en
    // la lista del curso, bloqueados hasta su autorización.
    const usados = await avataresDeCurso(classroomId);
    const created = [];
    for (const s of students) {
      const avatarKey = elegirAvatar(usados);
      usados.set(avatarKey, (usados.get(avatarKey) ?? 0) + 1);
      const cuenta = await crearCuentaEstudiante(s);
      const perfil = await crearPerfilEstudiante({ userId: cuenta.id, classroomId, avatarKey });
      created.push({
        id: perfil.id,
        firstName: cuenta.firstName,
        lastName: cuenta.lastName,
        avatarKey: perfil.avatarKey,
        pin: perfil.pin,
      });
    }

    await audit({
      actorId: req.user.sub,
      action: 'matricula_estudiantes',
      targetType: 'classroom',
      targetId: classroomId,
      context: { count: created.length },
    });
    return reply.code(201).send({ created });
  });

  app.post('/school/students/:studentId/consent', async (req, reply) => {
    const { studentId } = z.object({ studentId: z.string() }).parse(req.params);
    const body = z
      .object({
        status: z.enum(['otorgado', 'revocado']),
        channel: z.enum(CANALES_AUTORIZACION),
        guardianRelation: z.enum(PARENTESCOS).optional(),
      })
      .parse(req.body);

    const perfil = await obtenerPerfil(studentId);
    if (!perfil) return problem(reply, 404, 'No encontrado', 'Ese estudiante no está en tu colegio.');

    const registro = await registrarAutorizacion({
      studentProfileId: studentId,
      status: body.status,
      channel: body.channel,
      guardianRelation: body.guardianRelation,
      certifiedByUserId: req.user.sub,
    });
    // La autorización decide el acceso (US-09): sin ella, el niño no entra.
    await cambiarAcceso(studentId, body.status === 'otorgado');

    await audit({
      actorId: req.user.sub,
      action: 'cambio_consentimiento',
      targetType: 'student_profile',
      targetId: studentId,
      context: { status: body.status, channel: body.channel, classroomId: perfil.classroomId },
    });
    return {
      consent: registro.status,
      consentUpdatedAt: registro.createdAt.toISOString(),
      isUnlocked: body.status === 'otorgado',
    };
  });

  app.post('/school/students/:studentId/pin', async (req, reply) => {
    const { studentId } = z.object({ studentId: z.string() }).parse(req.params);
    const perfil = await obtenerPerfil(studentId);
    if (!perfil) return problem(reply, 404, 'No encontrado', 'Ese estudiante no está en tu colegio.');

    const pin = await nuevoPin(studentId);
    await audit({
      actorId: req.user.sub,
      action: 'restablecimiento_pin',
      targetType: 'student_profile',
      targetId: studentId,
      context: { classroomId: perfil.classroomId },
    });
    return { pin };
  });

  app.post('/school/students/:studentId/withdraw', async (req, reply) => {
    const { studentId } = z.object({ studentId: z.string() }).parse(req.params);
    const perfil = await obtenerPerfil(studentId);
    if (!perfil) return problem(reply, 404, 'No encontrado', 'Ese estudiante no está en tu colegio.');

    await retirarEstudiante(studentId);
    await audit({
      actorId: req.user.sub,
      action: 'retiro_estudiante',
      targetType: 'student_profile',
      targetId: studentId,
      context: { classroomId: perfil.classroomId },
    });
    return { ok: true };
  });

  // ── Docentes de un curso ──────────────────────────────────────────────────
  app.post('/school/classrooms/:classroomId/staff', async (req, reply) => {
    const { classroomId } = z.object({ classroomId: z.string() }).parse(req.params);
    const body = z
      .object({ userId: z.string(), role: z.enum(['titular', 'apoyo']) })
      .parse(req.body);
    const institutionId = activeInstitutionId();

    const adulto = await obtenerAdulto(body.userId);
    if (!adulto || adulto.institutionId !== institutionId) {
      return problem(reply, 404, 'No encontrado', 'Esa cuenta no es de tu colegio.');
    }
    if (!adulto.isActive) {
      return problem(reply, 409, 'Cuenta desactivada', 'Esa cuenta está desactivada.');
    }

    const asignacion = await asignarCurso({ institutionId, classroomId, ...body });
    if (!asignacion) return problem(reply, 404, 'No encontrado', 'Ese curso no es de tu colegio.');

    await audit({
      actorId: req.user.sub,
      action: 'asignacion_curso',
      targetType: 'classroom',
      targetId: classroomId,
      context: { userId: body.userId, role: body.role },
    });
    return reply.code(201).send({ ok: true });
  });

  app.post('/school/classrooms/:classroomId/staff/:userId/remove', async (req, reply) => {
    const { classroomId, userId } = z
      .object({ classroomId: z.string(), userId: z.string() })
      .parse(req.params);
    const quitadas = await quitarAsignacion({
      institutionId: activeInstitutionId(),
      classroomId,
      userId,
    });
    if (quitadas === 0) {
      return problem(reply, 404, 'No encontrado', 'Esa persona no tiene asignado ese curso.');
    }

    await audit({
      actorId: req.user.sub,
      action: 'retiro_asignacion',
      targetType: 'classroom',
      targetId: classroomId,
      context: { userId },
    });
    return { ok: true };
  });

  app.post('/school/classrooms/:classroomId/join-code', async (req, reply) => {
    const { classroomId } = z.object({ classroomId: z.string() }).parse(req.params);
    if (!(await obtenerCurso(activeInstitutionId(), classroomId))) {
      return problem(reply, 404, 'No encontrado', 'Ese curso no es de tu colegio.');
    }

    const curso = await regenerarCodigo(classroomId);
    if (!curso) return problem(reply, 404, 'No encontrado', 'Ese curso no es de tu colegio.');
    await audit({
      actorId: req.user.sub,
      action: 'cambio_codigo_ingreso',
      targetType: 'classroom',
      targetId: classroomId,
    });
    return {
      joinCode: curso.joinCode,
      joinCodeExpires: curso.joinCodeExpires?.toISOString() ?? null,
    };
  });

  // ── Abrir una alerta: con motivo, y queda en la auditoría ─────────────────
  app.post('/school/alerts/:alertId/review', async (req, reply) => {
    const { alertId } = z.object({ alertId: z.string() }).parse(req.params);
    const { reason } = z
      .object({ reason: z.string().trim().min(10, 'Escribe el motivo (mínimo 10 caracteres).').max(300) })
      .parse(req.body);

    const alerta = await detalleAlerta(alertId);
    if (!alerta) return problem(reply, 404, 'No encontrado', 'Esa alerta no es de tu colegio.');

    const [curso, perfil] = await Promise.all([
      obtenerCurso(activeInstitutionId(), alerta.classroomId),
      alerta.studentProfileId ? obtenerPerfil(alerta.studentProfileId) : null,
    ]);
    const nombre = perfil ? (await nombresDeUsuarios([perfil.userId])).get(perfil.userId) : undefined;

    await audit({
      actorId: req.user.sub,
      action: 'consulta_alerta',
      targetType: 'TeacherAlert',
      targetId: alertId,
      reason,
      context: { role: 'coordinator', classroomId: alerta.classroomId, ip: req.ip },
    });

    return {
      id: alerta.id,
      code: alerta.code,
      severity: alerta.severity,
      status: alerta.status,
      message: alerta.message,
      suggestedAction: alerta.suggestedAction,
      createdAt: alerta.createdAt.toISOString(),
      resolvedAt: alerta.resolvedAt?.toISOString() ?? null,
      resolutionNote: alerta.resolutionNote,
      classroomLabel: curso ? etiquetaCurso(curso) : null,
      student: nombre ?? null,
      auditNotice: 'Tu consulta de esta alerta y su motivo quedan registrados.',
    };
  });
}
