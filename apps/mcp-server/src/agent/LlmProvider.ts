/**
 * Provider adapter boundary for the UC-04 agent (FR-13).
 *
 * The orchestrator talks only to this interface. `GeminiProvider` is the real implementation;
 * `FakeProvider` is for unit/integration tests and must never be reported as the real UC-04
 * acceptance run (API Contract §3.3, AC-04.11).
 */

/** JSON-schema style function declaration handed to the model. Never contains identity fields. */
export interface LlmToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface LlmFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface LlmFunctionResult {
  name: string;
  /** Already PII-scrubbed tool output (or a short error description). */
  response: unknown;
}

/** One turn of the conversation as seen by the provider. */
export type LlmTurn =
  | { role: 'user'; text: string }
  | { role: 'model'; text?: string; functionCalls?: LlmFunctionCall[] }
  | { role: 'tool'; results: LlmFunctionResult[] };

export interface LlmRequest {
  systemInstruction: string;
  turns: LlmTurn[];
  tools: LlmToolDeclaration[];
}

export interface LlmResponse {
  /** Tool calls the model wants executed next. Empty when it answers in text. */
  functionCalls: LlmFunctionCall[];
  text?: string;
}

export interface LlmProvider {
  /** Short identifier written to the outbound log, e.g. `gemini` or `fake`. */
  readonly name: string;
  /** True for test doubles. Surfaced in logs so a fake run can never pass as a real one. */
  readonly isFake: boolean;
  generate(request: LlmRequest, signal?: AbortSignal): Promise<LlmResponse>;
}

export class LlmProviderError extends Error {
  constructor(
    message: string,
    public readonly kind: 'config' | 'http' | 'timeout' | 'malformed' = 'http'
  ) {
    super(message);
    this.name = 'LlmProviderError';
  }
}
