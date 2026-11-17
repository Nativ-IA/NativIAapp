// =============================================================================
// Proveedor del MODELO PROPIO de Nati (Qwen3.5-2B + LoRA).
//
// Habla con llama-server por su API compatible con OpenAI
// (POST {NATI_MODEL_URL}/v1/chat/completions). No usa el SDK de Anthropic:
// el modelo corre en nuestro Cloud Run, y lo que el niño escribe no sale de
// nuestra infraestructura en este paso. Ver deploy/nati-model/README.md.
//
// Implementa la misma interfaz LLMProvider para que el módulo nati no conozca
// la diferencia entre un modelo propio y uno externo.
// =============================================================================

import { config } from '../../shared/config.js';
import type { CompletionRequest, CompletionResult, LLMProvider } from './llm-provider.js';

export class OwnModelProvider implements LLMProvider {
  readonly available = true;

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey?: string,
  ) {}

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.NATI_MODEL_TIMEOUT_MS);

    try {
      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: 'nati',
          messages: [{ role: 'system', content: req.system }, ...req.messages],
          max_tokens: req.maxTokens ?? config.NATI_MODEL_MAX_TOKENS,
          temperature: req.temperature ?? config.NATI_MODEL_TEMPERATURE,
          top_p: 0.8,
          // Qwen3.5 puede «pensar» antes de responder; el modelo de Nati se
          // entrenó sin razonamiento y así se le pide.
          chat_template_kwargs: { enable_thinking: false },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`modelo propio respondió ${res.status}`);
      }

      const data = (await res.json()) as {
        model?: string;
        choices: Array<{ message: { content: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      // Por si el servidor devolviera el razonamiento en el texto.
      const text = (data.choices[0]?.message.content ?? '')
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .trim();

      return {
        text,
        model: data.model ?? 'nati-qwen3.5-2b-lora',
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        latencyMs: Date.now() - started,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /** El modelo propio no clasifica: para eso está el verificador externo. */
  async classify(): Promise<string> {
    return 'normal';
  }
}
