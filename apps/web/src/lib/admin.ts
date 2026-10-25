// =============================================================================
// Panel de administración del equipo NativIA: contrato con /v1/admin y
// utilidades de las pantallas.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from './api';

export interface MonthUsage {
  interactions: number;
  inputTokens: number;
  outputTokens: number;
  exhaustedBudgets: number;
  estimatedCostUsd: number | null;
}

export interface SchoolRow {
  id: string;
  name: string;
  daneCode: string | null;
  city: string;
  sector: string;
  createdAt: string;
  campuses: number;
  classrooms: number;
  staff: number;
  students: number;
  month: MonthUsage;
}

export interface SchoolsResponse {
  pricingConfigured: boolean;
  totals: {
    schools: number;
    classrooms: number;
    staff: number;
    students: number;
    month: MonthUsage;
  };
  schools: SchoolRow[];
}

export interface SchoolDetail {
  school: { id: string; name: string; daneCode: string | null; city: string; sector: string };
  campuses: Array<{ id: string; name: string }>;
  classrooms: Array<{
    id: string;
    campusId: string;
    campusName: string;
    label: string;
    grade: number;
    section: string;
    shift: string;
    year: number;
    joinCode: string;
    joinCodeExpires: string | null;
    students: number;
    staff: Array<{ userId: string; name: string; role: string }>;
  }>;
  staff: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
    classrooms: string[];
  }>;
}

export interface AuditEntry {
  id: string;
  occurredAt: string;
  actor: { name: string; email: string | null; role: string } | null;
  school: string | null;
  action: string;
  targetType: string;
  reason: string | null;
}

export const ROLE_LABEL: Record<string, string> = {
  teacher: 'Docente',
  coordinator: 'Coordinación',
  admin: 'Equipo NativIA',
  student: 'Estudiante',
};

export const SHIFT_LABEL: Record<string, string> = {
  manana: 'Mañana',
  tarde: 'Tarde',
  unica: 'Única',
};

export const SECTOR_LABEL: Record<string, string> = {
  oficial: 'Oficial',
  no_oficial: 'Privado',
};

export const ASSIGNMENT_LABEL: Record<string, string> = {
  titular: 'Titular',
  apoyo: 'Apoyo',
  orientacion: 'Orientación',
  reemplazo: 'Reemplazo',
  coordinacion: 'Coordinación',
};

export const ACTION_LABEL: Record<string, string> = {
  creacion_colegio: 'Creó el colegio',
  creacion_sede: 'Creó una sede',
  creacion_curso: 'Creó un curso',
  cambio_codigo_ingreso: 'Cambió un código de ingreso',
  creacion_cuenta: 'Creó una cuenta',
  asignacion_curso: 'Asignó un curso',
  activacion_cuenta: 'Activó una cuenta',
  desactivacion_cuenta: 'Desactivó una cuenta',
  restablecimiento_contrasena: 'Restableció una contraseña',
  consulta_transcripcion: 'Abrió una transcripción',
  resolucion_alerta: 'Resolvió una alerta',
  cambio_consentimiento: 'Cambió una autorización',
  exportacion_datos: 'Exportó datos',
  borrado_derecho_olvido: 'Borró datos a pedido',
  cambio_rol: 'Cambió un rol',
  ingreso_anomalo: 'Ingreso inusual',
  cambio_modelo_llm: 'Cambió el modelo del tutor',
};

const numero = new Intl.NumberFormat('es-CO');
export const fmt = (n: number) => numero.format(n);

export const fmtUsd = (n: number | null) =>
  n === null
    ? '—'
    : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD' }).format(n);

export const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Nunca';

/** Lee un recurso del panel. Sin sesión de plataforma, vuelve al ingreso. */
export function useAdminQuery<T>(path: string) {
  const nav = useNavigate();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(null);
    api
      .get<T>(path)
      .then((d) => alive && setData(d))
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          nav('/admin/entrar');
          return;
        }
        if (alive) setError(e instanceof ApiError ? e.detail : 'Algo falló.');
      });
    return () => {
      alive = false;
    };
  }, [path, version, nav]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, reload };
}

/** Mensaje de un error de la API para mostrar junto a un formulario. */
export function errorMessage(e: unknown): string {
  return e instanceof ApiError ? e.detail : 'Algo falló. Intenta otra vez.';
}
