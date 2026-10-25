// =============================================================================
// Operaciones del panel de administración sobre las cuentas de adultos.
//
// Solo adultos: los estudiantes no tienen correo ni contraseña (ADR-009) y el
// equipo de plataforma no los gestiona uno a uno. Usan dbGlobal con el colegio
// explícito; solo las llama el módulo plataforma, detrás de requireAdmin.
// =============================================================================

import { randomInt } from 'node:crypto';
import argon2 from 'argon2';
import { dbGlobal } from '../../shared/db.js';

export const ROLES_ADULTOS = ['teacher', 'coordinator'] as const;
export type RolAdulto = (typeof ROLES_ADULTOS)[number];

const ALFABETO = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Contraseña temporal legible para dictarla: tres grupos de cuatro. Se muestra
 *  una sola vez; en la base queda solo su hash. */
export function generarContrasenaTemporal(): string {
  const grupo = () =>
    Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
  return `${grupo()}-${grupo()}-${grupo()}`;
}

export async function listarAdultos(institutionId: string) {
  return dbGlobal.user.findMany({
    where: { institutionId, role: { in: [...ROLES_ADULTOS] }, deletedAt: null },
    orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
    },
  });
}

export async function crearAdulto(args: {
  institutionId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: RolAdulto;
}) {
  const contrasenaTemporal = generarContrasenaTemporal();
  const usuario = await dbGlobal.user.create({
    data: {
      institutionId: args.institutionId,
      role: args.role,
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email.toLowerCase(),
      passwordHash: await argon2.hash(contrasenaTemporal),
    },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  });
  return { usuario, contrasenaTemporal };
}

/** Busca un adulto de cualquier colegio. Nunca devuelve a un estudiante. */
export async function obtenerAdulto(userId: string) {
  return dbGlobal.user.findFirst({
    where: { id: userId, role: { in: [...ROLES_ADULTOS] }, deletedAt: null },
    select: { id: true, institutionId: true, email: true, isActive: true },
  });
}

export async function cambiarEstadoAdulto(userId: string, isActive: boolean) {
  return dbGlobal.user.update({
    where: { id: userId },
    data: { isActive },
    select: { id: true, isActive: true },
  });
}

export async function restablecerContrasena(userId: string) {
  const contrasenaTemporal = generarContrasenaTemporal();
  await dbGlobal.user.update({
    where: { id: userId },
    data: { passwordHash: await argon2.hash(contrasenaTemporal) },
  });
  return contrasenaTemporal;
}

/** Docentes y coordinadores activos por colegio. */
export async function contarAdultosPorColegio() {
  const filas = await dbGlobal.user.groupBy({
    by: ['institutionId'],
    where: { role: { in: [...ROLES_ADULTOS] }, deletedAt: null },
    _count: { _all: true },
  });
  return new Map(filas.map((f) => [f.institutionId ?? '', f._count._all]));
}

/** Nombre y rol de quien hizo algo, para la auditoría. */
export async function describirUsuarios(ids: string[]) {
  const usuarios = await dbGlobal.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  });
  return new Map(usuarios.map((u) => [u.id, u]));
}
