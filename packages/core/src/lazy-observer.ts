export interface LazyObserverEntry<TData = unknown> {
  readonly element: Element;
  readonly entry: IntersectionObserverEntry;
  readonly data: TData;
}

export type LazyObserverHandler<TData = unknown> = (entry: LazyObserverEntry<TData>) => void;

export interface LazyObserverOptions<TData = unknown> {
  readonly root?: Element | Document | null;
  readonly rootMargin?: string;
  readonly threshold?: number | readonly number[];
  readonly once?: boolean;
  readonly onLoad: LazyObserverHandler<TData>;
}

const DEFAULT_ROOT_MARGIN = "200px";
const DEFAULT_THRESHOLD = 0;

/**
 * Wraps IntersectionObserver for Gallery lazy loading workflows.
 */
export class LazyObserver<TData = unknown> {
  private readonly observer: IntersectionObserver;
  private readonly observedData = new Map<Element, TData>();
  private readonly once: boolean;
  private readonly onLoad: LazyObserverHandler<TData>;

  public constructor(options: LazyObserverOptions<TData>) {
    if (typeof IntersectionObserver === "undefined") {
      throw new Error("IntersectionObserver is not available in this environment.");
    }

    this.once = options.once ?? true;
    this.onLoad = options.onLoad;
    this.observer = new IntersectionObserver((entries) => {
      this.handleEntries(entries);
    }, createObserverInit(options));
  }

  /**
   * Observe an element and associate optional data with it.
   */
  public observe(element: Element, data: TData): void {
    this.observedData.set(element, data);
    this.observer.observe(element);
  }

  /**
   * Stop observing an element.
   */
  public unobserve(element: Element): void {
    this.observedData.delete(element);
    this.observer.unobserve(element);
  }

  /**
   * Disconnect the observer and clear all tracked elements.
   */
  public disconnect(): void {
    this.observedData.clear();
    this.observer.disconnect();
  }

  /**
   * Return whether the element is currently tracked.
   */
  public isObserved(element: Element): boolean {
    return this.observedData.has(element);
  }

  /**
   * Return the number of currently tracked elements.
   */
  public getObservedCount(): number {
    return this.observedData.size;
  }

  private handleEntries(entries: readonly IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      if (!isVisibleEntry(entry)) {
        continue;
      }

      const data = this.observedData.get(entry.target);

      if (data === undefined && !this.observedData.has(entry.target)) {
        continue;
      }

      this.onLoad({
        element: entry.target,
        entry,
        data: data as TData
      });

      if (this.once) {
        this.unobserve(entry.target);
      }
    }
  }
}

const createObserverInit = <TData>(
  options: LazyObserverOptions<TData>
): IntersectionObserverInit => ({
  root: options.root ?? null,
  rootMargin: options.rootMargin ?? DEFAULT_ROOT_MARGIN,
  threshold: resolveThreshold(options.threshold)
});

const resolveThreshold = (threshold: number | readonly number[] | undefined): number | number[] => {
  if (threshold === undefined) {
    return DEFAULT_THRESHOLD;
  }

  if (typeof threshold === "number") {
    return threshold;
  }

  return [...threshold];
};

const isVisibleEntry = (entry: IntersectionObserverEntry): boolean =>
  entry.isIntersecting || entry.intersectionRatio > 0;
