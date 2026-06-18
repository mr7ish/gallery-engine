import type { AnimationDefinition } from "../animation-engine";
import type { AnimationPresetOptions } from "./types";
import { createPresetDefinition } from "./utils";

export interface ZoomPresetOptions extends AnimationPresetOptions {
  readonly fromScale?: number;
  readonly transformOrigin?: string;
}

/**
 * Create a stronger zoom-in animation preset.
 */
export const createZoomPreset = (options: ZoomPresetOptions = {}): AnimationDefinition =>
  createPresetDefinition(
    {
      name: "zoom",
      duration: 0.34,
      ease: "power3.out",
      fromVars: {
        opacity: 0,
        scale: options.fromScale ?? 0.88,
        transformOrigin: options.transformOrigin ?? "center center"
      },
      vars: {
        opacity: 1,
        scale: 1,
        transformOrigin: options.transformOrigin ?? "center center"
      }
    },
    options
  );
