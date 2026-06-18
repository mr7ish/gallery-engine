export interface PreviewItem {
  readonly id: string;
  readonly src: string;
  readonly alt?: string;
  readonly title?: string;
  readonly description?: string;
}

export interface PreviewState<TItem extends PreviewItem = PreviewItem> {
  readonly visible: boolean;
  readonly current: number;
  readonly zoom: number;
  readonly item: TItem | undefined;
  readonly items: readonly TItem[];
}

export interface PreviewEngineOptions<TItem extends PreviewItem = PreviewItem> {
  readonly items: readonly TItem[];
  readonly keyboard?: boolean;
  readonly minZoom?: number;
  readonly maxZoom?: number;
  readonly zoomStep?: number;
  readonly onChange?: (state: PreviewState<TItem>) => void;
}

const DEFAULT_MIN_ZOOM = 1;
const DEFAULT_MAX_ZOOM = 4;
const DEFAULT_ZOOM_STEP = 0.25;

/**
 * Manages preview visibility, navigation, zoom state, and keyboard controls.
 */
export class PreviewEngine<TItem extends PreviewItem = PreviewItem> {
  private items: readonly TItem[];
  private readonly keyboard: boolean;
  private readonly minZoom: number;
  private readonly maxZoom: number;
  private readonly zoomStep: number;
  private readonly onChange: ((state: PreviewState<TItem>) => void) | undefined;
  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.onKeyDown(event);
  };

  private visible = false;
  private current = 0;
  private zoom = DEFAULT_MIN_ZOOM;
  private keyboardAttached = false;

  public constructor(options: PreviewEngineOptions<TItem>) {
    this.items = options.items;
    this.keyboard = options.keyboard ?? true;
    this.minZoom = normalizeZoom(options.minZoom ?? DEFAULT_MIN_ZOOM);
    this.maxZoom = Math.max(this.minZoom, normalizeZoom(options.maxZoom ?? DEFAULT_MAX_ZOOM));
    this.zoomStep = normalizeZoom(options.zoomStep ?? DEFAULT_ZOOM_STEP);
    this.onChange = options.onChange;
  }

  /**
   * Open preview at the provided item index.
   */
  public open(index = 0): PreviewState<TItem> {
    if (this.items.length === 0) {
      this.visible = false;
      this.current = 0;
      this.zoom = this.minZoom;
      return this.emitChange();
    }

    this.visible = true;
    this.current = clampIndex(index, this.items.length);
    this.zoom = this.minZoom;
    this.attachKeyboard();

    return this.emitChange();
  }

  /**
   * Close preview and reset zoom.
   */
  public close(): PreviewState<TItem> {
    this.visible = false;
    this.zoom = this.minZoom;
    this.detachKeyboard();

    return this.emitChange();
  }

  /**
   * Move to the next preview item, wrapping at the end.
   */
  public next(): PreviewState<TItem> {
    if (this.items.length > 0) {
      this.current = (this.current + 1) % this.items.length;
      this.zoom = this.minZoom;
    }

    return this.emitChange();
  }

  /**
   * Move to the previous preview item, wrapping at the beginning.
   */
  public prev(): PreviewState<TItem> {
    if (this.items.length > 0) {
      this.current = (this.current - 1 + this.items.length) % this.items.length;
      this.zoom = this.minZoom;
    }

    return this.emitChange();
  }

  /**
   * Increase zoom by the configured step.
   */
  public zoomIn(): PreviewState<TItem> {
    this.zoom = clampZoom(this.zoom + this.zoomStep, this.minZoom, this.maxZoom);
    return this.emitChange();
  }

  /**
   * Decrease zoom by the configured step.
   */
  public zoomOut(): PreviewState<TItem> {
    this.zoom = clampZoom(this.zoom - this.zoomStep, this.minZoom, this.maxZoom);
    return this.emitChange();
  }

  /**
   * Reset zoom to the minimum zoom.
   */
  public resetZoom(): PreviewState<TItem> {
    this.zoom = this.minZoom;
    return this.emitChange();
  }

  /**
   * Replace preview items and clamp current index.
   */
  public updateItems(items: readonly TItem[]): PreviewState<TItem> {
    this.items = items;

    if (this.items.length === 0) {
      this.visible = false;
      this.current = 0;
      this.zoom = this.minZoom;
      this.detachKeyboard();
      return this.emitChange();
    }

    this.current = clampIndex(this.current, this.items.length);
    return this.emitChange();
  }

  /**
   * Return the current preview state snapshot.
   */
  public getState(): PreviewState<TItem> {
    return {
      visible: this.visible,
      current: this.current,
      zoom: this.zoom,
      item: this.items[this.current],
      items: this.items
    };
  }

  /**
   * Release keyboard listeners.
   */
  public destroy(): void {
    this.detachKeyboard();
  }

  private emitChange(): PreviewState<TItem> {
    const state = this.getState();
    this.onChange?.(state);

    return state;
  }

  private attachKeyboard(): void {
    if (!this.keyboard || this.keyboardAttached || typeof document === "undefined") {
      return;
    }

    document.addEventListener("keydown", this.handleKeyDown);
    this.keyboardAttached = true;
  }

  private detachKeyboard(): void {
    if (!this.keyboardAttached || typeof document === "undefined") {
      return;
    }

    document.removeEventListener("keydown", this.handleKeyDown);
    this.keyboardAttached = false;
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.visible) {
      return;
    }

    if (event.key === "Escape") {
      this.close();
      return;
    }

    if (event.key === "ArrowRight" || event.key === " ") {
      event.preventDefault();
      this.next();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.prev();
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      this.open(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      this.open(this.items.length - 1);
    }
  }
}

const clampIndex = (index: number, length: number): number =>
  Math.min(Math.max(0, Math.floor(index)), Math.max(0, length - 1));

const normalizeZoom = (value: number): number => Math.max(0.01, value);

const clampZoom = (value: number, minZoom: number, maxZoom: number): number =>
  Math.min(Math.max(value, minZoom), maxZoom);
