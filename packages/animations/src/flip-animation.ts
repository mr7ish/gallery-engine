import type { AnimationPlayback, AnimationVars } from "./animation-engine";

export type FlipElementRole = "thumbnail" | "preview";

export type GsapFlipState = unknown;

export interface GsapFlipAdapter {
  getState(target: Element | readonly Element[]): GsapFlipState;
  from(state: GsapFlipState, vars: AnimationVars): AnimationPlayback;
}

export interface FlipElementSnapshot {
  readonly role: FlipElementRole;
  readonly element: Element;
  readonly state: GsapFlipState;
}

export interface FlipPairSnapshot {
  readonly thumbnail: FlipElementSnapshot;
  readonly preview: FlipElementSnapshot;
}

export interface FlipAnimationPair {
  readonly thumbnail: Element;
  readonly preview: Element;
}

export interface FlipTransitionEvent {
  readonly direction: FlipDirection;
  readonly pair: FlipAnimationPair;
  readonly from: FlipElementSnapshot;
  readonly to: FlipElementSnapshot;
  readonly vars: AnimationVars;
  readonly playback: AnimationPlayback | undefined;
}

export type FlipDirection = "open" | "close";

export type FlipTransitionHandler = (event: FlipTransitionEvent) => void;

export interface FlipAnimationOptions {
  readonly adapter: GsapFlipAdapter;
  readonly vars?: AnimationVars;
  readonly onBeforeFlip?: FlipTransitionHandler;
  readonly onComplete?: FlipTransitionHandler;
}

export interface FlipPlayOptions {
  readonly vars?: AnimationVars;
  readonly applyTargetState?: (direction: FlipDirection, pair: FlipAnimationPair) => void;
  readonly onBeforeFlip?: FlipTransitionHandler;
  readonly onComplete?: FlipTransitionHandler;
}

const DEFAULT_FLIP_VARS: AnimationVars = {
  absolute: true,
  duration: 0.35,
  ease: "power2.inOut",
  scale: true
};

/**
 * Coordinates thumbnail-to-preview FLIP animation with a GSAP Flip-compatible adapter.
 */
export class FlipAnimation {
  private readonly adapter: GsapFlipAdapter;
  private readonly vars: AnimationVars;
  private readonly onBeforeFlip: FlipTransitionHandler | undefined;
  private readonly onComplete: FlipTransitionHandler | undefined;
  private activePlayback: AnimationPlayback | undefined;

  public constructor(options: FlipAnimationOptions) {
    this.adapter = options.adapter;
    this.vars = mergeVars(DEFAULT_FLIP_VARS, options.vars);
    this.onBeforeFlip = options.onBeforeFlip;
    this.onComplete = options.onComplete;
  }

  /**
   * Capture a thumbnail element state.
   */
  public captureThumbnailState(element: Element): FlipElementSnapshot {
    return this.captureElementState("thumbnail", element);
  }

  /**
   * Capture a preview element state.
   */
  public capturePreviewState(element: Element): FlipElementSnapshot {
    return this.captureElementState("preview", element);
  }

  /**
   * Capture both thumbnail and preview states.
   */
  public capturePairState(pair: FlipAnimationPair): FlipPairSnapshot {
    return {
      thumbnail: this.captureThumbnailState(pair.thumbnail),
      preview: this.capturePreviewState(pair.preview)
    };
  }

  /**
   * Animate from thumbnail state into preview state.
   */
  public open(pair: FlipAnimationPair, options: FlipPlayOptions = {}): AnimationPlayback {
    return this.play("open", pair, this.captureThumbnailState(pair.thumbnail), options);
  }

  /**
   * Animate from preview state back into thumbnail state.
   */
  public close(pair: FlipAnimationPair, options: FlipPlayOptions = {}): AnimationPlayback {
    return this.play("close", pair, this.capturePreviewState(pair.preview), options);
  }

  /**
   * Cancel the active FLIP playback when supported.
   */
  public cancel(): boolean {
    if (!this.activePlayback) {
      return false;
    }

    this.activePlayback.kill?.();
    this.activePlayback = undefined;

    return true;
  }

  /**
   * Return whether a playback is currently tracked.
   */
  public isActive(): boolean {
    return this.activePlayback !== undefined;
  }

  private captureElementState(role: FlipElementRole, element: Element): FlipElementSnapshot {
    return {
      role,
      element,
      state: this.adapter.getState(element)
    };
  }

  private play(
    direction: FlipDirection,
    pair: FlipAnimationPair,
    from: FlipElementSnapshot,
    options: FlipPlayOptions
  ): AnimationPlayback {
    options.applyTargetState?.(direction, pair);
    const to =
      direction === "open"
        ? this.capturePreviewState(pair.preview)
        : this.captureThumbnailState(pair.thumbnail);
    const vars = mergeVars(this.vars, options.vars);

    const createEvent = (): FlipTransitionEvent => ({
      direction,
      pair,
      from,
      to,
      vars,
      playback: this.activePlayback
    });

    this.onBeforeFlip?.(createEvent());
    options.onBeforeFlip?.(createEvent());
    const playback = this.adapter.from(
      from.state,
      withCompleteCallback(vars, () => {
        this.activePlayback = undefined;
        this.onComplete?.(createEvent());
        options.onComplete?.(createEvent());
      })
    );
    this.activePlayback = playback;

    return playback;
  }
}

const mergeVars = (
  baseVars: AnimationVars | undefined,
  overrideVars: AnimationVars | undefined
): AnimationVars => ({
  ...(baseVars ?? {}),
  ...(overrideVars ?? {})
});

const withCompleteCallback = (vars: AnimationVars, onComplete: () => void): AnimationVars => {
  const mutableVars: Record<string, unknown> = {
    ...vars
  };
  const originalOnComplete = mutableVars.onComplete;

  mutableVars.onComplete = (): void => {
    if (isVoidCallback(originalOnComplete)) {
      originalOnComplete();
    }

    onComplete();
  };

  return mutableVars;
};

const isVoidCallback = (value: unknown): value is () => void => typeof value === "function";
