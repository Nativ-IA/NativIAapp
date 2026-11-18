// =============================================================================
// Servicio de Nati, modo AYUDANTE.
//
// Pipeline por mensaje:
//
//   1 moderación determinística (la del tutor)
//       · riesgo alto            → contención, igual que el tutor
//       · contraseña             → respuesta fija, NO se llama a ningún modelo
//       · otro dato personal     → respuesta fija, NO se llama a ningún modelo
//   2 modelo propio (Qwen3.5-2B + LoRA) con el system prompt del entrenamiento
//   3 verificador: modelo externo barato que ve el mensaje del niño Y la
//     respuesta; si rechaza, un reintento; si rechaza otra vez, mensaje fijo.
//     Es Claude Haiku (Anthropic) o Gemini en Vertex AI, según NATI_VERIFIER.
//   4 sin modelo propio o caído → preguntas frecuentes pregrabadas
//
// Nunca se muestra al niño una respuesta del modelo propio sin verificar
// cuando hay verificador disponible. Si el verificador contesta algo que no es
// APROBADA ni RECHAZADA, cuenta como rechazo. Sin verificador
// (NATI_VERIFIER=none, o anthropic con MOCK_LLM=true), el modelo propio se usa
// igual: es la demo, y queda registrado como tal.
// =============================================================================

import { config, natiMode, natiVerifierMode } from '../../shared/config.js';
import {
  moderateInput,
  containmentReply,
  checkOutputVocabulary,
  llmProvider,
  OwnModelProvider,
  VertexVerifierProvider,
  type LLMProvider,
} from '../tutor/index.js';
import {
  NATI_HELPER_SYSTEM_PROMPT,
  NATI_FAQ,
  NATI_FALLBACK_DEFAULT,
  NATI_PII_REPLY,
  NATI_PASSWORD_REPLY,
  NATI_UNSURE_REPLY,
  NATI_VERIFIER_PROMPT,
  NATI_WORKSHOP_TASK,
  PROMPT_RECIPE,
  type RecipeIngredient,
} from '../contenido/index.js';

export type NatiSource = 'own_model' | 'faq' | 'safety' | 'unsure';

export interface NatiReply {
  content: string;
  source: NatiSource;
  /** Cuántas respuestas rechazó el verificador antes de esta. */
  rejected: number;
  suggestAskTeacher: boolean;
  latencyMs: number;
}

export interface NatiMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ownModel: LLMProvider | null =
  natiMode === 'own_model'
    ? new OwnModelProvider(config.NATI_MODEL_URL!, config.NATI_MODEL_API_KEY)
    : null;

const verifier: LLMProvider =
  natiVerifierMode === 'vertex'
    ? new VertexVerifierProvider(
        config.VERTEX_PROJECT!,
        config.VERTEX_LOCATION,
        config.VERTEX_VERIFIER_MODEL,
      )
    : llmProvider;

/** Se puede inyectar en las pruebas. */
export const natiDeps = {
  ownModel,
  verifier,
  verifierAvailable: () => natiVerifierMode !== 'none',
};

// ── Respuestas pregrabadas ───────────────────────────────────────────────────

/** La pregunta frecuente que corresponde al mensaje, si hay una. */
export function matchFaq(message: string): string | null {
  for (const f of NATI_FAQ) {
    if (f.keys.test(message)) return f.answer;
  }
  return null;
}

export function faqReply(message: string): string {
  return matchFaq(message) ?? NATI_FALLBACK_DEFAULT;
}

// ── Verificador ──────────────────────────────────────────────────────────────

export async function verifyReply(
  childMessage: string,
  reply: string,
): Promise<{ approved: boolean; reason: string }> {
  if (!natiDeps.verifierAvailable()) {
    return { approved: true, reason: 'sin verificador (modo demostración)' };
  }
  try {
    const verdict = await natiDeps.verifier.classify(
      NATI_VERIFIER_PROMPT,
      `Mensaje del niño: "${childMessage}"\n\nRespuesta de Nati: "${reply}"`,
    );
    if (verdict.includes('rechaz')) return { approved: false, reason: 'verificador: rechazada' };
    if (verdict.includes('aprob')) return { approved: true, reason: 'verificador: aprobada' };
    // Respuesta vacía o fuera de formato: ante la duda, no se muestra.
    return { approved: false, reason: 'verificador: respuesta no reconocida' };
  } catch {
    // Verificador caído: ante la duda, no se muestra la respuesta del modelo.
    return { approved: false, reason: 'verificador no disponible' };
  }
}

// ── Mensaje libre (panel de Nati) ────────────────────────────────────────────

