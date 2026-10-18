// =============================================================================
// Datos de demostración.
//
// REGLA OPERATIVA INNEGOCIABLE: ningún dato real de un menor entra a este
// prototipo. Todo lo que sigue es sintético (docs/09-security-privacy-plan.md
// §7.1). Los nombres son inventados y no corresponden a personas reales.
// =============================================================================

import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { ACTIVITIES, AXES } from '@nativia/content';

const prisma = new PrismaClient();

const DEMO_STUDENTS = [
  { firstName: 'Sara', lastName: 'G.', avatarKey: 'zorro' },
  { firstName: 'Andrés', lastName: 'L.', avatarKey: 'tortuga' },
  { firstName: 'Keila', lastName: 'M.', avatarKey: 'guacamaya' },
  { firstName: 'Juan Pablo', lastName: 'R.', avatarKey: 'jaguar' },
  { firstName: 'Luisa', lastName: 'F.', avatarKey: 'mariposa' },
  { firstName: 'Mateo', lastName: 'R.', avatarKey: 'abeja' },
  { firstName: 'Elena', lastName: 'M.', avatarKey: 'perezoso' },
  { firstName: 'Diego', lastName: 'S.', avatarKey: 'rana' },
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

async function main() {
  console.log('Sembrando datos de demostración...\n');

  // --- Organización escolar ------------------------------------------------
  const institution = await prisma.institution.upsert({
    where: { daneCode: 'DEMO-0001' },
    update: {},
    create: {
      name: 'IED de Demostración',
      daneCode: 'DEMO-0001',
      city: 'Bogotá D.C.',
      sector: 'oficial',
    },
  });

  const campus = await prisma.campus.create({
    data: { institutionId: institution.id, name: 'Sede A' },
  });

  const classroom = await prisma.classroom.create({
    data: {
      campusId: campus.id,
      grade: 4,
      shift: 'manana',
      section: 'B',
      year: 2026,
      // Sin O/0, I/1/l, S/5: caracteres sin ambigüedad visual.
      joinCode: '4B7K',
      joinCodeExpires: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      studyArm: 'tratamiento',
    },
  });
  console.log(`  Curso 4.º B creado — código de ingreso: ${classroom.joinCode}`);

  // --- Docente --------------------------------------------------------------
  const teacherPassword = await argon2.hash('demo1234');
  const teacher = await prisma.user.create({
    data: {
      institutionId: institution.id,
      role: 'teacher',
      firstName: 'Luz Mery',
      lastName: 'Prieto',
      email: 'docente@demo.local',
      passwordHash: teacherPassword,
    },
  });

  await prisma.classroomAssignment.create({
    data: {
      userId: teacher.id,
      classroomId: classroom.id,
      role: 'titular',
      canViewTranscripts: true,
      canResolveRiskAlerts: true,
    },
  });
  console.log('  Docente: docente@demo.local / demo1234');

  // --- Estudiantes ----------------------------------------------------------
  // PIN gráfico de demostración: las mismas 3 imágenes para todos, para que la
  // demo sea usable. En producción cada niño elige el suyo (ADR-009).
  const demoPinHash = await argon2.hash('brote|arepa|montana');

  for (const [i, s] of DEMO_STUDENTS.entries()) {
    const user = await prisma.user.create({
      data: {
        institutionId: institution.id,
        role: 'student',
        firstName: s.firstName,
        lastName: s.lastName,
      },
    });

    // Elena queda SIN consentimiento a propósito: demuestra que la cuenta
    // permanece bloqueada hasta que exista autorización vigente (US-09).
    const hasConsent = s.firstName !== 'Elena';

    const profile = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        classroomId: classroom.id,
        avatarKey: s.avatarKey,
        graphicPinHash: demoPinHash,
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
        studentProfileId: profile.id,
        period: new Date().toISOString().slice(0, 7),
        limitTokens: Number(process.env.STUDENT_MONTHLY_TOKEN_LIMIT ?? 60000),
        // Mateo arranca con el presupuesto agotado: demuestra la degradación
        // transparente al árbol pregrabado (US-11).
        outputTokensUsed: s.firstName === 'Mateo' ? 60000 : 0,
        isExhausted: s.firstName === 'Mateo',
      },
    });

    if (i === 0) console.log(`  ${DEMO_STUDENTS.length} estudiantes creados`);
  }

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
  console.log('  Estudiante  → código de curso 4B7K, elige tu avatar');
  console.log('  Docente     → docente@demo.local / demo1234');
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
