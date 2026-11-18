// Identidad — quién entra y con qué rol.
// Dueño de: users (credenciales y rol).
// Expone: las rutas de ingreso (estudiante por código + avatar + PIN gráfico;
// adultos por correo y contraseña).
export { identidadRoutes } from './routes.js';

// Cuentas de estudiante (panel de coordinación, colegio activo).
export { crearCuentaEstudiante, nombresDeUsuarios } from './estudiantes.js';

// Cuentas de adultos (paneles de plataforma y de coordinación, colegio explícito).
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
