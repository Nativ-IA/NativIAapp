// Auditoría: quién hizo qué, cuándo y en qué colegio. Nunca el contenido.

import { ACTION_LABEL, fmtDate, ROLE_LABEL, useAdminQuery, type AuditEntry } from '../../lib/admin';
import { AdminSectionHead, AdminShell, TableWrap, td, th } from '../../components/AdminShell';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui';

export function AdminAuditPage() {
  const { data, error, reload } = useAdminQuery<{ entries: AuditEntry[] }>('/admin/audit?limit=100');

  return (
    <AdminShell>
      {error && <ErrorState message={error} onRetry={reload} />}
      {!data && !error && <Skeleton className="h-64" />}

      {data && (
        <section>
          <AdminSectionHead title="Auditoría" count={`últimas ${data.entries.length} acciones`} />
          {data.entries.length === 0 ? (
            <EmptyState
              icon="shield"
              title="Todavía no hay acciones registradas"
              hint="Aquí aparece cada cambio del panel y cada vez que un adulto abre una transcripción."
            />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th className={th}>Cuándo</th>
                  <th className={th}>Quién</th>
                  <th className={th}>Qué</th>
                  <th className={th}>Colegio</th>
                  <th className={th}>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr key={e.id}>
                    <td className={`${td} whitespace-nowrap tabular-nums`}>{fmtDate(e.occurredAt)}</td>
                    <td className={td}>
                      {e.actor ? (
                        <>
                          <p className="font-semibold">{e.actor.name}</p>
                          <p className="text-micro text-ink-3">
                            {ROLE_LABEL[e.actor.role] ?? e.actor.role}
                          </p>
                        </>
                      ) : (
                        <span className="text-ink-3">Sistema</span>
                      )}
                    </td>
                    <td className={td}>{ACTION_LABEL[e.action] ?? e.action}</td>
                    <td className={td}>{e.school ?? <span className="text-ink-3">—</span>}</td>
                    <td className={td}>{e.reason ?? <span className="text-ink-3">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </section>
      )}
    </AdminShell>
  );
}
