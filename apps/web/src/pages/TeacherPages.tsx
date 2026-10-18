// =============================================================================
// Panel del Maestro.
//
// Criterio que gobierna esta pantalla: 4 de cada 5 docentes deben identificar
// al estudiante que más apoyo necesita, y por qué, en menos de 60 segundos,
// sin ayuda (docs/10-teacher-dashboard-spec.md).
//
// Cero jerga: no aparece "mastery", "PISA", "BKT" ni "engagement".
// Cero emoji: §6 lo prohíbe en la interfaz estructural del docente.
// Cada bloque termina en una ACCIÓN, nunca en un dato.
// =============================================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, setToken } from '../lib/api';
import { Avatar, Button, ErrorState, Skeleton } from '../components/ui';
import { Icon } from '../components/Icon';
import { Mark, CLAIM_INSTITUCIONAL } from '../components/Logo';
import { TeacherShell, SectionHead } from '../components/TeacherShell';

interface TeacherSession {
  accessToken: string;
  user: {
    firstName: string;
    lastName: string;
    role: string;
    classrooms: Array<{ classroomId: string; label: string }>;
  };
}

export function TeacherLoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('docente@demo.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<TeacherSession>('/auth/teacher', { email, password });
      setToken(res.accessToken);
      localStorage.setItem('nativia.teacher', JSON.stringify(res.user));
      nav('/profe/panel');
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'No pudimos entrar.');
    } finally {
      setLoading(false);
    }
  }

  const field =
    'mt-1.5 min-h-touch w-full rounded-md border-2 border-line px-4 text-body transition-colors focus:border-brand';

  return (
    <div className="flex min-h-screen flex-col bg-surf">
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center">
            <Mark className="h-14 w-14 text-brand" />
            <p className="mt-3 text-h1 font-extrabold tracking-tight text-ink">
              Nativ<span className="text-brand">IA</span>
            </p>
            <p className="mt-1 text-small text-ink-2">{CLAIM_INSTITUCIONAL}</p>
          </div>

          <form
            onSubmit={submit}
            className="mt-8 rounded-lg border border-line bg-white px-6 py-7"
          >
            <h1 className="text-body-lg font-bold">Panel del Maestro</h1>

            <div className="mt-5">
              <label htmlFor="email" className="block text-small font-semibold">
                Correo institucional
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </div>

            <div className="mt-4">
              <label htmlFor="password" className="block text-small font-semibold">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={field}
              />
            </div>

            {error && (
              <p role="alert" className="mt-4 text-small text-alert">
                {error}
              </p>
            )}

            <div className="mt-6">
              <Button full type="submit" disabled={loading}>
                {loading ? 'Entrando…' : 'Entrar'}
              </Button>
            </div>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => nav('/')}
              className="min-h-touch rounded-sm px-3 text-small font-semibold text-ink-2 hover:bg-white"
            >
              Soy estudiante
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Inicio del panel — la prueba de los 60 segundos ───────────────────────────

interface Overview {
  computedAt: string;
  needHelpToday: Array<{
    studentProfileId: string;
    firstName: string;
    avatarKey: string;
    reason: string;
    signalConfidence: string;
  }>;
  groupHighlights: {
    best: { label: string; studentsAtLevel: number; totalStudents: number } | null;
    worst: { label: string; studentsAtLevel: number; totalStudents: number } | null;
  };
  alerts: Array<{
    id: string;
    code: string;
    severity: string;
    message: string;
    suggestedAction: { label?: string };
    isContentHidden: boolean;
  }>;
  moderationPending: number;
}

const SEVERITY: Record<string, { border: string; dot: string; word: string }> = {
  critica: { border: 'border-alert', dot: 'bg-alert', word: 'Crítica' },
  media: { border: 'border-warn', dot: 'bg-warn', word: 'Media' },
  baja: { border: 'border-line', dot: 'bg-ink-3', word: 'Baja' },
};

export function useTeacherClassroom() {
  const nav = useNavigate();
  const [classroom, setClassroom] = useState<{ classroomId: string; label: string } | null>(
    null,
  );
  const [gate, setGate] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('nativia.teacher');
    if (!raw) {
      nav('/profe');
      return;
    }
    const user = JSON.parse(raw);
    const c = user.classrooms?.[0];
    if (!c) {
      setGate('Todavía no tienes cursos asignados.');
      return;
    }
    setClassroom(c);
  }, [nav]);

  return { classroom, gate };
}

