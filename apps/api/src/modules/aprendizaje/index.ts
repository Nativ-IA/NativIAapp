// Aprendizaje — lo que hace el estudiante: ruta, actividades, intentos,
// metacognición, dominio por competencia y logros.
// Dueño de: student_profiles, attempts, attempt_events,
// metacognition_responses, mastery_scores, student_badges.
export { aprendizajeRoutes } from './routes.js';

// Panel de administración: solo conteos, nunca datos de un niño.
export { contarEstudiantesPorColegio, contarEstudiantesPorCurso } from './admin.js';
