/**
 * @vitest-environment jsdom
 */

import { ScrollManager } from "@gallery-engine/core";
import type { ScrollPosition, ScrollState } from "@gallery-engine/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

const frameTimers = new Map<number, ReturnType<typeof setTimeout>>();
let nextFrameId = 1;

const createScrollableElement = (): HTMLElement => {
  const element = document.createElement("div");

  Object.defineProperties(element, {
    clientWidth: {
      configurable: true,
      value: 320
    },
    clientHeight: {
      configurable: true,
      value: 240
    },
    scrollWidth: {
      configurable: true,
      value: 960
    },
    scrollHeight: {
      configurable: true,
      value: 1_200
    }
  });

  document.body.append(element);

  return element;
};

const installAnimationFrameMock = (): void => {
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    const frameId = nextFrameId;
    nextFrameId += 1;

    const timerId = setTimeout(() => {
      frameTimers.delete(frameId);
      callback(0);
    }, 16);

    frameTimers.set(frameId, timerId);

    return frameId;
  };

  globalThis.cancelAnimationFrame = (frameId: number): void => {
    const timerId = frameTimers.get(frameId);

    if (timerId !== undefined) {
      clearTimeout(timerId);
      frameTimers.delete(frameId);
    }
  };
};

const dispatchScroll = (element: HTMLElement): void => {
  element.dispatchEvent(new Event("scroll"));
};

beforeEach(() => {
  vi.useFakeTimers();
  frameTimers.clear();
  nextFrameId = 1;
  installAnimationFrameMock();
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  document.body.replaceChildren();
});

describe("ScrollManager", () => {
  it("listens for scroll events and detects start, frame, and end states", () => {
    const element = createScrollableElement();
    const onScrollStart = vi.fn<(state: ScrollState) => void>();
    const onScroll = vi.fn<(state: ScrollState) => void>();
    const onScrollEnd = vi.fn<(state: ScrollState) => void>();
    const scrollManager = new ScrollManager({
      target: element,
      endDelay: 40,
      onScrollStart,
      onScroll,
      onScrollEnd
    });

    scrollManager.start();
    element.scrollTop = 120;
    element.scrollLeft = 8;
    dispatchScroll(element);

    expect(scrollManager.isListening()).toBe(true);
    expect(scrollManager.isScrolling()).toBe(true);
    expect(onScrollStart).toHaveBeenCalledWith({
      scrollTop: 120,
      scrollLeft: 8,
      clientWidth: 320,
      clientHeight: 240,
      scrollWidth: 960,
      scrollHeight: 1_200,
      isScrolling: true
    });
    expect(onScroll).not.toHaveBeenCalled();

    vi.advanceTimersByTime(16);

    expect(onScroll).toHaveBeenCalledWith({
      scrollTop: 120,
      scrollLeft: 8,
      clientWidth: 320,
      clientHeight: 240,
      scrollWidth: 960,
      scrollHeight: 1_200,
      isScrolling: true
    });

    vi.advanceTimersByTime(40);

    expect(scrollManager.isScrolling()).toBe(false);
    expect(onScrollEnd).toHaveBeenCalledWith({
      scrollTop: 120,
      scrollLeft: 8,
      clientWidth: 320,
      clientHeight: 240,
      scrollWidth: 960,
      scrollHeight: 1_200,
      isScrolling: false
    });
  });

  it("throttles multiple scroll events into one animation frame", () => {
    const element = createScrollableElement();
    const onScroll = vi.fn<(state: ScrollState) => void>();
    const scrollManager = new ScrollManager({
      target: element,
      onScroll
    });

    scrollManager.start();
    element.scrollTop = 10;
    dispatchScroll(element);
    element.scrollTop = 20;
    dispatchScroll(element);
    element.scrollTop = 30;
    dispatchScroll(element);

    vi.advanceTimersByTime(16);

    expect(onScroll).toHaveBeenCalledTimes(1);
    expect(onScroll.mock.calls[0]?.[0].scrollTop).toBe(30);
  });

  it("delays scroll end until events stop arriving", () => {
    const element = createScrollableElement();
    const onScrollStart = vi.fn<(state: ScrollState) => void>();
    const onScrollEnd = vi.fn<(state: ScrollState) => void>();
    const scrollManager = new ScrollManager({
      target: element,
      endDelay: 50,
      onScrollStart,
      onScrollEnd
    });

    scrollManager.start();
    dispatchScroll(element);
    vi.advanceTimersByTime(30);
    dispatchScroll(element);
    vi.advanceTimersByTime(49);

    expect(onScrollStart).toHaveBeenCalledTimes(1);
    expect(onScrollEnd).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(onScrollEnd).toHaveBeenCalledTimes(1);
  });

  it("saves, restores, and clears cached positions", () => {
    const element = createScrollableElement();
    const scrollManager = new ScrollManager({
      target: element
    });

    element.scrollTop = 320;
    element.scrollLeft = 16;

    expect(scrollManager.savePosition("gallery")).toEqual({
      scrollTop: 320,
      scrollLeft: 16
    });

    element.scrollTop = 0;
    element.scrollLeft = 0;

    const restoredPosition = scrollManager.restorePosition("gallery");

    expect(restoredPosition).toEqual({
      scrollTop: 320,
      scrollLeft: 16
    });
    expect(element.scrollTop).toBe(320);
    expect(element.scrollLeft).toBe(16);
    expect(scrollManager.getCachedPosition("missing")).toBeUndefined();

    scrollManager.clearPosition("gallery");

    expect(scrollManager.getCachedPosition("gallery")).toBeUndefined();
  });

  it("stops listening and cancels pending callbacks", () => {
    const element = createScrollableElement();
    const onScroll = vi.fn<(state: ScrollState) => void>();
    const onScrollEnd = vi.fn<(state: ScrollState) => void>();
    const scrollManager = new ScrollManager({
      target: element,
      endDelay: 20,
      onScroll,
      onScrollEnd
    });

    scrollManager.start();
    dispatchScroll(element);
    scrollManager.stop();
    vi.advanceTimersByTime(20);
    dispatchScroll(element);
    vi.advanceTimersByTime(16);

    expect(scrollManager.isListening()).toBe(false);
    expect(scrollManager.isScrolling()).toBe(false);
    expect(onScroll).not.toHaveBeenCalled();
    expect(onScrollEnd).not.toHaveBeenCalled();
  });

  it("destroys listeners and cached positions", () => {
    const element = createScrollableElement();
    const scrollManager = new ScrollManager({
      target: element
    });
    const position: ScrollPosition = {
      scrollTop: 1,
      scrollLeft: 2
    };

    element.scrollTop = position.scrollTop;
    element.scrollLeft = position.scrollLeft;
    scrollManager.start();
    scrollManager.savePosition();
    scrollManager.destroy();

    expect(scrollManager.isListening()).toBe(false);
    expect(scrollManager.getCachedPosition()).toBeUndefined();
    expect(() => scrollManager.getState()).not.toThrow();
  });

  it("enforces cached position shape at compile time", () => {
    const element = createScrollableElement();
    const scrollManager = new ScrollManager({
      target: element
    });

    // @ts-expect-error Cached positions must include scrollLeft.
    const invalidPosition: ScrollPosition = {
      scrollTop: 10
    };

    expect(invalidPosition.scrollTop).toBe(10);
    expect(scrollManager.getState().scrollTop).toBe(0);
  });
});
