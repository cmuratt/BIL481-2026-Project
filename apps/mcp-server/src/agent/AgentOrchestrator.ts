import type { AuthContext } from '@campus-orchestrator/shared';
import type { ToolDispatcher } from '../dispatcher/ToolDispatcher.js';
import { TOOL_DEFINITIONS } from '../registry/toolDefinitions.js';
import type { WireDispatcherResult } from '../wire/jsonRpc.js';
import type {
  LlmFunctionCall,
  LlmFunctionResult,
  LlmProvider,
  LlmRequest,
  LlmToolDeclaration,
  LlmTurn,
} from './LlmProvider.js';
import type { OutboundLog } from './outboundLog.js';
import { assertNoPii, scrubDeep, scrubPii, type PiiContext } from './piiScrubber.js';

/**
 * Single step within a planned multi-tool execution workflow (FR-13).
 */
export interface AgentPlanStep {
  toolName: string;
  parameters: Record<string, unknown>;
  reasoning?: string;
}

/**
 * Execution telemetry badge rendered in the client chat view (FR-17).
 */
export interface AgentTelemetryBadge {
  toolName: string;
  status: 'CACHE_HIT' | 'LIVE' | 'STALE' | 'ERROR';
  durationMs: number;
}

/**
 * Result of multi-tool contextual synthesis by the AI Agent (FR-13).
 */
export interface AgentSynthesisResult {
  text: string;
  toolsInvoked: string[];
  badges: AgentTelemetryBadge[];
  isComplete: boolean;
}

/**
 * Stream events of one agent run; they map 1:1 to the SSE frames of API Contract §3.3.
 * - `tool`: one per ACTUAL tool execution (never for planned-only or blocked calls)
 * - `token`: an arbitrary chunk of the answer; concatenate in arrival order
 * - `done`: exactly once on success, authoritative full answer
 * - `error`: safe message only, no tokens / PII / stack traces
 */
export type AgentEvent =
  | ({ type: 'tool' } & AgentTelemetryBadge)
  | { type: 'token'; text: string }
  | { type: 'done'; answer: string; toolsInvoked: string[]; isComplete: true }
  | { type: 'error'; code: 'AGENT_ERROR'; message: string };

/**
 * Contract for the AI Agent Orchestration engine (FR-13, FR-14).
 */
export interface IAgentOrchestrator {
  /**
   * Plans and executes a multi-step tool reasoning chain for a compound query.
   *
   * @param query Raw natural language query from student
   * @param auth Verified identity context injected by gateway
   * @returns Synthesized response accompanied by tool execution telemetry
   */
  executePlan(query: string, auth: AuthContext): Promise<AgentSynthesisResult>;
}

export interface AgentOrchestratorOptions {
  /** LLM provider. Without one, `executePlan`/`run` report NOT_IMPLEMENTED honestly. */
  provider?: LlmProvider;
  /** Redacted record of every provider request (AC-04.7 evidence). */
  outboundLog?: OutboundLog;
  /** Provider rounds per run (each round may request tools). The last round offers no tools. */
  maxRounds?: number;
  /** Monotonic millisecond clock, injectable for tests. */
  nowMs?: () => number;
  /** Approximate number of words per `token` event. */
  tokenChunkWords?: number;
}

export interface AgentRunOptions {
  /** Extra identifiers of the caller that must be scrubbed if the user types them (name, e-mail). */
  pii?: Pick<PiiContext, 'name' | 'email' | 'extraTerms'>;
  signal?: AbortSignal;
}

export const AGENT_SAFE_ERROR_MESSAGE =
  'Asistan şu anda yanıt veremiyor. Lütfen tekrar deneyin. / The assistant cannot answer right now. Please retry.';

const SYSTEM_INSTRUCTION = [
  'You are the campus assistant of a university.',
  'Answer the student in the language of the question (Turkish or English).',
  'Use the provided tools to fetch campus data; call each tool at most once and only if the question needs it.',
  'Base every statement strictly on tool results. Never invent times, dishes, rooms or numbers.',
  'If a tool failed or returned nothing, say so plainly instead of guessing.',
  'When a result has isSimulated=true, state briefly that the data is synthetic.',
  'When a result has isStale=true, warn that the data may be out of date.',
  'Tool arguments never contain personal identifiers; the system resolves the signed-in student itself.',
  'Keep the answer short and practical.',
].join(' ');

/** Argument keys that identify a person; the agent never forwards them to a tool. */
const IDENTITY_ARGUMENT_KEYS = new Set(['studentid', 'student_id', 'userid', 'user_id', 'email', 'name']);

