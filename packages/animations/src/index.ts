export type {
  AnimationDefinition,
  AnimationEngineOptions,
  AnimationLifecycleEvent,
  AnimationLifecycleHook,
  AnimationLifecycleHooks,
  AnimationLifecyclePhase,
  AnimationMethod,
  AnimationPlayback,
  AnimationPlayOptions,
  AnimationTarget,
  AnimationVars,
  GsapAnimationAdapter,
  RegisteredAnimation
} from "./animation-engine";
export { AnimationEngine } from "./animation-engine";

export type {
  FlipAnimationOptions,
  FlipAnimationPair,
  FlipDirection,
  FlipElementRole,
  FlipElementSnapshot,
  FlipPairSnapshot,
  FlipPlayOptions,
  FlipTransitionEvent,
  FlipTransitionHandler,
  GsapFlipAdapter,
  GsapFlipState
} from "./flip-animation";
export { FlipAnimation } from "./flip-animation";

export type {
  AnimationPresetFactory,
  AnimationPresetOptions,
  BouncePresetOptions,
  BuiltInAnimationPresetName,
  ScalePresetOptions,
  SlidePresetOptions,
  ZoomPresetOptions
} from "./presets";
export {
  BUILT_IN_ANIMATION_PRESET_NAMES,
  createBouncePreset,
  createBuiltInAnimationPresets,
  createFadePreset,
  createScalePreset,
  createSlidePreset,
  createZoomPreset,
  registerBuiltInAnimationPresets
} from "./presets";

export interface PackageMetadata {
  readonly name: string;
  readonly layer: "core" | "engine" | "plugin" | "shared";
}

export const ANIMATIONS_PACKAGE_METADATA: PackageMetadata = {
  name: "@gallery-engine/animations",
  layer: "engine"
};
