export interface PackageMetadata {
  readonly name: string;
  readonly layer: "core" | "engine" | "plugin" | "shared";
}

export const PLUGINS_PACKAGE_METADATA: PackageMetadata = {
  name: "@gallery-engine/plugins",
  layer: "plugin"
};

export {
  DownloadPlugin,
  type DownloadableImage,
  type DownloadFilenameContext,
  type DownloadFilenameFormatter,
  type DownloadGalleryConfig,
  type DownloadGalleryContext,
  type DownloadPluginOptions,
  type DownloadRequestOptions,
  type DownloadResult
} from "./download-plugin";

export {
  WatermarkPlugin,
  type ImageWatermarkContent,
  type TextWatermarkContent,
  type WatermarkContent,
  type WatermarkGalleryConfig,
  type WatermarkGalleryContext,
  type WatermarkOffset,
  type WatermarkPluginOptions,
  type WatermarkPosition
} from "./watermark-plugin";
