// Inventario de rutas del API.
//
// Protege la reorganización en módulos (ADR-001): si una ruta se pierde al
// mover código entre módulos, el front deja de funcionar sin que falle nada
// más. Arma el servidor sin escuchar ni tocar la base de datos.

import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

const ROUTES: Array<[string, string]> = [
  ['GET', '/v1/health'],
  // identidad
  ['GET', '/v1/auth/classroom/:joinCode'],
  ['POST', '/v1/auth/student'],
  ['POST', '/v1/auth/teacher'],
  // aprendizaje
  ['GET', '/v1/me/path'],
  ['GET', '/v1/axes/:axisCode/activities'],
  ['GET', '/v1/activities/:activityId'],
  ['POST', '/v1/activities/:activityId/attempts'],
  ['POST', '/v1/attempts/:attemptId/complete'],
  ['GET', '/v1/me/transparency'],
  // tutor
  ['POST', '/v1/tutor/turn'],
  ['POST', '/v1/tutor/ask-teacher'],
  // analítica docente
  ['GET', '/v1/classrooms/:classroomId/overview'],
  ['GET', '/v1/classrooms/:classroomId/heatmap'],
  ['GET', '/v1/students/:studentProfileId/detail'],
  ['GET', '/v1/interactions/:interactionId/transcript'],
  ['GET', '/v1/classrooms/:classroomId/alerts'],
  ['POST', '/v1/alerts/:alertId/resolve'],
  // privacidad
  ['GET', '/v1/classrooms/:classroomId/consents'],
  // plataforma (panel del equipo)
  ['GET', '/v1/admin/schools'],
  ['POST', '/v1/admin/schools'],
  ['GET', '/v1/admin/schools/:schoolId'],
  ['POST', '/v1/admin/schools/:schoolId/campuses'],
  ['POST', '/v1/admin/schools/:schoolId/classrooms'],
  ['POST', '/v1/admin/classrooms/:classroomId/join-code'],
  ['POST', '/v1/admin/schools/:schoolId/staff'],
  ['POST', '/v1/admin/staff/:userId/status'],
  ['POST', '/v1/admin/staff/:userId/password'],
  ['GET', '/v1/admin/audit'],
];

let app: FastifyInstance;

beforeAll(async () => {
  process.env.JWT_SECRET ??= 'secreto-de-prueba-0123456789';
  // Solo arma el servidor; nunca se conecta. Valor fijo para no depender del
  // .env de quien corre las pruebas ni del de CI.
  process.env.DATABASE_URL = 'postgresql://prueba:prueba@localhost:5432/prueba';
  const { buildServer } = await import('../src/server.js');
  app = await buildServer();
  await app.ready();
});

describe('rutas del API', () => {
  it.each(ROUTES)('%s %s existe', (method, url) => {
    expect(app.hasRoute({ method: method as any, url })).toBe(true);
  });
});
