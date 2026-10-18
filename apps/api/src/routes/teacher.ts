import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@nativia/db';
import { AXES } from '@nativia/content';
import { computeTriage } from '../modules/progress/triage.js';
import { audit } from '../lib/audit.js';

export async function teacherRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.requireStaff);

  // ── Inicio del panel — la prueba de los 60 segundos ────────────────────────
  app.get('/classrooms/:classroomId/overview', async (req, reply) => {
    const { classroomId } = z.object({ classroomId: z.string() }).parse(req.params);
    if (!(await canAccessClassroom(req.user.sub, classroomId))) {
      return forbidden(reply);
    }

    const triage = await computeTriage(classroomId);

    const alerts = await prisma.teacherAlert.findMany({
      where: { classroomId, status: 'abierta', deletedAt: null },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      take: 3, // techo de 3: diez alertas equivalen a ninguna
    });

    const moderationPending = await prisma.teacherAlert.count({
      where: { classroomId, code: 'A-RIESGO', status: 'abierta' },
    });

    const highlights = await computeHighlights(classroomId);

    return {
      computedAt: new Date().toISOString(),
      needHelpToday: triage,
      groupHighlights: highlights,
      alerts: alerts.map(serializeAlert),
      moderationPending,
    };
  });

  // ── Vista de grupo ─────────────────────────────────────────────────────────
  app.get('/classrooms/:classroomId/heatmap', async (req, reply) => {
    const { classroomId } = z.object({ classroomId: z.string() }).parse(req.params);
    if (!(await canAccessClassroom(req.user.sub, classroomId))) return forbidden(reply);

    const students = await prisma.studentProfile.findMany({
      where: { classroomId, deletedAt: null },
      include: { user: true, mastery: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      columns: AXES.map((a) => ({
        key: a.code,
        label: a.displayName,
        glossary: a.name,
      })),
      rows: students.map((s) => ({
        studentProfileId: s.id,
        firstName: s.user.firstName,
        avatarKey: s.avatarKey,
        cells: AXES.map((a) => {
          const scores = s.mastery.filter((m) => m.axisCode === a.code);
          const opportunities = scores.reduce((acc, m) => acc + m.opportunities, 0);
          // Con menos de 2 oportunidades el nivel es «sin datos», nunca
          // «necesita apoyo» (regla no negociable, docs/10 §4.2).
          const level =
            opportunities < 2
              ? 'sin_datos'
              : lowestLevel(scores.map((m) => m.level));
          return { key: a.code, level, opportunities };
        }),
      })),
    };
  });

  // ── Vista individual ───────────────────────────────────────────────────────
  app.get('/students/:studentProfileId/detail', async (req, reply) => {
    const { studentProfileId } = z
      .object({ studentProfileId: z.string() })
      .parse(req.params);

    const profile = await prisma.studentProfile.findUniqueOrThrow({
      where: { id: studentProfileId },
      include: { user: true, mastery: true },
    });
    if (!(await canAccessClassroom(req.user.sub, profile.classroomId))) {
      return forbidden(reply);
    }

    const since = new Date(Date.now() - 30 * 86_400_000);
    const attempts = await prisma.attempt.findMany({
      where: { studentProfileId, startedAt: { gte: since }, deletedAt: null },
      include: { activity: true, interaction: true, metacognition: true },
      orderBy: { startedAt: 'desc' },
    });

    const activeDays = new Set(
      attempts.map((a) => a.startedAt.toISOString().slice(0, 10)),
    ).size;

    return {
      firstName: profile.user.firstName,
      avatarKey: profile.avatarKey,
      summary30d: {
        attempts: attempts.length,
        minutes: Math.round(
          attempts.reduce((acc, a) => acc + (a.durationSeconds ?? 0), 0) / 60,
        ),
        activeDays,
      },
      masteryByAxis: AXES.map((a) => ({
        axisCode: a.code,
        level: lowestLevel(
          profile.mastery.filter((m) => m.axisCode === a.code).map((m) => m.level),
        ),
      })),
      recentInteractions: attempts
        .filter((a) => a.interaction)
        .slice(0, 5)
        .map((a) => ({
          interactionId: a.interaction!.id,
          activityTitle: a.activity.title,
          occurredAt: a.startedAt.toISOString(),
          marker: a.independentVerification
            ? 'comprobo_solo'
            : a.hintsUsed > 0
              ? 'acerto_con_pistas'
              : 'acepto_sin_comprobar',
        })),
      // Textuales, sin resumir, sin corregir ortografía y sin análisis
      // automático (docs/10 §6.2). Es el dato más rico del panel.
      metacognitionResponses: attempts
        .filter((a) => a.metacognition)
        .slice(0, 10)
        .map((a) => ({
          text: a.metacognition!.text,
          occurredAt: a.metacognition!.createdAt.toISOString(),
        })),
    };
  });

  // ── Transcripción — esta lectura ESCRIBE en audit_log ──────────────────────
  app.get('/interactions/:interactionId/transcript', async (req, reply) => {
    const { interactionId } = z.object({ interactionId: z.string() }).parse(req.params);
    const query = z.object({ reason: z.string().max(200).optional() }).parse(req.query);

    const interaction = await prisma.lLMInteraction.findUniqueOrThrow({
      where: { id: interactionId },
      include: {
        turns: { orderBy: { turnIndex: 'asc' } },
        attempt: { include: { activity: true, metacognition: true } },
        studentProfile: true,
      },
    });

    const assignment = await prisma.classroomAssignment.findFirst({
      where: {
        userId: req.user.sub,
        classroomId: interaction.studentProfile.classroomId,
        deletedAt: null,
      },
    });

    if (!assignment?.canViewTranscripts) return forbidden(reply);

    // El acompañamiento de coordinación es legítimo; ocultarlo no lo sería.
    // Se permite con motivo obligatorio y auditoría reforzada.
    if (req.user.role === 'coordinator' && !query.reason) {
      return reply.code(403).type('application/problem+json').send({
        title: 'Motivo requerido',
        status: 403,
        detail:
          'El acceso de coordinación a una conversación individual requiere declarar el motivo.',
      });
    }

    await audit({
      actorId: req.user.sub,
      action: 'consulta_transcripcion',
      targetType: 'LLMInteraction',
      targetId: interactionId,
      reason: query.reason,
      context: { role: req.user.role, ip: req.ip },
    });

    return {
      interactionId,
      activityTitle: interaction.attempt.activity.title,
      model: interaction.model,
      mode: interaction.attempt.mode,
      startedAt: interaction.startedAt.toISOString(),
      turns: interaction.turns.map((t) => ({
        turnIndex: t.turnIndex,
        role: t.role,
        content: t.content,
        occurredAt: t.occurredAt.toISOString(),
        flags: [
          t.intentClass === 'pide_respuesta' ? 'pidio_respuesta' : null,
          t.intentClass === 'evasion' ? 'pidio_respuesta' : null,
          t.moderationTags?.includes('riesgo') ? 'moderacion' : null,
          t.fromFallbackTree ? 'modo_degradado' : null,
          t.wasRegenerated ? 'regenerado' : null,
        ].filter(Boolean),
      })),
      metacognition: interaction.attempt.metacognition
        ? { text: interaction.attempt.metacognition.text }
        : null,
      auditNotice: 'Tu consulta de esta conversación queda registrada.',
    };
  });

  // ── Alertas ────────────────────────────────────────────────────────────────
  app.get('/classrooms/:classroomId/alerts', async (req, reply) => {
    const { classroomId } = z.object({ classroomId: z.string() }).parse(req.params);
    if (!(await canAccessClassroom(req.user.sub, classroomId))) return forbidden(reply);

    const q = z
      .object({
        status: z.enum(['abierta', 'atendida', 'no_aplica', 'escalada']).optional(),
      })
      .parse(req.query);

    const items = await prisma.teacherAlert.findMany({
      where: { classroomId, deletedAt: null, ...(q.status ? { status: q.status } : {}) },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });

    return { items: items.map(serializeAlert), nextCursor: null };
  });

  app.post('/alerts/:alertId/resolve', async (req, reply) => {
    const { alertId } = z.object({ alertId: z.string() }).parse(req.params);
    const body = z
      .object({
        status: z.enum(['atendida', 'no_aplica', 'escalada']),
        note: z.string().max(500).optional(),
      })
      .parse(req.body);

    const alert = await prisma.teacherAlert.findUniqueOrThrow({ where: { id: alertId } });
    const assignment = await prisma.classroomAssignment.findFirst({
      where: { userId: req.user.sub, classroomId: alert.classroomId, deletedAt: null },
    });
    if (!assignment) return forbidden(reply);

    // Las alertas críticas solo las cierra quien tenga esa atribución, y el
    // cierre queda auditado.
    if (alert.severity === 'critica' && !assignment.canResolveRiskAlerts) {
      return forbidden(reply);
    }

    const updated = await prisma.teacherAlert.update({
      where: { id: alertId },
      data: {
        status: body.status,
        resolvedById: req.user.sub,
        resolvedAt: new Date(),
        resolutionNote: body.note ?? null,
      },
    });

    await audit({
      actorId: req.user.sub,
      action: 'resolucion_alerta',
      targetType: 'TeacherAlert',
      targetId: alertId,
      context: { status: body.status, code: alert.code },
    });

    return serializeAlert(updated);
  });

  // ── Estado de autorizaciones ───────────────────────────────────────────────
  app.get('/classrooms/:classroomId/consents', async (req, reply) => {
    const { classroomId } = z.object({ classroomId: z.string() }).parse(req.params);
    if (!(await canAccessClassroom(req.user.sub, classroomId))) return forbidden(reply);

    const students = await prisma.studentProfile.findMany({
      where: { classroomId, deletedAt: null },
      include: {
        user: true,
        consents: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const items = students.map((s) => ({
      studentProfileId: s.id,
      firstName: s.user.firstName,
      lastName: s.user.lastName,
      status: s.consents[0]?.status ?? 'pendiente',
      policyVersion: s.consents[0]?.policyVersion ?? null,
    }));

    return {
      granted: items.filter((i) => i.status === 'otorgado').length,
      pending: items.filter((i) => i.status === 'pendiente').length,
      revoked: items.filter((i) => i.status === 'revocado').length,
      policyVersion: 'v0.1-prototipo',
      items,
    };
  });
}

// ── Auxiliares ────────────────────────────────────────────────────────────────

async function canAccessClassroom(userId: string, classroomId: string) {
  const a = await prisma.classroomAssignment.findFirst({
    where: { userId, classroomId, deletedAt: null },
  });
  return a !== null;
}

function forbidden(reply: any) {
  return reply.code(403).type('application/problem+json').send({
    type: 'https://nativia.edu.co/problems/forbidden',
    title: 'Sin permiso',
    status: 403,
  });
}

const LEVEL_ORDER = ['sin_datos', 'necesita_apoyo', 'va_en_camino', 'lo_maneja_bien'];

function lowestLevel(levels: string[]): string {
  if (levels.length === 0) return 'sin_datos';
  const real = levels.filter((l) => l !== 'sin_datos');
  if (real.length === 0) return 'sin_datos';
  return real.sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b))[0];
}

function serializeAlert(a: any) {
  return {
    id: a.id,
    code: a.code,
    severity: a.severity,
    message: a.message,
    suggestedAction: JSON.parse(a.suggestedAction || '{}'),
    isContentHidden: a.isContentHidden,
    status: a.status,
    studentProfileId: a.studentProfileId,
    createdAt: a.createdAt.toISOString(),
  };
}

/** Extremos, no promedio: el promedio del grupo no sugiere ninguna acción. */
async function computeHighlights(classroomId: string) {
  const scores = await prisma.masteryScore.findMany({
    where: { studentProfile: { classroomId }, opportunities: { gte: 2 } },
  });

  const total = await prisma.studentProfile.count({
    where: { classroomId, deletedAt: null },
  });

  const byCompetence = new Map<string, { mastered: number; axis: string }>();
  for (const s of scores) {
    const e = byCompetence.get(s.pisaCompetence) ?? { mastered: 0, axis: s.axisCode };
    if (s.level === 'lo_maneja_bien') e.mastered++;
    byCompetence.set(s.pisaCompetence, e);
  }

  const ranked = [...byCompetence.entries()].sort((a, b) => b[1].mastered - a[1].mastered);
  if (ranked.length === 0) return { best: null, worst: null };

  const fmt = ([label, v]: [string, { mastered: number; axis: string }]) => ({
    label: humanizeCompetence(label),
    axisCode: v.axis,
    studentsAtLevel: v.mastered,
    totalStudents: total,
  });

  return { best: fmt(ranked[0]), worst: fmt(ranked[ranked.length - 1]) };
}

/** Sin jerga en la interfaz del docente: la sigla vive en el glosario. */
const COMPETENCE_LABELS: Record<string, string> = {
  'MAT.interpretar_evaluar': 'Explicar por qué una cuenta está mal',
  'MAT.formular': 'Plantear una situación con números',
  'LEN.evaluar_reflexionar': 'Juzgar si un texto es confiable',
  'CIE.explicar_fenomenos': 'Explicar por qué pasan las cosas',
  'CIE.evaluar_indagacion': 'Diseñar una forma de comprobar',
};

function humanizeCompetence(key: string): string {
  return COMPETENCE_LABELS[key] ?? key;
}
