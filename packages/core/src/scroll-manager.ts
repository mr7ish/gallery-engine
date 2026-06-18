export interface ScrollPosition {
  readonly scrollTop: number;
  readonly scrollLeft: number;
}

export interface ScrollState extends ScrollPosition {
  readonly clientWidth: number;
  readonly clientHeight: number;
  readonly scrollWidth: number;
  readonly scrollHeight: number;
  readonly isScrolling: boolean;
}

export type ScrollTarget = HTMLElement | Document | Window;

export type ScrollStateHandler = (state: ScrollState) => void;

export interface ScrollManagerOptions {
  readonly target?: ScrollTarget;
  readonly endDelay?: number;
  readonly onScroll?: ScrollStateHandler;
  readonly onScrollStart?: ScrollStateHandler;
  readonly onScrollEnd?: ScrollStateHandler;
}

const DEFAULT_SCROLL_END_DELAY = 120;
const DEFAULT_POSITION_KEY = "default";

/**
 * Manages scroll listening, frame throttling, end detection, and position cache.
 */
export class ScrollManager {
  private target: ScrollTarget | undefined;
  private readonly endDelay: number;
  private readonly onScroll: ScrollStateHandler | undefined;
  private readonly onScrollStart: ScrollStateHandler | undefined;
  private readonly onScrollEnd: ScrollStateHandler | undefined;
  private readonly positionCache = new Map<string, ScrollPosition>();
  private frameId: number | undefined;
  private endTimerId: ReturnType<typeof setTimeout> | undefined;
  private listening = false;
  private scrolling = false;

  public constructor(options: ScrollManagerOptions = {}) {
    this.target = options.target;
    this.endDelay = Math.max(0, options.endDelay ?? DEFAULT_SCROLL_END_DELAY);
    this.onScroll = options.onScroll;
    this.onScrollStart = options.onScrollStart;
    this.onScrollEnd = options.onScrollEnd;
  }

  /**
   * Start listening to scroll events on the configured or provided target.
   */
  public start(target = this.target): void {
    if (this.listening) {
      return;
    }

    this.target = target ?? resolveDefaultTarget();
    this.target.addEventListener("scroll", this.handleNativeScroll, {
      passive: true
    });
    this.listening = true;
  }

  /**
   * Stop listening and cancel pending scroll callbacks.
   */
  public stop(): void {
    if (!this.listening || !this.target) {
      return;
    }

    this.target.removeEventListener("scroll", this.handleNativeScroll);
    this.cancelFrame();
    this.cancelEndTimer();
    this.scrolling = false;
    this.listening = false;
  }

  /**
   * Return whether scroll events are currently being observed.
   */
  public isListening(): boolean {
    return this.listening;
  }

  /**
   * Return whether a scroll sequence is currently active.
   */
  public isScrolling(): boolean {
    return this.scrolling;
  }

  /**
   * Return the current scroll state snapshot.
   */
  public getState(): ScrollState {
    const target = this.requireTarget();
    const metrics = readTargetMetrics(target);

    return {
      ...metrics,
      isScrolling: this.scrolling
    };
  }

  /**
   * Save the current scroll position under a cache key.
   */
  public savePosition(key = DEFAULT_POSITION_KEY): ScrollPosition {
    const state = this.getState();
    const position: ScrollPosition = {
      scrollTop: state.scrollTop,
      scrollLeft: state.scrollLeft
    };

    this.positionCache.set(key, position);

    return position;
  }

  /**
   * Restore a cached position and return it when found.
   */
  public restorePosition(key = DEFAULT_POSITION_KEY): ScrollPosition | undefined {
    const position = this.positionCache.get(key);

    if (!position) {
      return undefined;
    }

    writeTargetPosition(this.requireTarget(), position);

    return position;
  }

  /**
   * Return a cached position without mutating the target.
   */
  public getCachedPosition(key = DEFAULT_POSITION_KEY): ScrollPosition | undefined {
    return this.positionCache.get(key);
  }

