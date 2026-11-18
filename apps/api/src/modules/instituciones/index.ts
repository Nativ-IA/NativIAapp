// Instituciones — la organización escolar. Es el dueño del «colegio» que
// separa los datos de cada cliente (multi-colegio).
// Dueño de: institutions, campuses, classrooms, classroom_assignments.
// Expone: los permisos de un adulto sobre un curso.
export { canAccessClassroom } from './service.js';

// Gestión de la organización (paneles de plataforma y de coordinación). Toda
// función recibe el colegio explícito.
export {
  listarColegios,
  crearColegio,
  obtenerColegio,
  crearSede,
  crearCurso,
  regenerarCodigo,
  asignarCurso,
  quitarAsignacion,
  obtenerCurso,
  nombresDeColegios,
  contarCursos,
} from './admin.js';
