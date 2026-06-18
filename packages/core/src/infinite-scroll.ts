export interface ScrollMetrics {
  readonly scrollTop: number;
  readonly clientHeight: number;
  readonly scrollHeight: number;
}

export interface InfiniteScrollOptions<TItem> {
  readonly items: readonly TItem[];
  readonly batchSize?: number;
  readonly threshold?: number;
  readonly initialCount?: number;
  readonly onLoadMore?: (state: InfiniteScrollState<TItem>) => void;
}

export interface InfiniteScrollState<TItem> {
  readonly items: readonly TItem[];
  readonly visibleItems: readonly TItem[];
  readonly loadedCount: number;
  readonly totalCount: number;
  readonly hasMore: boolean;
}

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_THRESHOLD = 200;

/**
 * Controls batch loading and bottom detection for infinite scroll workflows.
 */
export class InfiniteScroll<TItem> {
  private items: readonly TItem[];
  private readonly batchSize: number;
  private readonly threshold: number;
  private readonly onLoadMore: ((state: InfiniteScrollState<TItem>) => void) | undefined;
  private loadedCount: number;

  public constructor(options: InfiniteScrollOptions<TItem>) {
    this.items = options.items;
    this.batchSize = normalizePositiveInteger(options.batchSize ?? DEFAULT_BATCH_SIZE);
    this.threshold = Math.max(0, options.threshold ?? DEFAULT_THRESHOLD);
    this.onLoadMore = options.onLoadMore;
    this.loadedCount = normalizeLoadedCount(
      options.initialCount ?? this.batchSize,
      this.items.length
    );
  }

  /**
   * Return the current infinite scroll state snapshot.
   */
  public getState(): InfiniteScrollState<TItem> {
    return {
      items: this.items,
      visibleItems: this.items.slice(0, this.loadedCount),
      loadedCount: this.loadedCount,
      totalCount: this.items.length,
      hasMore: this.hasMore()
    };
  }

  /**
   * Load the next batch and notify listeners when new items become visible.
   */
  public loadMore(): InfiniteScrollState<TItem> {
    const previousLoadedCount = this.loadedCount;
    this.loadedCount = normalizeLoadedCount(this.loadedCount + this.batchSize, this.items.length);
    const state = this.getState();

    if (this.loadedCount > previousLoadedCount) {
      this.onLoadMore?.(state);
    }

    return state;
  }

  /**
   * Load more items when the current scroll metrics are near the bottom.
   */
  public handleScroll(metrics: ScrollMetrics): InfiniteScrollState<TItem> {
    if (this.shouldLoadMore(metrics)) {
      return this.loadMore();
    }

    return this.getState();
  }

  /**
   * Replace the full item list and clamp the loaded range.
   */
  public updateItems(items: readonly TItem[]): InfiniteScrollState<TItem> {
    const previousTotalCount = this.items.length;
    this.items = items;

    if (previousTotalCount === 0 && this.items.length > 0) {
      this.loadedCount = normalizeLoadedCount(this.batchSize, this.items.length);
    } else {
      this.loadedCount = normalizeLoadedCount(this.loadedCount, this.items.length);
    }

    return this.getState();
  }

  /**
   * Reset the loaded range to the initial batch.
   */
  public reset(initialCount = this.batchSize): InfiniteScrollState<TItem> {
    this.loadedCount = normalizeLoadedCount(initialCount, this.items.length);
    return this.getState();
  }

  /**
   * Return whether more items can be loaded.
   */
  public hasMore(): boolean {
    return this.loadedCount < this.items.length;
  }

  private shouldLoadMore(metrics: ScrollMetrics): boolean {
    if (!this.hasMore()) {
      return false;
    }

    const distanceToBottom = metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight;
    return distanceToBottom <= this.threshold;
  }
}

const normalizePositiveInteger = (value: number): number => Math.max(1, Math.floor(value));

const normalizeLoadedCount = (value: number, totalCount: number): number =>
  Math.min(Math.max(0, normalizePositiveInteger(value)), totalCount);
