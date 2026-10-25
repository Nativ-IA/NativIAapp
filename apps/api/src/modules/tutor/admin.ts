// =============================================================================
// Consumo del tutor para el panel de administración: cuánto se usó el modelo
// este mes, por colegio. Solo cifras, nunca conversaciones.
// =============================================================================

import { dbGlobal } from '../../shared/db.js';

export interface ConsumoColegio {
  interacciones: number;
  tokensEntrada: number;
  tokensSalida: number;
  /** Estudiantes que agotaron su presupuesto del mes y usan el modo degradado. */
  presupuestosAgotados: number;
}

export function inicioDelMes(fecha = new Date()): Date {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
}

export async function consumoDelMesPorColegio(): Promise<Map<string, ConsumoColegio>> {
  const desde = inicioDelMes();
  const periodo = desde.toISOString().slice(0, 7);

  const [uso, agotados] = await Promise.all([
    dbGlobal.lLMInteraction.groupBy({
      by: ['institutionId'],
      where: { startedAt: { gte: desde } },
      _count: { _all: true },
      _sum: { inputTokens: true, outputTokens: true },
    }),
    dbGlobal.tokenBudget.groupBy({
      by: ['institutionId'],
      where: { period: periodo, isExhausted: true },
      _count: { _all: true },
    }),
  ]);

  const porColegio = new Map<string, ConsumoColegio>();
  const fila = (id: string) => {
    if (!porColegio.has(id)) {
      porColegio.set(id, {
        interacciones: 0,
        tokensEntrada: 0,
        tokensSalida: 0,
        presupuestosAgotados: 0,
      });
    }
    return porColegio.get(id)!;
  };

  for (const u of uso) {
    const f = fila(u.institutionId);
    f.interacciones = u._count._all;
    f.tokensEntrada = u._sum.inputTokens ?? 0;
    f.tokensSalida = u._sum.outputTokens ?? 0;
  }
  for (const a of agotados) fila(a.institutionId).presupuestosAgotados = a._count._all;

  return porColegio;
}
