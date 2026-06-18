export type { PreviewEngineOptions, PreviewItem, PreviewState } from "./preview-engine";
export { PreviewEngine } from "./preview-engine";

export interface PackageMetadata {
  readonly name: string;
  readonly layer: "core" | "engine" | "plugin" | "shared";
}

export const PREVIEW_PACKAGE_METADATA: PackageMetadata = {
  name: "@gallery-engine/preview",
  layer: "engine"
};
