/**
 * POST /internal/agent/stream (M-08, API Contract v1.1 §3.3 / §8 Q4).
 *
 * Every test that produces an answer uses the FakeProvider ("fake provider ile"). None of these
 * results is an AT-04 / AC-04.11 PASS: that needs the real Gemini provider (see the PR notes).
 */
import type http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConnectorRuntime } from '../../packages/connectors/src/index.js';
import {
  FakeProvider,
  MemoryOutboundLog,
  ToolDispatcher,
  startHttpServer,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
} from '../../apps/mcp-server/src/index.js';
import { buildGateway } from '../../apps/api-gateway/src/server.js';
import { signMockToken } from '../../apps/api-gateway/src/auth/jwtVerifier.js';
import { InMemoryRateLimiterStore } from '../../apps/api-gateway/src/rate-limiter/slidingWindowRateLimiter.js';
import { MONDAY, TestClock } from '../connectors/helpers.js';

const STUDENT_ID = '241101065';
const QUESTION = '10:30 dersimden sonra ringe yetişir miyim, bugün yemekte ne var?';
const servers: http.Server[] = [];

async function boot(options: { provider?: LlmProvider; outboundLog?: MemoryOutboundLog } = {}) {
  const clock = new TestClock(`${MONDAY}T12:35`);
  const connectorRuntime = createConnectorRuntime({ env: {}, clock: clock.now });
  const server = await startHttpServer(0, '127.0.0.1', new ToolDispatcher(), {
    connectorRuntime,
    agentProvider: options.provider,
    agentOutboundLog: options.outboundLog ?? new MemoryOutboundLog(),
  });
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function post(base: string, body: unknown, headers: Record<string, string> = {}, signal?: AbortSignal) {
  return fetch(`${base}/internal/agent/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    signal,
  });
}

const AUTH = { 'X-Authenticated-Student-Id': STUDENT_ID, 'X-Authenticated-User-Role': 'STUDENT' };

interface Frame {
  event: string;
  data: any;
}

function parseFrames(text: string): Frame[] {
  return text
    .split('\n\n')
    .filter((block) => block.trim().length > 0)
    .map((block) => {
      const lines = block.split('\n');
      const event = lines.find((l) => l.startsWith('event: '))!.slice(7);
      const data = JSON.parse(lines.find((l) => l.startsWith('data: '))!.slice(6));
      return { event, data };
    });
}

beforeEach(() => {
  // The "no provider" case must not be rescued by a key from the developer's shell.
  vi.stubEnv('GEMINI_API_KEY', '');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await Promise.all(servers.splice(0).map((s) => new Promise<void>((resolve) => s.close(() => resolve()))));
});

describe('POST /internal/agent/stream (fake provider)', () => {
  it('streams tool, token and done frames with the §3.3 headers', async () => {
    const fake = new FakeProvider();
    const base = await boot({ provider: fake });

    const res = await post(base, { message: QUESTION }, AUTH);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream; charset=utf-8');
    expect(res.headers.get('cache-control')).toBe('no-cache');

    const frames = parseFrames(await res.text());
    const tools = frames.filter((f) => f.event === 'tool');
    const tokens = frames.filter((f) => f.event === 'token');
    const done = frames.filter((f) => f.event === 'done');

    // One tool event per real invocation: schedule, shuttle, cafeteria (each exactly once).
    expect(tools.map((f) => f.data.toolName)).toEqual([
      'get_course_schedule',
      'get_shuttle_schedule',
      'get_cafeteria_menu',
    ]);
    for (const frame of tools) {
      expect(Object.keys(frame.data).sort()).toEqual(['durationMs', 'status', 'toolName']);
      expect(['LIVE', 'CACHE_HIT', 'STALE', 'ERROR']).toContain(frame.data.status);
      expect(frame.data.durationMs).toBeGreaterThanOrEqual(0);
    }

    expect(tokens.length).toBeGreaterThan(0);
    expect(done).toHaveLength(1);
    expect(frames[frames.length - 1]!.event).toBe('done');
    expect(frames.some((f) => f.event === 'error')).toBe(false);

    expect(done[0]!.data.isComplete).toBe(true);
    expect(done[0]!.data.toolsInvoked).toEqual(tools.map((f) => f.data.toolName));
    expect(tokens.map((f) => f.data.text).join('')).toBe(done[0]!.data.answer);
  });

  it('rejects bad bodies with a §3.4 JSON 400 and never calls the provider', async () => {
    const fake = new FakeProvider();
    const base = await boot({ provider: fake });

    const bodies: unknown[] = [
      '{not json',
      '[]',
      {},
      { message: '   ' },
      { message: 42 },
      { message: 'a'.repeat(1001) },
      { message: 'Merhaba', studentId: 'someone-else' },
    ];
    for (const body of bodies) {
      const res = await post(base, body, AUTH);
      expect(res.status).toBe(400);
      expect(res.headers.get('content-type')).toContain('application/json');
      const json = (await res.json()) as any;
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe('INVALID_PARAMS');
      expect(typeof json.timestamp).toBe('string');
    }
    expect(fake.requests).toHaveLength(0);
  });

  it('streams a safe error event when the provider fails after the headers were sent', async () => {
    const failing: LlmProvider = {
      name: 'fake',
      isFake: true,
      async generate(): Promise<LlmResponse> {
        throw new Error(`upstream exploded for ${STUDENT_ID} with key=AIzaSECRET`);
      },
    };
    const base = await boot({ provider: failing });

    const res = await post(base, { message: 'Bugün yemekte ne var?' }, AUTH);
    expect(res.status).toBe(200);
    const text = await res.text();
    const frames = parseFrames(text);

    expect(frames.filter((f) => f.event === 'error')).toHaveLength(1);
    expect(frames.some((f) => f.event === 'done')).toBe(false);
    expect(frames[0]!.data.code).toBe('AGENT_ERROR');
    expect(text).not.toContain('AIzaSECRET');
    expect(text).not.toContain(STUDENT_ID);
    expect(text).not.toContain('exploded');
  });

  it('aborts the provider call when the client disconnects', async () => {
    let seenSignal: AbortSignal | undefined;
    let entered!: () => void;
    const providerEntered = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const hanging: LlmProvider = {
      name: 'fake',
      isFake: true,
      generate(_request: LlmRequest, signal?: AbortSignal): Promise<LlmResponse> {
        seenSignal = signal;
        entered();
        return new Promise<LlmResponse>((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('aborted')));
        });
      },
    };
    const base = await boot({ provider: hanging });

    const controller = new AbortController();
    const pending = post(base, { message: 'Yemekte ne var?' }, AUTH, controller.signal);
    // Headers are flushed before the provider answers, so fetch resolves with the open stream.
    const res = await pending;
    await providerEntered;
    expect(seenSignal?.aborted).toBe(false);

    controller.abort();
    await res.body?.cancel().catch(() => {});
    await vi.waitFor(() => expect(seenSignal?.aborted).toBe(true));
  });

  it('never sends the student id or the question identifiers to the provider or the outbound log', async () => {
    const fake = new FakeProvider();
    const log = new MemoryOutboundLog();
    const base = await boot({ provider: fake, outboundLog: log });

    const res = await post(
      base,
      { message: `Ben ${STUDENT_ID} numaralı öğrenciyim, bugün yemekte ne var?` },
      AUTH
    );
    await res.text();

    expect(fake.requests.length).toBeGreaterThan(0);
    expect(JSON.stringify(fake.requests)).not.toContain(STUDENT_ID);
    expect(log.entries.length).toBe(fake.requests.length);
    expect(JSON.stringify(log.entries)).not.toContain(STUDENT_ID);
    expect(log.entries.every((entry) => entry.isFake)).toBe(true);
  });

  it('serves only POST on the agent path', async () => {
    const base = await boot({ provider: new FakeProvider() });
    const res = await fetch(`${base}/internal/agent/stream`);
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });
});

describe('POST /internal/agent/stream without a provider key', () => {
  it('answers 503 JSON and does not fall back to a fake provider', async () => {
    const base = await boot(); // no injected provider, GEMINI_API_KEY is empty

    const res = await post(base, { message: QUESTION }, AUTH);

    expect(res.status).toBe(503);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('content-type')).not.toContain('event-stream');
    const text = await res.text();
    const json = JSON.parse(text) as any;
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe('AGENT_UNAVAILABLE');
    expect(text).not.toContain('event:');

    const health = (await (await fetch(`${base}/health`)).json()) as any;
    expect(health.agent.provider).toBe('not-configured');
  });

  it('still validates the body first (400 before 503)', async () => {
    const base = await boot();
    const res = await post(base, { message: '' }, AUTH);
    expect(res.status).toBe(400);
  });
});

describe('gateway -> agent chain (fake provider)', () => {
  it('passes the agent frames through the gateway and forwards the verified identity', async () => {
    const fake = new FakeProvider();
    const base = await boot({ provider: fake });
    const gateway = buildGateway({
      rateLimiterStore: new InMemoryRateLimiterStore(),
      rateLimit: 100,
      agentStreamUrl: `${base}/internal/agent/stream`,
      chatTimeoutMs: 5_000,
    });
    const gatewayUrl = await gateway.listen({ port: 0, host: '127.0.0.1' });
    try {
      const token = signMockToken({
        studentId: STUDENT_ID,
        name: 'Demo Student',
        email: 'demo@example.test',
        role: 'STUDENT',
      });
      const res = await fetch(`${gatewayUrl}/api/v1/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: 'Bugün yemekte ne var?' }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('text/event-stream; charset=utf-8');
      const frames = parseFrames(await res.text());
      expect(frames.map((f) => f.event)).toContain('tool');
      expect(frames[frames.length - 1]!.event).toBe('done');
      expect(JSON.stringify(fake.requests)).not.toContain(STUDENT_ID);
    } finally {
      await gateway.close();
    }
  });
});
