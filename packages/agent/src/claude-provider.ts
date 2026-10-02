import { z } from 'zod';
import { ProviderFailure, type ModelProvider, type ModelRequest } from './model-provider.js';
const Envelope = z.object({ stop_reason: z.literal('end_turn'), content: z.array(z.object({ type: z.literal('text'), text: z.string() })).length(1) });
export class ClaudeProvider implements ModelProvider {
  readonly name = 'claude';
  constructor(private readonly key: string, readonly model = 'claude-sonnet-4-6', private readonly transport: typeof fetch = fetch) {}
  async propose(request: ModelRequest, signal: AbortSignal): Promise<unknown> {
    try {
      const response = await this.transport('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: AbortSignal.any([signal, AbortSignal.timeout(45000)]),
        headers: { 'Content-Type': 'application/json', 'x-api-key': this.key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: this.model, max_tokens: 4096, system: request.system,
          messages: [{ role: 'user', content: request.context }], output_config: { format: { type: 'json_schema', schema: request.schema } } }),
      });
      if (!response.ok || !response.body) throw new ProviderFailure('PROVIDER_UNAVAILABLE', response.status);
      const reader = response.body.getReader(); let bytes = 0; const chunks: Uint8Array[] = [];
      try { while (true) { const part = await reader.read(); if (part.done) break;
        bytes += part.value.byteLength; if (bytes > 262144) throw new ProviderFailure('MODEL_OUTPUT_INVALID'); chunks.push(part.value);
      } } finally { await reader.cancel(); }
      const envelope = Envelope.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      return JSON.parse(envelope.content[0]!.text) as unknown;
    } catch (error) {
      if (signal.aborted) throw error;
      if (error instanceof ProviderFailure) throw error;
      throw new ProviderFailure(error instanceof z.ZodError || error instanceof SyntaxError ? 'MODEL_OUTPUT_INVALID' : 'PROVIDER_UNAVAILABLE');
    }
  }
}
