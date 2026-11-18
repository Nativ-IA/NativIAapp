// =============================================================================
// Autorizaciones de los acudientes (US-09, Ley 1581 de 2012).
//
// Flujo híbrido [SUPUESTO — validación jurídica pendiente]: el colegio
// certifica que recibió la autorización firmada para arrancar; el acudiente la
// ratifica o la revoca después. Cada cambio es un registro nuevo: el estado de
// un niño es el de su registro más reciente, y la historia completa se conserva.
//
// Usan `db`: se llaman dentro de una petición con colegio activo.
// =============================================================================

import { activeInstitutionId, db } from '../../shared/db.js';

/** Versión del texto de autorización vigente. Cambiarla invalida las
 *  anteriores (schema.prisma, ConsentRecord.policyVersion). */
export const POLITICA_VIGENTE = 'v0.1-prototipo';

export type EstadoAutorizacion = 'otorgado' | 'pendiente' | 'revocado' | 'expirado';

export const CANALES_AUTORIZACION = ['papel', 'correo', 'presencial'] as const;

/** Estado vigente de cada estudiante. Sin registro, está pendiente. */
export async function estadoAutorizaciones(studentProfileIds: string[]) {
  const estados = new Map<string, { status: EstadoAutorizacion; at: Date }>();
  if (studentProfileIds.length === 0) return estados;

  const registros = await db.consentRecord.findMany({
    where: { studentProfileId: { in: studentProfileIds }, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { studentProfileId: true, status: true, createdAt: true },
  });
  for (const r of registros) {
    if (!estados.has(r.studentProfileId)) {
      estados.set(r.studentProfileId, {
        status: r.status as EstadoAutorizacion,
        at: r.createdAt,
      });
    }
  }
  return estados;
}

/** El colegio certifica que recibió (o que el acudiente retiró) la
 *  autorización. No guarda el documento ni los datos del acudiente: solo por
 *  qué canal llegó, su parentesco y quién lo certificó. */
export async function registrarAutorizacion(args: {
  studentProfileId: string;
  status: 'otorgado' | 'revocado';
  channel: (typeof CANALES_AUTORIZACION)[number];
  guardianRelation?: string;
  certifiedByUserId: string;
}) {
  const ahora = new Date();
  return db.consentRecord.create({
    data: {
      institutionId: activeInstitutionId(),
      studentProfileId: args.studentProfileId,
      mechanism: 'institucional',
      status: args.status,
      policyVersion: POLITICA_VIGENTE,
      guardianRelation: args.guardianRelation ?? null,
      grantedAt: args.status === 'otorgado' ? ahora : null,
      revokedAt: args.status === 'revocado' ? ahora : null,
      evidence: JSON.stringify({
        channel: args.channel,
        certifiedByUserId: args.certifiedByUserId,
      }),
    },
    select: { id: true, status: true, createdAt: true },
  });
}
