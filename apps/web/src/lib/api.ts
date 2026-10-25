// En producción la misma API sirve el front, así que basta la ruta relativa.
const BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:3000/v1' : '/v1');

export class ApiError extends Error {
  constructor(
    public status: number,
    /** Redactado en lenguaje amable para el estudiante: nunca culpa al niño y
     *  siempre afirma que su progreso está a salvo. */
    public detail: string,
    public code?: string,
  ) {
    super(detail);
  }
}

function token(): string | null {
  return localStorage.getItem('nativia.token');
}

export function setToken(t: string | null) {
  if (t) localStorage.setItem('nativia.token', t);
  else localStorage.removeItem('nativia.token');
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(
      0,
      'Parece que no hay internet. Tu avance está guardado.',
      'offline',
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body.detail ?? 'Algo falló, pero tu avance está guardado.',
      body.code,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
};

// ── Tipos del contrato (docs/06-api-specification.yaml) ──────────────────────

export interface AxisProgress {
  code: 'A' | 'B' | 'C' | 'D';
  displayName: string;
  tagline: string;
  colorToken: string;
  completed: number;
  total: number;
  offlineCapable: boolean;
  nextActivityId: string | null;
}

export interface PathResponse {
  student: { firstName: string; avatarKey: string; grade: number; badgeCount: number };
  axes: AxisProgress[];
}

export interface ActivitySummary {
  id: string;
  slug: string;
  title: string;
  subject: string;
  estimatedMinutes: number;
  requiresNetwork: boolean;
  status: 'bloqueada' | 'disponible' | 'completada';
  completionQuality: 'sin_ayuda' | 'con_pistas' | null;
}

export interface TutorPayloadDTO {
  problem: string;
  aiAnswer: string;
  targetLearning: string;
  questionPath: string[];
}

export interface ActivityDetail {
  id: string;
  slug: string;
  title: string;
  axisCode: 'A' | 'B' | 'C' | 'D';
  subject: string;
  kind: string;
  estimatedMinutes: number;
  pisaCompetence: string;
  dbaReference: string;
  bloomLevel: string;
  payload: TutorPayloadDTO | Record<string, unknown>;
  fallbackTree: unknown | null;
  metacognition: { question: string; scaffolds: string[] };
}

export interface TutorTurn {
  turnIndex: number;
  content: string;
  source: 'llm' | 'fallback_tree' | 'safety' | 'redirect';
  choices?: Array<{ key: string; label: string }>;
  suggestAskTeacher: boolean;
  budgetRemaining: number;
  latencyMs: number;
}
