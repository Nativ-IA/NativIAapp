// =============================================================================
// Rutas del panel de administración del equipo NativIA (/v1/admin/*).
//
// Este módulo no es dueño de ninguna tabla: arma las pantallas pidiendo los
// datos a cada módulo por su index.ts. Todo cambio queda en la auditoría.
//
// Regla que no se negocia (docs/09 §7.2): el admin ve colegios, cuentas de
// adultos, consumo y auditoría. Nunca nombres, respuestas ni conversaciones de
// los niños; de ellos solo hay conteos.
// =============================================================================

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../../shared/config.js';
import { isUniqueViolation } from '../../shared/db.js';
import { problem } from '../../shared/http.js';
import {
  asignarCurso,
  contarCursos,
  crearColegio,
  crearCurso,
  crearSede,
  listarColegios,
  nombresDeColegios,
  obtenerColegio,
  regenerarCodigo,
} from '../instituciones/index.js';
import {
  ROLES_ADULTOS,
  cambiarEstadoAdulto,
  contarAdultosPorColegio,
  crearAdulto,
  describirUsuarios,
  listarAdultos,
  obtenerAdulto,
  restablecerContrasena,
} from '../identidad/index.js';
import { contarEstudiantesPorColegio, contarEstudiantesPorCurso } from '../aprendizaje/index.js';
import { consumoDelMesPorColegio, type ConsumoColegio } from '../tutor/index.js';
import { auditarPlataforma, auditoriaReciente } from '../privacidad/index.js';

const SIN_CONSUMO: ConsumoColegio = {
  interacciones: 0,
  tokensEntrada: 0,
  tokensSalida: 0,
  presupuestosAgotados: 0,
};

/** Costo estimado en dólares, solo si las tarifas están configuradas. */
function costoEstimado(tokensEntrada: number, tokensSalida: number): number | null {
  const pIn = config.PRECIO_USD_MTOK_ENTRADA;
  const pOut = config.PRECIO_USD_MTOK_SALIDA;
  if (pIn === undefined || pOut === undefined) return null;
  return Math.round(((tokensEntrada / 1e6) * pIn + (tokensSalida / 1e6) * pOut) * 100) / 100;
}

function etiquetaCurso(c: { grade: number; section: string }) {
  return `${c.grade}.º ${c.section}`;
}

const TEXTO = z.string().trim().min(1).max(120);

