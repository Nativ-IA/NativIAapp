// Nombres de eje de cara al usuario.
//
// La API los devuelve en `/me/path`, pero varias pantallas necesitan el nombre
// sin haber pedido la ruta completa — la ficha del estudiante en el panel
// docente, o la cabecera de un eje. Estaban duplicados a mano en cada archivo;
// aquí viven una sola vez.
//
// Son los nombres del NIÑO, no los del currículo: «Detective de IA», no
// «evaluar y reflexionar». La traducción al vocabulario PISA es trabajo del
// panel docente (docs/10 §3.2).

export type AxisCode = 'A' | 'B' | 'C' | 'D';

export const AXIS_CODES: AxisCode[] = ['A', 'B', 'C', 'D'];

export const AXIS_NAME: Record<AxisCode, string> = {
  A: '¿Qué es la IA?',
  B: 'Piensa con la IA',
  C: 'Detective de IA',
  D: 'Decide bien',
};

export const AXIS_TAGLINE: Record<AxisCode, string> = {
  A: 'Descubre qué puede y qué no puede hacer.',
  B: 'Aquí la IA no te da respuestas: te hace preguntas.',
  C: 'Aprende a ver qué es real y qué lo hizo una IA.',
  D: 'Piensa qué es justo cuando usas la IA.',
};

/** Clase de texto en el tono `strong` del eje. Nunca `-mark`: los colores de
 *  gráfico no alcanzan 4,5:1 sobre blanco. */
export const AXIS_TEXT: Record<AxisCode, string> = {
  A: 'text-eje-a',
  B: 'text-eje-b',
  C: 'text-eje-c',
  D: 'text-eje-d',
};

export const AXIS_BUTTON: Record<AxisCode, 'a' | 'b' | 'c' | 'd'> = {
  A: 'a',
  B: 'b',
  C: 'c',
  D: 'd',
};

export function isAxisCode(v: string): v is AxisCode {
  return v === 'A' || v === 'B' || v === 'C' || v === 'D';
}
