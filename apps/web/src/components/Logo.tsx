// =============================================================================
// NativIA · identidad de marca
//
// Concepto: «La semilla que pregunta».
// Un brote cuyo tallo se curva hasta volverse un signo de interrogación, con la
// semilla como punto. El producto entero cabe en ese gesto: aquí la IA no
// entrega respuestas, hace crecer preguntas.
//
// Lectura doble, que es lo que pedía el encargo:
//   · el rector ve un símbolo de crecimiento e indagación, sobrio, imprimible
//     en un oficio en blanco y negro;
//   · el niño ve una plantica que pregunta — y esa plantica es Nati, el tutor.
//
// El símbolo usa currentColor: hereda el color del contexto, sobrevive a
// impresión monocroma y a `forced-colors`.
// =============================================================================

export function Mark({ className = '', title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <g transform="translate(1,-2)">
        {/* tallo que se vuelve signo de interrogación */}
        <path
          d="M31 47 V30 c0-6 3-8 7-10 c6-3 6-11-1-13 c-6-2-11 1-12 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dos hojas opuestas — cotiledones. Una sola hoja se absorbe en el
            trazo del tallo y el símbolo se lee como un signo de interrogación
            corriente; el par es lo único que sobrevive a 24 px como brote.
            Verificado en /marca.html. */}
        <path d="M30 44 C21 47 12 42 9 32 C20 29 28 35 30 44 Z" fill="currentColor" />
        <path d="M32 47 C38 49 45 46 47 39 C39 36 33 40 32 47 Z" fill="currentColor" />
        {/* semilla: el punto del signo de interrogación */}
        <circle cx="31" cy="58" r="4" fill="currentColor" />
      </g>
    </svg>
  );
}

/**
 * Logotipo completo.
 *
 * En el logotipo, «IA» va en el color de marca y «Nativ» en tinta. No es un
 * adorno: hace legible el nombre de un vistazo para quien nunca lo ha visto, y
 * deja el juego de palabras a la vista. El símbolo compensa la carga: el
 * nombre dice IA, el símbolo dice pregunta.
 */
export function Logo({
  size = 'md',
  stacked = false,
  tagline,
}: {
  size?: 'sm' | 'md' | 'lg';
  stacked?: boolean;
  tagline?: string;
}) {
  const s = {
    sm: { mark: 'h-7 w-7', text: 'text-h2' },
    md: { mark: 'h-10 w-10', text: 'text-h1' },
    lg: { mark: 'h-20 w-20', text: 'text-display' },
  }[size];

  return (
    <div
      className={`flex items-center gap-3 ${stacked ? 'flex-col gap-2 text-center' : ''}`}
    >
      <Mark className={`${s.mark} text-brand shrink-0`} />
      <div className={stacked ? '' : 'leading-none'}>
        <p className={`${s.text} font-extrabold tracking-tight text-ink`}>
          Nativ<span className="text-brand">IA</span>
        </p>
        {tagline && <p className="mt-1 text-small text-ink-2">{tagline}</p>}
      </div>
    </div>
  );
}

/** Claim institucional — para rectoría, oficios y la presentación al Distrito. */
export const CLAIM_INSTITUCIONAL = 'Nativos de la IA. Dueños de sus preguntas.';

/** Claim de cara al niño. Nivel de lectura de 3.º de primaria. */
export const CLAIM_ESTUDIANTE = 'Aprende a pensar con la IA';
