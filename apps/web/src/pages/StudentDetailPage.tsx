import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { Avatar, Button, ErrorState, Skeleton } from '../components/ui';
import { Icon } from '../components/Icon';
import { Emblem } from '../components/Emblem';
import { SectionHead } from '../components/TeacherShell';
import { AXIS_NAME, isAxisCode } from '../lib/axes';

interface Detail {
  firstName: string;
  avatarKey: string;
  summary30d: { attempts: number; minutes: number; activeDays: number };
  masteryByAxis: Array<{ axisCode: string; level: string }>;
  recentInteractions: Array<{
    interactionId: string;
    activityTitle: string;
    occurredAt: string;
    marker: string;
  }>;
  metacognitionResponses: Array<{ text: string; occurredAt: string }>;
}

// Rampa ordinal de un solo tono, no semáforo: comunica «cuánto», no
// «bueno o malo» (docs/03-design-system.md §2.3). Tres canales redundantes:
// relleno, glifo y palabra.
const LEVEL: Record<string, { label: string; glyph: string; cls: string; text: string }> = {
  sin_datos: { label: 'Sin datos', glyph: '–', cls: 'bg-white border border-line', text: 'text-ink-3' },
  necesita_apoyo: { label: 'Necesita apoyo', glyph: '○', cls: 'bg-mastery-1', text: 'text-ink' },
  va_en_camino: { label: 'Va en camino', glyph: '◐', cls: 'bg-mastery-2', text: 'text-white' },
  lo_maneja_bien: { label: 'Lo maneja bien', glyph: '●', cls: 'bg-mastery-3', text: 'text-white' },
};

const MARKER: Record<string, { label: string; cls: string }> = {
  comprobo_solo: { label: 'Comprobó solo', cls: 'bg-eje-b-soft text-eje-b' },
  acerto_con_pistas: { label: 'Acertó con pistas', cls: 'bg-eje-c-soft text-eje-c' },
  acepto_sin_comprobar: { label: 'Aceptó sin comprobar', cls: 'bg-eje-d-soft text-alert' },
};

export function StudentDetailPage() {
  const { studentProfileId = '' } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Detail>(`/students/${studentProfileId}/detail`)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.detail : 'Algo falló.'));
  }, [studentProfileId]);

  if (error) return <ErrorState message={error} onRetry={() => nav('/profe/grupo')} />;

  return (
    <div className="min-h-screen bg-surf">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-6 py-3">
          <button
            onClick={() => nav('/profe/grupo')}
            className="flex min-h-touch items-center gap-1.5 rounded-sm px-3 text-small font-semibold text-ink-2 hover:bg-surf"
          >
            <Icon name="arrow-left" size={18} />
            Grupo
          </button>
          {data && (
            <>
              <Avatar avatarKey={data.avatarKey} size="sm" />
              <h1 className="text-body-lg font-bold">{data.firstName}</h1>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-6">
        {!data && <Skeleton className="h-64" />}

        {data && (
          <div className="space-y-8">
            {/* Tres cifras y nada más. Un docente que abre una ficha quiere
                saber si el niño ha estado aquí, no leer un informe. */}
            <div className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-lg border border-line bg-white">
              <Stat value={data.summary30d.attempts} label="actividades" />
              <Stat value={data.summary30d.minutes} label="minutos" />
              <Stat value={data.summary30d.activeDays} label="días activos" />
            </div>
            <p className="-mt-6 text-micro text-ink-3">En los últimos 30 días.</p>

            <section>
              <SectionHead title="Cómo va por eje" />
              <div className="grid gap-3 sm:grid-cols-2">
                {data.masteryByAxis.map((m) => {
                  const lv = LEVEL[m.level] ?? LEVEL.sin_datos;
                  const code = isAxisCode(m.axisCode) ? m.axisCode : 'A';
                  return (
                    <div
                      key={m.axisCode}
                      className="flex items-center gap-3 rounded-lg border border-line bg-white p-3"
                    >
                      <Emblem axis={code} size={40} />
                      <span className="min-w-0 flex-1 text-small font-semibold">
                        {AXIS_NAME[code]}
                      </span>
                      <span
                        className={`flex items-center gap-2 rounded-sm px-3 py-1 text-small font-semibold ${lv.cls} ${lv.text}`}
                      >
                        <span aria-hidden>{lv.glyph}</span>
                        {lv.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <SectionHead title="Sus últimas conversaciones" />
              {data.recentInteractions.length === 0 ? (
                <p className="rounded-lg border border-line bg-white p-4 text-small text-ink-2">
                  Todavía no ha conversado con el tutor.
                </p>
              ) : (
                <ul className="overflow-hidden rounded-lg border border-line bg-white">
                  {data.recentInteractions.map((i) => {
                    const mk = MARKER[i.marker] ?? MARKER.acerto_con_pistas;
                    return (
                      <li key={i.interactionId} className="row">
                        <div className="min-w-0 flex-1">
                          <p className="text-body font-semibold">{i.activityTitle}</p>
                          <p className="text-small text-ink-2">
                            {new Date(i.occurredAt).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-small font-semibold ${mk.cls}`}
                        >
                          {mk.label}
                        </span>
                        <Button variant="secondary">Ver conversación</Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Textuales, sin resumir, sin corregir ortografía y sin análisis
                automático. Es el dato más rico del panel: la frase de un niño de
                9 años comunica algo que ningún indicador captura. Por eso es la
                única parte de la ficha con tipografía de lectura, no de tabla. */}
            <section>
              <SectionHead title="Lo que dice de sí mismo" />
              {data.metacognitionResponses.length === 0 ? (
                <p className="rounded-lg border border-line bg-white p-4 text-small text-ink-2">
                  Todavía no ha respondido la pregunta final.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.metacognitionResponses.map((m, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-l-4 border-line border-l-brand bg-white p-4"
                    >
                      <p className="text-body-lg italic">«{m.text}»</p>
                      <p className="mt-1.5 text-micro text-ink-3">
                        {new Date(m.occurredAt).toLocaleDateString('es-CO')}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-4 py-4 text-center">
      <p className="text-h1 font-bold">{value}</p>
      <p className="text-small text-ink-2">{label}</p>
    </div>
  );
}
