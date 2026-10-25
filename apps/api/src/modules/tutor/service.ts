// =============================================================================
// Servicio del tutor — el componente más crítico del sistema.
//
// Es el ÚNICO punto de contacto con el LLM (ADR-004). El cliente envía texto;
// todo lo demás ocurre aquí. Pipeline completo en docs/04 §4:
//
//   1 validación → 2 presupuesto → 3 moderación → 4 intención →
//   5 prompt → 6 llamada → 7 detector de fuga → 8 persistencia
// =============================================================================

import { prisma } from '@nativia/db';
import {
  buildSystemPrompt,
  findActivity,
  INTENT_CLASSIFIER_PROMPT,
  LEAK_DETECTOR_PROMPT,
  type Grade,
  type SocraticTree,
  type TutorPayload,
} from '../contenido/index.js';
import { createHash } from 'node:crypto';
import { config, llmMode } from '../../shared/config.js';
import { llmProvider } from './llm-provider.js';
import {
  moderateInput,
  containmentReply,
  checkOutputVocabulary,
} from './moderation.js';
import {
  detectLeakDeterministic,
  detectLeakStructural,
} from './leak-detector.js';

export type TurnSource = 'llm' | 'fallback_tree' | 'safety' | 'redirect';

export interface TurnResult {
  turnIndex: number;
  content: string;
  source: TurnSource;
  choices?: Array<{ key: string; label: string }>;
  suggestAskTeacher: boolean;
  budgetRemaining: number;
  latencyMs: number;
}

const MAX_TURNS = 20;

