import {
  LlmProviderError,
  type LlmFunctionCall,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
  type LlmToolDeclaration,
  type LlmTurn,
} from './LlmProvider.js';

/**
 * Real Gemini provider over the public REST API (`generateContent`), using `fetch`: no SDK, no new
 * npm package. The API key travels only in the `x-goog-api-key` header; it is never part of the URL,
 * the request body, the outbound log or an error message.
 *
 * Model default is configurable (`GEMINI_MODEL`). On 2026-11-21 a new free-tier key got HTTP 404 for
 * `gemini-2.0-flash`, `gemini-2.5-flash` and `gemini-2.5-flash-lite` (no longer offered) although the
 * models list still showed them, and 503 "high demand" for `gemini-3.8-flash`. The default
 * `gemini-3.5-flash-lite` answered tool calls in about 0.7 s. Re-check before the demo.
 *
 * Gemini 3 models attach a `thoughtSignature` to function calls; it is kept on `LlmFunctionCall` and
 * sent back unchanged, otherwise the next round fails with HTTP 400.
 */

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
/** Extra attempts after a transient HTTP status (503/429/500/502/504), all inside the one timeout. */
export const DEFAULT_GEMINI_MAX_RETRIES = 2;
export const DEFAULT_GEMINI_RETRY_DELAY_MS = 500;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
export const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const DEFAULT_GEMINI_TIMEOUT_MS = 15_000;

const KEY_PLACEHOLDERS = new Set(['', 'your-gemini-api-key-here']);

export interface GeminiProviderOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  /** Overall limit of one `generate` call, retries included. */
  timeoutMs?: number;
  /** Extra attempts after a transient HTTP status. Default 2; 0 disables retrying. */
  maxRetries?: number;
  /** Base delay before a retry; doubles per attempt (500, 1000 ms). */
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
}

/** Resolves after `ms`, or rejects as soon as `signal` aborts. */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('aborted'));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('aborted'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/** Gemini accepts an OpenAPI subset; anything else (pattern, default, additionalProperties) is dropped. */
const ALLOWED_SCHEMA_KEYS = new Set([
  'type',
  'description',
  'enum',
  'format',
  'items',
  'properties',
  'required',
  'nullable',
]);

function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map(toGeminiSchema);
  }
  if (schema === null || typeof schema !== 'object') {
    return schema;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (key === 'properties' && value !== null && typeof value === 'object') {
      // Property names are user-defined, so only the property *schemas* are filtered.
      out.properties = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([name, child]) => [name, toGeminiSchema(child)])
      );
    } else if (ALLOWED_SCHEMA_KEYS.has(key)) {
      out[key] = toGeminiSchema(value);
    }
  }
  return out;
}

function toFunctionDeclaration(tool: LlmToolDeclaration) {
  const hasProperties = Object.keys(tool.parameters.properties).length > 0;
  return {
    name: tool.name,
    description: tool.description,
    ...(hasProperties ? { parameters: toGeminiSchema(tool.parameters) } : {}),
  };
}

/** Gemini requires `functionResponse.response` to be a JSON object. */
function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { result: value };
}

function toContents(turns: LlmTurn[]) {
  return turns.map((turn) => {
    if (turn.role === 'user') {
      return { role: 'user', parts: [{ text: turn.text }] };
    }
    if (turn.role === 'model') {
      const parts: unknown[] = [];
      if (turn.text) {
        parts.push({ text: turn.text });
      }
      for (const call of turn.functionCalls ?? []) {
        // Gemini 3 models require the signature of a function call part to be echoed back.
        parts.push({
          functionCall: { name: call.name, args: call.args },
          ...(call.thoughtSignature ? { thoughtSignature: call.thoughtSignature } : {}),
        });
      }
      return { role: 'model', parts };
    }
    return {
      role: 'user',
      parts: turn.results.map((result) => ({
        functionResponse: { name: result.name, response: asObject(result.response) },
      })),
    };
  });
}

export function buildGeminiBody(request: LlmRequest): Record<string, unknown> {
  return {
    systemInstruction: { parts: [{ text: request.systemInstruction }] },
    contents: toContents(request.turns),
    ...(request.tools.length > 0
      ? { tools: [{ functionDeclarations: request.tools.map(toFunctionDeclaration) }] }
      : {}),
    generationConfig: { temperature: 0.2 },
  };
}

