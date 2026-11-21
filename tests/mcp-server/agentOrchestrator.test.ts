/**
 * M-04..M-07: agent loop with the FakeProvider. These tests prove orchestration, identity handling,
 * PII redaction and event semantics. They are NOT evidence of the real UC-04 run (AC-04.11).
 */

import { describe, expect, it, vi } from 'vitest';
import { TOOL_NAMES, type AuthContext } from '@campus-orchestrator/shared';
import {
  AgentOrchestrator,
  AGENT_SAFE_ERROR_MESSAGE,
  buildToolDeclarations,
  FakeProvider,
  MemoryOutboundLog,
  ToolDispatcher,
  type AgentEvent,
  type LlmProvider,
} from '../../apps/mcp-server/src/index.js';
import { createConnectorRuntime, registerConnectorHandlers } from '../../packages/connectors/src/index.js';
import { TUESDAY, TestClock } from '../connectors/helpers.js';

const STUDENT_ID = '241101065';
const student: AuthContext = { studentId: STUDENT_ID, role: 'STUDENT' };
const guest: AuthContext = { role: 'GUEST' };
const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNDExMDEwNjUifQ.c2lnbmF0dXJlLXZhbHVlLWV4YW1wbGU';
const UC04 = '10:30 dersimden sonra ringe yetişir miyim, bugün yemekte ne var?';

function setup(env: Record<string, string> = {}, provider: LlmProvider = new FakeProvider()) {
  const clock = new TestClock(`${TUESDAY}T10:30`);
  const runtime = createConnectorRuntime({ env, clock: clock.now });
  const dispatcher = new ToolDispatcher();
  registerConnectorHandlers(dispatcher, runtime);
  const dispatchSpy = vi.spyOn(dispatcher, 'dispatch');
  const log = new MemoryOutboundLog();
  const agent = new AgentOrchestrator(dispatcher, { provider, outboundLog: log });
  return { agent, dispatcher, dispatchSpy, log, provider };
}

async function collect(stream: AsyncGenerator<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of stream) {
    events.push(event);
  }
  return events;
}

const ofType = <T extends AgentEvent['type']>(events: AgentEvent[], type: T) =>
  events.filter((e): e is Extract<AgentEvent, { type: T }> => e.type === type);

describe('UC-04 compound question (AC-04.4, AC-04.10)', () => {
  it('runs each of the three tools exactly once, then streams tokens and one done', async () => {
    const { agent, dispatchSpy } = setup();
    const events = await collect(agent.run(UC04, student));

    const tools = ofType(events, 'tool');
    expect(tools.map((t) => t.toolName)).toEqual([
      TOOL_NAMES.COURSE_SCHEDULE,
      TOOL_NAMES.SHUTTLE_SCHEDULE,
      TOOL_NAMES.CAFETERIA_MENU,
    ]);
    for (const tool of tools) {
      expect(tool.status).toBe('LIVE');
      expect(tool.durationMs).toBeTypeOf('number');
    }
    expect(dispatchSpy).toHaveBeenCalledTimes(3);

    const done = ofType(events, 'done');
    expect(done).toHaveLength(1);
    expect(done[0]!.isComplete).toBe(true);
    expect(done[0]!.toolsInvoked).toEqual(tools.map((t) => t.toolName));

    const tokens = ofType(events, 'token');
    expect(tokens.length).toBeGreaterThan(1);
    expect(tokens.map((t) => t.text).join('')).toBe(done[0]!.answer);

    // Order: all tool events first, tokens next, done last.
    const types = events.map((e) => e.type);
    expect(types.lastIndexOf('tool')).toBeLessThan(types.indexOf('token'));
    expect(types[types.length - 1]).toBe('done');
    expect(done[0]!.answer).toContain('sentetik');
  });

  it('a second identical request is served from the cache and reported as CACHE_HIT', async () => {
    const { agent } = setup();
    await collect(agent.run(UC04, student));
    const second = ofType(await collect(agent.run(UC04, student)), 'tool');
    expect(second.every((t) => t.status === 'CACHE_HIT')).toBe(true);
  });

  it('executePlan returns the synthesis with one badge per tool', async () => {
    const { agent } = setup();
    const result = await agent.executePlan(UC04, student);
    expect(result.isComplete).toBe(true);
    expect(result.badges.map((b) => b.toolName)).toEqual(result.toolsInvoked);
    expect(result.text.length).toBeGreaterThan(0);
  });
});

