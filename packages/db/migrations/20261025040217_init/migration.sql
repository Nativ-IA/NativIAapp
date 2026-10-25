-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daneCode" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Bogotá D.C.',
    "sector" TEXT NOT NULL DEFAULT 'oficial',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campuses" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "campuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classrooms" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "shift" TEXT NOT NULL DEFAULT 'manana',
    "section" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "joinCode" TEXT NOT NULL,
    "joinCodeExpires" TIMESTAMP(3),
    "studyArm" TEXT NOT NULL DEFAULT 'ninguno',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT,
    "role" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "mfaSecret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "avatarKey" TEXT NOT NULL DEFAULT 'nativia',
    "graphicPinHash" TEXT,
    "a11ySettings" TEXT NOT NULL DEFAULT '{}',
    "isUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classroom_assignments" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "canViewTranscripts" BOOLEAN NOT NULL DEFAULT false,
    "canResolveRiskAlerts" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "classroom_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "mechanism" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "policyVersion" TEXT NOT NULL,
    "guardianRef" TEXT,
    "guardianRelation" TEXT,
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "evidence" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_paths" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "axes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "colorToken" TEXT NOT NULL,
    "offlineCapable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "axes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "learningPathId" TEXT NOT NULL,
    "axisId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "pisaCompetence" TEXT NOT NULL,
    "dbaReference" TEXT NOT NULL,
    "bloomLevel" TEXT NOT NULL,
    "systemPromptKey" TEXT,
    "forbiddenAnswers" TEXT NOT NULL DEFAULT '[]',
    "fallbackTreeKey" TEXT,
    "maxTurnsBeforeHint" INTEGER NOT NULL DEFAULT 6,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "clientAttemptId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'en_curso',
    "mode" TEXT NOT NULL DEFAULT 'online',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "isCorrect" BOOLEAN,
    "hasValidJustification" BOOLEAN NOT NULL DEFAULT false,
    "independentVerification" BOOLEAN NOT NULL DEFAULT false,
    "verificationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_events" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "clientEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stepIndex" INTEGER,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attempt_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metacognition_responses" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "inputMode" TEXT NOT NULL DEFAULT 'texto',
    "text" TEXT NOT NULL,
    "scaffoldTags" TEXT,
    "audioRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "metacognition_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_interactions" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "systemPromptKey" TEXT NOT NULL,
    "systemPromptHash" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "turnCount" INTEGER NOT NULL DEFAULT 0,
    "flaggedModeration" BOOLEAN NOT NULL DEFAULT false,
    "flaggedRisk" BOOLEAN NOT NULL DEFAULT false,
    "flaggedEvasion" BOOLEAN NOT NULL DEFAULT false,
    "evasionAttempts" INTEGER NOT NULL DEFAULT 0,
    "answerLeaksDetected" INTEGER NOT NULL DEFAULT 0,
    "acriticalAcceptanceRatio" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "llm_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_turns" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "interactionId" TEXT NOT NULL,
    "turnIndex" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "intentClass" TEXT,
    "moderationTags" TEXT,
    "wasRegenerated" BOOLEAN NOT NULL DEFAULT false,
    "fromFallbackTree" BOOLEAN NOT NULL DEFAULT false,
    "latencyMs" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_turns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_budgets" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "inputTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "outputTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "limitTokens" INTEGER NOT NULL DEFAULT 60000,
    "isExhausted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastery_scores" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "activityId" TEXT,
    "pisaCompetence" TEXT NOT NULL,
    "axisCode" TEXT NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "opportunities" INTEGER NOT NULL DEFAULT 0,
    "level" TEXT NOT NULL DEFAULT 'sin_datos',
    "bktParams" TEXT NOT NULL DEFAULT '{}',
    "lastEvidenceAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "mastery_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL,
    "axisCode" TEXT,
    "criteria" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_badges" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_alerts" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "studentProfileId" TEXT,
    "code" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "suggestedAction" TEXT NOT NULL DEFAULT '{}',
    "isContentHidden" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'abierta',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "teacher_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classroom_summaries" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "window" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeStudents" INTEGER NOT NULL DEFAULT 0,
    "attemptsCompleted" INTEGER NOT NULL DEFAULT 0,
    "isviRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "acriticalRatio" DOUBLE PRECISION,
    "degradedTurnRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "triageTop3" TEXT NOT NULL DEFAULT '[]',
    "masteryByAxis" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classroom_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT,
    "context" TEXT NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutions_daneCode_key" ON "institutions"("daneCode");

