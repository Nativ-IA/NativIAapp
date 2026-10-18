// =============================================================================
// Vista de grupo — docs/10-teacher-dashboard-spec.md §3.
//
// Estaba especificada al detalle y nunca se había construido, con dos
// consecuencias: el panel no tenía lista de estudiantes, y la ficha individual
// —donde vive la respuesta textual del niño, que es el dato más rico del
// panel— solo se alcanzaba desde «Necesitan tu ayuda hoy». Con datos frescos
// esa lista sale vacía, así que la ficha era inalcanzable.
//
// Consume `/classrooms/:id/heatmap`, que ya existía. No se tocó la API.
//
// Decisiones de la visualización que vienen de §3.1 y no son negociables:
//   · Escala ORDINAL de 3 niveles, no continua. El docente decide a quién
//     atender, no mide con precisión.
//   · Rampa de un solo tono claro→oscuro. No es semáforo: comunica «cuánto»,
//     no «bueno o malo».
//   · Codificación redundante: relleno + glifo (○ ◐ ●) + trama diagonal en el
//     nivel bajo. Nada depende solo del color.
//   · «Sin datos» es celda vacía con «–», NUNCA se pinta como «necesita
//     apoyo». Con menos de 2 oportunidades no hay diagnóstico: pintar rojo a
//     partir de un intento produce un juicio falso que un docente puede
//     llevarse a una reunión con la familia.
//   · Orden de columnas fijo A→B→C→D, siempre.
//   · «Ver como tabla» es obligatorio, y es la vista que se exporta.
// =============================================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { Avatar, ErrorState, Skeleton } from '../components/ui';
import { Icon } from '../components/Icon';
import { TeacherShell, SectionHead } from '../components/TeacherShell';
import { useTeacherClassroom } from './TeacherPages';

interface Cell {
  key: string;
  level: string;
  opportunities: number;
}

interface Row {
  studentProfileId: string;
  firstName: string;
  avatarKey: string;
  cells: Cell[];
}

interface Heatmap {
  columns: Array<{ key: string; label: string; glossary: string }>;
  rows: Row[];
}

const LEVEL: Record<
  string,
  { label: string; glyph: string; cell: string; text: string; hatch: boolean }
> = {
  sin_datos: {
    label: 'Sin actividad todavía',
    glyph: '–',
    cell: 'bg-white border border-line',
    text: 'text-ink-3',
    hatch: false,
  },
  necesita_apoyo: {
    label: 'Necesita apoyo',
    glyph: '○',
    cell: 'bg-mastery-1',
    text: 'text-ink',
    hatch: true,
  },
  va_en_camino: {
    label: 'Va en camino',
    glyph: '◐',
    cell: 'bg-mastery-2',
    text: 'text-white',
    hatch: false,
  },
  lo_maneja_bien: {
    label: 'Lo maneja bien',
    glyph: '●',
    cell: 'bg-mastery-3',
    text: 'text-white',
    hatch: false,
  },
};

const RAMP = ['necesita_apoyo', 'va_en_camino', 'lo_maneja_bien', 'sin_datos'];

/** Trama diagonal para el nivel más bajo. Es el tercer canal, después del
 *  relleno y el glifo: sobrevive a fotocopia en blanco y negro. */
const HATCH =
  'repeating-linear-gradient(45deg, rgba(22,32,43,.18) 0 2px, transparent 2px 6px)';

export function TeacherGroupPage() {
  const nav = useNavigate();
  const { classroom, gate } = useTeacherClassroom();
  const [data, setData] = useState<Heatmap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asTable, setAsTable] = useState(false);

  useEffect(() => {
    if (!classroom) return;
    api
      .get<Heatmap>(`/classrooms/${classroom.classroomId}/heatmap`)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.detail : 'Algo falló.'));
  }, [classroom]);

  const problem = gate ?? error;
  if (problem) return <ErrorState message={problem} onRetry={() => nav('/profe')} />;

  return (
    <TeacherShell classroomLabel={classroom?.label}>
      {!data && <Skeleton className="h-72" />}

      {data && (
        <>
          <SectionHead title="Cómo va cada estudiante" count={`${data.rows.length} en el curso`}>
            <button
              onClick={() => setAsTable((v) => !v)}
              className="flex min-h-touch items-center gap-2 rounded-sm px-3 text-small font-semibold text-ink-2 hover:bg-white"
            >
              <Icon name="chart" size={18} />
              {asTable ? 'Ver como cuadrícula' : 'Ver como tabla'}
            </button>
          </SectionHead>

          <Legend />

          {asTable ? (
            <TableView data={data} onOpen={(id) => nav(`/profe/estudiante/${id}`)} />
          ) : (
            <GridView data={data} onOpen={(id) => nav(`/profe/estudiante/${id}`)} />
          )}

          <p className="mt-4 text-micro text-ink-3">
            Una celda vacía significa que todavía no hay actividad suficiente para decir nada.
            No significa que el estudiante vaya mal.
          </p>
        </>
      )}
    </TeacherShell>
  );
}

