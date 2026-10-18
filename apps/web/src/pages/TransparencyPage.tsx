import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { StudentShell } from '../components/AppShell';
import { Skeleton } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';

interface Transparency {
  stored: Array<{ icon: string; what: string; why: string }>;
  neverStored: string[];
  whoCanSee: string[];
}

const ICONS: Record<string, IconName> = {
  user: 'user',
  target: 'target',
  message: 'message',
  pencil: 'pen',
};

/**
 * «¿Qué sabe NativIA de mí?» — requisito ético, no una función (US-10).
 *
 * Decirle al niño que su docente lee sus conversaciones ANTES de que lo
 * descubra es la diferencia entre transparencia y vigilancia.
 *
 * Las dos listas se oponen visualmente a propósito: lo que se guarda son filas
 * con explicación, lo que nunca se guarda son fichas tachadas. Un niño de 9
 * años tiene que poder ver la diferencia sin leer los encabezados.
 */
export function TransparencyPage() {
  const [data, setData] = useState<Transparency | null>(null);

  useEffect(() => {
    api.get<Transparency>('/me/transparency').then(setData).catch(() => {});
  }, []);

  const speech = data
    ? `Esto guarda NativIA de ti: ${data.stored.map((s) => s.what).join(', ')}. ` +
      `Esto nunca lo guarda: ${data.neverStored.join(', ')}. ${data.whoCanSee.join(' ')}`
    : '';

  return (
    <StudentShell back="/mapa" title="¿Qué sabe NativIA de mí?" readAloudText={speech}>
      <div className="mx-auto max-w-2xl px-6 py-8">
        {!data && <Skeleton className="h-64" />}

        {data && (
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-h2 font-bold text-ok">
                <Icon name="check-circle" size={24} />
                Lo que NativIA guarda
              </h2>
              <ul className="overflow-hidden rounded-lg border border-line">
                {data.stored.map((s) => (
                  <li key={s.what} className="row bg-white">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-eje-b-soft text-eje-b">
                      <Icon name={ICONS[s.icon] ?? 'check'} size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-semibold">{s.what}</p>
                      <p className="text-small text-ink-2">{s.why}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="mb-3 flex items-center gap-2 text-h2 font-bold text-alert">
                <Icon name="ban" size={24} />
                Lo que NativIA nunca guarda
              </h2>
              <ul className="flex flex-wrap gap-3">
                {data.neverStored.map((n) => (
                  <li
                    key={n}
                    className="flex items-center gap-2 rounded-full border-2 border-line bg-white px-4 py-2 text-body text-ink-2"
                  >
                    <Icon name="ban" size={18} className="text-alert" />
                    {n}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border-2 border-info bg-eje-a-soft p-5">
              <h2 className="mb-2 flex items-center gap-2 text-body-lg font-bold text-eje-a">
                <Icon name="eye" size={22} />
                Quién puede ver
              </h2>
              {data.whoCanSee.map((w) => (
                <p key={w} className="text-body">
                  {w}
                </p>
              ))}
            </section>

            <p className="text-center text-small text-ink-2">
              ¿Tienes dudas? Pregúntale a tu profe.
            </p>
          </div>
        )}
      </div>
    </StudentShell>
  );
}
