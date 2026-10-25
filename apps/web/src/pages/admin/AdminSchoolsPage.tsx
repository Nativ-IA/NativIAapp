// Colegios: resumen de la plataforma y alta de colegios.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  errorMessage,
  fmt,
  SECTOR_LABEL,
  useAdminQuery,
  type SchoolsResponse,
} from '../../lib/admin';
import {
  AdminButton,
  AdminSectionHead,
  AdminShell,
  Field,
  fieldClass,
  Stat,
  TableWrap,
  td,
  th,
} from '../../components/AdminShell';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui';

export function AdminSchoolsPage() {
  const { data, error, reload } = useAdminQuery<SchoolsResponse>('/admin/schools');
  const [creating, setCreating] = useState(false);

  return (
    <AdminShell>
      {error && <ErrorState message={error} onRetry={reload} />}
      {!data && !error && <Skeleton className="h-64" />}

      {data && (
        <div className="flex flex-col gap-8">
          <section aria-label="Resumen">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Stat label="Colegios" value={fmt(data.totals.schools)} />
              <Stat label="Cursos" value={fmt(data.totals.classrooms)} />
              <Stat label="Docentes y coordinación" value={fmt(data.totals.staff)} />
              <Stat label="Estudiantes" value={fmt(data.totals.students)} />
              <Stat
                label="Conversaciones con el tutor"
                value={fmt(data.totals.month.interactions)}
                hint="este mes"
              />
            </div>
          </section>

          <section>
            <AdminSectionHead title="Colegios" count={`${data.schools.length} en la plataforma`}>
              {!creating && (
                <AdminButton tone="primary" icon="pen" onClick={() => setCreating(true)}>
                  Nuevo colegio
                </AdminButton>
              )}
            </AdminSectionHead>

            {creating && <NewSchoolForm onCancel={() => setCreating(false)} />}

            {data.schools.length === 0 ? (
              <EmptyState
                icon="book"
                title="Todavía no hay colegios"
                hint="Crea el primero con «Nuevo colegio»."
              />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <th className={th}>Colegio</th>
                    <th className={th}>Sector</th>
                    <th className={`${th} text-right`}>Sedes</th>
                    <th className={`${th} text-right`}>Cursos</th>
                    <th className={`${th} text-right`}>Adultos</th>
                    <th className={`${th} text-right`}>Estudiantes</th>
                    <th className={`${th} text-right`}>Conversaciones del mes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.schools.map((s) => (
                    <tr key={s.id} className="hover:bg-surf">
                      <td className={td}>
                        <Link
                          to={`/admin/colegios/${s.id}`}
                          className="font-semibold text-brand underline-offset-2 hover:underline"
                        >
                          {s.name}
                        </Link>
                        <p className="text-micro text-ink-3">
                          {s.city}
                          {s.daneCode ? ` · DANE ${s.daneCode}` : ''}
                        </p>
                      </td>
                      <td className={td}>{SECTOR_LABEL[s.sector] ?? s.sector}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmt(s.campuses)}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmt(s.classrooms)}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmt(s.staff)}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmt(s.students)}</td>
                      <td className={`${td} text-right tabular-nums`}>
                        {fmt(s.month.interactions)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </section>
        </div>
      )}
    </AdminShell>
  );
}

function NewSchoolForm({ onCancel }: { onCancel: () => void }) {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: '',
    daneCode: '',
    city: 'Bogotá D.C.',
    sector: 'oficial',
    campusName: 'Sede principal',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await api.post<{ id: string }>('/admin/schools', {
        ...form,
        daneCode: form.daneCode || undefined,
      });
      nav(`/admin/colegios/${res.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-4 rounded-md border border-line bg-white p-5">
      <p className="text-body font-bold">Nuevo colegio</p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <Field label="Nombre" htmlFor="school-name">
          <input
            id="school-name"
            required
            value={form.name}
            onChange={set('name')}
            className={fieldClass}
          />
        </Field>
        <Field label="Código DANE" htmlFor="school-dane" hint="Opcional">
          <input
            id="school-dane"
            value={form.daneCode}
            onChange={set('daneCode')}
            className={fieldClass}
          />
        </Field>
        <Field label="Ciudad" htmlFor="school-city">
          <input
            id="school-city"
            required
            value={form.city}
            onChange={set('city')}
            className={fieldClass}
          />
        </Field>
        <Field label="Sector" htmlFor="school-sector">
          <select
            id="school-sector"
            value={form.sector}
            onChange={set('sector')}
            className={fieldClass}
          >
            <option value="oficial">Oficial</option>
            <option value="no_oficial">Privado</option>
          </select>
        </Field>
        <Field label="Primera sede" htmlFor="school-campus">
          <input
            id="school-campus"
            required
            value={form.campusName}
            onChange={set('campusName')}
            className={fieldClass}
          />
        </Field>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-small text-alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <AdminButton tone="primary" type="submit" disabled={saving}>
          {saving ? 'Creando…' : 'Crear colegio'}
        </AdminButton>
        <AdminButton tone="ghost" onClick={onCancel}>
          Cancelar
        </AdminButton>
      </div>
    </form>
  );
}
