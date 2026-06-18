export type {
  FullscreenManagerOptions,
  FullscreenState,
  FullscreenStateHandler
} from "./fullscreen-manager";
export { FullscreenManager } from "./fullscreen-manager";

export type { PreviewEngineOptions, PreviewItem, PreviewState } from "./preview-engine";
export { PreviewEngine } from "./preview-engine";

export type { ZoomManagerOptions, ZoomPoint, ZoomState, ZoomStateHandler } from "./zoom-manager";
export { ZoomManager } from "./zoom-manager";

export interface PackageMetadata {
  readonly name: string;
  readonly layer: "core" | "engine" | "plugin" | "shared";
}

export const PREVIEW_PACKAGE_METADATA: PackageMetadata = {
  name: "@gallery-engine/preview",
  layer: "engine"
};
