// =============================================================================
// Cuentas de estudiante.
//
// Un estudiante no tiene correo ni contraseña (ADR-009): su cuenta es solo un
// nombre dentro de un colegio. Entra con el código del curso, su avatar y su
// PIN gráfico, que viven en su perfil (módulo aprendizaje).
//
// Usan `db`: se llaman dentro de una petición con colegio activo (coordinación).
// =============================================================================

import { activeInstitutionId, db } from '../../shared/db.js';

export async function crearCuentaEstudiante(args: { firstName: string; lastName: string }) {
  return db.user.create({
    data: {
      institutionId: activeInstitutionId(),
      role: 'student',
      firstName: args.firstName,
      lastName: args.lastName,
    },
    select: { id: true, firstName: true, lastName: true },
  });
}

/** Nombres de usuarios del colegio activo, por id. */
export async function nombresDeUsuarios(ids: string[]) {
  if (ids.length === 0) return new Map<string, { firstName: string; lastName: string }>();
  const usuarios = await db.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true },
  });
  return new Map(usuarios.map((u) => [u.id, { firstName: u.firstName, lastName: u.lastName }]));
}
