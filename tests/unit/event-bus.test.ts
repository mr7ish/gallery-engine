import { EventBus } from "@gallery-engine/core";
import { describe, expect, it, vi } from "vitest";

interface TestEvents {
  "image:loaded": {
    readonly id: string;
    readonly src: string;
  };
  "preview:close": undefined;
  "layout:update": {
    readonly height: number;
  };
}

describe("EventBus", () => {
  it("emits payloads to registered handlers in registration order", () => {
    const eventBus = new EventBus<TestEvents>();
    const calls: string[] = [];

    eventBus.on("image:loaded", (payload) => {
      calls.push(`first:${payload.id}`);
    });
    eventBus.on("image:loaded", (payload) => {
      calls.push(`second:${payload.src}`);
    });

    eventBus.emit("image:loaded", {
      id: "hero",
      src: "/hero.jpg"
    });

    expect(calls).toEqual(["first:hero", "second:/hero.jpg"]);
  });

  it("removes handlers with off", () => {
    const eventBus = new EventBus<TestEvents>();
    const handler = vi.fn();

    eventBus.on("layout:update", handler);
    eventBus.off("layout:update", handler);
    eventBus.emit("layout:update", {
      height: 320
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("returns an unsubscribe callback from on", () => {
    const eventBus = new EventBus<TestEvents>();
    const handler = vi.fn();

    const unsubscribe = eventBus.on("layout:update", handler);
    unsubscribe();
    eventBus.emit("layout:update", {
      height: 480
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("runs once handlers only on the first emit", () => {
    const eventBus = new EventBus<TestEvents>();
    const handler = vi.fn();

    eventBus.once("preview:close", handler);
    eventBus.emit("preview:close");
    eventBus.emit("preview:close");

    expect(handler).toHaveBeenCalledOnce();
  });

  it("supports clearing a single event or the full bus", () => {
    const eventBus = new EventBus<TestEvents>();
    const imageHandler = vi.fn();
    const layoutHandler = vi.fn();

    eventBus.on("image:loaded", imageHandler);
    eventBus.on("layout:update", layoutHandler);

    eventBus.clear("image:loaded");
    eventBus.emit("image:loaded", {
      id: "cleared",
      src: "/cleared.jpg"
    });
    eventBus.emit("layout:update", {
      height: 640
    });

    eventBus.clear();
    eventBus.emit("layout:update", {
      height: 720
    });

    expect(imageHandler).not.toHaveBeenCalled();
    expect(layoutHandler).toHaveBeenCalledOnce();
  });

  it("enforces event names and payload types at compile time", () => {
    const eventBus = new EventBus<TestEvents>();

    eventBus.emit("layout:update", {
      height: 240
    });

    // @ts-expect-error Event names must be part of the event map.
    eventBus.emit("layout:change", {
      height: 240
    });

    // @ts-expect-error Payload shape must match the selected event.
    eventBus.emit("layout:update", { id: "wrong-payload" });
  });
});
