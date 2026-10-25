// Identidad — quién entra y con qué rol.
// Dueño de: users (credenciales y rol).
// Expone: las rutas de ingreso (estudiante por código + avatar + PIN gráfico;
// adultos por correo y contraseña).
export { identidadRoutes } from './routes.js';

// Panel de administración (cruzan colegios; solo para el módulo plataforma).
export {
  ROLES_ADULTOS,
  type RolAdulto,
  listarAdultos,
  crearAdulto,
  obtenerAdulto,
  cambiarEstadoAdulto,
  restablecerContrasena,
  contarAdultosPorColegio,
  describirUsuarios,
} from './admin.js';
