// =============================================================================
// Autenticación y guardas por rol, compartidas por todos los módulos.
//
// El módulo identidad emite los tokens; aquí solo se verifican. Un módulo
// protege sus rutas con `app.addHook('onRequest', app.requireStudent)` o
// `app.requireStaff`, sin saber cómo se firmó el token.
// =============================================================================

import type { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import { config } from './config.js';

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

const STAFF_ROLES = ['teacher', 'coordinator', 'admin'];

export async function registerAuth(app: FastifyInstance) {
  await app.register(jwt, { secret: config.JWT_SECRET });

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
    if (!STAFF_ROLES.includes(req.user.role)) {
      return reply.code(403).send({ title: 'Sin permiso', status: 403 });
    }
  });
}
