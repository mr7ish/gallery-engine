import type { AnimationDefinition, AnimationEngine } from "../animation-engine";
import { createBouncePreset } from "./bounce";
import { createFadePreset } from "./fade";
import { createScalePreset } from "./scale";
import { createSlidePreset } from "./slide";
import type { AnimationPresetOptions, BuiltInAnimationPresetName } from "./types";
import { createZoomPreset } from "./zoom";

export type { BouncePresetOptions } from "./bounce";
export { createBouncePreset } from "./bounce";
export { createFadePreset } from "./fade";
export type { ScalePresetOptions } from "./scale";
export { createScalePreset } from "./scale";
export type { SlidePresetOptions } from "./slide";
export { createSlidePreset } from "./slide";
export type {
  AnimationPresetFactory,
  AnimationPresetOptions,
  BuiltInAnimationPresetName
} from "./types";
export type { ZoomPresetOptions } from "./zoom";
export { createZoomPreset } from "./zoom";

export const BUILT_IN_ANIMATION_PRESET_NAMES: readonly BuiltInAnimationPresetName[] = [
  "fade",
  "slide",
  "scale",
  "zoom",
  "bounce"
];

/**
 * Create all built-in animation presets.
 */
export const createBuiltInAnimationPresets = (
  options: Partial<Record<BuiltInAnimationPresetName, AnimationPresetOptions>> = {}
): readonly AnimationDefinition[] => [
  createFadePreset(options.fade),
  createSlidePreset(options.slide),
  createScalePreset(options.scale),
  createZoomPreset(options.zoom),
  createBouncePreset(options.bounce)
];

/**
 * Register all built-in animation presets into an AnimationEngine.
 */
export const registerBuiltInAnimationPresets = (
  engine: AnimationEngine,
  options: Partial<Record<BuiltInAnimationPresetName, AnimationPresetOptions>> = {}
): readonly AnimationDefinition[] => {
  const presets = createBuiltInAnimationPresets(options);

  for (const preset of presets) {
    engine.register(preset);
  }

  return presets;
};
