/**
 * @vitest-environment jsdom
 */

import { LazyObserver } from "@gallery-engine/core";
import type { LazyObserverEntry } from "@gallery-engine/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MockIntersectionObserver implements IntersectionObserver {
  public static instances: MockIntersectionObserver[] = [];

  public readonly root: Element | Document | null;
  public readonly rootMargin: string;
  public readonly thresholds: readonly number[];
  public readonly observedElements = new Set<Element>();

  private readonly callback: IntersectionObserverCallback;

  public constructor(
    callback: IntersectionObserverCallback,
    options: IntersectionObserverInit = {}
  ) {
    this.callback = callback;
    this.root = options.root ?? null;
    this.rootMargin = options.rootMargin ?? "0px";
    this.thresholds = Array.isArray(options.threshold)
      ? [...options.threshold]
      : [options.threshold ?? 0];
    MockIntersectionObserver.instances.push(this);
  }

  public observe(element: Element): void {
    this.observedElements.add(element);
  }

  public unobserve(element: Element): void {
    this.observedElements.delete(element);
  }

  public disconnect(): void {
    this.observedElements.clear();
  }

  public takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  public trigger(entries: readonly IntersectionObserverEntry[]): void {
    this.callback([...entries], this);
  }
}

const originalIntersectionObserver = globalThis.IntersectionObserver;

const createEntry = (
  target: Element,
  isIntersecting: boolean,
  intersectionRatio: number
): IntersectionObserverEntry => ({
  boundingClientRect: target.getBoundingClientRect(),
  intersectionRatio,
  intersectionRect: target.getBoundingClientRect(),
  isIntersecting,
  rootBounds: null,
  target,
  time: 0
});

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  globalThis.IntersectionObserver = MockIntersectionObserver;
});

afterEach(() => {
  globalThis.IntersectionObserver = originalIntersectionObserver;
  document.body.replaceChildren();
});

describe("LazyObserver", () => {
  it("creates an IntersectionObserver with configured options", () => {
    const root = document.createElement("section");
    const onLoad = vi.fn();

    new LazyObserver({
      root,
      rootMargin: "300px",
      threshold: [0, 0.5],
      onLoad
    });

    const observer = MockIntersectionObserver.instances[0];

    expect(observer?.root).toBe(root);
    expect(observer?.rootMargin).toBe("300px");
    expect(observer?.thresholds).toEqual([0, 0.5]);
  });

  it("observes elements and emits visible entries with associated data", () => {
    const element = document.createElement("img");
    const onLoad = vi.fn<(entry: LazyObserverEntry<{ readonly id: string }>) => void>();
    const lazyObserver = new LazyObserver({
      onLoad
    });
    const observer = MockIntersectionObserver.instances[0];

    lazyObserver.observe(element, {
      id: "hero"
    });
    observer?.trigger([createEntry(element, true, 1)]);

    expect(lazyObserver.isObserved(element)).toBe(false);
    expect(lazyObserver.getObservedCount()).toBe(0);
    const firstCall = onLoad.mock.calls[0]?.[0];
    expect(firstCall?.element).toBe(element);
    expect(firstCall?.entry.isIntersecting).toBe(true);
    expect(firstCall?.entry.target).toBe(element);
    expect(firstCall?.data).toEqual({
      id: "hero"
    });
  });

  it("ignores entries that are not visible", () => {
    const element = document.createElement("img");
    const onLoad = vi.fn();
    const lazyObserver = new LazyObserver({
      onLoad
    });
    const observer = MockIntersectionObserver.instances[0];

    lazyObserver.observe(element, "hero");
    observer?.trigger([createEntry(element, false, 0)]);

    expect(lazyObserver.isObserved(element)).toBe(true);
    expect(onLoad).not.toHaveBeenCalled();
  });

  it("can keep observing visible elements when once is false", () => {
    const element = document.createElement("img");
    const onLoad = vi.fn();
    const lazyObserver = new LazyObserver({
      once: false,
      onLoad
    });
    const observer = MockIntersectionObserver.instances[0];

    lazyObserver.observe(element, "hero");
    observer?.trigger([createEntry(element, true, 1)]);
    observer?.trigger([createEntry(element, true, 1)]);

    expect(lazyObserver.isObserved(element)).toBe(true);
    expect(onLoad).toHaveBeenCalledTimes(2);
  });

  it("unobserves and disconnects tracked elements", () => {
    const firstElement = document.createElement("img");
    const secondElement = document.createElement("img");
    const lazyObserver = new LazyObserver({
      onLoad: () => {
        return;
      }
    });
    const observer = MockIntersectionObserver.instances[0];

    lazyObserver.observe(firstElement, "first");
    lazyObserver.observe(secondElement, "second");
    lazyObserver.unobserve(firstElement);

    expect(lazyObserver.isObserved(firstElement)).toBe(false);
    expect(lazyObserver.isObserved(secondElement)).toBe(true);
    expect(observer?.observedElements.has(firstElement)).toBe(false);

    lazyObserver.disconnect();

    expect(lazyObserver.getObservedCount()).toBe(0);
    expect(observer?.observedElements.size).toBe(0);
  });

  it("throws when IntersectionObserver is unavailable", () => {
    globalThis.IntersectionObserver = undefined as unknown as typeof IntersectionObserver;

    expect(() => {
      new LazyObserver({
        onLoad: () => {
          return;
        }
      });
    }).toThrow("IntersectionObserver is not available in this environment.");
  });
});
