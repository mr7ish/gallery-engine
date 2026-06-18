/**
 * @vitest-environment jsdom
 */

import { FlipAnimation } from "@gallery-engine/animations";
import type {
  AnimationPlayback,
  AnimationVars,
  FlipAnimationPair,
  FlipTransitionEvent,
  GsapFlipAdapter,
  GsapFlipState
} from "@gallery-engine/animations";
import { afterEach, describe, expect, it, vi } from "vitest";

interface FakeFlipState {
  readonly id: string;
  readonly index: number;
}

interface FlipFromCall {
  readonly state: GsapFlipState;
  readonly vars: AnimationVars;
  readonly playback: FakePlayback;
}

class FakePlayback implements AnimationPlayback {
  public readonly kill = vi.fn();
}

class FakeFlipAdapter implements GsapFlipAdapter {
  public readonly captured: Element[] = [];
  public readonly fromCalls: FlipFromCall[] = [];
  private nextIndex = 1;

  public getState(target: Element | readonly Element[]): GsapFlipState {
    const element = resolveFirstElement(target);

    this.captured.push(element);

    const state: FakeFlipState = {
      id: element.id,
      index: this.nextIndex
    };
    this.nextIndex += 1;

    return state;
  }

  public from(state: GsapFlipState, vars: AnimationVars): AnimationPlayback {
    const playback = new FakePlayback();
    this.fromCalls.push({
      state,
      vars,
      playback
    });

    return playback;
  }
}

const createPair = (): FlipAnimationPair => {
  const thumbnail = document.createElement("img");
  const preview = document.createElement("img");
  thumbnail.id = "thumbnail";
  preview.id = "preview";
  document.body.append(thumbnail, preview);

  return {
    thumbnail,
    preview
  };
};

const callComplete = (vars: AnimationVars): void => {
  const callback = vars.onComplete;

  if (isVoidCallback(callback)) {
    callback();
  }
};

const resolveFirstElement = (target: Element | readonly Element[]): Element => {
  if (target instanceof Element) {
    return target;
  }

  const [element] = target;

  if (!element) {
    throw new Error("Expected FLIP target.");
  }

  return element;
};

const isVoidCallback = (value: unknown): value is () => void => typeof value === "function";

afterEach(() => {
  document.body.replaceChildren();
});

describe("FlipAnimation", () => {
  it("captures thumbnail, preview, and pair states", () => {
    const adapter = new FakeFlipAdapter();
    const pair = createPair();
    const flipAnimation = new FlipAnimation({
      adapter
    });

    const thumbnail = flipAnimation.captureThumbnailState(pair.thumbnail);
    const preview = flipAnimation.capturePreviewState(pair.preview);
    const pairState = flipAnimation.capturePairState(pair);

    expect(thumbnail).toMatchObject({
      role: "thumbnail",
      element: pair.thumbnail,
      state: {
        id: "thumbnail"
      }
    });
    expect(preview).toMatchObject({
      role: "preview",
      element: pair.preview,
      state: {
        id: "preview"
      }
    });
    expect(pairState.thumbnail.role).toBe("thumbnail");
    expect(pairState.preview.role).toBe("preview");
  });

  it("opens from thumbnail state into preview state with GSAP Flip vars", () => {
    const adapter = new FakeFlipAdapter();
    const pair = createPair();
    const onBeforeFlip = vi.fn<(event: FlipTransitionEvent) => void>();
    const onComplete = vi.fn<(event: FlipTransitionEvent) => void>();
    const applyTargetState =
      vi.fn<(direction: "open" | "close", pair: FlipAnimationPair) => void>();
    const flipAnimation = new FlipAnimation({
      adapter,
      vars: {
        duration: 0.5
      },
      onBeforeFlip,
      onComplete
    });

    const playback = flipAnimation.open(pair, {
      applyTargetState,
      vars: {
        ease: "expo.out"
      }
    });
    const call = adapter.fromCalls[0];

    expect(applyTargetState).toHaveBeenCalledWith("open", pair);
    expect(call).toMatchObject({
      state: {
        id: "thumbnail"
      },
      vars: {
        absolute: true,
        duration: 0.5,
        ease: "expo.out",
        scale: true
      },
      playback
    });
    const beforeEvent = onBeforeFlip.mock.calls[0]?.[0];

    expect(beforeEvent?.direction).toBe("open");
    expect(beforeEvent?.from.role).toBe("thumbnail");
    expect(beforeEvent?.to.role).toBe("preview");
    expect(flipAnimation.isActive()).toBe(true);

    if (call) {
      callComplete(call.vars);
    }

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: "open"
      })
    );
    expect(flipAnimation.isActive()).toBe(false);
  });

  it("closes from preview state back into thumbnail state", () => {
    const adapter = new FakeFlipAdapter();
    const pair = createPair();
    const flipAnimation = new FlipAnimation({
      adapter
    });

    flipAnimation.close(pair, {
      applyTargetState: (direction) => {
        expect(direction).toBe("close");
      }
    });

    expect(adapter.fromCalls[0]).toMatchObject({
      state: {
        id: "preview"
      }
    });
    expect(adapter.captured.map((element) => element.id)).toEqual(["preview", "thumbnail"]);
  });

  it("cancels active playback when supported", () => {
    const adapter = new FakeFlipAdapter();
    const pair = createPair();
    const flipAnimation = new FlipAnimation({
      adapter
    });

    expect(flipAnimation.cancel()).toBe(false);
    flipAnimation.open(pair);

    expect(flipAnimation.cancel()).toBe(true);
    expect(adapter.fromCalls[0]?.playback.kill).toHaveBeenCalledTimes(1);
    expect(flipAnimation.isActive()).toBe(false);
  });

  it("chains user onComplete callbacks with FLIP completion", () => {
    const adapter = new FakeFlipAdapter();
    const pair = createPair();
    const originalOnComplete = vi.fn();
    const optionOnComplete = vi.fn<(event: FlipTransitionEvent) => void>();
    const flipAnimation = new FlipAnimation({
      adapter,
      vars: {
        onComplete: originalOnComplete
      }
    });

    flipAnimation.open(pair, {
      onComplete: optionOnComplete
    });
    const call = adapter.fromCalls[0];

    if (call) {
      callComplete(call.vars);
    }

    expect(originalOnComplete).toHaveBeenCalledTimes(1);
    expect(optionOnComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: "open"
      })
    );
  });

  it("enforces FLIP pair shape at compile time", () => {
    const pair = createPair();

    // @ts-expect-error FLIP pairs require a preview element.
    const invalidPair: FlipAnimationPair = {
      thumbnail: pair.thumbnail
    };

    expect(invalidPair.thumbnail).toBe(pair.thumbnail);
  });
});
