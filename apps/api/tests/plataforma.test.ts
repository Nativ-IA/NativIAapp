// Panel de administración: quién entra y qué genera.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

process.env.JWT_SECRET ??= 'secreto-de-prueba-0123456789';
process.env.DATABASE_URL = 'postgresql://prueba:prueba@localhost:5432/prueba';

let app: FastifyInstance;

beforeAll(async () => {
  const { buildServer } = await import('../src/server.js');
  app = await buildServer();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

function token(payload: Record<string, string>) {
  return `Bearer ${app.jwt.sign({ sub: 'u', role: 'student', ...payload } as any)}`;
}

describe('acceso al panel de administración', () => {
  it('sin sesión, 401', async () => {
    const r = await app.inject({ method: 'GET', url: '/v1/admin/audit' });
    expect(r.statusCode).toBe(401);
  });

  it('un estudiante no entra', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/v1/admin/audit',
      headers: { authorization: token({ role: 'student', institutionId: 'c' }) },
    });
    expect(r.statusCode).toBe(403);
  });

  it('un docente de un colegio no entra', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/v1/admin/audit',
      headers: { authorization: token({ role: 'teacher', institutionId: 'c' }) },
    });
    expect(r.statusCode).toBe(403);
  });

  it('un admin de un colegio no entra: el panel es solo del equipo de plataforma', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/v1/admin/audit',
      headers: { authorization: token({ role: 'admin', institutionId: 'c' }) },
    });
    expect(r.statusCode).toBe(403);
  });

  it('el equipo de plataforma pasa la guarda', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/v1/admin/audit',
      headers: { authorization: token({ role: 'admin' }) },
    });
    // Sin base de datos la consulta falla, pero ya pasó la guarda.
    expect([401, 403]).not.toContain(r.statusCode);
  });

  it('datos inválidos devuelven 400 con detalle, no 500', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/v1/admin/schools',
      headers: { authorization: token({ role: 'admin' }) },
      payload: { name: '', sector: 'otro' },
    });
    expect(r.statusCode).toBe(400);
    expect(r.json().title).toBe('Datos inválidos');
  });
});

describe('generadores', () => {
  it('el código de ingreso tiene 4 caracteres sin ambigüedad visual', async () => {
    const { generarCodigoIngreso, ALFABETO_CODIGO } = await import(
      '../src/modules/instituciones/admin.js'
    );
    expect(ALFABETO_CODIGO).not.toMatch(/[O0I1LS5]/);
    for (let i = 0; i < 200; i++) {
      const c = generarCodigoIngreso();
      expect(c).toMatch(/^[A-Z2-9]{4}$/);
      expect(c).not.toMatch(/[O0I1LS5]/);
    }
  });

  it('la contraseña temporal es legible para dictarla', async () => {
    const { generarContrasenaTemporal } = await import('../src/modules/identidad/admin.js');
    const p = generarContrasenaTemporal();
    expect(p).toMatch(/^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/);
    expect(p).not.toMatch(/[01lIoO]/);
  });
});
