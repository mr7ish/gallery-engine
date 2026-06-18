import type { AnimationDefinition } from "../animation-engine";
import type { AnimationPresetOptions } from "./types";
import { createPresetDefinition } from "./utils";

export interface ScalePresetOptions extends AnimationPresetOptions {
  readonly fromScale?: number;
}

/**
 * Create a subtle scale-in animation preset.
 */
export const createScalePreset = (options: ScalePresetOptions = {}): AnimationDefinition =>
  createPresetDefinition(
    {
      name: "scale",
      duration: 0.28,
      ease: "power2.out",
      fromVars: {
        opacity: 0,
        scale: options.fromScale ?? 0.96
      },
      vars: {
        opacity: 1,
        scale: 1
      }
    },
    options
  );
