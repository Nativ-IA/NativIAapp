// =============================================================================
// «Taller de preguntas con Nati» — taller_instrucciones (eje B).
//
// El niño escribe su instrucción para una situación; Nati (modo ayudante,
// modelo propio con verificador delante) le dice qué ingrediente de la
// receta tiene y cuál le falta. La receta se pinta con lo que devuelve el
// servidor, que la revisa de forma determinística aunque no haya modelo.
//
// Nati nunca escribe la instrucción por el niño: se pide una pista, y la
// mejora la hace él. Cada reto se da por superado cuando la instrucción tiene
// los tres primeros ingredientes.
// =============================================================================

import { useState } from 'react';
import { api, ApiError, type WorkshopReply } from '../../lib/api';
import { Button, Avatar, ReadAloudButton } from '../ui';
import { Icon } from '../Icon';

export interface PromptWorkshopPayload {
  intro: string;
  challenges: Array<{ id: string; situation: string; weakExample: string }>;
  closing: string;
}

const RECIPE: Array<{ key: 'que' | 'para_quien' | 'como'; label: string }> = [
  { key: 'que', label: 'Qué quiero' },
  { key: 'para_quien', label: 'Para quién o para qué' },
  { key: 'como', label: 'Cómo lo quiero' },
];

export function PromptWorkshopActivity({
  payload,
  onFinish,
}: {
  payload: PromptWorkshopPayload;
  onFinish: (r: { completed: number; total: number; reviews: number }) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [draft, setDraft] = useState('');
  const [reply, setReply] = useState<WorkshopReply | null>(null);
  // Texto que Nati revisó. Si el niño lo cambia, la revisión ya no aplica.
  const [reviewed, setReviewed] = useState('');
  const [thinking, setThinking] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [reviews, setReviews] = useState(0);
  const [done, setDone] = useState(false);

  const challenge = payload.challenges[idx];
  const stale = reply !== null && draft.trim() !== reviewed;
  const solved =
    reply && !stale ? reply.recipe.que && reply.recipe.para_quien && reply.recipe.como : false;

  async function review() {
    const instruction = draft.trim();
    if (!instruction || thinking) return;
    setThinking(true);
    try {
      const r = await api.post<WorkshopReply>('/nati/workshop', {
        situation: challenge.situation,
        instruction,
      });
      setReply(r);
      setReviewed(instruction);
      setReviews((n) => n + 1);
    } catch (e) {
      setReply({
        content:
          e instanceof ApiError && e.code === 'offline'
            ? 'Sin internet no puedo revisar tu instrucción. Tu avance está guardado.'
            : 'Se me enredaron las ideas. Inténtalo otra vez.',
        source: 'faq',
        rejected: 0,
        suggestAskTeacher: false,
        latencyMs: 0,
        recipe: { que: false, para_quien: false, como: false, revisar: false },
      });
      setReviewed(instruction);
    } finally {
      setThinking(false);
    }
  }

  function next() {
    const c = completed + (solved ? 1 : 0);
    setCompleted(c);
    if (idx + 1 < payload.challenges.length) {
      setIdx(idx + 1);
      setDraft('');
      setReply(null);
      setReviewed('');
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <div className="rounded-md border-2 border-eje-b bg-eje-b-soft p-5">
          <p className="text-body-lg">{payload.closing}</p>
        </div>
        <Button axis="b" full onClick={() => onFinish({ completed, total: payload.challenges.length, reviews })}>
          Terminar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      {idx === 0 && !reply && (
        <div className="flex items-start justify-between gap-3">
          <p className="text-body-lg">{payload.intro}</p>
          <ReadAloudButton text={payload.intro} />
        </div>
      )}

      <p className="text-small font-semibold uppercase tracking-wide text-ink-3">
        Reto {idx + 1} de {payload.challenges.length}
      </p>
      <section className="rounded-md border-2 border-eje-b bg-eje-b-soft p-5">
        <p className="text-body-lg">{challenge.situation}</p>
      </section>

      <div>
        <label htmlFor="instr" className="block text-body font-semibold">
          Escribe tu instrucción para la IA
        </label>
        <p className="mb-2 text-small text-ink-2">
          Una instrucción floja sería: «{challenge.weakExample}». Tú puedes hacerla mejor.
        </p>
        <textarea
          id="instr"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          maxLength={300}
          disabled={thinking}
          className="w-full rounded-md border-2 border-line p-3 text-body focus:border-eje-b"
          placeholder="Explícame… para… en…"
        />
      </div>

      <Button
        axis="b"
        full
        disabled={draft.trim().length === 0 || thinking}
        disabledReason={draft.trim().length === 0 ? 'Escribe tu instrucción primero.' : undefined}
        onClick={review}
      >
        {thinking ? 'Nati está leyendo…' : reply ? 'Revisar otra vez' : 'Que Nati la revise'}
      </Button>

      {reply && stale && (
        <p className="rounded-md border-2 border-line p-3 text-body text-ink-2">
          Cambiaste tu instrucción. Pídele a Nati que la revise otra vez.
        </p>
      )}

      {reply && !stale && (
        <section className="space-y-3">
          {/* Los ingredientes, marcados por el servidor. */}
          <ul className="flex flex-wrap gap-2" aria-label="Ingredientes de tu instrucción">
            {RECIPE.map((i) => (
              <li
                key={i.key}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-small font-semibold ${
                  reply.recipe[i.key] ? 'bg-eje-b text-white' : 'bg-surf text-ink-3'
                }`}
              >
                {reply.recipe[i.key] ? <Icon name="check" size={14} /> : <span>·</span>}
                {i.label}
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <div className="shrink-0">
              <Avatar avatarKey="nati" size="sm" label="Nati" />
            </div>
            <p className="rounded-lg rounded-tl-sm bg-brand-soft px-4 py-3 text-body">{reply.content}</p>
          </div>
          <p className="text-micro text-ink-3">Nati es una IA y se puede equivocar.</p>

          <Button axis="b" variant={solved ? 'primary' : 'secondary'} full onClick={next}>
            {solved
              ? idx + 1 < payload.challenges.length
                ? 'Siguiente reto'
                : 'Terminar'
              : 'Pasar al siguiente de todas formas'}
          </Button>
        </section>
      )}
    </div>
  );
}
