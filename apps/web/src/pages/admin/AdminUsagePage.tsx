// Consumo de IA del mes, por colegio. Cifras del tutor, nunca conversaciones.

import { Link } from 'react-router-dom';
import { fmt, fmtUsd, useAdminQuery, type SchoolsResponse } from '../../lib/admin';
import { AdminSectionHead, AdminShell, Stat, TableWrap, td, th } from '../../components/AdminShell';
import { ErrorState, Skeleton } from '../../components/ui';
import { Icon } from '../../components/Icon';

export function AdminUsagePage() {
  const { data, error, reload } = useAdminQuery<SchoolsResponse>('/admin/schools');
  const mes = new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  const rows = data
    ? [...data.schools].sort(
        (a, b) =>
          b.month.inputTokens + b.month.outputTokens - (a.month.inputTokens + a.month.outputTokens),
      )
    : [];

  return (
    <AdminShell>
      {error && <ErrorState message={error} onRetry={reload} />}
      {!data && !error && <Skeleton className="h-64" />}

      {data && (
        <div className="flex flex-col gap-8">
          <section aria-label={`Consumo de ${mes}`}>
            <p className="mb-3 text-small text-ink-2">Consumo de {mes}</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Stat label="Conversaciones" value={fmt(data.totals.month.interactions)} />
              <Stat label="Tokens de entrada" value={fmt(data.totals.month.inputTokens)} />
              <Stat label="Tokens de salida" value={fmt(data.totals.month.outputTokens)} />
              <Stat
                label="Costo estimado"
                value={fmtUsd(data.totals.month.estimatedCostUsd)}
                hint={data.pricingConfigured ? 'según la tarifa configurada' : 'sin tarifa'}
              />
              <Stat
                label="Presupuestos agotados"
                value={fmt(data.totals.month.exhaustedBudgets)}
                hint="estudiantes en modo sin IA"
              />
            </div>

            {!data.pricingConfigured && (
              <p className="mt-3 flex items-start gap-2 text-micro text-ink-3">
                <Icon name="info" size={16} />
                Para ver el costo, configura en Cloud Run PRECIO_USD_MTOK_ENTRADA y
                PRECIO_USD_MTOK_SALIDA con la tarifa vigente del modelo, en dólares por millón de
                tokens.
              </p>
            )}
          </section>

          <section>
            <AdminSectionHead title="Por colegio" count="de mayor a menor consumo" />
            <TableWrap>
              <thead>
                <tr>
                  <th className={th}>Colegio</th>
                  <th className={`${th} text-right`}>Estudiantes</th>
                  <th className={`${th} text-right`}>Conversaciones</th>
                  <th className={`${th} text-right`}>Tokens entrada</th>
                  <th className={`${th} text-right`}>Tokens salida</th>
                  <th className={`${th} text-right`}>Costo estimado</th>
                  <th className={`${th} text-right`}>Presupuestos agotados</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-surf">
                    <td className={td}>
                      <Link
                        to={`/admin/colegios/${s.id}`}
                        className="font-semibold text-brand underline-offset-2 hover:underline"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{fmt(s.students)}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmt(s.month.interactions)}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmt(s.month.inputTokens)}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmt(s.month.outputTokens)}</td>
                    <td className={`${td} text-right tabular-nums`}>
                      {fmtUsd(s.month.estimatedCostUsd)}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>
                      {fmt(s.month.exhaustedBudgets)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
