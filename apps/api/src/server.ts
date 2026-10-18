import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
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
  interface FastifyRequest {
    user: {
      sub: string;
      role: string;
      studentProfileId: string;
      classroomId: string;
    };
  }
}

export async function buildServer() {
  const app = Fastify({
    logger: config.NODE_ENV === 'development' ? { level: 'info' } : true,
  });

  await app.register(cors, { origin: true, credentials: true });
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