type ToolStatus = AgentTelemetryBadge['status'];

function stripIdentityArguments(args: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args ?? {})) {
    if (!IDENTITY_ARGUMENT_KEYS.has(key.toLowerCase())) {
      clean[key] = value;
    }
  }
  return clean;
}

/** Tool declarations come from the MCP registry; identity-like properties are removed defensively. */
export function buildToolDeclarations(): LlmToolDeclaration[] {
  return TOOL_DEFINITIONS.map((definition) => {
    const properties = Object.fromEntries(
      Object.entries(definition.inputSchema.properties).filter(
        ([key]) => !IDENTITY_ARGUMENT_KEYS.has(key.toLowerCase())
      )
    );
    return {
      name: definition.name,
      description: definition.description,
      parameters: { type: 'object', properties },
    };
  });
}

function toolStatus(result: WireDispatcherResult): ToolStatus {
  if (result.isError) {
    return 'ERROR';
  }
  if (result.source === 'CACHE_HIT' || result.source === 'STALE' || result.source === 'LIVE') {
    return result.source;
  }
  return result.isStale ? 'STALE' : 'LIVE';
}

/** What the model gets to see: domain data plus the labels it must respect. Already scrubbed. */
function toModelPayload(result: WireDispatcherResult, status: ToolStatus, pii: PiiContext): unknown {
  if (result.isError) {
    return { error: scrubPii(result.message ?? 'Tool execution failed.', pii), status };
  }
  const block = Array.isArray(result.content)
    ? result.content.find((entry) => entry.type === 'json')
    : undefined;
  return scrubDeep(
    {
      data: block ? block.data : result.content,
      isSimulated: result.isSimulated ?? false,
      isStale: result.isStale ?? false,
      status,
      timestamp: result.timestamp,
    },
    pii
  );
}

function chunkText(text: string, wordsPerChunk: number): string[] {
  const words = text.match(/\S+\s*/g) ?? [];
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(''));
  }
  return chunks;
}

/**
 * AgentOrchestrator (FR-13, FR-14): LLM-driven multi-tool orchestration for UC-04.
 *
 * Loop: the provider asks for tools → each is validated and executed through the ToolDispatcher
 * with the gateway-verified identity (never as an argument) → results go back to the provider →
 * the provider writes the answer. Every request towards the provider is PII-scrubbed, checked
 * again fail-closed, and recorded in the outbound log.
 */
export class AgentOrchestrator implements IAgentOrchestrator {
  private readonly dispatcher: ToolDispatcher;
  private readonly provider?: LlmProvider;
  private readonly outboundLog?: OutboundLog;
  private readonly maxRounds: number;
  private readonly nowMs: () => number;
  private readonly tokenChunkWords: number;
  private readonly toolDeclarations = buildToolDeclarations();

  constructor(dispatcher: ToolDispatcher, options: AgentOrchestratorOptions = {}) {
    this.dispatcher = dispatcher;
    this.provider = options.provider;
    this.outboundLog = options.outboundLog;
    this.maxRounds = Math.max(2, options.maxRounds ?? 4);
    this.nowMs = options.nowMs ?? (() => performance.now());
    this.tokenChunkWords = Math.max(1, options.tokenChunkWords ?? 3);
  }

  /**
   * Returns the attached ToolDispatcher instance.
   */
  public getDispatcher(): ToolDispatcher {
    return this.dispatcher;
  }

  /** Name of the configured provider, or undefined when none is attached. */
  public getProviderName(): string | undefined {
    return this.provider?.name;
  }

