/**
 * @vitest-environment jsdom
 */

import { ImageLoader } from "@gallery-engine/core";
import type { ImageLoadState } from "@gallery-engine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

type DecodeMock = ReturnType<typeof vi.fn<() => Promise<void>>>;

const createdImages: HTMLImageElement[] = [];
const decodeMocks = new WeakMap<HTMLImageElement, DecodeMock>();

const createMockImage = (): HTMLImageElement => {
  const image = document.createElement("img");
  const decode = vi.fn<() => Promise<void>>(() => Promise.resolve());

  Object.defineProperty(image, "decode", {
    configurable: true,
    value: decode
  });
  createdImages.push(image);
  decodeMocks.set(image, decode);
  return image;
};

const getCreatedImage = (index: number): HTMLImageElement => {
  const image = createdImages[index];

  if (image === undefined) {
    throw new Error(`Expected created image at index ${String(index)}.`);
  }

  return image;
};

const getDecodeMock = (image: HTMLImageElement): DecodeMock => {
  const decode = decodeMocks.get(image);

  if (decode === undefined) {
    throw new Error("Expected image decode mock to be registered.");
  }

  return decode;
};

const triggerLoad = (image: HTMLImageElement): void => {
  image.onload?.(new Event("load"));
};

const triggerError = (image: HTMLImageElement): void => {
  image.onerror?.(new Event("error"));
};

const flushTasks = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, 0);
  });
  await new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, 0);
  });
  await Promise.resolve();
};

beforeEach(() => {
  createdImages.length = 0;
  document.body.replaceChildren();
});

describe("ImageLoader", () => {
  it("loads one image, decodes it, and updates state", async () => {
    const states: ImageLoadState[] = [];
    const imageLoader = new ImageLoader({
      createImage: createMockImage,
      onStateChange: (state) => {
        states.push(state);
      }
    });
    const promise = imageLoader.load({
      id: "hero",
      src: "/hero.jpg",
      alt: "Hero"
    });
    const heroImage = getCreatedImage(0);

    expect(imageLoader.getActiveCount()).toBe(1);
    expect(heroImage.src).toContain("/hero.jpg");
    expect(heroImage.alt).toBe("Hero");

    triggerLoad(heroImage);
    const result = await promise;

    expect(result).toMatchObject({
      id: "hero",
      src: "/hero.jpg",
      attempts: 1
    });
    expect(result.element).toBe(heroImage);
    expect(getDecodeMock(heroImage)).toHaveBeenCalledTimes(1);
    expect(imageLoader.getState("hero")?.status).toBe("loaded");
    expect(states.map((state) => state.status)).toEqual(["idle", "loading", "loaded"]);
  });

  it("retries failed requests and reports final attempt count", async () => {
    const imageLoader = new ImageLoader({
      createImage: createMockImage,
      retries: 1,
      retryDelay: 0
    });
    const promise = imageLoader.load({
      id: "retry",
      src: "/retry.jpg"
    });

    triggerError(getCreatedImage(0));
    await flushTasks();
    triggerLoad(getCreatedImage(1));

    const result = await promise;

    expect(result.attempts).toBe(2);
    expect(createdImages).toHaveLength(2);
    expect(imageLoader.getState("retry")).toMatchObject({
      status: "loaded",
      attempts: 2
    });
  });

  it("stores error state when retries are exhausted", async () => {
    const imageLoader = new ImageLoader({
      createImage: createMockImage,
      retries: 1,
      decode: false
    });
    const promise = imageLoader.load({
      id: "broken",
      src: "/broken.jpg"
    });
    const firstImage = getCreatedImage(0);

    triggerError(firstImage);
    await flushTasks();
    triggerError(getCreatedImage(1));

    await expect(promise).rejects.toThrow("Failed to load image: /broken.jpg");
    expect(imageLoader.getState("broken")?.status).toBe("error");
    expect(imageLoader.getState("broken")?.attempts).toBe(2);
    expect(getDecodeMock(firstImage)).not.toHaveBeenCalled();
  });

  it("limits concurrent image requests and preserves loadMany order", async () => {
    const imageLoader = new ImageLoader({
      createImage: createMockImage,
      maxConcurrent: 2
    });
    const promise = imageLoader.loadMany([
      {
        id: "one",
        src: "/one.jpg"
      },
      {
        id: "two",
        src: "/two.jpg"
      },
      {
        id: "three",
        src: "/three.jpg"
      }
    ]);

    expect(createdImages).toHaveLength(2);
    expect(imageLoader.getQueueSize()).toBe(1);

    triggerLoad(getCreatedImage(0));
    await flushTasks();

    expect(createdImages).toHaveLength(3);
    expect(imageLoader.getActiveCount()).toBe(2);

    triggerLoad(getCreatedImage(1));
    triggerLoad(getCreatedImage(2));

    const results = await promise;

    expect(results.map((result) => result.id)).toEqual(["one", "two", "three"]);
    expect(imageLoader.getQueueSize()).toBe(0);
    expect(imageLoader.getActiveCount()).toBe(0);
  });

  it("can clear queued work and state snapshots", () => {
    const imageLoader = new ImageLoader({
      createImage: createMockImage,
      maxConcurrent: 1
    });

    void imageLoader.load({
      id: "active",
      src: "/active.jpg"
    });
    void imageLoader.load({
      id: "queued",
      src: "/queued.jpg"
    });

    expect(imageLoader.getQueueSize()).toBe(1);
    expect(imageLoader.getStates()).toHaveLength(2);

    imageLoader.clear();

    expect(imageLoader.getQueueSize()).toBe(0);
    expect(imageLoader.getStates()).toEqual([]);
  });
});
