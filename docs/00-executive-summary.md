# 00 · Resumen ejecutivo

**NativIA — Alfabetización crítica en Inteligencia Artificial para primaria**
Documento para presentación ante la Secretaría de Educación del Distrito · Bogotá D.C.
Versión 0.1 · 8 de septiembre de 2026 · Confidencial

---

## 1. El problema, en una frase

Los niños colombianos ya usan Inteligencia Artificial, pero **nadie les está enseñando a pensar con
ella en lugar de delegarle el pensamiento** — y la ventana para formar ese criterio se cierra en
primaria, antes de que el hábito de copiar respuestas se vuelva estructura.

## 2. Por qué ahora

Tres hechos convergen en 2026:

1. **Brechas de aprendizaje persistentes.** Los resultados de Colombia en PISA 2025 (Volumen I) y en
   Pruebas SABER 5 mantienen rezagos en matemáticas, lectura y ciencias, concentrados en poblaciones
   vulnerables. `[DATO A VERIFICAR: puntajes y percentiles exactos antes de cualquier uso público —`
   `este documento no cita cifras sin fuente primaria contrastada]`
2. **Marco normativo distrital en formación.** El Distrito tramita un Proyecto de Acuerdo para hacer
   obligatoria la enseñanza de IA en las escuelas. Un currículo obligatorio sin herramientas ni
   material didáctico se convierte en una carga administrativa para el docente; NativIA es la
   herramienta que lo hace ejecutable.
3. **Adopción de IA ya generalizada y no supervisada.** Los estudiantes acceden a chatbots desde
   celulares familiares sin ninguna mediación pedagógica. El problema no es *si* usan IA, sino *cómo*.

## 3. Qué es NativIA

Una **aplicación web progresiva (PWA)** que funciona en tabletas y computadores de sala de cómputo,
**offline en modo degradado**, con tres módulos:

| Módulo | Usuario | Función |
|---|---|---|
| **Exploradores de IA** | Estudiante 3.º–5.º | Rutas gamificadas de aprendizaje en 4 ejes |
| **Panel del Maestro** | Docente de primaria | Progreso, alertas pedagógicas, planes de clase, moderación |
| **Vista Rector** | Coordinación y rectoría | KPIs agregados, comparativos anónimos, reportes MEN |

### Los cuatro ejes formativos

- **Eje A — ¿Qué es la IA y para qué sirve?** Beneficios reales y límites concretos.
- **Eje B — Pensar *con* la IA, no *por* la IA.** Tutor socrático que **nunca da la respuesta**.
- **Eje C — Detective de IA.** Detección de contenido sintético (texto, imagen, audio).
- **Eje D — Ética y responsabilidad.** Dilemas, privacidad, sesgos algorítmicos.

Cada actividad está mapeada explícitamente a **una subcompetencia PISA** y a un **DBA del MEN** para
el grado correspondiente. La alfabetización en IA no compite con matemáticas, lenguaje y ciencias:
**es el vehículo para practicarlas**.

## 4. La decisión de diseño que define el producto

> **El tutor de IA de NativIA tiene prohibido dar la respuesta final.**

No es una restricción de tono: es una regla aplicada en el *system prompt*, verificada por una
batería de *evals* automatizadas y auditada en cada interacción almacenada. Un tutor que resuelve el
ejercicio produce dependencia; uno que pregunta produce pensamiento. Toda la arquitectura pedagógica
y técnica se subordina a esa regla.

Consecuencia directa: **cada interacción IA–estudiante queda registrada íntegra y es consultable por
el docente.** La transparencia no es una función accesoria, es el mecanismo de control pedagógico.

## 5. Salvaguardas para menores (no negociables)

- Consentimiento parental verificable previo a la creación de cuenta (Ley 1581 de 2012, Art. 7).
- **Minimización de datos:** sin dirección, sin teléfono, sin fotografía real del menor. El avatar es
  ilustrado y generado a partir de opciones cerradas.
- **Proxy obligatorio:** el dispositivo del niño nunca habla directo con el modelo. Moderación de
  entrada y de salida, rate limiting y registro auditable en el backend.
- **Detección de señales de riesgo** (bullying, tristeza persistente, revelación de datos sensibles)
  con escalamiento a docente y, según severidad, a orientación escolar.
- **Contratos de no-entrenamiento** con el proveedor de LLM. Los datos de menores nunca entrenan
  modelos.
- Sin publicidad, sin *dark patterns*, sin cajas de recompensa, **sin rankings individuales públicos**.
- Accesibilidad **WCAG 2.2 AA**: lectura en voz alta de todo texto, modo dislexia, contraste y
  tamaño ajustables, navegación completa por teclado.

## 6. Estado actual y alcance de esta entrega

**Lo que existe hoy es un prototipo funcional local**, no un producto desplegado. Decisión explícita
del equipo por ausencia de presupuesto de infraestructura:

- Corre completo en un computador (`docker compose up`), sin costos de nube.
- Incluye una actividad del Eje B en matemáticas **totalmente funcional** con tutor socrático real.
- Funciona **sin API key** en modo `MOCK_LLM`, con árboles de diálogo pregrabados: la demostración
  ante el Distrito no depende de conectividad ni de gasto en tokens.
