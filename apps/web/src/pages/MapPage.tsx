import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError, type PathResponse } from '../lib/api';
import { useApp } from '../lib/store';
import { StudentShell } from '../components/AppShell';
import { Button, ProgressDots, ErrorState, Skeleton } from '../components/ui';
import { Emblem } from '../components/Emblem';
import { Icon } from '../components/Icon';

type AxisCode = 'A' | 'B' | 'C' | 'D';

// La distinción de eje viaja en TRES canales: silueta del sello, color y
// palabra. El color por sí solo no basta (design system, principio 6).
const AXIS_STYLE: Record<AxisCode, { text: string; btn: 'a' | 'b' | 'c' | 'd' }> = {
  A: { text: 'text-eje-a', btn: 'a' },
  B: { text: 'text-eje-b', btn: 'b' },
  C: { text: 'text-eje-c', btn: 'c' },
  D: { text: 'text-eje-d', btn: 'd' },
};

export function MapPage() {
  const nav = useNavigate();
  const student = useApp((s) => s.student);
  const [data, setData] = useState<PathResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!student) {
      nav('/');
      return;
    }
    api
      .get<PathResponse>('/me/path')
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.detail : 'Algo falló.'));
  }, [student, nav]);

  const totalDone = data?.axes.reduce((a, x) => a + x.completed, 0) ?? 0;
  const totalAll = data?.axes.reduce((a, x) => a + x.total, 0) ?? 0;

  return (
    <StudentShell readAloudText="Este es tu mapa. Elige por dónde quieres seguir.">
      {/* El ritmo vertical va apretado a propósito: docs/02 pide que los cuatro
          ejes se vean SIN SCROLL — el niño ve el todo y elige, en vez de
          recorrer un camino lineal. En una pantalla de portátil escolar eso
          deja poco margen, así que el encabezado va en una sola línea. */}
      <div className="mx-auto max-w-4xl px-6 py-5">
        {data && (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <h1 className="text-h1 font-bold">Tu mapa</h1>
            <div className="flex items-center gap-5">
              <p className="text-body">
                <span className="font-bold">{totalDone}</span>
                <span className="text-ink-2"> de {totalAll} hechas</span>
              </p>
              <Link
                to="/logros"
                className="flex min-h-touch items-center gap-2 rounded-sm px-3 text-body font-semibold text-ink-2 hover:bg-surf"
              >
                <Icon name="award" size={20} />
                {data.student.badgeCount} logros
              </Link>
            </div>
          </div>
        )}

        {error && <ErrorState message={error} onRetry={() => location.reload()} />}

        {!data && !error && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        )}

        {/* Los cuatro ejes SIEMPRE visibles sin scroll: el niño ve el todo, no
            un camino lineal forzado. Elegir es parte de la experiencia. */}
        {data && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {data.axes.map((axis, i) => {
              const code = axis.code as AxisCode;
              const st = AXIS_STYLE[code];
              const empty = axis.total === 0;
              return (
                <section
                  key={axis.code}
                  className="seal-in flex flex-col rounded-lg border border-line bg-white p-4"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <Emblem axis={code} size={64} />
                    <div className="min-w-0 flex-1">
                      <h2 className={`text-h2 font-bold ${st.text}`}>{axis.displayName}</h2>
                      <p className="mt-1 text-small text-ink-2">{axis.tagline}</p>
                    </div>
                  </div>

                  <div className={`mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 ${st.text}`}>
                    <ProgressDots completed={axis.completed} total={Math.max(axis.total, 1)} />
                    <span className="text-small text-ink-2">
                      {axis.completed} de {axis.total}
                    </span>
                    {!axis.offlineCapable && (
                      <span className="flex items-center gap-1.5 text-micro text-ink-3">
                        <Icon name="wifi" size={16} />
                        necesita internet
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex-1 content-end">
                    {empty ? (
                      <p className="text-small text-ink-2">
                        Todavía no hay nada nuevo aquí. Tu profe va a abrir más pronto.
                      </p>
                    ) : (
                      <Link to={`/eje/${axis.code}`} className="block">
                        <Button axis={st.btn} full>
                          {axis.completed === 0 ? 'Empezar' : 'Continuar'}
                        </Button>
                      </Link>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
