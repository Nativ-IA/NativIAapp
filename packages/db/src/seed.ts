// =============================================================================
// Datos de demostración.
//
// REGLA OPERATIVA INNEGOCIABLE: ningún dato real de un menor entra a este
// prototipo. Todo lo que sigue es sintético (docs/09-security-privacy-plan.md
// §7.1). Los nombres son inventados y no corresponden a personas reales.
//
// El seed REINICIA la base: vacía todas las tablas y vuelve a crear la demo.
// Se puede correr cuantas veces se quiera; siempre deja el mismo estado limpio.
//   pnpm db:seed                → la rama de Neon de tu .env (dev)
//   pnpm demo:reset:production  → la rama production (la demo en Cloud Run)
// =============================================================================

import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { ACTIVITIES, AXES } from '@nativia/content';

const prisma = new PrismaClient();

type Estudiante = { firstName: string; lastName: string; avatarKey: string };

const DEMO_STUDENTS: Estudiante[] = [
  { firstName: 'Sara', lastName: 'G.', avatarKey: 'zorro' },
  { firstName: 'Andrés', lastName: 'L.', avatarKey: 'tortuga' },
  { firstName: 'Keila', lastName: 'M.', avatarKey: 'guacamaya' },
  { firstName: 'Juan Pablo', lastName: 'R.', avatarKey: 'jaguar' },
  { firstName: 'Luisa', lastName: 'F.', avatarKey: 'mariposa' },
  { firstName: 'Mateo', lastName: 'R.', avatarKey: 'abeja' },
  { firstName: 'Elena', lastName: 'M.', avatarKey: 'perezoso' },
  { firstName: 'Diego', lastName: 'S.', avatarKey: 'rana' },
];

/** Segundo curso del primer colegio, sin docente asignado y con dos
 *  autorizaciones pendientes: lo que coordinación resuelve en la demo. */
const TERCERO_STUDENTS: Estudiante[] = [
  { firstName: 'Camila', lastName: 'R.', avatarKey: 'rana' },
  { firstName: 'Tomás', lastName: 'V.', avatarKey: 'jaguar' },
  { firstName: 'Antonia', lastName: 'P.', avatarKey: 'mariposa' },
  { firstName: 'Emilio', lastName: 'D.', avatarKey: 'tortuga' },
];

/** Estudiantes del segundo colegio: sirven para mostrar que no se mezclan. */
const OTHER_SCHOOL_STUDENTS: Estudiante[] = [
  { firstName: 'Valentina', lastName: 'C.', avatarKey: 'guacamaya' },
  { firstName: 'Samuel', lastName: 'P.', avatarKey: 'jaguar' },
  { firstName: 'Isabella', lastName: 'T.', avatarKey: 'mariposa' },
];

const BADGES = [
  {
    slug: 'verificador',
    name: 'Verificador',
    description: 'Comprobaste una respuesta por tu cuenta',
    iconKey: 'check-circle',
    axisCode: 'B',
    criteria: { metric: 'independent_verification_count', op: '>=', value: 1 },
  },
  {
    slug: 'detective-novato',
    name: 'Detective novato',
    description: 'Descubriste algo hecho por una IA',
    iconKey: 'search',
    axisCode: 'C',
    criteria: { metric: 'synthetic_detected_count', op: '>=', value: 1 },
  },
  {
    slug: 'preguntona',
    name: 'Preguntón',
    description: 'Le hiciste preguntas a la IA en vez de creerle',
    iconKey: 'help-circle',
    axisCode: 'B',
    criteria: { metric: 'question_turns', op: '>=', value: 5 },
  },
  {
    slug: 'duda-bien',
    name: 'Duda bien',
    description: 'Dudaste de una respuesta y tenías razón',
    iconKey: 'scale',
    axisCode: 'D',
    criteria: { metric: 'justified_disagreement', op: '>=', value: 2 },
  },
];

/** Contraseña y PIN de demostración: los mismos para todos, para que la demo
 *  sea usable. En producción cada adulto recibe una contraseña temporal y cada
 *  niño su propio PIN (ADR-009). */
interface Credenciales {
  pinHash: string;
  passwordHash: string;
}

/** Crea un colegio con su primera sede. Todo registro que cuelga de él lleva
 *  su institutionId (multi-colegio). */
async function crearColegio(c: { name: string; daneCode: string; campus: string }) {
  const institution = await prisma.institution.create({
    data: { name: c.name, daneCode: c.daneCode, city: 'Bogotá D.C.', sector: 'oficial' },
  });
  const campus = await prisma.campus.create({
    data: { institutionId: institution.id, name: c.campus },
  });
  return { institutionId: institution.id, campusId: campus.id };
}

async function crearAdulto(
  institutionId: string,
  a: { firstName: string; lastName: string; email: string; role: 'teacher' | 'coordinator' },
  cred: Credenciales,
) {
  return prisma.user.create({
    data: {
      institutionId,
      role: a.role,
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
      passwordHash: cred.passwordHash,
    },
  });
}

