// =============================================================================
// Auditoría append-only.
//
// Leer la conversación de un menor no es una operación neutra: escribe aquí.
// Es la contraparte de haberle dicho al niño que su docente puede leerla
// (docs/09-security-privacy-plan.md §8, docs/10 §7).
//
// En SQLite la inmutabilidad es garantía de capa de aplicación: no existe
// ninguna función de actualización ni de borrado sobre esta tabla. En
// PostgreSQL se refuerza con un trigger (ver notas de migración del esquema).
// =============================================================================

import { prisma } from '@nativia/db';

export type AuditAction =
  | 'consulta_transcripcion'
  | 'resolucion_alerta'
  | 'cambio_consentimiento'
  | 'exportacion_datos'
  | 'borrado_derecho_olvido'
  | 'cambio_rol'
  | 'ingreso_anomalo'
  | 'cambio_modelo_llm';

export async function audit(args: {
  actorId: string | null;
  action: AuditAction;
  targetType: string;
  targetId: string;
  /** Obligatorio cuando la acción lo exige (p. ej. acceso de coordinación). */
  reason?: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: args.actorId,
      action: args.action,
      targetType: args.targetType,
      targetId: args.targetId,
      reason: args.reason ?? null,
      context: JSON.stringify(args.context ?? {}),
    },
  });
}