- La arquitectura de producción escalable a 300.000 estudiantes está **diseñada y documentada**, con
  ADRs justificados, pero no construida.

## 7. Viabilidad económica

Restricción de diseño autoimpuesta: **costo por estudiante-mes inferior a USD $2** para que sea
sostenible en instituciones públicas. Las tres decisiones que lo hacen posible:

1. **Enrutamiento por modelo.** El modelo caro (`claude-sonnet-5`) solo se usa en el tutor socrático
   del Eje B. Clasificación, moderación y generación de alertas usan `claude-haiku-4-5`.
2. **Contenido curado, no generado en vivo.** Los ejes A, C y D no consumen tokens: son actividades
   producidas y revisadas editorialmente por el equipo pedagógico, servidas desde caché local.
3. **Presupuesto de tokens por estudiante**, aplicado en el backend, con degradación transparente a
   árbol socrático pregrabado al agotarse. El costo tiene techo duro, no estimado.

`[SUPUESTO]` El modelo de costos detallado (tokens/actividad × actividades/mes × precio vigente) está
en `docs/11-mvp-scope-and-roadmap.md` y debe recalcularse con precios actuales antes de contratar.

## 8. Cómo se medirá el impacto

No basta con que a los niños les guste. El marco de evaluación (`docs/14-evaluation-framework.md`)
propone:

- **Diseño cuasi-experimental** con grupo control por emparejamiento de instituciones.
- **Instrumento pre/post de alfabetización en IA** (construido para este proyecto, sin equivalente
  validado en español para esta edad — se documenta su proceso de validación).
- **Medición de transferencia** a competencias SABER 5, reconociendo explícitamente que la
  transferencia es un efecto de segundo orden y de horizonte largo: no se prometerá al Distrito una
  mejora de puntajes en un piloto de un semestre.
- **Indicador antagónico obligatorio:** *tasa de delegación acrítica*. Si el uso de NativIA aumenta
  la propensión del estudiante a aceptar respuestas de IA sin verificarlas, el producto falló —
  aunque el resto de métricas suba.

## 9. Ruta propuesta

| Fase | Duración | Resultado |
|---|---|---|
| **Prototipo** (actual) | — | Demo local funcional, documentación completa, validación pedagógica |
| **MVP** | 12 semanas | 12 actividades producidas, 3 módulos, piloto en 2–4 instituciones |
| **Piloto medido** | 1 semestre | ~500 estudiantes, evaluación cuasi-experimental con control |
| **Escalamiento** | 12–18 meses | Localidades priorizadas, integración SIMAT/SSO, certificación |

## 10. Lo que pedimos

1. **Validación pedagógica** del marco de 4 ejes por parte del equipo curricular de la SED.
2. **Concepto jurídico** sobre el mecanismo de consentimiento parental verificable en contexto
   escolar — es hoy el mayor riesgo abierto del proyecto.
3. **Acceso a 2–4 instituciones** dispuestas a un piloto con grupo control.
4. Definición sobre si la integración con **SIMAT/SSO distrital** será obligatoria, y en qué plazo.

---

<self_critique>

**Debilidad 1 — El documento se sustenta en un diagnóstico que no está cuantificado.**
Todas las cifras de PISA y SABER quedaron como `[DATO A VERIFICAR]`. Es honesto, pero un resumen
ejecutivo sin un solo número es débil frente a tomadores de decisión que esperan magnitud del
problema.
*Mitigación:* antes de la presentación, extraer de la fuente primaria (informe OECD PISA 2025
Volumen I y bases ICFES SABER 5) tres cifras: puntaje promedio nacional en las tres áreas, brecha
entre instituciones oficiales y no oficiales, y porcentaje de estudiantes por debajo del nivel 2.
Ninguna otra cifra debe entrar al documento.

**Debilidad 2 — Se promete valor pedagógico sin evidencia de eficacia del enfoque socrático mediado
por LLM en niños de 8–11 años.**
La literatura sobre tutores socráticos con LLM es reciente y mayoritariamente en secundaria,
educación superior y en inglés. Extrapolar a primaria en español y a contextos de bajos recursos es
un salto no justificado en este documento.
*Mitigación:* añadir a la sección 8 una revisión de literatura acotada (5–8 estudios) y reformular la
promesa como hipótesis a validar en el piloto, no como beneficio establecido. Incorporar un estudio
de usabilidad con 12–15 niños antes del MVP para verificar que el diálogo socrático no genera
frustración ni abandono a esa edad.

**Debilidad 3 — La brecha entre lo prometido y lo construido puede leerse como sobreventa.**
El documento describe tres módulos, cuatro ejes y escalamiento a 300.000 estudiantes, mientras lo
entregado es un prototipo local con una actividad funcional. La sección 6 lo aclara, pero está a
mitad del documento y un lector apurado puede quedarse con la promesa.
*Mitigación:* mover el estado real del proyecto a la primera página, junto al problema, y etiquetar
visualmente cada módulo en la sección 3 como `[PROTOTIPO]`, `[DISEÑADO]` o `[DIFERIDO]`. La
credibilidad ante una entidad pública depende más de la precisión sobre el estado que del alcance
de la visión.

</self_critique>
