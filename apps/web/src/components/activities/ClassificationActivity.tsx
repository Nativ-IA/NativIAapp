// =============================================================================
// Actividad de clasificación «¿real o hecho por IA?» — Ejes A y C.
// Wireframe: docs/02-information-architecture.md, pantalla 7.
//
// Dos reglas del producto viven aquí:
//   · Justificación obligatoria — un acierto sin señal válida NO cuenta para
//     el dominio (US-02). Adivinar bien no es detectar.
//   · Pistas progresivas — una señal observable por pista, nunca la respuesta.
//
// Corrección local: funciona sin conexión y sin consumir tokens.
// =============================================================================

import { useState } from 'react';
import { Button, ProgressDots, ReadAloudButton } from '../ui';
import { Icon } from '../Icon';

export interface ClassificationPayload {
  /** `imagen`/`mixto` exigen `mediaUrl` en todos los ítems. Ver types.ts. */
  signalKind: 'texto' | 'imagen' | 'mixto';
  prompt: string;
  signals: Array<{ key: string; label: string }>;
  items: Array<{
    id: string;
    content: string;
    mediaUrl?: string;
    isSynthetic: boolean;
    hints: string[];
    validSignals: string[];
  }>;
  minCorrect: number;
}

/** Razones para sostener que algo es REAL.
 *
 *  Las señales del contenido son señales de síntesis: sirven para argumentar
 *  «lo hizo una IA», no lo contrario. Pedirle a un niño que justifique «es
 *  real» con una lista de defectos de IA es incoherente — ninguna aplica.
 *  Aquí la justificación es de otra naturaleza: concordancia con lo que ya
 *  sabe. */
const REAL_REASONS = [
  { key: 'encaja', label: 'Encaja con lo que yo sé' },
  { key: 'sin_rarezas', label: 'No vi nada raro ni imposible' },
  { key: 'conocido', label: 'Ya lo había visto u oído antes' },
];