describe('Identity never travels in tool arguments (AC-04.5)', () => {
  it('declares no identity property in any tool schema', () => {
    for (const tool of buildToolDeclarations()) {
      const keys = Object.keys(tool.parameters.properties).map((k) => k.toLowerCase());
      expect(keys).not.toContain('studentid');
    }
  });

  it('strips identity arguments the model adds and still uses the verified identity', async () => {
    const script = async (_req: unknown, index: number) =>
      index === 0
        ? {
            functionCalls: [
              {
                name: TOOL_NAMES.COURSE_SCHEDULE,
                args: { day: 'TUESDAY', studentId: '241101013', email: 'x@y.edu' },
              },
            ],
          }
        : { functionCalls: [], text: 'Tamam.' };
    const { agent, dispatchSpy } = setup({}, new FakeProvider(script));
    const events = await collect(agent.run('derslerim?', student));

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const [name, args, auth] = dispatchSpy.mock.calls[0]!;
    expect(name).toBe(TOOL_NAMES.COURSE_SCHEDULE);
    expect(args).toEqual({ day: 'TUESDAY' });
    expect(auth).toEqual(student);
    expect(ofType(events, 'tool')[0]!.status).toBe('LIVE');
  });
});

describe('Each tool at most once (AC-04.4)', () => {
  it('refuses a repeated tool call without a second execution or badge', async () => {
    const script = async (req: any, index: number) => {
      if (index === 0) {
        return { functionCalls: [{ name: TOOL_NAMES.SHUTTLE_SCHEDULE, args: {} }] };
      }
      if (index === 1) {
        return { functionCalls: [{ name: TOOL_NAMES.SHUTTLE_SCHEDULE, args: { route: 'METRO_LINE' } }] };
      }
      const last = req.turns[req.turns.length - 1];
      expect(last.results[0].response.error).toMatch(/already called/i);
      return { functionCalls: [], text: 'Ring bilgisi hazır.' };
    };
    const { agent, dispatchSpy } = setup({}, new FakeProvider(script));
    const events = await collect(agent.run('ring ne zaman?', guest));
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(ofType(events, 'tool')).toHaveLength(1);
    expect(ofType(events, 'done')[0]!.toolsInvoked).toEqual([TOOL_NAMES.SHUTTLE_SCHEDULE]);
  });

  it('ignores unknown tools without a badge and tells the model', async () => {
    const script = async (req: any, index: number) =>
      index === 0
        ? { functionCalls: [{ name: 'delete_everything', args: {} }] }
        : {
            functionCalls: [],
            text: `sonuç: ${JSON.stringify(req.turns[req.turns.length - 1].results[0].response)}`,
          };
    const { agent, dispatchSpy } = setup({}, new FakeProvider(script));
    const events = await collect(agent.run('x', guest));
    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(ofType(events, 'tool')).toHaveLength(0);
    expect(ofType(events, 'done')[0]!.answer).toContain('Unknown tool');
  });
});

