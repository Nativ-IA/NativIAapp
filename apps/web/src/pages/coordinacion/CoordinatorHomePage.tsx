// Coordinación: el colegio de un vistazo. Qué necesita atención, cifras por
// curso y el equipo docente. Ningún dato del trabajo de un niño.

import { Link } from 'react-router-dom';
import { fmt, fmtDate, ROLE_LABEL, SECTOR_LABEL, SHIFT_LABEL, ASSIGNMENT_LABEL } from '../../lib/admin';
import { useSchoolQuery, type SchoolOverview } from '../../lib/coordinacion';
import { AdminSectionHead, Stat, TableWrap, td, th } from '../../components/AdminShell';
import { CoordinatorShell } from '../../components/CoordinatorShell';
import { ErrorState, Skeleton } from '../../components/ui';
import { Icon, type IconName } from '../../components/Icon';

type Classroom = SchoolOverview['classrooms'][number];

/** Lo que coordinación tiene que resolver en cada curso. Cada línea lleva al
 *  curso donde se resuelve. */
function pendientes(c: Classroom): Array<{ icon: IconName; text: string; tone: string }> {
  const out: Array<{ icon: IconName; text: string; tone: string }> = [];
  if (c.openAlerts.critica > 0) {
    out.push({
      icon: 'alert',
      tone: 'text-alert',
      text:
        c.openAlerts.critica === 1
          ? '1 alerta crítica abierta'
          : `${c.openAlerts.critica} alertas críticas abiertas`,
    });
  }
  if (!c.staff.some((s) => s.role === 'titular')) {
    out.push({ icon: 'user', tone: 'text-warn', text: 'Sin docente titular' });
  }
  const sin = c.pending + c.revoked;
  if (sin > 0) {
    out.push({
      icon: 'lock',
      tone: 'text-warn',
      text:
        sin === 1
          ? '1 estudiante sin autorización: no puede entrar'
          : `${sin} estudiantes sin autorización: no pueden entrar`,
    });
  }
  return out;
}

