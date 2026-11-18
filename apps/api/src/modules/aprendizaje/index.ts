// Aprendizaje — lo que hace el estudiante: ruta, actividades, intentos,
// metacognición, dominio por competencia y logros.
// Dueño de: student_profiles, attempts, attempt_events,
// metacognition_responses, mastery_scores, student_badges.
export { aprendizajeRoutes } from './routes.js';

// Panel de plataforma: solo conteos, nunca datos de un niño.
export { contarEstudiantesPorColegio, contarEstudiantesPorCurso } from './admin.js';

// Matrícula (panel de coordinación, colegio activo).
export {
  PIN_SIMBOLOS,
  AVATARES,
  type SimboloPin,
  generarPin,
  elegirAvatar,
  avataresDeCurso,
  crearPerfilEstudiante,
  estudiantesDeCurso,
  estudiantesDelColegio,
  obtenerPerfil,
  retirarEstudiante,
  nuevoPin,
  cambiarAcceso,
  actividadPorCurso,
} from './matricula.js';
