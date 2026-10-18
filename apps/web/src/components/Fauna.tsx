// =============================================================================
// Avatares: fauna colombiana, ilustración propia.
//
// docs/03 §6 pide «ilustración propia de fauna colombiana, estilo plano de dos
// tonos, <svg> inline optimizado». Venían siendo emoji (🦊 🐢 🦜 …), que es lo
// contrario de ilustración propia: se dibuja distinto en cada sistema, cambia
// de estilo entre versiones de Windows y no sobrevive a impresión monocroma.
//
// La restricción real, y de la que dependen los avatares: NUNCA una fotografía
// del menor. Un avatar de fauna es minimización de datos, y evita de paso los
// sesgos de representación corporal que trae un avatar humano.
//
// ── Por qué no son animales de colores naturales ────────────────────────────
//
// Un zorro naranja y una rana verde habrían metido ocho colores nuevos fuera de
// la paleta verificada, y la paleta de este proyecto no se eligió a ojo: está
// validada por cálculo (banda OKLCH, croma mínimo, separación bajo daltonismo,
// contraste WCAG) y hay un verificador corriendo en CI.
//
// Así que cada animal se dibuja con un par `soft`/`strong` ya validado: el
// disco en el tono claro, la silueta en el oscuro. Lo que distingue a un
// avatar de otro es la SILUETA, no el color — que es como funciona de verdad
// para un niño que busca «el mío» en una rejilla de ocho, y lo único que
// sobrevive a un proyector con sol de frente.
//
// Efecto secundario que sí buscaba: el avatar queda hermano visual del sello de
// eje (mismo disco, mismo peso, misma construcción), y el producto entero se
// lee como un sistema y no como piezas sueltas.
//
// El morado `ai` no aparece aquí y no puede aparecer: está reservado para
// marcar contenido generado por un modelo. Un niño no es contenido generado.
// =============================================================================

export type FaunaKey =
  | 'zorro'
  | 'tortuga'
  | 'guacamaya'
  | 'jaguar'
  | 'mariposa'
  | 'abeja'
  | 'perezoso'
  | 'rana';

interface Tone {
  ground: string;
  ink: string;
  /** Fija `color`, del que dependen los trazos dibujados con `currentColor`
   *  (antenas, bocas). Sin esto heredarían la tinta del texto y saldrían
   *  negros sobre el disco de color. */
  text: string;
  /** Trazo en el tono claro, para las líneas que van ENCIMA de la silueta —
   *  una boca dibujada con `currentColor` sobre el cuerpo es del mismo color
   *  que el cuerpo, es decir, invisible. */
  strokeGround: string;
}

const TONES: Record<FaunaKey, Tone> = {
  zorro: { ground: 'fill-eje-c-soft', ink: 'fill-eje-c', text: 'text-eje-c', strokeGround: 'stroke-eje-c-soft' },
  tortuga: { ground: 'fill-eje-b-soft', ink: 'fill-eje-b', text: 'text-eje-b', strokeGround: 'stroke-eje-b-soft' },
  guacamaya: { ground: 'fill-eje-d-soft', ink: 'fill-eje-d', text: 'text-eje-d', strokeGround: 'stroke-eje-d-soft' },
  jaguar: { ground: 'fill-eje-c-soft', ink: 'fill-eje-c', text: 'text-eje-c', strokeGround: 'stroke-eje-c-soft' },
  mariposa: { ground: 'fill-eje-d-soft', ink: 'fill-eje-d', text: 'text-eje-d', strokeGround: 'stroke-eje-d-soft' },
  abeja: { ground: 'fill-brand-soft', ink: 'fill-brand', text: 'text-brand', strokeGround: 'stroke-brand-soft' },
  perezoso: { ground: 'fill-eje-a-soft', ink: 'fill-eje-a', text: 'text-eje-a', strokeGround: 'stroke-eje-a-soft' },
  rana: { ground: 'fill-eje-b-soft', ink: 'fill-eje-b', text: 'text-eje-b', strokeGround: 'stroke-eje-b-soft' },
};

export const FAUNA_LABEL: Record<FaunaKey, string> = {
  zorro: 'zorro',
  tortuga: 'tortuga',
  guacamaya: 'guacamaya',
  jaguar: 'jaguar',
  mariposa: 'mariposa',
  abeja: 'abeja',
  perezoso: 'perezoso',
  rana: 'rana',
};

/** Siluetas en rejilla de 48. `ink` es el trazo grueso; `ground` los detalles
 *  que se recortan encima (ojos, manchas, antifaz). */
