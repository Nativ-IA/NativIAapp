// =============================================================================
// Sellos de eje.
//
// Un sello y no un icono, por una razón concreta del encargo: la misma pieza
// tiene que sostener dos lecturas. El rector de una IED reconoce el lenguaje de
// los escudos escolares y los oficios del Distrito; el niño de 9 años reconoce
// algo que se colecciona. Un icono plano no hace ni lo uno ni lo otro.
//
// Dos tonos, que es lo que pide docs/03 §6 para la ilustración propia: el disco
// en `soft`, el instrumento en `strong`. Ningún tono `mark` aparece aquí — esos
// están reservados a marcas de dato en gráficos y no alcanzan 4,5:1.
//
// LA SILUETA CAMBIA POR EJE, y eso no es adorno. El principio 6 del design
// system dice que ningún significado viaja solo en el color. Hasta ahora los
// cuatro ejes eran el mismo rectángulo redondeado teñido de distinto color: en
// impresión monocroma, con daltonismo o proyectado en un salón con sol, los
// cuatro eran indistinguibles. Círculo, cuadrado, hexágono y rombo se separan
// sin color alguno.
// =============================================================================

type AxisCode = 'A' | 'B' | 'C' | 'D';

const TONE: Record<AxisCode, { ink: string; ground: string }> = {
  A: { ink: 'text-eje-a', ground: 'fill-eje-a-soft' },
  B: { ink: 'text-eje-b', ground: 'fill-eje-b-soft' },
  C: { ink: 'text-eje-c', ground: 'fill-eje-c-soft' },
  D: { ink: 'text-eje-d', ground: 'fill-eje-d-soft' },
};

/** Silueta del disco, en rejilla de 48. */
function Ground({ axis, className }: { axis: AxisCode; className: string }) {
  switch (axis) {
    case 'A':
      return <circle cx="24" cy="24" r="22" className={className} />;
    case 'B':
      return <rect x="2" y="2" width="44" height="44" rx="14" className={className} />;
    case 'C':
      return <path d="M24 2 43 13v22L24 46 5 35V13z" className={className} />;
    case 'D':
      return (
        <rect
          x="7"
          y="7"
          width="34"
          height="34"
          rx="10"
          transform="rotate(45 24 24)"
          className={className}
        />
      );
  }
}

/** Instrumento, dibujado en rejilla de 24 y centrado en el disco de 48. */
const INSTRUMENT: Record<AxisCode, JSX.Element> = {
  // Brújula — orientarse en territorio desconocido: qué es y qué no es la IA.
  // Sin el aro de la brújula: dentro de un disco circular quedaban dos círculos
  // concéntricos y la aguja se perdía. Quedan la aguja y los cuatro rumbos.
  A: (
    <>
      <path d="m16.6 7.4-2.3 6.9-6.9 2.3 2.3-6.9z" />
      <path d="M12 1.6v2.6M12 19.8v2.6M22.4 12h-2.6M4.2 12H1.6" />
    </>
  ),
  // Brote — es Nati. El eje B es el único con tutor conversacional, y su marca
  // es la misma del logotipo: aquí la IA no entrega respuestas, hace preguntas.
  B: (
    <>
      <path d="M6 20h12" />
      <path d="M10 20c6-2.5.9-6.9 3.2-10.8" />
      <path d="M9.7 8.6c1.2.9 2 2.4 2.5 4-2.2.5-3.8.4-5.2-.3C5.7 11.6 4.5 10.2 3.8 7.7c3-.5 4.8 0 5.9.9z" />
      <path d="M14.6 5a7.6 7.6 0 0 0-1.2 4.3c2-.1 3.6-.6 4.7-1.5 1-1 1.7-2.5 1.8-5-2.9.1-4.3 1.1-5.3 2.2z" />
    </>
  ),
  // Lupa — mirar de cerca lo que parece real.
  C: (
    <>
      <circle cx="10.5" cy="10.5" r="7.5" />
      <path d="m21 21-5-5" />
    </>
  ),
  // Balanza — decidir qué es justo, que es el trabajo del eje D.
  D: (
    <>
      <path d="M12 4v17" />
      <path d="M7 21h10" />
      <path d="M4 7.5h1.8c1.9 0 4.6-.9 6.2-1.8 1.6.9 4.3 1.8 6.2 1.8H20" />
      <path d="m2.5 15 2.8-7.2L8.1 15c-.8.6-1.8.9-2.8.9s-2-.3-2.8-.9" />
      <path d="m15.9 15 2.8-7.2L21.5 15c-.8.6-1.8.9-2.8.9s-2-.3-2.8-.9" />
    </>
  ),
};

export function Emblem({
  axis,
  size = 56,
  className = '',
  title,
}: {
  axis: AxisCode;
  size?: number;
  className?: string;
  title?: string;
}) {
  const tone = TONE[axis];
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={`${tone.ink} shrink-0 ${className}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {/* El disco hereda el trazo del grupo para que el hexágono cierre sus
          esquinas con el mismo tono del relleno y no aparezca un filo duro. */}
      <g stroke="none">
        <Ground axis={axis} className={tone.ground} />
      </g>
      <g
        transform="translate(12,12)"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {INSTRUMENT[axis]}
      </g>
    </svg>
  );
}

/**
 * Nati, el tutor, en color de marca y no en color de eje.
 *
 * Nati aparece en el eje B pero no ES el eje B: es la voz que acompaña. Que
 * lleve el cian de marca y no el verde del eje lo mantiene reconocible cuando
 * habla desde cualquier pantalla, y lo separa de los avatares de los niños.
 */
export function NatiMark({
  size = 48,
  className = '',
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={`text-brand shrink-0 ${className}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <circle cx="24" cy="24" r="22" className="fill-brand-soft" />
      <g
        transform="translate(12,12)"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {INSTRUMENT.B}
      </g>
    </svg>
  );
}
