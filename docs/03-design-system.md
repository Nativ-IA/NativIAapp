# 03 · Design System "NativIA"

**Alcance:** tokens, componentes base y guía de accesibilidad para los tres módulos.
**Objetivo de accesibilidad:** WCAG 2.2 nivel AA como piso, no como meta.

---

## 1. Principios de diseño visual

| # | Principio | Traducción concreta |
|---|---|---|
| 1 | **Colorido, no infantilizado** | Paleta saturada pero sobria; sin *Comic Sans*, sin globos, sin purpurina. Los niños de 10 años detectan y rechazan lo "para bebés" |
| 2 | **El contenido es el protagonista** | La interfaz es un marco neutro; el color intenso se reserva para identificar ejes y estados |
| 3 | **Objetivos táctiles generosos** | 48×48 px mínimo; 56 px en acciones primarias del módulo estudiante |
| 4 | **Legible antes que bonito** | 18 px base en el módulo estudiante (no 16); interlineado 1.6 |
| 5 | **Movimiento con propósito** | Animación solo para dar retroalimentación o continuidad espacial; respeta `prefers-reduced-motion` |
| 6 | **Dos canales siempre** | Ningún significado se transmite solo por color: color + icono + texto |
| 7 | **Dos identidades visuales** | El módulo estudiante es cálido y espacioso; el docente es denso y eficiente. Comparten tokens, no densidad |

### Marca

**NativIA** — *nativos de IA*. El nombre contiene su propia tesis: esta es la primera generación que
nace con la IA ya puesta, y «nativo» apunta también a lo propio, lo local, lo situado.

La identidad completa está en **§11 · Identidad de marca**. Los activos viven en `packages/ui/brand/`
y el componente en `apps/web/src/components/Logo.tsx`; un cambio de nombre no toca ningún otro
componente.

**El tutor se llama Nati** y es el brote del símbolo. Es un personaje distinto del producto: el niño
conversa con Nati, la institución contrata NativIA.

---

## 2. Tokens de color

> **Todos los valores de esta sección fueron verificados por cálculo**, no elegidos a ojo:
> conversión sRGB→OKLab, simulación de daltonismo Machado-Oliveira-Fernandes (severidad 1,0) y
> ratios WCAG. La primera paleta propuesta **falló** y fue reemplazada; el registro está en §2.5.
> El verificador vive en `packages/ui/scripts/validate_palette.py` y corre en CI.

Cada eje tiene **tres tonos con funciones distintas y no intercambiables**:

| Tono | Función | Restricción que debe cumplir |
|---|---|---|
| `mark` | Marca de dato en gráficos (celdas, barras, puntos) | Banda de luminosidad OKLCH 0,43–0,77 · croma ≥ 0,10 · ΔE CVD ≥ 8 entre pares · ≥ 3:1 vs superficie |
| `strong` | Relleno de botones con texto blanco, iconos y texto de color | ≥ 4,5:1 vs blanco **y** blanco encima ≥ 4,5:1 |
| `soft` | Fondo de superficie con texto `--c-ink` encima | `--c-ink` encima ≥ 4,5:1 |

**Un color `mark` nunca se usa como texto ni como relleno de botón** (varios quedan entre 3,7:1 y
4,1:1 contra blanco). Regla aplicada por lint.

### 2.1 Neutros

| Token | Valor | Uso | vs `#FFFFFF` | vs `--c-surface` |
|---|---|---|---|---|
| `--c-ink` | `#16202B` | Texto principal | 16,46:1 | 15,44:1 |
| `--c-ink-2` | `#4A5866` | Texto secundario, etiquetas | 7,29:1 | 6,84:1 |
| `--c-ink-3` | `#5F6D7A` | Texto terciario, placeholders | 5,31:1 | 4,98:1 |
| `--c-line` | `#DCE3EA` | Bordes, separadores | — | — |
| `--c-surface` | `#F5F8FA` | Tarjetas, paneles | — | — |
| `--c-page` | `#FFFFFF` | Fondo de página | — | — |

> `--c-ink-3` era `#6E7B88` en la primera versión. Medido: **4,33:1 — incumple AA**. Sustituido por
> `#5F6D7A` (5,31:1), que además conserva margen sobre `--c-surface` (4,98:1).

### 2.2 Colores de eje