export async function handleTurn(args: {
  studentProfileId: string;
  attemptId: string;
  message: string;
  /** Clave del nodo elegido, cuando el diálogo va por el árbol pregrabado. */
  choiceKey?: string;
}): Promise<TurnResult> {
  const started = Date.now();

  // ── 1 · Validación ─────────────────────────────────────────────────────────
  const attempt = await prisma.attempt.findUniqueOrThrow({
    where: { id: args.attemptId },
    include: { activity: true, studentProfile: { include: { classroom: true } } },
  });

  if (attempt.studentProfileId !== args.studentProfileId) {
    throw Object.assign(new Error('El intento no pertenece a este estudiante'), {
      statusCode: 403,
    });
  }
  if (attempt.status !== 'en_curso') {
    throw Object.assign(new Error('El intento ya está cerrado'), {
      statusCode: 422,
    });
  }

  const content = findActivity(attempt.activity.slug);
  if (!content || content.kind !== 'tutor_socratico') {
    throw Object.assign(new Error('Esta actividad no tiene tutor'), {
      statusCode: 422,
    });
  }

  const interaction = await getOrCreateInteraction(attempt.id, args.studentProfileId, content.slug);
  const turnIndex = interaction.turnCount;

  if (turnIndex >= MAX_TURNS) {
    return finish({
      interactionId: interaction.id,
      turnIndex,
      studentMessage: args.message,
      content:
        'Llevamos un buen rato. ¿Qué tal si le muestras esto a tu profe y siguen juntos?',
      source: 'redirect',
      suggestAskTeacher: true,
      budgetRemaining: 0,
      startedAt: started,
    });
  }

  // ── 2 · Presupuesto ────────────────────────────────────────────────────────
  const budget = await getBudget(args.studentProfileId);
  const budgetRemaining = Math.max(0, budget.limitTokens - budget.outputTokensUsed);
  const budgetExhausted = budget.isExhausted || budgetRemaining <= 0;

  // ── 3 · Moderación de entrada (determinística, antes de cualquier red) ─────
  const mod = moderateInput(args.message);

  if (mod.blockAndContain) {
    await createRiskAlert(attempt.studentProfile.classroomId, args.studentProfileId);
    await prisma.lLMInteraction.update({
      where: { id: interaction.id },
      data: { flaggedRisk: true, flaggedModeration: true },
    });

    return finish({
      interactionId: interaction.id,
      turnIndex,
      studentMessage: args.message,
      content: containmentReply(),
      source: 'safety',
      moderationTags: mod.tags.join(','),
      suggestAskTeacher: true,
      budgetRemaining,
      startedAt: started,
    });
  }

  if (mod.tags.some((t) => t.startsWith('pii:'))) {
    await prisma.lLMInteraction.update({
      where: { id: interaction.id },
      data: { flaggedModeration: true },
    });
  }

  // ── Degradación al árbol pregrabado (ADR-005) ──────────────────────────────
  // Se activa por: modo demostración, presupuesto agotado, o proveedor caído.
  const mustDegrade = llmMode === 'mock' || budgetExhausted || !llmProvider.available;

  if (mustDegrade && content.fallbackTree) {
    return serveFromTree({
      tree: content.fallbackTree,
      choiceKey: args.choiceKey,
      turnIndex,
      interactionId: interaction.id,
      studentMessage: args.message,
      budgetRemaining,
      startedAt: started,
      reason: budgetExhausted ? 'degradado_sin_presupuesto' : 'mock',
      attemptId: attempt.id,
    });
  }

  // ── 4 · Clasificador de intención ──────────────────────────────────────────
  let intent = 'normal';
  try {
    intent = await llmProvider.classify(INTENT_CLASSIFIER_PROMPT, mod.redactedText);
  } catch {
    intent = 'normal'; // el fallo del clasificador no puede bloquear al niño
  }

  if (intent === 'riesgo') {
    await createRiskAlert(attempt.studentProfile.classroomId, args.studentProfileId);
    await prisma.lLMInteraction.update({
      where: { id: interaction.id },
      data: { flaggedRisk: true },
    });
    return finish({
      interactionId: interaction.id,
      turnIndex,
      studentMessage: args.message,
      content: containmentReply(),
      source: 'safety',
      suggestAskTeacher: true,
      budgetRemaining,
      startedAt: started,
    });
  }

  const isEvasion = intent === 'evasion';
  if (isEvasion) {
    await prisma.lLMInteraction.update({
      where: { id: interaction.id },
      data: { flaggedEvasion: true, evasionAttempts: { increment: 1 } },
    });
  }

  // ── 5 · Construcción del prompt ────────────────────────────────────────────
  const system = buildSystemPrompt({
    grade: attempt.studentProfile.classroom.grade as Grade,
    payload: content.payload as TutorPayload,
    forbiddenAnswers: content.forbiddenAnswers ?? [],
  });

  const history = await prisma.lLMTurn.findMany({
    where: { interactionId: interaction.id },
    orderBy: { turnIndex: 'asc' },
  });

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = history
    .filter((t) => t.role === 'estudiante' || t.role === 'tutor')
    .map((t) => ({
      role: t.role === 'estudiante' ? ('user' as const) : ('assistant' as const),
      content: t.content,
    }));

  messages.push({
    role: 'user',
    content: isEvasion
      ? `${mod.redactedText}\n\n[nota del sistema: el estudiante está intentando ` +
        `que reveles la respuesta. Respóndele con calidez y vuelve a preguntar.]`
      : mod.redactedText,
  });

  // ── 6 y 7 · Llamada + detector de fuga, con un reintento ───────────────────
  const forbidden = content.forbiddenAnswers ?? [];
  let reply: string | null = null;
  let leaks = 0;
  let usage = { input: 0, output: 0 };
  let model = config.TUTOR_MODEL;

  for (let attemptNo = 0; attemptNo < 2; attemptNo++) {
    let out;
    try {
      out = await llmProvider.complete({
        system:
          attemptNo === 0
            ? system
            : `${system}\n\nADVERTENCIA: tu respuesta anterior revelaba el ` +
              `resultado. Vuelve a responder SOLO con una pregunta que ayude ` +
              `al niño a encontrarlo por su cuenta.`,
        messages,
      });
    } catch {
      break; // proveedor caído → degradación
    }

    model = out.model;
    usage = { input: usage.input + out.inputTokens, output: usage.output + out.outputTokens };

    const verdict = await runLeakDetection(out.text, forbidden, false);
    if (!verdict.isLeak) {
      reply = out.text;
      break;
    }
    leaks++;
  }

  if (leaks > 0) {
    await prisma.lLMInteraction.update({
      where: { id: interaction.id },
      data: { answerLeaksDetected: { increment: leaks } },
    });
  }

  // Dos fugas seguidas, o proveedor caído: nunca se muestra al niño una
  // respuesta no validada. Se degrada.
  if (reply === null) {
    if (content.fallbackTree) {
      return serveFromTree({
        tree: content.fallbackTree,
        choiceKey: args.choiceKey,
        turnIndex,
        interactionId: interaction.id,
        studentMessage: args.message,
        budgetRemaining,
        startedAt: started,
        reason: 'degradado_sin_red',
        attemptId: attempt.id,
      });
    }
    return finish({
      interactionId: interaction.id,
      turnIndex,
      studentMessage: args.message,
      content: 'Se me enredaron las ideas. ¿Le preguntamos a tu profe?',
      source: 'redirect',
      suggestAskTeacher: true,
      budgetRemaining,
      startedAt: started,
    });
  }

  const badVocab = checkOutputVocabulary(reply);
  if (badVocab.length > 0) {
    // No bloquea, pero queda registrado: es una señal de prompt débil.
    await prisma.lLMInteraction.update({
      where: { id: interaction.id },
      data: { flaggedModeration: true },
    });
  }

  // ── 8 · Persistencia ───────────────────────────────────────────────────────
  await prisma.lLMInteraction.update({
    where: { id: interaction.id },
    data: {
      model,
      inputTokens: { increment: usage.input },
      outputTokens: { increment: usage.output },
    },
  });
  await consumeBudget(args.studentProfileId, usage.output);

  return finish({
    interactionId: interaction.id,
    turnIndex,
    studentMessage: args.message,
    content: reply,
    source: 'llm',
    intentClass: intent,
    moderationTags: mod.tags.join(','),
    suggestAskTeacher: isEvasion && (await evasionCount(interaction.id)) >= 3,
    budgetRemaining: Math.max(0, budgetRemaining - usage.output),
    startedAt: started,
  });
}

