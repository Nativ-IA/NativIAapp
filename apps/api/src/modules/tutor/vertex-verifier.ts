// =============================================================================
// Verificador de Nati con Gemini en Vertex AI.
//
// Alternativa al clasificador de Anthropic para revisar las respuestas del
// modelo propio. No usa clave: en Cloud Run pide un token de acceso al servidor
// de metadatos con la identidad del servicio (necesita el rol
// roles/aiplatform.user). El uso se cobra al proyecto de Google Cloud, así que
// en la prueba gratuita sale de los créditos. Vertex AI no usa los datos de
// los clientes para entrenar sus modelos.
//
// Habla con el endpoint compatible con OpenAI de Vertex. Solo clasifica: la
// conversación la genera el modelo propio.
// =============================================================================

import { config } from '../../shared/config.js';
import type { CompletionResult, LLMProvider } from './llm-provider.js';

const METADATA_TOKEN_URL =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

export class VertexVerifierProvider implements LLMProvider {
  readonly available = true;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly project: string,
    private readonly location: string,
    private readonly model: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  endpoint(): string {
    const host =
      this.location === 'global'
        ? 'aiplatform.googleapis.com'
        : `${this.location}-aiplatform.googleapis.com`;
    return `https://${host}/v1/projects/${this.project}/locations/${this.location}/endpoints/openapi/chat/completions`;
  }

  private async accessToken(): Promise<string> {
    // Se reutiliza hasta un minuto antes de que venza (duran ~1 hora).
    if (this.token && Date.now() < this.token.expiresAt - 60_000) return this.token.value;
    const res = await this.fetchImpl(METADATA_TOKEN_URL, {
      headers: { 'Metadata-Flavor': 'Google' },
    });
    if (!res.ok) throw new Error(`servidor de metadatos respondió ${res.status}`);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return data.access_token;
  }

  async complete(): Promise<CompletionResult> {
    throw new Error('El verificador de Vertex solo clasifica.');
  }

  /** Etiqueta única, temperatura 0. Devuelve el texto en minúsculas. */
  async classify(system: string, input: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.NATI_VERIFIER_TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(this.endpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await this.accessToken()}`,
        },
        body: JSON.stringify({
          model: `google/${this.model}`,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: input },
          ],
          temperature: 0,
          max_tokens: 50,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Vertex respondió ${res.status}`);
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      return (data.choices?.[0]?.message?.content ?? '').trim().toLowerCase();
    } finally {
      clearTimeout(timer);
    }
  }
}
