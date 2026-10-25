import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';

// Un solo .env, en la raíz del monorepo. Se resuelve desde la ubicación de
// ESTE módulo y no desde process.cwd(): el proceso arranca en apps/api cuando
// lo lanza pnpm --filter, y buscar por cwd fallaría en silencio.
const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, '../../../../.env') });

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_SECRET: z.string().min(16),

  MOCK_LLM: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  ANTHROPIC_API_KEY: z.string().optional(),

  // ADR-006. «claude-sonnet-4.6» no existe; el brief lo especificaba por error.
  TUTOR_MODEL: z.string().default('claude-sonnet-5'),
  CLASSIFIER_MODEL: z.string().default('claude-haiku-4-5-20251001'),

  TUTOR_TEMPERATURE: z.coerce.number().default(0.4),
  TUTOR_MAX_TOKENS: z.coerce.number().default(200),
  TUTOR_TIMEOUT_MS: z.coerce.number().default(8000),

  STUDENT_MONTHLY_TOKEN_LIMIT: z.coerce.number().default(60000),
  TUTOR_TURNS_PER_MINUTE: z.coerce.number().default(8),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Configuración inválida:\n', parsed.error.flatten().fieldErrors);
  console.error('\n¿Copiaste .env.example a .env?');
  process.exit(1);
}

export const config = parsed.data;

/** Modo de operación efectivo del tutor. Sin API key no se intenta la llamada:
 *  arrancar y fallar en el primer turno frente a un niño sería peor que
 *  degradar desde el inicio (US-12). */
export const llmMode: 'mock' | 'live' =
  config.MOCK_LLM || !config.ANTHROPIC_API_KEY ? 'mock' : 'live';

if (llmMode === 'mock') {
  console.log(
    '[tutor] MODO DEMOSTRACIÓN: el tutor responde desde los árboles socráticos\n' +
      '        pregrabados. Sin llamadas de red, sin costo de tokens.',
  );
}
