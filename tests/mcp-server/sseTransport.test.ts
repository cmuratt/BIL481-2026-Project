/**
 * SSE transport of the MCP server (FR-02), found broken by the M-09 MCP Inspector check:
 * the session table was keyed by a random id, but the MCP SDK announces its own UUID to the client,
 * so every POST to /mcp/messages answered 404.
 *
 * Only discovery (`tools/list`) is asserted here. `tools/call` over MCP clients is a known open gap
 * (content type `json` is not a standard MCP content type, see the PR notes) and is not pinned.
 */
import type http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { createConnectorRuntime } from '../../packages/connectors/src/index.js';
import { startHttpServer, ToolDispatcher } from '../../apps/mcp-server/src/index.js';

const servers: http.Server[] = [];
const clients: Client[] = [];

async function boot() {
  const server = await startHttpServer(0, '127.0.0.1', new ToolDispatcher(), {
    connectorRuntime: createConnectorRuntime({ env: {} }),
  });
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((c) => c.close().catch(() => {})));
  await Promise.all(
    servers.splice(0).map((s) => {
      s.closeAllConnections();
      return new Promise<void>((resolve) => s.close(() => resolve()));
    })
  );
});

describe('MCP SSE transport', () => {
  it('lists the four tools through the SDK SSE client', async () => {
    const base = await boot();
    const client = new Client({ name: 'sse-test', version: '1.0.0' });
    clients.push(client);
    await client.connect(new SSEClientTransport(new URL(`${base}/sse`)));

    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'get_cafeteria_menu',
      'get_course_schedule',
      'get_library_occupancy',
      'get_shuttle_schedule',
    ]);
  });

  it('announces a message endpoint that the server accepts', async () => {
    const base = await boot();
    const controller = new AbortController();
    const res = await fetch(`${base}/sse`, { signal: controller.signal });
    const reader = res.body!.getReader();
    let text = '';
    while (!text.includes('\n\n')) {
      const { value, done } = await reader.read();
      if (done) break;
      text += new TextDecoder().decode(value);
    }
    const endpoint = /data: (\S+)/.exec(text)?.[1];
    expect(endpoint).toMatch(/^\/mcp\/messages\?sessionId=[0-9a-f-]{36}$/);

    const post = await fetch(`${base}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    expect(post.status).toBe(202);
    controller.abort();
  });

  it('still answers 404 for an unknown or missing session', async () => {
    const base = await boot();
    for (const query of ['?sessionId=does-not-exist', '']) {
      const res = await fetch(`${base}/mcp/messages${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      expect(res.status).toBe(404);
    }
  });
});
