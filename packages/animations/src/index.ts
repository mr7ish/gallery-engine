export interface PackageMetadata {
  readonly name: string;
  readonly layer: "core" | "engine" | "plugin" | "shared";
}

export const ANIMATIONS_PACKAGE_METADATA: PackageMetadata = {
  name: "@gallery-engine/animations",
  layer: "engine"
};
