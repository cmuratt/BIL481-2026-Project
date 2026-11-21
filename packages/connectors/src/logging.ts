/**
 * Structured connector execution log (A-04, A-09; acceptance criteria AC-01.7, AC-02.7, AC-03.6, AC-03.7).
 *
 * The acceptance tests decide "the connector was executed once for two requests" and "stale data was
 * served during a fault" from the MCP/connector log. Every `ResilientConnectorExecutor.execute()`
 * therefore emits exactly one event, and `upstreamCalled` says whether the connector itself ran.
 *
 * Privacy rules (FR-07, NFR-05): an event never contains tool arguments, auth context or a student ID.
 * The only identifier is the cache key, and course-schedule keys contain a one-way hash of the student
 * ID (see cacheKeys.ts), never the ID itself. Failure details are reduced to the error code.
 *
 * The default sink writes one JSON line per event to **stderr**: the MCP server also supports the
 * stdio transport, where stdout carries the protocol and must not receive log lines.
 */

import type { CircuitState } from './resilience/CircuitBreaker.js';
import type { ConnectorName } from './types.js';

export type ExecutionOutcome = 'CACHE_HIT' | 'LIVE' | 'STALE' | 'ERROR';

export interface ConnectorExecutionEvent {
  event: 'connector.execute';
  /** Connector clock time when the call finished (ISO; equals the test clock under CONNECTOR_FIXED_NOW). */
  at: string;
  connector: ConnectorName;
  outcome: ExecutionOutcome;
  /** True only when the connector's `execute()` was actually invoked during this call. */
  upstreamCalled: boolean;
  cacheKey: string;
  durationMs: number;
  /** Error code of the upstream failure behind a STALE or ERROR outcome. */
  failureCode?: string;
  /** Breaker state after the call. */
  circuitState: CircuitState;
}

export type ConnectorEventSink = (event: ConnectorExecutionEvent) => void;

/** Discards events (unit tests, benchmarks). */
export const silentEventSink: ConnectorEventSink = () => {};

/** One JSON object per line, written to stderr by default. */
export function createJsonLineEventSink(
  write: (line: string) => void = (line) => {
    process.stderr.write(`${line}\n`);
  }
): ConnectorEventSink {
  return (event) => {
    try {
      write(JSON.stringify(event));
    } catch {
      // Logging must never break a tool call.
    }
  };
}

/** Collects events in memory; used by tests and evidence scripts. */
export class RecordingEventSink {
  public readonly events: ConnectorExecutionEvent[] = [];

  public readonly sink: ConnectorEventSink = (event) => {
    this.events.push(event);
  };

  /** Number of real connector executions (cache hits and open-circuit short-cuts excluded). */
  public upstreamCalls(connector?: ConnectorName): number {
    return this.events.filter((e) => e.upstreamCalled && (connector === undefined || e.connector === connector)).length;
  }

  public clear(): void {
    this.events.length = 0;
  }
}