| Eje | `mark` (gráficos) | `strong` (UI y texto) | `soft` (fondo) |
|---|---|---|---|
| A · ¿Qué es la IA? | `#2F62C4` · 5,73:1 | `#26509F` · **7,69:1** | `#EAEFFA` · ink 14,29:1 |
| B · Piensa con la IA | `#0D9668` · 3,76:1 | `#0A6D4C` · **6,35:1** | `#E3F5EE` · ink 14,55:1 |
| C · Detective de IA | `#AC7100` · 4,10:1 | `#7E5300` · **6,72:1** | `#FAF0DF` · ink 14,58:1 |
| D · Decide bien | `#A03390` · 6,23:1 | `#7E2871` · **8,65:1** | `#F9EAF5` · ink 14,20:1 |

**Resultado del verificador sobre los cuatro `mark` (todos los pares, superficie `#F5F8FA`):**

```
  [PASS] Lightness band         all 4 inside L 0.43-0.77
  [PASS] Chroma floor           all 4 >= 0.1
  [PASS] CVD separation         worst all-pairs #AC7100<->#0D9668 dE 9.5 (deutan) - tritan 8.8
  [PASS] Normal-vision floor    worst all-pairs #AC7100<->#0D9668 dE 17.9 (normal)
  [PASS] Contrast vs surface    all 4 >= 3.0:1
  -> ALL CHECKS PASS
```

### 2.3 Rampa ordinal de dominio (heatmap docente)

El nivel de dominio es un dato **ordinal de magnitud**, no un estado de alerta. Por tanto usa una
rampa de **un solo tono, claro → oscuro**, no la paleta semántica:

| Nivel | Valor | Texto encima | Trama | Etiqueta |
|---|---|---|---|---|
| Necesita apoyo | `#8FA9DE` | `--c-ink` · 6,98:1 | diagonal 45° | ○ |
| Va en camino | `#4A72C6` | blanco · 4,65:1 | ninguna | ◐ |
| Lo maneja bien | `#1D428E` | blanco · 9,45:1 | ninguna | ● |

```
  [PASS] Lightness monotone   steps read light->dark
  [PASS] Adjacent dL          all gaps >= 0.06
  [PASS] Light-end contrast   #8FA9DE at 2.11:1 vs surface   (2,21:1 medido)
  [PASS] Single hue           hue spread 2 deg
  -> ALL CHECKS PASS
```

> **Por qué no verde/amarillo/rojo.** Un semáforo sobre el rostro de un niño de 8 años convierte una
> medida de proceso en un juicio de valor visible en una pantalla que a veces se proyecta en el
> salón. La rampa de un tono comunica *cuánto*, no *bueno o malo*, y libera el rojo para lo que
> realmente requiere acción del adulto.

### 2.4 Semánticos

Reservados. **Nunca se reutilizan como color de serie en un gráfico**, y siempre viajan con icono y
etiqueta de texto — nunca solo color.

| Token | Valor | vs blanco | Significado | Icono obligatorio |
|---|---|---|---|---|
| `--c-ok` | `#0A6D4C` | 6,35:1 | Logrado, correcto, en línea | `✓` |
| `--c-warn` | `#8A5800` | 6,04:1 | Atención, con pistas, degradado | `!` |
| `--c-alert` | `#B0322B` | 6,29:1 | Requiere acción, riesgo | `⚠` |
| `--c-info` | `#26509F` | 7,69:1 | Informativo, neutro | `ⓘ` |
| `--c-ai` | `#5B3E9E` | 7,99:1 | **Marca de contenido generado por IA** | `🤖` |

### 2.5 Registro de decisiones de color

| Fecha | Cambio | Motivo (medido) |
|---|---|---|
| 2026-09-08 | Ejes C y D re-escalonados: ámbar+coral → ámbar+magenta | Par `#9A6200`↔`#C43B33`: **ΔE 2,4 bajo deuteranopía** y 12,1 con visión normal (piso 15). Dos de los cuatro ejes eran indistinguibles para ~8 % de los niños varones |
| 2026-09-08 | Los cuatro ejes se dividen en `mark` / `strong` / `soft` | Un solo tono no puede cumplir a la vez la banda de luminosidad para gráficos y 4,5:1 para texto |
| 2026-09-08 | `--c-ink-3` `#6E7B88` → `#5F6D7A` | Medido 4,33:1; incumplía AA |
| 2026-09-08 | Heatmap: semáforo → rampa de un tono | Regla de datos (ordinal ⇒ una sola tonalidad) + razón pedagógica (§2.3) |

> **`--c-ai` es un token con carga ética.** Todo contenido producido por un modelo se envuelve en un
> contenedor con borde `--c-ai` y la etiqueta persistente «🤖 esto lo dijo una IA — puede
> equivocarse». Este color **no se usa para ninguna otra cosa en todo el producto**: su valor está en
> que el niño lo asocie unívocamente con "salida de máquina". Por eso queda fuera tanto de la paleta
> de ejes como de la rampa de dominio: si apareciera en un gráfico, la asociación se rompería.

