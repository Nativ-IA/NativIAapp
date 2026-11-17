// =============================================================================
// «Arma tu pregunta» — constructor de instrucciones (eje B).
//
// Cuatro pasos, uno por ingrediente de la receta:
//   1. Qué quiero          → se muestra la respuesta a la pregunta VAGA
//   2. Para quién · Cómo   → se arma la pregunta completa
//   3. Comparar            → respuesta completa, al lado de la vaga
//   4. Revisar             → pregunta de comprobación (es el ingrediente que
//                            ninguna IA hace por el niño)
//
// Todo viene preparado: sin red, sin tokens. Lo que «dijo la IA» va siempre
// dentro de AIDisclosure.
// =============================================================================

import { useState } from 'react';
import { AIDisclosure } from '../AIDisclosure';
import { Button, ReadAloudButton } from '../ui';
import { Icon } from '../Icon';

export interface PromptBuilderPayload {
  intro: string;
  slots: {
    que: Array<{ key: string; label: string }>;
    para_quien: Array<{ key: string; label: string }>;
    como: Array<{ key: string; label: string }>;
  };
  vagueAnswers: Record<string, string>;
  fullAnswers: Record<string, string>;
  checkQuestions: Record<
    string,
    {
      question: string;
      options: Array<{ key: string; label: string; isCorrect: boolean }>;
      explanation: string;
    }
  >;
  closing: string;
}

type Phase = 'que' | 'armar' | 'comparar' | 'revisar' | 'cierre';

