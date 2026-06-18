import type { AnimationDefinition } from "../animation-engine";
import type { AnimationPresetOptions } from "./types";
import { createPresetDefinition } from "./utils";

/**
 * Create a fade-in animation preset.
 */
export const createFadePreset = (options: AnimationPresetOptions = {}): AnimationDefinition =>
  createPresetDefinition(
    {
      name: "fade",
      duration: 0.24,
      ease: "power2.out",
      fromVars: {
        opacity: 0
      },
      vars: {
        opacity: 1
      }
    },
    options
  );
