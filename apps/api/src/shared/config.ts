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

  // Rama de Neon con pooler. Si todavía dice file:..., es el .env de SQLite.
  DATABASE_URL: z
    .string({ required_error: 'Falta DATABASE_URL (la cadena de Neon con pooler)' })
    .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL debe ser la cadena de Neon: postgresql://...'),

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

  // Modelo propio de Nati (modo ayudante): Qwen3.5-2B + LoRA servido por
  // llama-server (API compatible con OpenAI). Sin URL, Nati responde desde las
  // preguntas frecuentes pregrabadas. Ver deploy/nati-model/README.md.
  NATI_MODEL_URL: z.string().url().optional(),
  NATI_MODEL_API_KEY: z.string().optional(),
  NATI_MODEL_TEMPERATURE: z.coerce.number().default(0.3),
  NATI_MODEL_MAX_TOKENS: z.coerce.number().default(160),
  NATI_MODEL_TIMEOUT_MS: z.coerce.number().default(20000),

  // Verificador de Nati: revisa cada respuesta del modelo propio antes de
  // mostrarla.
  //   anthropic → CLASSIFIER_MODEL con ANTHROPIC_API_KEY (y MOCK_LLM=false)
  //   vertex    → Gemini en Vertex AI con la identidad del servicio de Cloud
  //               Run: sin clave, y se cobra al proyecto de Google Cloud
  //   none      → sin verificador (solo para desarrollo)
  NATI_VERIFIER: z.enum(['anthropic', 'vertex', 'none']).default('anthropic'),
  VERTEX_PROJECT: z.string().optional(),
  VERTEX_LOCATION: z.string().default('global'),
  VERTEX_VERIFIER_MODEL: z.string().default('gemini-3.5-flash-lite'),
  NATI_VERIFIER_TIMEOUT_MS: z.coerce.number().default(5000),

  // Opcionales: si están, el panel de administración estima el costo del mes.
  // Dólares por millón de tokens, según la tarifa vigente del modelo del tutor.
  PRECIO_USD_MTOK_ENTRADA: z.coerce.number().optional(),
  PRECIO_USD_MTOK_SALIDA: z.coerce.number().optional(),
  TUTOR_TURNS_PER_MINUTE: z.coerce.number().default(8),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Configuración inválida:\n', parsed.error.flatten().fieldErrors);
  console.error('\n¿Copiaste .env.example a .env?');
  process.exit(1);
}

export const config = parsed.data;

// El esquema declara directUrl = env("DATABASE_URL_UNPOOLED"), que solo usan
// las migraciones. En Cloud Run no hace falta configurarla: se cae a la URL con
// pooler para que el cliente de Prisma no la eche de menos.
process.env.DATABASE_URL_UNPOOLED ??= config.DATABASE_URL;

/** Modo de operación efectivo del tutor. Sin API key no se intenta la llamada:
 *  arrancar y fallar en el primer turno frente a un niño sería peor que
 *  degradar desde el inicio (US-12). */
export const llmMode: 'mock' | 'live' =
  config.MOCK_LLM || !config.ANTHROPIC_API_KEY ? 'mock' : 'live';

/** Modo del asistente Nati: modelo propio si hay URL, si no, preguntas
 *  frecuentes pregrabadas. Es independiente de MOCK_LLM: el modelo propio no
 *  cuesta tokens de un proveedor externo. */
export const natiMode: 'faq' | 'own_model' = config.NATI_MODEL_URL ? 'own_model' : 'faq';

if (config.NATI_VERIFIER === 'vertex' && !config.VERTEX_PROJECT) {
  console.error('NATI_VERIFIER=vertex necesita VERTEX_PROJECT (el id del proyecto de Google Cloud).');
  process.exit(1);
}

/** Verificador efectivo de Nati. Con 'anthropic' solo hay verificador si el
 *  proveedor de Anthropic está en vivo. */
export const natiVerifierMode: 'anthropic' | 'vertex' | 'none' =
  config.NATI_VERIFIER === 'anthropic' && llmMode !== 'live' ? 'none' : config.NATI_VERIFIER;

if (llmMode === 'mock') {
  console.log(
    '[tutor] MODO DEMOSTRACIÓN: el tutor responde desde los árboles socráticos\n' +
      '        pregrabados. Sin llamadas de red, sin costo de tokens.',
  );
}
