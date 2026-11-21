import type http from 'node:http';
import type { AuthContext } from '@campus-orchestrator/shared';
import type { ToolDispatcher } from '../dispatcher/ToolDispatcher.js';
import { AGENT_SAFE_ERROR_MESSAGE, AgentOrchestrator, type AgentEvent } from './AgentOrchestrator.js';
import type { LlmProvider } from './LlmProvider.js';
import type { OutboundLog } from './outboundLog.js';

/**
 * `POST /internal/agent/stream` (M-08, API Contract v1.1 §3.3 and §8 Q4).
 *
 * Internal endpoint: only the API gateway calls it, with the identity it verified in the
 * `X-Authenticated-*` headers (§4). The body is `{"message": "..."}`; the answer is the SSE frame
 * sequence of §3.3 (`tool` per real invocation, `token` chunks, one `done`, or `error`).
 *
 * Errors before the stream starts are normal JSON bodies in the §3.4 shape (400, 503). After the
 * headers are sent a failure is an `error` event, never a changed HTTP status.
 */

export const AGENT_STREAM_PATH = '/internal/agent/stream';
export const MAX_MESSAGE_LENGTH = 1000;
const MAX_BODY_BYTES = 8 * 1024;

export interface AgentStreamHandlerOptions {
  dispatcher: ToolDispatcher;
  /**
   * The LLM provider. `undefined` means "not configured": the endpoint answers 503 and never
   * substitutes a fake provider. Tests inject a FakeProvider explicitly.
   */
  provider?: LlmProvider;
  outboundLog?: OutboundLog;
}

export type AgentStreamHandler = (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;

class BodyError extends Error {}

function sendJsonError(res: http.ServerResponse, status: number, code: string, message: string): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(
    JSON.stringify({ ok: false, error: { code, message }, timestamp: new Date().toISOString() })
  );
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new BodyError('Request body is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Returns the trimmed message, or throws BodyError with a safe description. */
function parseMessage(raw: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BodyError('Body must be valid JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new BodyError('Body must be a JSON object.');
  }
  const keys = Object.keys(parsed);
  if (keys.some((key) => key !== 'message')) {
    // Identity must come from the gateway headers, never from the body.
    throw new BodyError('Body may only contain "message".');
  }
  const message = (parsed as { message?: unknown }).message;
  if (typeof message !== 'string' || message.trim().length === 0) {
    throw new BodyError('"message" must be a non-empty string.');
  }
  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    throw new BodyError(`"message" must be at most ${MAX_MESSAGE_LENGTH} characters.`);
  }
  return message.trim();
}

function authFromHeaders(req: http.IncomingMessage): AuthContext {
  const idHeader = req.headers['x-authenticated-student-id'];
  const studentId = typeof idHeader === 'string' && idHeader.length > 0 ? idHeader : undefined;
  const roleHeader = req.headers['x-authenticated-user-role'];
  const role =
    roleHeader === 'STUDENT' || roleHeader === 'FACULTY' || roleHeader === 'GUEST'
      ? roleHeader
      : studentId
        ? 'STUDENT'
        : 'GUEST';
  return { studentId, role };
}

/** Serializes one agent event as an SSE frame (field order and names follow §3.3). */
export function formatSseFrame(event: AgentEvent): string {
  switch (event.type) {
    case 'tool':
      return `event: tool\ndata: ${JSON.stringify({
        toolName: event.toolName,
        status: event.status,
        durationMs: event.durationMs,
      })}\n\n`;
    case 'token':
      return `event: token\ndata: ${JSON.stringify({ text: event.text })}\n\n`;
    case 'done':
      return `event: done\ndata: ${JSON.stringify({
        answer: event.answer,
        toolsInvoked: event.toolsInvoked,
        isComplete: event.isComplete,
      })}\n\n`;
    case 'error':
      return `event: error\ndata: ${JSON.stringify({ code: event.code, message: event.message })}\n\n`;
  }
}

export function createAgentStreamHandler(options: AgentStreamHandlerOptions): AgentStreamHandler {
  const orchestrator = options.provider
    ? new AgentOrchestrator(options.dispatcher, {
        provider: options.provider,
        outboundLog: options.outboundLog,
      })
    : undefined;

  return async (req, res) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      sendJsonError(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST.');
      return;
    }

    let message: string;
    try {
      message = parseMessage(await readBody(req));
    } catch (err: unknown) {
      if (!res.headersSent && !res.destroyed) {
        sendJsonError(
          res,
          400,
          'INVALID_PARAMS',
          err instanceof BodyError ? err.message : 'Invalid request body.'
        );
      }
      return;
    }

    if (!orchestrator) {
      // No Gemini key: say so. Falling back to the fake provider would fake a real answer.
      sendJsonError(
        res,
        503,
        'AGENT_UNAVAILABLE',
        'The agent is not configured (no LLM provider key).'
      );
      return;
    }

    const auth = authFromHeaders(req);
    const abort = new AbortController();
    // Client (or gateway) went away before we finished: cancel the provider call.
    res.on('close', () => {
      if (!res.writableEnded) {
        abort.abort();
      }
    });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    try {
      for await (const event of orchestrator.run(message, auth, { signal: abort.signal })) {
        if (abort.signal.aborted || res.destroyed) {
          break;
        }
        res.write(formatSseFrame(event));
      }
    } catch (err: unknown) {
      console.error(
        '[agent-stream] unexpected failure:',
        err instanceof Error ? `${err.name}: ${err.message}` : 'unknown error'
      );
      if (!res.destroyed && !res.writableEnded) {
        res.write(
          formatSseFrame({ type: 'error', code: 'AGENT_ERROR', message: AGENT_SAFE_ERROR_MESSAGE })
        );
      }
    }
    if (!res.writableEnded) {
      res.end();
    }
  };
}
