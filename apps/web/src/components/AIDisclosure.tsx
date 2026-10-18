import { useState, type ReactNode } from 'react';
import { Icon } from './Icon';

/**
 * Componente ético obligatorio.
 *
 * TODO texto, imagen o audio generado por un modelo y mostrado a un estudiante
 * DEBE renderizarse dentro de este componente (regla de lint
 * `no-raw-ai-content`, design system §7.3).
 *
 * El color `ai` no se usa para ninguna otra cosa en el producto: su valor está
 * en que el niño lo asocie unívocamente con «salida de máquina». El icono `cpu`
 * tiene la misma restricción — antes era el emoji 🤖, que en Windows es una
 * carita simpática y en otros sistemas otra cosa. Una advertencia ética no
 * puede depender de qué fuente de emoji tenga instalada el equipo del colegio.
 */
export function AIDisclosure({
  children,
  label = 'La IA respondió:',
}: {
  children: ReactNode;
  label?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      className="prose-block overflow-hidden rounded-md border-2 border-ai bg-ai-soft"
      aria-label="Contenido generado por una inteligencia artificial"
    >
      {/* Franja de cabecera: la marca de máquina no es una nota al margen del
          contenido, es el marco del contenido. */}
      <p className="flex items-center gap-2 bg-ai px-5 py-2 text-small font-bold text-white">
        <Icon name="cpu" size={18} />
        {label}
      </p>

      <div className="px-5 py-4 text-body-lg">{children}</div>

      <div className="border-t border-ai/25 px-5 pb-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex min-h-touch w-full items-center gap-2 text-left text-small font-semibold text-ai"
        >
          <Icon name={expanded ? 'chevron-up' : 'info'} size={18} />
          Esto lo dijo una IA. Puede equivocarse.
        </button>

        {expanded && (
          <p className="pb-2 text-small text-ink-2">
            La IA arma frases que suenan bien porque aprendió de muchos textos. Pero no sabe
            si son ciertas. Por eso tú la revisas.
          </p>
        )}
      </div>
    </section>
  );
}
