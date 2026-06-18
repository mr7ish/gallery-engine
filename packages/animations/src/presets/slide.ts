import type { AnimationDefinition } from "../animation-engine";
import type { AnimationPresetOptions } from "./types";
import { createPresetDefinition } from "./utils";

export interface SlidePresetOptions extends AnimationPresetOptions {
  readonly distance?: number;
  readonly axis?: "x" | "y";
}

/**
 * Create a slide-in animation preset.
 */
export const createSlidePreset = (options: SlidePresetOptions = {}): AnimationDefinition => {
  const axis = options.axis ?? "y";

  return createPresetDefinition(
    {
      name: "slide",
      duration: 0.32,
      ease: "power3.out",
      fromVars: {
        opacity: 0,
        [axis]: options.distance ?? 24
      },
      vars: {
        opacity: 1,
        [axis]: 0
      }
    },
    options
  );
};
