export type {
  Layout,
  LayoutCalculationContext,
  LayoutInputItem,
  LayoutItem,
  LayoutResult
} from "./types";
export { LayoutRegistry } from "./types";

export type { GridLayoutOptions } from "./grid-layout";
export { GridLayout } from "./grid-layout";

export type { MasonryLayoutOptions } from "./masonry-layout";
export { MasonryLayout } from "./masonry-layout";

export type { JustifiedLayoutOptions } from "./justified-layout";
export { JustifiedLayout } from "./justified-layout";

export interface PackageMetadata {
  readonly name: string;
  readonly layer: "core" | "engine" | "plugin" | "shared";
}

export const LAYOUTS_PACKAGE_METADATA: PackageMetadata = {
  name: "@gallery-engine/layouts",
  layer: "engine"
};
