import type { AnimationDefinition, AnimationVars } from "../animation-engine";

export type BuiltInAnimationPresetName = "fade" | "slide" | "scale" | "zoom" | "bounce";

export interface AnimationPresetOptions {
  readonly name?: string;
  readonly duration?: number;
  readonly ease?: string;
  readonly stagger?: number;
  readonly vars?: AnimationVars;
  readonly fromVars?: AnimationVars;
}

export type AnimationPresetFactory = (options?: AnimationPresetOptions) => AnimationDefinition;