export async function handleNatiMessage(args: {
  message: string;
  history: NatiMessage[];
  /** Texto extra para el system prompt (p. ej. el taller). */
  task?: string;
}): Promise<NatiReply> {
  const started = Date.now();
  const mod = moderateInput(args.message);

  // 1 · Moderación. Nada de esto llega a un modelo.
  if (mod.blockAndContain) {
    return done(containmentReply(), 'safety', 0, true, started);
  }
  if (mod.tags.includes('pii:contrasena')) {
    return done(NATI_PASSWORD_REPLY, 'safety', 0, false, started);
  }
  if (mod.tags.some((t) => t.startsWith('pii:'))) {
    return done(NATI_PII_REPLY, 'safety', 0, false, started);
  }

  // 4 · Sin modelo propio: preguntas frecuentes.
  if (!natiDeps.ownModel) {
    return done(faqReply(args.message), 'faq', 0, false, started);
  }

  // 2 y 3 · Modelo propio + verificador, con un reintento.
  const system = args.task
    ? `${NATI_HELPER_SYSTEM_PROMPT}\n\n${args.task}`
    : NATI_HELPER_SYSTEM_PROMPT;

  const messages: NatiMessage[] = [
    ...args.history.slice(-6),
    { role: 'user', content: mod.redactedText },
  ];

  let rejected = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    let text: string;
    try {
      const out = await natiDeps.ownModel.complete({
        system:
          attempt === 0
            ? system
            : `${system}\nTu respuesta anterior no fue adecuada. Responde otra vez, más corto, ` +
              `sin repetir datos del niño y, si hay peligro, pídele hablar con un adulto de confianza.`,
        messages,
      });
      text = out.text;
    } catch {
      // Modelo propio caído → pregrabadas.
      return done(faqReply(args.message), 'faq', rejected, false, started);
    }

    if (!text) {
      rejected++;
      continue;
    }

    const verdict = await verifyReply(args.message, text);
    if (verdict.approved) {
      const badVocab = checkOutputVocabulary(text, 'ayudante');
      if (badVocab.length > 0) {
        // No bloquea: queda en el registro de la ruta como señal de prompt débil.
      }
      return done(text, 'own_model', rejected, false, started);
    }
    rejected++;
  }

  // Dos rechazos. Si hay una pregunta frecuente para esto, va esa: es
  // pregrabada y revisada. Si no, el mensaje fijo. En el taller (task) no,
  // porque ahí la respuesta tiene que hablar de la instrucción del niño.
  const faq = args.task ? null : matchFaq(args.message);
  if (faq) return done(faq, 'faq', rejected, false, started);
  return done(NATI_UNSURE_REPLY, 'unsure', rejected, true, started);
}

// ── Taller de preguntas (B3) ─────────────────────────────────────────────────

/** Revisión determinística de la receta. Sirve sola cuando no hay modelo
 *  propio, y siempre acompaña a la respuesta de Nati para que el front pinte
 *  los ingredientes. Es deliberadamente generosa: la pista fina la da Nati. */
export function checkRecipe(instruction: string): Record<RecipeIngredient, boolean> {
  // Sin tildes ni eñes: `\b` de JavaScript no entiende letras acentuadas.
  const t = instruction
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '');
  const words = t.split(/\s+/).filter(Boolean).length;
  return {
    que:
      words >= 3 &&
      /\b(explica|di|da|ayuda|ensena|pregunta|haz|escribe|cuenta)(me|nos)?\b|\b(ideas?|quiero|necesito|como|que|por que)\b/.test(t),
    para_quien:
      /\b(para (un|una|mi|mis|el|la|los|las|estudiantes?|ninos?|ninas?|cartelera|clase|salon|examen|tarea|exposicion)|de (cuarto|quinto|tercero|primaria|\d+ anos)|hermanit[oa]|mi curso|mi salon)\b/.test(t),
    como:
      /\b(lista|puntos?|frases?|cuento|ejemplo|corto|corta|pasos?|preguntas? de practica|sin (darme|decirme) (la|las) respuestas?|tabla|dibujo|palabras (faciles|sencillas)|en \d+)\b/.test(t),
    revisar: false, // esto se marca en pantalla, cuando el niño compara
  };
}

export async function handleWorkshop(args: {
  situation: string;
  instruction: string;
}): Promise<NatiReply & { recipe: Record<RecipeIngredient, boolean> }> {
  const recipe = checkRecipe(args.instruction);
  const started = Date.now();
  const mod = moderateInput(args.instruction);

  if (mod.blockAndContain) {
    return { ...done(containmentReply(), 'safety', 0, true, started), recipe };
  }
  if (mod.tags.some((t) => t.startsWith('pii:'))) {
    return { ...done(NATI_PII_REPLY, 'safety', 0, false, started), recipe };
  }

  if (natiDeps.ownModel) {
    const reply = await handleNatiMessage({
      message: args.instruction,
      history: [],
      task: NATI_WORKSHOP_TASK(args.situation, mod.redactedText),
    });
    if (reply.source === 'own_model') return { ...reply, recipe };
  }

  // Sin modelo: la pista sale de la receta misma.
  const missing = PROMPT_RECIPE.filter((i) => i.key !== 'revisar' && !recipe[i.key]);
  const has = PROMPT_RECIPE.filter((i) => recipe[i.key]);
  const content =
    missing.length === 0
      ? 'Tu instrucción tiene las tres partes: qué quieres, para quién y cómo. Ahora falta la cuarta, que es tuya: revisar lo que te den.'
      : `${has.length ? `Ya tienes clara la parte «${has[0].label}». ` : ''}Te falta «${missing[0].label}»: ${missing[0].hint}`;
  return { ...done(content, 'faq', 0, false, started), recipe };
}

// ── Auxiliar ─────────────────────────────────────────────────────────────────

function done(
  content: string,
  source: NatiSource,
  rejected: number,
  suggestAskTeacher: boolean,
  started: number,
): NatiReply {
  return { content, source, rejected, suggestAskTeacher, latencyMs: Date.now() - started };
}