/** Crea un curso con su docente titular (si lo hay) y sus estudiantes. */
async function crearCurso(
  colegio: { institutionId: string; campusId: string },
  c: {
    grade: number;
    section: string;
    joinCode: string;
    titularId?: string;
    students: Estudiante[];
    /** Quedan SIN autorización: la cuenta no entra hasta tenerla (US-09). */
    sinAutorizacion?: string[];
    /** Arrancan con el presupuesto agotado: degradación transparente (US-11). */
    presupuestoAgotado?: string[];
  },
  cred: Credenciales,
) {
  const { institutionId } = colegio;
  const classroom = await prisma.classroom.create({
    data: {
      institutionId,
      campusId: colegio.campusId,
      grade: c.grade,
      shift: 'manana',
      section: c.section,
      year: 2026,
      // Sin O/0, I/1/l, S/5: caracteres sin ambigüedad visual.
      joinCode: c.joinCode,
      joinCodeExpires: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      studyArm: 'tratamiento',
    },
  });

  if (c.titularId) {
    await prisma.classroomAssignment.create({
      data: {
        institutionId,
        userId: c.titularId,
        classroomId: classroom.id,
        role: 'titular',
        canViewTranscripts: true,
        canResolveRiskAlerts: true,
      },
    });
  }

  for (const s of c.students) {
    const user = await prisma.user.create({
      data: { institutionId, role: 'student', firstName: s.firstName, lastName: s.lastName },
    });

    const hasConsent = !c.sinAutorizacion?.includes(s.firstName);
    const agotado = c.presupuestoAgotado?.includes(s.firstName) ?? false;

    const profile = await prisma.studentProfile.create({
      data: {
        institutionId,
        userId: user.id,
        classroomId: classroom.id,
        avatarKey: s.avatarKey,
        graphicPinHash: cred.pinHash,
        isUnlocked: hasConsent,
        a11ySettings: JSON.stringify({
          textScale: 1.0,
          dyslexiaFont: false,
          highContrast: false,
          ttsRate: 1.0,
        }),
      },
    });

    await prisma.consentRecord.create({
      data: {
        institutionId,
        studentProfileId: profile.id,
        mechanism: 'hibrido',
        status: hasConsent ? 'otorgado' : 'pendiente',
        policyVersion: 'v0.1-prototipo',
        guardianRelation: 'acudiente',
        grantedAt: hasConsent ? new Date() : null,
        evidence: JSON.stringify({
          channel: 'demo',
          note: 'Dato sintético de demostración. No corresponde a ninguna persona real.',
        }),
      },
    });

    await prisma.tokenBudget.create({
      data: {
        institutionId,
        studentProfileId: profile.id,
        period: new Date().toISOString().slice(0, 7),
        limitTokens: Number(process.env.STUDENT_MONTHLY_TOKEN_LIMIT ?? 60000),
        outputTokensUsed: agotado ? 60000 : 0,
        isExhausted: agotado,
      },
    });
  }

  console.log(
    `    curso ${c.grade}.º ${c.section} (código ${c.joinCode}): ${c.students.length} estudiantes` +
      (c.titularId ? '' : ', sin docente asignado'),
  );
}

/** Vacía todas las tablas de la app (no la de migraciones). */
async function resetDemo() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename::text AS tablename FROM pg_tables
    WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

function databaseHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? '').host || '(sin DATABASE_URL)';
  } catch {
    return '(DATABASE_URL inválida)';
  }
}

