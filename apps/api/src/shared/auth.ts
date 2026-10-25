// =============================================================================
// Autenticación y guardas por rol, compartidas por todos los módulos.
//
// El módulo identidad emite los tokens; aquí solo se verifican. Un módulo
// protege sus rutas con `app.addHook('onRequest', app.requireStudent)` o
// `app.requireStaff`, sin saber cómo se firmó el token. Las guardas también
// fijan el colegio activo de la petición (shared/tenant.ts).
// =============================================================================

import type { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import { config } from './config.js';
import { setActiveInstitution } from './tenant.js';

declare module 'fastify' {
  interface FastifyInstance {
    requireStudent: (req: any, reply: any) => Promise<void>;
    requireStaff: (req: any, reply: any) => Promise<void>;
    requireAdmin: (req: any, reply: any) => Promise<void>;
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
      /** Colegio del usuario. Falta solo en el equipo de plataforma. */
      institutionId?: string;
      studentProfileId?: string;
      classroomId?: string;
    };
    user: {
      sub: string;
      role: string;
      institutionId: string;
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
    // Tokens emitidos antes del multi-colegio no traen colegio: a entrar otra vez.
    if (!req.user.institutionId) {
      return reply.code(401).type('application/problem+json').send({
        title: 'Necesitas entrar otra vez',
        status: 401,
        detail: 'Tu avance está guardado.',
      });
    }
    setActiveInstitution(req.user.institutionId);
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
    // Sin colegio: alguien del equipo de plataforma (sus rutas son las del
    // módulo plataforma), o un token emitido antes del multi-colegio.
    if (!req.user.institutionId) {
      return req.user.role === 'admin'
        ? reply.code(403).send({ title: 'Sin colegio asignado', status: 403 })
        : reply.code(401).send({ title: 'Sesión expirada', status: 401 });
    }
    setActiveInstitution(req.user.institutionId);
  });

  // Equipo de plataforma: rol admin y SIN colegio. Sus rutas cruzan colegios
  // (dbGlobal) y nunca muestran datos de los niños (docs/09 §7.2).
  app.decorate('requireAdmin', async (req: any, reply: any) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ title: 'Sesión expirada', status: 401 });
    }
    if (req.user.role !== 'admin' || req.user.institutionId) {
      return reply.code(403).send({ title: 'Sin permiso', status: 403 });
    }
  });
}
