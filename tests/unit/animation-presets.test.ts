import { AnimationEngine } from "@gallery-engine/animations";
import type {
  AnimationPlayback,
  AnimationTarget,
  AnimationVars,
  GsapAnimationAdapter
} from "@gallery-engine/animations";
import {
  BUILT_IN_ANIMATION_PRESET_NAMES,
  createBouncePreset,
  createBuiltInAnimationPresets,
  createFadePreset,
  createScalePreset,
  createSlidePreset,
  createZoomPreset,
  registerBuiltInAnimationPresets
} from "@gallery-engine/animations";
import { describe, expect, it, vi } from "vitest";

class FakeAdapter implements GsapAnimationAdapter {
  public readonly fromTo = vi.fn(
    (
      target: AnimationTarget,
      fromVars: AnimationVars,
      toVars: AnimationVars
    ): AnimationPlayback => {
      void target;
      void fromVars;
      void toVars;

      return {};
    }
  );

  public readonly to = vi.fn((target: AnimationTarget, vars: AnimationVars): AnimationPlayback => {
    void target;
    void vars;

    return {};
  });

  public readonly from = vi.fn(
    (target: AnimationTarget, vars: AnimationVars): AnimationPlayback => {
      void target;
      void vars;

      return {};
    }
  );
}

describe("animation presets", () => {
  it("creates the built-in preset names in stable order", () => {
    expect(BUILT_IN_ANIMATION_PRESET_NAMES).toEqual(["fade", "slide", "scale", "zoom", "bounce"]);
    expect(createBuiltInAnimationPresets().map((preset) => preset.name)).toEqual([
      "fade",
      "slide",
      "scale",
      "zoom",
      "bounce"
    ]);
  });

  it("creates fade, slide, scale, zoom, and bounce preset definitions", () => {
    expect(createFadePreset()).toMatchObject({
      name: "fade",
      method: "fromTo",
      fromVars: {
        opacity: 0
      },
      vars: {
        opacity: 1
      }
    });
    expect(createSlidePreset()).toMatchObject({
      name: "slide",
      fromVars: {
        opacity: 0,
        y: 24
      },
      vars: {
        opacity: 1,
        y: 0
      }
    });
    expect(createScalePreset()).toMatchObject({
      name: "scale",
      fromVars: {
        scale: 0.96
      },
      vars: {
        scale: 1
      }
    });
    expect(createZoomPreset()).toMatchObject({
      name: "zoom",
      fromVars: {
        scale: 0.88,
        transformOrigin: "center center"
      }
    });
    expect(createBouncePreset()).toMatchObject({
      name: "bounce",
      fromVars: {
        y: 28,
        scale: 0.94
      },
      vars: {
        y: 0,
        scale: 1
      }
    });
  });

  it("supports preset option overrides", () => {
    const slide = createSlidePreset({
      axis: "x",
      distance: 40,
      duration: 0.5,
      ease: "expo.out",
      name: "slide-left",
      stagger: 0.03,
      vars: {
        opacity: 0.8
      }
    });
    const zoom = createZoomPreset({
      fromScale: 0.5,
      transformOrigin: "top left",
      fromVars: {
        opacity: 0.25
      }
    });

    expect(slide).toMatchObject({
      name: "slide-left",
      fromVars: {
        x: 40
      },
      vars: {
        duration: 0.5,
        ease: "expo.out",
        opacity: 0.8,
        stagger: 0.03,
        x: 0
      }
    });
    expect(zoom).toMatchObject({
      fromVars: {
        opacity: 0.25,
        scale: 0.5,
        transformOrigin: "top left"
      },
      vars: {
        transformOrigin: "top left"
      }
    });
  });

  it("registers built-in presets into an animation engine", () => {
    const adapter = new FakeAdapter();
    const engine = new AnimationEngine({
      adapter
    });

    const presets = registerBuiltInAnimationPresets(engine, {
      fade: {
        duration: 0.1
      }
    });

    expect(presets).toHaveLength(5);
    expect(engine.getNames()).toEqual(BUILT_IN_ANIMATION_PRESET_NAMES);
    expect(engine.get("fade")?.vars).toMatchObject({
      duration: 0.1
    });

    engine.play("fade", {
      target: {}
    });

    expect(adapter.fromTo).toHaveBeenCalledTimes(1);
  });

  it("enforces preset name shape at compile time", () => {
    // @ts-expect-error Built-in preset names are constrained.
    const invalidName: (typeof BUILT_IN_ANIMATION_PRESET_NAMES)[number] = "spin";

    expect(invalidName).toBe("spin");
  });
});
