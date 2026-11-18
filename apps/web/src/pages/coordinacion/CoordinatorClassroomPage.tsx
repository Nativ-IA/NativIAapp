// Coordinación: un curso. Sus docentes, la lista de estudiantes con el estado
// de su autorización, y sus alertas sin contenido. Sin avance individual: eso
// es del docente titular (docs/09 §7.2).

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { ASSIGNMENT_LABEL, errorMessage, fmtDate, SHIFT_LABEL } from '../../lib/admin';
import {
  ALERT_LABEL,
  ALERT_STATUS_LABEL,
  CHANNEL_LABEL,
  fullName,
  parseStudentList,
  RELATION_LABEL,
  SEVERITY_LABEL,
  useSchoolQuery,
  type AlertReview,
  type ClassroomDetail,
  type ClassroomStudent,
  type Severity,
  type StudentCredential,
} from '../../lib/coordinacion';
import {
  AdminButton,
  AdminSectionHead,
  Field,
  fieldClass,
  TableWrap,
  td,
  th,
} from '../../components/AdminShell';
import { ConsentBadge, CoordinatorShell, PinCards } from '../../components/CoordinatorShell';
import { Avatar, EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { Icon } from '../../components/Icon';

/** Tope por envío; el API rechaza más (un curso de primaria completo). */
const MAX_POR_ENVIO = 45;

export function CoordinatorClassroomPage() {
  const { classroomId = '' } = useParams();
  const { data, error, reload } = useSchoolQuery<ClassroomDetail>(
    `/school/classrooms/${classroomId}`,
  );
  const [cards, setCards] = useState<StudentCredential[] | null>(null);

  return (
    <CoordinatorShell>
      <div className="print:hidden">
        <Link
          to="/coordinacion"
          className="mb-4 inline-flex min-h-touch items-center gap-1.5 rounded-sm px-2 text-small font-semibold text-ink-2 hover:bg-white"
        >
          <Icon name="arrow-left" size={18} />
          Colegio
        </Link>
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}
      {!data && !error && <Skeleton className="h-64" />}

      {data && (
        <div className="flex flex-col gap-8">
          <header className="flex flex-wrap items-start justify-between gap-4 print:hidden">
            <div>
              <h1 className="text-h1 font-extrabold">{data.classroom.label}</h1>
              <p className="mt-1 text-small text-ink-2">
                {data.classroom.campusName} · Jornada{' '}
                {(SHIFT_LABEL[data.classroom.shift] ?? data.classroom.shift).toLowerCase()} ·{' '}
                {data.classroom.year}
              </p>
            </div>
            <JoinCode data={data} onChange={reload} />
          </header>

          {cards && (
            <PinCards
              credentials={cards}
              classroomLabel={data.classroom.label}
              joinCode={data.classroom.joinCode}
              onClose={() => setCards(null)}
            />
          )}

          <div className="flex flex-col gap-8 print:hidden">
            <Staff data={data} onChange={reload} />
            <Students
              data={data}
              onChange={reload}
              onCredentials={(c) => {
                setCards(c);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
            <Alerts data={data} />
          </div>
        </div>
      )}
    </CoordinatorShell>
  );
}

// ── Código de ingreso ─────────────────────────────────────────────────────────

function JoinCode({ data, onChange }: { data: ClassroomDetail; onChange: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/school/classrooms/${data.classroom.id}/join-code`);
      setConfirming(false);
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-line bg-white px-4 py-3">
      <p className="text-micro text-ink-2">Código de ingreso</p>
      <p className="font-mono text-h2 font-bold tracking-widest">{data.classroom.joinCode}</p>
      {data.classroom.joinCodeExpires && (
        <p className="text-micro text-ink-3">
          Vence {new Date(data.classroom.joinCodeExpires).toLocaleDateString('es-CO')}
        </p>
      )}
      {confirming ? (
        <div className="mt-2 flex max-w-[16rem] flex-wrap gap-2">
          <p className="w-full text-micro text-ink-2">
            El código actual deja de servir. Los estudiantes entrarán con el nuevo.
          </p>
          <AdminButton tone="danger" disabled={busy} onClick={change}>
            Cambiar
          </AdminButton>
          <AdminButton tone="ghost" onClick={() => setConfirming(false)}>
            Cancelar
          </AdminButton>
        </div>
      ) : (
        <AdminButton tone="ghost" icon="repeat" className="-ml-3 mt-1" onClick={() => setConfirming(true)}>
          Cambiar código
        </AdminButton>
      )}
      {error && (
        <p role="alert" className="mt-2 text-small text-alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ── Docentes del curso ────────────────────────────────────────────────────────

function Staff({ data, onChange }: { data: ClassroomDetail; onChange: () => void }) {
  const enCurso = new Set(data.staff.map((s) => s.userId));
  const disponibles = data.availableStaff.filter((a) => !enCurso.has(a.id));
  const [form, setForm] = useState({ userId: '', role: 'titular' });
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sinTitular = !data.staff.some((s) => s.role === 'titular');

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setConfirming(null);
      setForm((f) => ({ ...f, userId: '' }));
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <AdminSectionHead title="Docentes del curso" count={`${data.staff.length}`} />

      {sinTitular && (
        <p className="mb-3 flex items-start gap-2 rounded-md border border-line bg-eje-c-soft px-4 py-3 text-small">
          <Icon name="alert" size={18} className="mt-0.5 text-warn" />
          Este curso no tiene docente titular: nadie puede revisar sus conversaciones ni resolver sus
          alertas críticas.
        </p>
      )}

      {data.staff.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2">
          {data.staff.map((s) => (
            <li
              key={s.userId + s.role}
              className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-white px-4 py-2"
            >
              <Icon name="user" size={18} className="text-ink-3" />
              <p className="min-w-0 flex-1 basis-40 font-semibold">
                {s.name}{' '}
                <span className="ml-1 rounded-sm bg-surf px-2 py-0.5 text-micro font-semibold text-ink-2">
                  {ASSIGNMENT_LABEL[s.role] ?? s.role}
                </span>
              </p>
              {confirming === s.userId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-micro text-ink-2">Deja de ver este curso.</p>
                  <AdminButton
                    tone="danger"
                    disabled={busy}
                    onClick={() =>
                      run(() => api.post(`/school/classrooms/${data.classroom.id}/staff/${s.userId}/remove`))
                    }
                  >
                    Quitar
                  </AdminButton>
                  <AdminButton tone="ghost" onClick={() => setConfirming(null)}>
                    Cancelar
                  </AdminButton>
                </div>
              ) : (
                <AdminButton tone="ghost" icon="ban" onClick={() => setConfirming(s.userId)}>
                  Quitar del curso
                </AdminButton>
              )}
            </li>
          ))}
        </ul>
      )}

      {disponibles.length > 0 ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.userId) return;
            run(() => api.post(`/school/classrooms/${data.classroom.id}/staff`, form));
          }}
          className="flex flex-wrap items-start gap-3"
        >
          <div className="w-full max-w-xs">
            <Field label="Asignar a" htmlFor="assign-user">
              <select
                id="assign-user"
                required
                value={form.userId}
                onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                className={fieldClass}
              >
                <option value="">Elige a una persona</option>
                {disponibles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="w-full max-w-xs">
            <Field
              label="Como"
              htmlFor="assign-role"
              hint={
                form.role === 'titular'
                  ? 'Revisa conversaciones y resuelve alertas.'
                  : 'Ve el curso, sin abrir conversaciones.'
              }
            >
              <select
                id="assign-role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className={fieldClass}
              >
                <option value="titular">Titular</option>
                <option value="apoyo">Apoyo</option>
              </select>
            </Field>
          </div>
          <AdminButton type="submit" className="sm:mt-7" disabled={busy || !form.userId}>
            Asignar
          </AdminButton>
        </form>
      ) : (
        <p className="text-micro text-ink-3">
          Todas las cuentas activas del colegio ya están en este curso.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-small text-alert">
          {error}
        </p>
      )}
    </section>
  );
}

// ── Estudiantes ───────────────────────────────────────────────────────────────

type RowAction = { id: string; kind: 'autorizar' | 'revocar' | 'pin' | 'retirar' };

function Students({
  data,
  onChange,
  onCredentials,
}: {
  data: ClassroomDetail;
  onChange: () => void;
  onCredentials: (c: StudentCredential[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [action, setAction] = useState<RowAction | null>(null);
  const autorizados = data.students.filter((s) => s.consent === 'otorgado').length;

  return (
    <section>
      <AdminSectionHead
        title="Estudiantes"
        count={`${data.students.length} · ${autorizados} con autorización`}
      >
        {!adding && (
          <AdminButton tone="primary" icon="users" onClick={() => setAdding(true)}>
            Agregar estudiantes
          </AdminButton>
        )}
      </AdminSectionHead>

      {adding && (
        <AddStudentsForm
          classroomId={data.classroom.id}
          onDone={(created) => {
            setAdding(false);
            onCredentials(created);
            onChange();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {data.students.length === 0 ? (
        <EmptyState
          icon="users"
          title="Este curso no tiene estudiantes"
          hint="Agrégalos con su nombre. Cada uno recibe una tarjeta con sus tres imágenes para entrar."
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>Estudiante</th>
              <th className={th}>Autorización del acudiente</th>
              <th className={th}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((s) => (
              <StudentRow
                key={s.id}
                s={s}
                action={action?.id === s.id ? action.kind : null}
                setAction={(kind) => setAction(kind ? { id: s.id, kind } : null)}
                onChange={onChange}
                onCredentials={onCredentials}
              />
            ))}
          </tbody>
        </TableWrap>
      )}
      <p className="mt-2 text-micro text-ink-3">
        Un estudiante sin autorización vigente no puede entrar (Ley 1581 de 2012). Aquí no se ve su
        avance: eso lo ve su docente titular.
      </p>
    </section>
  );
}

function StudentRow({
  s,
  action,
  setAction,
  onChange,
  onCredentials,
}: {
  s: ClassroomStudent;
  action: RowAction['kind'] | null;
  setAction: (k: RowAction['kind'] | null) => void;
  onChange: () => void;
  onCredentials: (c: StudentCredential[]) => void;
}) {
  const [channel, setChannel] = useState('papel');
  const [relation, setRelation] = useState('acudiente');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = fullName(s);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setAction(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const consent = (status: 'otorgado' | 'revocado') =>
    run(async () => {
      await api.post(`/school/students/${s.id}/consent`, {
        status,
        channel,
        guardianRelation: status === 'otorgado' ? relation : undefined,
      });
      onChange();
    });

  return (
    <>
      <tr className={action ? 'bg-surf' : ''}>
        <td className={td}>
          <div className="flex items-center gap-3">
            <Avatar avatarKey={s.avatarKey} size="sm" />
            <span className="font-semibold">{name}</span>
          </div>
        </td>
        <td className={td}>
          <ConsentBadge consent={s.consent} />
          {s.consentUpdatedAt && s.consent !== 'pendiente' && (
            <p className="mt-0.5 text-micro text-ink-3">
              {new Date(s.consentUpdatedAt).toLocaleDateString('es-CO')}
            </p>
          )}
        </td>
        <td className={`${td} text-right`}>
          <div className="flex flex-wrap justify-end gap-1">
            {s.consent === 'otorgado' ? (
              <AdminButton tone="ghost" icon="ban" onClick={() => setAction('revocar')}>
                Revocar
              </AdminButton>
            ) : (
              <AdminButton tone="secondary" icon="check" onClick={() => setAction('autorizar')}>
                Registrar autorización
              </AdminButton>
            )}
            <AdminButton tone="ghost" icon="lock" onClick={() => setAction('pin')}>
              PIN nuevo
            </AdminButton>
            <AdminButton tone="ghost" onClick={() => setAction('retirar')}>
              Retirar
            </AdminButton>
          </div>
        </td>
      </tr>

      {action && (
        <tr className="bg-surf">
          <td colSpan={3} className="border-b border-line px-4 pb-4 pt-1">
            <div className="rounded-md border border-line bg-white p-4">
              {action === 'autorizar' && (
                <>
                  <p className="text-body font-bold">Autorización del acudiente de {name}</p>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <Field label="¿Cómo llegó?" htmlFor={`ch-${s.id}`}>
                      <select
                        id={`ch-${s.id}`}
                        value={channel}
                        onChange={(e) => setChannel(e.target.value)}
                        className={fieldClass}
                      >
                        {Object.entries(CHANNEL_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Quién autoriza" htmlFor={`rel-${s.id}`}>
                      <select
                        id={`rel-${s.id}`}
                        value={relation}
                        onChange={(e) => setRelation(e.target.value)}
                        className={fieldClass}
                      >
                        {Object.entries(RELATION_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <p className="mt-3 text-micro text-ink-2">
                    Al registrarla confirmas que el colegio recibió la autorización firmada. No se
                    guarda el documento ni los datos del acudiente: solo el canal, el parentesco y
                    quién lo registró. {name} podrá entrar desde ya.
                  </p>
                  <Actions
                    busy={busy}
                    confirm="Registrar autorización"
                    onConfirm={() => consent('otorgado')}
                    onCancel={() => setAction(null)}
                  />
                </>
              )}

              {action === 'revocar' && (
                <>
                  <p className="text-body font-bold">Revocar la autorización de {name}</p>
                  <div className="mt-3 max-w-xs">
                    <Field label="¿Cómo la retiró el acudiente?" htmlFor={`rch-${s.id}`}>
                      <select
                        id={`rch-${s.id}`}
                        value={channel}
                        onChange={(e) => setChannel(e.target.value)}
                        className={fieldClass}
                      >
                        {Object.entries(CHANNEL_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <p className="mt-3 text-micro text-ink-2">
                    {name} no podrá entrar desde este momento. Su historial se conserva hasta que se
                    ejerza el derecho al olvido.
                  </p>
                  <Actions
                    busy={busy}
                    danger
                    confirm="Revocar"
                    onConfirm={() => consent('revocado')}
                    onCancel={() => setAction(null)}
                  />
                </>
              )}

              {action === 'pin' && (
                <>
                  <p className="text-body font-bold">PIN nuevo para {name}</p>
                  <p className="mt-1 text-small text-ink-2">
                    Sus imágenes actuales dejan de servir. Le saldrá una tarjeta nueva para imprimir.
                  </p>
                  <Actions
                    busy={busy}
                    confirm="Dar PIN nuevo"
                    onConfirm={() =>
                      run(async () => {
                        const r = await api.post<{ pin: StudentCredential['pin'] }>(
                          `/school/students/${s.id}/pin`,
                        );
                        onCredentials([{ ...s, pin: r.pin }]);
                      })
                    }
                    onCancel={() => setAction(null)}
                  />
                </>
              )}

              {action === 'retirar' && (
                <>
                  <p className="text-body font-bold">Retirar a {name} del curso</p>
                  <p className="mt-1 text-small text-ink-2">
                    Sale de la lista del curso y no podrá entrar. Su historial se conserva hasta que se
                    ejerza el derecho al olvido.
                  </p>
                  <Actions
                    busy={busy}
                    danger
                    confirm="Retirar"
                    onConfirm={() =>
                      run(async () => {
                        await api.post(`/school/students/${s.id}/withdraw`);
                        onChange();
                      })
                    }
                    onCancel={() => setAction(null)}
                  />
                </>
              )}

              {error && (
                <p role="alert" className="mt-2 text-small text-alert">
                  {error}
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Actions({
  busy,
  confirm,
  danger,
  onConfirm,
  onCancel,
}: {
  busy: boolean;
  confirm: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <AdminButton tone={danger ? 'danger' : 'primary'} disabled={busy} onClick={onConfirm}>
        {busy ? 'Un momento…' : confirm}
      </AdminButton>
      <AdminButton tone="ghost" onClick={onCancel}>
        Cancelar
      </AdminButton>
    </div>
  );
}

function AddStudentsForm({
  classroomId,
  onDone,
  onCancel,
}: {
  classroomId: string;
  onDone: (created: StudentCredential[]) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lista = parseStudentList(text);
  const demasiados = lista.length > MAX_POR_ENVIO;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lista.length === 0 || demasiados) return;
    setSaving(true);
    setError(null);
    try {
      const r = await api.post<{ created: StudentCredential[] }>(
        `/school/classrooms/${classroomId}/students`,
        { students: lista },
      );
      onDone(r.created);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-4 rounded-md border border-line bg-white p-5">
      <p className="text-body font-bold">Agregar estudiantes</p>
      <div className="mt-3 grid gap-5 md:grid-cols-2">
        <Field
          label="Un estudiante por línea"
          htmlFor="students-list"
          hint="Nombres, apellido. Basta la inicial del apellido: menos datos, menos riesgo."
        >
          <textarea
            id="students-list"
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Juan Pablo, R.\nMartina, Q.\nSimón Ortiz'}
            className={`${fieldClass} min-h-[12rem] py-2`}
          />
        </Field>

        <div className="min-w-0">
          <p className="text-small font-semibold">
            {lista.length === 0
              ? 'Así quedarán'
              : `Así quedarán (${lista.length} estudiante${lista.length > 1 ? 's' : ''})`}
          </p>
          {lista.length === 0 ? (
            <p className="mt-2 text-micro text-ink-3">
              Escribe o pega la lista. Con coma separas nombres de apellido; sin coma, la última
              palabra es el apellido.
            </p>
          ) : (
            <div className="mt-1 max-h-[12rem] overflow-y-auto rounded-sm border border-line">
              <table className="w-full text-left text-small">
                <thead>
                  <tr>
                    <th className="sticky top-0 bg-surf px-3 py-1.5 text-micro font-semibold text-ink-2">
                      Nombres
                    </th>
                    <th className="sticky top-0 bg-surf px-3 py-1.5 text-micro font-semibold text-ink-2">
                      Apellido
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((s, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="px-3 py-1.5">{s.firstName}</td>
                      <td className="px-3 py-1.5">{s.lastName || <span className="text-ink-3">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {demasiados && (
            <p className="mt-2 text-small text-alert">
              Son más de {MAX_POR_ENVIO}. Agrégalos en dos partes.
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-micro text-ink-2">
        Cada uno recibe un animal y tres imágenes para entrar, que verás una sola vez para imprimir
        sus tarjetas. Quedan bloqueados hasta que registres la autorización de su acudiente.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-small text-alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <AdminButton
          tone="primary"
          type="submit"
          disabled={saving || lista.length === 0 || demasiados}
        >
          {saving
            ? 'Agregando…'
            : lista.length > 0
              ? `Agregar ${lista.length} estudiante${lista.length > 1 ? 's' : ''}`
              : 'Agregar'}
        </AdminButton>
        <AdminButton tone="ghost" onClick={onCancel}>
          Cancelar
        </AdminButton>
      </div>
    </form>
  );
}

// ── Alertas del curso, sin contenido ─────────────────────────────────────────

const SEVERITY_TONE: Record<Severity, string> = {
  critica: 'text-alert',
  media: 'text-warn',
  baja: 'text-ink-2',
};

function Alerts({ data }: { data: ClassroomDetail }) {
  const [open, setOpen] = useState<string | null>(null);
  const abiertas = data.alerts.filter((a) => a.status === 'abierta').length;

  return (
    <section>
      <AdminSectionHead
        title="Alertas del curso"
        count={data.alerts.length ? `${abiertas} abiertas · últimos 30 días` : undefined}
      />
      {data.alerts.length === 0 ? (
        <p className="flex items-center gap-2 text-small text-ink-2">
          <Icon name="check-circle" size={18} className="text-ok" />
          Sin alertas en los últimos 30 días.
        </p>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>Tipo</th>
              <th className={th}>Gravedad</th>
              <th className={th}>Desde</th>
              <th className={th}>Estado</th>
              <th className={th}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.alerts.map((a) => (
              <AlertRow
                key={a.id}
                a={a}
                isOpen={open === a.id}
                setOpen={(v) => setOpen(v ? a.id : null)}
              />
            ))}
          </tbody>
        </TableWrap>
      )}
      {data.alerts.length > 0 && (
        <p className="mt-2 text-micro text-ink-3">
          La lista no dice a quién se refiere cada alerta ni qué pasó. Las atiende el docente
          titular; si necesitas el detalle, ábrela escribiendo el motivo.
        </p>
      )}
    </section>
  );
}

function AlertRow({
  a,
  isOpen,
  setOpen,
}: {
  a: ClassroomDetail['alerts'][number];
  isOpen: boolean;
  setOpen: (v: boolean) => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<AlertReview | null>(null);
  const motivoOk = reason.trim().length >= 10;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!motivoOk) return;
    setBusy(true);
    setError(null);
    try {
      setReview(await api.post<AlertReview>(`/school/alerts/${a.id}/review`, { reason }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr className={isOpen ? 'bg-surf' : ''}>
        <td className={`${td} font-semibold`}>{ALERT_LABEL[a.code] ?? a.code}</td>
        <td className={`${td} font-semibold ${SEVERITY_TONE[a.severity]}`}>
          {SEVERITY_LABEL[a.severity] ?? a.severity}
        </td>
        <td className={`${td} whitespace-nowrap`}>{fmtDate(a.createdAt)}</td>
        <td className={td}>
          {ALERT_STATUS_LABEL[a.status] ?? a.status}
          {a.resolvedAt && <p className="text-micro text-ink-3">{fmtDate(a.resolvedAt)}</p>}
        </td>
        <td className={`${td} text-right`}>
          {!isOpen && (
            <AdminButton tone="ghost" icon="eye" onClick={() => setOpen(true)}>
              Ver con motivo
            </AdminButton>
          )}
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-surf">
          <td colSpan={5} className="border-b border-line px-4 pb-4 pt-1">
            <div className="rounded-md border border-line bg-white p-4">
              {review ? (
                <>
                  <p className="text-body font-bold">
                    {review.student ? fullName(review.student) : 'Alerta del grupo'}
                    {review.classroomLabel ? ` · ${review.classroomLabel}` : ''}
                  </p>
                  <p className="mt-1 text-body">{review.message}</p>
                  {review.suggestedAction && (
                    <p className="mt-1 text-small text-ink-2">
                      Acción sugerida al docente: {review.suggestedAction}
                    </p>
                  )}
                  {review.resolutionNote && (
                    <p className="mt-1 text-small text-ink-2">Nota de cierre: {review.resolutionNote}</p>
                  )}
                  <p className="mt-3 flex items-center gap-2 text-micro text-ink-3">
                    <Icon name="shield" size={16} />
                    {review.auditNotice}
                  </p>
                  <div className="mt-3">
                    <AdminButton
                      tone="ghost"
                      onClick={() => {
                        setReview(null);
                        setReason('');
                        setOpen(false);
                      }}
                    >
                      Cerrar
                    </AdminButton>
                  </div>
                </>
              ) : (
                <form onSubmit={submit}>
                  <Field
                    label="¿Por qué necesitas ver esta alerta?"
                    htmlFor={`reason-${a.id}`}
                    hint="Queda en la auditoría con tu nombre. Mínimo 10 caracteres."
                  >
                    <textarea
                      id={`reason-${a.id}`}
                      rows={2}
                      maxLength={300}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className={`${fieldClass} py-2`}
                    />
                  </Field>
                  {error && (
                    <p role="alert" className="mt-2 text-small text-alert">
                      {error}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AdminButton tone="primary" type="submit" disabled={busy || !motivoOk}>
                      {busy ? 'Abriendo…' : 'Ver alerta'}
                    </AdminButton>
                    <AdminButton tone="ghost" onClick={() => setOpen(false)}>
                      Cancelar
                    </AdminButton>
                  </div>
                </form>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
