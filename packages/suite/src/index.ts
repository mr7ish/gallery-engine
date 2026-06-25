export * as Animations from "@gallery-engine/animations";
export * as Core from "@gallery-engine/core";
export * as Layouts from "@gallery-engine/layouts";
export * as Plugins from "@gallery-engine/plugins";
export * as Preview from "@gallery-engine/preview";
export * as Shared from "@gallery-engine/shared";

export type {
  AnimationConfig,
  AnimationPreset,
  CacheConfig,
  DeepPartial,
  EventHandler,
  EventName,
  EventPayload,
  EventPayloadArgs,
  EventPayloadMap,
  GalleryConfig,
  GalleryConfigUpdate,
  GalleryEvents,
  GalleryImage,
  GalleryState,
  GridLayoutConfig,
  ImageLoaderOptions,
  ImageLoadRequest,
  ImageLoadResult,
  ImageLoadState,
  ImageLoadStateHandler,
  ImageLoadStatus,
  InfiniteScrollOptions,
  InfiniteScrollState,
  JustifiedLayoutConfig,
  LayoutConfig,
  LayoutType,
  LazyLoadConfig,
  LazyObserverEntry,
  LazyObserverHandler,
  LazyObserverOptions,
  ManagedPlugin,
  MasonryLayoutConfig,
  PackageMetadata as CorePackageMetadata,
  Plugin,
  PluginLifecycleEvent,
  PluginLifecycleHandler,
  PluginLifecyclePhase,
  PluginManagerOptions,
  PluginSnapshot,
  PreloadConfig,
  PreviewConfig,
  RenderedNode,
  RendererOptions,
  RenderItem,
  ScrollManagerOptions,
  ScrollMetrics,
  ScrollPosition,
  ScrollState,
  ScrollStateHandler,
  ScrollTarget,
  ThemeConfig,
  TimelineLayoutConfig,
  Unsubscribe,
  UserGalleryConfig,
  VirtualEngineOptions,
  VirtualItem,
  VirtualRange,
  VirtualResult,
  VirtualScrollConfig,
  VirtualViewport
} from "@gallery-engine/core";
export {
  ConfigManager,
  CORE_PACKAGE_METADATA,
  DEFAULT_GALLERY_CONFIG,
  EventBus,
  Gallery,
  ImageLoader,
  InfiniteScroll,
  LazyObserver,
  mergeConfig,
  PluginManager,
  Renderer,
  ScrollManager,
  VirtualEngine
} from "@gallery-engine/core";

export type {
  GridLayoutOptions,
  JustifiedLayoutOptions,
  Layout,
  LayoutCalculationContext,
  LayoutInputItem,
  LayoutItem,
  LayoutResult,
  MasonryLayoutOptions,
  PackageMetadata as LayoutsPackageMetadata
} from "@gallery-engine/layouts";
export {
  GridLayout,
  JustifiedLayout,
  LAYOUTS_PACKAGE_METADATA,
  LayoutRegistry,
  MasonryLayout
} from "@gallery-engine/layouts";

export type {
  AnimationDefinition,
  AnimationEngineOptions,
  AnimationLifecycleEvent,
  AnimationLifecycleHook,
  AnimationLifecycleHooks,
  AnimationLifecyclePhase,
  AnimationMethod,
  AnimationPlayback,
  AnimationPlayOptions,
  AnimationPresetFactory,
  AnimationPresetOptions,
  AnimationTarget,
  AnimationVars,
  BouncePresetOptions,
  BuiltInAnimationPresetName,
  FlipAnimationOptions,
  FlipAnimationPair,
  FlipDirection,
  FlipElementRole,
  FlipElementSnapshot,
  FlipPairSnapshot,
  FlipPlayOptions,
  FlipTransitionEvent,
  FlipTransitionHandler,
  GsapAnimationAdapter,
  GsapFlipAdapter,
  GsapFlipState,
  PackageMetadata as AnimationsPackageMetadata,
  RegisteredAnimation,
  ScalePresetOptions,
  SlidePresetOptions,
  ZoomPresetOptions
} from "@gallery-engine/animations";
export {
  ANIMATIONS_PACKAGE_METADATA,
  AnimationEngine,
  BUILT_IN_ANIMATION_PRESET_NAMES,
  createBouncePreset,
  createBuiltInAnimationPresets,
  createFadePreset,
  createScalePreset,
  createSlidePreset,
  createZoomPreset,
  FlipAnimation,
  registerBuiltInAnimationPresets
} from "@gallery-engine/animations";

export type {
  FullscreenManagerOptions,
  FullscreenState,
  FullscreenStateHandler,
  PackageMetadata as PreviewPackageMetadata,
  PreviewEngineOptions,
  PreviewItem,
  PreviewState,
  ZoomManagerOptions,
  ZoomPoint,
  ZoomState,
  ZoomStateHandler
} from "@gallery-engine/preview";
export {
  FullscreenManager,
  PREVIEW_PACKAGE_METADATA,
  PreviewEngine,
  ZoomManager
} from "@gallery-engine/preview";

export type {
  AiFeatureProvider,
  AiFeatureRequest,
  AiFeatureResult,
  AiSearchCacheKeyResolver,
  AiSearchGalleryConfig,
  AiSearchGalleryContext,
  AiSearchPluginOptions,
  AiSearchQuery,
  AiSearchRequestOptions,
  AiSearchResult,
  AiSearchSimilarityMetric,
  AiSearchVectorQuery,
  AiSearchableImage,
  AiTagCacheKeyResolver,
  AiTagProvider,
  AiTagRequest,
  AiTagResult,
  AiTaggableImage,
  AiTagsGalleryConfig,
  AiTagsGalleryContext,
  AiTagsPluginOptions,
  AiTagsRequestOptions,
  DownloadableImage,
  DownloadFilenameContext,
  DownloadFilenameFormatter,
  DownloadGalleryConfig,
  DownloadGalleryContext,
  DownloadPluginOptions,
  DownloadRequestOptions,
  DownloadResult,
  ImageWatermarkContent,
  PackageMetadata as PluginsPackageMetadata,
  TextWatermarkContent,
  WatermarkContent,
  WatermarkGalleryConfig,
  WatermarkGalleryContext,
  WatermarkOffset,
  WatermarkPluginOptions,
  WatermarkPosition
} from "@gallery-engine/plugins";
export {
  AiSearchPlugin,
  AiTagsPlugin,
  calculateSimilarity,
  DownloadPlugin,
  PLUGINS_PACKAGE_METADATA,
  WatermarkPlugin
} from "@gallery-engine/plugins";

export type {
  CacheEntrySnapshot,
  CacheKey,
  CacheManagerOptions,
  CacheStats,
  ImageCache,
  ImageCacheEntry,
  PackageMetadata as SharedPackageMetadata
} from "@gallery-engine/shared";
export { CacheManager, createImageCache, SHARED_PACKAGE_METADATA } from "@gallery-engine/shared";

export interface SuitePackageMetadata {
  readonly name: string;
  readonly layer: "suite";
  readonly includes: readonly string[];
}

export const SUITE_PACKAGE_METADATA: SuitePackageMetadata = {
  name: "@gallery-engine/suite",
  layer: "suite",
  includes: [
    "@gallery-engine/core",
    "@gallery-engine/layouts",
    "@gallery-engine/animations",
    "@gallery-engine/preview",
    "@gallery-engine/plugins",
    "@gallery-engine/shared"
  ]
};
