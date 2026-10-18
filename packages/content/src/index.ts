export * from './types.js';
export * from './prompts.js';

import type { Activity, AxisCode } from './types.js';
import { b1Repartidor } from './activities/b1-repartidor.js';
import {
  a1MaquinaAdivina,
  c3AnimalNoExiste,
  d1TareaHermanita,
} from './activities/otras.js';

export const AXES: Array<{
  code: AxisCode;
  name: string;
  displayName: string;
  colorToken: string;
  offlineCapable: boolean;
  tagline: string;
}> = [
  {
    code: 'A',
    name: '¿Qué es la IA y para qué sirve?',
    displayName: '¿Qué es la IA?',
    colorToken: 'eje-a',
    offlineCapable: true,
    tagline: 'Descubre qué puede y qué no puede hacer.',
  },
  {
    code: 'B',
    name: 'Pensar con la IA, no por la IA',
    displayName: 'Piensa con la IA',
    colorToken: 'eje-b',
    offlineCapable: false,
    tagline: 'Aquí la IA no te da respuestas: te hace preguntas.',
  },
  {
    code: 'C',
    name: 'Detective de IA',
    displayName: 'Detective de IA',
    colorToken: 'eje-c',
    offlineCapable: true,
    tagline: 'Aprende a ver qué es real y qué lo hizo una IA.',
  },
  {
    code: 'D',
    name: 'Ética y responsabilidad',
    displayName: 'Decide bien',
    colorToken: 'eje-d',
    offlineCapable: true,
    tagline: 'Piensa qué es justo cuando usas la IA.',
  },
];

export const ACTIVITIES: Activity[] = [
  a1MaquinaAdivina,
  b1Repartidor,
  c3AnimalNoExiste,
  d1TareaHermanita,
];

export function findActivity(slug: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.slug === slug);
}

/** Frases de andamiaje del cierre metacognitivo.
 *  A los 8 años no se tiene el lenguaje para describir el propio pensamiento;
 *  darle palabras es parte de la enseñanza (US-03). */
export const METACOGNITION_SCAFFOLDS = [
  'Me di cuenta solo',
  'Necesité comprobar',
  'Al principio le creí',
  'Cambié de idea',
];

export const METACOGNITION_QUESTION = '¿Qué aprendiste sobre cómo TÚ piensas?';
