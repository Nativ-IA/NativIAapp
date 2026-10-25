import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Mark } from './Logo';
import { Icon, type IconName } from './Icon';
import { setToken } from '../lib/api';

/**
 * Marco del panel de administración del equipo NativIA.
 *
 * Misma densidad que el módulo docente (principio 7 del design system): es
 * una herramienta de trabajo, no una pantalla para niños. La nota del pie
 * recuerda la regla del panel: aquí no hay datos de los estudiantes.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const raw = localStorage.getItem('nativia.admin');
  const admin = raw ? (JSON.parse(raw) as { firstName: string; lastName: string }) : null;

  // «Colegios» sigue marcada dentro del detalle de un colegio.
  const tabs = [
    { to: '/admin', label: 'Colegios', active: pathname === '/admin' || pathname.startsWith('/admin/colegios') },
    { to: '/admin/consumo', label: 'Consumo de IA', active: pathname.startsWith('/admin/consumo') },
    { to: '/admin/auditoria', label: 'Auditoría', active: pathname.startsWith('/admin/auditoria') },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-surf">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-6 py-3">
          <Mark className="h-7 w-7 shrink-0 text-brand" />
          <p className="text-body font-bold">
            Nativ<span className="text-brand">IA</span>
          </p>
          <span aria-hidden className="text-line">
            |
          </span>
          <p className="text-body font-semibold text-ink-2">Plataforma</p>

          <div className="flex-1" />

          {admin && (
            <p className="hidden text-micro text-ink-3 sm:block">
              {admin.firstName} {admin.lastName}
            </p>
          )}
          <button
            onClick={() => {
              setToken(null);
              localStorage.removeItem('nativia.admin');
              nav('/admin/entrar');
            }}
            className="flex min-h-touch items-center gap-2 rounded-sm px-3 text-small font-semibold text-ink-2 hover:bg-surf"
          >
            <Icon name="log-out" size={18} />
            Salir
          </button>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              aria-current={t.active ? 'page' : undefined}
              className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-small font-semibold transition-colors ${
                t.active ? 'border-brand text-brand' : 'border-transparent text-ink-2 hover:text-ink'
              }`}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">{children}</main>

      <footer className="mx-auto flex w-full max-w-6xl items-center gap-2 px-6 pb-6 text-micro text-ink-3">
        <Icon name="shield" size={16} />
        Este panel no muestra nombres ni trabajo de los estudiantes, solo cifras. Cada cambio queda
        en la auditoría.
      </footer>
    </div>
  );
}

type Tone = 'primary' | 'secondary' | 'ghost' | 'danger';

/** Botón compacto del panel. El Button del módulo estudiante mide 56 px de
 *  alto: en una tabla de cuentas eso no cabe. */
export function AdminButton({
  tone = 'secondary',
  icon,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; icon?: IconName }) {
  const styles: Record<Tone, string> = {
    primary: 'bg-brand text-white hover:brightness-110',
    secondary: 'border-2 border-line bg-white text-ink hover:border-ink-3',
    ghost: 'text-ink-2 hover:bg-surf',
    danger: 'border-2 border-line bg-white text-alert hover:border-alert',
  };
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-touch items-center gap-2 rounded-sm px-4 text-small font-semibold transition-[filter,border-color,background-color] disabled:cursor-not-allowed disabled:opacity-60 ${styles[tone]} ${className}`}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

export const fieldClass =
  'mt-1 min-h-touch w-full rounded-sm border-2 border-line bg-white px-3 text-small transition-colors focus:border-brand';

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="block text-small font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-micro text-ink-3">{hint}</p>}
    </div>
  );
}

/** Cifra grande con su etiqueta, para la fila de resumen. */
export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-line bg-white px-4 py-3">
      <p className="text-micro text-ink-2">{label}</p>
      <p className="mt-0.5 text-h2 font-bold tabular-nums">{value}</p>
      {hint && <p className="text-micro text-ink-3">{hint}</p>}
    </div>
  );
}

/** Muestra una contraseña temporal UNA vez, con botón para copiarla. */
export function SecretReveal({
  who,
  secret,
  onClose,
}: {
  who: string;
  secret: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-md border-2 border-brand bg-brand-soft px-4 py-3"
    >
      <div className="min-w-0 flex-1">
        <p className="text-small font-semibold">Contraseña temporal de {who}</p>
        <p className="mt-1 select-all break-all font-mono text-body-lg font-bold tracking-wide">
          {secret}
        </p>
        <p className="text-micro text-ink-2">
          Cópiala y entrégala ahora: no se vuelve a mostrar.
        </p>
      </div>
      <AdminButton
        icon={copied ? 'check' : undefined}
        onClick={() => {
          navigator.clipboard
            ?.writeText(secret)
            .then(() => setCopied(true))
            .catch(() => setCopied(false));
        }}
      >
        {copied ? 'Copiada' : 'Copiar'}
      </AdminButton>
      <AdminButton tone="ghost" onClick={onClose}>
        Listo
      </AdminButton>
    </div>
  );
}

/** Contenedor de tabla con desplazamiento propio: la página nunca se corre de
 *  lado en un celular. */
export function TableWrap({ children }: { children: ReactNode }) {
  return (
    // `relative` contiene a los elementos ocultos para lectores de pantalla
    // (sr-only, posición absoluta): sin él estiran la página a lo ancho.
    <div className="relative overflow-x-auto rounded-md border border-line bg-white">
      <table className="w-full min-w-[640px] border-collapse text-left text-small">{children}</table>
    </div>
  );
}

export const th = 'border-b border-line bg-surf px-4 py-2.5 text-micro font-semibold text-ink-2';
export const td = 'border-b border-line px-4 py-3 align-middle';

/** Cabecera de sección del panel: título y cifra juntos a la izquierda, la
 *  acción a la derecha. */
export function AdminSectionHead({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-body-lg font-bold">{title}</h2>
        {count && <p className="text-small text-ink-2">{count}</p>}
      </div>
      {children}
    </div>
  );
}
