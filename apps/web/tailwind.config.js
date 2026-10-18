/** Tokens del design system (docs/03-design-system.md §2).
 *
 *  Todos los valores de color fueron VERIFICADOS por cálculo, no elegidos a
 *  ojo: banda de luminosidad OKLCH, piso de croma, separación bajo daltonismo
 *  (Machado-Oliveira-Fernandes) y contraste WCAG. El verificador está en
 *  packages/ui/scripts/validate_palette.py y corre en CI.
 *
 *    eje.X       strong → botones, iconos y texto   (>= 4.5:1 vs blanco)
 *    eje.X-mark  marca de dato en gráficos          (validado por CVD)
 *    eje.X-soft  fondo de superficie                (ink encima >= 4.5:1)
 *
 *  Un color -mark NUNCA se usa como texto ni como relleno de botón.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#16202B', 2: '#4A5866', 3: '#5F6D7A' },
        line: '#DCE3EA',
        surf: '#F5F8FA',
        // Color de marca. Cian profundo: institucional sin ser frío, distinto
        // de los cuatro ejes (>= 10 ΔE del más cercano) y del morado reservado
        // para contenido de IA. 5,10:1 sobre blanco, así que también sirve como
        // tinta en documentos impresos.
        brand: { DEFAULT: '#007895', soft: '#E4F1F5', deep: '#004E60' },
        eje: {
          a: '#26509F', 'a-mark': '#2F62C4', 'a-soft': '#EAEFFA',
          b: '#0A6D4C', 'b-mark': '#0D9668', 'b-soft': '#E3F5EE',
          c: '#7E5300', 'c-mark': '#AC7100', 'c-soft': '#FAF0DF',
          d: '#7E2871', 'd-mark': '#A03390', 'd-soft': '#F9EAF5',
        },
        // Rampa ordinal de dominio: un solo tono, claro → oscuro.
        // No es semáforo: comunica "cuánto", no "bueno o malo".
        mastery: { 1: '#8FA9DE', 2: '#4A72C6', 3: '#1D428E' },
        ok: '#0A6D4C',
        warn: '#8A5800',
        alert: '#B0322B',
        info: '#26509F',
        // Token con carga ética: marca TODO contenido generado por un modelo.
        // No se usa para ninguna otra cosa en el producto.
        ai: '#5B3E9E',
        'ai-soft': '#F4F0FB',
      },
      fontFamily: {
        sans: ['"Nunito Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        dys: ['OpenDyslexic', '"Nunito Sans"', 'sans-serif'],
      },
      borderRadius: { sm: '8px', md: '12px', lg: '20px' },
      minHeight: { touch: '48px', 'touch-lg': '56px' },
      minWidth: { touch: '48px' },
      fontSize: {
        micro: ['14px', { lineHeight: '20px' }],
        small: ['16px', { lineHeight: '24px' }],
        body: ['18px', { lineHeight: '29px' }],
        'body-lg': ['20px', { lineHeight: '32px' }],
        h2: ['24px', { lineHeight: '32px' }],
        h1: ['30px', { lineHeight: '38px' }],
        display: ['40px', { lineHeight: '48px' }],
      },
      transitionTimingFunction: { nativia: 'cubic-bezier(.2,.8,.2,1)' },
    },
  },
  plugins: [],
};
