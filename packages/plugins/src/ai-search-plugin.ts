export interface AiSearchableImage {
  readonly id: string;
  readonly src: string;
  readonly alt?: string;
  readonly title?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

export interface AiFeatureRequest {
  readonly image: AiSearchableImage;
  readonly index: number;
}

export interface AiFeatureProvider {
  extractFeatures(request: AiFeatureRequest): Promise<readonly number[]> | readonly number[];
}

export type AiSearchCacheKeyResolver = (image: AiSearchableImage) => string;

export type AiSearchSimilarityMetric = "cosine" | "dot" | "euclidean";

export interface AiSearchPluginOptions {
  readonly provider: AiFeatureProvider;
  readonly cacheKey?: AiSearchCacheKeyResolver;
  readonly metric?: AiSearchSimilarityMetric;
}

export interface AiSearchRequestOptions {
  readonly force?: boolean;
  readonly includeQuery?: boolean;
  readonly limit?: number;
  readonly minScore?: number;
}

export interface AiFeatureResult {
  readonly image: AiSearchableImage;
  readonly features: readonly number[];
  readonly cached: boolean;
  readonly index: number;
}

export interface AiSearchResult {
  readonly image: AiSearchableImage;
  readonly score: number;
  readonly index: number;
  readonly features: readonly number[];
}

export interface AiSearchVectorQuery {
  readonly vector: readonly number[];
}

export type AiSearchQuery = AiSearchableImage | string | AiSearchVectorQuery;

export interface AiSearchGalleryConfig {
  readonly images?: readonly AiSearchableImage[];
}

export interface AiSearchGalleryContext {
  getConfig?(): AiSearchGalleryConfig;
}

/**
 * Provider-driven visual similarity search plugin with feature caching.
 */
export class AiSearchPlugin {
  public readonly name = "ai-search";

  private readonly provider: AiFeatureProvider;
  private readonly cacheKey: AiSearchCacheKeyResolver;
  private readonly metric: AiSearchSimilarityMetric;
  private readonly cache = new Map<string, AiFeatureResult>();
  private context: AiSearchGalleryContext | undefined;

  public constructor(options: AiSearchPluginOptions) {
    this.provider = options.provider;
    this.cacheKey = options.cacheKey ?? defaultCacheKey;
    this.metric = options.metric ?? "cosine";
  }

  /**
   * Store gallery context so image ids can resolve against gallery config.
   */
  public install(context: AiSearchGalleryContext = {}): void {
    this.context = context;
  }

  /**
   * Release gallery context.
   */
  public destroy(): void {
    this.context = undefined;
  }

  /**
   * Handle plugin-manager destroy lifecycle dispatches.
   */
  public onDestroy(): void {
    this.destroy();
  }

  /**
   * Extract and cache features for one image.
   */
  public async extractFeatures(
    imageOrId: AiSearchableImage | string,
    options: Pick<AiSearchRequestOptions, "force"> = {}
  ): Promise<AiFeatureResult> {
    const image = this.resolveImage(imageOrId);
    const index = this.resolveImageIndex(image);

    return this.extractResolvedFeatures(image, index, options.force ?? false);
  }

  /**
   * Extract and cache features for provided images or all gallery images.
   */
  public async extractMany(
    imagesOrIds?: readonly (AiSearchableImage | string)[],
    options: Pick<AiSearchRequestOptions, "force"> = {}
  ): Promise<readonly AiFeatureResult[]> {
    const images = imagesOrIds
      ? imagesOrIds.map((imageOrId) => this.resolveImage(imageOrId))
      : this.getGalleryImages();

    return Promise.all(
      images.map((image, index) =>
        this.extractResolvedFeatures(image, index, options.force ?? false)
      )
    );
  }

  /**
   * Search gallery images with an image id, image object, or feature vector query.
   */
  public async search(
    query: AiSearchQuery,
    options: AiSearchRequestOptions = {}
  ): Promise<readonly AiSearchResult[]> {
    const queryFeatures = await this.resolveQueryFeatures(query, options.force ?? false);
    const candidates = await this.extractMany(undefined, {
      force: options.force ?? false
    });
    const queryId = typeof query === "string" ? query : "id" in query ? query.id : undefined;
    const includeQuery = options.includeQuery ?? false;
    const minScore = options.minScore ?? Number.NEGATIVE_INFINITY;
    const results = candidates
      .filter((candidate) => includeQuery || candidate.image.id !== queryId)
      .map((candidate) => ({
        image: candidate.image,
        score: calculateSimilarity(queryFeatures, candidate.features, this.metric),
        index: candidate.index,
        features: candidate.features
      }))
      .filter((result) => result.score >= minScore)
      .sort((left, right) => right.score - left.score);

    return applyLimit(results, options.limit);
  }

  /**
   * Alias for image-based similarity search.
   */
  public searchByImage(
    imageOrId: AiSearchableImage | string,
    options: AiSearchRequestOptions = {}
  ): Promise<readonly AiSearchResult[]> {
    return this.search(imageOrId, options);
  }

  /**
   * Search gallery images directly with a precomputed vector.
   */
  public searchByVector(
    vector: readonly number[],
    options: AiSearchRequestOptions = {}
  ): Promise<readonly AiSearchResult[]> {
    return this.search(
      {
        vector
      },
      options
    );
  }

  /**
   * Calculate similarity with the plugin metric.
   */
  public calculateSimilarity(
    leftFeatures: readonly number[],
    rightFeatures: readonly number[]
  ): number {
    return calculateSimilarity(leftFeatures, rightFeatures, this.metric);
  }

  /**
   * Return cached features for an image when available.
   */
  public getCachedFeatures(imageOrId: AiSearchableImage | string): readonly number[] | undefined {
    const image = this.resolveImage(imageOrId);

    return this.cache.get(this.cacheKey(image))?.features;
  }

  /**
   * Return cached feature results in insertion order.
   */
  public getCachedResults(): readonly AiFeatureResult[] {
    return [...this.cache.values()];
  }

  /**
   * Clear one cached feature result, or the entire feature cache.
   */
  public clearCache(imageOrId?: AiSearchableImage | string): void {
    if (!imageOrId) {
      this.cache.clear();
      return;
    }

    const image = this.resolveImage(imageOrId);
    this.cache.delete(this.cacheKey(image));
  }

  private async resolveQueryFeatures(
    query: AiSearchQuery,
    force: boolean
  ): Promise<readonly number[]> {
    if (isVectorQuery(query)) {
      return normalizeFeatures(query.vector);
    }

    return (await this.extractFeatures(query, { force })).features;
  }

  private async extractResolvedFeatures(
    image: AiSearchableImage,
    index: number,
    force: boolean
  ): Promise<AiFeatureResult> {
    const key = this.cacheKey(image);
    const cachedResult = this.cache.get(key);

    if (cachedResult && !force) {
      return {
        ...cachedResult,
        cached: true,
        index
      };
    }

    const features = normalizeFeatures(
      await this.provider.extractFeatures({
        image,
        index
      })
    );
    const result: AiFeatureResult = {
      image,
      features,
      cached: false,
      index
    };

    this.cache.set(key, result);

    return result;
  }

  private resolveImage(imageOrId: AiSearchableImage | string): AiSearchableImage {
    if (typeof imageOrId !== "string") {
      return imageOrId;
    }

    const image = this.getGalleryImages().find((candidate) => candidate.id === imageOrId);

    if (!image) {
      throw new Error(`AiSearchPlugin image "${imageOrId}" was not found.`);
    }

    return image;
  }

  private resolveImageIndex(image: AiSearchableImage): number {
    const index = this.getGalleryImages().findIndex((candidate) => candidate.id === image.id);

    return index >= 0 ? index : 0;
  }

  private getGalleryImages(): readonly AiSearchableImage[] {
    return this.context?.getConfig?.().images ?? [];
  }
}

export const calculateSimilarity = (
  leftFeatures: readonly number[],
  rightFeatures: readonly number[],
  metric: AiSearchSimilarityMetric = "cosine"
): number => {
  assertCompatibleFeatures(leftFeatures, rightFeatures);

  if (metric === "dot") {
    return dotProduct(leftFeatures, rightFeatures);
  }

  if (metric === "euclidean") {
    return 1 / (1 + euclideanDistance(leftFeatures, rightFeatures));
  }

  return cosineSimilarity(leftFeatures, rightFeatures);
};

const defaultCacheKey = (image: AiSearchableImage): string => image.id;

const isVectorQuery = (query: AiSearchQuery): query is AiSearchVectorQuery =>
  typeof query === "object" && "vector" in query;

const normalizeFeatures = (features: readonly number[]): readonly number[] => {
  if (features.length === 0) {
    throw new Error("AiSearchPlugin features must not be empty.");
  }

  return features.map((feature) => {
    if (!Number.isFinite(feature)) {
      throw new Error("AiSearchPlugin features must contain only finite numbers.");
    }

    return feature;
  });
};

const assertCompatibleFeatures = (
  leftFeatures: readonly number[],
  rightFeatures: readonly number[]
): void => {
  if (leftFeatures.length === 0 || rightFeatures.length === 0) {
    throw new Error("AiSearchPlugin features must not be empty.");
  }

  if (leftFeatures.length !== rightFeatures.length) {
    throw new Error("AiSearchPlugin feature vectors must have the same length.");
  }
};

const dotProduct = (leftFeatures: readonly number[], rightFeatures: readonly number[]): number =>
  leftFeatures.reduce(
    (sum, feature, index) => sum + feature * getFeatureAt(rightFeatures, index),
    0
  );

const cosineSimilarity = (
  leftFeatures: readonly number[],
  rightFeatures: readonly number[]
): number => {
  const leftMagnitude = Math.sqrt(dotProduct(leftFeatures, leftFeatures));
  const rightMagnitude = Math.sqrt(dotProduct(rightFeatures, rightFeatures));

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dotProduct(leftFeatures, rightFeatures) / (leftMagnitude * rightMagnitude);
};

const euclideanDistance = (
  leftFeatures: readonly number[],
  rightFeatures: readonly number[]
): number =>
  Math.sqrt(
    leftFeatures.reduce((sum, feature, index) => {
      const difference = feature - getFeatureAt(rightFeatures, index);

      return sum + difference * difference;
    }, 0)
  );

const getFeatureAt = (features: readonly number[], index: number): number => {
  const feature = features[index];

  if (feature === undefined) {
    throw new Error("AiSearchPlugin feature vectors must have the same length.");
  }

  return feature;
};

const applyLimit = (
  results: readonly AiSearchResult[],
  limit: number | undefined
): readonly AiSearchResult[] => {
  if (limit === undefined) {
    return results;
  }

  return results.slice(0, Math.max(0, limit));
};
