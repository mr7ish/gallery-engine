import {
  AnimationEngine,
  CacheManager,
  Gallery,
  GridLayout,
  PreviewEngine,
  SUITE_PACKAGE_METADATA,
  WatermarkPlugin
} from "@gallery-engine/suite";
import * as suite from "@gallery-engine/suite";
import { describe, expect, it } from "vitest";

describe("@gallery-engine/suite entrypoint", () => {
  it("re-exports the primary named APIs from every package", () => {
    expect(Gallery).toBe(suite.Core.Gallery);
    expect(GridLayout).toBe(suite.Layouts.GridLayout);
    expect(AnimationEngine).toBe(suite.Animations.AnimationEngine);
    expect(PreviewEngine).toBe(suite.Preview.PreviewEngine);
    expect(WatermarkPlugin).toBe(suite.Plugins.WatermarkPlugin);
    expect(CacheManager).toBe(suite.Shared.CacheManager);
  });

  it("describes the aggregated packages", () => {
    expect(SUITE_PACKAGE_METADATA).toEqual({
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
    });
  });

  it("does not expose a default export", () => {
    expect("default" in suite).toBe(false);
  });
});
