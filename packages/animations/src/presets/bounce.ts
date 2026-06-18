import type { AnimationDefinition } from "../animation-engine";
import type { AnimationPresetOptions } from "./types";
import { createPresetDefinition } from "./utils";

export interface BouncePresetOptions extends AnimationPresetOptions {
  readonly distance?: number;
  readonly fromScale?: number;
}

/**
 * Create a bounce-in animation preset.
 */
export const createBouncePreset = (options: BouncePresetOptions = {}): AnimationDefinition =>
  createPresetDefinition(
    {
      name: "bounce",
      duration: 0.42,
      ease: "back.out(1.7)",
      fromVars: {
        opacity: 0,
        scale: options.fromScale ?? 0.94,
        y: options.distance ?? 28
      },
      vars: {
        opacity: 1,
        scale: 1,
        y: 0
      }
    },
    options
  );
