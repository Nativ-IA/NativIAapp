# Módulo plataforma

Panel de administración **del equipo NativIA**: lo que opera la plataforma, no lo que enseña.
Pantallas en `apps/web/src/pages/admin/` (`/admin`), rutas en `/v1/admin/*`.

## Regla que no se negocia

El rol `admin` es técnico y **no ve contenido de menores**: ni nombres, ni respuestas, ni
conversaciones, ni progreso individual (docs/09-security-privacy-plan.md §7.2). De los estudiantes
solo hay conteos. Ve colegios, cuentas de adultos, consumo y auditoría.

## Quién entra

`requireAdmin` (`shared/auth.ts`): rol `admin` **sin colegio**. Un docente, un coordinador o un
admin asignado a un colegio no entran. La cuenta de la demo es `admin@nativia.local`.

## Cómo está hecho

Este módulo no es dueño de ninguna tabla. Arma cada pantalla pidiendo los datos a su dueño:

| Pantalla | Qué hace | Le pide a |
|---|---|---|
| Colegios | Resumen, lista y alta de colegios | `instituciones`, `identidad`, `aprendizaje`, `tutor` |
| Detalle de un colegio | Sedes, cursos y códigos de ingreso, cuentas de adultos | `instituciones`, `identidad`, `aprendizaje` |
| Consumo de IA | Conversaciones y tokens del mes por colegio; costo si hay tarifa | `tutor` |
| Auditoría | Quién hizo qué, cuándo y en qué colegio | `privacidad`, `identidad`, `instituciones` |

Esas funciones viven en el `admin.ts` de cada módulo, usan `dbGlobal` (cruzan colegios) y solo se
exportan para este módulo. Toda acción que cambia algo escribe en la auditoría.

Las contraseñas temporales se muestran una sola vez; en la base queda solo su hash.

## Costo estimado

Si en Cloud Run se configuran `PRECIO_USD_MTOK_ENTRADA` y `PRECIO_USD_MTOK_SALIDA` (dólares por
millón de tokens, con la tarifa vigente del modelo del tutor), la pantalla de consumo estima el
costo del mes. Sin ellas muestra solo tokens.

## Pendiente

- Doble factor para el admin (el campo `mfaSecret` ya existe en `users`).
- Solicitudes de demo desde la página de contratar.
- Panel del coordinador, a nivel de colegio (carga de estudiantes, autorizaciones).