### 2.6 Modo oscuro

`[DIFERIDO]` — No se implementa en el MVP. Justificación: el uso es diurno, en aula, en dispositivos
compartidos con brillo alto, y duplicar la matriz de contraste consume tiempo que el módulo estudiante
necesita. Los tokens están estructurados para permitirlo (todos los colores son variables, ningún
literal en componentes), y la guía de implementación queda en `packages/ui/README.md`.

---

## 3. Tipografía

### 3.1 Familias

| Rol | Familia | Fallback | Razón |
|---|---|---|---|
| Interfaz | **Nunito Sans** | `system-ui, -apple-system, "Segoe UI", sans-serif` | Formas abiertas, `a`/`g` de una sola planta, buena legibilidad infantil, licencia SIL OFL |
| Numérica tabular | **Nunito Sans** con `font-variant-numeric: tabular-nums` | — | Alineación de columnas en el panel docente |
| Dislexia (opcional) | **OpenDyslexic** | Nunito Sans | Activable por el estudiante en ajustes |
| Monoespaciada | `ui-monospace, "Cascadia Code", Consolas, monospace` | — | Solo en herramientas internas |

> Las fuentes se **empaquetan localmente** (subconjunto latino), no se cargan desde CDN externo:
> requisito de funcionamiento offline y de no filtrar tráfico de menores a terceros.

### 3.2 Escala

Dos escalas distintas. El módulo estudiante parte de **18 px**, no de 16.

| Token | Estudiante | Docente | Peso | Uso |
|---|---|---|---|---|
| `--t-display` | 40 / 48 | 32 / 40 | 800 | Título de pantalla principal |
| `--t-h1` | 30 / 38 | 24 / 32 | 700 | Título de sección |
| `--t-h2` | 24 / 32 | 20 / 28 | 700 | Subtítulo |
| `--t-body-lg` | 20 / 32 | 18 / 28 | 400 | **Enunciados de actividad** |
| `--t-body` | 18 / 29 | 16 / 24 | 400 | Texto general |
| `--t-small` | 16 / 24 | 14 / 20 | 400 | Metadatos, ayuda |
| `--t-micro` | 14 / 20 | 12 / 16 | 600 | Etiquetas, chips |

**Reglas duras**
- El texto del módulo estudiante **nunca baja de 16 px**.
- Los enunciados de actividad usan `--t-body-lg` con medida de línea de **45–65 caracteres**.
- Sin texto en versalitas ni en mayúsculas sostenidas en párrafos: penaliza a lectores en desarrollo
  y a usuarios con dislexia. Permitido solo en chips de una palabra.
- El control de tamaño del usuario escala del **100 % al 175 %** sin romper el layout ni requerir
  scroll horizontal (WCAG 1.4.4 y 1.4.10).

### 3.3 Registro y voz

| Contexto | Registro | Ejemplo |
|---|---|---|
| Estudiante | Tú, cálido, frases de máx. 15 palabras, presente | «¿Cómo podrías comprobarlo sin usar la IA?» |
| Tutor | Curioso, nunca condescendiente, siempre pregunta | «Buena idea. ¿Qué pasaría si…?» |
| Error para estudiante | Tranquilizador, nunca culpabilizante | «Algo falló, pero tu avance está guardado.» |
| Docente | Usted implícito, directo, sin jerga | «14 estudiantes no logran justificar sus respuestas.» |
| Institucional | Formal, preciso | «Cobertura de autorizaciones vigentes: 94 %.» |

**Vocabulario prohibido de cara al estudiante:** *mastery*, *score*, *engagement*, *competencia
PISA*, *nivel Bloom*, *token*, *prompt*, *IA generativa*, *modelo de lenguaje*.
**Vocabulario prohibido de cara al docente:** los mismos tecnicismos sin glosario adjunto.

---

## 4. Espaciado, radios y elevación

### Escala de espaciado (base 4 px)

`--s-1: 4px` · `--s-2: 8px` · `--s-3: 12px` · `--s-4: 16px` · `--s-5: 24px` · `--s-6: 32px`
· `--s-7: 48px` · `--s-8: 64px`

**Densidad:** el módulo estudiante usa un escalón más de separación que el docente en el mismo
componente (padding de tarjeta: `--s-5` estudiante, `--s-4` docente).

### Radios

`--r-sm: 8px` (chips, campos) · `--r-md: 12px` (tarjetas) · `--r-lg: 20px` (tarjetas de eje,
diálogos) · `--r-full: 9999px` (avatares, píldoras)

### Elevación

