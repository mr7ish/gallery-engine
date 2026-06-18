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

export interface PackageMetadata {
  readonly name: string;
  readonly layer: "core" | "engine" | "plugin" | "shared";
}

export const ANIMATIONS_PACKAGE_METADATA: PackageMetadata = {
  name: "@gallery-engine/animations",
  layer: "engine"
};
