// Multi-colegio: un colegio nunca ve ni escribe datos de otro.
//
// Prueba la regla de shared/db.ts sin base de datos: cómo se transforman los
// argumentos de cada operación, que sin colegio activo la consulta falla antes
// de salir, y que ninguna tabla con institutionId quede fuera del filtro.

import { describe, it, expect, beforeAll } from 'vitest';
import { Prisma } from '@nativia/db';

process.env.JWT_SECRET ??= 'secreto-de-prueba-0123456789';
process.env.DATABASE_URL = 'postgresql://prueba:prueba@localhost:5432/prueba';

let scopeToInstitution: typeof import('../src/shared/db.js').scopeToInstitution;
let TENANT_MODELS: ReadonlySet<string>;
let db: typeof import('../src/shared/db.js').db;

beforeAll(async () => {
  ({ scopeToInstitution, TENANT_MODELS, db } = await import('../src/shared/db.js'));
});

const COLEGIO = 'colegio-a';

describe('scopeToInstitution', () => {
  it('pone el colegio al crear', () => {
    const a = scopeToInstitution('create', { data: { text: 'hola' } }, COLEGIO);
    expect(a.data).toEqual({ text: 'hola', institutionId: COLEGIO });
  });

  it('pone el colegio en cada fila de createMany', () => {
    const a = scopeToInstitution('createMany', { data: [{ n: 1 }, { n: 2 }] }, COLEGIO);
    expect(a.data).toEqual([
      { n: 1, institutionId: COLEGIO },
      { n: 2, institutionId: COLEGIO },
    ]);
  });

  it('filtra lecturas, actualizaciones y borrados', () => {
    for (const op of ['findMany', 'findFirst', 'findUnique', 'count', 'update', 'updateMany', 'delete', 'deleteMany']) {
      const a = scopeToInstitution(op, { where: { id: 'x' } }, COLEGIO);
      expect(a.where).toEqual({ id: 'x', institutionId: COLEGIO });
    }
  });

  it('filtra aunque la operación no traiga argumentos', () => {
    expect(scopeToInstitution('count', undefined, COLEGIO).where).toEqual({
      institutionId: COLEGIO,
    });
  });

  it('en upsert filtra la búsqueda y pone el colegio al crear', () => {
    const a = scopeToInstitution(
      'upsert',
      { where: { id: 'x' }, create: { n: 1 }, update: { n: 2 } },
      COLEGIO,
    );
    expect(a.where).toEqual({ id: 'x', institutionId: COLEGIO });
    expect(a.create).toEqual({ n: 1, institutionId: COLEGIO });
    expect(a.update).toEqual({ n: 2 });
  });

  it('no deja pedir datos de otro colegio a mano', () => {
    const a = scopeToInstitution('findMany', { where: { institutionId: 'colegio-b' } }, COLEGIO);
    expect(a.where.institutionId).toBe(COLEGIO);
  });

  it('rechaza una operación que no conoce', () => {
    expect(() => scopeToInstitution('operacionNueva', {}, COLEGIO)).toThrow();
  });
});

describe('db', () => {
  it('sin colegio activo, la consulta falla antes de llegar a la base', async () => {
    await expect(db.attempt.findMany()).rejects.toThrow(/sin colegio activo/);
  });
});

describe('cobertura del filtro', () => {
  const conColumna = Prisma.dmmf.datamodel.models
    .filter((m) => m.fields.some((f) => f.name === 'institutionId'))
    .map((m) => m.name);

  it('toda tabla con institutionId está en TENANT_MODELS', () => {
    expect(conColumna.filter((m) => !TENANT_MODELS.has(m))).toEqual([]);
  });

  it('toda tabla de TENANT_MODELS tiene institutionId', () => {
    expect([...TENANT_MODELS].filter((m) => !conColumna.includes(m))).toEqual([]);
  });
});

describe('colegio activo por petición', () => {
  it('la guarda fija el colegio del token y llega hasta el handler, también con cuerpo JSON', async () => {
    const { buildServer } = await import('../src/server.js');
    const { getActiveInstitution } = await import('../src/shared/tenant.js');
    const app = await buildServer();
    await app.register(async (scope) => {
      scope.addHook('onRequest', scope.requireStudent);
      scope.post('/v1/_prueba/colegio', async () => {
        // Un salto asíncrono, como el de una consulta real.
        await new Promise((r) => setTimeout(r, 5));
        return { institutionId: getActiveInstitution() ?? null };
      });
    });
    await app.ready();

    const pedir = (institutionId: string) =>
      app.inject({
        method: 'POST',
        url: '/v1/_prueba/colegio',
        headers: {
          authorization: `Bearer ${app.jwt.sign({
            sub: 'u',
            role: 'student',
            institutionId,
            studentProfileId: 'p',
            classroomId: 'c',
          })}`,
        },
        payload: { algo: 'con cuerpo' },
      });

    const [a, b] = await Promise.all([pedir('colegio-a'), pedir('colegio-b')]);
    expect(a.json()).toEqual({ institutionId: 'colegio-a' });
    expect(b.json()).toEqual({ institutionId: 'colegio-b' });
    await app.close();
  });
});
