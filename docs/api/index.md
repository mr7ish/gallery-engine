# Gallery Engine API

The API documentation is organized around the package entrypoints that users import from. All runtime and type APIs are named exports; default exports are not part of the public contract.

## Generated Type Reference

Run the generator whenever public exports change:

```bash
pnpm docs:api
```

Generated pages live in [generated](./generated/index.md):

- [Core](./generated/core.md): Gallery, EventBus, ConfigManager, Renderer, VirtualEngine, ScrollManager, LazyObserver, InfiniteScroll, PluginManager, and shared core types.
- [Layouts](./generated/layouts.md): layout contracts, registry, GridLayout, MasonryLayout, and JustifiedLayout.
- [Animations](./generated/animations.md): AnimationEngine, built-in presets, and FlipAnimation.
- [Preview](./generated/preview.md): PreviewEngine, ZoomManager, and FullscreenManager.
- [Plugins](./generated/plugins.md): watermark, download, AI tags, and AI search plugins.
- [Shared](./generated/shared.md): CacheManager and image cache helpers.
- [Suite](./generated/suite.md): all-in-one entrypoint that re-exports the stable APIs from every package.

## Stable Import Pattern

```ts
import { Gallery, GridLayout, PreviewEngine } from "@gallery-engine/suite";
import type { GalleryImage, UserGalleryConfig } from "@gallery-engine/suite";

// Advanced installs can still import individual packages.
import { VirtualEngine } from "@gallery-engine/core";
```

Use named imports only. Public type imports should use `import type` when the symbol is erased at runtime.

## API Layers

- `@gallery-engine/suite` is the all-in-one package for application code that wants the stable exports from every package.
- `@gallery-engine/core` owns orchestration, configuration, events, rendering, scrolling, virtualization, and plugin lifecycle coordination.
- `@gallery-engine/layouts` owns layout calculation and registration.
- `@gallery-engine/animations` owns GSAP-compatible animation adapters and presets.
- `@gallery-engine/preview` owns preview state, keyboard navigation, fullscreen, zoom, drag, and pinch interactions.
- `@gallery-engine/plugins` owns optional plugin features that install into Gallery-like contexts.
- `@gallery-engine/shared` owns reusable infrastructure such as cache management.

## Event-Driven Rule

Modules should communicate through event names such as `image:loaded`, `layout:update`, `preview:open`, `scroll:end`, and `virtual:range-change`. New API surface should prefer typed configuration, typed events, or installable plugins instead of direct cross-module coupling.
