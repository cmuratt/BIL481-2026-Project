/**
 * GeminiProvider against a stubbed `fetch`. No network, no API key: this proves request shape,
 * response parsing and error handling, NOT that the live Gemini run works (AC-04.11 stays open until
 * a real key is used).
 */

import { describe, expect, it } from 'vitest';
import { createConnectorRuntime, registerConnectorHandlers } from '../../packages/connectors/src/index.js';
import {
  AgentOrchestrator,
  ToolDispatcher,
  type LlmProvider,
  buildGeminiBody,
  buildToolDeclarations,
  createGeminiProviderFromEnv,
  GeminiProvider,
  LlmProviderError,
  type LlmRequest,
} from '../../apps/mcp-server/src/index.js';

const API_KEY = 'AIzaSy-TEST-KEY-DO-NOT-LEAK';

const request: LlmRequest = {
  systemInstruction: 'be helpful',
  turns: [
    { role: 'user', text: 'yemekte ne var?' },
    { role: 'model', functionCalls: [{ name: 'get_cafeteria_menu', args: {} }] },
    { role: 'tool', results: [{ name: 'get_cafeteria_menu', response: { data: { available: true } } }] },
  ],
  tools: buildToolDeclarations(),
};

function stubFetch(response: Response | (() => Response | Promise<Response>)) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return typeof response === 'function' ? response() : response;
  }) as typeof fetch;
  return { impl, calls };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('request construction', () => {
  it('maps turns, tools and system instruction to the Gemini REST body', () => {
    const body = buildGeminiBody(request) as any;
    expect(body.systemInstruction.parts[0].text).toBe('be helpful');
    expect(body.contents[0]).toEqual({ role: 'user', parts: [{ text: 'yemekte ne var?' }] });
    expect(body.contents[1]).toEqual({
      role: 'model',
      parts: [{ functionCall: { name: 'get_cafeteria_menu', args: {} } }],
    });
    expect(body.contents[2].role).toBe('user');
    expect(body.contents[2].parts[0].functionResponse.name).toBe('get_cafeteria_menu');
    expect(body.tools[0].functionDeclarations.map((d: any) => d.name)).toHaveLength(4);
  });

  it('strips JSON-schema keys Gemini rejects and keeps enums', () => {
    const body = buildGeminiBody(request) as any;
    const declarations = body.tools[0].functionDeclarations as any[];
    const cafeteria = declarations.find((d) => d.name === 'get_cafeteria_menu');
    const shuttle = declarations.find((d) => d.name === 'get_shuttle_schedule');
    expect(cafeteria.parameters.properties.date.pattern).toBeUndefined();
    expect(cafeteria.parameters.additionalProperties).toBeUndefined();
    expect(shuttle.parameters.properties.route.enum).toEqual(['MAIN_RING', 'METRO_LINE', 'DORMITORY_LINE']);
  });

  it('declares no studentId anywhere in the serialized body', () => {
    expect(JSON.stringify(buildGeminiBody(request)).toLowerCase()).not.toContain('studentid');
  });

  it('omits tools on a tool-less round and wraps non-object tool results', () => {
    const body = buildGeminiBody({
      ...request,
      tools: [],
      turns: [{ role: 'tool', results: [{ name: 'x', response: [1, 2] }] }],
    }) as any;
    expect(body.tools).toBeUndefined();
    expect(body.contents[0].parts[0].functionResponse.response).toEqual({ result: [1, 2] });
  });
});

