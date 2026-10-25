// Tutor — el diálogo socrático con el LLM: moderación, detector de fuga de
// respuesta, presupuesto de tokens y degradación a árboles pregrabados.
// Es el primer candidato a servicio propio (escala distinto: latencia de un
// proveedor externo, costo por uso, a futuro un modelo propio en GPU).
// Dueño de: llm_interactions, llm_turns, token_budgets.
export { tutorRoutes } from './routes.js';

// Panel de administración: consumo del mes por colegio.
export { consumoDelMesPorColegio, type ConsumoColegio } from './admin.js';
