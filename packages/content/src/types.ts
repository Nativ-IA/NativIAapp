// =============================================================================
// Tipos del contenido pedagógico.
//
// El contenido canónico vive versionado aquí, no en la base de datos (ADR-008):
// todo lo que ve un menor pasa por revisión de código, con revisor, historia y
// posibilidad de revertir.
// =============================================================================

export type AxisCode = 'A' | 'B' | 'C' | 'D';
export type Subject = 'matematicas' | 'lenguaje' | 'ciencias';
export type Grade = 3 | 4 | 5;

export type ActivityKind =
  | 'tutor_socratico'
  | 'clasificacion'
  | 'dilema_ramificado'
  | 'comparacion';

export type BloomLevel =
  | 'recordar'
  | 'comprender'
  | 'aplicar'
  | 'analizar'
  | 'evaluar'
  | 'crear';

/** Un nodo del árbol socrático pregrabado (ADR-005).
 *
 *  Sirve a tres propósitos con el mismo contenido:
 *   1. modo offline,
 *   2. presupuesto de tokens agotado,
 *   3. MOCK_LLM=true — la demo sin API key ni costo.
 *
 *  Usa opciones cerradas: sin LLM no hay comprensión de texto libre, y ofrecer
 *  un campo abierto que nadie interpreta sería peor que no ofrecerlo.
 */
export interface TreeNode {
  id: string;
  /** Lo que dice el tutor al llegar a este nodo. */
  say: string;
  /** Opciones que se le ofrecen al niño. Nodo terminal si está vacío. */
  choices?: Array<{
    key: string;
    label: string;
    /** Nodo al que se avanza. */
    next: string;
  }>;
  /** Marca el cierre exitoso del diálogo. */
  isSuccess?: boolean;
}

export interface SocraticTree {
  rootId: string;
  nodes: Record<string, TreeNode>;
}

/** Contenido de una actividad de clasificación (ejes A y C). */
export interface ClassificationPayload {
  /** Sobre qué se juzga.
   *
   *  `imagen` y `mixto` OBLIGAN a que todos los ítems traigan `mediaUrl`: una
   *  señal visual («la luz no coincide») es inaplicable sobre un párrafo, y
   *  pedirle a un niño que la juzgue sin imagen no enseña, confunde. La regla
   *  la verifica una prueba (tests/content-coherence.test.ts). */
  signalKind: 'texto' | 'imagen' | 'mixto';
  prompt: string;
  /** Señales observables que la actividad enseña. */
  signals: Array<{ key: string; label: string }>;
  items: Array<{
    id: string;
    /** Texto del estímulo, o descripción del medio. */
    content: string;
    mediaUrl?: string;
    /** Respuesta correcta. NUNCA se envía al cliente antes de responder. */
    isSynthetic: boolean;
    /** Pistas progresivas: una señal por pista, sin revelar la respuesta. */
    hints: string[];
    /** Señales válidas para justificar. */
    validSignals: string[];
  }>;
  minCorrect: number;
}

/** Contenido de un dilema ramificado (eje D). */
export interface DilemmaPayload {
  situation: string;
  question: string;
  options: Array<{
    key: string;
    label: string;
    /** Consecuencia narrativa. El dilema no califica: ramifica. */
    consequence: string;
    /** Pregunta de segundo orden. */
    followUp: string;
  }>;
  closing: string;
}

/** Contenido de una comparación humano/IA (ejes A y D). */
export interface ComparisonPayload {
  intro: string;
  rounds: Array<{
    id: string;
    prompt: string;
    /** Lo que "dijo la IA". Siempre se muestra dentro de AIDisclosure. */
    aiAnswer: string;
    truth: string;
    question: string;
    options: Array<{ key: string; label: string; isCorrect: boolean }>;
    explanation: string;
  }>;
  closing: string;
}

/** Contenido de una actividad con tutor socrático (eje B). */
export interface TutorPayload {
  /** Enunciado, fijo a la izquierda de la pantalla durante todo el diálogo. */
  problem: string;
  /** Respuesta errónea atribuida a la IA, que el niño debe evaluar. */
  aiAnswer: string;
  /** Descripción del error. Es para orientar al tutor: NUNCA se enuncia. */
  errorDescription: string;
  /** Lo que el niño debe poder decir con sus palabras al terminar. */
  targetLearning: string;
  /** Ruta de preguntas sugerida. Es guía, no guion. */
  questionPath: string[];
}

export interface Activity {
  slug: string;
  title: string;
  axisCode: AxisCode;
  subject: Subject;
  grade: Grade;
  kind: ActivityKind;
  orderIndex: number;
  estimatedMinutes: number;

  // --- Trazabilidad pedagógica ---
  pisaCompetence: string;
  /** [VERIFICAR — DBA] Correspondencia propuesta, pendiente de contraste
   *  contra el documento oficial del MEN. Ver docs/08-content-blueprint.md. */
  dbaReference: string;
  bloomLevel: BloomLevel;

  // --- Solo tutor_socratico ---
  systemPromptKey?: string;
  /** Valores que el tutor NUNCA puede afirmar como resultado.
   *  Alimenta la capa 1 del detector de fuga. Nunca sale al cliente. */
  forbiddenAnswers?: string[];
  fallbackTree?: SocraticTree;
  maxTurnsBeforeHint?: number;

  payload:
    | TutorPayload
    | ClassificationPayload
    | DilemmaPayload
    | ComparisonPayload;

  /** Sin revisor humano, la actividad no se publica (salvaguarda ética 7). */
  reviewedBy: string | null;
  isPublished: boolean;
}
