import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useApp } from '../lib/store';
import { Avatar, Button, ErrorState, ReadAloudButton, Skeleton } from '../components/ui';
import { Icon } from '../components/Icon';
import { PinSymbol, PIN_KEYS, PIN_LABEL, type PinKey } from '../components/PinSymbols';

interface StudentOption {
  studentProfileId: string;
  firstName: string;
  lastName: string;
  avatarKey: string;
  requiresPin: boolean;
}

export function AvatarPage() {
  const nav = useNavigate();
  const { joinCode, setStudent } = useApp();
  const [students, setStudents] = useState<StudentOption[] | null>(null);
  const [chosen, setChosen] = useState<StudentOption | null>(null);
  const [pin, setPin] = useState<PinKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [teacher, setTeacher] = useState('');

  useEffect(() => {
    if (!joinCode) {
      nav('/');
      return;
    }
    api
      .get<{ classroom: { teacherDisplayName: string }; students: StudentOption[] }>(
        `/auth/classroom/${joinCode}`,
      )
      .then((r) => {
        setStudents(r.students);
        setTeacher(r.classroom.teacherDisplayName ?? '');
      })
      .catch((e) => setError(e instanceof ApiError ? e.detail : 'Algo falló.'));
  }, [joinCode, nav]);

  async function login(pinValue: PinKey[]) {
    if (!chosen || !joinCode) return;
    setError(null);
    try {
      const res = await api.post<{
        accessToken: string;
        student: { studentProfileId: string; firstName: string; avatarKey: string; grade: number };
      }>('/auth/student', {
        joinCode,
        studentProfileId: chosen.studentProfileId,
        graphicPin: pinValue,
      });
      setStudent(res.student, res.accessToken);
      nav('/mapa');
    } catch (e) {
      setPin([]);
      setError(e instanceof ApiError ? e.detail : 'No pudimos entrar.');
    }
  }

  if (error && !students) return <ErrorState message={error} onRetry={() => nav('/')} />;

  if (!students) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    );
  }

  // ── Paso 2: PIN gráfico ────────────────────────────────────────────────────
  if (chosen) {
    return (
      <div className="min-h-screen bg-surf">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <button
            onClick={() => {
              setChosen(null);
              setPin([]);
              setError(null);
            }}
            className="mb-6 flex min-h-touch items-center gap-2 rounded-sm px-3 text-small font-semibold text-ink-2 hover:bg-white"
          >
            <Icon name="arrow-left" size={18} />
            Volver
          </button>

          <div className="rounded-lg border border-line bg-white px-6 py-8 text-center">
            <div className="flex justify-center">
              <Avatar avatarKey={chosen.avatarKey} size="lg" />
            </div>
            <h1 className="mt-4 text-h1 font-bold">Hola, {chosen.firstName}</h1>
            <p className="mt-1 text-body-lg text-ink-2">
              Toca tus 3 imágenes secretas, en orden.
            </p>

            {/* Las casillas se llenan de izquierda a derecha: el niño ve cuántas
                lleva sin tener que contar. */}
            <div className="mt-6 flex justify-center gap-3" aria-live="polite">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`flex h-16 w-16 items-center justify-center rounded-md border-2 ${
                    pin[i] ? 'border-eje-b bg-eje-b-soft' : 'border-dashed border-line'
                  }`}
                >
                  {pin[i] ? (
                    <PinSymbol symbol={pin[i]} size={40} />
                  ) : (
                    <span className="text-h2 font-bold text-line" aria-hidden>
                      {i + 1}
                    </span>
                  )}
                </span>
              ))}
            </div>

            <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
              {PIN_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    const next = [...pin, key];
                    setPin(next);
                    if (next.length === 3) login(next);
                  }}
                  disabled={pin.length >= 3}
                  aria-label={PIN_LABEL[key]}
                  className="flex min-h-[96px] items-center justify-center rounded-md border-2 border-line transition-colors hover:border-eje-b hover:bg-eje-b-soft disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-transparent"
                >
                  <PinSymbol symbol={key} size={56} />
                </button>
              ))}
            </div>

            {error && (
              <p role="alert" className="mt-5 text-body text-alert">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-center">
              <Button variant="secondary" onClick={() => setPin([])}>
                Empezar de nuevo
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Paso 1: elegir avatar ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surf">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-small text-ink-2">{teacher && `Prof. ${teacher}`}</p>
          <ReadAloudButton text="¿Cuál eres tú? Toca tu animal." />
        </div>

        <h1 className="mt-4 text-center text-h1 font-bold">¿Cuál eres tú?</h1>
        <p className="mt-1 text-center text-body text-ink-2">Toca tu animal.</p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {students.map((s) => (
            <button
              key={s.studentProfileId}
              onClick={() => setChosen(s)}
              className="flex min-h-[136px] flex-col items-center justify-center gap-3 rounded-lg border border-line bg-white p-4 transition-colors hover:border-eje-b hover:bg-eje-b-soft"
            >
              <Avatar avatarKey={s.avatarKey} size="lg" label={s.firstName} />
              <span className="text-body font-bold">{s.firstName}</span>
            </button>
          ))}
        </div>

        <p className="mt-8 text-center text-small text-ink-2">
          ¿No te encuentras? Avísale a tu profe.
        </p>
      </div>
    </div>
  );
}
