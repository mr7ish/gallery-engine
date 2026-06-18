/**
 * @vitest-environment jsdom
 */

import { ZoomManager } from "@gallery-engine/preview";
import type { ZoomPoint, ZoomState } from "@gallery-engine/preview";
import { afterEach, describe, expect, it, vi } from "vitest";

const createTarget = (): HTMLElement => {
  const target = document.createElement("div");
  document.body.append(target);

  return target;
};

const dispatchWheel = (target: HTMLElement, deltaY: number): boolean =>
  target.dispatchEvent(
    new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 50,
      deltaY
    })
  );

const dispatchDoubleClick = (target: HTMLElement): boolean =>
  target.dispatchEvent(
    new MouseEvent("dblclick", {
      bubbles: true,
      cancelable: true,
      clientX: 20,
      clientY: 30
    })
  );

const dispatchPointer = (
  target: HTMLElement,
  type: "pointerdown" | "pointermove" | "pointerup",
  point: ZoomPoint,
  pointerId = 1
): boolean => {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true
  });

  Object.defineProperties(event, {
    clientX: {
      value: point.x
    },
    clientY: {
      value: point.y
    },
    pointerId: {
      value: pointerId
    }
  });

  return target.dispatchEvent(event);
};

const createTouch = (target: EventTarget, identifier: number, point: ZoomPoint): Touch => ({
  identifier,
  target,
  clientX: point.x,
  clientY: point.y,
  screenX: point.x,
  screenY: point.y,
  pageX: point.x,
  pageY: point.y,
  radiusX: 1,
  radiusY: 1,
  rotationAngle: 0,
  force: 1
});

const dispatchTouch = (
  target: HTMLElement,
  type: "touchstart" | "touchmove" | "touchend",
  points: readonly ZoomPoint[]
): boolean => {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true
  });
  const touches = points.map((point, index) => createTouch(target, index, point));

  Object.defineProperty(event, "touches", {
    value: touches
  });

  return target.dispatchEvent(event);
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("ZoomManager", () => {
  it("zooms with wheel events and clamps to configured limits", () => {
    const target = createTarget();
    const onChange = vi.fn<(state: ZoomState) => void>();
    const zoomManager = new ZoomManager({
      target,
      minZoom: 1,
      maxZoom: 2,
      zoomStep: 0.5,
      onChange
    });

    zoomManager.attach();

    expect(dispatchWheel(target, -100)).toBe(false);
    expect(zoomManager.getState().zoom).toBe(1.5);

    dispatchWheel(target, -100);
    dispatchWheel(target, -100);

    expect(zoomManager.getState().zoom).toBe(2);

    dispatchWheel(target, 100);

    expect(zoomManager.getState().zoom).toBe(1.5);
    expect(onChange).toHaveBeenCalled();
  });

  it("toggles double-click zoom and resets pan when returning to minimum zoom", () => {
    const target = createTarget();
    const zoomManager = new ZoomManager({
      target,
      doubleClickZoom: 3
    });

    zoomManager.attach();
    dispatchDoubleClick(target);

    expect(zoomManager.getState().zoom).toBe(3);

    zoomManager.setPan({
      x: 40,
      y: -20
    });
    dispatchDoubleClick(target);

    expect(zoomManager.getState()).toMatchObject({
      zoom: 1,
      panX: 0,
      panY: 0
    });
  });

  it("drags to update pan while zoomed in", () => {
    const target = createTarget();
    const zoomManager = new ZoomManager({
      target
    });

    zoomManager.attach();
    zoomManager.setZoom(2);
    dispatchPointer(target, "pointerdown", {
      x: 10,
      y: 20
    });

    expect(zoomManager.getState().dragging).toBe(true);

    dispatchPointer(target, "pointermove", {
      x: 40,
      y: 55
    });

    expect(zoomManager.getState()).toMatchObject({
      panX: 30,
      panY: 35
    });

    dispatchPointer(target, "pointerup", {
      x: 40,
      y: 55
    });

    expect(zoomManager.getState().dragging).toBe(false);
  });

  it("ignores drag gestures at minimum zoom", () => {
    const target = createTarget();
    const zoomManager = new ZoomManager({
      target
    });

    zoomManager.attach();
    dispatchPointer(target, "pointerdown", {
      x: 0,
      y: 0
    });
    dispatchPointer(target, "pointermove", {
      x: 20,
      y: 20
    });

    expect(zoomManager.getState()).toMatchObject({
      zoom: 1,
      panX: 0,
      panY: 0,
      dragging: false
    });
  });

  it("zooms with two-touch pinch gestures", () => {
    const target = createTarget();
    const zoomManager = new ZoomManager({
      target,
      maxZoom: 5
    });

    zoomManager.attach();
    dispatchTouch(target, "touchstart", [
      {
        x: 0,
        y: 0
      },
      {
        x: 100,
        y: 0
      }
    ]);

    expect(zoomManager.getState().pinching).toBe(true);

    dispatchTouch(target, "touchmove", [
      {
        x: 0,
        y: 0
      },
      {
        x: 200,
        y: 0
      }
    ]);

    expect(zoomManager.getState().zoom).toBe(2);

    dispatchTouch(target, "touchend", []);

    expect(zoomManager.getState().pinching).toBe(false);
  });

  it("detaches listeners and resets state on destroy", () => {
    const target = createTarget();
    const zoomManager = new ZoomManager({
      target
    });

    zoomManager.attach();
    zoomManager.setZoom(2);
    zoomManager.setPan({
      x: 12,
      y: 24
    });
    zoomManager.destroy();
    dispatchWheel(target, -100);

    expect(zoomManager.isAttached()).toBe(false);
    expect(zoomManager.getState()).toMatchObject({
      zoom: 1,
      panX: 0,
      panY: 0
    });
  });

  it("enforces zoom point shape at compile time", () => {
    const zoomManager = new ZoomManager();

    // @ts-expect-error Zoom points must include y.
    const invalidPoint: ZoomPoint = {
      x: 10
    };

    expect(invalidPoint.x).toBe(10);
    expect(() => {
      zoomManager.attach();
    }).toThrow("Zoom target is required.");
  });
});