| Token | Sombra | Uso |
|---|---|---|
| `--e-0` | ninguna | Superficies planas; **valor por defecto** |
| `--e-1` | `0 1px 2px rgba(22,32,43,.06), 0 1px 3px rgba(22,32,43,.08)` | Tarjetas interactivas |
| `--e-2` | `0 4px 12px rgba(22,32,43,.10)` | Menús, popovers |
| `--e-3` | `0 12px 32px rgba(22,32,43,.16)` | Modales |

La jerarquía se construye con **espacio y color**, no con sombras. Máximo dos niveles de elevación
visibles simultáneamente en pantalla.

---

## 5. Movimiento

| Token | Duración | Curva | Uso |
|---|---|---|---|
| `--m-instant` | 100 ms | `ease-out` | Estados de botón, hover |
| `--m-fast` | 180 ms | `cubic-bezier(.2,.8,.2,1)` | Aparición de elementos |
| `--m-base` | 260 ms | `cubic-bezier(.2,.8,.2,1)` | Transición entre pantallas |
| `--m-slow` | 420 ms | `cubic-bezier(.3,.1,.2,1)` | Celebración de logro |

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Prohibiciones:** sin parpadeo entre 3 y 55 Hz (WCAG 2.3.1, riesgo fotosensible), sin *autoplay* con
sonido, sin animaciones que ocupen más del 25 % de la pantalla de forma continua, sin *confetti* que
retrase la siguiente acción más de 1,5 s.

---

## 6. Iconografía

- **Lucide Icons** (ISC, empaquetado local), trazo 2 px, tamaño base 24 px (32 px en el módulo
  estudiante).
- Los avatares y las mascotas de eje son **ilustración propia** de fauna colombiana, estilo plano de
  dos tonos, `<svg>` inline optimizado.
- **Regla absoluta:** ningún icono aparece solo como control interactivo. Siempre lleva texto visible
  o, cuando el espacio lo impide en la barra del docente, `aria-label` **y** *tooltip*.
- Emoji: permitido en contenido de cara al estudiante (evoca familiaridad, se lee en TTS), prohibido
  en la interfaz estructural del panel docente y en informes institucionales.

---

## 7. Componentes base

Ubicación: `packages/ui/src/components/`. Cada componente documenta *props*, estados y contrato de
accesibilidad.

### 7.1 Inventario

| Componente | Módulo | Estado |
|---|---|---|
| `Button` (primary · secondary · ghost · danger) | Ambos | ✅ |
| `Layout` / `AppShell` | Ambos | ✅ |
| `Avatar` | Ambos | ✅ |
| `ProgressDots` | Estudiante | ✅ |
| `ProgressBar` | Ambos | ✅ |
| `ActivityCard` | Estudiante | ✅ |
| `AxisCard` | Estudiante | ✅ |
| `LLMChat` (+ `ChatBubble`, `ChatComposer`) | Estudiante | ✅ |
| `AIDisclosure` | Estudiante | ✅ |
| `MetacognitionPrompt` | Estudiante | ✅ |
| `AskTeacherButton` | Estudiante | ✅ |
| `ReadAloudButton` | Estudiante | 📐 |
| `ChoiceGrid` (clasificación) | Estudiante | 📐 |
| `HintPanel` | Estudiante | 📐 |
| `BadgeTile` | Estudiante | 📐 |
| `AlertCard` | Docente | 📐 |
| `StudentRow` / `Heatmap` | Docente | 📐 |
| `TranscriptViewer` | Docente | ✅ |
| `KpiTile` | Institucional | 📐 |
| `EmptyState` · `ErrorState` · `Skeleton` | Ambos | ✅ |

### 7.2 `Button`

```
Variantes    primary · secondary · ghost · danger
Tamaños      lg (56px · estudiante) · md (44px · docente) · sm (36px · docente denso)
Estados      default · hover · active · focus-visible · disabled · loading
```

```
┌──────────────────────────┐   primary (estudiante, lg)
│      Empezar             │   fondo --c-eje-{x}, texto blanco, radio --r-md
└──────────────────────────┘   min-height 56px, padding-x --s-6, --t-body-lg peso 700

( Volver al mapa )             secondary: borde 2px --c-line, texto --c-ink
```

- **Foco:** contorno de 3 px en `--c-ink` con desplazamiento de 2 px. Nunca `outline: none` sin
  reemplazo (WCAG 2.4.7 y 2.4.11).
- `disabled` mantiene contraste ≥ 3:1 y **siempre** se acompaña de texto que explique por qué está
  deshabilitado. Un botón gris sin explicación es un callejón sin salida para un niño.
- `loading` conserva el ancho para evitar saltos de layout, y anuncia el cambio por `aria-live`.

