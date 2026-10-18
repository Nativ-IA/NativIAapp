// =============================================================================
// B1 · «El repartidor confundido»
// 4.º · Matemáticas · Eje B · Tutor socrático
//
// Actividad de referencia del prototipo. Ficha completa en
// docs/08-content-blueprint.md.
// =============================================================================

import type { Activity, TutorPayload, SocraticTree } from '../types.js';

const payload: TutorPayload = {
  problem:
    'María tiene 24 arepas para repartir entre 6 amigos, en partes iguales.\n' +
    'Le preguntó a una IA cuántas arepas le tocan a cada uno.',
  aiAnswer: 'A cada amigo le tocan 5 arepas.',
  errorDescription:
    '5 × 6 = 30, que es más que las 24 arepas que María tiene. El resultado ' +
    'correcto se obtiene repartiendo 24 entre 6.',
  targetLearning: 'Puedo comprobar una respuesta multiplicando al revés',
  questionPath: [
    'Mira lo que dijo la IA. ¿Tú qué opinas?',
    'Si dudas del resultado: ¿cómo podrías comprobarlo sin usar la IA?',
    'Si no sabe cómo: si le das 5 arepas a cada uno de los 6 amigos, ¿cuántas repartes en total?',
    'Cuando diga 30: ¿y cuántas arepas tenía María?',
    'Cuando note la diferencia: entonces, ¿qué pasó?',
    'Al llegar al resultado: ¿cómo lo supiste? ¿Esto funcionaría con cualquier número?',
  ],
};

/** Árbol socrático pregrabado (ADR-005).
 *  Sirve al modo offline, al presupuesto agotado y a MOCK_LLM=true.
 *  Ningún nodo enuncia el resultado: las preguntas llevan a él, no lo dan. */
const fallbackTree: SocraticTree = {
  rootId: 'r1',
  nodes: {
    r1: {
      id: 'r1',
      say: 'Mira lo que dijo la IA. ¿Qué pasaría si le das 5 arepas a cada uno de los 6 amigos?',
      choices: [
        { key: 'sobran', label: 'Sobran arepas', next: 'r2_sobran' },
        { key: 'faltan', label: 'Faltan arepas', next: 'r2_faltan' },
        { key: 'justas', label: 'Quedan justas', next: 'r2_justas' },
      ],
    },
    r2_faltan: {
      id: 'r2_faltan',
      say: 'Vamos a comprobarlo. Si repartes 5 a cada uno de los 6, ¿cuántas repartes en total?',
      choices: [
        { key: '11', label: '11', next: 'r3_no' },
        { key: '30', label: '30', next: 'r3_si' },
        { key: '24', label: '24', next: 'r3_no' },
      ],
    },
    r2_sobran: {
      id: 'r2_sobran',
      say: 'Contemos juntos: 5, 10, 15, 20, 25, 30. ¿Cuántas arepas repartiste?',
      choices: [
        { key: '30', label: '30', next: 'r3_si' },
        { key: '24', label: '24', next: 'r3_no' },
      ],
    },
    r2_justas: {
      id: 'r2_justas',
      say: 'Contemos juntos: 5, 10, 15, 20, 25, 30. ¿Cuántas arepas repartiste?',
      choices: [
        { key: '30', label: '30', next: 'r3_si' },
        { key: '24', label: '24', next: 'r3_no' },
      ],
    },
    r3_no: {
      id: 'r3_no',
      say: 'Casi. Contemos de a 5, una vez por cada amigo: 5, 10, 15, 20, 25, 30. ¿En cuánto terminamos?',
      choices: [
        { key: '30', label: '30', next: 'r3_si' },
        { key: 'otro', label: 'En otro número', next: 'r3_ayuda' },
      ],
    },
    r3_ayuda: {
      id: 'r3_ayuda',
      say: 'Tranquilo, esto cuesta. ¿Quieres intentarlo con tu profe? También puedes volver a contar conmigo.',
      choices: [
        { key: 'contar', label: 'Contar otra vez', next: 'r3_no' },
        { key: 'profe', label: 'Preguntar al profe', next: 'fin_profe' },
      ],
    },
    r3_si: {
      id: 'r3_si',
      say: 'Repartiste 30 arepas. ¿Y cuántas arepas tenía María?',
      choices: [
        { key: '24', label: '24', next: 'r4' },
        { key: '30', label: '30', next: 'r3_no' },
      ],
    },
    r4: {
      id: 'r4',
      say: 'María tenía 24 y la IA repartió 30. ¿Alcanzan las arepas?',
      choices: [
        { key: 'no', label: 'No, faltarían', next: 'r5' },
        { key: 'si', label: 'Sí, alcanzan', next: 'r3_si' },
      ],
    },
    r5: {
      id: 'r5',
      say: '¡Lo encontraste! La IA se equivocó y tú lo comprobaste. ¿Cuántas arepas le darías tú a cada amigo para que alcancen justas?',
      choices: [
        { key: 'menos', label: 'Menos de 5', next: 'fin' },
        { key: 'mas', label: 'Más de 5', next: 'r4' },
      ],
    },
    fin: {
      id: 'fin',
      say: 'Exacto: con menos de 5 alcanzan. Y lo mejor: no le creíste a la IA, lo comprobaste tú. Eso es pensar con la IA, no por la IA.',
      isSuccess: true,
    },
    fin_profe: {
      id: 'fin_profe',
      say: 'Perfecto. Tu profe te va a ayudar. Lo importante es que no te quedaste con la respuesta de la IA sin revisarla.',
      isSuccess: true,
    },
  },
};

export const b1Repartidor: Activity = {
  slug: 'el-repartidor-confundido',
  title: 'El repartidor confundido',
  axisCode: 'B',
  subject: 'matematicas',
  grade: 4,
  kind: 'tutor_socratico',
  orderIndex: 1,
  estimatedMinutes: 8,

  pisaCompetence: 'MAT.interpretar_evaluar',
  // [VERIFICAR — DBA] Propuesta pendiente de contraste con el documento oficial.
  dbaReference: 'MAT.4.6',
  bloomLevel: 'evaluar',

  systemPromptKey: 'b1-repartidor',
  forbiddenAnswers: ['4', 'cuatro', '24/6', '24 dividido entre 6', 'son cuatro arepas'],
  maxTurnsBeforeHint: 6,
  fallbackTree,

  payload,

  reviewedBy: 'equipo-pedagogico-prototipo',
  isPublished: true,
};
