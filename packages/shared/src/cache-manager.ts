export type CacheKey = string;

export interface CacheEntrySnapshot<TKey extends CacheKey, TValue> {
  readonly key: TKey;
  readonly value: TValue;
  readonly size: number;
  readonly createdAt: number;
  readonly accessedAt: number;
  readonly expiresAt?: number;
}

export interface CacheManagerOptions<TValue> {
  readonly maxEntries?: number;
  readonly ttl?: number;
  readonly estimateSize?: (value: TValue) => number;
  readonly now?: () => number;
}

export interface CacheStats {
  readonly entries: number;
  readonly size: number;
  readonly maxEntries: number | undefined;
  readonly ttl: number | undefined;
}

export interface ImageCacheEntry {
  readonly src: string;
  readonly width?: number;
  readonly height?: number;
  readonly bytes?: number;
  readonly metadata?: Record<string, unknown>;
}

export type ImageCache = CacheManager<string, ImageCacheEntry>;

interface InternalCacheEntry<TValue> {
  readonly value: TValue;
  readonly size: number;
  readonly createdAt: number;
  accessedAt: number;
  readonly expiresAt: number | undefined;
}

/**
 * Generic in-memory cache with LRU eviction, TTL expiration, and size statistics.
 */
export class CacheManager<TKey extends CacheKey, TValue> {
  private readonly maxEntries: number | undefined;
  private readonly ttl: number | undefined;
  private readonly estimateSize: (value: TValue) => number;
  private readonly now: () => number;
  private readonly entries = new Map<TKey, InternalCacheEntry<TValue>>();
  private totalSize = 0;

  public constructor(options: CacheManagerOptions<TValue> = {}) {
    this.maxEntries = normalizeMaxEntries(options.maxEntries);
    this.ttl = normalizeTtl(options.ttl);
    this.estimateSize = options.estimateSize ?? defaultEstimateSize;
    this.now = options.now ?? Date.now;
  }

  /**
   * Store a value and evict least recently used entries when capacity is exceeded.
   */
  public set(key: TKey, value: TValue): void {
    const timestamp = this.now();
    const existingEntry = this.entries.get(key);

    if (existingEntry) {
      this.totalSize -= existingEntry.size;
      this.entries.delete(key);
    }

    const size = Math.max(0, this.estimateSize(value));
    const entry: InternalCacheEntry<TValue> = {
      value,
      size,
      createdAt: timestamp,
      accessedAt: timestamp,
      expiresAt: this.ttl === undefined ? undefined : timestamp + this.ttl
    };

    this.entries.set(key, entry);
    this.totalSize += size;
    this.evictLeastRecentlyUsed();
  }

  /**
   * Return a cached value and refresh its LRU position when present.
   */
  public get(key: TKey): TValue | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.delete(key);
      return undefined;
    }

    entry.accessedAt = this.now();
    this.entries.delete(key);
    this.entries.set(key, entry);

    return entry.value;
  }

  /**
   * Return whether a non-expired value exists for a key.
   */
  public has(key: TKey): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete one cache entry.
   */
  public delete(key: TKey): boolean {
    const entry = this.entries.get(key);

    if (!entry) {
      return false;
    }

    this.entries.delete(key);
    this.totalSize -= entry.size;

    return true;
  }

  /**
   * Remove all cache entries.
   */
  public clear(): void {
    this.entries.clear();
    this.totalSize = 0;
  }

  /**
   * Remove expired entries and return how many were evicted.
   */
  public pruneExpired(): number {
    let removedCount = 0;

    for (const [key, entry] of this.entries) {
      if (this.isExpired(entry)) {
        this.delete(key);
        removedCount += 1;
      }
    }

    return removedCount;
  }

  /**
   * Return cache keys from least to most recently used.
   */
  public keys(): readonly TKey[] {
    this.pruneExpired();

    return [...this.entries.keys()];
  }

  /**
   * Return cache entries from least to most recently used.
   */
  public snapshot(): readonly CacheEntrySnapshot<TKey, TValue>[] {
    this.pruneExpired();

    return [...this.entries.entries()].map(([key, entry]) => createSnapshot(key, entry));
  }

  /**
   * Return current cache memory and policy statistics.
   */
  public getStats(): CacheStats {
    this.pruneExpired();

    return {
      entries: this.entries.size,
      size: this.totalSize,
      maxEntries: this.maxEntries,
      ttl: this.ttl
    };
  }

  private evictLeastRecentlyUsed(): void {
    if (this.maxEntries === undefined) {
      return;
    }

    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;

      if (oldestKey === undefined) {
        return;
      }

      this.delete(oldestKey);
    }
  }

  private isExpired(entry: InternalCacheEntry<TValue>): boolean {
    return entry.expiresAt !== undefined && this.now() >= entry.expiresAt;
  }
}

export const createImageCache = (options: CacheManagerOptions<ImageCacheEntry> = {}): ImageCache =>
  new CacheManager<string, ImageCacheEntry>({
    estimateSize: estimateImageCacheEntrySize,
    ...options
  });

const createSnapshot = <TKey extends CacheKey, TValue>(
  key: TKey,
  entry: InternalCacheEntry<TValue>
): CacheEntrySnapshot<TKey, TValue> => {
  const snapshot: CacheEntrySnapshot<TKey, TValue> = {
    key,
    value: entry.value,
    size: entry.size,
    createdAt: entry.createdAt,
    accessedAt: entry.accessedAt
  };

  if (entry.expiresAt === undefined) {
    return snapshot;
  }

  return {
    ...snapshot,
    expiresAt: entry.expiresAt
  };
};

const normalizeMaxEntries = (maxEntries: number | undefined): number | undefined => {
  if (maxEntries === undefined) {
    return undefined;
  }

  return Math.max(0, Math.floor(maxEntries));
};

const normalizeTtl = (ttl: number | undefined): number | undefined => {
  if (ttl === undefined) {
    return undefined;
  }

  return Math.max(0, ttl);
};

const defaultEstimateSize = (value: unknown): number => {
  if (typeof value === "string") {
    return value.length;
  }

  return 1;
};

const estimateImageCacheEntrySize = (entry: ImageCacheEntry): number => {
  if (entry.bytes !== undefined) {
    return entry.bytes;
  }

  if (entry.width !== undefined && entry.height !== undefined) {
    return entry.width * entry.height * 4;
  }

  return entry.src.length;
};