export function CoordinatorHomePage() {
  const { data, error, reload } = useSchoolQuery<SchoolOverview>('/school');

  const porAtender = data
    ? data.classrooms.map((c) => ({ c, items: pendientes(c) })).filter((x) => x.items.length > 0)
    : [];

  return (
    <CoordinatorShell>
      {error && <ErrorState message={error} onRetry={reload} />}
      {!data && !error && <Skeleton className="h-64" />}

      {data && (
        <div className="flex flex-col gap-8">
          <header>
            <h1 className="text-h1 font-extrabold">{data.school.name}</h1>
            <p className="mt-1 text-small text-ink-2">
              {SECTOR_LABEL[data.school.sector] ?? data.school.sector} · {data.school.city}
              {data.school.daneCode ? ` · DANE ${data.school.daneCode}` : ''}
            </p>
          </header>

          <section aria-label="Resumen">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <Stat label="Cursos" value={fmt(data.totals.classrooms)} />
              <Stat label="Estudiantes" value={fmt(data.totals.students)} />
              <Stat
                label="Con autorización"
                value={fmt(data.totals.authorized)}
                hint={`de ${fmt(data.totals.students)}`}
              />
              <Stat label="Docentes" value={fmt(data.totals.teachers)} />
              <Stat
                label="Trabajaron esta semana"
                value={fmt(data.totals.activeLast7Days)}
                hint="estudiantes"
              />
              <Stat
                label="Actividades terminadas"
                value={fmt(data.totals.completedThisMonth)}
                hint="este mes"
              />
            </div>
          </section>

          <section>
            <AdminSectionHead
              title="Por atender"
              count={porAtender.length === 0 ? 'todo al día' : undefined}
            />
            {porAtender.length === 0 ? (
              <p className="flex items-center gap-2 text-small text-ink-2">
                <Icon name="check-circle" size={18} className="text-ok" />
                Todos los cursos tienen docente titular y sus estudiantes tienen autorización.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {porAtender.map(({ c, items }) => (
                  <li key={c.id}>
                    <Link
                      to={`/coordinacion/cursos/${c.id}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-line bg-white px-4 py-3 transition-colors hover:border-ink-3"
                    >
                      <span className="w-14 shrink-0 text-body font-bold">{c.label}</span>
                      {/* En el celular, los pendientes bajan a su propia línea. */}
                      <span className="order-last flex w-full flex-col gap-1 sm:order-none sm:w-auto sm:min-w-0 sm:flex-1 sm:flex-row sm:flex-wrap sm:gap-x-5">
                        {items.map((it) => (
                          <span key={it.text} className="flex items-center gap-1.5 text-small">
                            <Icon name={it.icon} size={16} className={it.tone} />
                            {it.text}
                          </span>
                        ))}
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-small font-semibold text-brand">
                        Ver curso
                        <Icon name="chevron-right" size={16} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <AdminSectionHead title="Cursos" count={`${data.classrooms.length}`} />
            <TableWrap>
              <thead>
                <tr>
                  <th className={th}>Curso</th>
                  <th className={th}>Docentes</th>
                  <th className={`${th} text-right`}>Estudiantes</th>
                  <th className={th}>Autorizaciones</th>
                  <th className={`${th} text-right`}>Trabajaron esta semana</th>
                  <th className={`${th} text-right`}>Alertas abiertas</th>
                  <th className={th}>Código</th>
                </tr>
              </thead>
              <tbody>
                {data.classrooms.map((c) => {
                  const alertas = c.openAlerts.critica + c.openAlerts.media + c.openAlerts.baja;
                  const pct = c.students ? Math.round((c.authorized / c.students) * 100) : 0;
                  return (
                    <tr key={c.id} className="hover:bg-surf">
                      <td className={td}>
                        <Link
                          to={`/coordinacion/cursos/${c.id}`}
                          className="font-semibold text-brand underline-offset-2 hover:underline"
                        >
                          {c.label}
                        </Link>
                        <p className="whitespace-nowrap text-micro text-ink-3">
                          {c.campusName} · {SHIFT_LABEL[c.shift] ?? c.shift}
                        </p>
                      </td>
                      <td className={td}>
                        {c.staff.length === 0 ? (
                          <span className="text-warn">Sin asignar</span>
                        ) : (
                          c.staff.map((s) => (
                            <p key={s.userId + s.role} className="whitespace-nowrap">
                              {s.name}{' '}
                              <span className="text-micro text-ink-3">
                                {ASSIGNMENT_LABEL[s.role] ?? s.role}
                              </span>
                            </p>
                          ))
                        )}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{fmt(c.students)}</td>
                      <td className={td}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-20 overflow-hidden rounded-full bg-surf"
                            role="img"
                            aria-label={`${pct} % con autorización`}
                          >
                            <div className="h-full rounded-full bg-ok" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="whitespace-nowrap tabular-nums">
                            {c.authorized} de {c.students}
                          </span>
                        </div>
                        {c.pending + c.revoked > 0 && (
                          <p className="whitespace-nowrap text-micro text-warn">
                            {c.pending + c.revoked} sin autorización
                          </p>
                        )}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{fmt(c.activeLast7Days)}</td>
                      <td className={`${td} text-right tabular-nums`}>
                        {alertas === 0 ? (
                          <span className="text-ink-3">0</span>
                        ) : (
                          <>
                            {alertas}
                            {c.openAlerts.critica > 0 && (
                              <p className="text-micro font-semibold text-alert">
                                {c.openAlerts.critica} crítica{c.openAlerts.critica > 1 ? 's' : ''}
                              </p>
                            )}
                          </>
                        )}
                      </td>
                      <td className={`${td} font-mono font-bold tracking-widest`}>{c.joinCode}</td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          </section>

          <section>
            <AdminSectionHead
              title="Docentes y coordinación"
              count={`${data.staff.filter((s) => s.isActive).length} activas`}
            />
            <TableWrap>
              <thead>
                <tr>
                  <th className={th}>Nombre</th>
                  <th className={th}>Rol</th>
                  <th className={th}>Cursos</th>
                  <th className={th}>Último ingreso</th>
                </tr>
              </thead>
              <tbody>
                {data.staff.map((s) => (
                  <tr key={s.id} className={s.isActive ? '' : 'text-ink-3'}>
                    <td className={td}>
                      <p className="whitespace-nowrap font-semibold">
                        {s.firstName} {s.lastName}
                        {!s.isActive && <span className="ml-2 text-micro">(desactivada)</span>}
                      </p>
                      <p className="text-micro text-ink-3">{s.email}</p>
                    </td>
                    <td className={td}>{ROLE_LABEL[s.role] ?? s.role}</td>
                    <td className={td}>
                      {s.classrooms.length ? (
                        s.classrooms.join(', ')
                      ) : (
                        <span className="text-ink-3">{s.role === 'teacher' ? 'Sin curso' : '—'}</span>
                      )}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{fmtDate(s.lastLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <p className="mt-2 text-micro text-ink-3">
              Las cuentas nuevas y las contraseñas las gestiona el equipo NativIA. Los cursos de cada
              docente se asignan desde la página del curso.
            </p>
          </section>
        </div>
      )}
    </CoordinatorShell>
  );
}
