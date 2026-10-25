import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../shared/db.js';
import { canAccessClassroom } from '../instituciones/index.js';
import { forbidden } from '../../shared/http.js';

export async function privacidadRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.requireStaff);

  // ── Estado de autorizaciones ───────────────────────────────────────────────
  app.get('/classrooms/:classroomId/consents', async (req, reply) => {
    const { classroomId } = z.object({ classroomId: z.string() }).parse(req.params);
    if (!(await canAccessClassroom(req.user.sub, classroomId))) return forbidden(reply);

    const students = await db.studentProfile.findMany({
      where: { classroomId, deletedAt: null },
      include: {
        user: true,
        consents: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const items = students.map((s) => ({
      studentProfileId: s.id,
      firstName: s.user.firstName,
      lastName: s.user.lastName,
      status: s.consents[0]?.status ?? 'pendiente',
      policyVersion: s.consents[0]?.policyVersion ?? null,
    }));

    return {
      granted: items.filter((i) => i.status === 'otorgado').length,
      pending: items.filter((i) => i.status === 'pendiente').length,
      revoked: items.filter((i) => i.status === 'revocado').length,
      policyVersion: 'v0.1-prototipo',
      items,
    };
  });
}
