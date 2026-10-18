// =============================================================================
// Dilema ramificado — Eje D.
// Wireframe: docs/02-information-architecture.md, pantalla 8.
//
// El dilema NO califica: ramifica. No hay opción correcta y el sistema nunca
// dice cuál lo es. Lo que se registra es la CALIDAD DEL ARGUMENTO, no la opción
// elegida — y el argumento lo escribe el niño con sus palabras.
//
// El cierre pregunta si cambiaría de decisión ahora que vio las consecuencias.
// Un dilema que se resuelve con una moraleja deja de ser un dilema.
// =============================================================================

import { useState } from 'react';
import { Button, ReadAloudButton } from '../ui';

export interface DilemmaPayload {
  situation: string;
  question: string;
  options: Array<{
    key: string;
    label: string;
    consequence: string;
    followUp: string;
  }>;
  closing: string;
}

type Phase = 'eleccion' | 'consecuencia' | 'panorama';

export function DilemmaActivity({
  payload,
  onFinish,
}: {
  payload: DilemmaPayload;
  onFinish: (r: { chosen: string; argument: string; changedMind: boolean | null }) => void;
}) {
  const [phase, setPhase] = useState<Phase>('eleccion');
  const [chosen, setChosen] = useState<string | null>(null);
  const [argument, setArgument] = useState('');
  const [changedMind, setChangedMind] = useState<boolean | null>(null);

  const option = payload.options.find((o) => o.key === chosen);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex justify-end">
        <ReadAloudButton text={`${payload.situation} ${payload.question}`} />
      </div>

      <section className="prose-block rounded-md border-2 border-eje-d bg-eje-d-soft p-5">
        <p className="text-body-lg">{payload.situation}</p>
      </section>

      {/* Paso 1 · elegir */}
      {phase === 'eleccion' && (
        <section className="space-y-3">
          <h2 className="text-h2 font-bold">{payload.question}</h2>
          {payload.options.map((o) => (
            <button
              key={o.key}
              onClick={() => {
                setChosen(o.key);
                setPhase('consecuencia');
              }}
              className="min-h-touch-lg w-full rounded-md border-2 border-line px-5 py-4 text-left text-body hover:border-eje-d hover:bg-eje-d-soft"
            >
              <strong className="text-eje-d">{o.key}</strong> · {o.label}
            </button>
          ))}
          <p className="pt-2 text-small text-ink-2">
            No hay una única respuesta correcta. Vas a ver qué pasa después.
          </p>
        </section>
      )}

      {/* Paso 2 · consecuencia + pregunta de segundo orden */}
      {phase === 'consecuencia' && option && (
        <section className="space-y-5">
          <div className="rounded-md border-2 border-line p-5">
            <p className="text-small font-semibold uppercase tracking-wide text-ink-3">
              Qué pasó después
            </p>
            <p className="mt-2 text-body-lg">{option.consequence}</p>
          </div>

          <div>
            <label htmlFor="arg" className="block text-body-lg font-semibold">
              {option.followUp}
            </label>
            <p className="mb-2 text-small text-ink-2">
              Escribe lo que piensas. Esto no se califica como bueno o malo.
            </p>
            <textarea
              id="arg"
              value={argument}
              onChange={(e) => setArgument(e.target.value)}
              rows={4}
              maxLength={600}
              className="w-full rounded-md border-2 border-line p-4 text-body focus:border-eje-d"
              placeholder="Yo creo que…"
            />
          </div>

          <Button
            axis="d"
            full
            disabled={argument.trim().length === 0}
            disabledReason={
              argument.trim().length === 0 ? 'Cuéntanos qué piensas para continuar.' : undefined
            }
            onClick={() => setPhase('panorama')}
          >
            Ver los otros caminos
          </Button>
        </section>
      )}

      {/* Paso 3 · panorama de las cuatro consecuencias. Sin moraleja. */}
      {phase === 'panorama' && (
        <section className="space-y-5">
          <h2 className="text-h2 font-bold">Lo que habría pasado en cada camino</h2>

          <ul className="space-y-3">
            {payload.options.map((o) => (
              <li
                key={o.key}
                className={`rounded-md border-2 p-4 ${
                  o.key === chosen ? 'border-eje-d bg-eje-d-soft' : 'border-line'
                }`}
              >
                <p className="text-body font-semibold">
                  <span className="text-eje-d">{o.key}</span> · {o.label}
                  {o.key === chosen && (
                    <span className="ml-2 text-small font-normal text-ink-2">— tu decisión</span>
                  )}
                </p>
                <p className="mt-1 text-body text-ink-2">{o.consequence}</p>
              </li>
            ))}
          </ul>

          <div className="rounded-md border-2 border-line p-5">
            <p className="text-body-lg">{payload.closing}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => setChangedMind(true)}
                aria-pressed={changedMind === true}
                className={`min-h-touch rounded-full border-2 px-5 text-body ${
                  changedMind === true
                    ? 'border-eje-d bg-eje-d font-semibold text-white'
                    : 'border-line text-ink-2'
                }`}
              >
                Sí, cambiaría
              </button>
              <button
                onClick={() => setChangedMind(false)}
                aria-pressed={changedMind === false}
                className={`min-h-touch rounded-full border-2 px-5 text-body ${
                  changedMind === false
                    ? 'border-eje-d bg-eje-d font-semibold text-white'
                    : 'border-line text-ink-2'
                }`}
              >
                No, me mantengo
              </button>
            </div>
          </div>

          <Button
            axis="d"
            full
            disabled={changedMind === null}
            disabledReason={changedMind === null ? 'Elige una de las dos para continuar.' : undefined}
            onClick={() => onFinish({ chosen: chosen!, argument: argument.trim(), changedMind })}
          >
            Terminar
          </Button>
        </section>
      )}
    </div>
  );
}
