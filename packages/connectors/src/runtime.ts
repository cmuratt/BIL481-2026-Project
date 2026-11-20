/**
 * Bootstrap for the MCP server (integration helper for Murat, task M-02).
 *
 Both factories apply the same cache rule (cache/redisClient.ts):
 *   REDIS_URL set → shared Redis; unset → in-memory (development) or startup error (NODE_ENV=production).
 *
 *   const runtime = createConnectorRuntime();                // sync; Redis connects in the background
 *   const runtime = await createConnectorRuntimeFromEnv();   // async; waits for Redis, fails fast
 *   registerConnectorHandlers(dispatcher, runtime);
 *   // on shutdown: await runtime.close();
 *
 * Unit tests pass `env` (without REDIS_URL) or an explicit `cache`.
 *
 * Clock: an injected `clock` wins; otherwise CONNECTOR_FIXED_NOW (anchored, advancing) or system time.
 * Logging: one JSON line per connector call on stderr (logging.ts); pass `onEvent` to redirect or silence.
 */

import type { CacheStore } from './cache/CacheStore.js';
import { createCacheStoreFromEnv, createCacheStoreFromEnvSync } from './cache/redisClient.js';
import { resolveConnectorClock } from './clock.js';
import { loadConnectorConfig, type ConnectorRuntimeConfig, type EnvSource } from './config.js';
import { createCampusConnectors } from './factory.js';
import type { ConnectorHandlerDeps } from './handlers.js';
import { createJsonLineEventSink, type ConnectorEventSink } from './logging.js';
import { ResilientConnectorExecutor } from './resilience/ResilientConnectorExecutor.js';
import type { Clock } from './types.js';

export interface ConnectorRuntimeOptions {
  env?: EnvSource;
  cache?: CacheStore;
  clock?: Clock;
  /** Execution event sink; default = JSON lines on stderr. */
  onEvent?: ConnectorEventSink;
  /** Receives cache backend warnings (`connector.cache` lines); default = stderr. */
  onCacheWarning?: (line: string) => void;
}

export interface ConnectorRuntime extends ConnectorHandlerDeps {
  config: ConnectorRuntimeConfig;
  cache: CacheStore;
  clock: Clock;
  /** Human-readable cache backend, e.g. 'redis' or 'memory' (startup log, health). */
  cacheBackend: string;
  /** Releases the Redis connection (no-op for in-memory). */
  close(): Promise<void>;
}

/**
 * Synchronous runtime (used by `createCampusMcpServer()`).
 * - `options.cache` given → that store.
 * - otherwise REDIS_URL → shared Redis, connected in the background (cache misses until ready);
 *   no REDIS_URL → in-memory (warning on stderr when the real process environment is used),
 *   or a ConnectorConfigError under NODE_ENV=production.
 */
export function createConnectorRuntime(options: ConnectorRuntimeOptions = {}): ConnectorRuntime {
  const env = options.env ?? process.env;
  const config = loadConnectorConfig(env);
  const clock = options.clock ?? resolveConnectorClock(config.fixedNow);
  if (options.cache !== undefined) {
    return assemble(config, clock, options.cache, 'custom', async () => {}, options.onEvent);
  }
  const handle = createCacheStoreFromEnvSync(env, clock, {
    warnInMemory: options.env === undefined,
    ...(options.onCacheWarning !== undefined ? { warn: options.onCacheWarning } : {}),
  });
  return assemble(config, clock, handle.store, handle.backend, handle.close, options.onEvent);
}

/**
 * Production runtime: reads the environment and connects to Redis when REDIS_URL is set (fails fast if
 * Redis is unreachable). Without REDIS_URL it refuses to start under NODE_ENV=production and otherwise
 * falls back to an in-memory cache with a warning (offline development) — see cache/redisClient.ts.
 */
export async function createConnectorRuntimeFromEnv(
  options: Omit<ConnectorRuntimeOptions, 'cache'> = {}
): Promise<ConnectorRuntime> {
  const env = options.env ?? process.env;
  const config = loadConnectorConfig(env);
  const clock = options.clock ?? resolveConnectorClock(config.fixedNow);
  const handle = await createCacheStoreFromEnv(env, clock, options.onCacheWarning !== undefined ? { warn: options.onCacheWarning } : {});
  return assemble(config, clock, handle.store, handle.backend, handle.close, options.onEvent);
}

function assemble(
  config: ConnectorRuntimeConfig,
  clock: Clock,
  cache: CacheStore,
  cacheBackend: string,
  close: () => Promise<void>,
  onEvent: ConnectorEventSink | undefined
): ConnectorRuntime {
  const connectors = createCampusConnectors(config, clock);
  const executor = new ResilientConnectorExecutor({
    cache,
    clock,
    timeoutMs: config.upstreamTimeoutMs,
    onEvent: onEvent ?? createJsonLineEventSink(),
  });
  return { config, cache, cacheBackend, close, connectors, executor, ttlSeconds: config.ttlSeconds, clock };
}
