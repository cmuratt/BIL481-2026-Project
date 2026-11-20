/**
 * Redis runtime wiring for the shared connector cache (A-02, FR-09, NFR-02, NFR-04).
 *
 * Two entry points with the same selection rule:
 *   createCacheStoreFromEnv()      async — connects eagerly and fails fast (preferred at process start)
 *   createCacheStoreFromEnvSync()  sync  — for synchronous bootstraps such as `createCampusMcpServer()`;
 *                                  connects in the background, cache misses until Redis is ready
 *
 * Selection rule:
 *   REDIS_URL set                      → connect with the official `redis` client; startup fails fast
 *                                         (ConnectorCacheUnavailableError) if Redis cannot be reached,
 *                                         so a broken deployment is visible instead of silently unshared.
 *   REDIS_URL unset, NODE_ENV=production → ConnectorConfigError (production must use the shared cache).
 *   REDIS_URL unset, any other NODE_ENV  → in-memory store for offline development/tests, with a
 *                                         warning line on stderr. Compose always sets REDIS_URL.
 *
 * Runtime behaviour once connected:
 * - Commands are not queued while Redis is unreachable (`disableOfflineQueue`) and every cache
 *   operation is bounded by `operationTimeoutMs` (default 200 ms). A Redis outage therefore degrades a
 *   cache read to a miss and skips the write (ResilientConnectorExecutor.safeGet/safeSet) instead of
 *   consuming the 800 ms upstream budget (NFR-01) or hanging the tool call.
 * - The client reconnects in the background (back-off up to 2 s).
 * - Log lines never contain the password part of REDIS_URL.
 */

import { createClient } from 'redis';
import { ConnectorConfigError, type EnvSource } from '../configError.js';
import { withTimeout } from '../resilience/withTimeout.js';
import { systemClock, type Clock } from '../types.js';
import type { CacheStore } from './CacheStore.js';
import { InMemoryCacheStore } from './InMemoryCacheStore.js';
import { RedisCacheStore, type RedisLikeClient } from './RedisCacheStore.js';

export const REDIS_URL_ENV = 'REDIS_URL';
export const DEFAULT_REDIS_CONNECT_TIMEOUT_MS = 3000;
export const DEFAULT_REDIS_OPERATION_TIMEOUT_MS = 200;

export class ConnectorCacheUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectorCacheUnavailableError';
  }
}

export interface CacheStoreHandle {
  store: CacheStore;
  /** 'redis' or 'memory'. */
  backend: 'redis' | 'memory';
  /** Redacted description for startup logs, e.g. "redis://redis:6379". */
  description: string;
  close(): Promise<void>;
}

export interface RedisConnectOptions {
  connectTimeoutMs?: number;
  operationTimeoutMs?: number;
  /** Where connection warnings go (default: stderr). */
  warn?: (line: string) => void;
}

const stderrWarn = (line: string): void => {
  process.stderr.write(`${line}\n`);
};

/** Removes the password from a Redis URL so it can be logged. */
export function redactRedisUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (url.password !== '') {
      url.password = '***';
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return '<invalid REDIS_URL>';
  }
}

function validateRedisUrl(raw: string): void {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ConnectorConfigError(`${REDIS_URL_ENV} is not a valid URL`);
  }
  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new ConnectorConfigError(`${REDIS_URL_ENV} must start with redis:// or rediss:// (received '${url.protocol}')`);
  }
}

/** Bounds every cache command so an unhealthy Redis cannot stall a tool call. */
function boundedClient(client: RedisLikeClient, operationTimeoutMs: number): RedisLikeClient {
  return {
    get: (key) => withTimeout(client.get(key), operationTimeoutMs),
    set: (key, value, options) => withTimeout(client.set(key, value, options), operationTimeoutMs),
    del: (key) => withTimeout(client.del(key), operationTimeoutMs),
  };
}

/** Connects to Redis and returns a ready RedisCacheStore. Throws ConnectorCacheUnavailableError on failure. */
export async function connectRedisCacheStore(url: string, options: RedisConnectOptions = {}): Promise<CacheStoreHandle> {
  validateRedisUrl(url);
  const connectTimeoutMs = options.connectTimeoutMs ?? DEFAULT_REDIS_CONNECT_TIMEOUT_MS;
  const operationTimeoutMs = options.operationTimeoutMs ?? DEFAULT_REDIS_OPERATION_TIMEOUT_MS;
  const warn = options.warn ?? stderrWarn;
  const safeUrl = redactRedisUrl(url);

  let connected = false;
  const client = createClient({
    url,
    disableOfflineQueue: true,
    socket: {
      connectTimeout: connectTimeoutMs,
      // During startup: give up (reject connect()). Afterwards: keep reconnecting with back-off.
      reconnectStrategy: (retries: number) => (connected ? Math.min(100 * 2 ** retries, 2000) : false),
    },
  });

  let lastWarning = '';
  client.on('error', (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    if (message !== lastWarning) {
      lastWarning = message;
      warn(JSON.stringify({ event: 'connector.cache', level: 'warn', backend: 'redis', url: safeUrl, message }));
    }
  });
  client.on('ready', () => {
    if (lastWarning !== '') {
      warn(JSON.stringify({ event: 'connector.cache', level: 'info', backend: 'redis', url: safeUrl, message: 'reconnected' }));
      lastWarning = '';
    }
  });

  try {
    await withTimeout(client.connect(), connectTimeoutMs + 500);
    await withTimeout(client.ping(), connectTimeoutMs);
    connected = true;
  } catch (err: unknown) {
    try {
      client.destroy();
    } catch {
      // already closed
    }
    const reason = err instanceof Error ? err.message : String(err);
    throw new ConnectorCacheUnavailableError(`Redis cache at ${safeUrl} is not reachable: ${reason}`);
  }

  return {
    store: new RedisCacheStore(boundedClient(client as unknown as RedisLikeClient, operationTimeoutMs)),
    backend: 'redis',
    description: safeUrl,
    close: async () => {
      if (client.isOpen) {
        await client.close();
      }
    },
  };
}

