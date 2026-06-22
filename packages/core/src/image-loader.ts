import type { GalleryImage } from "./config-manager";

export type ImageLoadStatus = "idle" | "loading" | "loaded" | "error";

export interface ImageLoadRequest {
  readonly id: string;
  readonly src: string;
  readonly alt?: string;
}

export interface ImageLoadState {
  readonly id: string;
  readonly src: string;
  readonly status: ImageLoadStatus;
  readonly attempts: number;
  readonly error?: unknown;
}

export interface ImageLoadResult {
  readonly id: string;
  readonly src: string;
  readonly element: HTMLImageElement;
  readonly attempts: number;
}

export type ImageLoadStateHandler = (state: ImageLoadState) => void;

export interface ImageLoaderOptions {
  readonly maxConcurrent?: number;
  readonly retries?: number;
  readonly retryDelay?: number;
  readonly decode?: boolean;
  readonly createImage?: () => HTMLImageElement;
  readonly onStateChange?: ImageLoadStateHandler;
}

interface QueueTask {
  readonly request: ImageLoadRequest;
  readonly resolve: (result: ImageLoadResult) => void;
  readonly reject: (error: unknown) => void;
}

const DEFAULT_MAX_CONCURRENT = 4;
const DEFAULT_RETRIES = 0;
const DEFAULT_RETRY_DELAY = 0;

/**
 * Loads images with concurrency control, retry handling, decode support, and state snapshots.
 */
export class ImageLoader {
  private readonly maxConcurrent: number;
  private readonly retries: number;
  private readonly retryDelay: number;
  private readonly decode: boolean;
  private readonly createImage: () => HTMLImageElement;
  private readonly onStateChange: ImageLoadStateHandler | undefined;
  private readonly states = new Map<string, ImageLoadState>();
  private readonly queue: QueueTask[] = [];
  private activeCount = 0;

  public constructor(options: ImageLoaderOptions = {}) {
    this.maxConcurrent = normalizePositiveInteger(options.maxConcurrent ?? DEFAULT_MAX_CONCURRENT);
    this.retries = normalizeNonNegativeInteger(options.retries ?? DEFAULT_RETRIES);
    this.retryDelay = Math.max(0, options.retryDelay ?? DEFAULT_RETRY_DELAY);
    this.decode = options.decode ?? true;
    this.createImage = options.createImage ?? createBrowserImage;
    this.onStateChange = options.onStateChange;
  }

  /**
   * Load one image request.
   */
  public load(image: GalleryImage | ImageLoadRequest): Promise<ImageLoadResult> {
    const request = normalizeRequest(image);
    this.setState({
      id: request.id,
      src: request.src,
      status: "idle",
      attempts: 0
    });

    return new Promise<ImageLoadResult>((resolve, reject) => {
      this.queue.push({
        request,
        resolve,
        reject
      });
      this.flushQueue();
    });
  }

  /**
   * Load a list of image requests while preserving input order in the result list.
   */
  public loadMany(
    images: readonly (GalleryImage | ImageLoadRequest)[]
  ): Promise<readonly ImageLoadResult[]> {
    return Promise.all(images.map((image) => this.load(image)));
  }

  /**
   * Return a state snapshot by image id.
   */
  public getState(id: string): ImageLoadState | undefined {
    return this.states.get(id);
  }

  /**
   * Return all known state snapshots.
   */
  public getStates(): readonly ImageLoadState[] {
    return [...this.states.values()];
  }

  /**
   * Return the number of queued requests waiting for concurrency slots.
   */
  public getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Return the number of currently active requests.
   */
  public getActiveCount(): number {
    return this.activeCount;
  }

  /**
   * Clear queued work and known states. Active requests are allowed to settle.
   */
  public clear(): void {
    this.queue.length = 0;
    this.states.clear();
  }

  private flushQueue(): void {
    while (this.activeCount < this.maxConcurrent) {
      const task = this.queue.shift();

      if (!task) {
        return;
      }

      this.activeCount += 1;
      void this.runTask(task).finally(() => {
        this.activeCount -= 1;
        this.flushQueue();
      });
    }
  }

  private async runTask(task: QueueTask): Promise<void> {
    try {
      const result = await this.loadWithRetry(task.request);
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    }
  }

  private async loadWithRetry(request: ImageLoadRequest): Promise<ImageLoadResult> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.retries + 1; attempt += 1) {
      this.setState({
        id: request.id,
        src: request.src,
        status: "loading",
        attempts: attempt
      });

      try {
        const element = await this.requestImage(request);
        this.setState({
          id: request.id,
          src: request.src,
          status: "loaded",
          attempts: attempt
        });

        return {
          id: request.id,
          src: request.src,
          element,
          attempts: attempt
        };
      } catch (error) {
        lastError = error;

        if (attempt > this.retries) {
          this.setState({
            id: request.id,
            src: request.src,
            status: "error",
            attempts: attempt,
            error
          });
          throw error;
        }

        await delay(this.retryDelay);
      }
    }

    throw lastError;
  }

  private async requestImage(request: ImageLoadRequest): Promise<HTMLImageElement> {
    const image = this.createImage();

    if (request.alt !== undefined) {
      image.alt = request.alt;
    }

    await new Promise<void>((resolve, reject) => {
      image.onload = (): void => {
        resolve();
      };
      image.onerror = (): void => {
        reject(new Error(`Failed to load image: ${request.src}`));
      };
      image.src = request.src;
    });

    if (this.decode && typeof image.decode === "function") {
      await image.decode();
    }

    return image;
  }

  private setState(state: ImageLoadState): void {
    this.states.set(state.id, state);
    this.onStateChange?.(state);
  }
}

const normalizeRequest = (image: GalleryImage | ImageLoadRequest): ImageLoadRequest => {
  const request: ImageLoadRequest = {
    id: image.id,
    src: image.src
  };

  return image.alt === undefined
    ? request
    : {
        ...request,
        alt: image.alt
      };
};

const normalizePositiveInteger = (value: number): number => Math.max(1, Math.floor(value));

const normalizeNonNegativeInteger = (value: number): number => Math.max(0, Math.floor(value));

const createBrowserImage = (): HTMLImageElement => {
  if (typeof Image !== "undefined") {
    return new Image();
  }

  if (typeof document !== "undefined") {
    return document.createElement("img");
  }

  throw new Error("Image loading is not available in this environment.");
};

const delay = (duration: number): Promise<void> =>
  new Promise((resolve) => {
    globalThis.setTimeout(resolve, duration);
  });
