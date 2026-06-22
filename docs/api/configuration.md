# Configuration API

Gallery Engine configuration is resolved by `ConfigManager`. User configuration supplies the required `container` and `images`, while optional sections are deeply merged with `DEFAULT_GALLERY_CONFIG`.

## Basic Shape

```ts
import { ConfigManager, DEFAULT_GALLERY_CONFIG } from "@gallery-engine/core";
import type { GalleryImage, UserGalleryConfig } from "@gallery-engine/core";

const images: readonly GalleryImage[] = [
  {
    id: "cover",
    src: "/images/cover.jpg",
    thumbnail: "/images/cover-thumb.jpg",
    alt: "Cover image",
    width: 1280,
    height: 860
  }
];

const userConfig: UserGalleryConfig = {
  container: "#gallery",
  images,
  layout: {
    type: "grid",
    grid: {
      columns: 4,
      gap: 16
    }
  },
  virtual: {
    enabled: true,
    overscan: 240
  }
};

const manager = new ConfigManager(userConfig);
const resolved = manager.getConfig();
const defaults = DEFAULT_GALLERY_CONFIG;
```

## Required Fields

| Field       | Type                      | Notes                                                             |
| ----------- | ------------------------- | ----------------------------------------------------------------- |
| `container` | `string \| HTMLElement`   | Selector or element used by the Gallery root.                     |
| `images`    | `readonly GalleryImage[]` | Image data. Arrays use replacement semantics during config merge. |

## Layout Config

`layout.type` selects the active layout. Current implemented layouts are `grid` and `masonry`; future documented values are reserved for justified, timeline, and carousel layouts.

```ts
const layoutConfig: UserGalleryConfig["layout"] = {
  type: "masonry",
  masonry: {
    columns: 4,
    gap: 12,
    minColumnWidth: 240
  }
};
```

## Virtual Scroll Config

Virtual scrolling should keep DOM count below the project performance budget.

```ts
const virtualConfig: UserGalleryConfig["virtual"] = {
  enabled: true,
  overscan: 300,
  recycle: true
};
```

## Preview Config

```ts
const previewConfig: UserGalleryConfig["preview"] = {
  enabled: true,
  fullscreen: true,
  zoom: true,
  drag: true,
  keyboard: true,
  gesture: true
};
```

## Animation Config

```ts
const animationConfig: UserGalleryConfig["animation"] = {
  enabled: true,
  enter: "fade",
  leave: "fade",
  preview: "zoom",
  stagger: 0.05
};
```

## Lazy Load, Preload, Cache, And Theme

```ts
const advancedConfig: Pick<UserGalleryConfig, "lazyLoad" | "preload" | "cache" | "theme"> = {
  lazyLoad: {
    enabled: true,
    rootMargin: "300px",
    threshold: 0
  },
  preload: {
    enabled: true,
    distance: 20,
    maxConcurrent: 4
  },
  cache: {
    enabled: true,
    maxSize: 100,
    ttl: 300_000
  },
  theme: {
    mode: "auto",
    primaryColor: "#2563eb"
  }
};
```

## Runtime Updates

```ts
const updatedConfig = manager.update({
  lazyLoad: {
    rootMargin: "400px"
  },
  virtual: {
    overscan: 360
  }
});
```

Runtime updates return a complete `GalleryConfig` snapshot. Objects are deeply merged, while arrays are replaced instead of merged by index.
