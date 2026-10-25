# Módulos del API

El API es un **monolito modular** (ADR-001 en `docs/04-technical-architecture.md`): un solo proceso
con módulos de fronteras explícitas. Cualquiera de ellos se puede sacar después a un servicio
propio, reemplazando su `index.ts` por un cliente HTTP.

```
src/
  server.ts       arma la app y registra los módulos; no tiene lógica
  shared/         config, autenticación, colegio activo, base de datos, respuestas HTTP, eventos
  modules/
    <módulo>/
      index.ts    lo único que otros módulos pueden importar
      routes.ts   rutas HTTP del módulo
      service.ts  lógica
      repo.ts     consultas a sus tablas (pendiente, ver deuda)
```

## Mapa

| Módulo | Qué hace | Dueño de las tablas | Estado |
|---|---|---|---|
| `identidad` | Ingreso del estudiante y de los adultos, roles | `users` | Activo |
| `instituciones` | Colegios, sedes, cursos, asignaciones; permisos sobre un curso | `institutions`, `campuses`, `classrooms`, `classroom_assignments` | Activo |
| `privacidad` | Consentimiento del acudiente, auditoría, derechos del titular | `consent_records`, `audit_log` | Activo |
| `contenido` | Única puerta del API hacia `packages/content` | `axes`, `learning_paths`, `activities`, `badges` | Activo |
| `aprendizaje` | Ruta del estudiante, actividades, intentos, dominio, logros | `student_profiles`, `attempts`, `attempt_events`, `metacognition_responses`, `mastery_scores`, `student_badges` | Activo |
| `tutor` | Diálogo socrático con el LLM, moderación, fuga de respuesta, presupuesto | `llm_interactions`, `llm_turns`, `token_budgets` | Activo · primer candidato a servicio propio |
| `analitica` | Panel docente: inicio, grupo, detalle, transcripciones, alertas | `teacher_alerts`, `classroom_summaries` | Activo |
| `plataforma` | Panel de administración del equipo | — | Reservado (`plataforma/README.md`) |
| `nati` | Asistente que acompaña al estudiante en todas las pantallas | — | Reservado (`nati/README.md`) |

## Reglas

1. **Un módulo solo importa el `index.ts` de otro**, nunca sus archivos internos.
2. **`shared/` no conoce a ningún módulo.**
3. **Solo `contenido` importa `@nativia/content`** dentro del API.
4. **Sin ciclos** entre módulos: dos módulos que se importan entre sí ya no se pueden separar.
5. **La base se usa solo a través de `shared/db.ts`**, nunca importando `@nativia/db`:
   - `db` filtra por colegio. Toda consulta a una tabla con datos de un colegio lleva el colegio
     activo de la petición, que fijan las guardas de `shared/auth.ts` a partir del token. Sin
     colegio activo, la consulta falla antes de llegar a la base.
   - `dbGlobal` no filtra. Solo para lo que cruza colegios por naturaleza: el ingreso, el panel del
     equipo de plataforma (con auditoría) y la verificación de salud.
   - Al crear, `institutionId: activeInstitutionId()` deja explícito de quién es el dato.
6. **Cada tabla tiene un solo módulo dueño**, y solo su `repo.ts` la consulta. Los demás le piden
   los datos por su `index.ts` o escuchan sus eventos (`shared/events.ts`).

Las reglas 1–5 las verifica `pnpm lint:modules` en CI y rompen el build. La 6 se reporta como
advertencia mientras se paga la deuda. Una prueba (`tests/multi-colegio.test.ts`) falla si una tabla
nueva con `institutionId` no queda dentro del filtro.

## Deuda conocida

Hoy las rutas consultan la base directamente (con `db`, sin `repo.ts`), y algunas leen tablas de otros
módulos:

| Quién | Lee tablas de | Cómo se resuelve |
|---|---|---|
| `analitica` (panel, triaje) | `aprendizaje` (intentos, dominio, perfiles), `tutor` (interacciones) | Pedirlo por `aprendizaje/index.ts` y `tutor/index.ts`, o escuchar `aprendizaje.intento_completado` |
| `tutor` (servicio) | `aprendizaje` (intentos), `analitica` (crea alertas) | Publicar `tutor.riesgo_detectado` y que `analitica` cree la alerta |
| `aprendizaje` (rutas) | `contenido` (actividades, logros) | Pedirlo por `contenido/index.ts` |
| `identidad` (ingreso) | `instituciones` (cursos), `aprendizaje` (perfiles) | Pedirlo por sus `index.ts` |
| `privacidad` (autorizaciones) | `aprendizaje` (perfiles) | Pedirlo por `aprendizaje/index.ts` |

Se paga módulo por módulo, a medida que se toca cada uno: mover sus consultas a `repo.ts` y
cambiar las lecturas ajenas por llamadas a la interfaz del dueño.