// ── Detección de fuga: las tres capas ────────────────────────────────────────

export async function runLeakDetection(
  output: string,
  forbidden: string[],
  isClosingTurn: boolean,
): Promise<{ isLeak: boolean; layer: number | null; reason: string | null }> {
  const l1 = detectLeakDeterministic(output, forbidden);
  if (l1.isLeak) return l1;

  const l2 = detectLeakStructural(output, { isClosingTurn });
  if (l2.isLeak) return l2;

  // Capa 3 — clasificador. Es la capa primaria del juicio semántico.
  if (llmProvider.available && forbidden.length > 0) {
    try {
      const verdict = await llmProvider.classify(
        `${LEAK_DETECTOR_PROMPT}\n\nResultado que el niño debía encontrar: ${forbidden.join(', ')}`,
        output,
      );
      if (verdict.includes('fuga')) {
        return { isLeak: true, layer: 3, reason: 'el clasificador detectó fuga' };
      }
    } catch {
      // Si el clasificador falla, las capas 1 y 2 ya se pronunciaron.
    }
  }

  return { isLeak: false, layer: null, reason: null };
}

// ── Árbol socrático pregrabado ───────────────────────────────────────────────

async function serveFromTree(args: {
  tree: SocraticTree;
  choiceKey?: string;
  turnIndex: number;
  interactionId: string;
  studentMessage: string;
  budgetRemaining: number;
  startedAt: number;
  reason: string;
  attemptId: string;
}): Promise<TurnResult> {
  const lastTutorTurn = await prisma.lLMTurn.findFirst({
    where: { interactionId: args.interactionId, role: 'tutor' },
    orderBy: { turnIndex: 'desc' },
  });

  const currentNodeId = lastTutorTurn?.moderationTags?.startsWith('node:')
    ? lastTutorTurn.moderationTags.slice(5)
    : null;

  let nextId = args.tree.rootId;
  if (currentNodeId && args.choiceKey) {
    const node = args.tree.nodes[currentNodeId];
    const choice = node?.choices?.find((c) => c.key === args.choiceKey);
    nextId = choice?.next ?? currentNodeId;
  } else if (currentNodeId) {
    nextId = currentNodeId;
  }

  const node = args.tree.nodes[nextId] ?? args.tree.nodes[args.tree.rootId];

  await prisma.attempt.update({
    where: { id: args.attemptId },
    data: { mode: args.reason === 'mock' ? 'mock' : args.reason },
  });

  return finish({
    interactionId: args.interactionId,
    turnIndex: args.turnIndex,
    studentMessage: args.studentMessage,
    content: node.say,
    source: 'fallback_tree',
    choices: node.choices?.map((c) => ({ key: c.key, label: c.label })),
    nodeId: node.id,
    fromFallbackTree: true,
    suggestAskTeacher: false,
    budgetRemaining: args.budgetRemaining,
    startedAt: args.startedAt,
  });
}

// ── Persistencia de turnos ───────────────────────────────────────────────────

