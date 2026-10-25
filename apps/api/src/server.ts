// =============================================================================
// Punto de entrada del API: un solo proceso con módulos de fronteras explícitas
// (ADR-001, monolito modular). Este archivo solo arma la app y registra los
// módulos; la lógica vive en src/modules/*. Mapa y reglas: src/modules/README.md.
// =============================================================================

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, llmMode } from './shared/config.js';
import { registerAuth } from './shared/auth.js';
import { registerTenantContext } from './shared/tenant.js';
import { dbGlobal } from './shared/db.js';
import { identidadRoutes } from './modules/identidad/index.js';
import { aprendizajeRoutes } from './modules/aprendizaje/index.js';
import { tutorRoutes } from './modules/tutor/index.js';
import { analiticaRoutes } from './modules/analitica/index.js';
import { privacidadRoutes } from './modules/privacidad/index.js';
import { plataformaRoutes } from './modules/plataforma/index.js';
import { natiRoutes } from './modules/nati/index.js';

const isProduction = config.NODE_ENV === 'production';

/** Front compilado (apps/web/dist). En producción lo sirve esta misma API. */
const webDist = resolve(dirname(fileURLToPath(import.meta.url)), '../../web/dist');

export async function buildServer() {
  const app = Fastify({
    logger: config.NODE_ENV === 'development' ? { level: 'info' } : true,
    // En Cloud Run las peticiones llegan por el balanceador de Google. Sin esto,
    // req.ip sería la IP del balanceador y el rate limit trataría a todos los
    // usuarios como uno solo.
    trustProxy: isProduction,
  });

  // En producción front y API comparten origen, así que no hace falta CORS.
  await app.register(cors, { origin: !isProduction, credentials: true });
  // Primero el contexto por petición: las guardas de auth escriben en él.
  await registerTenantContext(app);
  await registerAuth(app);
  await app.register(rateLimit, { global: false });

  // Datos de entrada inválidos (zod): 400 con un detalle legible, no un 500.
  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof Error && error.name === 'ZodError') {
      const issue = (error as any).issues?.[0];
      return reply.code(400).type('application/problem+json').send({
        title: 'Datos inválidos',
        status: 400,
        detail: issue ? `${issue.path?.join('.') || 'dato'}: ${issue.message}` : undefined,
      });
    }
    return reply.send(error);
  });

  app.get('/v1/health', async () => {
    let database: 'ok' | 'error' = 'ok';
    try {
      await dbGlobal.$queryRaw`SELECT 1`;
    } catch {
      database = 'error';
    }
    return {
      status: database === 'ok' ? 'ok' : 'degraded',
      database,
      llm: llmMode === 'mock' ? 'mock' : 'ok',
      version: '0.1.0',
    };
  });

  // Cada módulo se registra en su propio contexto: sus guardas (requireStudent,
  // requireStaff) solo aplican a sus rutas.
  await app.register(async (v1) => {
    await v1.register(identidadRoutes);
    await v1.register(aprendizajeRoutes);
    await v1.register(tutorRoutes);
    await v1.register(analiticaRoutes);
    await v1.register(privacidadRoutes);
    await v1.register(plataformaRoutes); // panel del equipo (/v1/admin)
    await v1.register(natiRoutes); // reservado: asistente Nati
  }, { prefix: '/v1' });

  // Un solo servicio y una sola URL para la demo: la API sirve el front.
  // En desarrollo el front lo sirve Vite en :5173 y esto no se activa.
  if (isProduction && existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist });

    // Las rutas del front las resuelve React Router en el navegador: cualquier
    // GET que no sea de la API ni pida un archivo devuelve index.html.
    app.setNotFoundHandler((req, reply) => {
      const path = req.url.split('?')[0];
      const isApi = path === '/v1' || path.startsWith('/v1/');
      const isFile = /\.[a-z0-9]+$/i.test(path);
      if (req.method === 'GET' && !isApi && !isFile) {
        return reply.type('text/html').sendFile('index.html');
      }
      return reply.code(404).type('application/problem+json').send({
        title: 'No encontrado',
        status: 404,
        detail: 'Esa dirección no existe.',
      });
    });
  }

  return app;
}

// Arranque solo cuando se ejecuta directamente (los tests importan buildServer).
if (process.env.NODE_ENV !== 'test') {
  const app = await buildServer();
  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`\n  API de NativIA en http://localhost:${config.PORT}/v1`);
    console.log(`  Tutor: ${llmMode === 'mock' ? 'modo demostración' : config.TUTOR_MODEL}\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
