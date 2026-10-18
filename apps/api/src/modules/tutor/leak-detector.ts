// =============================================================================
// Detector de fuga de respuesta.
//
// Es la garantía técnica de la propuesta de valor del producto: el tutor NUNCA
// da la respuesta. Tres capas independientes; cualquiera positiva ⇒ regenerar.
//
//   Capa 1 · determinística  — el valor prohibido afirmado como resultado
//   Capa 2 · estructural     — el turno debe contener una pregunta
//   Capa 3 · clasificador    — juicio semántico (haiku)
//
// NOTA sobre la prioridad de las capas (autocrítica de docs/04, debilidad 1):
// la capa 2 es débil y fácil de satisfacer sin cumplir el propósito. Por eso
// aquí NO basta por sí sola para aprobar: solo puede RECHAZAR. La capa 3 es la
// primaria; la 1 es un complemento con cobertura amplia de formas verbales.
// =============================================================================

export interface LeakVerdict {
  isLeak: boolean;
  layer: 1 | 2 | 3 | null;
  reason: string | null;
}

const COMBINING_MARKS = /\p{Mn}/gu; // marcas diacríticas combinantes (NFD)

/** Normaliza para comparar: minúsculas, sin tildes, sin puntuación. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Formas verbales de un número. Amplía la cobertura de la capa 1 más allá de
 *  la coincidencia literal, que era la debilidad señalada en la autocrítica. */
const NUMBER_WORDS: Record<string, string[]> = {
  '0': ['cero'],
  '1': ['uno', 'una'],
  '2': ['dos'],
  '3': ['tres'],
  '4': ['cuatro'],
  '5': ['cinco'],
  '6': ['seis'],
  '7': ['siete'],
  '8': ['ocho'],
  '9': ['nueve'],
  '10': ['diez'],
  '11': ['once'],
  '12': ['doce'],
};

/** Frases que afirman un resultado. Si el valor prohibido aparece cerca de una
 *  de estas, es una fuga aunque la oración termine en signo de interrogación. */
const ASSERTION_CUES = [
  'la respuesta es',
  'el resultado es',
  'son',
  'da',
  'le tocan',
  'quedan',
  'es igual a',
  'exacto',
  'correcto',
  'asi es',
  'ves que',
  'claro que',
];

function expandForbidden(values: string[]): string[] {
  const out = new Set<string>();
  for (const v of values) {
    const n = normalize(v);
    if (!n) continue;
    out.add(n);
    for (const word of NUMBER_WORDS[n] ?? []) out.add(word);
    // Si el valor es una palabra numérica, añade también su cifra.
    for (const [digit, words] of Object.entries(NUMBER_WORDS)) {
      if (words.includes(n)) out.add(digit);
    }
  }
  return [...out];
}

/** Capa 1 — determinística. Busca el valor prohibido afirmado como resultado. */
export function detectLeakDeterministic(
  output: string,
  forbiddenAnswers: string[],
): LeakVerdict {
  const text = normalize(output);
  const forbidden = expandForbidden(forbiddenAnswers);

  for (const value of forbidden) {
    // Coincidencia por palabra completa: "4" no debe disparar dentro de "24".
    const re = new RegExp(`(^|\\s)${escapeRe(value)}($|\\s)`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const idx = m.index;
      const before = text.slice(Math.max(0, idx - 45), idx);

      const asserted = ASSERTION_CUES.some((cue) => before.includes(cue));
      if (asserted) {
        return {
          isLeak: true,
          layer: 1,
          reason: `valor prohibido "${value}" afirmado como resultado`,
        };
      }
    }
  }

  return { isLeak: false, layer: null, reason: null };
}

/** Capa 2 — estructural. Solo RECHAZA; nunca aprueba por sí sola.
 *  Un turno del tutor sin pregunta ya se desvió del rol socrático. */
export function detectLeakStructural(
  output: string,
  opts: { isClosingTurn: boolean },
): LeakVerdict {
  if (opts.isClosingTurn) return { isLeak: false, layer: null, reason: null };

  if (!output.includes('?')) {
    return {
      isLeak: true,
      layer: 2,
      reason: 'el turno no contiene ninguna pregunta',
    };
  }

  // Un turno largo en un tutor socrático suele significar explicación, y una
  // explicación suele contener el resultado.
  const sentences = output.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length > 4) {
    return {
      isLeak: true,
      layer: 2,
      reason: 'el turno excede 4 frases; el tutor está explicando, no preguntando',
    };
  }

  return { isLeak: false, layer: null, reason: null };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