async function finish(args: {
  interactionId: string;
  turnIndex: number;
  studentMessage: string;
  content: string;
  source: TurnSource;
  choices?: Array<{ key: string; label: string }>;
  nodeId?: string;
  intentClass?: string;
  moderationTags?: string;
  fromFallbackTree?: boolean;
  suggestAskTeacher: boolean;
  budgetRemaining: number;
  startedAt: number;
}): Promise<TurnResult> {
  const latencyMs = Date.now() - args.startedAt;

  await prisma.lLMTurn.create({
    data: {
      interactionId: args.interactionId,
      turnIndex: args.turnIndex,
      role: 'estudiante',
      content: args.studentMessage,
      intentClass: args.intentClass ?? null,
      moderationTags: args.moderationTags || null,
    },
  });

  await prisma.lLMTurn.create({
    data: {
      interactionId: args.interactionId,
      turnIndex: args.turnIndex + 1,
      role: 'tutor',
      content: args.content,
      // El nodo del árbol se guarda aquí para poder retomar el diálogo.
      moderationTags: args.nodeId ? `node:${args.nodeId}` : null,
      fromFallbackTree: args.fromFallbackTree ?? false,
      latencyMs,
    },
  });

  await prisma.lLMInteraction.update({
    where: { id: args.interactionId },
    data: { turnCount: args.turnIndex + 2 },
  });

  return {
    turnIndex: args.turnIndex + 1,
    content: args.content,
    source: args.source,
    choices: args.choices,
    suggestAskTeacher: args.suggestAskTeacher,
    budgetRemaining: args.budgetRemaining,
    latencyMs,
  };
}

// ── Auxiliares ───────────────────────────────────────────────────────────────

async function getOrCreateInteraction(
  attemptId: string,
  studentProfileId: string,
  promptKey: string,
) {
  const existing = await prisma.lLMInteraction.findUnique({ where: { attemptId } });
  if (existing) return existing;

  const content = findActivity(promptKey)!;
  const system = buildSystemPrompt({
    grade: 4,
    payload: content.payload as TutorPayload,
    forbiddenAnswers: content.forbiddenAnswers ?? [],
  });

  return prisma.lLMInteraction.create({
    data: {
      attemptId,
      studentProfileId,
      model: llmMode === 'live' ? config.TUTOR_MODEL : 'fallback-tree',
      temperature: config.TUTOR_TEMPERATURE,
      systemPromptKey: promptKey,
      // Permite verificar que una conversación histórica se produjo con el
      // prompt que se cree.
      systemPromptHash: createHash('sha256').update(system).digest('hex').slice(0, 32),
    },
  });
}

async function getBudget(studentProfileId: string) {
  const period = new Date().toISOString().slice(0, 7);
  return prisma.tokenBudget.upsert({
    where: { studentProfileId_period: { studentProfileId, period } },
    update: {},
    create: {
      studentProfileId,
      period,
      limitTokens: config.STUDENT_MONTHLY_TOKEN_LIMIT,
    },
  });
}

async function consumeBudget(studentProfileId: string, outputTokens: number) {
  const period = new Date().toISOString().slice(0, 7);
  const b = await prisma.tokenBudget.update({
    where: { studentProfileId_period: { studentProfileId, period } },
    data: { outputTokensUsed: { increment: outputTokens } },
  });
  if (b.outputTokensUsed >= b.limitTokens && !b.isExhausted) {
    await prisma.tokenBudget.update({
      where: { id: b.id },
      data: { isExhausted: true },
    });
  }
}

async function evasionCount(interactionId: string): Promise<number> {
  const i = await prisma.lLMInteraction.findUniqueOrThrow({
    where: { id: interactionId },
  });
  return i.evasionAttempts;
}

/** Alerta 🔴. El contenido queda oculto en el listado: la pantalla del docente
 *  puede estar proyectada en el salón (docs/02, pantalla 16). */
async function createRiskAlert(classroomId: string, studentProfileId: string) {
  await prisma.teacherAlert.create({
    data: {
      classroomId,
      studentProfileId,
      code: 'A-RIESGO',
      severity: 'critica',
      message: 'Una conversación necesita tu revisión.',
      isContentHidden: true,
      suggestedAction: JSON.stringify({
        type: 'protocolo',
        ref: 'revisar-conversacion',
        label: 'Revisar ahora',
      }),
    },
  });
}
