export interface AiTaggableImage {
  readonly id: string;
  readonly src: string;
  readonly alt?: string;
  readonly title?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

export interface AiTagRequest {
  readonly image: AiTaggableImage;
  readonly index: number;
}

export interface AiTagResult {
  readonly image: AiTaggableImage;
  readonly tags: readonly string[];
  readonly cached: boolean;
  readonly index: number;
}

export interface AiTagProvider {
  generateTags(request: AiTagRequest): Promise<readonly string[]> | readonly string[];
}

export type AiTagCacheKeyResolver = (image: AiTaggableImage) => string;

export interface AiTagsPluginOptions {
  readonly provider: AiTagProvider;
  readonly cacheKey?: AiTagCacheKeyResolver;
  readonly renderTags?: boolean;
  readonly container?: string | HTMLElement;
  readonly className?: string;
  readonly document?: Document;
}

export interface AiTagsRequestOptions {
  readonly force?: boolean;
  readonly render?: boolean;
}

export interface AiTagsGalleryConfig {
  readonly images?: readonly AiTaggableImage[];
  readonly container?: string | HTMLElement;
}

export interface AiTagsGalleryContext {
  getConfig?(): AiTagsGalleryConfig;
}
interface AiTagsRuntimeOptions {
  readonly renderTags: boolean | undefined;
  readonly container: string | HTMLElement | undefined;
  readonly className: string | undefined;
  readonly document: Document | undefined;
}
/**
 * Provider-driven auto-tagging plugin with in-memory tag cache and optional DOM rendering.
 */
export class AiTagsPlugin {
  public readonly name = "ai-tags";

  private readonly provider: AiTagProvider;
  private readonly cacheKey: AiTagCacheKeyResolver;
  private readonly cache = new Map<string, AiTagResult>();
  private readonly options: AiTagsRuntimeOptions;
  private context: AiTagsGalleryContext | undefined;
  private rootElement: HTMLElement | undefined;

  public constructor(options: AiTagsPluginOptions) {
    this.provider = options.provider;
    this.cacheKey = options.cacheKey ?? defaultCacheKey;
    this.options = {
      renderTags: options.renderTags,
      container: options.container,
      className: options.className,
      document: options.document
    };
  }

  /**
   * Store gallery context so image ids can resolve against gallery config.
   */
  public install(context: AiTagsGalleryContext = {}): void {
    this.context = context;
  }

  /**
   * Remove rendered UI and release gallery context.
   */
  public destroy(): void {
    this.rootElement?.remove();
    this.rootElement = undefined;
    this.context = undefined;
  }

  /**
   * Handle plugin-manager destroy lifecycle dispatches.
   */
  public onDestroy(): void {
    this.destroy();
  }

  /**
   * Generate tags for one image or return a cached result.
   */
  public async tagImage(
    imageOrId: AiTaggableImage | string,
    options: AiTagsRequestOptions = {}
  ): Promise<AiTagResult> {
    const image = this.resolveImage(imageOrId);
    const index = this.resolveImageIndex(image);
    const result = await this.tagResolvedImage(image, index, options);

    if (this.shouldRender(options)) {
      this.renderResults([result]);
    }

    return result;
  }

  /**
   * Generate tags for provided images or all gallery images.
   */
  public async tagMany(
    imagesOrIds?: readonly (AiTaggableImage | string)[],
    options: AiTagsRequestOptions = {}
  ): Promise<readonly AiTagResult[]> {
    const images = imagesOrIds
      ? imagesOrIds.map((imageOrId) => this.resolveImage(imageOrId))
      : this.getGalleryImages();
    const results = await Promise.all(
      images.map((image, index) => this.tagResolvedImage(image, index, options))
    );

    if (this.shouldRender(options)) {
      this.renderResults(results);
    }

    return results;
  }

  /**
   * Return cached tags for an image when available.
   */
  public getCachedTags(imageOrId: AiTaggableImage | string): readonly string[] | undefined {
    const image = this.resolveImage(imageOrId);

    return this.cache.get(this.cacheKey(image))?.tags;
  }

  /**
   * Clear one cached result, or the entire tag cache.
   */
  public clearCache(imageOrId?: AiTaggableImage | string): void {
    if (!imageOrId) {
      this.cache.clear();
      return;
    }

    const image = this.resolveImage(imageOrId);
    this.cache.delete(this.cacheKey(image));
  }

  /**
   * Return cached results in insertion order.
   */
  public getCachedResults(): readonly AiTagResult[] {
    return [...this.cache.values()];
  }

  /**
   * Render cached tag results into the configured container.
   */
  public renderCachedTags(): HTMLElement | undefined {
    return this.renderResults(this.getCachedResults());
  }

