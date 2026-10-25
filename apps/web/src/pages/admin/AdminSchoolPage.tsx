// Detalle de un colegio: sedes, cursos con su código de ingreso y cuentas de
// adultos. Solo cifras de los estudiantes, nunca sus nombres.

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  ASSIGNMENT_LABEL,
  errorMessage,
  fmt,
  fmtDate,
  ROLE_LABEL,
  SECTOR_LABEL,
  SHIFT_LABEL,
  useAdminQuery,
  type SchoolDetail,
} from '../../lib/admin';
import {
  AdminButton,
  AdminSectionHead,
  AdminShell,
  Field,
  fieldClass,
  SecretReveal,
  TableWrap,
  td,
  th,
} from '../../components/AdminShell';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { Icon } from '../../components/Icon';

export function AdminSchoolPage() {
  const { schoolId = '' } = useParams();
  const { data, error, reload } = useAdminQuery<SchoolDetail>(`/admin/schools/${schoolId}`);
  const [secret, setSecret] = useState<{ who: string; value: string } | null>(null);

  return (
    <AdminShell>
      <Link
        to="/admin"
        className="mb-4 inline-flex min-h-touch items-center gap-1.5 rounded-sm px-2 text-small font-semibold text-ink-2 hover:bg-white"
      >
        <Icon name="arrow-left" size={18} />
        Colegios
      </Link>

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

          {secret && (
            <SecretReveal who={secret.who} secret={secret.value} onClose={() => setSecret(null)} />
          )}

          <Classrooms data={data} onChange={reload} />
          <Staff data={data} onChange={reload} onSecret={setSecret} />
          <Campuses data={data} onChange={reload} />
        </div>
      )}
    </AdminShell>
  );
}

// ── Cursos ────────────────────────────────────────────────────────────────────

