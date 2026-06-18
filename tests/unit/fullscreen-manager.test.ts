/**
 * @vitest-environment jsdom
 */

import { FullscreenManager } from "@gallery-engine/preview";
import type { FullscreenState } from "@gallery-engine/preview";
import { afterEach, describe, expect, it, vi } from "vitest";

interface FullscreenMock {
  readonly requestFullscreen: ReturnType<typeof vi.fn<() => Promise<void>>>;
  readonly exitFullscreen: ReturnType<typeof vi.fn<() => Promise<void>>>;
  setElement(element: Element | null): void;
}

const createTarget = (): HTMLElement => {
  const target = document.createElement("section");
  document.body.append(target);

  return target;
};

const installFullscreenMock = (target: HTMLElement): FullscreenMock => {
  let fullscreenElement: Element | null = null;

  const requestFullscreen = vi.fn((): Promise<void> => {
    fullscreenElement = target;
    document.dispatchEvent(new Event("fullscreenchange"));
    return Promise.resolve();
  });
  const exitFullscreen = vi.fn((): Promise<void> => {
    fullscreenElement = null;
    document.dispatchEvent(new Event("fullscreenchange"));
    return Promise.resolve();
  });

  Object.defineProperty(document, "fullscreenEnabled", {
    configurable: true,
    get: () => true
  });
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => fullscreenElement
  });
  Object.defineProperty(document, "exitFullscreen", {
    configurable: true,
    value: exitFullscreen
  });
  Object.defineProperty(target, "requestFullscreen", {
    configurable: true,
    value: requestFullscreen
  });

  return {
    requestFullscreen,
    exitFullscreen,
    setElement(element: Element | null): void {
      fullscreenElement = element;
    }
  };
};

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("FullscreenManager", () => {
  it("enters browser fullscreen and syncs state from fullscreenchange", async () => {
    const target = createTarget();
    const fullscreenMock = installFullscreenMock(target);
    const onChange = vi.fn<(state: FullscreenState) => void>();
    const fullscreenManager = new FullscreenManager({
      target,
      onChange
    });

    fullscreenManager.attach();
    const state = await fullscreenManager.enter();

    expect(fullscreenMock.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(state).toMatchObject({
      active: true,
      element: target,
      target,
      available: true
    });
    expect(onChange).toHaveBeenCalledWith(state);
  });

  it("exits browser fullscreen when active", async () => {
    const target = createTarget();
    const fullscreenMock = installFullscreenMock(target);
    const fullscreenManager = new FullscreenManager({
      target
    });

    fullscreenMock.setElement(target);
    const state = await fullscreenManager.exit();

    expect(fullscreenMock.exitFullscreen).toHaveBeenCalledTimes(1);
    expect(state.active).toBe(false);
    expect(state.element).toBeNull();
  });

  it("toggles fullscreen with F11 and prevents browser default handling", () => {
    const target = createTarget();
    const fullscreenMock = installFullscreenMock(target);
    const fullscreenManager = new FullscreenManager({
      target
    });
    const event = new KeyboardEvent("keydown", {
      key: "F11",
      bubbles: true,
      cancelable: true
    });

    fullscreenManager.attach();

    expect(document.dispatchEvent(event)).toBe(false);
    expect(fullscreenMock.requestFullscreen).toHaveBeenCalledTimes(1);
  });

  it("can disable F11 keyboard handling", () => {
    const target = createTarget();
    const fullscreenMock = installFullscreenMock(target);
    const fullscreenManager = new FullscreenManager({
      target,
      keyboard: false
    });

    fullscreenManager.attach();
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "F11",
        bubbles: true,
        cancelable: true
      })
    );

    expect(fullscreenMock.requestFullscreen).not.toHaveBeenCalled();
  });

  it("syncs state when fullscreen changes outside manager methods", () => {
    const target = createTarget();
    const fullscreenMock = installFullscreenMock(target);
    const onChange = vi.fn<(state: FullscreenState) => void>();
    const fullscreenManager = new FullscreenManager({
      target,
      onChange
    });

    fullscreenManager.attach();
    fullscreenMock.setElement(target);
    document.dispatchEvent(new Event("fullscreenchange"));

    expect(fullscreenManager.getState().active).toBe(true);
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({
      active: true,
      element: target
    });
  });

  it("detaches listeners and clears target on destroy", () => {
    const target = createTarget();
    const fullscreenMock = installFullscreenMock(target);
    const onChange = vi.fn<(state: FullscreenState) => void>();
    const fullscreenManager = new FullscreenManager({
      target,
      onChange
    });

    fullscreenManager.attach();
    fullscreenManager.destroy();
    fullscreenMock.setElement(target);
    document.dispatchEvent(new Event("fullscreenchange"));

    expect(fullscreenManager.isAttached()).toBe(false);
    expect(fullscreenManager.getState().target).toBeUndefined();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("throws when fullscreen target or API support is missing", async () => {
    const target = createTarget();
    const fullscreenManager = new FullscreenManager();
    const unsupportedManager = new FullscreenManager({
      target
    });

    await expect(fullscreenManager.enter()).rejects.toThrow("Fullscreen target is required.");
    await expect(unsupportedManager.enter()).rejects.toThrow("Fullscreen API is not available.");
  });

  it("enforces fullscreen state shape at compile time", () => {
    // @ts-expect-error Fullscreen state must include available.
    const invalidState: FullscreenState = {
      active: false,
      element: null,
      target: undefined
    };

    expect(invalidState.active).toBe(false);
  });
});