-- CreateIndex
CREATE INDEX "institutions_daneCode_idx" ON "institutions"("daneCode");

-- CreateIndex
CREATE INDEX "campuses_institutionId_idx" ON "campuses"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_joinCode_key" ON "classrooms"("joinCode");

-- CreateIndex
CREATE INDEX "classrooms_joinCode_idx" ON "classrooms"("joinCode");

-- CreateIndex
CREATE INDEX "classrooms_studyArm_idx" ON "classrooms"("studyArm");

-- CreateIndex
CREATE INDEX "classrooms_institutionId_idx" ON "classrooms"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_campusId_grade_shift_section_year_key" ON "classrooms"("campusId", "grade", "shift", "section", "year");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_institutionId_idx" ON "users"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_userId_key" ON "student_profiles"("userId");

-- CreateIndex
CREATE INDEX "student_profiles_classroomId_idx" ON "student_profiles"("classroomId");

-- CreateIndex
CREATE INDEX "student_profiles_isUnlocked_idx" ON "student_profiles"("isUnlocked");

-- CreateIndex
CREATE INDEX "student_profiles_institutionId_idx" ON "student_profiles"("institutionId");

-- CreateIndex
CREATE INDEX "classroom_assignments_classroomId_role_idx" ON "classroom_assignments"("classroomId", "role");

-- CreateIndex
CREATE INDEX "classroom_assignments_institutionId_idx" ON "classroom_assignments"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "classroom_assignments_userId_classroomId_role_key" ON "classroom_assignments"("userId", "classroomId", "role");

-- CreateIndex
CREATE INDEX "consent_records_studentProfileId_status_idx" ON "consent_records"("studentProfileId", "status");

-- CreateIndex
CREATE INDEX "consent_records_status_expiresAt_idx" ON "consent_records"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "consent_records_institutionId_idx" ON "consent_records"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "learning_paths_slug_key" ON "learning_paths"("slug");

-- CreateIndex
CREATE INDEX "learning_paths_grade_idx" ON "learning_paths"("grade");

-- CreateIndex
CREATE UNIQUE INDEX "axes_code_key" ON "axes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "activities_slug_key" ON "activities"("slug");

-- CreateIndex
CREATE INDEX "activities_learningPathId_orderIndex_idx" ON "activities"("learningPathId", "orderIndex");

-- CreateIndex
CREATE INDEX "activities_axisId_idx" ON "activities"("axisId");

-- CreateIndex
CREATE INDEX "activities_pisaCompetence_idx" ON "activities"("pisaCompetence");

-- CreateIndex
CREATE INDEX "activities_isPublished_idx" ON "activities"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "attempts_clientAttemptId_key" ON "attempts"("clientAttemptId");

-- CreateIndex
CREATE INDEX "attempts_studentProfileId_completedAt_idx" ON "attempts"("studentProfileId", "completedAt");

-- CreateIndex
CREATE INDEX "attempts_activityId_idx" ON "attempts"("activityId");

-- CreateIndex
CREATE INDEX "attempts_mode_idx" ON "attempts"("mode");

-- CreateIndex
CREATE INDEX "attempts_independentVerification_idx" ON "attempts"("independentVerification");

-- CreateIndex
CREATE INDEX "attempts_institutionId_idx" ON "attempts"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_events_clientEventId_key" ON "attempt_events"("clientEventId");

-- CreateIndex
CREATE INDEX "attempt_events_attemptId_occurredAt_idx" ON "attempt_events"("attemptId", "occurredAt");

-- CreateIndex
CREATE INDEX "attempt_events_type_occurredAt_idx" ON "attempt_events"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "attempt_events_institutionId_idx" ON "attempt_events"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "metacognition_responses_attemptId_key" ON "metacognition_responses"("attemptId");

-- CreateIndex
CREATE INDEX "metacognition_responses_institutionId_idx" ON "metacognition_responses"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "llm_interactions_attemptId_key" ON "llm_interactions"("attemptId");

-- CreateIndex
CREATE INDEX "llm_interactions_studentProfileId_startedAt_idx" ON "llm_interactions"("studentProfileId", "startedAt");

-- CreateIndex
CREATE INDEX "llm_interactions_flaggedRisk_idx" ON "llm_interactions"("flaggedRisk");

-- CreateIndex
CREATE INDEX "llm_interactions_answerLeaksDetected_idx" ON "llm_interactions"("answerLeaksDetected");

-- CreateIndex
CREATE INDEX "llm_interactions_institutionId_idx" ON "llm_interactions"("institutionId");