  /**
   * Return the rendered tag root element.
   */
  public getElement(): HTMLElement | undefined {
    return this.rootElement;
  }

  private async tagResolvedImage(
    image: AiTaggableImage,
    index: number,
    options: AiTagsRequestOptions
  ): Promise<AiTagResult> {
    const key = this.cacheKey(image);
    const cachedResult = this.cache.get(key);

    if (cachedResult && !options.force) {
      return {
        ...cachedResult,
        cached: true,
        index
      };
    }

    const tags = normalizeTags(
      await this.provider.generateTags({
        image,
        index
      })
    );
    const result: AiTagResult = {
      image,
      tags,
      cached: false,
      index
    };

    this.cache.set(key, result);

    return result;
  }

  private shouldRender(options: AiTagsRequestOptions): boolean {
    return this.options.renderTags !== false && options.render !== false;
  }

  private resolveImage(imageOrId: AiTaggableImage | string): AiTaggableImage {
    if (typeof imageOrId !== "string") {
      return imageOrId;
    }

    const image = this.getGalleryImages().find((candidate) => candidate.id === imageOrId);

    if (!image) {
      throw new Error(`AiTagsPlugin image "${imageOrId}" was not found.`);
    }

    return image;
  }

  private resolveImageIndex(image: AiTaggableImage): number {
    const index = this.getGalleryImages().findIndex((candidate) => candidate.id === image.id);

    return index >= 0 ? index : 0;
  }

  private getGalleryImages(): readonly AiTaggableImage[] {
    return this.context?.getConfig?.().images ?? [];
  }

  private renderResults(results: readonly AiTagResult[]): HTMLElement | undefined {
    const container = this.resolveRenderContainer();

    if (!container) {
      return undefined;
    }

    const rootElement = this.getOrCreateRootElement(container);
    rootElement.replaceChildren(
      ...results.map((result) => createTagResultElement(container.ownerDocument, result))
    );

    return rootElement;
  }

  private getOrCreateRootElement(container: HTMLElement): HTMLElement {
    if (this.rootElement) {
      return this.rootElement;
    }

    const rootElement = container.ownerDocument.createElement("div");
    rootElement.classList.add("gallery-engine-ai-tags");
    addClassNames(rootElement, this.options.className);
    rootElement.dataset.galleryEnginePlugin = this.name;
    container.append(rootElement);
    this.rootElement = rootElement;

    return rootElement;
  }

  private resolveRenderContainer(): HTMLElement | undefined {
    const container = this.options.container ?? this.context?.getConfig?.().container;

    if (!container) {
      return undefined;
    }

    if (typeof container !== "string") {
      return container;
    }

    const ownerDocument = this.resolveDocument();
    const element = ownerDocument.querySelector<HTMLElement>(container);

    if (!element) {
      throw new Error(`AiTagsPlugin container "${container}" was not found.`);
    }

    return element;
  }

  private resolveDocument(): Document {
    if (this.options.document) {
      return this.options.document;
    }

    if (typeof document === "undefined") {
      throw new Error("AiTagsPlugin requires a DOM document to render tags.");
    }

    return document;
  }
}

const defaultCacheKey = (image: AiTaggableImage): string => image.id;

const normalizeTags = (tags: readonly string[]): readonly string[] => {
  const normalizedTags = new Set<string>();

  for (const tag of tags) {
    const normalizedTag = tag.trim();

    if (normalizedTag.length > 0) {
      normalizedTags.add(normalizedTag);
    }
  }

  return [...normalizedTags];
};

const createTagResultElement = (ownerDocument: Document, result: AiTagResult): HTMLElement => {
  const resultElement = ownerDocument.createElement("article");
  const titleElement = ownerDocument.createElement("span");
  const tagsElement = ownerDocument.createElement("div");

  resultElement.className = "gallery-engine-ai-tags__item";
  resultElement.dataset.imageId = result.image.id;
  titleElement.className = "gallery-engine-ai-tags__title";
  titleElement.textContent = result.image.title ?? result.image.alt ?? result.image.id;
  tagsElement.className = "gallery-engine-ai-tags__list";
  tagsElement.replaceChildren(...result.tags.map((tag) => createTagElement(ownerDocument, tag)));
  resultElement.replaceChildren(titleElement, tagsElement);

  return resultElement;
};

const createTagElement = (ownerDocument: Document, tag: string): HTMLElement => {
  const tagElement = ownerDocument.createElement("span");
  tagElement.className = "gallery-engine-ai-tags__tag";
  tagElement.textContent = tag;

  return tagElement;
};

const addClassNames = (element: HTMLElement, className: string | undefined): void => {
  const classNames = className?.split(/\s+/).filter((name) => name.length > 0) ?? [];

  element.classList.add(...classNames);
};
