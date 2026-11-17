// =============================================================================
// B3 · «Taller de preguntas con Nati»
// 5.º · Lenguaje · Eje B · taller_instrucciones
//
// El niño escribe su propia instrucción para una situación y Nati, en modo
// ayudante (modelo propio), le dice qué ingrediente de la receta tiene bien y
// cuál le falta. Nati NO escribe la instrucción por él: da una pista.
//
// Necesita red. Sin modelo propio, la ruta /nati/workshop responde desde una
// revisión determinística de la receta (ver apps/api/src/modules/nati).
// =============================================================================

import type { Activity, PromptWorkshopPayload } from '../types.js';

const payload: PromptWorkshopPayload = {
  intro:
    'Ahora las preguntas las escribes tú. Nati te dirá qué parte de la receta ya tienes y cuál te falta.',
  challenges: [
    {
      id: 'planetas',
      situation:
        'Tienes que hacer una cartelera sobre los planetas para tu salón y quieres que una IA te explique el tema.',
      weakExample: 'planetas',
    },
    {
      id: 'cuento',
      situation:
        'Quieres que una IA te dé ideas para un cuento que vas a escribir tú, sobre un perro que se pierde.',
      weakExample: 'dame un cuento',
    },
    {
      id: 'examen',
      situation:
        'Mañana tienes examen de fracciones y quieres que una IA te ayude a practicar sin que te dé las respuestas.',
      weakExample: 'ayúdame con fracciones',
    },
  ],
  closing:
    'Pedir bien no es un truco: es saber qué quieres, para qué y cómo. Y revisar lo que te dan.',
};

export const b3TallerDePreguntas: Activity = {
  slug: 'taller-de-preguntas',
  title: 'Taller de preguntas con Nati',
  axisCode: 'B',
  subject: 'lenguaje',
  grade: 5,
  kind: 'taller_instrucciones',
  orderIndex: 3,
  estimatedMinutes: 12,
  pisaCompetence: 'LEN.producir',
  dbaReference: 'LEN.5.3', // [VERIFICAR — DBA]
  bloomLevel: 'crear',
  payload,
  reviewedBy: 'equipo-pedagogico-prototipo',
  isPublished: true,
};
