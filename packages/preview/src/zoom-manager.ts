export interface ZoomPoint {
  readonly x: number;
  readonly y: number;
}

export interface ZoomState {
  readonly zoom: number;
  readonly minZoom: number;
  readonly maxZoom: number;
  readonly panX: number;
  readonly panY: number;
  readonly dragging: boolean;
  readonly pinching: boolean;
}

export type ZoomStateHandler = (state: ZoomState) => void;

export interface ZoomManagerOptions {
  readonly target?: HTMLElement;
  readonly minZoom?: number;
  readonly maxZoom?: number;
  readonly zoomStep?: number;
  readonly doubleClickZoom?: number;
  readonly onChange?: ZoomStateHandler;
}

const DEFAULT_MIN_ZOOM = 1;
const DEFAULT_MAX_ZOOM = 4;
const DEFAULT_ZOOM_STEP = 0.25;
const DEFAULT_DOUBLE_CLICK_ZOOM = 2;

/**
 * Manages preview zoom, drag panning, wheel zoom, double-click zoom, and pinch gestures.
 */
export class ZoomManager {
  private target: HTMLElement | undefined;
  private readonly minZoom: number;
  private readonly maxZoom: number;
  private readonly zoomStep: number;
  private readonly doubleClickZoom: number;
  private readonly onChange: ZoomStateHandler | undefined;
  private attached = false;
  private zoom: number;
  private panX = 0;
  private panY = 0;
  private dragStart: DragSnapshot | undefined;
  private pinchStart: PinchSnapshot | undefined;

  private readonly handleWheelEvent = (event: WheelEvent): void => {
    this.onWheel(event);
  };

  private readonly handleDoubleClickEvent = (event: MouseEvent): void => {
    this.onDoubleClick(event);
  };

  private readonly handlePointerDownEvent = (event: PointerEvent): void => {
    this.onPointerDown(event);
  };

  private readonly handlePointerMoveEvent = (event: PointerEvent): void => {
    this.onPointerMove(event);
  };

  private readonly handlePointerUpEvent = (): void => {
    this.onPointerUp();
  };

  private readonly handleTouchStartEvent = (event: TouchEvent): void => {
    this.onTouchStart(event);
  };

  private readonly handleTouchMoveEvent = (event: TouchEvent): void => {
    this.onTouchMove(event);
  };

  private readonly handleTouchEndEvent = (): void => {
    this.onTouchEnd();
  };

  public constructor(options: ZoomManagerOptions = {}) {
    this.target = options.target;
    this.minZoom = normalizeZoom(options.minZoom ?? DEFAULT_MIN_ZOOM);
    this.maxZoom = Math.max(this.minZoom, normalizeZoom(options.maxZoom ?? DEFAULT_MAX_ZOOM));
    this.zoomStep = normalizeZoom(options.zoomStep ?? DEFAULT_ZOOM_STEP);
    this.doubleClickZoom = clampZoom(
      options.doubleClickZoom ?? DEFAULT_DOUBLE_CLICK_ZOOM,
      this.minZoom,
      this.maxZoom
    );
    this.onChange = options.onChange;
    this.zoom = this.minZoom;
  }

  /**
   * Attach wheel, double-click, pointer, and touch gesture listeners.
   */
  public attach(target = this.target): void {
    if (this.attached) {
      return;
    }

    if (!target) {
      throw new Error("Zoom target is required.");
    }

    this.target = target;
    target.addEventListener("wheel", this.handleWheelEvent, {
      passive: false
    });
    target.addEventListener("dblclick", this.handleDoubleClickEvent);
    target.addEventListener("pointerdown", this.handlePointerDownEvent);
    target.addEventListener("pointermove", this.handlePointerMoveEvent);
    target.addEventListener("pointerup", this.handlePointerUpEvent);
    target.addEventListener("pointercancel", this.handlePointerUpEvent);
    target.addEventListener("touchstart", this.handleTouchStartEvent, {
      passive: false
    });
    target.addEventListener("touchmove", this.handleTouchMoveEvent, {
      passive: false
    });
    target.addEventListener("touchend", this.handleTouchEndEvent);
    target.addEventListener("touchcancel", this.handleTouchEndEvent);
    this.attached = true;
  }

  /**
   * Detach gesture listeners from the current target.
   */
  public detach(): void {
    if (!this.attached || !this.target) {
      return;
    }

    this.target.removeEventListener("wheel", this.handleWheelEvent);
    this.target.removeEventListener("dblclick", this.handleDoubleClickEvent);
    this.target.removeEventListener("pointerdown", this.handlePointerDownEvent);
    this.target.removeEventListener("pointermove", this.handlePointerMoveEvent);
    this.target.removeEventListener("pointerup", this.handlePointerUpEvent);
    this.target.removeEventListener("pointercancel", this.handlePointerUpEvent);
    this.target.removeEventListener("touchstart", this.handleTouchStartEvent);
    this.target.removeEventListener("touchmove", this.handleTouchMoveEvent);
    this.target.removeEventListener("touchend", this.handleTouchEndEvent);
    this.target.removeEventListener("touchcancel", this.handleTouchEndEvent);
    this.dragStart = undefined;
    this.pinchStart = undefined;
    this.attached = false;
  }

  /**
   * Return whether gesture listeners are attached.
   */
  public isAttached(): boolean {
    return this.attached;
  }

  /**
   * Return the current zoom and pan snapshot.
   */
  public getState(): ZoomState {
    return {
      zoom: this.zoom,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      panX: this.panX,
      panY: this.panY,
      dragging: this.dragStart !== undefined,
      pinching: this.pinchStart !== undefined
    };
  }

