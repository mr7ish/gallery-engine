export type AnimationTarget = Element | readonly Element[] | object | readonly object[];

export type AnimationVars = Readonly<Record<string, unknown>>;

export type AnimationMethod = "to" | "from" | "fromTo";

export type AnimationLifecyclePhase = "before-start" | "start" | "complete" | "cancel";

export interface AnimationPlayback {
  play?(): void;
  pause?(): void;
  reverse?(): void;
  kill?(): void;
}

export interface GsapAnimationAdapter {
  to(target: AnimationTarget, vars: AnimationVars): AnimationPlayback;
  from(target: AnimationTarget, vars: AnimationVars): AnimationPlayback;
  fromTo(
    target: AnimationTarget,
    fromVars: AnimationVars,
    toVars: AnimationVars
  ): AnimationPlayback;
}

export interface AnimationLifecycleEvent {
  readonly name: string;
  readonly phase: AnimationLifecyclePhase;
  readonly target: AnimationTarget;
  readonly vars: AnimationVars;
  readonly fromVars: AnimationVars | undefined;
  readonly playback: AnimationPlayback | undefined;
}

export type AnimationLifecycleHook = (event: AnimationLifecycleEvent) => void;

export type AnimationLifecycleHooks = Partial<
  Record<AnimationLifecyclePhase, AnimationLifecycleHook>
>;

export interface AnimationDefinition {
  readonly name: string;
  readonly method?: AnimationMethod;
  readonly vars: AnimationVars;
  readonly fromVars?: AnimationVars;
  readonly hooks?: AnimationLifecycleHooks;
}

export interface AnimationPlayOptions {
  readonly target: AnimationTarget;
  readonly vars?: AnimationVars;
  readonly fromVars?: AnimationVars;
  readonly hooks?: AnimationLifecycleHooks;
}

export interface AnimationEngineOptions {
  readonly adapter: GsapAnimationAdapter;
  readonly hooks?: AnimationLifecycleHooks;
}

export interface RegisteredAnimation {
  readonly name: string;
  readonly method: AnimationMethod;
  readonly vars: AnimationVars;
  readonly fromVars: AnimationVars | undefined;
}

type CallbackVars = Record<string, unknown>;

const DEFAULT_METHOD: AnimationMethod = "to";

/**
 * Registers named animations and delegates playback to a GSAP-compatible adapter.
 */
export class AnimationEngine {
  private readonly adapter: GsapAnimationAdapter;
  private readonly hooks: AnimationLifecycleHooks;
  private readonly definitions = new Map<string, AnimationDefinition>();
  private readonly activePlaybacks = new Map<string, ActiveAnimation>();

  public constructor(options: AnimationEngineOptions) {
    this.adapter = options.adapter;
    this.hooks = options.hooks ?? {};
  }

  /**
   * Register or replace a named animation definition.
   */
  public register(definition: AnimationDefinition): void {
    if (definition.name.trim().length === 0) {
      throw new Error("Animation name is required.");
    }

    if (definition.method === "fromTo" && definition.fromVars === undefined) {
      throw new Error('Animation "fromTo" definitions require fromVars.');
    }

    this.definitions.set(definition.name, definition);
  }

  /**
   * Remove a registered animation definition.
   */
  public unregister(name: string): boolean {
    return this.definitions.delete(name);
  }

  /**
   * Return whether an animation is registered.
   */
  public has(name: string): boolean {
    return this.definitions.has(name);
  }

  /**
   * Return a registered animation snapshot.
   */
  public get(name: string): RegisteredAnimation | undefined {
    const definition = this.definitions.get(name);

    if (!definition) {
      return undefined;
    }

    return {
      name: definition.name,
      method: definition.method ?? DEFAULT_METHOD,
      vars: definition.vars,
      fromVars: definition.fromVars
    };
  }

  /**
   * Return registered animation names in insertion order.
   */
  public getNames(): readonly string[] {
    return [...this.definitions.keys()];
  }

