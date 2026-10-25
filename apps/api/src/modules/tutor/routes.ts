import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, activeInstitutionId } from '../../shared/db.js';
import { config } from '../../shared/config.js';
import { handleTurn } from './service.js';

export async function tutorRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.requireStudent);

  app.post(
    '/tutor/turn',
    {
      config: {
        rateLimit: {
          max: config.TUTOR_TURNS_PER_MINUTE,
          timeWindow: '1 minute',
          keyGenerator: (req: any) => req.user?.studentProfileId ?? req.ip,
        },
      },
    },
    async (req, reply) => {
      const body = z
        .object({
          attemptId: z.string(),
          clientTurnId: z.string().uuid(),
          // 300 caracteres: evita el pegado masivo de enunciados completos
          // para que el modelo los resuelva.
          message: z.string().min(1).max(300),
          choiceKey: z.string().optional(),
        })
        .safeParse(req.body);

      if (!body.success) {
        return reply.code(422).type('application/problem+json').send({
          type: 'https://nativia.edu.co/problems/invalid-turn',
          title: 'No pudimos enviar tu mensaje',
          status: 422,
          detail: 'Escribe un mensaje más corto e inténtalo otra vez. Tu avance está guardado.',
        });
      }

      try {
        const result = await handleTurn({
          studentProfileId: req.user.studentProfileId,
          attemptId: body.data.attemptId,
          message: body.data.message,
          choiceKey: body.data.choiceKey,
        });
        return result;
      } catch (err: any) {
        if (err.statusCode) {
          return reply.code(err.statusCode).type('application/problem+json').send({
            title: 'No pudimos continuar',
            status: err.statusCode,
            detail: 'Algo falló, pero tu avance está guardado. Intenta de nuevo.',
          });
        }
        req.log.error(err);
        return reply.code(500).type('application/problem+json').send({
          title: 'Algo falló',
          status: 500,
          detail: 'Algo falló, pero tu avance está guardado. Intenta de nuevo.',
        });
      }
    },
  );

  // Botón «Preguntar al profe», visible en toda pantalla del estudiante (E-08).
  app.post('/tutor/ask-teacher', async (req, reply) => {
    const body = z
      .object({ attemptId: z.string(), note: z.string().max(300).optional() })
      .parse(req.body);

    const attempt = await db.attempt.findUniqueOrThrow({
      where: { id: body.attemptId },
      include: { studentProfile: true, activity: true },
    });

    await db.teacherAlert.create({
      data: {
        institutionId: activeInstitutionId(),
        classroomId: attempt.studentProfile.classroomId,
        studentProfileId: attempt.studentProfileId,
        code: 'A-EVASION',
        severity: 'baja',
        message: `Un estudiante pidió ayuda en «${attempt.activity.title}».`,
        suggestedAction: JSON.stringify({
          type: 'ver_detalle',
          ref: attempt.studentProfileId,
          label: 'Ver detalle',
        }),
      },
    });

    return reply.code(202).send({ ok: true });
  });
}
