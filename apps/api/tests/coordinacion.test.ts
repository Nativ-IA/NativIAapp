// Panel de coordinación: quién entra, qué valida y cómo se generan las
// credenciales de los niños.

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

describe('acceso al panel de coordinación', () => {
  it('sin sesión, 401', async () => {
    const r = await app.inject({ method: 'GET', url: '/v1/school' });
    expect(r.statusCode).toBe(401);
  });

  it.each([
    ['un estudiante', { role: 'student', institutionId: 'c' }],
    ['un docente', { role: 'teacher', institutionId: 'c' }],
    ['el equipo de plataforma', { role: 'admin' }],
  ])('%s no entra', async (_quien, payload) => {
    const r = await app.inject({
      method: 'GET',
      url: '/v1/school',
      headers: { authorization: token(payload) },
    });
    expect(r.statusCode).toBe(403);
  });

  it('un coordinador sin colegio en el token vuelve a entrar', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/v1/school',
      headers: { authorization: token({ role: 'coordinator' }) },
    });
    expect(r.statusCode).toBe(401);
  });

  it('un coordinador con colegio pasa la guarda', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/v1/school',
      headers: { authorization: token({ role: 'coordinator', institutionId: 'c' }) },
    });
    // Sin base de datos la consulta falla, pero ya pasó la guarda.
    expect([401, 403]).not.toContain(r.statusCode);
  });
});

describe('validación', () => {
  const coordinador = () => ({ authorization: token({ role: 'coordinator', institutionId: 'c' }) });

  it('agregar estudiantes exige al menos uno, con nombre', async () => {
    for (const payload of [{ students: [] }, { students: [{ firstName: '  ' }] }, {}]) {
      const r = await app.inject({
        method: 'POST',
        url: '/v1/school/classrooms/x/students',
        headers: coordinador(),
        payload,
      });
      expect(r.statusCode).toBe(400);
    }
  });

  it('no se agregan más de un curso completo por envío', async () => {
    const { MAX_ESTUDIANTES_POR_ENVIO } = await import('../src/modules/coordinacion/routes.js');
    const students = Array.from({ length: MAX_ESTUDIANTES_POR_ENVIO + 1 }, (_, i) => ({
      firstName: `E${i}`,
    }));
    const r = await app.inject({
      method: 'POST',
      url: '/v1/school/classrooms/x/students',
      headers: coordinador(),
      payload: { students },
    });
    expect(r.statusCode).toBe(400);
  });

  it('una autorización dice su estado y por qué canal llegó', async () => {
    for (const payload of [
      { status: 'otorgado' },
      { status: 'quizas', channel: 'papel' },
      { status: 'otorgado', channel: 'paloma' },
    ]) {
      const r = await app.inject({
        method: 'POST',
        url: '/v1/school/students/x/consent',
        headers: coordinador(),
        payload,
      });
      expect(r.statusCode).toBe(400);
    }
  });

  it('abrir una alerta exige un motivo', async () => {
    for (const payload of [{}, { reason: 'ver' }]) {
      const r = await app.inject({
        method: 'POST',
        url: '/v1/school/alerts/x/review',
        headers: coordinador(),
        payload,
      });
      expect(r.statusCode).toBe(400);
    }
  });

  it('solo se asigna como titular o apoyo', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/v1/school/classrooms/x/staff',
      headers: coordinador(),
      payload: { userId: 'u2', role: 'rector' },
    });
    expect(r.statusCode).toBe(400);
  });
});

describe('credenciales del estudiante', () => {
  it('el PIN son tres imágenes distintas del juego del ingreso', async () => {
    const { generarPin, PIN_SIMBOLOS } = await import('../src/modules/aprendizaje/matricula.js');
    for (let i = 0; i < 200; i++) {
      const pin = generarPin();
      expect(pin).toHaveLength(3);
      expect(new Set(pin).size).toBe(3);
      for (const s of pin) expect(PIN_SIMBOLOS).toContain(s);
    }
  });

  it('el PIN usa las mismas imágenes que la pantalla de ingreso', async () => {
    const { PIN_SIMBOLOS } = await import('../src/modules/aprendizaje/matricula.js');
    const { readFileSync } = await import('node:fs');
    const web = readFileSync(
      new URL('../../web/src/components/PinSymbols.tsx', import.meta.url),
      'utf8',
    );
    const enWeb = web.match(/export type PinKey = ([^;]+);/)![1].match(/'([a-z]+)'/g)!.map((x) => x.slice(1, -1));
    expect([...PIN_SIMBOLOS].sort()).toEqual(enWeb.sort());
  });

  it('el avatar nuevo es el menos repetido del curso', async () => {
    const { elegirAvatar, AVATARES } = await import('../src/modules/aprendizaje/matricula.js');
    const usados = new Map<string, number>(AVATARES.map((a) => [a, 2]));
    usados.set('rana', 1);
    expect(elegirAvatar(usados)).toBe('rana');
    expect(AVATARES).toContain(elegirAvatar(new Map()));
  });

  it('los avatares existen en la ilustración del front', async () => {
    const { AVATARES } = await import('../src/modules/aprendizaje/matricula.js');
    const { readFileSync } = await import('node:fs');
    const fauna = readFileSync(new URL('../../web/src/components/Fauna.tsx', import.meta.url), 'utf8');
    for (const a of AVATARES) expect(fauna).toContain(`'${a}'`);
  });
});

describe('orden de las alertas', () => {
  it('las críticas abiertas van primero aunque haya muchas leves más recientes', async () => {
    const { compararAlertas } = await import('../src/modules/analitica/alertas-colegio.js');
    const t = (min: number) => new Date(Date.UTC(2026, 9, 25, 12, min));
    const alertas = [
      { id: 'b1', status: 'abierta', severity: 'baja', createdAt: t(5) },
      { id: 'b2', status: 'abierta', severity: 'baja', createdAt: t(4) },
      { id: 'b3', status: 'abierta', severity: 'baja', createdAt: t(3) },
      { id: 'm1', status: 'abierta', severity: 'media', createdAt: t(2) },
      { id: 'c1', status: 'abierta', severity: 'critica', createdAt: t(1) },
      { id: 'c0', status: 'atendida', severity: 'critica', createdAt: t(9) },
    ];
    const orden = [...alertas].sort(compararAlertas).map((a) => a.id);
    expect(orden).toEqual(['c1', 'm1', 'b1', 'b2', 'b3', 'c0']);
    // El techo de 3 del inicio del docente conserva la crítica.
    expect(orden.slice(0, 3)).toContain('c1');
  });
});
