import { AiSearchPlugin, calculateSimilarity } from "@gallery-engine/plugins";
import type {
  AiFeatureProvider,
  AiSearchGalleryContext,
  AiSearchableImage
} from "@gallery-engine/plugins";
import { afterEach, describe, expect, it, vi } from "vitest";

const createImages = (): readonly AiSearchableImage[] => [
  {
    id: "query",
    src: "/images/query.jpg",
    title: "Query"
  },
  {
    id: "near",
    src: "/images/near.jpg",
    title: "Near"
  },
  {
    id: "far",
    src: "/images/far.jpg",
    title: "Far"
  }
];

const featureMap: ReadonlyMap<string, readonly number[]> = new Map([
  ["query", [1, 0]],
  ["near", [0.9, 0.1]],
  ["far", [0, 1]]
]);

const createContext = (images = createImages()): AiSearchGalleryContext => ({
  getConfig: () => ({
    images
  })
});

const getFirstImage = (): AiSearchableImage => {
  const image = createImages()[0];

  if (!image) {
    throw new Error("Expected a fixture image.");
  }

  return image;
};

const createProvider = (): AiFeatureProvider => ({
  extractFeatures: ({ image }) => {
    const features = featureMap.get(image.id);

    if (!features) {
      throw new Error(`Missing features for ${image.id}`);
    }

    return features;
  }
});

describe("AiSearchPlugin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts and caches features for a single image", async () => {
    const extractFeatures = vi.fn<AiFeatureProvider["extractFeatures"]>(({ image }) => {
      const features = featureMap.get(image.id);

      if (!features) {
        throw new Error("Missing features.");
      }

      return features;
    });
    const plugin = new AiSearchPlugin({
      provider: {
        extractFeatures
      }
    });
    const image = getFirstImage();

    const firstResult = await plugin.extractFeatures(image);
    const cachedResult = await plugin.extractFeatures(image);

    expect(firstResult).toEqual({
      image,
      features: [1, 0],
      cached: false,
      index: 0
    });
    expect(cachedResult.cached).toBe(true);
    expect(plugin.getCachedFeatures(image)).toEqual([1, 0]);
    expect(extractFeatures).toHaveBeenCalledTimes(1);
  });

  it("forces feature extraction when requested", async () => {
    const extractFeatures = vi
      .fn<AiFeatureProvider["extractFeatures"]>()
      .mockReturnValueOnce([1, 0])
      .mockReturnValueOnce([0.5, 0.5]);
    const plugin = new AiSearchPlugin({
      provider: {
        extractFeatures
      }
    });
    const image = getFirstImage();

    await plugin.extractFeatures(image);
    const forcedResult = await plugin.extractFeatures(image, {
      force: true
    });

    expect(forcedResult.features).toEqual([0.5, 0.5]);
    expect(extractFeatures).toHaveBeenCalledTimes(2);
  });

  it("searches similar images by gallery image id", async () => {
    const plugin = new AiSearchPlugin({
      provider: createProvider()
    });

    plugin.install(createContext());

    const results = await plugin.searchByImage("query");

    expect(results.map((result) => result.image.id)).toEqual(["near", "far"]);
    expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0);
  });

  it("supports vector search with limit and minScore", async () => {
    const plugin = new AiSearchPlugin({
      provider: createProvider()
    });

    plugin.install(createContext());

    const results = await plugin.searchByVector([1, 0], {
      includeQuery: true,
      limit: 2,
      minScore: 0.5
    });

    expect(results.map((result) => result.image.id)).toEqual(["query", "near"]);
  });

  it("supports custom cache keys and cache clearing", async () => {
    const plugin = new AiSearchPlugin({
      provider: createProvider(),
      cacheKey: (image) => image.src
    });
    const image = getFirstImage();

    await plugin.extractFeatures(image);

    expect(plugin.getCachedResults()).toHaveLength(1);

    plugin.clearCache(image);

    expect(plugin.getCachedFeatures(image)).toBeUndefined();

    await plugin.extractFeatures(image);
    plugin.clearCache();

    expect(plugin.getCachedResults()).toEqual([]);
  });

  it("calculates supported similarity metrics", () => {
    expect(calculateSimilarity([1, 0], [1, 0])).toBe(1);
    expect(calculateSimilarity([1, 2], [3, 4], "dot")).toBe(11);
    expect(calculateSimilarity([1, 0], [1, 0], "euclidean")).toBe(1);
  });

  it("rejects invalid feature vectors", async () => {
    const plugin = new AiSearchPlugin({
      provider: {
        extractFeatures: () => []
      }
    });

    await expect(plugin.extractFeatures(getFirstImage())).rejects.toThrow(
      "AiSearchPlugin features must not be empty."
    );
    expect(() => calculateSimilarity([1, 2], [1])).toThrow(
      "AiSearchPlugin feature vectors must have the same length."
    );
  });

  it("throws when an image id is missing", async () => {
    const plugin = new AiSearchPlugin({
      provider: createProvider()
    });

    plugin.install(createContext());

    await expect(plugin.searchByImage("missing")).rejects.toThrow(
      'AiSearchPlugin image "missing" was not found.'
    );
  });

  it("enforces provider shape at compile time", () => {
    // @ts-expect-error Providers must implement extractFeatures.
    const invalidProvider: AiFeatureProvider = {};

    expect("extractFeatures" in invalidProvider).toBe(false);
  });
});
