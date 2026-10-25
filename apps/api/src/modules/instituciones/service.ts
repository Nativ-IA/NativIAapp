import { db } from '../../shared/db.js';

/** ¿Este adulto tiene asignado este curso? Base de todos los permisos sobre
 *  datos de un curso (docs/09-security-privacy-plan.md §7.2). */
export async function canAccessClassroom(userId: string, classroomId: string) {
  const a = await db.classroomAssignment.findFirst({
    where: { userId, classroomId, deletedAt: null },
  });
  return a !== null;
}