### 7.3 `AIDisclosure` — componente ético obligatorio

```
┌────────────────────────────────────────────────┐
│ 🤖  La IA respondió:                           │  borde 2px --c-ai
│                                                │  fondo #F4F0FB
│     "A cada amigo le tocan 5 arepas."          │
│                                                │
│ ⚠ Esto lo dijo una IA. Puede equivocarse.  ⓘ  │  --t-small, --c-ai
└────────────────────────────────────────────────┘
```

**Contrato de uso:** todo texto, imagen o audio generado por un modelo y mostrado a un estudiante
**debe** renderizarse dentro de este componente. Regla de lint personalizada
(`no-raw-ai-content`) que falla el build si una respuesta del endpoint del tutor se renderiza fuera
de él.

Al expandir ⓘ:
> «La IA arma frases que suenan bien porque aprendió de muchos textos. Pero no sabe si son ciertas.
> Por eso tú la revisas.»

### 7.4 `LLMChat`

```
Composición   ChatBubble[] + estado "pensando" + ChatComposer
Roles         tutor (izq., avatar Nati) · estudiante (der., su avatar)
Accesibilidad role="log" aria-live="polite"; cada turno nuevo se anuncia una sola vez
Límites       máx. 300 caracteres por turno del estudiante (evita pegado masivo de enunciados)
Estados       online · degradado (árbol pregrabado) · presupuesto agotado · error
```

En modo degradado, el `ChatComposer` se sustituye por `ChoiceGrid`: sin LLM no hay comprensión de
texto libre, y ofrecer un campo abierto que nadie interpreta es peor que no ofrecerlo.

### 7.5 `MetacognitionPrompt`

Bloqueante. No renderiza botón de omitir. Acepta texto, voz `[C]` o selección de frases de andamiaje.
Nunca muestra retroalimentación de corrección: `aria-describedby` incluye «esto no se califica».

### 7.6 `Heatmap` (docente)

Tres niveles discretos con la rampa ordinal de §2.3, nunca escala continua ni semáforo:

| Nivel | Relleno | Glifo | Trama | Texto alternativo |
|---|---|---|---|---|
| Lo maneja bien | `#1D428E` | ● | — | "Juan Pablo, Detective de IA: lo maneja bien" |
| Va en camino | `#4A72C6` | ◐ | — | "…: va en camino" |
| Necesita apoyo | `#8FA9DE` | ○ | diagonal 45° | "…: necesita apoyo" |

- Cada celda es un elemento enfocable con `aria-label` completo.
- **Tres canales redundantes** — relleno, glifo y trama — de modo que la lectura nunca depende del
  color (WCAG 1.4.1) y sobrevive a impresión monocroma y a `forced-colors`.
- Separación de **2 px del color de superficie entre celdas adyacentes**, no una línea de borde: el
  espaciador evita que dos rellenos contiguos se lean como una sola mancha.
- **Vista de tabla equivalente** (`Ver como tabla`) obligatoria, con el nivel escrito en palabras.
  Es la ruta de acceso para lectores de pantalla y la que se exporta al informe.
- **Sin leyenda de color aislada:** la leyenda muestra glifo + trama + palabra, en el mismo orden que
  la rampa.

---

## 8. Guía de accesibilidad

### 8.1 Cumplimiento objetivo

**WCAG 2.2 nivel AA completo.** Criterios con implicación de diseño explícita:

| Criterio | Requisito | Implementación |
|---|---|---|
| 1.4.3 Contraste mínimo | 4,5:1 texto, 3:1 texto grande | Tokens §2 + verificación en CI |
| 1.4.4 Redimensionar texto | 200 % sin pérdida | Todo en `rem`, sin alturas fijas en contenedores de texto |
| 1.4.10 Reflujo | Sin scroll horizontal a 320 px | Layouts fluidos; pantalla 6 apilable |
| 1.4.11 Contraste no textual | 3:1 en controles | Bordes de campos y botones verificados |
| 1.4.12 Espaciado de texto | Sin pérdida al ajustar | Sin `height` fija en bloques de texto |
| 2.1.1 Teclado | Todo operable | Sin controles solo táctiles o con arrastre obligatorio |
| 2.4.7 Foco visible | Indicador claro | Contorno 3 px, nunca suprimido |
| 2.4.11 Foco no oscurecido | Elemento enfocado visible | Barras fijas con `scroll-margin` |
| 2.5.7 Movimientos de arrastre | Alternativa sin arrastre | `ChoiceGrid` con arrastre **y** con toque |
| 2.5.8 Tamaño del objetivo | ≥ 24×24 px | Piso propio: 48×48 px |
| 3.1.5 Nivel de lectura | — | Objetivo propio: 3.º de primaria en textos de estudiante |
| 3.3.7 Entrada redundante | No repedir información | Sesión persistente |

