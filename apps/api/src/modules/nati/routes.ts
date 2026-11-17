import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, activeInstitutionId } from '../../shared/db.js';
import { config, natiMode } from '../../shared/config.js';
import { handleNatiMessage, handleWorkshop } from './service.js';
import { NATI_SUGGESTED_QUESTIONS, PROMPT_RECIPE } from '../contenido/index.js';

export async function natiRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.requireStudent);

  /** Lo que el panel necesita para pintarse. */
  app.get('/nati/config', async () => ({
    mode: natiMode,
    suggestedQuestions: NATI_SUGGESTED_QUESTIONS,
    recipe: PROMPT_RECIPE,
  }));

  const limit = {
    rateLimit: {
      max: config.TUTOR_TURNS_PER_MINUTE,
      timeWindow: '1 minute',
      keyGenerator: (req: any) => req.user?.studentProfileId ?? req.ip,
    },
  };

  app.post('/nati/message', { config: limit }, async (req, reply) => {
    const body = z
      .object({
        message: z.string().min(1).max(300),
        history: z
          .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(600) }))
          .max(12)
          .default([]),
      })
      .safeParse(req.body);

    if (!body.success) {
      return reply.code(422).type('application/problem+json').send({
        title: 'No pudimos enviar tu mensaje',
        status: 422,
        detail: 'Escribe un mensaje más corto e inténtalo otra vez.',
      });
    }

    const result = await handleNatiMessage(body.data);
    await logInteraction(req.user.studentProfileId, body.data.message, result);
    return result;
  });

  app.post('/nati/workshop', { config: limit }, async (req, reply) => {
    const body = z
      .object({
        situation: z.string().min(1).max(400),
        instruction: z.string().min(1).max(300),
      })
      .safeParse(req.body);

    if (!body.success) {
      return reply.code(422).type('application/problem+json').send({
        title: 'No pudimos revisar tu instrucción',
        status: 422,
        detail: 'Escribe una instrucción más corta e inténtalo otra vez.',
      });
    }

    const result = await handleWorkshop(body.data);
    await logInteraction(req.user.studentProfileId, body.data.instruction, result);
    return result;
  });
}

/** Registro mínimo: el docente puede ver que el niño habló con Nati y el
 *  equipo sabe cuántas respuestas rechazó el verificador (cada rechazo es un
 *  ejemplo que falta en el dataset). Reusa teacherAlert solo para contención. */
async function logInteraction(
  studentProfileId: string,
  message: string,
  result: { source: string; rejected: number; suggestAskTeacher: boolean },
) {
  try {
    if (result.source === 'safety' && result.suggestAskTeacher) {
      const profile = await db.studentProfile.findUnique({ where: { id: studentProfileId } });
      if (profile) {
        await db.teacherAlert.create({
          data: {
            institutionId: activeInstitutionId(),
            classroomId: profile.classroomId,
            studentProfileId,
            code: 'A-RIESGO',
            severity: 'critica',
            message: 'Una conversación con Nati necesita tu revisión.',
            isContentHidden: true,
            suggestedAction: JSON.stringify({
              type: 'protocolo',
              ref: 'revisar-conversacion',
              label: 'Revisar ahora',
            }),
          },
        });
      }
    }
    await db.auditLog.create({
      data: {
        institutionId: activeInstitutionId(),
        action: 'mensaje_nati',
        targetType: 'student_profile',
        targetId: studentProfileId,
        context: JSON.stringify({
          source: result.source,
          rejected: result.rejected,
          length: message.length,
        }),
      },
    });
  } catch {
    // El registro nunca bloquea la respuesta al niño.
  }
}
