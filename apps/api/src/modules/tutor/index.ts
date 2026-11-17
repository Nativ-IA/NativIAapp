// Tutor — el diálogo socrático con el LLM: moderación, detector de fuga de
// respuesta, presupuesto de tokens y degradación a árboles pregrabados.
// Es el primer candidato a servicio propio (escala distinto: latencia de un
// proveedor externo, costo por uso, a futuro un modelo propio en GPU).
// Dueño de: llm_interactions, llm_turns, token_budgets.
export { tutorRoutes } from './routes.js';

// Panel de administración: consumo del mes por colegio.
export { consumoDelMesPorColegio, type ConsumoColegio } from './admin.js';

// ── Para el módulo nati (modo ayudante) ───────────────────────────────────────
// Nati comparte con el tutor la moderación, el verificador barato y el
// proveedor externo. Lo pide por aquí, nunca importando los archivos internos.
export {
  moderateInput,
  containmentReply,
  checkOutputVocabulary,
  type ModerationResult,
} from './moderation.js';
export { llmProvider, type LLMProvider, type CompletionRequest } from './llm-provider.js';
export { OwnModelProvider } from './nati-provider.js';
export { VertexVerifierProvider } from './vertex-verifier.js';
