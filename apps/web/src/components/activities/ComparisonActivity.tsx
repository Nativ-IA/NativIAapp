// =============================================================================
// Actividad de comparación humano / IA — Eje A.
//
// El estudiante predice primero, LUEGO ve lo que dijo la IA. Ese orden es el
// contenido: si viera la respuesta de la máquina antes de comprometerse con la
// suya, la actividad enseñaría a estar de acuerdo, no a comparar.
//
// Funciona sin conexión y sin consumir un solo token.
// =============================================================================

import { useState } from 'react';
import { AIDisclosure } from '../AIDisclosure';
import { Button, ProgressDots, ReadAloudButton } from '../ui';
import { Icon } from '../Icon';

export interface ComparisonPayload {
  intro: string;
  rounds: Array<{
    id: string;
    prompt: string;
    aiAnswer: string;
    truth: string;
    question: string;
    options: Array<{ key: string; label: string; isCorrect: boolean }>;
    explanation: string;
  }>;
  closing: string;
}

type Phase = 'prediccion' | 'revelacion' | 'explicacion';

export function ComparisonActivity({
  payload,
  onFinish,
}: {
  payload: ComparisonPayload;
  /** correct = aciertos, total = rondas. */
  onFinish: (r: { correct: number; total: number }) => void;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('prediccion');
  const [myGuess, setMyGuess] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);

  const round = payload.rounds[index];
  const isLast = index === payload.rounds.length - 1;
  const option = round.options.find((o) => o.key === chosen);

  function next() {
    if (isLast) {
      onFinish({ correct, total: payload.rounds.length });
      return;
    }
    setIndex((i) => i + 1);
    setPhase('prediccion');
    setMyGuess('');
    setChosen(null);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <ProgressDots completed={index} total={payload.rounds.length} />
        <ReadAloudButton text={`${round.prompt}. ${round.question}`} />
      </div>

      <p className="text-body text-ink-2">{payload.intro}</p>

      <section className="rounded-md border-2 border-line p-5">
        <p className="text-body-lg font-semibold">{round.prompt}</p>

        {phase === 'prediccion' && (
          <div className="mt-4 space-y-3">
            <label htmlFor="guess" className="block text-body">
              Primero tú: ¿qué crees que sigue?
            </label>
            <input
              id="guess"
              value={myGuess}
              onChange={(e) => setMyGuess(e.target.value)}
              maxLength={40}
              className="min-h-touch-lg w-full rounded-md border-2 border-line px-4 text-body-lg focus:border-eje-a"
              placeholder="Tu respuesta…"
            />
            <Button
              axis="a"
              full
              disabled={myGuess.trim().length === 0}
              disabledReason={
                myGuess.trim().length === 0 ? 'Escribe tu respuesta para continuar.' : undefined
              }
              onClick={() => setPhase('revelacion')}
            >
              Listo, ¿qué dijo la máquina?
            </Button>
          </div>
        )}

        {phase !== 'prediccion' && (
          <div className="mt-4 space-y-4">
            <div className="rounded-md bg-surf p-4">
              <p className="text-small font-semibold text-ink-2">Tú dijiste</p>
              <p className="text-body-lg">{myGuess}</p>
            </div>

            <AIDisclosure label="La máquina dijo:">{round.aiAnswer}</AIDisclosure>

            <div className="rounded-md border-2 border-ok/40 bg-eje-b-soft p-4">
              <p className="text-small font-semibold text-ok">La respuesta de verdad era</p>
              <p className="text-body-lg font-bold">{round.truth}</p>
            </div>
          </div>
        )}
      </section>

      {phase === 'revelacion' && (
        <section className="space-y-3">
          <h2 className="text-h2 font-bold">{round.question}</h2>
          {round.options.map((o) => (
            <button
              key={o.key}
              onClick={() => {
                setChosen(o.key);
                if (o.isCorrect) setCorrect((c) => c + 1);
                setPhase('explicacion');
              }}
              className="min-h-touch-lg w-full rounded-md border-2 border-line px-5 py-3 text-left text-body hover:border-eje-a hover:bg-eje-a-soft"
            >
              {o.label}
            </button>
          ))}
        </section>
      )}

      {phase === 'explicacion' && (
        <section className="space-y-4">
          <div
            className={`rounded-md border-2 p-5 ${
              option?.isCorrect ? 'border-ok bg-eje-b-soft' : 'border-warn bg-eje-c-soft'
            }`}
          >
            <p className="flex items-center gap-2.5 text-body-lg font-bold">
              <Icon name={option?.isCorrect ? 'check' : 'repeat'} size={22} />
              {option?.isCorrect ? 'Lo pensaste bien' : 'Vale la pena mirarlo otra vez'}
            </p>
            {/* La explicación aparece SIEMPRE, acierte o no: el objetivo es que
                entienda el mecanismo, no que sume puntos. */}
            <p className="mt-2 text-body">{round.explanation}</p>
          </div>

          <Button axis="a" full onClick={next}>
            {isLast ? 'Terminar' : 'Siguiente'}
          </Button>
        </section>
      )}
    </div>
  );
}