describe('GeminiProvider.generate', () => {
  it('sends the key only in the header, never in URL or body', async () => {
    const { impl, calls } = stubFetch(json({ candidates: [{ content: { parts: [{ text: 'merhaba' }] } }] }));
    const provider = new GeminiProvider({ apiKey: API_KEY, model: 'test-model', fetchImpl: impl });
    await provider.generate(request);

    const [call] = calls;
    expect(call!.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent'
    );
    expect((call!.init.headers as Record<string, string>)['x-goog-api-key']).toBe(API_KEY);
    expect(call!.url).not.toContain(API_KEY);
    expect(String(call!.init.body)).not.toContain(API_KEY);
  });

  it('returns text answers', async () => {
    const { impl } = stubFetch(json({ candidates: [{ content: { parts: [{ text: 'Öğle: ' }, { text: 'pilav' }] } }] }));
    const result = await new GeminiProvider({ apiKey: API_KEY, fetchImpl: impl }).generate(request);
    expect(result).toEqual({ functionCalls: [], text: 'Öğle: pilav' });
  });

  it('returns function calls, defaulting missing args to {}', async () => {
    const { impl } = stubFetch(
      json({
        candidates: [
          {
            content: {
              parts: [
                { functionCall: { name: 'get_shuttle_schedule', args: { route: 'MAIN_RING' } } },
                { functionCall: { name: 'get_cafeteria_menu' } },
              ],
            },
          },
        ],
      })
    );
    const result = await new GeminiProvider({ apiKey: API_KEY, fetchImpl: impl }).generate(request);
    expect(result.functionCalls).toEqual([
      { name: 'get_shuttle_schedule', args: { route: 'MAIN_RING' } },
      { name: 'get_cafeteria_menu', args: {} },
    ]);
    expect(result.text).toBeUndefined();
  });

  it('turns HTTP errors into LlmProviderError without leaking the key or response body', async () => {
    const { impl } = stubFetch(json({ error: { message: `bad key ${API_KEY}` } }, 403));
    const provider = new GeminiProvider({ apiKey: API_KEY, fetchImpl: impl });
    const error = await provider.generate(request).catch((err) => err);
    expect(error).toBeInstanceOf(LlmProviderError);
    expect(error.message).toBe('Gemini API answered HTTP 403.');
    expect(error.message).not.toContain(API_KEY);
  });

  it('rejects empty candidates and non-JSON bodies as malformed', async () => {
    const empty = new GeminiProvider({
      apiKey: API_KEY,
      fetchImpl: stubFetch(json({ candidates: [], promptFeedback: { blockReason: 'SAFETY' } })).impl,
    });
    await expect(empty.generate(request)).rejects.toThrow(/no content \(SAFETY\)/);

    const html = new GeminiProvider({
      apiKey: API_KEY,
      fetchImpl: stubFetch(new Response('<html>', { status: 200 })).impl,
    });
    await expect(html.generate(request)).rejects.toMatchObject({ kind: 'malformed' });
  });

  it('reports a timeout distinctly', async () => {
    const hanging = (async (_url: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      })) as typeof fetch;
    const provider = new GeminiProvider({ apiKey: API_KEY, timeoutMs: 20, fetchImpl: hanging });
    await expect(provider.generate(request)).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('is marked as the real (non-fake) provider', () => {
    const provider = new GeminiProvider({ apiKey: API_KEY });
    expect(provider).toMatchObject({ name: 'gemini', isFake: false });
  });
});

describe('configuration', () => {
  it('refuses a missing or placeholder key', () => {
    expect(() => new GeminiProvider({ apiKey: '' })).toThrow(LlmProviderError);
    expect(() => new GeminiProvider({ apiKey: 'your-gemini-api-key-here' })).toThrow(/placeholder/);
  });

  it('createGeminiProviderFromEnv returns undefined without a usable key, never a fake', () => {
    expect(createGeminiProviderFromEnv({})).toBeUndefined();
    expect(createGeminiProviderFromEnv({ GEMINI_API_KEY: 'your-gemini-api-key-here' })).toBeUndefined();
    expect(createGeminiProviderFromEnv({ GEMINI_API_KEY: API_KEY, GEMINI_MODEL: 'm' })).toBeInstanceOf(GeminiProvider);
  });
});

describe('thoughtSignature round trip (Gemini 3)', () => {
  const SIGNATURE = 'c2lnbmF0dXJlLWJsb2I=';

  it('keeps the signature of a returned function call', async () => {
    const { impl } = stubFetch(
      json({
        candidates: [
          {
            content: {
              parts: [{ functionCall: { name: 'get_cafeteria_menu', args: {} }, thoughtSignature: SIGNATURE }],
            },
          },
        ],
      })
    );
    const result = await new GeminiProvider({ apiKey: API_KEY, fetchImpl: impl }).generate(request);
    expect(result.functionCalls).toEqual([
      { name: 'get_cafeteria_menu', args: {}, thoughtSignature: SIGNATURE },
    ]);
  });

  it('sends the signature back in the same part as the function call', () => {
    const body = buildGeminiBody({
      ...request,
      turns: [
        { role: 'user', text: 'yemekte ne var?' },
        {
          role: 'model',
          functionCalls: [
            { name: 'get_cafeteria_menu', args: {}, thoughtSignature: SIGNATURE },
            { name: 'get_shuttle_schedule', args: {} },
          ],
        },
      ],
    }) as any;
    expect(body.contents[1].parts).toEqual([
      { functionCall: { name: 'get_cafeteria_menu', args: {} }, thoughtSignature: SIGNATURE },
      { functionCall: { name: 'get_shuttle_schedule', args: {} } },
    ]);
  });

  it('survives an orchestrator round: tool call with signature, then the answer request', async () => {
    const requests: LlmRequest[] = [];
    const scripted: LlmProvider = {
      name: 'fake',
      isFake: true,
      async generate(req) {
        requests.push(req);
        return requests.length === 1
          ? { functionCalls: [{ name: 'get_cafeteria_menu', args: {}, thoughtSignature: SIGNATURE }] }
          : { functionCalls: [], text: 'Etli Kuru Fasulye var.' };
      },
    };
    const dispatcher = new ToolDispatcher();
    registerConnectorHandlers(dispatcher, createConnectorRuntime({ env: {} }));
    const agent = new AgentOrchestrator(dispatcher, { provider: scripted });
    for await (const _event of agent.run('Bugün yemekte ne var?', { role: 'GUEST' })) {
      // drain
    }
    const second = requests[1]!;
    const modelTurn = second.turns.find((turn) => turn.role === 'model') as any;
    expect(modelTurn.functionCalls[0].thoughtSignature).toBe(SIGNATURE);
    const wire = buildGeminiBody(second) as any;
    expect(wire.contents[1].parts[0].thoughtSignature).toBe(SIGNATURE);
  });
});

describe('retry on transient overload', () => {
  const ok = () => json({ candidates: [{ content: { parts: [{ text: 'tamam' }] } }] });
  const busy = () => json({ error: { message: 'high demand' } }, 503);

  function sequence(responses: Array<() => Response>) {
    const calls: number[] = [];
    const impl = (async () => {
      calls.push(Date.now());
      return responses[Math.min(calls.length - 1, responses.length - 1)]!();
    }) as typeof fetch;
    return { impl, calls };
  }

  it('retries a 503 and returns the later success', async () => {
    const { impl, calls } = sequence([busy, busy, ok]);
    const provider = new GeminiProvider({ apiKey: API_KEY, fetchImpl: impl, retryDelayMs: 1 });
    await expect(provider.generate(request)).resolves.toEqual({ functionCalls: [], text: 'tamam' });
    expect(calls).toHaveLength(3);
  });

  it('gives up after the retries and reports the last status', async () => {
    const { impl, calls } = sequence([busy]);
    const provider = new GeminiProvider({ apiKey: API_KEY, fetchImpl: impl, retryDelayMs: 1 });
    await expect(provider.generate(request)).rejects.toThrow('Gemini API answered HTTP 503.');
    expect(calls).toHaveLength(3); // first try + 2 retries
  });

  it('does not retry client errors such as 400, 403 or 404', async () => {
    for (const status of [400, 403, 404]) {
      const { impl, calls } = sequence([() => json({ error: {} }, status)]);
      const provider = new GeminiProvider({ apiKey: API_KEY, fetchImpl: impl, retryDelayMs: 1 });
      await expect(provider.generate(request)).rejects.toThrow(`HTTP ${status}`);
      expect(calls).toHaveLength(1);
    }
  });

  it('maxRetries 0 disables retrying', async () => {
    const { impl, calls } = sequence([busy]);
    const provider = new GeminiProvider({ apiKey: API_KEY, fetchImpl: impl, maxRetries: 0 });
    await expect(provider.generate(request)).rejects.toThrow('HTTP 503');
    expect(calls).toHaveLength(1);
  });

  it('stops waiting when the caller aborts during the back-off', async () => {
    const { impl, calls } = sequence([busy]);
    const provider = new GeminiProvider({ apiKey: API_KEY, fetchImpl: impl, retryDelayMs: 10_000 });
    const controller = new AbortController();
    const pending = provider.generate(request, controller.signal).catch((err) => err);
    await new Promise((resolve) => setTimeout(resolve, 20));
    controller.abort();
    const error = await pending;
    expect(error).toBeInstanceOf(LlmProviderError);
    expect(error.message).toBe('Gemini request was cancelled.');
    expect(calls).toHaveLength(1);
  });

  it('keeps the overall timeout across retries', async () => {
    const { impl } = sequence([busy]);
    const provider = new GeminiProvider({
      apiKey: API_KEY,
      fetchImpl: impl,
      timeoutMs: 60,
      retryDelayMs: 10_000,
    });
    await expect(provider.generate(request)).rejects.toMatchObject({ kind: 'timeout' });
  });
});
