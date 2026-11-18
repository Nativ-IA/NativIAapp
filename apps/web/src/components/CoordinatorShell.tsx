import type { ReactNode } from 'react';
import { AdminButton, PanelShell } from './AdminShell';
import { Avatar } from './ui';
import { PIN_LABEL, PinSymbol } from './PinSymbols';
import { CONSENT_LABEL, fullName, type Consent, type StudentCredential } from '../lib/coordinacion';

/**
 * Marco del panel de coordinación de un colegio.
 *
 * La nota del pie dice lo que este panel NO muestra, igual que la Vista Rector
 * (docs/02, pantalla 20): que la limitación se vea deliberada.
 */
export function CoordinatorShell({ children }: { children: ReactNode }) {
  return (
    <PanelShell
      area="Coordinación"
      sessionKey="nativia.coordinator"
      loginPath="/profe"
      footer="Aquí ves la organización del colegio y cifras por curso. El avance y las conversaciones de cada estudiante los ve su docente titular. Abrir una alerta exige escribir el motivo, y cada cambio queda en la auditoría."
    >
      {children}
    </PanelShell>
  );
}

/** Estado de la autorización del acudiente. El texto lo dice todo; el punto
 *  de color solo acompaña. */
export function ConsentBadge({ consent }: { consent: Consent }) {
  const tone: Record<Consent, string> = {
    otorgado: 'bg-eje-b-soft text-ok',
    pendiente: 'bg-eje-c-soft text-warn',
    revocado: 'bg-surf text-alert',
  };
  const dot: Record<Consent, string> = {
    otorgado: 'bg-ok',
    pendiente: 'bg-warn',
    revocado: 'bg-alert',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-micro font-semibold ${tone[consent]}`}
    >
      <span aria-hidden className={`h-2 w-2 rounded-full ${dot[consent]}`} />
      {CONSENT_LABEL[consent]}
    </span>
  );
}

/**
 * Tarjetas de ingreso para entregar a cada niño: su animal, su nombre, el
 * código del curso y sus tres imágenes EN ORDEN. Salen una sola vez; se
 * imprimen y se recortan por la línea punteada.
 */
export function PinCards({
  credentials,
  classroomLabel,
  joinCode,
  onClose,
}: {
  credentials: StudentCredential[];
  classroomLabel: string;
  joinCode: string;
  onClose: () => void;
}) {
  const plural = credentials.length > 1;
  return (
    <section
      aria-label="Tarjetas de ingreso"
      className="rounded-md border-2 border-brand bg-brand-soft p-4 print:border-0 print:bg-white print:p-0"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-body font-bold">
            {plural ? `Tarjetas de ingreso (${credentials.length})` : 'Tarjeta de ingreso'}
          </p>
          <p className="text-small text-ink-2">
            Imprímelas ahora: las imágenes no se vuelven a mostrar. Si un niño olvida las suyas, dale
            un PIN nuevo.
          </p>
        </div>
        <AdminButton tone="primary" onClick={() => window.print()}>
          Imprimir
        </AdminButton>
        <AdminButton tone="ghost" onClick={onClose}>
          Listo
        </AdminButton>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2 print:gap-0">
        {credentials.map((c) => (
          <li
            key={c.id}
            className="break-inside-avoid rounded-md border-2 border-dashed border-line bg-white p-4 print:rounded-none"
          >
            <div className="flex items-center gap-3">
              <Avatar avatarKey={c.avatarKey} size="md" />
              <div className="min-w-0">
                <p className="truncate text-body font-bold">{fullName(c)}</p>
                <p className="text-micro text-ink-2">
                  {classroomLabel} · código{' '}
                  <span className="font-mono font-bold tracking-widest text-ink">{joinCode}</span>
                </p>
              </div>
            </div>
            <p className="mt-3 text-micro font-semibold text-ink-2">Tus imágenes, en este orden:</p>
            <ol className="mt-1 flex gap-2">
              {c.pin.map((p, i) => (
                <li
                  key={i}
                  className="flex flex-1 flex-col items-center rounded-sm border border-line px-1 py-2"
                >
                  <span className="text-micro font-bold text-ink-3">{i + 1}</span>
                  <PinSymbol symbol={p} size={44} />
                  <span className="text-micro text-ink-2">{PIN_LABEL[p]}</span>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ul>
    </section>
  );
}