export async function plataformaRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.requireAdmin);

  // ── Colegios, con sus cifras y el consumo del mes ─────────────────────────
  app.get('/admin/schools', async () => {
    const [colegios, cursos, adultos, estudiantes, consumo] = await Promise.all([
      listarColegios(),
      contarCursos(),
      contarAdultosPorColegio(),
      contarEstudiantesPorColegio(),
      consumoDelMesPorColegio(),
    ]);

    const schools = colegios.map((c) => {
      const mes = consumo.get(c.id) ?? SIN_CONSUMO;
      return {
        id: c.id,
        name: c.name,
        daneCode: c.daneCode,
        city: c.city,
        sector: c.sector,
        createdAt: c.createdAt.toISOString(),
        campuses: c._count.campuses,
        classrooms: c._count.classrooms,
        staff: adultos.get(c.id) ?? 0,
        students: estudiantes.get(c.id) ?? 0,
        month: {
          interactions: mes.interacciones,
          inputTokens: mes.tokensEntrada,
          outputTokens: mes.tokensSalida,
          exhaustedBudgets: mes.presupuestosAgotados,
          estimatedCostUsd: costoEstimado(mes.tokensEntrada, mes.tokensSalida),
        },
      };
    });

    const sum = (f: (s: (typeof schools)[number]) => number) =>
      schools.reduce((acc, s) => acc + f(s), 0);
    const inputTokens = sum((s) => s.month.inputTokens);
    const outputTokens = sum((s) => s.month.outputTokens);

    return {
      pricingConfigured: costoEstimado(0, 0) !== null,
      totals: {
        schools: schools.length,
        classrooms: cursos,
        staff: sum((s) => s.staff),
        students: sum((s) => s.students),
        month: {
          interactions: sum((s) => s.month.interactions),
          inputTokens,
          outputTokens,
          exhaustedBudgets: sum((s) => s.month.exhaustedBudgets),
          estimatedCostUsd: costoEstimado(inputTokens, outputTokens),
        },
      },
      schools,
    };
  });

  app.post('/admin/schools', async (req, reply) => {
    const body = z
      .object({
        name: TEXTO,
        daneCode: z.string().trim().max(20).optional(),
        city: TEXTO.default('Bogotá D.C.'),
        sector: z.enum(['oficial', 'no_oficial']),
        campusName: TEXTO,
      })
      .parse(req.body);

    try {
      const colegio = await crearColegio({ ...body, primeraSede: body.campusName });
      await auditarPlataforma({
        actorId: req.user.sub,
        action: 'creacion_colegio',
        targetType: 'institution',
        targetId: colegio.id,
        institutionId: colegio.id,
        context: { name: colegio.name },
      });
      return reply.code(201).send({ id: colegio.id });
    } catch (e) {
      if (isUniqueViolation(e)) {
        return problem(reply, 409, 'Ya existe', 'Ya hay un colegio con ese código DANE.');
      }
      throw e;
    }
  });

  // ── Detalle de un colegio ─────────────────────────────────────────────────
  app.get('/admin/schools/:schoolId', async (req, reply) => {
    const { schoolId } = z.object({ schoolId: z.string() }).parse(req.params);
    const colegio = await obtenerColegio(schoolId);
    if (!colegio) return problem(reply, 404, 'No encontrado', 'Ese colegio no existe.');

    const [adultos, porCurso] = await Promise.all([
      listarAdultos(schoolId),
      contarEstudiantesPorCurso(schoolId),
    ]);
    const nombre = new Map(adultos.map((a) => [a.id, `${a.firstName} ${a.lastName}`]));
    const sede = new Map(colegio.campuses.map((c) => [c.id, c.name]));

    return {
      school: {
        id: colegio.id,
        name: colegio.name,
        daneCode: colegio.daneCode,
        city: colegio.city,
        sector: colegio.sector,
      },
      campuses: colegio.campuses,
      classrooms: colegio.classrooms.map((c) => ({
        id: c.id,
        campusId: c.campusId,
        campusName: sede.get(c.campusId) ?? '',
        label: etiquetaCurso(c),
        grade: c.grade,
        section: c.section,
        shift: c.shift,
        year: c.year,
        joinCode: c.joinCode,
        joinCodeExpires: c.joinCodeExpires?.toISOString() ?? null,
        students: porCurso.get(c.id) ?? 0,
        staff: c.assignments.map((a) => ({
          userId: a.userId,
          name: nombre.get(a.userId) ?? '',
          role: a.role,
        })),
      })),
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

  app.post('/admin/schools/:schoolId/campuses', async (req, reply) => {
    const { schoolId } = z.object({ schoolId: z.string() }).parse(req.params);
    const { name } = z.object({ name: TEXTO }).parse(req.body);
    if (!(await obtenerColegio(schoolId))) {
      return problem(reply, 404, 'No encontrado', 'Ese colegio no existe.');
    }

    const sede = await crearSede(schoolId, name);
    await auditarPlataforma({
      actorId: req.user.sub,
      action: 'creacion_sede',
      targetType: 'campus',
      targetId: sede.id,
      institutionId: schoolId,
      context: { name },
    });
    return reply.code(201).send({ id: sede.id });
  });

  app.post('/admin/schools/:schoolId/classrooms', async (req, reply) => {
    const { schoolId } = z.object({ schoolId: z.string() }).parse(req.params);
    const body = z
      .object({
        campusId: z.string(),
        grade: z.coerce.number().int().min(3).max(5),
        section: z.string().trim().min(1).max(4).toUpperCase(),
        shift: z.enum(['manana', 'tarde', 'unica']),
      })
      .parse(req.body);

    try {
      const curso = await crearCurso({ institutionId: schoolId, ...body });
      if (!curso) return problem(reply, 404, 'No encontrado', 'Esa sede no es de este colegio.');
      await auditarPlataforma({
        actorId: req.user.sub,
        action: 'creacion_curso',
        targetType: 'classroom',
        targetId: curso.id,
        institutionId: schoolId,
        context: { label: etiquetaCurso(curso), shift: curso.shift },
      });
      return reply.code(201).send({ id: curso.id, joinCode: curso.joinCode });
    } catch (e) {
      if (isUniqueViolation(e)) {
        return problem(
          reply,
          409,
          'Ya existe',
          'Ese curso ya existe en esa sede y jornada para este año.',
        );
      }
      throw e;
    }
  });

  app.post('/admin/classrooms/:classroomId/join-code', async (req, reply) => {
    const { classroomId } = z.object({ classroomId: z.string() }).parse(req.params);
    const curso = await regenerarCodigo(classroomId);
    if (!curso) return problem(reply, 404, 'No encontrado', 'Ese curso no existe.');

    await auditarPlataforma({
      actorId: req.user.sub,
      action: 'cambio_codigo_ingreso',
      targetType: 'classroom',
      targetId: curso.id,
      institutionId: curso.institutionId,
    });
    return {
      joinCode: curso.joinCode,
      joinCodeExpires: curso.joinCodeExpires?.toISOString() ?? null,
    };
  });

  // ── Cuentas de adultos ────────────────────────────────────────────────────
  app.post('/admin/schools/:schoolId/staff', async (req, reply) => {
    const { schoolId } = z.object({ schoolId: z.string() }).parse(req.params);
    const body = z
      .object({
        firstName: TEXTO,
        lastName: TEXTO,
        email: z.string().trim().email(),
        role: z.enum(ROLES_ADULTOS),
        classroomId: z.string().optional(),
        assignmentRole: z.enum(['titular', 'apoyo']).default('titular'),
      })
      .parse(req.body);

    if (!(await obtenerColegio(schoolId))) {
      return problem(reply, 404, 'No encontrado', 'Ese colegio no existe.');
    }

    let creado;
    try {
      creado = await crearAdulto({ institutionId: schoolId, ...body });
    } catch (e) {
      if (isUniqueViolation(e)) {
        return problem(reply, 409, 'Ya existe', 'Ya hay una cuenta con ese correo.');
      }
      throw e;
    }

    await auditarPlataforma({
      actorId: req.user.sub,
      action: 'creacion_cuenta',
      targetType: 'user',
      targetId: creado.usuario.id,
      institutionId: schoolId,
      context: { role: body.role },
    });

    if (body.classroomId) {
      const asignacion = await asignarCurso({
        institutionId: schoolId,
        userId: creado.usuario.id,
        classroomId: body.classroomId,
        role: body.assignmentRole,
      });
      if (asignacion) {
        await auditarPlataforma({
          actorId: req.user.sub,
          action: 'asignacion_curso',
          targetType: 'classroom',
          targetId: body.classroomId,
          institutionId: schoolId,
          context: { userId: creado.usuario.id, role: body.assignmentRole },
        });
      }
    }

    // La contraseña temporal sale una sola vez, en esta respuesta.
    return reply.code(201).send({
      user: creado.usuario,
      temporaryPassword: creado.contrasenaTemporal,
    });
  });

  app.post('/admin/staff/:userId/status', async (req, reply) => {
    const { userId } = z.object({ userId: z.string() }).parse(req.params);
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const adulto = await obtenerAdulto(userId);
    if (!adulto) return problem(reply, 404, 'No encontrado', 'Esa cuenta no existe.');

    const r = await cambiarEstadoAdulto(userId, isActive);
    await auditarPlataforma({
      actorId: req.user.sub,
      action: isActive ? 'activacion_cuenta' : 'desactivacion_cuenta',
      targetType: 'user',
      targetId: userId,
      institutionId: adulto.institutionId,
    });
    return r;
  });

  app.post('/admin/staff/:userId/password', async (req, reply) => {
    const { userId } = z.object({ userId: z.string() }).parse(req.params);
    const adulto = await obtenerAdulto(userId);
    if (!adulto) return problem(reply, 404, 'No encontrado', 'Esa cuenta no existe.');

    const temporaryPassword = await restablecerContrasena(userId);
    await auditarPlataforma({
      actorId: req.user.sub,
      action: 'restablecimiento_contrasena',
      targetType: 'user',
      targetId: userId,
      institutionId: adulto.institutionId,
    });
    return { temporaryPassword };
  });

  // ── Auditoría ─────────────────────────────────────────────────────────────
  app.get('/admin/audit', async (req) => {
    const { limit } = z
      .object({ limit: z.coerce.number().int().min(1).max(200).default(100) })
      .parse(req.query);

    const entradas = await auditoriaReciente(limit);
    const [actores, colegios] = await Promise.all([
      describirUsuarios([...new Set(entradas.map((e) => e.actorId).filter((x): x is string => !!x))]),
      nombresDeColegios([
        ...new Set(entradas.map((e) => e.institutionId).filter((x): x is string => !!x)),
      ]),
    ]);

    return {
      entries: entradas.map((e) => {
        const actor = e.actorId ? actores.get(e.actorId) : undefined;
        return {
          id: e.id,
          occurredAt: e.occurredAt.toISOString(),
          actor: actor
            ? { name: `${actor.firstName} ${actor.lastName}`, email: actor.email, role: actor.role }
            : null,
          school: e.institutionId ? (colegios.get(e.institutionId) ?? null) : null,
          action: e.action,
          targetType: e.targetType,
          reason: e.reason,
        };
      }),
    };
  });
}
