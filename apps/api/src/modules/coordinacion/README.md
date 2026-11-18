# Módulo coordinacion

Panel del **coordinador de un colegio**: la organización del colegio y lo que hay que resolver en
ella. Pantallas en `apps/web/src/pages/coordinacion/` (`/coordinacion`), rutas en `/v1/school/*`.
El coordinador entra por el mismo ingreso de adultos (`/profe`) y la app lo lleva a su panel.

## Qué ve y qué no (docs/09 §7.2)

| Ve | No ve |
|---|---|
| Cursos, sedes, códigos de ingreso y docentes de su colegio | Nada de otro colegio |
| La lista de estudiantes de cada curso con el estado de su autorización | El avance, las respuestas o el dominio de un estudiante |
| Cifras por curso: estudiantes, autorizados, activos en la semana, actividades del mes | Conversaciones con el tutor |
| Alertas por tipo, gravedad, fecha y estado | A quién se refiere una alerta y qué dice, salvo que la abra con motivo |

Abrir una alerta exige escribir el motivo (mínimo 10 caracteres) y queda en la auditoría con la
acción `consulta_alerta`. La conversación sigue siendo del docente titular.

## Quién entra

`requireCoordinator` (`shared/auth.ts`): rol `coordinator` **con colegio**. Fija el colegio activo
de la petición, así que todo lo que consulta `db` queda limitado a ese colegio. La cuenta de la demo
es `coordinacion@demo.local`, en la IED de Demostración.

## Qué puede hacer

| Acción | Ruta | Le pide a | Auditoría |
|---|---|---|---|
| Ver el colegio | `GET /school` | `instituciones`, `identidad`, `aprendizaje`, `privacidad`, `analitica` | — |
| Ver un curso | `GET /school/classrooms/:id` | los mismos | — |
| Agregar estudiantes (hasta 45 por envío) | `POST /school/classrooms/:id/students` | `identidad` (cuenta), `aprendizaje` (perfil, avatar y PIN) | `matricula_estudiantes` |
| Registrar o revocar una autorización | `POST /school/students/:id/consent` | `privacidad` (registro), `aprendizaje` (acceso) | `cambio_consentimiento` |
| Dar un PIN nuevo | `POST /school/students/:id/pin` | `aprendizaje` | `restablecimiento_pin` |
| Retirar a un estudiante del curso | `POST /school/students/:id/withdraw` | `aprendizaje` | `retiro_estudiante` |
| Asignar o quitar un docente | `POST /school/classrooms/:id/staff`, `…/staff/:userId/remove` | `identidad`, `instituciones` | `asignacion_curso`, `retiro_asignacion` |
| Cambiar el código de ingreso | `POST /school/classrooms/:id/join-code` | `instituciones` | `cambio_codigo_ingreso` |
| Abrir una alerta | `POST /school/alerts/:id/review` | `analitica`, `aprendizaje`, `identidad` | `consulta_alerta`, con motivo |

## Credenciales de los niños

Un estudiante nuevo recibe el avatar menos repetido de su curso y un PIN de tres imágenes
distintas. El PIN sale en claro **una sola vez**, en la respuesta, para imprimir su tarjeta; en la
base queda solo su hash (argon2). Queda bloqueado hasta que se registre la autorización de su
acudiente (US-09).

La autorización es la certificación institucional del flujo híbrido `[SUPUESTO — validación
jurídica pendiente]`: el colegio declara que recibió el formato firmado. Se guarda el canal, el
parentesco y quién lo registró; nunca el documento ni los datos del acudiente.

## Pendiente

- Que coordinación cree cuentas de docentes (hoy lo hace el equipo NativIA desde `/admin`).
- Cargar estudiantes desde SIMAT (puerto `RosterProvider`, docs/04).
- Que una revocación dispare el derecho al olvido (US-09); hoy solo bloquea el acceso.
- Vista Rector con desempeño agregado por grado y eje (docs/02, pantalla 20).
