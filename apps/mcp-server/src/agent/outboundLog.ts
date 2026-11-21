import { appendFileSync } from 'node:fs';
import type { LlmRequest } from './LlmProvider.js';

/**
 * Redacted record of every request the agent sends to an LLM provider (AC-04.7 evidence).
 *
 * Entries hold the request AFTER PII scrubbing, exactly as serialized for the provider. Credentials
 * (API key, JWT) are never part of a request body, so they cannot appear here either.
 */
export interface OutboundLogEntry {
  timestamp: string;
  provider: string;
  /** True for test doubles; lets a reviewer prove a log does not come from the real provider. */
  isFake: boolean;
  /** Zero-based provider round within one agent run. */
  round: number;
  request: LlmRequest;
}

/**
 * One line per tool the agent actually executed (AC-04.5 evidence). The agent calls the
 * `ToolDispatcher` inside the MCP process, so no JSON-RPC `tools/call` request exists to log; this
 * entry is the record of what was dispatched.
 *
 * `arguments` are the arguments that were really passed to the dispatcher: identity-like keys are
 * already removed and the values are PII-scrubbed. The verified identity travels separately in the
 * `AuthContext` and is never part of an entry. Refused calls (unknown or repeated tool) were not
 * executed and produce no entry.
 */
export interface ToolCallLogEntry {
  /** Discriminator; provider request entries (`OutboundLogEntry`) have no `event` field. */
  event: 'tool_call';
  timestamp: string;
  /** Provider round in which the model asked for the tool. */
  round: number;
  toolName: string;
  arguments: Record<string, unknown>;
  status: 'CACHE_HIT' | 'LIVE' | 'STALE' | 'ERROR';
  durationMs: number;
}

export interface OutboundLog {
  record(entry: OutboundLogEntry): void;
  /** Optional: sinks that do not implement it simply ignore tool call entries. */
  recordToolCall?(entry: ToolCallLogEntry): void;
}

/** One JSON line per request on stderr (stdout is reserved for MCP stdio frames). */
export class ConsoleOutboundLog implements OutboundLog {
  public record(entry: OutboundLogEntry): void {
    console.error(`[agent-outbound] ${JSON.stringify(entry)}`);
  }

  public recordToolCall(entry: ToolCallLogEntry): void {
    console.error(`[agent-tool] ${JSON.stringify(entry)}`);
  }
}

/**
 * Appends JSON lines to a file, e.g. docs/assignment3/evidence/AT-04/outbound.log. Provider requests
 * and tool calls share the file; tool call lines carry `"event":"tool_call"`.
 */
export class FileOutboundLog implements OutboundLog {
  constructor(private readonly filePath: string) {}

  public record(entry: OutboundLogEntry): void {
    appendFileSync(this.filePath, `${JSON.stringify(entry)}\n`, 'utf8');
  }

  public recordToolCall(entry: ToolCallLogEntry): void {
    appendFileSync(this.filePath, `${JSON.stringify(entry)}\n`, 'utf8');
  }
}

/** Keeps entries in memory for tests. Entries are copied, so later changes to the request do not alter them. */
export class MemoryOutboundLog implements OutboundLog {
  public readonly entries: OutboundLogEntry[] = [];
  public readonly toolCalls: ToolCallLogEntry[] = [];

  public record(entry: OutboundLogEntry): void {
    this.entries.push(structuredClone(entry));
  }

  public recordToolCall(entry: ToolCallLogEntry): void {
    this.toolCalls.push(structuredClone(entry));
  }
}

/** Fans one entry out to several sinks. */
export class CompositeOutboundLog implements OutboundLog {
  constructor(private readonly sinks: readonly OutboundLog[]) {}

  public record(entry: OutboundLogEntry): void {
    for (const sink of this.sinks) {
      sink.record(entry);
    }
  }

  public recordToolCall(entry: ToolCallLogEntry): void {
    for (const sink of this.sinks) {
      sink.recordToolCall?.(entry);
    }
  }
}

/** Console log always; additionally a file when `AGENT_OUTBOUND_LOG_FILE` is set. */
export function createOutboundLogFromEnv(
  env: Record<string, string | undefined> = process.env
): OutboundLog {
  const filePath = env.AGENT_OUTBOUND_LOG_FILE?.trim();
  return filePath
    ? new CompositeOutboundLog([new ConsoleOutboundLog(), new FileOutboundLog(filePath)])
    : new ConsoleOutboundLog();
}