  /**
   * Play a registered animation against a target.
   */
  public play(name: string, options: AnimationPlayOptions): AnimationPlayback {
    const definition = this.definitions.get(name);

    if (!definition) {
      throw new Error(`Animation "${name}" is not registered.`);
    }

    const method = definition.method ?? DEFAULT_METHOD;
    const fromVars = mergeVars(definition.fromVars, options.fromVars);
    const lifecycle = mergeHooks(this.hooks, definition.hooks, options.hooks);

    const emit = (phase: AnimationLifecyclePhase, vars: AnimationVars): void => {
      lifecycle[phase]?.({
        name,
        phase,
        target: options.target,
        vars,
        fromVars,
        playback: this.activePlaybacks.get(name)?.playback
      });
    };

    emit("before-start", mergeVars(definition.vars, options.vars));

    const vars = withLifecycleCallbacks(mergeVars(definition.vars, options.vars), {
      onStart: () => {
        emit("start", vars);
      },
      onComplete: () => {
        emit("complete", vars);
        this.activePlaybacks.delete(name);
      }
    });

    const playback = this.createPlayback(method, options.target, fromVars, vars);
    this.activePlaybacks.set(name, {
      fromVars,
      playback,
      target: options.target,
      vars
    });

    return playback;
  }

  /**
   * Cancel an active animation playback.
   */
  public cancel(name: string): boolean {
    const activeAnimation = this.activePlaybacks.get(name);
    const definition = this.definitions.get(name);

    if (!activeAnimation || !definition) {
      return false;
    }

    activeAnimation.playback.kill?.();
    this.activePlaybacks.delete(name);
    this.emitCancel(name, definition, activeAnimation);

    return true;
  }

  /**
   * Cancel all active playbacks and clear registrations.
   */
  public clear(): void {
    for (const name of [...this.activePlaybacks.keys()]) {
      this.cancel(name);
    }

    this.definitions.clear();
  }

  /**
   * Return active playback names in insertion order.
   */
  public getActiveNames(): readonly string[] {
    return [...this.activePlaybacks.keys()];
  }

  private createPlayback(
    method: AnimationMethod,
    target: AnimationTarget,
    fromVars: AnimationVars | undefined,
    vars: AnimationVars
  ): AnimationPlayback {
    if (method === "from") {
      return this.adapter.from(target, vars);
    }

    if (method === "fromTo") {
      if (fromVars === undefined) {
        throw new Error('Animation "fromTo" playback requires fromVars.');
      }

      return this.adapter.fromTo(target, fromVars, vars);
    }

    return this.adapter.to(target, vars);
  }

  private emitCancel(
    name: string,
    definition: AnimationDefinition,
    activeAnimation: ActiveAnimation
  ): void {
    const lifecycle = mergeHooks(this.hooks, definition.hooks);

    lifecycle.cancel?.({
      name,
      phase: "cancel",
      target: activeAnimation.target,
      vars: activeAnimation.vars,
      fromVars: activeAnimation.fromVars,
      playback: activeAnimation.playback
    });
  }
}

interface ActiveAnimation {
  readonly target: AnimationTarget;
  readonly vars: AnimationVars;
  readonly fromVars: AnimationVars | undefined;
  readonly playback: AnimationPlayback;
}

const mergeVars = (
  baseVars: AnimationVars | undefined,
  overrideVars: AnimationVars | undefined
): AnimationVars => ({
  ...(baseVars ?? {}),
  ...(overrideVars ?? {})
});

const mergeHooks = (
  ...hookSets: readonly (AnimationLifecycleHooks | undefined)[]
): AnimationLifecycleHooks => {
  const merged: Partial<Record<AnimationLifecyclePhase, AnimationLifecycleHook>> = {};

  for (const hooks of hookSets) {
    if (!hooks) {
      continue;
    }

    for (const phase of Object.keys(hooks) as AnimationLifecyclePhase[]) {
      const previousHook = merged[phase];
      const nextHook = hooks[phase];

      if (!nextHook) {
        continue;
      }

      merged[phase] = previousHook
        ? (event) => {
            previousHook(event);
            nextHook(event);
          }
        : nextHook;
    }
  }

  return merged;
};

const withLifecycleCallbacks = (
  vars: AnimationVars,
  callbacks: {
    readonly onStart: () => void;
    readonly onComplete: () => void;
  }
): AnimationVars => {
  const mutableVars: CallbackVars = {
    ...vars
  };
  const originalOnStart = mutableVars.onStart;
  const originalOnComplete = mutableVars.onComplete;

  mutableVars.onStart = (): void => {
    callOptionalCallback(originalOnStart);
    callbacks.onStart();
  };
  mutableVars.onComplete = (): void => {
    callOptionalCallback(originalOnComplete);
    callbacks.onComplete();
  };

  return mutableVars;
};

const callOptionalCallback = (callback: unknown): void => {
  if (isVoidCallback(callback)) {
    callback();
  }
};

const isVoidCallback = (value: unknown): value is () => void => typeof value === "function";
