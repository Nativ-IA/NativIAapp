// =============================================================================
// Matrícula: el perfil de estudiante de cada niño en su curso, con su avatar y
// su PIN gráfico (ADR-009). Lo usa el panel de coordinación.
//
// Usan `db`: se llaman dentro de una petición con colegio activo.
// =============================================================================

import { randomInt } from 'node:crypto';
import argon2 from 'argon2';
import { activeInstitutionId, db } from '../../shared/db.js';

/** Imágenes del PIN gráfico. Las mismas, en el mismo orden, que
 *  apps/web/src/components/PinSymbols.tsx. */
export const PIN_SIMBOLOS = ['brote', 'arepa', 'montana', 'sol', 'rio', 'flor'] as const;
export type SimboloPin = (typeof PIN_SIMBOLOS)[number];

/** Avatares ilustrados (fauna colombiana). Los mismos de apps/web/src/components/Fauna.tsx. */
export const AVATARES = [
  'zorro',
  'tortuga',
  'guacamaya',
  'jaguar',
  'mariposa',
  'abeja',
  'perezoso',
  'rana',
] as const;

/** Tres imágenes distintas al azar. El niño las ve en su tarjeta y las
 *  memoriza en orden; en la base queda solo el hash. */
export function generarPin(): SimboloPin[] {
  const bolsa = [...PIN_SIMBOLOS];
  const pin: SimboloPin[] = [];
  for (let i = 0; i < 3; i++) pin.push(bolsa.splice(randomInt(bolsa.length), 1)[0]);
  return pin;
}

/** El avatar menos repetido del curso: en la lista de ingreso cada niño se
 *  reconoce por su animal, y dos iguales seguidos confunden. */
export function elegirAvatar(usados: Map<string, number>): string {
  const minimo = Math.min(...AVATARES.map((a) => usados.get(a) ?? 0));
  const libres = AVATARES.filter((a) => (usados.get(a) ?? 0) === minimo);
  return libres[randomInt(libres.length)];
}

const hashPin = (pin: SimboloPin[]) => argon2.hash(pin.join('|'));

export async function avataresDeCurso(classroomId: string) {
  const filas = await db.studentProfile.groupBy({
    by: ['avatarKey'],
    where: { classroomId, deletedAt: null },
    _count: { _all: true },
  });
  return new Map(filas.map((f) => [f.avatarKey, f._count._all]));
}

/** Crea el perfil bloqueado: no entra hasta que haya autorización del
 *  acudiente (US-09). Devuelve el PIN en claro UNA vez. */
export async function crearPerfilEstudiante(args: {
  userId: string;
  classroomId: string;
  avatarKey: string;
}) {
  const pin = generarPin();
  const perfil = await db.studentProfile.create({
    data: {
      institutionId: activeInstitutionId(),
      userId: args.userId,
      classroomId: args.classroomId,
      avatarKey: args.avatarKey,
      graphicPinHash: await hashPin(pin),
      isUnlocked: false,
    },
    select: { id: true, avatarKey: true },
  });
  return { ...perfil, pin };
}

export async function estudiantesDeCurso(classroomId: string) {
  return db.studentProfile.findMany({
    where: { classroomId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, userId: true, avatarKey: true, isUnlocked: true, createdAt: true },
  });
}

export async function estudiantesDelColegio() {
  return db.studentProfile.findMany({
    where: { deletedAt: null },
    select: { id: true, classroomId: true },
  });
}

export async function obtenerPerfil(studentProfileId: string) {
  return db.studentProfile.findFirst({
    where: { id: studentProfileId, deletedAt: null },
    select: { id: true, userId: true, classroomId: true, avatarKey: true, isUnlocked: true },
  });
}

/** Sale de la lista del curso y ya no puede entrar. Su historial se conserva
 *  hasta que se ejerza el derecho al olvido. */
export async function retirarEstudiante(studentProfileId: string) {
  await db.studentProfile.update({
    where: { id: studentProfileId },
    data: { deletedAt: new Date(), isUnlocked: false },
  });
}

/** PIN nuevo para un niño que olvidó el suyo, distinto del anterior.
 *  Devuelve el PIN en claro UNA vez. */
export async function nuevoPin(studentProfileId: string) {
  const actual = await db.studentProfile.findFirst({
    where: { id: studentProfileId },
    select: { graphicPinHash: true },
  });
  let pin = generarPin();
  for (let i = 0; i < 5 && actual?.graphicPinHash; i++) {
    if (!(await argon2.verify(actual.graphicPinHash, pin.join('|')))) break;
    pin = generarPin();
  }
  await db.studentProfile.update({
    where: { id: studentProfileId },
    data: { graphicPinHash: await hashPin(pin) },
  });
  return pin;
}

/** Abre o cierra el acceso. Lo decide la autorización del acudiente. */
export async function cambiarAcceso(studentProfileId: string, isUnlocked: boolean) {
  await db.studentProfile.update({ where: { id: studentProfileId }, data: { isUnlocked } });
}

/** Actividad por curso: actividades terminadas este mes y estudiantes que
 *  trabajaron en los últimos 7 días. Solo cifras. */
export async function actividadPorCurso() {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 3600 * 1000);
  const desde = inicioMes < hace7Dias ? inicioMes : hace7Dias;

  const intentos = await db.attempt.findMany({
    where: { status: 'completado', completedAt: { gte: desde } },
    select: {
      studentProfileId: true,
      completedAt: true,
      studentProfile: { select: { classroomId: true } },
    },
  });

  const porCurso = new Map<string, { completadasMes: number; activos: Set<string> }>();
  for (const i of intentos) {
    const id = i.studentProfile.classroomId;
    const c = porCurso.get(id) ?? { completadasMes: 0, activos: new Set<string>() };
    if (i.completedAt! >= inicioMes) c.completadasMes++;
    if (i.completedAt! >= hace7Dias) c.activos.add(i.studentProfileId);
    porCurso.set(id, c);
  }
  return new Map(
    [...porCurso].map(([id, c]) => [
      id,
      { completadasMes: c.completadasMes, activos7Dias: c.activos.size },
    ]),
  );
}
