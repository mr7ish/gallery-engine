export interface PackageMetadata {
  readonly name: string;
  readonly layer: "core" | "engine" | "plugin" | "shared";
}

export const LAYOUTS_PACKAGE_METADATA: PackageMetadata = {
  name: "@gallery-engine/layouts",
  layer: "engine"
};
