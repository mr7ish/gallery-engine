import { AnimationEngine } from "@gallery-engine/animations";
import type {
  AnimationDefinition,
  AnimationLifecycleEvent,
  AnimationPlayback,
  AnimationTarget,
  AnimationVars,
  GsapAnimationAdapter
} from "@gallery-engine/animations";
import { describe, expect, it, vi } from "vitest";

class FakePlayback implements AnimationPlayback {
  public readonly play = vi.fn();
  public readonly pause = vi.fn();
  public readonly reverse = vi.fn();
  public readonly kill = vi.fn();
}

interface AdapterCall {
  readonly method: "to" | "from" | "fromTo";
  readonly target: AnimationTarget;
  readonly vars: AnimationVars;
  readonly fromVars: AnimationVars | undefined;
  readonly playback: FakePlayback;
}

class FakeGsapAdapter implements GsapAnimationAdapter {
  public readonly calls: AdapterCall[] = [];

  public to(target: AnimationTarget, vars: AnimationVars): AnimationPlayback {
    return this.record("to", target, undefined, vars);
  }

  public from(target: AnimationTarget, vars: AnimationVars): AnimationPlayback {
    return this.record("from", target, undefined, vars);
  }

  public fromTo(
    target: AnimationTarget,
    fromVars: AnimationVars,
    toVars: AnimationVars
  ): AnimationPlayback {
    return this.record("fromTo", target, fromVars, toVars);
  }

  private record(
    method: "to" | "from" | "fromTo",
    target: AnimationTarget,
    fromVars: AnimationVars | undefined,
    vars: AnimationVars
  ): AnimationPlayback {
    const playback = new FakePlayback();
    this.calls.push({
      method,
      target,
      vars,
      fromVars,
      playback
    });

    return playback;
  }
}

const callAnimationCallback = (vars: AnimationVars, name: "onStart" | "onComplete"): void => {
  const callback = vars[name];

  if (isVoidCallback(callback)) {
    callback();
  }
};

const isVoidCallback = (value: unknown): value is () => void => typeof value === "function";

describe("AnimationEngine", () => {
  it("registers named animations and exposes snapshots", () => {
    const adapter = new FakeGsapAdapter();
    const engine = new AnimationEngine({
      adapter
    });

    engine.register({
      name: "fade-in",
      vars: {
        opacity: 1,
        duration: 0.2
      }
    });

    expect(engine.has("fade-in")).toBe(true);
    expect(engine.getNames()).toEqual(["fade-in"]);
    expect(engine.get("fade-in")).toEqual({
      name: "fade-in",
      method: "to",
      vars: {
        opacity: 1,
        duration: 0.2
      },
      fromVars: undefined
    });
  });

  it("plays animations through a GSAP-compatible adapter with lifecycle hooks", () => {
    const adapter = new FakeGsapAdapter();
    const target = {
      id: "hero"
    };
    const events = vi.fn<(event: AnimationLifecycleEvent) => void>();
    const originalOnStart = vi.fn();
    const originalOnComplete = vi.fn();
    const engine = new AnimationEngine({
      adapter,
      hooks: {
        "before-start": events,
        start: events,
        complete: events
      }
    });

    engine.register({
      name: "fade-in",
      vars: {
        opacity: 1,
        duration: 0.2,
        onStart: originalOnStart,
        onComplete: originalOnComplete
      }
    });

    const playback = engine.play("fade-in", {
      target,
      vars: {
        duration: 0.4
      }
    });
    const call = adapter.calls[0];

    expect(playback).toBe(call?.playback);
    expect(call).toMatchObject({
      method: "to",
      target,
      vars: {
        opacity: 1,
        duration: 0.4
      }
    });
    expect(events.mock.calls[0]?.[0]).toMatchObject({
      name: "fade-in",
      phase: "before-start",
      target
    });
    expect(engine.getActiveNames()).toEqual(["fade-in"]);

    if (call) {
      callAnimationCallback(call.vars, "onStart");
      callAnimationCallback(call.vars, "onComplete");
    }

    expect(originalOnStart).toHaveBeenCalledTimes(1);
    expect(originalOnComplete).toHaveBeenCalledTimes(1);
    expect(events.mock.calls.map(([event]) => event.phase)).toEqual([
      "before-start",
      "start",
      "complete"
    ]);
    expect(engine.getActiveNames()).toEqual([]);
  });

  it("supports from and fromTo animation methods", () => {
    const adapter = new FakeGsapAdapter();
    const target = {
      id: "hero"
    };
    const engine = new AnimationEngine({
      adapter
    });

    engine.register({
      name: "slide-in",
      method: "from",
      vars: {
        y: 24
      }
    });
    engine.register({
      name: "scale-in",
      method: "fromTo",
      fromVars: {
        scale: 0.8
      },
      vars: {
        scale: 1
      }
    });

    engine.play("slide-in", {
      target
    });
    engine.play("scale-in", {
      target,
      fromVars: {
        opacity: 0
      }
    });

    expect(adapter.calls.map((call) => call.method)).toEqual(["from", "fromTo"]);
    expect(adapter.calls[1]?.fromVars).toEqual({
      scale: 0.8,
      opacity: 0
    });
  });

  it("cancels active animations and emits cancel lifecycle hooks", () => {
    const adapter = new FakeGsapAdapter();
    const target = {
      id: "hero"
    };
    const onCancel = vi.fn();
    const engine = new AnimationEngine({
      adapter,
      hooks: {
        cancel: onCancel
      }
    });

    engine.register({
      name: "fade-in",
      vars: {
        opacity: 1
      }
    });

    engine.play("fade-in", {
      target
    });

    expect(engine.cancel("fade-in")).toBe(true);
    expect(adapter.calls[0]?.playback.kill).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "fade-in",
        phase: "cancel",
        target
      })
    );
    expect(engine.cancel("fade-in")).toBe(false);
  });

  it("clears active playbacks and registered animations", () => {
    const adapter = new FakeGsapAdapter();
    const engine = new AnimationEngine({
      adapter
    });

    engine.register({
      name: "first",
      vars: {
        opacity: 1
      }
    });
    engine.register({
      name: "second",
      vars: {
        x: 10
      }
    });
    engine.play("first", {
      target: {}
    });
    engine.play("second", {
      target: {}
    });

    engine.clear();

    expect(adapter.calls[0]?.playback.kill).toHaveBeenCalledTimes(1);
    expect(adapter.calls[1]?.playback.kill).toHaveBeenCalledTimes(1);
    expect(engine.getActiveNames()).toEqual([]);
    expect(engine.getNames()).toEqual([]);
  });

  it("validates required animation registration and playback inputs", () => {
    const adapter = new FakeGsapAdapter();
    const engine = new AnimationEngine({
      adapter
    });

    expect(() => {
      engine.register({
        name: " ",
        vars: {}
      });
    }).toThrow("Animation name is required.");
    expect(() => {
      engine.register({
        name: "scale-in",
        method: "fromTo",
        vars: {
          scale: 1
        }
      });
    }).toThrow('Animation "fromTo" definitions require fromVars.');
    expect(() => {
      engine.play("missing", {
        target: {}
      });
    }).toThrow('Animation "missing" is not registered.');
  });

  it("enforces animation definition shape at compile time", () => {
    // @ts-expect-error Animation definitions must include vars.
    const invalidDefinition: AnimationDefinition = {
      name: "missing-vars"
    };

    expect(invalidDefinition.name).toBe("missing-vars");
  });
});
