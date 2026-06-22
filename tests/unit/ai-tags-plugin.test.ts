// @vitest-environment jsdom

import { AiTagsPlugin } from "@gallery-engine/plugins";
import type { AiTagProvider, AiTaggableImage, AiTagsGalleryContext } from "@gallery-engine/plugins";
import { afterEach, describe, expect, it, vi } from "vitest";

const createImages = (): readonly AiTaggableImage[] => [
  {
    id: "city",
    src: "/images/city.jpg",
    title: "City Lights",
    alt: "Skyline",
    category: "travel"
  },
  {
    id: "forest",
    src: "/images/forest.png",
    alt: "Forest Path"
  }
];

const createContext = (images = createImages()): AiTagsGalleryContext => ({
  getConfig: () => ({
    container: "#tags",
    images
  })
});

const createContainer = (): HTMLElement => {
  document.body.innerHTML = '<section id="tags"></section>';
  const element = document.querySelector<HTMLElement>("#tags");

  if (!element) {
    throw new Error("Expected tags container.");
  }

  return element;
};

const getFirstImage = (): AiTaggableImage => {
  const image = createImages()[0];

  if (!image) {
    throw new Error("Expected a fixture image.");
  }

  return image;
};

describe("AiTagsPlugin", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("generates tags for a single image", async () => {
    const generateTags = vi.fn<AiTagProvider["generateTags"]>(() => ["city", "night", "city"]);
    const provider: AiTagProvider = {
      generateTags
    };
    const plugin = new AiTagsPlugin({
      provider,
      renderTags: false
    });
    const image = getFirstImage();

    const result = await plugin.tagImage(image);

    expect(result).toEqual({
      image,
      tags: ["city", "night"],
      cached: false,
      index: 0
    });
    expect(generateTags).toHaveBeenCalledWith({
      image,
      index: 0
    });
  });

  it("uses cached tags until force is requested", async () => {
    const generateTags = vi
      .fn<AiTagProvider["generateTags"]>()
      .mockReturnValueOnce(["first"])
      .mockReturnValueOnce(["second"]);
    const plugin = new AiTagsPlugin({
      provider: {
        generateTags
      },
      renderTags: false
    });
    const image = getFirstImage();

    const firstResult = await plugin.tagImage(image);
    const cachedResult = await plugin.tagImage(image);
    const forcedResult = await plugin.tagImage(image, {
      force: true
    });

    expect(firstResult.tags).toEqual(["first"]);
    expect(cachedResult.tags).toEqual(["first"]);
    expect(cachedResult.cached).toBe(true);
    expect(forcedResult.tags).toEqual(["second"]);
    expect(generateTags).toHaveBeenCalledTimes(2);
  });

  it("generates tags for gallery images by id and renders them", async () => {
    createContainer();
    const provider: AiTagProvider = {
      generateTags: ({ image }) => [image.category ?? "nature", image.id]
    };
    const plugin = new AiTagsPlugin({
      provider,
      className: "custom-tags"
    });

    plugin.install(createContext());

    const results = await plugin.tagMany(["city", "forest"]);
    const element = plugin.getElement();

    expect(results.map((result) => result.tags)).toEqual([
      ["travel", "city"],
      ["nature", "forest"]
    ]);
    expect(element?.classList.contains("gallery-engine-ai-tags")).toBe(true);
    expect(element?.classList.contains("custom-tags")).toBe(true);
    expect(element?.querySelectorAll("[data-image-id]")).toHaveLength(2);
    expect(element?.textContent).toContain("City Lights");
    expect(element?.textContent).toContain("forest");
  });

  it("supports custom cache keys and cache clearing", async () => {
    const generateTags = vi.fn<AiTagProvider["generateTags"]>(() => ["tagged"]);
    const plugin = new AiTagsPlugin({
      provider: {
        generateTags
      },
      cacheKey: (image) => image.src,
      renderTags: false
    });
    const image = getFirstImage();

    await plugin.tagImage(image);

    expect(plugin.getCachedTags(image)).toEqual(["tagged"]);

    plugin.clearCache(image);

    expect(plugin.getCachedTags(image)).toBeUndefined();

    await plugin.tagImage(image);
    plugin.clearCache();

    expect(plugin.getCachedResults()).toEqual([]);
  });

  it("skips rendering when requested", async () => {
    createContainer();
    const plugin = new AiTagsPlugin({
      provider: {
        generateTags: () => ["hidden"]
      }
    });

    plugin.install(createContext());
    await plugin.tagMany(undefined, {
      render: false
    });

    expect(plugin.getElement()).toBeUndefined();
  });

  it("removes rendered UI and context on destroy", async () => {
    createContainer();
    const plugin = new AiTagsPlugin({
      provider: {
        generateTags: () => ["temporary"]
      }
    });

    plugin.install(createContext());
    await plugin.tagMany();
    const element = plugin.getElement();

    plugin.destroy();

    expect(element?.isConnected).toBe(false);
    expect(plugin.getElement()).toBeUndefined();
    expect(await plugin.tagMany()).toEqual([]);
  });

  it("propagates provider errors", async () => {
    const plugin = new AiTagsPlugin({
      provider: {
        generateTags: () => {
          throw new Error("provider failed");
        }
      },
      renderTags: false
    });

    await expect(plugin.tagImage(getFirstImage())).rejects.toThrow("provider failed");
  });

  it("throws when an image id is missing", async () => {
    const plugin = new AiTagsPlugin({
      provider: {
        generateTags: () => ["unused"]
      },
      renderTags: false
    });

    plugin.install(createContext());

    await expect(plugin.tagImage("missing")).rejects.toThrow(
      'AiTagsPlugin image "missing" was not found.'
    );
  });

  it("enforces provider shape at compile time", () => {
    // @ts-expect-error Providers must implement generateTags.
    const invalidProvider: AiTagProvider = {};

    expect("generateTags" in invalidProvider).toBe(false);
  });
});