### 8.2 Lectura en voz alta (TTS)

Requisito E-10, y probablemente la función de accesibilidad de mayor impacto real en este contexto:
buena parte del grupo objetivo lee con dificultad.

- **Botón 🔊 en todas las pantallas** del módulo estudiante, en posición fija.
- Implementación con `SpeechSynthesisUtterance` (`es-CO`, `es-419` o `es-ES` como fallback), sin costo
  ni conexión.
- Al leer, se **resalta el fragmento en curso** — doble canal, apoya el seguimiento visual.
- Controla velocidad (0,8× / 1× / 1,2×) y se puede detener en cualquier momento.
- `[SUPUESTO]` La disponibilidad de voces en español varía según el dispositivo. **Verificar en el
  inventario real de tabletas**; si no hay voz local, se degrada a resaltado sincronizado por
  párrafo sin audio, y se informa al docente.

### 8.3 Modo dislexia

Activable desde ⚙ por el propio estudiante, persistente por perfil:
`OpenDyslexic` + interletrado `0.05em` + interlineado 1.8 + medida de línea 45 caracteres +
fondo crema `#FBF7EF` en bloques de texto largo.

### 8.4 Otras adaptaciones

| Adaptación | Control | Persistencia |
|---|---|---|
| Tamaño de texto 100–175 % | ⚙ estudiante | Perfil |
| Alto contraste | ⚙ estudiante | Perfil |
| Reducir movimiento | Sistema + ⚙ | Sistema tiene prioridad |
| Modo dislexia | ⚙ estudiante | Perfil |
| Velocidad de TTS | En el reproductor | Perfil |

### 8.5 Verificación

| Nivel | Herramienta | Frecuencia |
|---|---|---|
| Automático | `axe-core` en Playwright, sobre todas las rutas | Cada PR (bloqueante) |
| Automático | Script de contraste sobre los tokens | Cada PR (bloqueante) |
| Manual | Navegación completa solo con teclado | Cada release |
| Manual | NVDA + TalkBack en las 10 pantallas críticas | Cada release |
| Con usuarios | Sesión con 3 estudiantes con necesidades de apoyo | Antes del piloto |

> El testeo automático detecta cerca del 30 % de los problemas reales de accesibilidad. **Los tres
> niveles son obligatorios**; declarar conformidad AA solo con `axe` verde sería falso.

---

## 9. Implementación

### 9.1 Tailwind

```js
// packages/ui/tailwind.config.js  (extracto)
export default {
  theme: {
    extend: {
      colors: {
        ink:   { DEFAULT:'#16202B', 2:'#4A5866', 3:'#5F6D7A' },
        line:  '#DCE3EA',
        surf:  '#F5F8FA',
        // eje.X       = strong  → botones, iconos y texto  (>= 4.5:1 vs blanco)
        // eje.X-mark  = marca de dato en graficos            (validado por CVD)
        // eje.X-soft  = fondo de superficie                  (ink encima >= 4.5:1)
        eje:   {
          a:'#26509F', 'a-mark':'#2F62C4', 'a-soft':'#EAEFFA',
          b:'#0A6D4C', 'b-mark':'#0D9668', 'b-soft':'#E3F5EE',
          c:'#7E5300', 'c-mark':'#AC7100', 'c-soft':'#FAF0DF',
          d:'#7E2871', 'd-mark':'#A03390', 'd-soft':'#F9EAF5',
        },
        // rampa ordinal de dominio (un solo tono, claro -> oscuro)
        mastery: { 1:'#8FA9DE', 2:'#4A72C6', 3:'#1D428E' },
        ok:'#0A6D4C', warn:'#8A5800', alert:'#B0322B', info:'#26509F', ai:'#5B3E9E',
      },
      fontFamily: { sans:['"Nunito Sans"','system-ui','sans-serif'], dys:['OpenDyslexic','sans-serif'] },
      borderRadius: { sm:'8px', md:'12px', lg:'20px' },
      spacing: { 1:'4px',2:'8px',3:'12px',4:'16px',5:'24px',6:'32px',7:'48px',8:'64px' },
      minHeight: { touch:'48px', 'touch-lg':'56px' },
    },
  },
}
```

### 9.2 Reglas de lint propias