function Legend() {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
      {RAMP.map((k) => {
        const lv = LEVEL[k];
        return (
          <span key={k} className="flex items-center gap-2 text-small text-ink-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-sm text-micro font-bold ${lv.cell} ${lv.text}`}
              style={lv.hatch ? { backgroundImage: HATCH } : undefined}
              aria-hidden
            >
              {lv.glyph}
            </span>
            {lv.label}
          </span>
        );
      })}
    </div>
  );
}

function GridView({ data, onOpen }: { data: Heatmap; onOpen: (id: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-white">
      <table className="w-full border-separate border-spacing-0">
        <caption className="sr-only">
          Nivel de cada estudiante por eje. Las columnas van siempre en el orden A, B, C, D.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-white px-4 py-2 text-left">
              <span className="text-micro font-semibold text-ink-2">Estudiante</span>
            </th>
            {data.columns.map((c) => (
              <th key={c.key} scope="col" className="px-2 py-2">
                <span className="block text-micro font-semibold text-ink-2" title={c.glossary}>
                  {c.label}
                </span>
              </th>
            ))}
            <th scope="col" className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.studentProfileId} className="group">
              <th
                scope="row"
                className="sticky left-0 z-10 border-t border-line bg-white px-4 py-2 text-left font-normal"
              >
                <span className="flex items-center gap-2.5">
                  <Avatar avatarKey={r.avatarKey} size="sm" />
                  <span className="text-small font-semibold">{r.firstName}</span>
                </span>
              </th>

              {r.cells.map((cell) => {
                const lv = LEVEL[cell.level] ?? LEVEL.sin_datos;
                return (
                  <td key={cell.key} className="border-t border-line px-1 py-1 text-center">
                    {/* El espaciador de 2 px es del color de superficie, no un
                        borde: un borde añade una línea que compite con el dato. */}
                    <span
                      className={`mx-auto flex h-10 w-full min-w-[52px] items-center justify-center rounded-sm text-body font-bold ${lv.cell} ${lv.text}`}
                      style={lv.hatch ? { backgroundImage: HATCH } : undefined}
                      title={`${r.firstName} · ${cell.key} · ${lv.label} · ${cell.opportunities} actividades`}
                    >
                      <span aria-hidden>{lv.glyph}</span>
                      <span className="sr-only">
                        {lv.label}, {cell.opportunities} actividades
                      </span>
                    </span>
                  </td>
                );
              })}

              <td className="border-t border-line px-3 py-1 text-right">
                <button
                  onClick={() => onOpen(r.studentProfileId)}
                  className="min-h-touch rounded-sm px-2 text-small font-semibold text-brand hover:bg-surf"
                >
                  Ver ficha
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Alternativa textual obligatoria (§3.1). Es la vista que se exporta y la que
 *  funciona con lector de pantalla sin depender de ningún color. */
function TableView({ data, onOpen }: { data: Heatmap; onOpen: (id: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-white">
      <table className="w-full text-left text-small">
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="px-4 py-2.5 font-semibold text-ink-2">
              Estudiante
            </th>
            {data.columns.map((c) => (
              <th key={c.key} scope="col" className="px-4 py-2.5 font-semibold text-ink-2">
                {c.label}
              </th>
            ))}
            <th scope="col" className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.studentProfileId} className="border-b border-line last:border-b-0">
              <th scope="row" className="px-4 py-2.5 font-semibold">
                {r.firstName}
              </th>
              {r.cells.map((cell) => {
                const lv = LEVEL[cell.level] ?? LEVEL.sin_datos;
                return (
                  <td key={cell.key} className="px-4 py-2.5 text-ink-2">
                    {lv.label}
                    {cell.opportunities > 0 && (
                      <span className="text-ink-3"> · {cell.opportunities}</span>
                    )}
                  </td>
                );
              })}
              <td className="px-4 py-2.5 text-right">
                <button
                  onClick={() => onOpen(r.studentProfileId)}
                  className="min-h-touch rounded-sm px-2 font-semibold text-brand hover:bg-surf"
                >
                  Ver ficha
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