  /**
   * Clear one cached position or all cached positions.
   */
  public clearPosition(key?: string): void {
    if (key === undefined) {
      this.positionCache.clear();
      return;
    }

    this.positionCache.delete(key);
  }

  /**
   * Stop listening and clear cached positions.
   */
  public destroy(): void {
    this.stop();
    this.positionCache.clear();
    this.target = undefined;
  }

  private readonly handleNativeScroll = (): void => {
    if (!this.scrolling) {
      this.scrolling = true;
      this.onScrollStart?.(this.getState());
    }

    this.scheduleScrollFrame();
    this.scheduleScrollEnd();
  };

  private scheduleScrollFrame(): void {
    if (this.frameId !== undefined) {
      return;
    }

    this.frameId = requestFrame(() => {
      this.frameId = undefined;
      this.onScroll?.(this.getState());
    });
  }

  private scheduleScrollEnd(): void {
    this.cancelEndTimer();
    this.endTimerId = setTimeout(() => {
      this.endTimerId = undefined;
      this.scrolling = false;
      this.onScrollEnd?.(this.getState());
    }, this.endDelay);
  }

  private cancelFrame(): void {
    if (this.frameId === undefined) {
      return;
    }

    cancelFrame(this.frameId);
    this.frameId = undefined;
  }

  private cancelEndTimer(): void {
    if (this.endTimerId === undefined) {
      return;
    }

    clearTimeout(this.endTimerId);
    this.endTimerId = undefined;
  }

  private requireTarget(): ScrollTarget {
    const target = this.target ?? resolveDefaultTarget();
    this.target = target;

    return target;
  }
}

interface TargetMetrics extends ScrollPosition {
  readonly clientWidth: number;
  readonly clientHeight: number;
  readonly scrollWidth: number;
  readonly scrollHeight: number;
}

const resolveDefaultTarget = (): ScrollTarget => {
  if (typeof window === "undefined") {
    throw new Error("Scroll target is not available in this environment.");
  }

  return window;
};

const requestFrame = (callback: FrameRequestCallback): number => {
  if (typeof requestAnimationFrame !== "undefined") {
    return requestAnimationFrame(callback);
  }

  return Number(
    setTimeout(() => {
      callback(0);
    }, 0)
  );
};

const cancelFrame = (frameId: number): void => {
  if (typeof cancelAnimationFrame !== "undefined") {
    cancelAnimationFrame(frameId);
    return;
  }

  clearTimeout(frameId);
};

const readTargetMetrics = (target: ScrollTarget): TargetMetrics => {
  if (isWindow(target)) {
    const element = target.document.documentElement;
    const body = target.document.body;

    return {
      scrollTop: target.scrollY,
      scrollLeft: target.scrollX,
      clientWidth: target.innerWidth,
      clientHeight: target.innerHeight,
      scrollWidth: Math.max(element.scrollWidth, body.scrollWidth),
      scrollHeight: Math.max(element.scrollHeight, body.scrollHeight)
    };
  }

  const element = resolveScrollElement(target);

  return {
    scrollTop: element.scrollTop,
    scrollLeft: element.scrollLeft,
    clientWidth: element.clientWidth,
    clientHeight: element.clientHeight,
    scrollWidth: element.scrollWidth,
    scrollHeight: element.scrollHeight
  };
};

const writeTargetPosition = (target: ScrollTarget, position: ScrollPosition): void => {
  if (isWindow(target)) {
    target.scrollTo({
      top: position.scrollTop,
      left: position.scrollLeft
    });
    return;
  }

  const element = resolveScrollElement(target);
  element.scrollTop = position.scrollTop;
  element.scrollLeft = position.scrollLeft;
};

const resolveScrollElement = (target: HTMLElement | Document): HTMLElement => {
  if (target instanceof HTMLElement) {
    return target;
  }

  const element = target.scrollingElement ?? target.documentElement;

  if (!(element instanceof HTMLElement)) {
    throw new Error("Document scroll element is not available.");
  }

  return element;
};

const isWindow = (target: ScrollTarget): target is Window =>
  typeof window !== "undefined" && target === window;
