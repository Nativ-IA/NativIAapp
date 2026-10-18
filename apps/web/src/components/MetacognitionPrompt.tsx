import { useState } from 'react';
import { Button, ReadAloudButton } from './ui';
import { NatiMark } from './Emblem';

/**
 * Cierre metacognitivo — bloqueante por diseño (US-03).
 *
 * No renderiza botón de omitir. La regla también se aplica en el servidor: es
 * pedagógica, no cosmética.
 *
 * Las frases de andamiaje no son un atajo: a los 8 años no se tiene el
 * lenguaje para describir el propio pensamiento, y darle palabras es parte de
 * la enseñanza.
 */
export function MetacognitionPrompt({
  question,
  scaffolds,
  onSubmit,
  submitting,
}: {
  question: string;
  scaffolds: string[];
  onSubmit: (r: { text: string; scaffoldTags: string[] }) => void;
  submitting: boolean;
}) {
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const canSubmit = text.trim().length > 0 || tags.length > 0;

  return (
    <section className="mx-auto max-w-2xl space-y-6 py-8 text-center">
      {/* Es Nati quien pregunta, y por eso lleva su marca. El antetítulo en
          versalitas que había aquí («ANTES DE TERMINAR…») no decía nada que la
          pregunta no dijera ya. */}
      <div className="flex flex-col items-center gap-2">
        <NatiMark size={56} />
        <h2 className="text-h1 font-bold">{question}</h2>
        <ReadAloudButton text={`${question}. Esto no se califica. Es para que tú te des cuenta.`} />
      </div>

      <label htmlFor="meta" className="sr-only">
        Escribe tu respuesta
      </label>
      <textarea
        id="meta"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Escribe tu respuesta…"
        className="w-full rounded-md border-2 border-line p-4 text-body transition-colors focus:border-brand"
      />

      <div>
        <p className="mb-3 text-body text-ink-2">¿Te ayuda alguna de estas?</p>
        <div className="flex flex-wrap justify-center gap-2">
          {scaffolds.map((s) => {
            const active = tags.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setTags((t) => (active ? t.filter((x) => x !== s) : [...t, s]))
                }
                className={`min-h-touch rounded-full border-2 px-4 text-body transition-colors ${
                  active
                    ? 'border-brand bg-brand font-semibold text-white'
                    : 'border-line text-ink-2 hover:bg-surf'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <Button
        full
        disabled={!canSubmit || submitting}
        disabledReason={!canSubmit ? 'Escribe algo o elige una frase para continuar.' : undefined}
        onClick={() => onSubmit({ text: text.trim(), scaffoldTags: tags })}
      >
        {submitting ? 'Guardando…' : 'Listo'}
      </Button>

      {/* Sin esta frase, los niños responden lo que creen que el adulto quiere oír. */}
      <p className="text-small text-ink-3">Esto no se califica. Es para que TÚ te des cuenta.</p>
    </section>
  );
}
