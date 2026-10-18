// =============================================================================
// Puntaje de triaje docente — «¿a quién atiendo mañana?»
// Especificación en docs/10-teacher-dashboard-spec.md §2.1.
// =============================================================================

import { prisma } from '@nativia/db';

export interface TriageEntry {
  studentProfileId: string;
  firstName: string;
  avatarKey: string;
  score: number;
  /** Conducta observable, NUNCA un atributo del niño. */
  reason: string;
  signalConfidence: 'alta' | 'media' | 'baja';
}

const WEIGHTS = {
  delegacion: 0.35,
  estancamiento: 0.25,
  inactividad: 0.2,
  frustracion: 0.15,
};

/** El clasificador de aceptación acrítica todavía no alcanza κ ≥ 0,75 contra
 *  codificación humana. Hasta entonces NO entra al puntaje: el orden de los
 *  tres nombres que ve el docente no puede depender de la señal menos
 *  confiable (autocrítica de docs/10, debilidad 1).
 *  Los pesos restantes se renormalizan. */
const DELEGATION_READY = false;

export async function computeTriage(classroomId: string): Promise<TriageEntry[]> {
  const students = await prisma.studentProfile.findMany({
    where: { classroomId, deletedAt: null, isUnlocked: true },
    include: { user: true },
  });

  const now = Date.now();
  const entries: TriageEntry[] = [];

  for (const s of students) {
    const attempts = await prisma.attempt.findMany({
      where: { studentProfileId: s.id, deletedAt: null },
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: { interaction: true },
    });

    // --- Inactividad ---
    const last = attempts[0]?.startedAt?.getTime();
    const daysIdle = last ? (now - last) / 86_400_000 : 14;
    const inactividad = Math.min(100, (daysIdle / 14) * 100);

    // --- Frustración: abandonos a mitad en 7 días ---
    const weekAgo = now - 7 * 86_400_000;
    const recent = attempts.filter((a) => a.startedAt.getTime() >= weekAgo);
    const abandoned = recent.filter((a) => a.status === 'abandonado').length;
    const frustracion = recent.length ? Math.min(100, (abandoned / recent.length) * 100) : 0;

    // --- Estancamiento: fallos consecutivos en la misma competencia ---
    const failing = await prisma.masteryScore.count({
      where: { studentProfileId: s.id, level: 'necesita_apoyo', opportunities: { gte: 3 } },
    });
    const estancamiento = Math.min(100, failing * 34);

    // --- Delegación (calculada, no expuesta todavía) ---
    const withRatio = attempts.filter((a) => a.interaction?.acriticalAcceptanceRatio != null);
    const delegacion = withRatio.length
      ? (withRatio.reduce((acc, a) => acc + (a.interaction!.acriticalAcceptanceRatio ?? 0), 0) /
          withRatio.length) *
        100
      : 0;

    const weights = DELEGATION_READY
      ? WEIGHTS
      : renormalize({ ...WEIGHTS, delegacion: 0 });

    const score =
      weights.delegacion * delegacion +
      weights.estancamiento * estancamiento +
      weights.inactividad * inactividad +
      weights.frustracion * frustracion;

    entries.push({
      studentProfileId: s.id,
      firstName: s.user.firstName,
      avatarKey: s.avatarKey,
      score: Math.round(score),
      reason: buildReason({ daysIdle, failing, abandoned, delegacion }),
      signalConfidence: DELEGATION_READY && delegacion > 50 ? 'baja' : 'alta',
    });
  }

  // Cualquier alerta de riesgo abierta fuerza la primera posición.
  const risky = await prisma.teacherAlert.findMany({
    where: { classroomId, code: 'A-RIESGO', status: 'abierta' },
    select: { studentProfileId: true },
  });
  const riskyIds = new Set(risky.map((r) => r.studentProfileId));

  return entries
    .sort((a, b) => {
      const ar = riskyIds.has(a.studentProfileId) ? 1 : 0;
      const br = riskyIds.has(b.studentProfileId) ? 1 : 0;
      if (ar !== br) return br - ar;
      return b.score - a.score;
    })
    .filter((e) => e.score >= 40 || riskyIds.has(e.studentProfileId))
    .slice(0, 3);
}

function renormalize(w: typeof WEIGHTS): typeof WEIGHTS {
  const total = w.delegacion + w.estancamiento + w.inactividad + w.frustracion;
  if (total === 0) return w;
  return {
    delegacion: w.delegacion / total,
    estancamiento: w.estancamiento / total,
    inactividad: w.inactividad / total,
    frustracion: w.frustracion / total,
  };
}

/** Redacción: conducta observable, nunca atributo.
 *  «Lleva 3 actividades aceptando lo que dice la IA sin comprobarlo», NUNCA
 *  «es dependiente de la IA». */
function buildReason(m: {
  daysIdle: number;
  failing: number;
  abandoned: number;
  delegacion: number;
}): string {
  if (m.daysIdle >= 7) {
    return `No ha entrado en ${Math.floor(m.daysIdle)} días.`;
  }
  if (m.failing >= 1) {
    return 'Se atasca varias veces en el mismo tipo de ejercicio.';
  }
  if (m.abandoned >= 2) {
    return 'Ha dejado actividades a mitad de camino esta semana.';
  }
  if (DELEGATION_READY && m.delegacion >= 60) {
    return 'Lleva varias actividades aceptando lo que dice la IA sin comprobarlo.';
  }
  return 'Necesita acompañamiento en las últimas actividades.';
}