  /**
   * Set zoom directly and optionally keep an origin point visually anchored.
   */
  public setZoom(zoom: number, origin = ZERO_POINT): ZoomState {
    return this.applyZoom(zoom, origin);
  }

  /**
   * Increase zoom by one configured step.
   */
  public zoomIn(origin = ZERO_POINT): ZoomState {
    return this.applyZoom(this.zoom + this.zoomStep, origin);
  }

  /**
   * Decrease zoom by one configured step.
   */
  public zoomOut(origin = ZERO_POINT): ZoomState {
    return this.applyZoom(this.zoom - this.zoomStep, origin);
  }

  /**
   * Set pan directly.
   */
  public setPan(pan: ZoomPoint): ZoomState {
    this.panX = pan.x;
    this.panY = pan.y;

    return this.emitChange();
  }

  /**
   * Reset zoom, pan, drag, and pinch state.
   */
  public reset(): ZoomState {
    this.zoom = this.minZoom;
    this.panX = 0;
    this.panY = 0;
    this.dragStart = undefined;
    this.pinchStart = undefined;

    return this.emitChange();
  }

  /**
   * Detach listeners and reset interaction state.
   */
  public destroy(): void {
    this.detach();
    this.reset();
    this.target = undefined;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();

    if (event.deltaY < 0) {
      this.zoomIn(resolveEventPoint(event));
      return;
    }

    if (event.deltaY > 0) {
      this.zoomOut(resolveEventPoint(event));
    }
  }

  private onDoubleClick(event: MouseEvent): void {
    event.preventDefault();
    const origin = resolveEventPoint(event);

    if (this.zoom > this.minZoom) {
      this.applyZoom(this.minZoom, origin);
      this.panX = 0;
      this.panY = 0;
      this.emitChange();
      return;
    }

    this.applyZoom(this.doubleClickZoom, origin);
  }

  private onPointerDown(event: PointerEvent): void {
    if (this.zoom <= this.minZoom) {
      return;
    }

    event.preventDefault();
    this.dragStart = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: this.panX,
      panY: this.panY
    };
    this.emitChange();
  }

  private onPointerMove(event: PointerEvent): void {
    const dragStart = this.dragStart;

    if (dragStart?.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    this.panX = dragStart.panX + event.clientX - dragStart.startX;
    this.panY = dragStart.panY + event.clientY - dragStart.startY;
    this.emitChange();
  }

  private onPointerUp(): void {
    if (!this.dragStart) {
      return;
    }

    this.dragStart = undefined;
    this.emitChange();
  }

  private onTouchStart(event: TouchEvent): void {
    const touches = getPinchTouchPoints(event);

    if (!touches) {
      return;
    }

    const [firstTouch, secondTouch] = touches;

    event.preventDefault();
    this.dragStart = undefined;
    this.pinchStart = {
      distance: distanceBetween(firstTouch, secondTouch),
      center: centerBetween(firstTouch, secondTouch),
      zoom: this.zoom
    };
    this.emitChange();
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.pinchStart) {
      return;
    }

    const touches = getPinchTouchPoints(event);

    if (!touches) {
      return;
    }

    const [firstTouch, secondTouch] = touches;

    event.preventDefault();
    const nextDistance = distanceBetween(firstTouch, secondTouch);
    const scale = nextDistance / this.pinchStart.distance;
    this.applyZoom(this.pinchStart.zoom * scale, this.pinchStart.center);
  }

  private onTouchEnd(): void {
    if (!this.pinchStart) {
      return;
    }

    this.pinchStart = undefined;
    this.emitChange();
  }

  private applyZoom(nextZoom: number, origin: ZoomPoint): ZoomState {
    const previousZoom = this.zoom;
    const normalizedZoom = clampZoom(nextZoom, this.minZoom, this.maxZoom);

    if (normalizedZoom === previousZoom) {
      return this.getState();
    }

    this.panX = origin.x - ((origin.x - this.panX) / previousZoom) * normalizedZoom;
    this.panY = origin.y - ((origin.y - this.panY) / previousZoom) * normalizedZoom;
    this.zoom = normalizedZoom;

    if (this.zoom === this.minZoom) {
      this.panX = 0;
      this.panY = 0;
    }

    return this.emitChange();
  }

  private emitChange(): ZoomState {
    const state = this.getState();
    this.onChange?.(state);

    return state;
  }
}

interface DragSnapshot {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly panX: number;
  readonly panY: number;
}

interface PinchSnapshot {
  readonly distance: number;
  readonly center: ZoomPoint;
  readonly zoom: number;
}

const ZERO_POINT: ZoomPoint = {
  x: 0,
  y: 0
};

const normalizeZoom = (value: number): number => Math.max(0.01, value);

const clampZoom = (value: number, minZoom: number, maxZoom: number): number =>
  Math.min(Math.max(value, minZoom), maxZoom);

const resolveEventPoint = (event: MouseEvent | WheelEvent): ZoomPoint => ({
  x: event.clientX,
  y: event.clientY
});

const getPinchTouchPoints = (event: TouchEvent): readonly [ZoomPoint, ZoomPoint] | undefined => {
  const firstTouch = event.touches[0];
  const secondTouch = event.touches[1];

  if (!firstTouch || !secondTouch || event.touches.length !== 2) {
    return undefined;
  }

  return [
    {
      x: firstTouch.clientX,
      y: firstTouch.clientY
    },
    {
      x: secondTouch.clientX,
      y: secondTouch.clientY
    }
  ];
};

const distanceBetween = (first: ZoomPoint, second: ZoomPoint): number =>
  Math.hypot(second.x - first.x, second.y - first.y);

const centerBetween = (first: ZoomPoint, second: ZoomPoint): ZoomPoint => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2
});
