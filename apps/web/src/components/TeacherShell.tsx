import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Mark } from './Logo';
import { Icon } from './Icon';
import { setToken } from '../lib/api';

/**
 * Marco del módulo docente.
 *
 * El principio 7 del design system dice que estudiante y docente comparten
 * tokens pero NO densidad: el módulo del niño es cálido y espacioso, el del
 * docente denso y eficiente. Hasta ahora los dos eran igual de aireados y
 * llevaban los mismos emoji, así que el panel abría ante un rector con ⚠ 📊 🛡.
 * §6 lo prohíbe de forma explícita en la interfaz estructural del docente.
 *
 * La barra fija la identidad institucional y la hora del último cálculo, que
 * §9 exige mostrar en pantalla: un docente que decide a quién atender necesita
 * saber si está mirando datos de hace un minuto o de ayer.
 */
export function TeacherShell({
  classroomLabel,
  computedAt,
  children,
}: {
  classroomLabel?: string;
  computedAt?: string;
  children: ReactNode;
}) {
  const nav = useNavigate();

  const tabs = [
    { to: '/profe/panel', label: 'Hoy', end: true },
    { to: '/profe/grupo', label: 'Grupo', end: false },
  ];

  return (
    <div className="min-h-screen bg-surf">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-6 py-3">
          <Mark className="h-7 w-7 shrink-0 text-brand" />
          <p className="text-body font-bold">
            Nativ<span className="text-brand">IA</span>
          </p>
          {classroomLabel && (
            <>
              <span aria-hidden className="text-line">
                |
              </span>
              <p className="text-body font-semibold text-ink-2">{classroomLabel}</p>
            </>
          )}

          <div className="flex-1" />

          {computedAt && (
            <p className="text-micro text-ink-3">
              Datos de las {new Date(computedAt).toLocaleTimeString('es-CO')}
            </p>
          )}

          <button
            onClick={() => {
              setToken(null);
              localStorage.removeItem('nativia.teacher');
              nav('/profe');
            }}
            className="flex min-h-touch items-center gap-2 rounded-sm px-3 text-small font-semibold text-ink-2 hover:bg-surf"
          >
            <Icon name="log-out" size={18} />
            Salir
          </button>
        </div>

        <nav className="mx-auto flex max-w-5xl gap-1 px-6">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `-mb-px border-b-2 px-4 py-2.5 text-small font-semibold transition-colors ${
                  isActive
                    ? 'border-brand text-brand'
                    : 'border-transparent text-ink-2 hover:text-ink'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">{children}</main>
    </div>
  );
}

/** Cabecera de sección del módulo docente. Un filete y una cifra a la derecha:
 *  cada bloque dice de cuántos habla, porque «3 estudiantes» y «3 de 32» piden
 *  acciones distintas. */
export function SectionHead({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
      <h2 className="text-body-lg font-bold">{title}</h2>
      {count && <p className="text-small text-ink-2">{count}</p>}
      {children}
    </div>
  );
}
