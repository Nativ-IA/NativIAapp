// =============================================================================
// Acceso a la base de datos para los módulos del API.
//
// `db` filtra solo por colegio: toda consulta a una tabla con datos de un
// colegio lleva el colegio activo de la petición en el `where`, y toda
// creación lo lleva en `data`. Si no hay colegio activo, la consulta falla
// antes de llegar a la base: es preferible un error a mostrarle a un colegio
// los datos de otro.
//
// `dbGlobal` no filtra. Es solo para lo que por naturaleza cruza colegios: el
// ingreso (el colegio todavía no se conoce), el panel del equipo de plataforma
// (con auditoría) y la verificación de salud. Usarlo es una decisión que se ve
// en el código.
// =============================================================================

import { prisma } from '@nativia/db';
import { getActiveInstitution } from './tenant.js';

/** Tablas con datos de un colegio. Las de contenido (ejes, actividades,
 *  logros) son comunes a todos y no se filtran. */
export const TENANT_MODELS: ReadonlySet<string> = new Set([
  'User',
  'Campus',
  'Classroom',
  'ClassroomAssignment',
  'StudentProfile',
  'ConsentRecord',
  'Attempt',
  'AttemptEvent',
  'MetacognitionResponse',
  'LLMInteraction',
  'LLMTurn',
  'TokenBudget',
  'MasteryScore',
  'StudentBadge',
  'TeacherAlert',
  'ClassroomSummary',
  'AuditLog',
]);

const WHERE_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
]);

/** Agrega el colegio a los argumentos de una operación de Prisma. Pura, para
 *  poder probarla sin base de datos. */
export function scopeToInstitution(
  operation: string,
  args: any,
  institutionId: string,
): any {
  const a = { ...(args ?? {}) };

  if (operation === 'create') {
    a.data = { ...a.data, institutionId };
  } else if (operation === 'createMany' || operation === 'createManyAndReturn') {
    const rows = Array.isArray(a.data) ? a.data : [a.data];
    a.data = rows.map((row: any) => ({ ...row, institutionId }));
  } else if (operation === 'upsert') {
    a.where = { ...a.where, institutionId };
    a.create = { ...a.create, institutionId };
  } else if (WHERE_OPERATIONS.has(operation)) {
    a.where = { ...a.where, institutionId };
  } else {
    throw new Error(`Operación ${operation} sin regla de multi-colegio en shared/db.ts`);
  }

  return a;
}

export const db = prisma.$extends({
  name: 'multi-colegio',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!TENANT_MODELS.has(model)) return query(args);

        const institutionId = getActiveInstitution();
        if (!institutionId) {
          throw new Error(
            `Consulta a ${model}.${operation} sin colegio activo. ` +
              'Si cruzar colegios es intencional, usa dbGlobal.',
          );
        }
        return query(scopeToInstitution(operation, args, institutionId));
      },
    },
  },
});

export const dbGlobal = prisma;

/** Colegio activo de la petición, para poner en `data` al crear registros.
 *  `db` lo pondría igual; escribirlo deja explícito de quién es el dato y
 *  satisface los tipos de Prisma. */
export function activeInstitutionId(): string {
  const institutionId = getActiveInstitution();
  if (!institutionId) throw new Error('No hay colegio activo en esta petición');
  return institutionId;
}

/** ¿El error es de un valor que ya existe (índice único)? Código P2002 de Prisma. */
export function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'P2002';
}
