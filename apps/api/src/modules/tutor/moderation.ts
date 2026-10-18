// =============================================================================
// Moderación de entrada — determinística, corre ANTES de cualquier llamada.
//
// Es la capa que no depende de ningún modelo. Su cobertura es limitada por
// diseño: atrapa patrones de alto riesgo con certeza, y deja el resto al
// clasificador. Ver docs/09-security-privacy-plan.md §5.3, riesgo P1.
// =============================================================================

export type RiskLevel = 'ninguno' | 'medio' | 'alto';

export interface ModerationResult {
  /** Texto con la información personal redactada, listo para enviar al modelo. */
  redactedText: string;
  /** Etiquetas de lo detectado. */
  tags: string[];
  risk: RiskLevel;
  /** Si es true, NO se llama al modelo: se responde con contención. */
  blockAndContain: boolean;
}

// --- Patrones de información personal ----------------------------------------
// Deliberadamente conservadores: prefieren el falso positivo. Redactar de más
// degrada un poco el diálogo; redactar de menos envía datos de un menor a un
// tercero.

const PII_PATTERNS: Array<{ tag: string; re: RegExp; replacement: string }> = [
  {
    tag: 'telefono',
    re: /\b(?:\+?57[\s-]?)?[13]\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/g,
    replacement: '[dato oculto]',
  },
  {
    tag: 'numero_largo',
    re: /\b\d{7,}\b/g,
    replacement: '[dato oculto]',
  },
  {
    tag: 'direccion',
    re: /\b(?:calle|carrera|cra|kra|cll|avenida|av|diagonal|transversal|tv|dg)\.?\s*\d+[\s#\-a-z0-9]*/gi,
    replacement: '[dato oculto]',
  },
  {
    tag: 'correo',
    re: /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g,
    replacement: '[dato oculto]',
  },
  {
    tag: 'red_social',
    re: /(?:@[\w.]{3,}|(?:instagram|tiktok|facebook|whatsapp|wpp)\s*:?\s*[\w.]+)/gi,
    replacement: '[dato oculto]',
  },
];

// --- Señales de riesgo --------------------------------------------------------
// La asimetría del daño manda: un falso positivo cuesta la revisión de un
// docente; un falso negativo puede costar la seguridad de un niño.

const RISK_PATTERNS: Array<{ tag: string; re: RegExp; level: RiskLevel }> = [
  {
    tag: 'autolesion',
    re: /\b(?:me quiero morir|quiero morirme|no quiero vivir|me hago dano|me hago daño|me corto|matarme|suicid\w*)\b/i,
    level: 'alto',
  },
  {
    tag: 'abuso',
    re: /\b(?:me pega|me pegan|me golpea|me toca|abus\w+|me hace dano|me hace daño|me amenaza)\b/i,
    level: 'alto',
  },
  {
    tag: 'matoneo',
    re: /\b(?:me molestan|me joden|matoneo|bullying|me hacen bull\w*|se burlan de mi|me humillan|nadie me habla)\b/i,
    level: 'alto',
  },
  {
    tag: 'tristeza_persistente',
    re: /\b(?:siempre estoy triste|todo el tiempo triste|no le importo a nadie|estoy solo siempre|nadie me quiere)\b/i,
    level: 'alto',
  },
];

const CONTAINMENT_REPLY =
  'Gracias por contarme eso. Suena importante y no deberías cargarlo solo. ' +
  '¿Te animarías a contárselo a tu profe o a un adulto en quien confíes? ' +
  'Ellos sí pueden ayudarte de verdad.';

export function moderateInput(text: string): ModerationResult {
  const tags: string[] = [];
  let redacted = text;

  for (const p of PII_PATTERNS) {
    if (p.re.test(redacted)) {
      tags.push(`pii:${p.tag}`);
      redacted = redacted.replace(p.re, p.replacement);
    }
    p.re.lastIndex = 0;
  }

  let risk: RiskLevel = 'ninguno';
  for (const p of RISK_PATTERNS) {
    if (p.re.test(text)) {
      tags.push(`riesgo:${p.tag}`);
      risk = 'alto';
    }
  }

  return {
    redactedText: redacted,
    tags,
    risk,
    blockAndContain: risk === 'alto',
  };
}

export function containmentReply(): string {
  return CONTAINMENT_REPLY;
}

/** Vocabulario prohibido de cara al estudiante (design system §3.3).
 *  Se verifica en la salida: un tutor que dice «modelo de lenguaje» a un niño
 *  de 9 años ya falló, aunque el contenido sea correcto. */
const FORBIDDEN_VOCAB = [
  'algoritmo',
  'modelo de lenguaje',
  'prompt',
  'token',
  'inteligencia artificial generativa',
  'entrenamiento',
  'parámetros',
  'parametros',
];

export function checkOutputVocabulary(text: string): string[] {
  const lower = text.toLowerCase();
  return FORBIDDEN_VOCAB.filter((w) => lower.includes(w));
}