async function main() {
  console.log(`Reiniciando la demo en ${databaseHost()}...\n`);
  await resetDemo();

  // --- Colegios de demostración -------------------------------------------
  // Dos colegios para mostrar el multi-colegio: cada docente ve solo su curso,
  // y un código de ingreso lleva solo a los estudiantes de su colegio.
  const cred: Credenciales = {
    pinHash: await argon2.hash('brote|arepa|montana'),
    passwordHash: await argon2.hash('demo1234'),
  };

  const ied = await crearColegio({
    name: 'IED de Demostración',
    daneCode: 'DEMO-0001',
    campus: 'Sede A',
  });
  console.log('  IED de Demostración');
  const luzMery = await crearAdulto(
    ied.institutionId,
    { firstName: 'Luz Mery', lastName: 'Prieto', email: 'docente@demo.local', role: 'teacher' },
    cred,
  );
  // Docente sin curso: en la demo, coordinación lo asigna a 3.º A.
  await crearAdulto(
    ied.institutionId,
    { firstName: 'Carlos Andrés', lastName: 'Mejía', email: 'docente3@demo.local', role: 'teacher' },
    cred,
  );
  await crearAdulto(
    ied.institutionId,
    { firstName: 'Jairo', lastName: 'Castañeda', email: 'coordinacion@demo.local', role: 'coordinator' },
    cred,
  );
  await crearCurso(
    ied,
    {
      grade: 4,
      section: 'B',
      joinCode: '4B7K',
      titularId: luzMery.id,
      students: DEMO_STUDENTS,
      sinAutorizacion: ['Elena'],
      presupuestoAgotado: ['Mateo'],
    },
    cred,
  );
  await crearCurso(
    ied,
    {
      grade: 3,
      section: 'A',
      joinCode: '9QPT',
      students: TERCERO_STUDENTS,
      sinAutorizacion: ['Antonia', 'Emilio'],
    },
    cred,
  );
  console.log('    docentes docente@demo.local y docente3@demo.local, coordinación coordinacion@demo.local');

  const cerezos = await crearColegio({
    name: 'Colegio Distrital Los Cerezos (demo)',
    daneCode: 'DEMO-0002',
    campus: 'Sede principal',
  });
  console.log('  Colegio Distrital Los Cerezos (demo)');
  const hernan = await crearAdulto(
    cerezos.institutionId,
    { firstName: 'Hernán', lastName: 'Rojas', email: 'docente2@demo.local', role: 'teacher' },
    cred,
  );
  await crearCurso(
    cerezos,
    { grade: 5, section: 'A', joinCode: '7HWM', titularId: hernan.id, students: OTHER_SCHOOL_STUDENTS },
    cred,
  );
  console.log('    docente docente2@demo.local');

  // --- Equipo de plataforma ------------------------------------------------
  // Rol admin SIN colegio: entra al panel de administración (/admin) y no ve
  // datos de los niños (docs/09 §7.2).
  await prisma.user.create({
    data: {
      institutionId: null,
      role: 'admin',
      firstName: 'Equipo',
      lastName: 'NativIA',
      email: 'admin@nativia.local',
      passwordHash: cred.passwordHash,
    },
  });
  console.log('  Equipo de plataforma: admin@nativia.local');

  // --- Ejes -----------------------------------------------------------------
  for (const axis of AXES) {
    await prisma.axis.upsert({
      where: { code: axis.code },
      update: {},
      create: {
        code: axis.code,
        name: axis.name,
        displayName: axis.displayName,
        colorToken: axis.colorToken,
        offlineCapable: axis.offlineCapable,
      },
    });
  }
  console.log('  4 ejes creados');

  // --- Rutas y actividades --------------------------------------------------
  const paths = new Map<number, string>();
  for (const grade of [3, 4, 5]) {
    const p = await prisma.learningPath.upsert({
      where: { slug: `ruta-${grade}` },
      update: {},
      create: { slug: `ruta-${grade}`, name: `Ruta de ${grade}.º`, grade },
    });
    paths.set(grade, p.id);
  }

  for (const activity of ACTIVITIES) {
    const axis = await prisma.axis.findUniqueOrThrow({
      where: { code: activity.axisCode },
    });

    await prisma.activity.upsert({
      where: { slug: activity.slug },
      update: {},
      create: {
        slug: activity.slug,
        learningPathId: paths.get(activity.grade)!,
        axisId: axis.id,
        title: activity.title,
        subject: activity.subject,
        kind: activity.kind,
        orderIndex: activity.orderIndex,
        estimatedMinutes: activity.estimatedMinutes,
        pisaCompetence: activity.pisaCompetence,
        dbaReference: activity.dbaReference,
        bloomLevel: activity.bloomLevel,
        systemPromptKey: activity.systemPromptKey ?? null,
        forbiddenAnswers: JSON.stringify(activity.forbiddenAnswers ?? []),
        fallbackTreeKey: activity.fallbackTree ? activity.slug : null,
        maxTurnsBeforeHint: activity.maxTurnsBeforeHint ?? 6,
        payload: JSON.stringify(activity.payload),
        reviewedBy: activity.reviewedBy,
        reviewedAt: activity.reviewedBy ? new Date() : null,
        isPublished: activity.isPublished,
      },
    });
  }
  console.log(`  ${ACTIVITIES.length} actividades creadas`);

  // --- Logros ---------------------------------------------------------------
  for (const b of BADGES) {
    await prisma.badge.upsert({
      where: { slug: b.slug },
      update: {},
      create: {
        slug: b.slug,
        name: b.name,
        description: b.description,
        iconKey: b.iconKey,
        axisCode: b.axisCode,
        criteria: JSON.stringify(b.criteria),
      },
    });
  }
  console.log(`  ${BADGES.length} logros creados`);

  console.log('\nListo.');
  console.log('  Estudiante  → código de curso 4B7K (o 7HWM, el otro colegio), elige tu avatar');
  console.log('  Docente     → docente@demo.local o docente2@demo.local / demo1234');
  console.log('  Coordinación → coordinacion@demo.local / demo1234 (en /profe)');
  console.log('  Plataforma  → /admin con admin@nativia.local / demo1234');
  console.log('  Elena M. no puede entrar: no tiene autorización del acudiente.');
  console.log('  Mateo R. tiene el presupuesto agotado: verás el modo degradado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