export class GeminiProvider implements LlmProvider {
  public readonly name = 'gemini';
  public readonly isFake = false;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GeminiProviderOptions) {
    if (KEY_PLACEHOLDERS.has(options.apiKey?.trim() ?? '')) {
      throw new LlmProviderError('GEMINI_API_KEY is missing or still a placeholder.', 'config');
    }
    this.apiKey = options.apiKey.trim();
    this.model = options.model?.trim() || DEFAULT_GEMINI_MODEL;
    this.baseUrl = (options.baseUrl ?? DEFAULT_GEMINI_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? DEFAULT_GEMINI_TIMEOUT_MS;
    this.maxRetries = Math.max(0, options.maxRetries ?? DEFAULT_GEMINI_MAX_RETRIES);
    this.retryDelayMs = Math.max(0, options.retryDelayMs ?? DEFAULT_GEMINI_RETRY_DELAY_MS);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  public async generate(request: LlmRequest, signal?: AbortSignal): Promise<LlmResponse> {
    const timeout = AbortSignal.timeout(this.timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const url = `${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent`;

    const body = JSON.stringify(buildGeminiBody(request));

    let response: Response | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        response = await this.fetchImpl(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
          body,
          signal: combined,
        });
      } catch (err: unknown) {
        if (timeout.aborted) {
          throw new LlmProviderError(`Gemini request timed out after ${this.timeoutMs} ms.`, 'timeout');
        }
        if (signal?.aborted) {
          throw new LlmProviderError('Gemini request was cancelled.', 'timeout');
        }
        throw new LlmProviderError(
          `Gemini request failed: ${err instanceof Error ? err.name : 'network error'}.`,
          'http'
        );
      }

      // Transient overload (e.g. 503 "high demand"): wait and try again, bounded by the one timeout.
      if (!RETRYABLE_STATUS.has(response.status) || attempt === this.maxRetries) {
        break;
      }
      await response.body?.cancel().catch(() => {});
      try {
        await sleep(this.retryDelayMs * 2 ** attempt, combined);
      } catch {
        if (timeout.aborted) {
          throw new LlmProviderError(`Gemini request timed out after ${this.timeoutMs} ms.`, 'timeout');
        }
        throw new LlmProviderError('Gemini request was cancelled.', 'timeout');
      }
    }

    if (!response || !response.ok) {
      // Status only: the response body is not copied into errors or logs.
      throw new LlmProviderError(`Gemini API answered HTTP ${response?.status ?? 0}.`, 'http');
    }

    let payload: any;
    try {
      payload = await response.json();
    } catch {
      throw new LlmProviderError('Gemini API returned a non-JSON body.', 'malformed');
    }

    const parts: any[] = payload?.candidates?.[0]?.content?.parts ?? [];
    if (!Array.isArray(parts) || parts.length === 0) {
      const reason = payload?.candidates?.[0]?.finishReason ?? payload?.promptFeedback?.blockReason;
      throw new LlmProviderError(`Gemini returned no content${reason ? ` (${String(reason)})` : ''}.`, 'malformed');
    }

    const functionCalls: LlmFunctionCall[] = parts
      .filter((part) => part?.functionCall && typeof part.functionCall.name === 'string')
      .map((part) => ({
        name: part.functionCall.name as string,
        args: (part.functionCall.args ?? {}) as Record<string, unknown>,
        ...(typeof part.thoughtSignature === 'string' && part.thoughtSignature.length > 0
          ? { thoughtSignature: part.thoughtSignature as string }
          : {}),
      }));
    const text = parts
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();

    return { functionCalls, ...(text ? { text } : {}) };
  }
}

/**
 * Builds the real provider from the environment, or returns `undefined` when no usable key is set.
 * Callers must then run without an agent (or with an explicit FakeProvider in tests), never pretend.
 */
export function createGeminiProviderFromEnv(
  env: Record<string, string | undefined> = process.env
): GeminiProvider | undefined {
  const apiKey = env.GEMINI_API_KEY?.trim() ?? '';
  if (KEY_PLACEHOLDERS.has(apiKey)) {
    return undefined;
  }
  const timeout = Number(env.GEMINI_TIMEOUT_MS);
  return new GeminiProvider({
    apiKey,
    model: env.GEMINI_MODEL,
    baseUrl: env.GEMINI_BASE_URL,
    timeoutMs: Number.isInteger(timeout) && timeout > 0 ? timeout : undefined,
  });
}
