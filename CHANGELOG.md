# Changelog

## 0.1.1 - 2026-06-25

- Added `@gallery-engine/suite` as an all-in-one package that re-exports the stable named APIs from `core`, `layouts`, `animations`, `preview`, `plugins`, and `shared`.
- Updated the publish helper to include `suite` last and skip already-published package versions by default.

## 0.1.0 - 2026-06-22

首次可发布版本，包含 Gallery Engine 的核心 monorepo 包：

- `@gallery-engine/core`：Gallery 主类、EventBus、ConfigManager、Renderer、ImageLoader、LazyObserver、InfiniteScroll、VirtualEngine、ScrollManager、PluginManager。
- `@gallery-engine/layouts`：Layout 接口、LayoutRegistry、GridLayout、MasonryLayout、JustifiedLayout。
- `@gallery-engine/animations`：AnimationEngine、内置动画 presets、FlipAnimation。
- `@gallery-engine/preview`：PreviewEngine、ZoomManager、FullscreenManager。
- `@gallery-engine/plugins`：WatermarkPlugin、DownloadPlugin、AiTagsPlugin、AiSearchPlugin。
- `@gallery-engine/shared`：CacheManager 与图片缓存辅助能力。

发布准备：

- 所有可发布包版本设为 `0.1.0`。
- 为 scoped packages 配置 `publishConfig.access: public`。
- 收窄 npm `files`，仅发布构建产物 JS、类型声明和 source maps，排除 `tsbuildinfo`。
- 发布前验证通过：lint、typecheck、unit tests、E2E tests、benchmark、build、npm pack dry-run。
