// =============================================================================
// Cifras de estudiantes para el panel de administración.
//
// Solo conteos: el equipo de plataforma no ve nombres ni trabajo de los niños
// (docs/09-security-privacy-plan.md §7.2).
// =============================================================================

import { dbGlobal } from '../../shared/db.js';

export async function contarEstudiantesPorColegio() {
  const filas = await dbGlobal.studentProfile.groupBy({
    by: ['institutionId'],
    where: { deletedAt: null },
    _count: { _all: true },
  });
  return new Map(filas.map((f) => [f.institutionId, f._count._all]));
}

export async function contarEstudiantesPorCurso(institutionId: string) {
  const filas = await dbGlobal.studentProfile.groupBy({
    by: ['classroomId'],
    where: { institutionId, deletedAt: null },
    _count: { _all: true },
  });
  return new Map(filas.map((f) => [f.classroomId, f._count._all]));
}
