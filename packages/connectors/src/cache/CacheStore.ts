/**
 * Cache adapter contract (FR-09, FR-10).
 *
 * A cache entry carries its own freshness boundary (`freshUntil`) while the store keeps it
 * physically for a longer retention period (3 × TTL). Between `freshUntil` and the end of
 * retention the entry is no longer served as fresh, but it is still available as the
 * stale-if-error fallback.
 *
 * Two implementations share this contract:
 * - InMemoryCacheStore: process-local Map; unit tests and offline development only.
 * - RedisCacheStore: shared Redis instance; used whenever REDIS_URL is set (Compose, demo).
 */

export interface CacheEntry<T> {
  value: T;
  /** ISO timestamp of when the value was fetched from the connector (reported as `timestamp` when stale). */
  cachedAt: string;
  /** ISO timestamp after which the value must not be served as fresh. */
  freshUntil: string;
  /**
   * Provenance of the value: true when a mock (synthetic) connector produced it. Kept with the value so
   * that data cached in mock mode is still labelled synthetic if it is later served as STALE after a
   * switch to live mode. Optional for entries written before this field existed.
   */
  isSimulated?: boolean;
}

export interface CacheStore {
  /** Returns the entry if it is still physically retained, otherwise null. */
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  /** Stores the entry and keeps it for `retentionSeconds` (≥ TTL). */
  set<T>(key: string, entry: CacheEntry<T>, retentionSeconds: number): Promise<void>;
  /** Removes one key (used by tests and manual invalidation). */
  delete(key: string): Promise<void>;
}
