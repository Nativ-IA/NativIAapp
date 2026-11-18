// =============================================================================
// Panel de coordinación de un colegio: contrato con /v1/school y utilidades de
// las pantallas.
// =============================================================================

import type { PinKey } from '../components/PinSymbols';
import { usePanelQuery } from './admin';

export type Consent = 'otorgado' | 'pendiente' | 'revocado';
export type Severity = 'critica' | 'media' | 'baja';

export interface SchoolOverview {
  school: { id: string; name: string; daneCode: string | null; city: string; sector: string };
  totals: {
    classrooms: number;
    students: number;
    authorized: number;
    unauthorized: number;
    teachers: number;
    activeLast7Days: number;
    completedThisMonth: number;
    openCriticalAlerts: number;
    classroomsWithoutTitular: number;
  };
  classrooms: Array<{
    id: string;
    label: string;
    campusName: string;
    shift: string;
    joinCode: string;
    students: number;
    authorized: number;
    pending: number;
    revoked: number;
    activeLast7Days: number;
    completedThisMonth: number;
    openAlerts: Record<Severity, number>;
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

export interface ClassroomStudent {
  id: string;
  firstName: string;
  lastName: string;
  avatarKey: string;
  consent: Consent;
  consentUpdatedAt: string | null;
  isUnlocked: boolean;
}

export interface ClassroomDetail {
  classroom: {
    id: string;
    label: string;
    campusName: string;
    shift: string;
    year: number;
    joinCode: string;
    joinCodeExpires: string | null;
  };
  staff: Array<{ userId: string; name: string; role: string; isActive: boolean }>;
  students: ClassroomStudent[];
  alerts: Array<{
    id: string;
    code: string;
    severity: Severity;
    status: string;
    createdAt: string;
    resolvedAt: string | null;
  }>;
  availableStaff: Array<{ id: string; name: string; role: string }>;
}

/** Credenciales de un estudiante: salen una sola vez, para su tarjeta. */
export interface StudentCredential {
  id: string;
  firstName: string;
  lastName: string;
  avatarKey: string;
  pin: PinKey[];
}

export interface AlertReview {
  id: string;
  code: string;
  severity: Severity;
  status: string;
  message: string;
  suggestedAction: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
  classroomLabel: string | null;
  student: { firstName: string; lastName: string } | null;
  auditNotice: string;
}

export const CONSENT_LABEL: Record<Consent, string> = {
  otorgado: 'Autorizado',
  pendiente: 'Pendiente',
  revocado: 'Revocado',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critica: 'Crítica',
  media: 'Media',
  baja: 'Baja',
};

/** Catálogo de alertas (docs/10 §5.1), dicho sin jerga. */
export const ALERT_LABEL: Record<string, string> = {
  'A-RIESGO': 'Conversación que necesita revisión',
  'A-DELEG': 'Acepta lo que dice la IA sin revisarlo',
  'A-EVASION': 'Pide la respuesta en vez de pensarla',
  'A-INACT': 'Lleva días sin entrar',
  'A-ATASCO': 'Atascado en un mismo tema',
  'A-GRUPO': 'Varios del curso fallan lo mismo',
  'A-CONSENT': 'Autorización pendiente hace días',
  'A-DEGRAD': 'Mucho trabajo sin conexión',
  'A-AYUDA': 'Pidió ayuda al profe',
};

export const ALERT_STATUS_LABEL: Record<string, string> = {
  abierta: 'Abierta',
  atendida: 'Atendida',
  no_aplica: 'No aplica',
  escalada: 'Escalada',
};

export const CHANNEL_LABEL: Record<string, string> = {
  papel: 'Formato firmado en papel',
  correo: 'Correo del acudiente',
  presencial: 'En persona, en el colegio',
};

export const RELATION_LABEL: Record<string, string> = {
  madre: 'Madre',
  padre: 'Padre',
  acudiente: 'Acudiente',
  otro: 'Otro',
};

/** Lee un recurso del panel de coordinación. Sin sesión, vuelve al ingreso. */
export function useSchoolQuery<T>(path: string) {
  return usePanelQuery<T>(path, '/profe');
}

/** «Nombres, apellidos» o «Nombres Apellido», una persona por línea. Con
 *  coma (o tabulador, al pegar desde una hoja de cálculo) el corte es
 *  explícito; sin ella, la última palabra es el apellido. */
export function parseStudentList(text: string): Array<{ firstName: string; lastName: string }> {
  return text
    .split(/\r?\n/)
    // Solo se juntan los espacios: el tabulador de una hoja de cálculo es un separador.
    .map((l) => l.replace(/[ \u00a0]+/g, ' ').trim())
    .filter(Boolean)
    .map((line) => {
      const sep = line.match(/[,\t;]/);
      if (sep) {
        const i = line.indexOf(sep[0]);
        return {
          firstName: line.slice(0, i).trim(),
          lastName: line.slice(i + 1).replace(/[,\t;]/g, ' ').replace(/ +/g, ' ').trim(),
        };
      }
      const words = line.split(' ');
      if (words.length === 1) return { firstName: line, lastName: '' };
      return { firstName: words.slice(0, -1).join(' '), lastName: words[words.length - 1] };
    })
    .filter((s) => s.firstName.length > 0);
}

export const fullName = (s: { firstName: string; lastName: string }) =>
  `${s.firstName} ${s.lastName}`.trim();
