import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '@nativia/db';
import { config, llmMode } from './config.js';
import { authRoutes } from './routes/auth.js';
import { studentRoutes } from './routes/student.js';
import { tutorRoutes } from './routes/tutor.js';
import { teacherRoutes } from './routes/teacher.js';

declare module 'fastify' {
  interface FastifyInstance {
    requireStudent: (req: any, reply: any) => Promise<void>;
    requireStaff: (req: any, reply: any) => Promise<void>;
  }
}

// El tipo de `request.user` se declara a través de @fastify/jwt. Redeclararlo
// en FastifyRequest choca con el del plugin y rompe `tsc`.
declare module '@fastify/jwt' {
  interface FastifyJWT {
    /** Lo que se firma. El docente no tiene perfil de estudiante ni curso. */
    payload: {
      sub: string;
      role: string;
      studentProfileId?: string;
      classroomId?: string;
    };
    user: {
      sub: string;
      role: string;
      studentProfileId: string;
      classroomId: string;
    };
  }
}

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
  await app.register(jwt, { secret: config.JWT_SECRET });
  await app.register(rateLimit, { global: false });

  app.decorate('requireStudent', async (req: any, reply: any) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).type('application/problem+json').send({
        title: 'Necesitas entrar otra vez',
        status: 401,
        detail: 'Tu avance está guardado.',
      });
    }
    if (req.user.role !== 'student') {
      return reply.code(403).send({ title: 'Sin permiso', status: 403 });
    }
  });

  app.decorate('requireStaff', async (req: any, reply: any) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ title: 'Sesión expirada', status: 401 });
    }
    if (!['teacher', 'coordinator', 'admin'].includes(req.user.role)) {
      return reply.code(403).send({ title: 'Sin permiso', status: 403 });
    }
  });

  app.get('/v1/health', async () => {
    let database: 'ok' | 'error' = 'ok';
    try {
      await prisma.$queryRaw`SELECT 1`;
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

  await app.register(async (v1) => {
    await v1.register(authRoutes);
    await v1.register(studentRoutes);
    await v1.register(tutorRoutes);
    await v1.register(teacherRoutes);
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