-- CreateIndex
CREATE INDEX "llm_turns_intentClass_idx" ON "llm_turns"("intentClass");

-- CreateIndex
CREATE INDEX "llm_turns_institutionId_idx" ON "llm_turns"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "llm_turns_interactionId_turnIndex_key" ON "llm_turns"("interactionId", "turnIndex");

-- CreateIndex
CREATE INDEX "token_budgets_isExhausted_idx" ON "token_budgets"("isExhausted");

-- CreateIndex
CREATE INDEX "token_budgets_institutionId_idx" ON "token_budgets"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "token_budgets_studentProfileId_period_key" ON "token_budgets"("studentProfileId", "period");

-- CreateIndex
CREATE INDEX "mastery_scores_axisCode_level_idx" ON "mastery_scores"("axisCode", "level");

-- CreateIndex
CREATE INDEX "mastery_scores_institutionId_idx" ON "mastery_scores"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "mastery_scores_studentProfileId_pisaCompetence_key" ON "mastery_scores"("studentProfileId", "pisaCompetence");

-- CreateIndex
CREATE UNIQUE INDEX "badges_slug_key" ON "badges"("slug");

-- CreateIndex
CREATE INDEX "student_badges_institutionId_idx" ON "student_badges"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "student_badges_studentProfileId_badgeId_key" ON "student_badges"("studentProfileId", "badgeId");

-- CreateIndex
CREATE INDEX "teacher_alerts_classroomId_status_severity_idx" ON "teacher_alerts"("classroomId", "status", "severity");

-- CreateIndex
CREATE INDEX "teacher_alerts_code_createdAt_idx" ON "teacher_alerts"("code", "createdAt");

-- CreateIndex
CREATE INDEX "teacher_alerts_studentProfileId_status_idx" ON "teacher_alerts"("studentProfileId", "status");

-- CreateIndex
CREATE INDEX "teacher_alerts_institutionId_idx" ON "teacher_alerts"("institutionId");

-- CreateIndex
CREATE INDEX "classroom_summaries_computedAt_idx" ON "classroom_summaries"("computedAt");

-- CreateIndex
CREATE INDEX "classroom_summaries_institutionId_idx" ON "classroom_summaries"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "classroom_summaries_classroomId_window_key" ON "classroom_summaries"("classroomId", "window");

-- CreateIndex
CREATE INDEX "audit_log_actorId_occurredAt_idx" ON "audit_log"("actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_log_targetType_targetId_idx" ON "audit_log"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "audit_log_action_occurredAt_idx" ON "audit_log"("action", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_log_institutionId_idx" ON "audit_log"("institutionId");

-- AddForeignKey
ALTER TABLE "campuses" ADD CONSTRAINT "campuses_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_assignments" ADD CONSTRAINT "classroom_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_assignments" ADD CONSTRAINT "classroom_assignments_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_assignments" ADD CONSTRAINT "classroom_assignments_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "learning_paths"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_axisId_fkey" FOREIGN KEY ("axisId") REFERENCES "axes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_events" ADD CONSTRAINT "attempt_events_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_events" ADD CONSTRAINT "attempt_events_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metacognition_responses" ADD CONSTRAINT "metacognition_responses_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metacognition_responses" ADD CONSTRAINT "metacognition_responses_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_interactions" ADD CONSTRAINT "llm_interactions_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_interactions" ADD CONSTRAINT "llm_interactions_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_interactions" ADD CONSTRAINT "llm_interactions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_turns" ADD CONSTRAINT "llm_turns_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "llm_interactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_turns" ADD CONSTRAINT "llm_turns_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_budgets" ADD CONSTRAINT "token_budgets_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_budgets" ADD CONSTRAINT "token_budgets_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mastery_scores" ADD CONSTRAINT "mastery_scores_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mastery_scores" ADD CONSTRAINT "mastery_scores_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mastery_scores" ADD CONSTRAINT "mastery_scores_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_badges" ADD CONSTRAINT "student_badges_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_badges" ADD CONSTRAINT "student_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_badges" ADD CONSTRAINT "student_badges_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_alerts" ADD CONSTRAINT "teacher_alerts_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_alerts" ADD CONSTRAINT "teacher_alerts_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_alerts" ADD CONSTRAINT "teacher_alerts_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_alerts" ADD CONSTRAINT "teacher_alerts_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_summaries" ADD CONSTRAINT "classroom_summaries_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_summaries" ADD CONSTRAINT "classroom_summaries_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