describe('PII never reaches the provider (FR-14, AC-04.7)', () => {
  it('scrubs token, student number and e-mail from the question and keeps the log clean', async () => {
    const provider = new FakeProvider();
    const { agent, log } = setup({}, provider);
    const dirty = `${UC04} Token: ${JWT} no: ${STUDENT_ID} mail: ogrenci@uni.edu.tr`;
    const events = await collect(agent.run(dirty, student));
    expect(ofType(events, 'done')).toHaveLength(1);

    const wire = JSON.stringify(provider.requests) + JSON.stringify(log.entries);
    expect(wire).not.toContain('eyJ');
    expect(wire).not.toContain(STUDENT_ID);
    expect(wire).not.toContain('ogrenci@uni.edu.tr');
    expect(wire).toContain('[STUDENT_ID]');
  });

  it('scrubs identifiers that come back inside tool results', async () => {
    const provider = new FakeProvider(async (_req, index) =>
      index === 0
        ? { functionCalls: [{ name: TOOL_NAMES.COURSE_SCHEDULE, args: { day: 'TUESDAY' } }] }
        : { functionCalls: [], text: 'ok' }
    );
    const { agent, dispatcher } = setup({}, provider);
    dispatcher.registerHandler(TOOL_NAMES.COURSE_SCHEDULE, async () => ({
      isError: false,
      content: [{ type: 'json', data: [{ owner: STUDENT_ID, note: 'mail a@b.edu' }] }],
    }));
    await collect(agent.run('derslerim', student));
    const second = JSON.stringify(provider.requests[1]);
    expect(second).not.toContain(STUDENT_ID);
    expect(second).not.toContain('a@b.edu');
  });

  it('records every provider request, flagged as fake, with no key material', async () => {
    const { agent, log } = setup();
    await collect(agent.run(UC04, student));
    expect(log.entries.length).toBe(2); // tool round + answer round
    expect(log.entries.every((e) => e.provider === 'fake' && e.isFake)).toBe(true);
    expect(log.entries[0]!.round).toBe(0);
    expect(log.entries[0]!.request.tools.length).toBe(4);
  });

  it('scrubs caller-supplied extra terms (name) typed into the question', async () => {
    const provider = new FakeProvider();
    const { agent } = setup({}, provider);
    const events = await collect(
      agent.run('Ben Ayşe Demir, yemekte ne var?', student, { pii: { name: 'Ayşe Demir' } })
    );
    expect(ofType(events, 'done')).toHaveLength(1);
    expect(JSON.stringify(provider.requests)).not.toContain('Ayşe Demir');
  });
});

describe('Failure handling', () => {
  it('maps a tool failure to an ERROR badge and still answers', async () => {
    const { agent } = setup({ LIBRARY_CONNECTOR_MODE: 'live' });
    const events = await collect(agent.run('kütüphane ne kadar dolu?', guest));
    const tools = ofType(events, 'tool');
    expect(tools).toHaveLength(1);
    expect(tools[0]).toMatchObject({ toolName: TOOL_NAMES.LIBRARY_OCCUPANCY, status: 'ERROR' });
    expect(ofType(events, 'done')).toHaveLength(1);
  });

  it('reports an auth failure of the private tool as an ERROR badge, not a crash', async () => {
    const { agent } = setup();
    const events = await collect(agent.run('derslerim neler?', guest));
    expect(ofType(events, 'tool')[0]).toMatchObject({ toolName: TOOL_NAMES.COURSE_SCHEDULE, status: 'ERROR' });
    expect(ofType(events, 'error')).toHaveLength(0);
  });

  it('ends with exactly one safe error event when the provider fails', async () => {
    const failing: LlmProvider = {
      name: 'fake',
      isFake: true,
      generate: async () => {
        throw new Error(`upstream said key=SECRET-KEY-123 for ${STUDENT_ID}`);
      },
    };
    const { agent } = setup({}, failing);
    const events = await collect(agent.run(UC04, student));
    expect(events).toEqual([{ type: 'error', code: 'AGENT_ERROR', message: AGENT_SAFE_ERROR_MESSAGE }]);
  });

  it('gives up with an error event when the model never answers', async () => {
    const looping = new FakeProvider(async (req) =>
      req.tools.length > 0
        ? { functionCalls: [{ name: TOOL_NAMES.LIBRARY_OCCUPANCY, args: {} }] }
        : { functionCalls: [] } // last round has no tools and no text
    );
    const { agent } = setup({}, looping);
    const events = await collect(agent.run('x', guest));
    expect(ofType(events, 'done')).toHaveLength(0);
    expect(ofType(events, 'error')).toHaveLength(1);
    expect(looping.requests[looping.requests.length - 1]!.tools).toEqual([]); // final round: no tools
  });

  it('without a provider, executePlan reports NOT_IMPLEMENTED honestly', async () => {
    const agent = new AgentOrchestrator(new ToolDispatcher());
    await expect(agent.executePlan('What is for lunch?', student)).rejects.toThrow(/NOT_IMPLEMENTED/);
  });
});