interface EventSource {
  on(event: string, listener: (...args: any[]) => void): unknown;
}

function attachWarnings(client: EventSource, safeUrl: string, warn: (line: string) => void): void {
  let lastWarning = '';
  client.on('error', (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    if (message !== lastWarning) {
      lastWarning = message;
      warn(JSON.stringify({ event: 'connector.cache', level: 'warn', backend: 'redis', url: safeUrl, message }));
    }
  });
  client.on('ready', () => {
    warn(JSON.stringify({ event: 'connector.cache', level: 'info', backend: 'redis', url: safeUrl, message: 'ready' }));
    lastWarning = '';
  });
}

/**
 * Redis store that connects in the background (synchronous construction).
 * Until the connection is ready every cache operation rejects immediately (no offline queue), which
 * the executor treats as a miss; the client keeps reconnecting with back-off up to 2 s.
 */
export function createLazyRedisCacheStore(url: string, options: RedisConnectOptions = {}): CacheStoreHandle {
  validateRedisUrl(url);
  const operationTimeoutMs = options.operationTimeoutMs ?? DEFAULT_REDIS_OPERATION_TIMEOUT_MS;
  const warn = options.warn ?? stderrWarn;
  const safeUrl = redactRedisUrl(url);
  const client = createClient({
    url,
    disableOfflineQueue: true,
    socket: {
      connectTimeout: options.connectTimeoutMs ?? DEFAULT_REDIS_CONNECT_TIMEOUT_MS,
      reconnectStrategy: (retries: number) => Math.min(100 * 2 ** retries, 2000),
    },
  });
  attachWarnings(client, safeUrl, warn);
  client.connect().catch(() => {
    // reported through the 'error' listener; reconnection continues in the background
  });
  return {
    store: new RedisCacheStore(boundedClient(client as unknown as RedisLikeClient, operationTimeoutMs)),
    backend: 'redis',
    description: safeUrl,
    close: async () => {
      try {
        if (client.isReady) {
          await client.close();
        } else {
          client.destroy();
        }
      } catch {
        // already closed
      }
    },
  };
}

/** Synchronous variant of createCacheStoreFromEnv (same rule; Redis connects in the background). */
export function createCacheStoreFromEnvSync(
  env: EnvSource = process.env,
  clock: Clock = systemClock,
  options: RedisConnectOptions & { warnInMemory?: boolean } = {}
): CacheStoreHandle {
  const url = env[REDIS_URL_ENV]?.trim();
  if (url !== undefined && url !== '') {
    return createLazyRedisCacheStore(url, options);
  }
  if (env.NODE_ENV?.trim().toLowerCase() === 'production') {
    throw new ConnectorConfigError(`${REDIS_URL_ENV} is required when NODE_ENV=production (shared cache, FR-09)`);
  }
  if (options.warnInMemory ?? true) {
    (options.warn ?? stderrWarn)(
      JSON.stringify({
        event: 'connector.cache',
        level: 'warn',
        backend: 'memory',
        message: `${REDIS_URL_ENV} is not set: using a process-local in-memory cache (offline development only, not shared)`,
      })
    );
  }
  return { store: new InMemoryCacheStore(clock), backend: 'memory', description: 'in-memory (offline)', close: async () => {} };
}

/** Chooses the cache backend from the environment (see the rule at the top of this file). */
export async function createCacheStoreFromEnv(
  env: EnvSource = process.env,
  clock: Clock = systemClock,
  options: RedisConnectOptions = {}
): Promise<CacheStoreHandle> {
  const url = env[REDIS_URL_ENV]?.trim();
  if (url !== undefined && url !== '') {
    return connectRedisCacheStore(url, options);
  }
  if (env.NODE_ENV?.trim().toLowerCase() === 'production') {
    throw new ConnectorConfigError(`${REDIS_URL_ENV} is required when NODE_ENV=production (shared cache, FR-09)`);
  }
  (options.warn ?? stderrWarn)(
    JSON.stringify({
      event: 'connector.cache',
      level: 'warn',
      backend: 'memory',
      message: `${REDIS_URL_ENV} is not set: using a process-local in-memory cache (offline development only, not shared)`,
    })
  );
  return { store: new InMemoryCacheStore(clock), backend: 'memory', description: 'in-memory (offline)', close: async () => {} };
}
