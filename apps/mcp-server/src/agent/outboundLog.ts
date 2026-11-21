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

export interface OutboundLog {
  record(entry: OutboundLogEntry): void;
}

/** One JSON line per request on stderr (stdout is reserved for MCP stdio frames). */
export class ConsoleOutboundLog implements OutboundLog {
  public record(entry: OutboundLogEntry): void {
    console.error(`[agent-outbound] ${JSON.stringify(entry)}`);
  }
}

/** Appends JSON lines to a file, e.g. docs/assignment3/evidence/AT-04/outbound.log. */
export class FileOutboundLog implements OutboundLog {
  constructor(private readonly filePath: string) {}

  public record(entry: OutboundLogEntry): void {
    appendFileSync(this.filePath, `${JSON.stringify(entry)}\n`, 'utf8');
  }
}

/** Keeps entries in memory for tests. */
export class MemoryOutboundLog implements OutboundLog {
  public readonly entries: OutboundLogEntry[] = [];

  public record(entry: OutboundLogEntry): void {
    this.entries.push(entry);
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
