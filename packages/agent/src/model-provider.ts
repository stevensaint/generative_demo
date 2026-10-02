export interface ModelRequest { system: string; context: string; schema: Record<string, unknown>; }
export interface ModelProvider {
  readonly name: string; readonly model: string;
  propose(request: ModelRequest, signal: AbortSignal): Promise<unknown>;
}
export class ProviderFailure extends Error { constructor(readonly code: 'PROVIDER_UNAVAILABLE' | 'MODEL_OUTPUT_INVALID', readonly httpStatus?: number) { super(code); } }
