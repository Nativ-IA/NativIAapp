// =============================================================================
// Símbolos del PIN gráfico (ADR-009).
//
// Tres imágenes en orden, memorizables y no transcribibles: un niño de 8 años
// puede recordarlas, pero no puede dictárselas a un compañero tan fácil como un
// número. Eso solo se sostiene si las imágenes son ESTABLES — y los emoji no lo
// son: 🫓 se dibuja distinto en cada versión de Windows, y en un equipo escolar
// sin la fuente de emoji al día sale como un rectángulo vacío. Un niño que ve
// un rectángulo donde memorizó una arepa no puede entrar a la aplicación.
//
// Dibujadas con relleno plano y silueta bien separada: a 56 px, y para alguien
// que todavía está aprendiendo a leer, la forma es toda la información.
// =============================================================================

export type PinKey = 'brote' | 'arepa' | 'montana' | 'sol' | 'rio' | 'flor';

export const PIN_LABEL: Record<PinKey, string> = {
  brote: 'brote',
  arepa: 'arepa',
  montana: 'montaña',
  sol: 'sol',
  rio: 'río',
  flor: 'flor',
};

const TONE: Record<PinKey, string> = {
  brote: 'text-eje-b',
  arepa: 'text-eje-c',
  montana: 'text-eje-a',
  sol: 'text-eje-c',
  rio: 'text-brand',
  flor: 'text-eje-d',
};

const SHAPES: Record<PinKey, JSX.Element> = {
  brote: (
    <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 40h20" />
      <path d="M22 40c10-4 1.5-11.5 5.5-18" />
      <path d="M21.5 17.5c2 1.5 3.3 4 4.2 6.7-3.7.8-6.4.7-8.8-.5-2.2-1.1-4.2-3.5-5.4-7.7 5.1-.9 8.1 0 10 1.5z" />
      <path d="M30 10.5a13 13 0 0 0-2 7.3c3.4-.2 6-1.1 7.9-2.6 1.8-1.7 2.9-4.2 3.1-8.4-5 .2-7.3 1.8-9 3.7z" />
    </g>
  ),
  // Arepa: disco grueso con las marcas del asador. Es el símbolo más local del
  // set y por eso está en el PIN.
  arepa: (
    <>
      <circle cx="24" cy="24" r="18" fill="currentColor" />
      <path
        d="M13 18h22M11 24h26M13 30h22"
        stroke="#FAF0DF"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  montana: (
    <>
      <path d="M4 40 19 14l9 15 5-8 11 19z" fill="currentColor" />
      <path d="M14.4 23.5h9.2L19 14z" fill="#EAEFFA" />
    </>
  ),
  sol: (
    <>
      <circle cx="24" cy="24" r="10" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="3.4" strokeLinecap="round">
        <path d="M24 4v5M24 39v5M4 24h5M39 24h5M9.9 9.9l3.5 3.5M34.6 34.6l3.5 3.5M9.9 38.1l3.5-3.5M34.6 13.4l3.5-3.5" />
      </g>
    </>
  ),
  rio: (
    <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
      <path d="M5 16c4.75-4 9.5-4 14.25 0S28.5 20 33.25 16 42.75 12 43 12" />
      <path d="M5 26c4.75-4 9.5-4 14.25 0S28.5 30 33.25 26 42.75 22 43 22" />
      <path d="M5 36c4.75-4 9.5-4 14.25 0S28.5 40 33.25 36 42.75 32 43 32" />
    </g>
  ),
  flor: (
    <>
      <g fill="currentColor">
        <ellipse cx="24" cy="12" rx="6" ry="8" />
        <ellipse cx="24" cy="30" rx="6" ry="8" />
        <ellipse cx="15" cy="21" rx="8" ry="6" />
        <ellipse cx="33" cy="21" rx="8" ry="6" />
      </g>
      <circle cx="24" cy="21" r="5" fill="#F9EAF5" />
      <path d="M24 34v10" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" fill="none" />
    </>
  ),
};

export function PinSymbol({
  symbol,
  size = 56,
  className = '',
}: {
  symbol: PinKey;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={`${TONE[symbol]} shrink-0 ${className}`}
      aria-hidden
      focusable="false"
    >
      {SHAPES[symbol]}
    </svg>
  );
}

export const PIN_KEYS: PinKey[] = ['brote', 'arepa', 'montana', 'sol', 'rio', 'flor'];
