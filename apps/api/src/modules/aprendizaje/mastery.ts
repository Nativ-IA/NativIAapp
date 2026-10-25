// =============================================================================
// Estimación de dominio con Bayesian Knowledge Tracing.
// Especificación en docs/10-teacher-dashboard-spec.md §4.2.
// =============================================================================

import { prisma } from '@nativia/db';

export interface BktParams {
  pInit: number;
  pLearn: number;
  pSlip: number;
  pGuess: number;
}

/** [SUPUESTO] Valores iniciales. Deben recalibrarse con datos del piloto;
 *  por eso se guardan junto a cada score, para poder recalcular hacia atrás. */
export const DEFAULT_BKT: BktParams = {
  pInit: 0.25,
  pLearn: 0.15,
  pSlip: 0.1,
  pGuess: 0.2,
};

export type MasteryLevel =
  | 'sin_datos'
  | 'necesita_apoyo'
  | 'va_en_camino'
  | 'lo_maneja_bien';

/** Un paso de BKT: actualiza p(dominio) dada la observación. */
export function bktUpdate(prior: number, correct: boolean, p: BktParams): number {
  const posterior = correct
    ? (prior * (1 - p.pSlip)) /
      (prior * (1 - p.pSlip) + (1 - prior) * p.pGuess)
    : (prior * p.pSlip) / (prior * p.pSlip + (1 - prior) * (1 - p.pGuess));

  return posterior + (1 - posterior) * p.pLearn;
}

/** Traduce probabilidad + oportunidades a un nivel mostrable.
 *
 *  REGLA NO NEGOCIABLE: con menos de 2 oportunidades el nivel es `sin_datos`.
 *  Pintar «necesita apoyo» a partir de un solo intento produce un diagnóstico
 *  falso que el docente puede llevarse a una reunión con la familia. */
export function toLevel(probability: number, opportunities: number): MasteryLevel {
  if (opportunities < 2) return 'sin_datos';
  if (probability >= 0.8 && opportunities >= 3) return 'lo_maneja_bien';
  if (probability >= 0.4) return 'va_en_camino';
  return 'necesita_apoyo';
}

export async function recordEvidence(args: {
  studentProfileId: string;
  pisaCompetence: string;
  axisCode: string;
  activityId: string;
  isCorrect: boolean;
  /** En los ejes C y D un acierto sin justificación válida NO cuenta como
   *  acierto para el dominio (requisito US-02). */
  hasValidJustification: boolean;
}) {
  const countsAsCorrect =
    args.isCorrect &&
    (args.axisCode === 'A' || args.axisCode === 'B' || args.hasValidJustification);

  const existing = await prisma.masteryScore.findUnique({
    where: {
      studentProfileId_pisaCompetence: {
        studentProfileId: args.studentProfileId,
        pisaCompetence: args.pisaCompetence,
      },
    },
  });

  const params: BktParams = existing?.bktParams
    ? { ...DEFAULT_BKT, ...safeParse(existing.bktParams) }
    : DEFAULT_BKT;

  const prior = existing?.probability ?? params.pInit;
  const probability = bktUpdate(prior, countsAsCorrect, params);
  const opportunities = (existing?.opportunities ?? 0) + 1;

  return prisma.masteryScore.upsert({
    where: {
      studentProfileId_pisaCompetence: {
        studentProfileId: args.studentProfileId,
        pisaCompetence: args.pisaCompetence,
      },
    },
    update: {
      probability,
      opportunities,
      level: toLevel(probability, opportunities),
      activityId: args.activityId,
      axisCode: args.axisCode,
      lastEvidenceAt: new Date(),
      bktParams: JSON.stringify(params),
    },
    create: {
      studentProfileId: args.studentProfileId,
      pisaCompetence: args.pisaCompetence,
      axisCode: args.axisCode,
      activityId: args.activityId,
      probability,
      opportunities,
      level: toLevel(probability, opportunities),
      lastEvidenceAt: new Date(),
      bktParams: JSON.stringify(params),
    },
  });
}

function safeParse(s: string): Partial<BktParams> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
