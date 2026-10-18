// =============================================================================
// Puerto LLMProvider (ADR-010).
//
// El dominio no conoce a Anthropic: conoce esta interfaz. Cambiar de proveedor
// no toca el cliente ni el servicio del tutor.
// =============================================================================

import Anthropic from '@anthropic-ai/sdk';
import { config, llmMode } from '../../config.js';

export interface CompletionRequest {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface LLMProvider {
  readonly available: boolean;
  complete(req: CompletionRequest): Promise<CompletionResult>;
  classify(system: string, input: string): Promise<string>;
}

// ── Proveedor real ────────────────────────────────────────────────────────────

class AnthropicProvider implements LLMProvider {
  readonly available = true;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const started = Date.now();
    const res = await this.client.messages.create(
      {
        model: config.TUTOR_MODEL,
        max_tokens: req.maxTokens ?? config.TUTOR_MAX_TOKENS,
        temperature: req.temperature ?? config.TUTOR_TEMPERATURE,
        system: req.system,
        messages: req.messages,
      },
      { timeout: config.TUTOR_TIMEOUT_MS },
    );

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    return {
      text,
      model: res.model,
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      latencyMs: Date.now() - started,
    };
  }

  /** Clasificación de etiqueta única. Modelo barato, temperatura 0 (ADR-006). */
  async classify(system: string, input: string): Promise<string> {
    const res = await this.client.messages.create(
      {
        model: config.CLASSIFIER_MODEL,
        max_tokens: 10,
        temperature: 0,
        system,
        messages: [{ role: 'user', content: input }],
      },
      { timeout: 3000 },
    );

    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
      .toLowerCase();
  }
}

// ── Proveedor de demostración ─────────────────────────────────────────────────

/** No hace ninguna llamada de red.
 *
 *  El servicio del tutor NUNCA usa este proveedor para generar el diálogo: con
 *  `llmMode === 'mock'` sirve directamente el árbol socrático pregrabado. Esta
 *  clase existe para que la ruta de código sea la misma y para que un fallo de
 *  configuración no termine en una excepción frente a un niño.
 */
class MockProvider implements LLMProvider {
  readonly available = false;

  async complete(): Promise<CompletionResult> {
    throw new Error(
      'MOCK_LLM activo: el diálogo debe servirse desde el árbol pregrabado, ' +
        'no desde el proveedor.',
    );
  }

  /** En modo demostración el clasificador es conservador por diseño: ante la
   *  duda no puede consultar a nadie, así que devuelve la etiqueta neutra y
   *  deja que la moderación determinística haga el trabajo. */
  async classify(): Promise<string> {
    return 'normal';
  }
}

export const llmProvider: LLMProvider =
  llmMode === 'live'
    ? new AnthropicProvider(config.ANTHROPIC_API_KEY!)
    : new MockProvider();
