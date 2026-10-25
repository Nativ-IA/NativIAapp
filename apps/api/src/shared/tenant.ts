// =============================================================================
// Colegio activo de cada petición (multi-colegio).
//
// Las guardas de shared/auth.ts lo fijan a partir del token después de
// verificarlo; shared/db.ts lo lee para filtrar cada consulta. Vive en un
// contexto por petición (AsyncLocalStorage, vía @fastify/request-context), así
// que dos peticiones de colegios distintos nunca se mezclan.
// =============================================================================

import type { FastifyInstance } from 'fastify';
import { fastifyRequestContext, requestContext } from '@fastify/request-context';

declare module '@fastify/request-context' {
  interface RequestContextData {
    institutionId?: string;
  }
}

export async function registerTenantContext(app: FastifyInstance) {
  await app.register(fastifyRequestContext);
}

export function setActiveInstitution(institutionId: string) {
  requestContext.set('institutionId', institutionId);
}

export function getActiveInstitution(): string | undefined {
  return requestContext.get('institutionId');
}