const STEP = [
  { n: 1, label: 'Qué quiero' },
  { n: 2, label: 'Para quién y cómo' },
  { n: 3, label: 'Comparar' },
  { n: 4, label: 'Revisar' },
];

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-touch-lg w-full rounded-md border-2 px-4 py-3 text-left text-body transition-colors sm:px-5 ${
        active ? 'border-eje-b bg-eje-b-soft font-semibold' : 'border-line hover:border-eje-b active:bg-eje-b-soft'
      }`}
    >
      {children}
    </button>
  );
}

export function PromptBuilderActivity({
  payload,
  onFinish,
}: {
  payload: PromptBuilderPayload;
  onFinish: (r: { checkedCorrectly: boolean }) => void;
}) {
  const [phase, setPhase] = useState<Phase>('que');
  const [que, setQue] = useState<string | null>(null);
  const [paraQuien, setParaQuien] = useState<string | null>(null);
  const [como, setComo] = useState<string | null>(null);
  const [check, setCheck] = useState<string | null>(null);

  const label = (list: Array<{ key: string; label: string }>, k: string | null) =>
    list.find((o) => o.key === k)?.label ?? '';

  const fullPrompt =
    que && paraQuien && como
      ? `${label(payload.slots.que, que)}, ${label(payload.slots.para_quien, paraQuien)}, ${label(payload.slots.como, como)}.`
      : '';
  const fullAnswer = que && paraQuien && como ? payload.fullAnswers[`${que}|${paraQuien}|${como}`] : '';
  const checkQ = que ? payload.checkQuestions[que] : null;
  const stepIndex = { que: 0, armar: 1, comparar: 2, revisar: 3, cierre: 3 }[phase];

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-5 sm:p-6">
      {/* La receta, siempre a la vista: es lo que se aprende. */}
      <ol className="flex flex-wrap gap-2" aria-label="La receta de la buena pregunta">
        {STEP.map((s, i) => (
          <li
            key={s.n}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-small font-semibold ${
              i === stepIndex ? 'bg-eje-b text-white' : i < stepIndex ? 'bg-eje-b-soft text-eje-b' : 'bg-surf text-ink-3'
            }`}
          >
            {i < stepIndex ? <Icon name="check" size={14} /> : <span>{s.n}</span>}
            {s.label}
          </li>
        ))}
      </ol>

      {phase === 'que' && (
        <section className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-body-lg">{payload.intro}</p>
            <ReadAloudButton text={payload.intro} />
          </div>
          <h2 className="text-h2 font-bold">1. ¿Qué quieres pedirle a la IA?</h2>
          {payload.slots.que.map((o) => (
            <Choice key={o.key} active={que === o.key} onClick={() => setQue(o.key)}>
              {o.label}
            </Choice>
          ))}
          {que && (
            <>
              <p className="text-small text-ink-2">
                Así, con solo eso, le preguntaste «{label(payload.slots.que, que)}». Mira qué respondió:
              </p>
              <AIDisclosure>{payload.vagueAnswers[que]}</AIDisclosure>
              <p className="text-body">¿Se entiende? Vamos a preguntar mejor.</p>
              <Button axis="b" full onClick={() => setPhase('armar')}>
                Agregar ingredientes
              </Button>
            </>
          )}
        </section>
      )}

      {phase === 'armar' && (
        <section className="space-y-4">
          <h2 className="text-h2 font-bold">2. ¿Para quién? ¿Cómo lo quieres?</h2>
          <p className="text-small font-semibold uppercase tracking-wide text-ink-3">Para quién o para qué</p>
          {payload.slots.para_quien.map((o) => (
            <Choice key={o.key} active={paraQuien === o.key} onClick={() => setParaQuien(o.key)}>
              {o.label}
            </Choice>
          ))}
          <p className="pt-2 text-small font-semibold uppercase tracking-wide text-ink-3">Cómo lo quiero</p>
          {payload.slots.como.map((o) => (
            <Choice key={o.key} active={como === o.key} onClick={() => setComo(o.key)}>
              {o.label}
            </Choice>
          ))}
          {fullPrompt && (
            <div className="rounded-md border-2 border-eje-b bg-eje-b-soft p-4">
              <p className="text-small font-semibold text-eje-b">Tu pregunta completa</p>
              <p className="mt-1 text-body-lg">{fullPrompt}</p>
            </div>
          )}
          <Button
            axis="b"
            full
            disabled={!fullPrompt}
            disabledReason={!fullPrompt ? 'Elige para quién y cómo lo quieres.' : undefined}
            onClick={() => setPhase('comparar')}
          >
            Ver qué responde ahora
          </Button>
        </section>
      )}

      {phase === 'comparar' && que && (
        <section className="space-y-4">
          <h2 className="text-h2 font-bold">3. Compara</h2>
          <p className="text-small font-semibold text-ink-3">Con la pregunta corta:</p>
          <AIDisclosure>{payload.vagueAnswers[que]}</AIDisclosure>
          <p className="text-small font-semibold text-ink-3">Con tu pregunta completa:</p>
          <AIDisclosure>{fullAnswer}</AIDisclosure>
          <p className="text-body">
            La misma IA. La diferencia la hiciste tú, con la pregunta.
          </p>
          <Button axis="b" full onClick={() => setPhase('revisar')}>
            Falta un ingrediente
          </Button>
        </section>
      )}

      {phase === 'revisar' && checkQ && (
        <section className="space-y-4">
          <h2 className="text-h2 font-bold">4. Revisar lo que te dio</h2>
          <p className="text-body-lg">{checkQ.question}</p>
          {checkQ.options.map((o) => (
            <Choice key={o.key} active={check === o.key} onClick={() => setCheck(o.key)}>
              {o.label}
            </Choice>
          ))}
          {check && (
            <div className="rounded-md border-2 border-line p-4 text-body">
              {checkQ.options.find((o) => o.key === check)?.isCorrect ? (
                <p className="font-semibold text-ok">Eso es.</p>
              ) : (
                <p className="font-semibold">Mira otra vez.</p>
              )}
              <p className="mt-1 text-ink-2">{checkQ.explanation}</p>
            </div>
          )}
          <Button axis="b" full disabled={!check} disabledReason={!check ? 'Elige una opción.' : undefined} onClick={() => setPhase('cierre')}>
            Continuar
          </Button>
        </section>
      )}

      {phase === 'cierre' && checkQ && (
        <section className="space-y-4">
          <div className="rounded-md border-2 border-eje-b bg-eje-b-soft p-4 sm:p-5">
            <p className="text-body-lg">{payload.closing}</p>
          </div>
          <Button
            axis="b"
            full
            onClick={() =>
              onFinish({
                checkedCorrectly: checkQ.options.find((o) => o.key === check)?.isCorrect === true,
              })
            }
          >
            Terminar
          </Button>
        </section>
      )}
    </div>
  );
}