export function TeacherDashboardPage() {
  const nav = useNavigate();
  const { classroom, gate } = useTeacherClassroom();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classroom) return;
    api
      .get<Overview>(`/classrooms/${classroom.classroomId}/overview`)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.detail : 'Algo falló.'));
  }, [classroom]);

  const problem = gate ?? error;
  if (problem) return <ErrorState message={problem} onRetry={() => nav('/profe')} />;

  return (
    <TeacherShell classroomLabel={classroom?.label} computedAt={data?.computedAt}>
      {!data && <Skeleton className="h-64" />}

      {data && (
        <div className="space-y-8">
          {/* Nombres antes que números: el docente piensa en Juan y Elena,
              no en percentiles. */}
          <section>
            <SectionHead
              title="Necesitan tu ayuda hoy"
              count={data.needHelpToday.length > 0 ? `${data.needHelpToday.length}` : undefined}
            />

            {data.needHelpToday.length === 0 ? (
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-white p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-eje-b-soft text-eje-b">
                  <Icon name="check" size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold">Nadie necesita apoyo urgente hoy</p>
                  <p className="text-small text-ink-2">
                    Revisa la vista de grupo para ver cómo va cada estudiante.
                  </p>
                </div>
                <Button variant="secondary" onClick={() => nav('/profe/grupo')}>
                  Ver el grupo
                </Button>
              </div>
            ) : (
              <ul className="overflow-hidden rounded-lg border border-line bg-white">
                {data.needHelpToday.map((s) => (
                  <li key={s.studentProfileId} className="row">
                    <Avatar avatarKey={s.avatarKey} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-bold">{s.firstName}</p>
                      <p className="text-small text-ink-2">{s.reason}</p>
                      {s.signalConfidence === 'baja' && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-micro text-ink-3">
                          <Icon name="alert" size={14} />
                          Esto lo detectó el sistema automáticamente. Revísalo.
                        </p>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => nav(`/profe/estudiante/${s.studentProfileId}`)}
                    >
                      Ver ficha
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Extremos, no promedio: el promedio no sugiere ninguna acción. */}
          <section>
            <SectionHead title="Tu grupo esta semana" />
            <div className="space-y-5 rounded-lg border border-line bg-white p-5">
              {data.groupHighlights.best ? (
                <>
                  <Highlight label="Lo que mejor va" data={data.groupHighlights.best} tone="ok" />
                  <Highlight
                    label="Lo que peor va"
                    data={data.groupHighlights.worst!}
                    tone="warn"
                  />
                </>
              ) : (
                <p className="text-small text-ink-2">
                  Cuando tus estudiantes completen actividades, aquí verás en qué van mejor y en
                  qué necesitan apoyo.
                </p>
              )}
            </div>
          </section>

          <section>
            <SectionHead
              title="Alertas"
              count={data.alerts.length > 0 ? `${data.alerts.length}` : undefined}
            />
            {data.alerts.length === 0 ? (
              <p className="rounded-lg border border-line bg-white p-4 text-small text-ink-2">
                No hay alertas pendientes.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.alerts.map((a) => {
                  const sv = SEVERITY[a.severity] ?? SEVERITY.baja;
                  return (
                    <li
                      key={a.id}
                      className={`rounded-lg border-l-4 border-y border-r border-line bg-white p-4 ${sv.border}`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${sv.dot}`}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-body font-semibold">{a.message}</p>
                          <p className="text-micro text-ink-3">Severidad {sv.word.toLowerCase()}</p>
                          {/* El contenido sensible no se muestra en el listado: la
                              pantalla puede estar proyectada en el salón. */}
                          {a.isContentHidden && (
                            <p className="mt-1.5 flex items-center gap-1.5 text-small text-ink-2">
                              <Icon name="eye" size={16} />
                              El contenido está oculto. Ábrelo solo cuando estés en privado.
                            </p>
                          )}
                        </div>
                        <Button variant="secondary">{a.suggestedAction.label ?? 'Revisar'}</Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {data.moderationPending > 0 && (
            <section className="flex flex-wrap items-center gap-4 rounded-lg border-2 border-alert bg-white p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-eje-d-soft text-alert">
                <Icon name="shield" size={20} />
              </span>
              <p className="min-w-0 flex-1 text-body font-semibold">
                {data.moderationPending} conversación(es) esperan tu revisión
              </p>
              <Button variant="secondary">Revisar</Button>
            </section>
          )}
        </div>
      )}
    </TeacherShell>
  );
}

function Highlight({
  label,
  data,
  tone,
}: {
  label: string;
  data: { label: string; studentsAtLevel: number; totalStudents: number };
  tone: 'ok' | 'warn';
}) {
  const pct = data.totalStudents ? (data.studentsAtLevel / data.totalStudents) * 100 : 0;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-body">
          <span className="text-ink-2">{label}:</span> <strong>{data.label}</strong>
        </p>
        {/* El número absoluto acompaña SIEMPRE a la barra: un docente actúa
            sobre «6 de 32», no sobre «19 %». */}
        <p className="text-small text-ink-2">
          {data.studentsAtLevel} de {data.totalStudents} lo manejan
        </p>
      </div>
      <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-surf">
        <div
          className={`h-full ${tone === 'ok' ? 'bg-eje-b-mark' : 'bg-eje-c-mark'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
