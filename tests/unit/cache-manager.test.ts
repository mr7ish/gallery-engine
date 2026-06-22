import { CacheManager, createImageCache } from "@gallery-engine/shared";
import type { CacheEntrySnapshot, ImageCacheEntry } from "@gallery-engine/shared";
import { describe, expect, it } from "vitest";

const createClock = (
  initialTime = 0
): { readonly now: () => number; advance(ms: number): void } => {
  let currentTime = initialTime;

  return {
    now: () => currentTime,
    advance: (ms) => {
      currentTime += ms;
    }
  };
};

describe("CacheManager", () => {
  it("stores, reads, and deletes cached values", () => {
    const cache = new CacheManager<string, string>();

    cache.set("hero", "image");

    expect(cache.get("hero")).toBe("image");
    expect(cache.has("hero")).toBe(true);
    expect(cache.delete("hero")).toBe(true);
    expect(cache.get("hero")).toBeUndefined();
    expect(cache.delete("hero")).toBe(false);
  });

  it("evicts least recently used entries when maxEntries is exceeded", () => {
    const cache = new CacheManager<string, string>({
      maxEntries: 2
    });

    cache.set("first", "1");
    cache.set("second", "2");
    expect(cache.get("first")).toBe("1");
    cache.set("third", "3");

    expect(cache.keys()).toEqual(["first", "third"]);
    expect(cache.get("second")).toBeUndefined();
  });

  it("expires entries after ttl", () => {
    const clock = createClock();
    const cache = new CacheManager<string, string>({
      ttl: 100,
      now: clock.now
    });

    cache.set("hero", "image");
    clock.advance(99);

    expect(cache.get("hero")).toBe("image");

    clock.advance(1);

    expect(cache.get("hero")).toBeUndefined();
    expect(cache.getStats().entries).toBe(0);
  });

  it("prunes expired entries and returns the removed count", () => {
    const clock = createClock();
    const cache = new CacheManager<string, string>({
      ttl: 10,
      now: clock.now
    });

    cache.set("first", "1");
    cache.set("second", "2");
    clock.advance(10);

    expect(cache.pruneExpired()).toBe(2);
    expect(cache.keys()).toEqual([]);
  });

  it("reports memory statistics using a custom size estimator", () => {
    const cache = new CacheManager<string, string>({
      maxEntries: 3,
      ttl: 50,
      estimateSize: (value) => value.length
    });

    cache.set("short", "abc");
    cache.set("long", "abcdef");

    expect(cache.getStats()).toEqual({
      entries: 2,
      size: 9,
      maxEntries: 3,
      ttl: 50
    });
  });

  it("returns snapshots from least to most recently used", () => {
    const clock = createClock(100);
    const cache = new CacheManager<string, string>({
      estimateSize: (value) => value.length,
      now: clock.now
    });

    cache.set("first", "a");
    clock.advance(5);
    cache.set("second", "bb");
    clock.advance(5);
    expect(cache.get("first")).toBe("a");

    const snapshots = cache.snapshot();

    expect(snapshots.map((snapshot) => snapshot.key)).toEqual(["second", "first"]);
    expect(snapshots[0]?.size).toBe(2);
    expect(snapshots[1]?.accessedAt).toBe(110);
  });

  it("clears all cached values", () => {
    const cache = new CacheManager<string, string>();

    cache.set("first", "1");
    cache.set("second", "2");
    cache.clear();

    expect(cache.getStats()).toEqual({
      entries: 0,
      size: 0,
      maxEntries: undefined,
      ttl: undefined
    });
  });

  it("creates image caches with image-aware size estimates", () => {
    const cache = createImageCache({
      maxEntries: 2
    });
    const entry: ImageCacheEntry = {
      src: "/hero.jpg",
      width: 10,
      height: 5
    };

    cache.set("hero", entry);

    expect(cache.getStats().size).toBe(200);
    expect(cache.get("hero")).toEqual(entry);
  });

  it("enforces snapshot shape at compile time", () => {
    const invalidSnapshot: CacheEntrySnapshot<"hero", string> = {
      // @ts-expect-error Snapshot key must match the cache key type.
      key: "other",
      value: "image",
      size: 1,
      createdAt: 0,
      accessedAt: 0
    };

    expect(invalidSnapshot.key).toBe("other");
  });
});
