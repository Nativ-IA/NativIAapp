// =============================================================================
// Auditoría de las acciones del equipo de plataforma.
//
// Toda acción del panel de administración que cambia algo queda aquí, con el
// colegio afectado. La lectura muestra quién, qué y cuándo; nunca el contenido
// de un menor.
// =============================================================================

import { dbGlobal } from '../../shared/db.js';
import type { AuditAction } from './audit.js';

export async function auditarPlataforma(args: {
  actorId: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  institutionId: string | null;
  context?: Record<string, unknown>;
}): Promise<void> {
  await dbGlobal.auditLog.create({
    data: {
      actorId: args.actorId,
      institutionId: args.institutionId,
      action: args.action,
      targetType: args.targetType,
      targetId: args.targetId,
      context: JSON.stringify(args.context ?? {}),
    },
  });
}

export async function auditoriaReciente(limite: number) {
  return dbGlobal.auditLog.findMany({
    orderBy: { occurredAt: 'desc' },
    take: limite,
    select: {
      id: true,
      occurredAt: true,
      actorId: true,
      institutionId: true,
      action: true,
      targetType: true,
      reason: true,
    },
  });
}
