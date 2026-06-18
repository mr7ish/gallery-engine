import type { AnimationDefinition, AnimationVars } from "../animation-engine";
import type { AnimationPresetOptions, BuiltInAnimationPresetName } from "./types";

export interface PresetDefaults {
  readonly name: BuiltInAnimationPresetName;
  readonly duration: number;
  readonly ease: string;
  readonly fromVars: AnimationVars;
  readonly vars: AnimationVars;
}

export const createPresetDefinition = (
  defaults: PresetDefaults,
  options: AnimationPresetOptions = {}
): AnimationDefinition => ({
  name: options.name ?? defaults.name,
  method: "fromTo",
  fromVars: mergeVars(defaults.fromVars, options.fromVars),
  vars: mergeVars(defaults.vars, {
    duration: options.duration ?? defaults.duration,
    ease: options.ease ?? defaults.ease,
    stagger: options.stagger,
    ...options.vars
  })
});

const mergeVars = (
  baseVars: AnimationVars,
  overrideVars: AnimationVars | undefined
): AnimationVars => {
  const mergedVars: Record<string, unknown> = {
    ...baseVars
  };

  for (const [key, value] of Object.entries(overrideVars ?? {})) {
    if (value !== undefined) {
      mergedVars[key] = value;
    }
  }

  return mergedVars;
};
