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
      {/* En celular queda solo el icono; el nombre sigue ahí para el lector de
          pantalla (`sr-only`). */}
      <button
        onClick={() => setAsking(true)}
        className="flex min-h-touch min-w-touch shrink-0 items-center justify-center gap-2 rounded-sm px-3 text-small font-semibold text-ink-2 transition-colors hover:bg-surf"
      >
        <Icon name="log-out" size={20} />
        <span className="sr-only md:not-sr-only">Salir</span>
      </button>

      {asking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 sm:p-6"
          onClick={() => setAsking(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-title"
            onClick={(e) => e.stopPropagation()}
            className="max-h-full w-full max-w-sm overflow-y-auto rounded-lg border border-line bg-white p-5 text-center sm:p-6"
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
 *  Barra inferior persistente; ninguna pantalla es un callejón sin salida.
 *
 *  La barra superior tiene dos formas:
 *
 *   · Desde tableta (≥ 640 px) todo va en una fila, como siempre.
 *   · En celular no cabe: seis botones con texto más el título se montaban
 *     unos sobre otros y la página se corría de lado. Ahí los botones quedan
 *     solo con icono (48 px, con su nombre para el lector de pantalla) y el
 *     título baja a una segunda fila, completo, junto a «Preguntar al profe»
 *     —que conserva su texto: es la salida hacia un adulto real y un niño
 *     tiene que poder leerla, no adivinar un icono (E-08).
 */
export function StudentShell({
  children,
  title,
  back,
  readAloudText,
  attemptId,
  hideBottomBar,
  fill,
}: {
  children: ReactNode;
  title?: string;
  back?: string;
  readAloudText?: string;
  attemptId?: string;
  hideBottomBar?: boolean;
  /** Pantalla de alto fijo: el contenido ocupa exactamente lo que queda bajo
   *  la barra y maneja su propio scroll. La usa el diálogo con el tutor. */
  fill?: boolean;
}) {
  const { student, online, a11y, setA11y } = useApp();
  const nav = useNavigate();
  const bigText = a11y.textScale !== 1;
  const secondRow = Boolean(title || attemptId);

  return (
    <div className={`flex flex-col bg-white ${fill ? 'screen-fixed' : 'screen'}`}>
      <header className="flex shrink-0 flex-wrap items-center gap-x-1 border-b border-line px-2 py-1.5 sm:gap-x-2 sm:px-4 sm:py-2.5">
        {back && (
          <button
            onClick={() => nav(back)}
            className="flex min-h-touch min-w-touch shrink-0 items-center justify-center gap-1.5 rounded-sm px-3 text-small font-semibold text-ink-2 hover:bg-surf"
          >
            <Icon name="arrow-left" size={18} />
            <span className="sr-only md:not-sr-only">Volver</span>
          </button>
        )}

        {/* En celular el nombre ocupa el espacio que sobre y se recorta con
            «…» si no cabe (`flex-1 basis-0`): así la primera fila nunca se
            parte, ni en un celular de 320 px. Con título en la barra (tableta),
            el nombre cede su sitio al título hasta pantallas anchas: el avatar
            ya dice de quién es la sesión. */}
        {student && (
          <div
            className={`flex min-w-0 flex-1 basis-0 items-center gap-2 sm:flex-none sm:basis-auto ${
              back ? '' : 'pl-2 sm:pl-0'
            }`}
          >
            <span className="shrink-0">
              <Avatar avatarKey={student.avatarKey} size="sm" />
            </span>
            <span className={`truncate text-small font-semibold ${title ? 'sm:hidden lg:inline' : ''}`}>
              {student.firstName}
              <span className={back ? 'hidden sm:inline' : ''}> · {student.grade}.º</span>
            </span>
          </div>
        )}

        {/* En celular, salto de línea: lo que sigue con `order-*` baja a la
            segunda fila. Desde tableta no existe. */}
        {secondRow && <span aria-hidden className="order-[9] basis-full sm:hidden" />}

        {title && (
          <h1 className="order-[10] line-clamp-2 min-w-0 flex-1 px-2 py-1.5 text-small font-bold sm:order-none sm:line-clamp-none sm:truncate sm:px-1 sm:py-0 sm:text-body">
            {title}
          </h1>
        )}
        {/* Empuja las acciones a la derecha. En celular lo hace el nombre del
            estudiante, que ya ocupa lo que sobra; en tableta, el título. En la
            segunda fila del celular, cuando no hay título, hace lo mismo con
            «Preguntar al profe». */}
        <div className={`flex-1 ${student ? 'hidden' : ''} ${title ? '' : 'sm:block'}`} />
        {secondRow && !title && <div className="order-[10] flex-1 sm:hidden" />}

        {/* Informativo, nunca bloqueante. */}
        {!online && (
          <span className="flex shrink-0 items-center gap-1.5 text-micro text-ink-3">
            <Icon name="wifi-off" size={16} />
            <span className="sr-only sm:not-sr-only">sin conexión</span>
          </span>
        )}

        <button
          onClick={() => setA11y({ textScale: bigText ? 1 : 1.25 })}
          aria-pressed={bigText}
          aria-label={bigText ? 'Volver al tamaño normal' : 'Agrandar el texto'}
          className={`flex min-h-touch min-w-touch shrink-0 items-center justify-center gap-1.5 rounded-sm px-3 text-small font-semibold hover:bg-surf ${
            bigText ? 'text-brand' : 'text-ink-2'
          }`}
          title={bigText ? 'Volver al tamaño normal' : 'Agrandar el texto'}
        >
          <Icon name="type" size={18} />
          <span className="hidden lg:inline">{bigText ? 'Normal' : 'Más grande'}</span>
        </button>

        {readAloudText && <ReadAloudButton text={readAloudText} compact />}

        {attemptId && (
          <AskTeacherButton
            className="order-[11] sm:order-none"
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

      {/* Con la barra inferior aparece también el botón flotante de Nati, que
          tapa la esquina derecha. El margen deja que lo último de la pantalla
          —el botón «Continuar» de la última tarjeta, por ejemplo— suba por
          encima de él. */}
      <main className={fill ? 'min-h-0 flex-1' : `flex-1 ${student && !hideBottomBar ? 'pb-20' : ''}`}>
        {children}
      </main>

      {/* Reservado: Nati, el asistente fijo en pantalla (components/nati). */}
      <NatiLauncher />

      {hideBottomBar ? (
        // Sin barra inferior, lo último de la pantalla es contenido: se aparta
        // de la barra de inicio de iOS. En el marco fijo lo hace el propio
        // contenido (el campo del chat).
        !fill && <div aria-hidden className="pb-safe shrink-0" />
      ) : (
        <nav className="sticky bottom-0 z-10 flex shrink-0 items-stretch justify-around border-t border-line bg-white px-1 pb-[calc(0.375rem+env(safe-area-inset-bottom))] pt-1.5">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `flex min-h-touch flex-auto flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-sm px-1 py-1.5 text-micro font-semibold transition-colors sm:flex-none sm:px-4 ${
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
