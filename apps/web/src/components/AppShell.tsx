import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../lib/store';
import { Avatar, Button, ReadAloudButton, AskTeacherButton } from './ui';
import { Icon, type IconName } from './Icon';
import { api } from '../lib/api';
import { NatiLauncher } from './nati/NatiLauncher';

const TABS: Array<{ to: string; label: string; icon: IconName }> = [
  { to: '/mapa', label: 'Mapa', icon: 'map' },
  { to: '/logros', label: 'Mis logros', icon: 'award' },
  { to: '/transparencia', label: '¿Qué sabe de mí?', icon: 'lock' },
];

/**
 * Salida del estudiante.
 *
 * Faltaba por completo: `logout()` existía en el store desde el principio y no
 * lo llamaba nadie, así que la sesión se quedaba en el equipo para siempre.
 * En un salón donde la tableta pasa de un niño al siguiente, eso significa que
 * el siguiente entra como el anterior — lee sus conversaciones con el tutor y
 * lo que escribió sobre sí mismo, y todo lo que haga se le atribuye a otro.
 *
 * Lleva confirmación por una razón concreta de la edad: el miedo de un niño de
 * 8 años al pulsar algo que no entiende es perder su trabajo. La pregunta lo
 * dice antes de que pueda preocuparse, y el foco arranca en «seguir aquí», que
 * es la opción que no rompe nada.
 */
function ExitButton({ firstName }: { firstName: string }) {
  const [asking, setAsking] = useState(false);
  const logout = useApp((s) => s.logout);
  const nav = useNavigate();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!asking) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAsking(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [asking]);

  return (
    <>
      <button
        onClick={() => setAsking(true)}
        className="flex min-h-touch items-center gap-2 rounded-sm px-3 text-small font-semibold text-ink-2 transition-colors hover:bg-surf"
      >
        <Icon name="log-out" size={20} />
        Salir
      </button>

      {asking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6"
          onClick={() => setAsking(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg border border-line bg-white p-6 text-center"
          >
            <h2 id="exit-title" className="text-h2 font-bold">
              ¿Ya terminaste, {firstName}?
            </h2>
            {/* La frase que de verdad importa. Sin ella, un niño no toca el
                botón por miedo, o lo toca y se angustia. */}
            <p className="mt-2 text-body text-ink-2">
              Tu avance está guardado. Puedes volver a entrar cuando quieras.
            </p>

            <div className="mt-6 space-y-3">
              {/* A la portada, no a «¿Cuál eres tú?». Salir tiene que devolver
                  al punto donde se elige entre estudiante y profe: si soltara
                  en la lista de avatares del curso, el docente que recoge la
                  tableta no tendría desde dónde entrar a su panel. */}
              <Button
                full
                onClick={() => {
                  logout();
                  nav('/');
                }}
              >
                Sí, salir
              </Button>
              <Button ref={cancelRef} full variant="secondary" onClick={() => setAsking(false)}>
                No, seguir aquí
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Marco del módulo estudiante.
 *  Barra inferior persistente; ninguna pantalla es un callejón sin salida. */
export function StudentShell({
  children,
  title,
  back,
  readAloudText,
  attemptId,
  hideBottomBar,
}: {
  children: ReactNode;
  title?: string;
  back?: string;
  readAloudText?: string;
  attemptId?: string;
  hideBottomBar?: boolean;
}) {
  const { student, online, a11y, setA11y } = useApp();
  const nav = useNavigate();
  const bigText = a11y.textScale !== 1;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        {back && (
          <button
            onClick={() => nav(back)}
            className="flex min-h-touch items-center gap-1.5 rounded-sm px-3 text-small font-semibold text-ink-2 hover:bg-surf"
          >
            <Icon name="arrow-left" size={18} />
            Volver
          </button>
        )}

        {student && (
          <div className="flex items-center gap-2">
            <Avatar avatarKey={student.avatarKey} size="sm" />
            <span className="text-small font-semibold">
              {student.firstName} · {student.grade}.º
            </span>
          </div>
        )}

        {title && <h1 className="min-w-0 flex-1 truncate text-body font-bold">{title}</h1>}
        <div className="flex-1" />

        {/* Informativo, nunca bloqueante. */}
        {!online && (
          <span className="flex items-center gap-1.5 text-micro text-ink-3">
            <Icon name="wifi-off" size={16} />
            sin conexión
          </span>
        )}

        <button
          onClick={() => setA11y({ textScale: bigText ? 1 : 1.25 })}
          aria-pressed={bigText}
          className={`flex min-h-touch min-w-touch items-center gap-1.5 rounded-sm px-3 text-small font-semibold hover:bg-surf ${
            bigText ? 'text-brand' : 'text-ink-2'
          }`}
          title={bigText ? 'Volver al tamaño normal' : 'Agrandar el texto'}
        >
          <Icon name="type" size={18} />
          {bigText ? 'Normal' : 'Más grande'}
        </button>

        {readAloudText && <ReadAloudButton text={readAloudText} />}

        {attemptId && (
          <AskTeacherButton
            onAsk={() => {
              api.post('/tutor/ask-teacher', { attemptId }).catch(() => {});
            }}
          />
        )}

        {/* Última posición de la barra, igual que en el panel docente: salir es
            la acción menos frecuente y no debe competir con «Preguntar al
            profe», que es la escapatoria a un adulto real y tiene que estar
            siempre a la vista (E-08). */}
        {student && <ExitButton firstName={student.firstName} />}
      </header>

      <main className="flex-1">{children}</main>

      {/* Reservado: Nati, el asistente fijo en pantalla (components/nati). */}
      <NatiLauncher />

      {!hideBottomBar && (
        <nav className="sticky bottom-0 flex items-center justify-around border-t border-line bg-white py-1.5">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `flex min-h-touch flex-col items-center gap-0.5 rounded-sm px-4 py-1.5 text-micro font-semibold transition-colors ${
                  isActive ? 'text-brand' : 'text-ink-2 hover:bg-surf'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={t.icon} size={22} />
                  <span className={isActive ? 'font-bold' : ''}>{t.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
