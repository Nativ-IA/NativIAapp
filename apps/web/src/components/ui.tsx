import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { forwardRef, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { Fauna, isFauna, FAUNA_LABEL } from './Fauna';
import { NatiMark } from './Emblem';

// ── Avatares ─────────────────────────────────────────────────────────────────
// Fauna colombiana ilustrada, NUNCA una fotografía del menor: minimización de
// datos y evitación de sesgos de representación corporal. Los dibujos están en
// Fauna.tsx, con el razonamiento de por qué no llevan colores naturales.

const AVATAR_PX = { sm: 32, md: 48, lg: 72 } as const;

export function Avatar({
  avatarKey,
  size = 'md',
  label,
}: {
  avatarKey: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}) {
  const px = AVATAR_PX[size];

  // Nati, el tutor, no es fauna: es el brote del símbolo de marca. Que NO se
  // vea como un animal más ayuda a que el niño lo distinga de sus compañeros y
  // recuerde que no es una persona.
  if (avatarKey === 'nati') {
    return <NatiMark size={px} title={label ?? 'Nati, tu tutor'} />;
  }

  if (isFauna(avatarKey)) {
    return <Fauna animal={avatarKey} size={px} title={label ?? FAUNA_LABEL[avatarKey]} />;
  }

  return <NatiMark size={px} title={label ?? 'avatar'} />;
}

// ── Button ───────────────────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Color del relleno. `brand` es el neutro del producto y el valor por
   *  defecto; los códigos de eje se pasan SOLO cuando la acción pertenece a un
   *  eje concreto. Antes el defecto era el verde del eje B, así que «Entrar» en
   *  la pantalla de acceso salía con el color de «Piensa con la IA» — un color
   *  que en este producto significa algo. */
  axis?: 'a' | 'b' | 'c' | 'd' | 'brand';
  /** Un botón deshabilitado SIEMPRE explica por qué: un botón gris sin
   *  explicación es un callejón sin salida para un niño. */
  disabledReason?: string;
  full?: boolean;
}

/** Reenvía la ref al `<button>` real: hay diálogos que necesitan poner el foco
 *  en un botón concreto al abrirse. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    axis = 'brand',
    disabledReason,
    full,
    children,
    className = '',
    ...props
  },
  ref,
) {
  // Se usa el tono `strong`, nunca `-mark`: los colores de gráfico no alcanzan
  // 4,5:1 con texto blanco encima. `brand` (#007895) está a 5,10:1.
  const axisBg = {
    a: 'bg-eje-a',
    b: 'bg-eje-b',
    c: 'bg-eje-c',
    d: 'bg-eje-d',
    brand: 'bg-brand',
  }[axis];

  const styles: Record<Variant, string> = {
    primary: `${axisBg} text-white font-bold hover:brightness-110 active:brightness-95`,
    secondary: 'border-2 border-line bg-white text-ink font-semibold hover:border-ink-3 hover:bg-surf',
    ghost: 'text-ink-2 font-semibold hover:bg-surf',
  };

  return (
    <div className={full ? 'w-full' : 'inline-block'}>
      <button
        {...props}
        ref={ref}
        className={`min-h-touch-lg rounded-md px-8 text-body-lg transition-[filter,background-color,border-color] duration-150
          disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:brightness-100
          ${styles[variant]} ${full ? 'w-full' : ''} ${className}`}
      >
        {children}
      </button>
      {props.disabled && disabledReason && (
        <p className="mt-2 text-small text-ink-3">{disabledReason}</p>
      )}
    </div>
  );
});

// ── Progreso por puntos ──────────────────────────────────────────────────────
// Puntos y no porcentaje: los porcentajes son abstractos a los 8 años.

export function ProgressDots({ completed, total }: { completed: number; total: number }) {
  return (
    <span
      className="inline-flex gap-1.5"
      role="img"
      aria-label={`${completed} de ${total} completadas`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className={`h-2.5 w-2.5 rounded-full ${
            i < completed ? 'bg-current' : 'border-2 border-line bg-transparent'
          }`}
        />
      ))}
    </span>
  );
}

export function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div
      className="h-3 w-full overflow-hidden rounded-full bg-line"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`${value} de ${total}`}
    >
      <div className="h-full bg-eje-b transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Lectura en voz alta ──────────────────────────────────────────────────────
// Probablemente la función de accesibilidad de mayor impacto real: buena parte
// del grupo objetivo lee con dificultad. Sin costo y sin conexión.

export function ReadAloudButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  if (!supported) return null;

  function toggle() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-CO';
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  }

  return (
    <button
      onClick={toggle}
      className={`flex min-h-touch min-w-touch items-center gap-2 rounded-sm px-3 text-small font-semibold transition-colors hover:bg-surf ${
        speaking ? 'text-brand' : 'text-ink-2'
      }`}
      aria-label={speaking ? 'Detener la lectura' : 'Escuchar esta pantalla'}
    >
      <Icon name={speaking ? 'volume-off' : 'volume'} size={20} />
      <span>{speaking ? 'Detener' : 'Escuchar'}</span>
    </button>
  );
}

// ── Botón «Preguntar al profe» ───────────────────────────────────────────────
// Escapatoria a un adulto real, visible en toda pantalla del estudiante (E-08).

export function AskTeacherButton({ onAsk }: { onAsk?: () => void }) {
  const [sent, setSent] = useState(false);
  return (
    <button
      onClick={() => {
        onAsk?.();
        setSent(true);
      }}
      className={`flex min-h-touch items-center gap-2 rounded-sm px-3 text-small font-semibold transition-colors hover:bg-surf ${
        sent ? 'text-ok' : 'text-ink-2'
      }`}
    >
      <Icon name={sent ? 'check' : 'hand'} size={20} />
      <span>{sent ? 'Tu profe ya sabe' : 'Preguntar al profe'}</span>
    </button>
  );
}

// ── Estados vacíos y de error ────────────────────────────────────────────────

/** Una pantalla vacía es una invitación a actuar, no un adorno: por eso el
 *  icono es discreto y el texto dice qué va a pasar aquí. */
export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: IconName;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surf text-ink-3">
        <Icon name={icon} size={26} />
      </span>
      <p className="text-body-lg font-bold">{title}</p>
      {hint && <p className="max-w-sm text-body text-ink-2">{hint}</p>}
    </div>
  );
}

/** Ningún mensaje de error culpa al niño ni usa vocabulario técnico, y todos
 *  afirman que su progreso está a salvo: es el temor real a esa edad. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-eje-c-soft text-eje-c">
        <Icon name="alert" size={26} />
      </span>
      <p className="text-body">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Intentar otra vez
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surf ${className}`} aria-hidden />;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}