| Regla | Falla cuando |
|---|---|
| `no-raw-ai-content` | Contenido del endpoint del tutor se renderiza fuera de `<AIDisclosure>` |
| `no-hardcoded-color` | Aparece un literal hex fuera de `tokens/` |
| `no-mark-as-text` | Un token `eje.*-mark` se usa como `color`, `border-color` o relleno de botón |
| `no-icon-only-button` | Un `<button>` no tiene texto visible ni `aria-label` |
| `min-touch-target` | Un control interactivo declara altura < 48 px en el módulo estudiante |
| `no-student-jargon` | Aparece vocabulario de la lista prohibida (§3.3) en rutas de estudiante |

Las cuatro primeras son bloqueantes; las dos últimas advierten y se revisan en *code review*.

### 9.3 Verificación de la paleta en CI

```bash
python packages/ui/scripts/validate_palette.py \
  "#2F62C4,#0D9668,#AC7100,#A03390" --mode light --surface "#F5F8FA" --pairs all
python packages/ui/scripts/validate_palette.py \
  "#8FA9DE,#4A72C6,#1D428E" --mode light --surface "#F5F8FA" --ordinal
```

Salida distinta de `ALL CHECKS PASS` ⇒ build fallido. Las tablas de §2 se **generan** desde esta
salida; no se editan a mano.

---

## 11 · Identidad de marca

### 11.1 El nombre

**NativIA** — *nativos de IA*. El nombre lleva su tesis dentro: esta es la primera generación que
nace con la IA ya puesta. Y «nativo» apunta también a lo propio, lo local, lo situado — que es
exactamente lo que la actividad D3 le enseña al niño: *tú sabes cosas de tu barrio que la IA no sabe*.

En el logotipo, **«IA» va en el color de marca y «Nativ» en tinta**. No es un adorno: hace legible el
juego de palabras de un vistazo para un rector que ve el nombre por primera vez.

### 11.2 El símbolo — «La semilla que pregunta»

Un brote de dos hojas cuyo tallo se curva hasta volverse un **signo de interrogación**, con la
semilla como punto.

```
        ___
       /   \        el tallo se curva y se vuelve pregunta
      |     |
   \  |  /           las dos hojas: cotiledones, lo que acaba de nacer
    \_|_/
      |
      ·              la semilla es el punto del signo
```

**Por qué este símbolo y no otro.** El producto entero cabe en ese gesto: aquí la IA no entrega
respuestas, hace crecer preguntas. Y resuelve el encargo de la doble lectura sin partirse en dos:

| Quién mira | Qué ve |
|---|---|
| **Rector** | Crecimiento e indagación. Sobrio, imprimible en un oficio en blanco y negro. Ningún guiño infantil que le reste seriedad ante la SED |
| **Niño de 8 años** | Una plantica que pregunta. Y esa plantica es **Nati**, con quien conversa |
| **Docente** | Un ícono que puede dibujar en el tablero en tres trazos |

**Las dos hojas no son decorativas.** Con una sola hoja el símbolo se absorbe en el trazo del tallo y
se lee como un signo de interrogación corriente. Se probaron cuatro variantes a 96, 48 y 24 px
(`apps/web/public/marca.html`); el par de cotiledones es el único que sobrevive a 24 px como brote.
La comparación se conserva: es la evidencia de por qué el símbolo es como es.

### 11.3 Personaje: Nati

El tutor con el que conversa el niño **se llama Nati y es el brote del símbolo**. Es un personaje
distinto del producto:

> El niño conversa con Nati. La institución contrata NativIA.

Esa separación importa. Un niño no debe sentir que conversa con «la plataforma»; y un rector no debe
ver una mascota donde espera un proveedor. En el chat, Nati usa 🌱 y **no es fauna**: los avatares de
los estudiantes son animales colombianos, Nati no. Que el tutor no se vea como un animal más ayuda al
niño a distinguirlo de sus compañeros y a recordar que no es una persona.

### 11.4 Color de marca

| Token | Valor | vs blanco | Uso |
|---|---|---|---|
| `--c-brand` | `#007895` | 5,10:1 | Símbolo, «IA» del logotipo, acentos institucionales |
| `--c-brand-soft` | `#E4F1F5` | ink 14,3:1 | Fondos de sección institucional |
| `--c-brand-deep` | `#004E60` | blanco 9,3:1 | Rellenos con texto blanco |

**Elegido por cálculo, no por gusto.** Se barrieron 360° de tono buscando el color que maximizara la
distancia mínima contra todo lo ya reservado en el sistema. `#007895` es el único candidato que
supera **10 ΔE** contra los cuatro ejes, sus cuatro tonos de gráfico, el morado de contenido de IA y
los tres colores semánticos, manteniendo 4,5:1 sobre blanco.

> **Restricción heredada:** el morado `--c-ai` (`#5B3E9E`) está reservado para marcar contenido
> generado por un modelo y **la marca no puede usarlo**. Si el logo compartiera color con la etiqueta
> «esto lo dijo una IA», se rompería la única asociación que el producto necesita que el niño aprenda
> sin ambigüedad.