  /**
   * Runs one agent turn and yields the events of API Contract §3.3 as they happen.
   * Never throws for provider/tool problems: those end the stream with a single `error` event.
   */
  public async *run(
    query: string,
    auth: AuthContext,
    options: AgentRunOptions = {}
  ): AsyncGenerator<AgentEvent> {
    const provider = this.provider;
    if (!provider) {
      throw new Error(
        'NOT_IMPLEMENTED: AgentOrchestrator has no LlmProvider configured ' +
          '(set GEMINI_API_KEY for the real provider, or inject a provider in tests).'
      );
    }

    const pii: PiiContext = { studentId: auth.studentId, ...options.pii };
    const turns: LlmTurn[] = [{ role: 'user', text: scrubPii(query, pii) }];
    const invoked: string[] = [];
    const declaredNames = new Set(this.toolDeclarations.map((tool) => tool.name));
    let answer: string | undefined;

    try {
      for (let round = 0; round < this.maxRounds && answer === undefined; round += 1) {
        const lastRound = round === this.maxRounds - 1;
        const request: LlmRequest = {
          systemInstruction: SYSTEM_INSTRUCTION,
          turns,
          tools: lastRound ? [] : this.toolDeclarations,
        };

        // Fail closed: nothing sensitive may reach the provider, and nothing is sent unlogged.
        assertNoPii(JSON.stringify(request), pii);
        this.outboundLog?.record({
          timestamp: new Date().toISOString(),
          provider: provider.name,
          isFake: provider.isFake,
          round,
          request,
        });

        const response = await provider.generate(request, options.signal);

        if (response.functionCalls.length === 0) {
          const text = response.text?.trim();
          if (!text) {
            throw new Error('Provider returned neither tool calls nor text.');
          }
          answer = text;
          break;
        }

        turns.push({ role: 'model', functionCalls: response.functionCalls });
        const results: LlmFunctionResult[] = [];
        for (const call of response.functionCalls) {
          const outcome = await this.executeCall(call, auth, pii, declaredNames, invoked);
          if (outcome.badge) {
            yield { type: 'tool', ...outcome.badge };
          }
          results.push(outcome.result);
        }
        turns.push({ role: 'tool', results });
      }

      if (answer === undefined) {
        throw new Error('Agent did not produce an answer within the allowed rounds.');
      }
    } catch (err: unknown) {
      // Details stay on the server log; the user only gets a safe message.
      console.error(
        '[agent] run failed:',
        err instanceof Error ? `${err.name}: ${err.message}` : 'unknown error'
      );
      yield { type: 'error', code: 'AGENT_ERROR', message: AGENT_SAFE_ERROR_MESSAGE };
      return;
    }

    for (const text of chunkText(answer, this.tokenChunkWords)) {
      yield { type: 'token', text };
    }
    yield { type: 'done', answer, toolsInvoked: [...invoked], isComplete: true };
  }

  /**
   * Executes one model-requested tool call. Returns a badge only when a tool really ran.
   * A tool already used in this run is refused (each tool exactly once, AC-04.4).
   */
  private async executeCall(
    call: LlmFunctionCall,
    auth: AuthContext,
    pii: PiiContext,
    declaredNames: ReadonlySet<string>,
    invoked: string[]
  ): Promise<{ badge?: AgentTelemetryBadge; result: LlmFunctionResult }> {
    if (!declaredNames.has(call.name)) {
      return {
        result: { name: call.name, response: { error: `Unknown tool '${scrubPii(call.name, pii)}'.` } },
      };
    }
    if (invoked.includes(call.name)) {
      return {
        result: {
          name: call.name,
          response: { error: 'This tool was already called for this question; reuse its earlier result.' },
        },
      };
    }

    invoked.push(call.name);
    const args = stripIdentityArguments(call.args);
    const startedAt = this.nowMs();
    let result: WireDispatcherResult;
    try {
      result = (await this.dispatcher.dispatch(call.name, args, auth)) as WireDispatcherResult;
    } catch (err: unknown) {
      result = {
        isError: true,
        message: err instanceof Error ? err.message : 'Tool execution failed.',
        content: [],
      };
    }
    const measured = Math.max(0, Math.round(this.nowMs() - startedAt));
    const status = toolStatus(result);
    const durationMs = status === 'ERROR' ? measured : (result.durationMs ?? measured);

    return {
      badge: { toolName: call.name, status, durationMs },
      result: { name: call.name, response: toModelPayload(result, status, pii) },
    };
  }

  /**
   * Convenience wrapper: runs the stream to completion and returns the synthesis (FR-13).
   * Throws when the run ends in an `error` event.
   */
  public async executePlan(query: string, auth: AuthContext): Promise<AgentSynthesisResult> {
    const badges: AgentTelemetryBadge[] = [];
    for await (const event of this.run(query, auth)) {
      if (event.type === 'tool') {
        badges.push({ toolName: event.toolName, status: event.status, durationMs: event.durationMs });
      } else if (event.type === 'error') {
        throw new Error(`AGENT_ERROR: ${event.message}`);
      } else if (event.type === 'done') {
        return {
          text: event.answer,
          toolsInvoked: event.toolsInvoked,
          badges,
          isComplete: event.isComplete,
        };
      }
    }
    throw new Error('AGENT_ERROR: stream ended without a done event.');
  }
}
