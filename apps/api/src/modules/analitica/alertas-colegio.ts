// =============================================================================
// Alertas vistas desde coordinación.
//
// Coordinación ve las alertas de su colegio sin su contenido: de qué tipo son,
// en qué curso, desde cuándo y si alguien las atendió. Ese es su trabajo:
// verificar que ninguna alerta crítica se quede sin atender. El contenido (a
// quién se refiere, qué dice) se abre una por una, con motivo, y queda en la
// auditoría (docs/09 §7.2). La conversación sigue siendo del docente titular.
//
// Usan `db`: se llaman dentro de una petición con colegio activo.
// =============================================================================

import { db } from '../../shared/db.js';

export type Severidad = 'critica' | 'media' | 'baja';

const RANGO_SEVERIDAD: Record<string, number> = { critica: 0, media: 1, baja: 2 };

/** Orden de las alertas en toda pantalla (docs/10 §5.2): abiertas primero,
 *  críticas antes que el resto y, dentro de cada severidad, la más reciente.
 *  En la base la severidad es texto: ordenarla allí la pondría alfabética
 *  (baja, critica, media) y una crítica podía quedar fuera del techo de 3. */
export function compararAlertas(
  a: { status: string; severity: string; createdAt: Date },
  b: { status: string; severity: string; createdAt: Date },
) {
  const abierta = (x: { status: string }) => (x.status === 'abierta' ? 0 : 1);
  return (
    abierta(a) - abierta(b) ||
    (RANGO_SEVERIDAD[a.severity] ?? 3) - (RANGO_SEVERIDAD[b.severity] ?? 3) ||
    b.createdAt.getTime() - a.createdAt.getTime()
  );
}

/** Alertas abiertas por curso y severidad. */
export async function alertasAbiertasPorCurso() {
  const filas = await db.teacherAlert.groupBy({
    by: ['classroomId', 'severity'],
    where: { status: 'abierta', deletedAt: null },
    _count: { _all: true },
  });
  const porCurso = new Map<string, Record<Severidad, number>>();
  for (const f of filas) {
    const c = porCurso.get(f.classroomId) ?? { critica: 0, media: 0, baja: 0 };
    c[f.severity as Severidad] = (c[f.severity as Severidad] ?? 0) + f._count._all;
    porCurso.set(f.classroomId, c);
  }
  return porCurso;
}

/** Alertas de un curso: las abiertas y las cerradas en los últimos 30 días.
 *  Sin mensaje ni estudiante. */
export async function alertasDeCurso(classroomId: string) {
  const hace30Dias = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  return db.teacherAlert.findMany({
    where: {
      classroomId,
      deletedAt: null,
      OR: [{ status: 'abierta' }, { resolvedAt: { gte: hace30Dias } }],
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 50,
    select: {
      id: true,
      code: true,
      severity: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
    },
  });
}

/** El contenido de una alerta. Quien la abre declara el motivo y queda
 *  auditado: eso lo hace quien llama. */
export async function detalleAlerta(alertId: string) {
  const a = await db.teacherAlert.findFirst({
    where: { id: alertId, deletedAt: null },
    select: {
      id: true,
      classroomId: true,
      studentProfileId: true,
      code: true,
      severity: true,
      status: true,
      message: true,
      suggestedAction: true,
      createdAt: true,
      resolvedAt: true,
      resolutionNote: true,
    },
  });
  if (!a) return null;
  const accion = JSON.parse(a.suggestedAction || '{}') as { label?: string };
  return { ...a, suggestedAction: accion.label ?? null };
}