### 11.5 Claims

| Contexto | Texto |
|---|---|
| Institucional (rectoría, SED, oficios) | **«Nativos de la IA. Dueños de sus preguntas.»** |
| Estudiante (pantalla de ingreso) | **«Aprende a pensar con la IA»** |

El claim institucional hace el trabajo político: reconoce el hecho consumado (*son nativos de la IA*,
no se puede des-inventar) y propone el objetivo (*dueños de sus preguntas*). Es la tesis del proyecto
en seis palabras.

### 11.6 Activos y uso

| Activo | Ruta |
|---|---|
| Símbolo (`currentColor`) | `packages/ui/brand/mark.svg` |
| Componente React (`Mark`, `Logo`) | `apps/web/src/components/Logo.tsx` |
| Favicon / ícono de app | `apps/web/public/favicon.svg` |
| Banco de pruebas del símbolo | `apps/web/public/marca.html` |

**Reglas de uso**
- El símbolo usa `currentColor`: hereda el color del contexto y sobrevive a impresión monocroma y a
  `forced-colors`.
- Área de resguardo: media altura del símbolo por cada lado.
- **Nunca** se rota, se inclina, se le cambian las proporciones ni se le añade sombra.
- **Nunca** se usa el símbolo dentro de un `AIDisclosure`: ese contenedor es del morado de IA.
- Tamaño mínimo del símbolo: 24 px. Por debajo, se usa el favicon con fondo sólido.
- `[PENDIENTE]` El logotipo usa Nunito Sans viva, no trazada. Antes de cualquier uso impreso oficial
  hay que **convertir el texto a curvas**; hoy depende de que la fuente esté disponible.

---

<self_critique>

**Debilidad 1 — La paleta pasa el verificador, pero el verificador no ve la pantalla real.**
Los cuatro colores de eje cumplen ΔE ≥ 8 bajo protanopía y deuteranopía y ≥ 3:1 contra la
superficie, medido y no estimado. Nada de eso garantiza legibilidad en una tableta de gama baja, con
brillo alto, pantalla rayada y luz de mediodía entrando por la ventana — que es la condición real de
uso. El margen del extremo claro de la rampa ordinal (2,21:1 sobre un piso de 2,0:1) es
particularmente frágil ante una pantalla degradada.
*Mitigación:* fotografiar las cuatro tarjetas de eje y el heatmap en dos aulas reales, con los
dispositivos reales, antes de congelar los tokens; si el extremo claro de la rampa se pierde, subirlo
un escalón y revalidar. Adicionalmente, verificar la salida bajo `forced-colors: active`, donde los
rellenos se sustituyen por colores del sistema y solo sobreviven glifo y trama.

**Debilidad 2 — El sistema está diseñado sin haberlo probado con un solo niño.**
El piso de 18 px, el objetivo táctil de 48 px, la escala de tres niveles y el vocabulario de los
logros son razonables por literatura, pero no están validados con el grupo objetivo. La decisión de
usar una rampa azul en vez de semáforo es defendible pedagógicamente, y a la vez no probada: es
posible que un docente lea peor «azul claro / azul oscuro» que «rojo / verde», justamente en la
pantalla que tiene 60 segundos para interpretar.
*Mitigación:* prueba A/B de comprensión del heatmap con 8–10 docentes (rampa de un tono contra
semáforo), midiendo tiempo hasta identificar correctamente al estudiante que más apoyo necesita. Si
el semáforo gana de forma clara, revisar la decisión documentando la tensión entre legibilidad
docente y el efecto de etiquetado sobre el niño — y en ese caso mantener la rampa en cualquier vista
proyectable en el salón.

**Debilidad 3 — El sistema es más grande de lo que el equipo puede mantener.**
Se define un inventario de 20 componentes, cinco reglas de lint propias, dos escalas tipográficas,
cinco adaptaciones de accesibilidad y un modo dislexia — para un proyecto que hoy tiene un prototipo
local sin presupuesto. El riesgo real no es que el sistema esté mal diseñado, sino que se implemente
a medias y quede una mezcla de tokens y valores literales, que es peor que no tener sistema.
*Mitigación:* declarar un **núcleo obligatorio** (tokens de color y tipografía, `Button`,
`AIDisclosure`, `LLMChat`, `EmptyState`, y las reglas `no-raw-ai-content` y `no-hardcoded-color`) y
marcar el resto como progresivo. Ningún componente entra al sistema hasta tener tres usos reales; con
menos de tres vive en su feature como componente local.

</self_critique>
