# Módulo plataforma (reservado)

Panel de administración **del equipo NativIA**: lo que opera la plataforma, no lo que enseña.

## Regla que no se negocia

El rol `admin` es técnico y **no ve contenido de menores**: ni transcripciones, ni respuestas, ni
progreso individual (docs/09-security-privacy-plan.md §7.2). Ve colegios, cuentas de adultos,
consumo y auditoría.

## Pantallas previstas

| Pantalla | Qué hace | Habla con |
|---|---|---|
| Colegios | Crear colegio, sedes, cursos y códigos de ingreso | `instituciones` |
| Usuarios | Crear docentes y coordinadores, desactivar, restablecer contraseña | `identidad`, `instituciones` |
| Consumo de IA | Tokens y costo por colegio, estudiantes en modo degradado | `tutor` |
| Auditoría | Quién abrió qué y por qué | `privacidad` |

## Rutas previstas

Todas bajo `/v1/admin/*`, protegidas por una guarda nueva `requireAdmin` en `shared/auth.ts`. Cada
acción que cambia algo escribe en la auditoría.

## Fuera de alcance de la demo

- Doble factor para el admin (el campo `mfaSecret` ya existe en `users`).
- Solicitudes de demo desde la página de contratar.
