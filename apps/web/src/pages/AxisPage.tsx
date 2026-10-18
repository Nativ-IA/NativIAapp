import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, type ActivitySummary } from '../lib/api';
import { StudentShell } from '../components/AppShell';
import { Button, EmptyState, ErrorState, Skeleton } from '../components/ui';
import { Emblem } from '../components/Emblem';
import { Icon, type IconName } from '../components/Icon';
import { AXIS_NAME, AXIS_TAGLINE, AXIS_TEXT, AXIS_BUTTON, isAxisCode } from '../lib/axes';

const SUBJECT: Record<string, { label: string; icon: IconName }> = {
  matematicas: { label: 'Matemáticas', icon: 'calculator' },
  lenguaje: { label: 'Lenguaje', icon: 'book' },
  ciencias: { label: 'Ciencias', icon: 'flask' },
};

/** Estado de la actividad. Tres canales: forma del disco, icono y palabra —
 *  nunca solo el color (design system, principio 6). */
const STATUS: Record<string, { icon: IconName; ring: string; label: string }> = {
  disponible: { icon: 'play', ring: 'bg-surf text-ink-2', label: 'Sin empezar' },
  completada: { icon: 'check', ring: 'bg-eje-b-soft text-eje-b', label: 'Completada' },
  bloqueada: { icon: 'lock', ring: 'bg-surf text-ink-3', label: 'Bloqueada' },
};

export function AxisPage() {
  const { axisCode = 'B' } = useParams();
  const nav = useNavigate();
  const [items, setItems] = useState<ActivitySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const code = isAxisCode(axisCode) ? axisCode : 'B';

  useEffect(() => {
    setItems(null);
    api
      .get<ActivitySummary[]>(`/axes/${axisCode}/activities`)
      .then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.detail : 'Algo falló.'));
  }, [axisCode]);

  const done = items?.filter((a) => a.status === 'completada').length ?? 0;

  return (
    <StudentShell back="/mapa" readAloudText={`${AXIS_NAME[code]}. ${AXIS_TAGLINE[code]}`}>
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* La pantalla venía sin ninguna identidad de eje: se entraba a
            «Detective de IA» y no había nada que dijera dónde estabas. */}
        <header className="flex items-start gap-4">
          <Emblem axis={code} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className={`text-h1 font-bold ${AXIS_TEXT[code]}`}>{AXIS_NAME[code]}</h1>
            <p className="mt-1 text-body text-ink-2">{AXIS_TAGLINE[code]}</p>
          </div>
          {items && items.length > 0 && (
            <p className="whitespace-nowrap pt-2 text-small text-ink-2">
              <span className="font-bold text-ink">{done}</span> de {items.length}
            </p>
          )}
        </header>

        <div className="mt-8 space-y-3">
          {error && <ErrorState message={error} onRetry={() => location.reload()} />}

          {!items && !error &&
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}

          {items?.length === 0 && (
            <EmptyState
              icon="sprout"
              title="Todavía no hay nada nuevo"
              hint="Tu profe va a abrir más actividades pronto."
            />
          )}

          {items?.map((a) => {
            const st = STATUS[a.status] ?? STATUS.disponible;
            const subject = SUBJECT[a.subject];
            return (
              <article
                key={a.id}
                className={`flex flex-wrap items-center gap-4 rounded-lg border border-line p-4 ${
                  a.status === 'bloqueada' ? 'bg-surf' : 'bg-white'
                }`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${st.ring}`}
                  role="img"
                  aria-label={st.label}
                >
                  <Icon name={st.icon} size={20} />
                </span>

                <div className="min-w-0 flex-1">
                  <h2
                    className={`text-body-lg font-bold ${
                      a.status === 'bloqueada' ? 'text-ink-2' : ''
                    }`}
                  >
                    {a.title}
                  </h2>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-2">
                    <span className="flex items-center gap-1.5">
                      {subject && <Icon name={subject.icon} size={16} />}
                      {subject?.label ?? a.subject}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Icon name="clock" size={16} />~{a.estimatedMinutes} min
                    </span>
                    {/* Se informa ANTES de entrar, para que el niño no se frustre
                        a mitad de camino cuando no hay red. */}
                    {a.requiresNetwork && (
                      <span className="flex items-center gap-1.5 text-ink-3">
                        <Icon name="wifi" size={16} />
                        necesita internet
                      </span>
                    )}
                  </p>
                  {a.status === 'completada' && (
                    // El andamiaje se reconoce, no se penaliza.
                    <p className="mt-1 text-small font-semibold text-ok">
                      {a.completionQuality === 'sin_ayuda'
                        ? 'Lo lograste sin ayuda'
                        : 'Lo lograste con pistas'}
                    </p>
                  )}
                </div>

                {a.status === 'disponible' && (
                  <Button axis={AXIS_BUTTON[code]} onClick={() => nav(`/actividad/${a.id}`)}>
                    Empezar
                  </Button>
                )}
                {a.status === 'completada' && (
                  <Button variant="secondary" onClick={() => nav(`/actividad/${a.id}`)}>
                    Repetir
                  </Button>
                )}
                {a.status === 'bloqueada' && (
                  <p className="max-w-[13rem] text-small text-ink-3">
                    Se abre cuando termines la anterior
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </StudentShell>
  );
}