function Classrooms({ data, onChange }: { data: SchoolDetail; onChange: () => void }) {
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function newCode(classroomId: string) {
    setBusy(classroomId);
    setError(null);
    try {
      await api.post(`/admin/classrooms/${classroomId}/join-code`);
      setConfirming(null);
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section>
      <AdminSectionHead title="Cursos" count={`${data.classrooms.length}`}>
        {!creating && data.campuses.length > 0 && (
          <AdminButton tone="primary" icon="pen" onClick={() => setCreating(true)}>
            Nuevo curso
          </AdminButton>
        )}
      </AdminSectionHead>

      {creating && (
        <NewClassroomForm
          data={data}
          onDone={() => {
            setCreating(false);
            onChange();
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {error && (
        <p role="alert" className="mb-3 text-small text-alert">
          {error}
        </p>
      )}

      {data.classrooms.length === 0 ? (
        <EmptyState
          icon="users"
          title="Este colegio no tiene cursos"
          hint="Cada curso recibe un código de 4 letras con el que entran sus estudiantes."
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>Curso</th>
              <th className={th}>Sede y jornada</th>
              <th className={`${th} text-right`}>Estudiantes</th>
              <th className={th}>Docentes</th>
              <th className={th}>Código de ingreso</th>
              <th className={th}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.classrooms.map((c) => (
              <tr key={c.id}>
                <td className={`${td} font-semibold`}>{c.label}</td>
                <td className={td}>
                  {c.campusName}
                  <p className="text-micro text-ink-3">
                    {SHIFT_LABEL[c.shift] ?? c.shift} · {c.year}
                  </p>
                </td>
                <td className={`${td} text-right tabular-nums`}>{fmt(c.students)}</td>
                <td className={td}>
                  {c.staff.length === 0 ? (
                    <span className="text-ink-3">Sin asignar</span>
                  ) : (
                    c.staff.map((s) => (
                      <p key={s.userId}>
                        {s.name}{' '}
                        <span className="text-micro text-ink-3">
                          {ASSIGNMENT_LABEL[s.role] ?? s.role}
                        </span>
                      </p>
                    ))
                  )}
                </td>
                <td className={td}>
                  <p className="font-mono text-body-lg font-bold tracking-widest">{c.joinCode}</p>
                  {c.joinCodeExpires && (
                    <p className="text-micro text-ink-3">
                      Vence {new Date(c.joinCodeExpires).toLocaleDateString('es-CO')}
                    </p>
                  )}
                </td>
                <td className={`${td} text-right`}>
                  {confirming === c.id ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      <p className="w-full text-micro text-ink-2">
                        Sus estudiantes tendrán que usar el código nuevo.
                      </p>
                      <AdminButton
                        tone="danger"
                        disabled={busy === c.id}
                        onClick={() => newCode(c.id)}
                      >
                        Cambiar
                      </AdminButton>
                      <AdminButton tone="ghost" onClick={() => setConfirming(null)}>
                        Cancelar
                      </AdminButton>
                    </div>
                  ) : (
                    <AdminButton tone="ghost" icon="repeat" onClick={() => setConfirming(c.id)}>
                      Cambiar código
                    </AdminButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </section>
  );
}

function NewClassroomForm({
  data,
  onDone,
  onCancel,
}: {
  data: SchoolDetail;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    campusId: data.campuses[0]?.id ?? '',
    grade: '4',
    section: '',
    shift: 'manana',
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
      await api.post(`/admin/schools/${data.school.id}/classrooms`, {
        ...form,
        grade: Number(form.grade),
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-4 rounded-md border border-line bg-white p-5">
      <p className="text-body font-bold">Nuevo curso</p>
      <div className="mt-3 grid gap-4 md:grid-cols-4">
        <Field label="Sede" htmlFor="class-campus">
          <select id="class-campus" value={form.campusId} onChange={set('campusId')} className={fieldClass}>
            {data.campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Grado" htmlFor="class-grade">
          <select id="class-grade" value={form.grade} onChange={set('grade')} className={fieldClass}>
            <option value="3">3.º</option>
            <option value="4">4.º</option>
            <option value="5">5.º</option>
          </select>
        </Field>
        <Field label="Curso" htmlFor="class-section" hint="Letra o número: A, B, 401">
          <input
            id="class-section"
            required
            maxLength={4}
            value={form.section}
            onChange={set('section')}
            className={fieldClass}
          />
        </Field>
        <Field label="Jornada" htmlFor="class-shift">
          <select id="class-shift" value={form.shift} onChange={set('shift')} className={fieldClass}>
            <option value="manana">Mañana</option>
            <option value="tarde">Tarde</option>
            <option value="unica">Única</option>
          </select>
        </Field>
      </div>
      <p className="mt-3 text-micro text-ink-3">
        El código de ingreso se genera solo, sin letras que se confundan (O/0, I/1, S/5).
      </p>

      {error && (
        <p role="alert" className="mt-3 text-small text-alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <AdminButton tone="primary" type="submit" disabled={saving}>
          {saving ? 'Creando…' : 'Crear curso'}
        </AdminButton>
        <AdminButton tone="ghost" onClick={onCancel}>
          Cancelar
        </AdminButton>
      </div>
    </form>
  );
}

// ── Cuentas de adultos ────────────────────────────────────────────────────────

function Staff({
  data,
  onChange,
  onSecret,
}: {
  data: SchoolDetail;
  onChange: () => void;
  onSecret: (s: { who: string; value: string }) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(userId: string, fn: () => Promise<void>) {
    setBusy(userId);
    setError(null);
    try {
      await fn();
      setConfirming(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const active = data.staff.filter((s) => s.isActive).length;

  return (
    <section>
      <AdminSectionHead
        title="Docentes y coordinación"
        count={`${active} activas de ${data.staff.length}`}
      >
        {!creating && (
          <AdminButton tone="primary" icon="user" onClick={() => setCreating(true)}>
            Nueva cuenta
          </AdminButton>
        )}
      </AdminSectionHead>

      {creating && (
        <NewStaffForm
          data={data}
          onDone={(who, password) => {
            setCreating(false);
            onSecret({ who, value: password });
            onChange();
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {error && (
        <p role="alert" className="mb-3 text-small text-alert">
          {error}
        </p>
      )}

      {data.staff.length === 0 ? (
        <EmptyState
          icon="user"
          title="Este colegio no tiene cuentas de adultos"
          hint="Crea la del docente titular para que pueda entrar al Panel del Maestro."
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>Nombre</th>
              <th className={th}>Rol</th>
              <th className={th}>Cursos</th>
              <th className={th}>Último ingreso</th>
              <th className={th}>Estado</th>
              <th className={th}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.staff.map((s) => {
              const who = `${s.firstName} ${s.lastName}`;
              return (
                <tr key={s.id} className={s.isActive ? '' : 'text-ink-3'}>
                  <td className={td}>
                    <p className="font-semibold">{who}</p>
                    <p className="text-micro text-ink-3">{s.email}</p>
                  </td>
                  <td className={td}>{ROLE_LABEL[s.role] ?? s.role}</td>
                  <td className={td}>
                    {s.classrooms.length ? s.classrooms.join(', ') : <span className="text-ink-3">—</span>}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{fmtDate(s.lastLoginAt)}</td>
                  <td className={td}>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-micro font-semibold ${
                        s.isActive ? 'bg-eje-b-soft text-ok' : 'bg-surf text-ink-3'
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`h-2 w-2 rounded-full ${s.isActive ? 'bg-ok' : 'bg-ink-3'}`}
                      />
                      {s.isActive ? 'Activa' : 'Desactivada'}
                    </span>
                  </td>
                  <td className={`${td} text-right`}>
                    {confirming === s.id ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        <p className="w-full text-micro text-ink-2">
                          {who} no podrá entrar hasta que la actives otra vez.
                        </p>
                        <AdminButton
                          tone="danger"
                          disabled={busy === s.id}
                          onClick={() =>
                            run(s.id, async () => {
                              await api.post(`/admin/staff/${s.id}/status`, { isActive: false });
                              onChange();
                            })
                          }
                        >
                          Desactivar
                        </AdminButton>
                        <AdminButton tone="ghost" onClick={() => setConfirming(null)}>
                          Cancelar
                        </AdminButton>
                      </div>
                    ) : (
                      <div className="flex flex-wrap justify-end gap-2">
                        <AdminButton
                          tone="ghost"
                          icon="lock"
                          disabled={busy === s.id}
                          onClick={() =>
                            run(s.id, async () => {
                              const r = await api.post<{ temporaryPassword: string }>(
                                `/admin/staff/${s.id}/password`,
                              );
                              onSecret({ who, value: r.temporaryPassword });
                            })
                          }
                        >
                          Nueva contraseña
                        </AdminButton>
                        {s.isActive ? (
                          <AdminButton tone="ghost" icon="ban" onClick={() => setConfirming(s.id)}>
                            Desactivar
                          </AdminButton>
                        ) : (
                          <AdminButton
                            tone="ghost"
                            icon="check"
                            disabled={busy === s.id}
                            onClick={() =>
                              run(s.id, async () => {
                                await api.post(`/admin/staff/${s.id}/status`, { isActive: true });
                                onChange();
                              })
                            }
                          >
                            Activar
                          </AdminButton>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </section>
  );
}

function NewStaffForm({
  data,
  onDone,
  onCancel,
}: {
  data: SchoolDetail;
  onDone: (who: string, password: string) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'teacher',
    classroomId: '',
    assignmentRole: 'titular',
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
      const r = await api.post<{ temporaryPassword: string }>(
        `/admin/schools/${data.school.id}/staff`,
        { ...form, classroomId: form.classroomId || undefined },
      );
      onDone(`${form.firstName} ${form.lastName}`, r.temporaryPassword);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-4 rounded-md border border-line bg-white p-5">
      <p className="text-body font-bold">Nueva cuenta</p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <Field label="Nombres" htmlFor="staff-first">
          <input id="staff-first" required value={form.firstName} onChange={set('firstName')} className={fieldClass} />
        </Field>
        <Field label="Apellidos" htmlFor="staff-last">
          <input id="staff-last" required value={form.lastName} onChange={set('lastName')} className={fieldClass} />
        </Field>
        <Field label="Correo institucional" htmlFor="staff-email">
          <input
            id="staff-email"
            type="email"
            required
            value={form.email}
            onChange={set('email')}
            className={fieldClass}
          />
        </Field>
        <Field label="Rol" htmlFor="staff-role">
          <select id="staff-role" value={form.role} onChange={set('role')} className={fieldClass}>
            <option value="teacher">Docente</option>
            <option value="coordinator">Coordinación</option>
          </select>
        </Field>
        <Field label="Curso" htmlFor="staff-class" hint="Opcional: se puede asignar después">
          <select id="staff-class" value={form.classroomId} onChange={set('classroomId')} className={fieldClass}>
            <option value="">Sin curso por ahora</option>
            {data.classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} · {c.campusName}
              </option>
            ))}
          </select>
        </Field>
        {form.classroomId && (
          <Field label="En ese curso es" htmlFor="staff-assign">
            <select
              id="staff-assign"
              value={form.assignmentRole}
              onChange={set('assignmentRole')}
              className={fieldClass}
            >
              <option value="titular">Titular (ve transcripciones y resuelve alertas)</option>
              <option value="apoyo">Apoyo</option>
            </select>
          </Field>
        )}
      </div>
      <p className="mt-3 text-micro text-ink-3">
        Se crea con una contraseña temporal que se muestra una sola vez.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-small text-alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <AdminButton tone="primary" type="submit" disabled={saving}>
          {saving ? 'Creando…' : 'Crear cuenta'}
        </AdminButton>
        <AdminButton tone="ghost" onClick={onCancel}>
          Cancelar
        </AdminButton>
      </div>
    </form>
  );
}

// ── Sedes ─────────────────────────────────────────────────────────────────────

function Campuses({ data, onChange }: { data: SchoolDetail; onChange: () => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/admin/schools/${data.school.id}/campuses`, { name });
      setName('');
      onChange();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <AdminSectionHead title="Sedes" count={`${data.campuses.length}`} />
      <ul className="mb-4 flex flex-wrap gap-2">
        {data.campuses.map((c) => (
          <li key={c.id} className="rounded-sm border border-line bg-white px-3 py-1.5 text-small">
            {c.name}
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <div className="w-full max-w-xs">
          <Field label="Nueva sede" htmlFor="campus-name">
            <input
              id="campus-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
            />
          </Field>
        </div>
        <AdminButton type="submit" disabled={saving}>
          {saving ? 'Agregando…' : 'Agregar sede'}
        </AdminButton>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-small text-alert">
          {error}
        </p>
      )}
    </section>
  );
}
