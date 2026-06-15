export type {
  AnimationConfig,
  AnimationPreset,
  CacheConfig,
  DeepPartial,
  GalleryConfig,
  GalleryConfigUpdate,
  GalleryImage,
  GridLayoutConfig,
  JustifiedLayoutConfig,
  LayoutConfig,
  LayoutType,
  LazyLoadConfig,
  MasonryLayoutConfig,
  PreloadConfig,
  PreviewConfig,
  ThemeConfig,
  TimelineLayoutConfig,
  UserGalleryConfig,
  VirtualScrollConfig
} from "./config-manager";
export { ConfigManager, DEFAULT_GALLERY_CONFIG, mergeConfig } from "./config-manager";

export type { GalleryEvents, GalleryState, Plugin } from "./gallery";
export { Gallery } from "./gallery";

export type { LazyObserverEntry, LazyObserverHandler, LazyObserverOptions } from "./lazy-observer";
export { LazyObserver } from "./lazy-observer";

export type { RenderedNode, RendererOptions, RenderItem } from "./renderer";
export { Renderer } from "./renderer";

export type {
  EventHandler,
  EventName,
  EventPayload,
  EventPayloadArgs,
  EventPayloadMap,
  Unsubscribe
} from "./event-bus";
export { EventBus } from "./event-bus";

export interface PackageMetadata {
  readonly name: string;
  readonly layer: "core" | "engine" | "plugin" | "shared";
}

export const CORE_PACKAGE_METADATA: PackageMetadata = {
  name: "@gallery-engine/core",
  layer: "core"
};
