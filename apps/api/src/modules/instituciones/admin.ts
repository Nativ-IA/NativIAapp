// =============================================================================
// Operaciones del panel de administración sobre la organización escolar.
//
// Cruzan colegios, así que usan dbGlobal con el colegio explícito. Solo las
// llama el módulo plataforma, detrás de requireAdmin.
// =============================================================================

import { randomInt } from 'node:crypto';
import { dbGlobal } from '../../shared/db.js';

/** Sin O/0, I/1/L, S/5: un niño de 8 años los confunde al copiarlos del tablero. */
export const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRTUVWXYZ2346789';

export function generarCodigoIngreso(): string {
  let codigo = '';
  for (let i = 0; i < 4; i++) codigo += ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)];
  return codigo;
}

/** Un código libre, reintentando si choca con uno existente. */
async function codigoLibre(): Promise<string> {
  for (let intento = 0; intento < 20; intento++) {
    const codigo = generarCodigoIngreso();
    const existe = await dbGlobal.classroom.findUnique({ where: { joinCode: codigo } });
    if (!existe) return codigo;
  }
  throw new Error('No se encontró un código de ingreso libre');
}

const UN_ANIO_MS = 365 * 24 * 3600 * 1000;

export async function listarColegios() {
  return dbGlobal.institution.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      daneCode: true,
      city: true,
      sector: true,
      createdAt: true,
      _count: {
        select: {
          campuses: { where: { deletedAt: null } },
          classrooms: { where: { deletedAt: null } },
        },
      },
    },
  });
}

export async function crearColegio(args: {
  name: string;
  daneCode?: string;
  city: string;
  sector: 'oficial' | 'no_oficial';
  primeraSede: string;
}) {
  return dbGlobal.institution.create({
    data: {
      name: args.name,
      daneCode: args.daneCode || null,
      city: args.city,
      sector: args.sector,
      campuses: { create: { name: args.primeraSede } },
    },
  });
}

export async function obtenerColegio(institutionId: string) {
  return dbGlobal.institution.findFirst({
    where: { id: institutionId, deletedAt: null },
    select: {
      id: true,
      name: true,
      daneCode: true,
      city: true,
      sector: true,
      campuses: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true },
      },
      classrooms: {
        where: { deletedAt: null },
        orderBy: [{ grade: 'asc' }, { section: 'asc' }],
        select: {
          id: true,
          campusId: true,
          grade: true,
          shift: true,
          section: true,
          year: true,
          joinCode: true,
          joinCodeExpires: true,
          assignments: {
            where: { deletedAt: null },
            select: { userId: true, role: true },
          },
        },
      },
    },
  });
}

export async function crearSede(institutionId: string, name: string) {
  return dbGlobal.campus.create({ data: { institutionId, name } });
}

export async function crearCurso(args: {
  institutionId: string;
  campusId: string;
  grade: number;
  section: string;
  shift: 'manana' | 'tarde' | 'unica';
}) {
  // La sede tiene que ser del mismo colegio.
  const sede = await dbGlobal.campus.findFirst({
    where: { id: args.campusId, institutionId: args.institutionId, deletedAt: null },
  });
  if (!sede) return null;

  return dbGlobal.classroom.create({
    data: {
      institutionId: args.institutionId,
      campusId: args.campusId,
      grade: args.grade,
      section: args.section,
      shift: args.shift,
      year: new Date().getFullYear(),
      joinCode: await codigoLibre(),
      joinCodeExpires: new Date(Date.now() + UN_ANIO_MS),
    },
  });
}

export async function regenerarCodigo(classroomId: string) {
  const curso = await dbGlobal.classroom.findFirst({
    where: { id: classroomId, deletedAt: null },
  });
  if (!curso) return null;
  return dbGlobal.classroom.update({
    where: { id: classroomId },
    data: { joinCode: await codigoLibre(), joinCodeExpires: new Date(Date.now() + UN_ANIO_MS) },
  });
}

/** Asigna un adulto a un curso del mismo colegio. */
export async function asignarCurso(args: {
  institutionId: string;
  userId: string;
  classroomId: string;
  role: 'titular' | 'apoyo';
}) {
  const curso = await dbGlobal.classroom.findFirst({
    where: { id: args.classroomId, institutionId: args.institutionId, deletedAt: null },
  });
  if (!curso) return null;
  return dbGlobal.classroomAssignment.create({
    data: {
      institutionId: args.institutionId,
      userId: args.userId,
      classroomId: args.classroomId,
      role: args.role,
      // Matriz de docs/09 §7.2: el titular ve transcripciones y resuelve alertas.
      canViewTranscripts: args.role === 'titular',
      canResolveRiskAlerts: args.role === 'titular',
    },
  });
}

export async function nombresDeColegios(ids: string[]) {
  const colegios = await dbGlobal.institution.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  return new Map(colegios.map((c) => [c.id, c.name]));
}

export async function contarCursos() {
  return dbGlobal.classroom.count({ where: { deletedAt: null } });
}
