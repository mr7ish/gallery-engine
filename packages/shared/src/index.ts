export interface PackageMetadata {
  readonly name: string;
  readonly layer: "core" | "engine" | "plugin" | "shared";
}

export const SHARED_PACKAGE_METADATA: PackageMetadata = {
  name: "@gallery-engine/shared",
  layer: "shared"
};