const SHAPES: Record<FaunaKey, (t: Tone) => JSX.Element> = {
  // Zorro — DE PERFIL, y esa es la decisión que importa.
  //
  // La primera versión era una máscara frontal perfectamente simétrica sobre
  // una silueta de escudo, con dos ojos redondos. Eso no lee «zorro»: lee
  // «logotipo de aplicación» — es la misma construcción que usan media docena
  // de apps de billetera, y un símbolo así se lleva por delante la identidad
  // del producto en el que está.
  //
  // El perfil rompe la simetría, que es de donde venía el problema, y deja
  // sitio para lo único que de verdad distingue a un zorro de un gato o de un
  // perro: el hocico largo y afilado, más largo que el propio cráneo.
  zorro: (t) => (
    <>
      {/* Oreja lejana, detrás de la cabeza: da profundidad y confirma el
          perfil sin robarle protagonismo a la cercana. */}
      <path d="M22 14.5 30 4l4.5 10.5z" className={t.ink} />
      <circle cx="19" cy="27" r="12.5" className={t.ink} />
      {/* Hocico: cuña larga con la punta redondeada. Una punta recta salía
          como un pincho y desequilibraba la silueta. */}
      <path d="M25 19.5c8 2.5 16 6 20.8 8.1.8.4.8 1 0 1.4C41 31 33 33 25 34.5z" className={t.ink} />
      {/* Oreja cercana, grande y erguida: en un zorro es casi un tercio de la
          altura de la cabeza. */}
      <path d="M10 18 13 2.5 23.5 14z" className={t.ink} />
      <path d="M13.6 16.4 15.1 7l5.6 7.6z" className={t.ground} />
      {/* Ojo almendrado e inclinado, no un punto redondo: el punto redondo es
          lo que hacía que la cara pareciera de peluche. */}
      <ellipse cx="21.5" cy="23.5" rx="2.9" ry="2" transform="rotate(-18 21.5 23.5)" className={t.ground} />
      {/* Aquí iban la mejilla y la barbilla claras del zorro real. Fuera: a
          48 px la del hocico se leía como una boca abierta y la del pómulo
          como una sonrisa, y entre las dos partían la silueta en trozos.
          La forma ya dice «zorro» sola; dos manchas más solo la estorbaban. */}
    </>
  ),

  // Tortuga — cúpula ancha y baja, la silueta más horizontal.
  tortuga: (t) => (
    <>
      <circle cx="39.5" cy="27" r="5" className={t.ink} />
      <rect x="10" y="31" width="7" height="8" rx="3.5" className={t.ink} />
      <rect x="26" y="31" width="7" height="8" rx="3.5" className={t.ink} />
      <path d="M6 34c0-12 8-20 18-20s18 8 18 20z" className={t.ink} />
      <path d="M24 19.5 30 24l-2.2 7h-7.6L18 24z" className={t.ground} />
      <path d="M13 34c0-3.4.5-6.5 1.4-9L18 28l-2 6z" className={t.ground} />
      <path d="M35 34c0-3.4-.5-6.5-1.4-9L30 28l2 6z" className={t.ground} />
    </>
  ),

  // Guacamaya — de perfil, porque el pico ganchudo es TODA la información y de
  // frente no se ve. Ocupa un tercio del ancho a propósito.
  guacamaya: (t) => (
    <>
      {/* Penacho: dos plumas barridas hacia atrás. Rectas parecían orejas. */}
      <path d="M15.5 13.5C11 10 10.5 5.5 13 3c1.5 2.8 3.5 5 6 6.3z" className={t.ink} />
      <path d="M21 10.5c-3-4-2.5-8 .5-10 .8 3 2 5.3 3.8 6.8z" className={t.ink} />
      <circle cx="20" cy="25" r="13" className={t.ink} />
      {/* Pico: un gancho limpio de dos curvas. La versión anterior tenía una
          muesca interior que a 32 px se leía como una lengua. */}
      <path d="M28.5 15.5C38 15.5 43.5 20.5 43 26.5c-.5 5.5-5 9.5-10.5 10 3.5-6.5 3-15.5-4-21z" className={t.ink} />
      <path d="M30.5 25.5c4 .8 7.8.3 11-1.3" className={t.strokeGround} strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Antifaz claro alrededor del ojo: la guacamaya real lo tiene, y de paso
          impide que el ojo se pierda dentro de la mancha de color. */}
      <ellipse cx="23" cy="21" rx="5.5" ry="5" className={t.ground} />
      <circle cx="23.5" cy="21" r="2.4" className={t.ink} />
    </>
  ),

  // Jaguar — cabeza MÁS ANCHA QUE ALTA, orejas pequeñas y bajas, hocico grande.
  // Con orejas grandes y altas salía un oso de peluche.
  jaguar: (t) => (
    <>
      <circle cx="10.5" cy="18" r="5" className={t.ink} />
      <circle cx="37.5" cy="18" r="5" className={t.ink} />
      <ellipse cx="24" cy="27" rx="15" ry="13.5" className={t.ink} />
      <ellipse cx="24" cy="33" rx="8" ry="5.5" className={t.ground} />
      <path d="M24 34.5 21 30.5h6z" className={t.ink} />
      <circle cx="17.5" cy="23" r="2.6" className={t.ground} />
      <circle cx="30.5" cy="23" r="2.6" className={t.ground} />
      {/* Rosetas, no lunares: anillo claro con núcleo oscuro. Un jaguar tiene
          rosetas; un cachorro con lunares planos tiene pecas. */}
      <circle cx="13" cy="29" r="2.6" className={t.ground} />
      <circle cx="13" cy="29" r="1.1" className={t.ink} />
      <circle cx="35" cy="29" r="2.6" className={t.ground} />
      <circle cx="35" cy="29" r="1.1" className={t.ink} />
      <circle cx="24" cy="17.5" r="2.6" className={t.ground} />
      <circle cx="24" cy="17.5" r="1.1" className={t.ink} />
    </>
  ),

  // Mariposa — cuatro alas, simetría vertical. Nada más en el set es simétrico
  // así, y a 32 px se reconoce sola.
  mariposa: (t) => (
    <>
      <path d="M22.5 24C15 11 4 11 4.5 21.5 5 30 14 30.5 22.5 24z" className={t.ink} />
      <path d="M25.5 24C33 11 44 11 43.5 21.5 43 30 34 30.5 25.5 24z" className={t.ink} />
      <path d="M22.5 25C16 32.5 9 33 10 40.5c.8 5.5 9 4 12.5-6.5z" className={t.ink} />
      <path d="M25.5 25C32 32.5 39 33 38 40.5c-.8 5.5-9 4-12.5-6.5z" className={t.ink} />
      <rect x="21.6" y="16" width="4.8" height="24" rx="2.4" className={t.ink} />
      <path d="M22 15.5 18 8M26 15.5 30 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <circle cx="24" cy="22" r="1.8" className={t.ground} />
      <circle cx="24" cy="28" r="1.8" className={t.ground} />
    </>
  ),

  // Abeja — cuerpo ovalado con bandas. Las bandas la separan del perezoso, que
  // es el otro cuerpo redondo del set.
  abeja: (t) => (
    <>
      <ellipse cx="13" cy="17" rx="7.5" ry="5" transform="rotate(-28 13 17)" className={t.ground} />
      <ellipse cx="35" cy="17" rx="7.5" ry="5" transform="rotate(28 35 17)" className={t.ground} />
      <ellipse cx="24" cy="27" rx="11" ry="14" className={t.ink} />
      <path d="M13.6 21.5h20.8a13.6 13.6 0 0 1 .55 4H13.05c.06-1.4.25-2.75.55-4z" className={t.ground} />
      <path d="M13.4 30h21.2a14 14 0 0 1-1.6 4H15c-.66-1.2-1.2-2.55-1.6-4z" className={t.ground} />
      <path d="M20 10.5 17 5M28 10.5 31 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </>
  ),

  // Perezoso — la cara CLARA con dos bandas oscuras en diagonal saliendo de los
  // ojos. Ese antifaz es la única seña que un niño necesita; sin él, un círculo
  // con dos ojos es un alien, que es exactamente lo que salía antes.
  perezoso: (t) => (
    <>
      <ellipse cx="24" cy="25" rx="15.5" ry="14.5" className={t.ink} />
      <ellipse cx="24" cy="26" rx="11.5" ry="11" className={t.ground} />
      <path d="M17.5 18.5c2.3 0 4 1.6 4 3.6s-1.7 3.6-4 3.6c-2.6 0-5-2.4-6.4-5.4 2-1.3 4.2-1.8 6.4-1.8z" className={t.ink} />
      <path d="M30.5 18.5c-2.3 0-4 1.6-4 3.6s1.7 3.6 4 3.6c2.6 0 5-2.4 6.4-5.4-2-1.3-4.2-1.8-6.4-1.8z" className={t.ink} />
      <circle cx="18.5" cy="22" r="1.8" className={t.ground} />
      <circle cx="29.5" cy="22" r="1.8" className={t.ground} />
      <ellipse cx="24" cy="29.5" rx="3.4" ry="2.6" className={t.ink} />
      <path d="M20 33.5c2 2.4 6 2.4 8 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </>
  ),

  // Rana — ojos saltones POR ENCIMA del contorno, bien separados, y boca ancha
  // de lado a lado. Es la única silueta del set que rompe su propio contorno;
  // pegados al cuerpo se fundían en un oso.
  rana: (t) => (
    <>
      <circle cx="13" cy="13" r="8" className={t.ink} />
      <circle cx="35" cy="13" r="8" className={t.ink} />
      <circle cx="13" cy="12.5" r="4" className={t.ground} />
      <circle cx="35" cy="12.5" r="4" className={t.ground} />
      <circle cx="13" cy="12.5" r="1.8" className={t.ink} />
      <circle cx="35" cy="12.5" r="1.8" className={t.ink} />
      <path d="M4 41c0-11.5 9-19 20-19s20 7.5 20 19z" className={t.ink} />
      <path d="M11 31c4 4.5 22 4.5 26 0" className={t.strokeGround} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <circle cx="18" cy="26.5" r="1.5" className={t.ground} />
      <circle cx="30" cy="26.5" r="1.5" className={t.ground} />
    </>
  ),
};

export function Fauna({
  animal,
  size = 48,
  className = '',
  title,
}: {
  animal: FaunaKey;
  size?: number;
  className?: string;
  title?: string;
}) {
  const tone = TONES[animal];
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={`${tone.text} shrink-0 ${className}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {SHAPES[animal](tone)}
    </svg>
  );
}

export function isFauna(key: string): key is FaunaKey {
  return key in TONES;
}
