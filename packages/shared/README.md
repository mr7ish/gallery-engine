# @gallery-engine/shared

Shared 放置跨包复用的基础设施，目前包含通用 `CacheManager` 和图片缓存辅助方法。它适合被 core、plugins 或应用层共享使用。📦

## Installation

```bash
pnpm add @gallery-engine/shared
```

也可以使用 npm：

```bash
npm install @gallery-engine/shared
```

## Cache Manager

```ts
import { CacheManager } from "@gallery-engine/shared";

const cache = new CacheManager<string, string>({
  maxEntries: 2,
  ttl: 60_000,
  estimateSize: (value) => value.length
});

cache.set("first", "alpha");
cache.set("second", "beta");
cache.set("third", "gamma");

console.log(cache.has("first")); // false, evicted by LRU capacity
console.log(cache.getStats());
```

## Image Cache

```ts
import { createImageCache } from "@gallery-engine/shared";

const imageCache = createImageCache({
  maxEntries: 100,
  ttl: 300_000
});

imageCache.set("/images/a.jpg", {
  src: "/images/a.jpg",
  width: 1600,
  height: 900
});

const cached = imageCache.get("/images/a.jpg");

console.log(cached?.width);
```

## Common APIs

- `CacheManager`: 泛型内存缓存，支持 LRU、TTL、统计和快照。
- `createImageCache`: 针对图片元数据的缓存工厂。
- `CacheStats`: 当前缓存条目、容量和 TTL 信息。
- `ImageCacheEntry`: 图片缓存条目类型。

## Notes

- 缓存 key 使用字符串。
- `snapshot()` 会返回从最久未使用到最近使用的条目。
- `get()` 会刷新 LRU 顺序。
