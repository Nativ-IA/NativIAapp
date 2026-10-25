// Instituciones — la organización escolar. Es el dueño del «colegio» que
// separa los datos de cada cliente (multi-colegio).
// Dueño de: institutions, campuses, classrooms, classroom_assignments.
// Expone: los permisos de un adulto sobre un curso.
export { canAccessClassroom } from './service.js';

// Panel de administración (cruzan colegios; solo para el módulo plataforma).
export {
  listarColegios,
  crearColegio,
  obtenerColegio,
  crearSede,
  crearCurso,
  regenerarCodigo,
  asignarCurso,
  nombresDeColegios,
  contarCursos,
} from './admin.js';