export function ClassificationActivity({
  payload,
  onFinish,
}: {
  payload: ClassificationPayload;
  onFinish: (r: {
    correct: number;
    total: number;
    hintsUsed: number;
    validJustifications: number;
  }) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  const [correct, setCorrect] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [validJust, setValidJust] = useState(0);

  const item = payload.items[index];
  const isLast = index === payload.items.length - 1;
  const wasRight = answer !== null && answer === item.isSynthetic;

  // Una justificación es válida si al menos una señal marcada está entre las
  // que realmente explican este elemento. Para los ítems reales no hay señales
  // de síntesis que marcar, así que basta con acertar.
  const justificationValid = item.isSynthetic
    ? picked.some((p) => item.validSignals.includes(p))
    : true;

  function confirm() {
    setConfirmed(true);
    if (wasRight) setCorrect((c) => c + 1);
    if (wasRight && justificationValid) setValidJust((v) => v + 1);
  }

  function next() {
    if (isLast) {
      // `correct` y `validJust` ya se actualizaron en confirm(), que ocurrió en
      // un evento anterior.
      onFinish({
        correct,
        total: payload.items.length,
        hintsUsed,
        validJustifications: validJust,
      });
      return;
    }
    setIndex((i) => i + 1);
    setAnswer(null);
    setHintLevel(0);
    setPicked([]);
    setConfirmed(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <div className="flex items-center justify-between">
        <ProgressDots completed={index} total={payload.items.length} />
        <ReadAloudButton text={`${payload.prompt}. ${item.content}`} />
      </div>

      <p className="text-body text-ink-2">{payload.prompt}</p>

      <section className="prose-block rounded-md border-2 border-line p-5">
        {item.mediaUrl && (
          <img
            src={item.mediaUrl}
            alt=""
            className="mb-4 max-h-64 w-full rounded-md object-contain"
          />
        )}
        <p className="text-body-lg">{item.content}</p>
      </section>

      {/* Paso 1 · clasificar */}
      {answer === null && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setAnswer(false)}
            className="flex min-h-touch-lg items-center justify-center gap-2.5 rounded-md border-2 border-line px-5 py-3 text-body-lg font-semibold transition-colors hover:border-eje-c hover:bg-eje-c-soft"
          >
            <Icon name="eye" size={22} />
            Es real
          </button>
          <button
            onClick={() => setAnswer(true)}
            className="flex min-h-touch-lg items-center justify-center gap-2.5 rounded-md border-2 border-line px-5 py-3 text-body-lg font-semibold transition-colors hover:border-eje-c hover:bg-eje-c-soft"
          >
            <Icon name="cpu" size={22} />
            La hizo una IA
          </button>
        </div>
      )}

      {/* Paso 2 · justificar. Obligatorio antes de confirmar (US-02). */}
      {answer !== null && !confirmed && (
        <section className="space-y-4 rounded-md border-2 border-eje-c bg-eje-c-soft p-5">
          <p className="text-body font-semibold">
            Elegiste: {answer ? 'la hizo una IA' : 'es real'}
          </p>
          <div>
            <p className="mb-2 text-body">
              {answer
                ? '¿Qué señal viste? Elige al menos una.'
                : '¿Por qué crees que es real? Elige al menos una.'}
            </p>
            <div className="space-y-2">
              {(answer ? payload.signals : REAL_REASONS).map((s) => {
                const on = picked.includes(s.key);
                return (
                  <label
                    key={s.key}
                    className={`flex min-h-touch cursor-pointer items-center gap-3 rounded-sm border-2 px-4 py-2 ${
                      on ? 'border-eje-c bg-white' : 'border-transparent bg-white/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setPicked((p) => (on ? p.filter((x) => x !== s.key) : [...p, s.key]))
                      }
                      className="h-5 w-5"
                    />
                    <span className="text-body">{s.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              axis="c"
              disabled={picked.length === 0}
              disabledReason={
                picked.length === 0 ? 'Marca al menos una señal para continuar.' : undefined
              }
              onClick={confirm}
            >
              Confirmar
            </Button>
            <Button
              axis="c"
              variant="secondary"
              onClick={() => {
                setHintLevel((h) => Math.min(h + 1, item.hints.length));
                setHintsUsed((h) => h + 1);
              }}
              disabled={hintLevel >= item.hints.length}
              disabledReason={
                hintLevel >= item.hints.length ? 'Ya viste todas las pistas.' : undefined
              }
            >
              Necesito otra pista
            </Button>
          </div>

          {/* Una señal observable por pista. Nunca la respuesta. */}
          {item.hints.slice(0, hintLevel).map((h, i) => (
            <p key={i} className="flex items-start gap-2.5 rounded-sm bg-white px-4 py-3 text-body">
              <span className="mt-0.5 text-eje-c">
                <Icon name="info" size={18} />
              </span>
              <span>
                <strong>Pista {i + 1}:</strong> {h}
              </span>
            </p>
          ))}
        </section>
      )}

      {/* Paso 3 · retroalimentación */}
      {confirmed && (
        <section
          className={`space-y-3 rounded-md border-2 p-5 ${
            wasRight ? 'border-ok bg-eje-b-soft' : 'border-warn bg-eje-c-soft'
          }`}
        >
          <p className="flex items-center gap-2.5 text-body-lg font-bold">
            <Icon name={wasRight ? 'check' : 'repeat'} size={22} />
            {wasRight
              ? item.isSynthetic
                ? 'Lo detectaste'
                : 'Bien visto'
              : item.isSynthetic
                ? 'Este se te escapó'
                : 'Este sí era real'}
          </p>
          <p className="text-body">
            {item.isSynthetic ? 'Este lo hizo una IA.' : 'Este es real.'}
          </p>

          {wasRight && !justificationValid && (
            // El matiz que hace honesta la métrica: acertaste, pero la señal
            // que marcaste no era la que lo delata.
            <p className="text-body">
              Acertaste, pero la señal que marcaste no es la que lo delata. Fíjate en:{' '}
              <strong>
                {payload.signals
                  .filter((s) => item.validSignals.includes(s.key))
                  .map((s) => s.label.toLowerCase())
                  .join(', ')}
              </strong>
              .
            </p>
          )}

          <Button axis="c" full onClick={next}>
            {isLast ? 'Terminar' : 'Siguiente'}
          </Button>
        </section>
      )}
    </div>
  );
}
