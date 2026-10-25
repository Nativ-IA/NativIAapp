# Módulo nati (reservado)

Nati es el personaje con el que conversa el niño: el brote con forma de signo de interrogación
(docs/03-design-system.md §11). Por ahora se mostrará como una carita feliz fija en pantalla.

Es **un solo personaje con dos modos**:

| Modo | Dónde | Qué hace |
|---|---|---|
| Ayudante | Todas las pantallas del estudiante | Da la bienvenida, explica cómo usar la app, responde preguntas sobre IA |
| Tutora | Dentro de una actividad | Es el tutor socrático que ya existe (módulo `tutor`); nunca da la respuesta |

## Reglas

- Se presenta como IA, no como persona ni como amiga: «Soy Nati, un programa. A veces me equivoco».
- Si el niño la abre en mitad de una actividad, no puede ser un atajo a la respuesta: pasa al modo
  tutora o, como mínimo, por el detector de fuga del módulo `tutor`.
- Usa la misma moderación, las mismas alertas al docente y el mismo presupuesto de tokens que el
  tutor. Lo pide a través de `tutor/index.ts`, nunca importando sus archivos internos.
- Ofrece preguntas sugeridas en botones («¿Tú eres una persona?», «¿Qué hago aquí?»): a los 8–9
  años escribir cuesta.
- Sin red o con `MOCK_LLM=true`, responde desde un árbol de preguntas frecuentes, como el tutor.

## Dónde va cada parte

| Parte | Archivo |
|---|---|
| Rutas del API (`/v1/nati/*`) | `apps/api/src/modules/nati/` |
| Botón y panel en pantalla | `apps/web/src/components/nati/NatiLauncher.tsx` |
| System prompt y árbol de preguntas frecuentes | `packages/content/src/nati.ts` |
