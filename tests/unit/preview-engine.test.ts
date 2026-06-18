/**
 * @vitest-environment jsdom
 */

import { PreviewEngine } from "@gallery-engine/preview";
import type { PreviewItem } from "@gallery-engine/preview";
import { afterEach, describe, expect, it, vi } from "vitest";

const createItems = (): readonly PreviewItem[] => [
  {
    id: "first",
    src: "/first.jpg",
    alt: "First"
  },
  {
    id: "second",
    src: "/second.jpg",
    title: "Second"
  },
  {
    id: "third",
    src: "/third.jpg"
  }
];

const dispatchKey = (key: string): KeyboardEvent => {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true
  });

  document.dispatchEvent(event);

  return event;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("PreviewEngine", () => {
  it("opens at a clamped index and resets zoom", () => {
    const onChange = vi.fn();
    const preview = new PreviewEngine({
      items: createItems(),
      onChange
    });

    preview.zoomIn();
    const state = preview.open(99);

    expect(state.visible).toBe(true);
    expect(state.current).toBe(2);
    expect(state.zoom).toBe(1);
    expect(state.item?.id).toBe("third");
    expect(onChange).toHaveBeenLastCalledWith(state);
  });

  it("closes preview and keeps the current item index", () => {
    const preview = new PreviewEngine({
      items: createItems()
    });

    preview.open(1);
    preview.zoomIn();
    const state = preview.close();

    expect(state.visible).toBe(false);
    expect(state.current).toBe(1);
    expect(state.zoom).toBe(1);
    expect(state.item?.id).toBe("second");
  });

  it("navigates next and previous with wraparound", () => {
    const preview = new PreviewEngine({
      items: createItems()
    });

    preview.open(2);

    expect(preview.next().item?.id).toBe("first");
    expect(preview.prev().item?.id).toBe("third");
  });

  it("clamps zoom to configured bounds", () => {
    const preview = new PreviewEngine({
      items: createItems(),
      minZoom: 1,
      maxZoom: 1.5,
      zoomStep: 0.3
    });

    preview.open(0);

    expect(preview.zoomIn().zoom).toBe(1.3);
    expect(preview.zoomIn().zoom).toBe(1.5);
    expect(preview.zoomOut().zoom).toBe(1.2);
    expect(preview.resetZoom().zoom).toBe(1);
  });

  it("updates items and closes when the list becomes empty", () => {
    const preview = new PreviewEngine({
      items: createItems()
    });

    preview.open(2);

    const clampedState = preview.updateItems(createItems().slice(0, 2));
    const emptyState = preview.updateItems([]);

    expect(clampedState.current).toBe(1);
    expect(clampedState.item?.id).toBe("second");
    expect(emptyState.visible).toBe(false);
    expect(emptyState.current).toBe(0);
    expect(emptyState.item).toBeUndefined();
  });

  it("does not open visible preview when no items exist", () => {
    const preview = new PreviewEngine({
      items: []
    });

    const state = preview.open();

    expect(state.visible).toBe(false);
    expect(state.current).toBe(0);
    expect(state.item).toBeUndefined();
  });

  it("handles keyboard navigation while visible", () => {
    const preview = new PreviewEngine({
      items: createItems()
    });

    preview.open(0);

    const spaceEvent = dispatchKey(" ");
    expect(spaceEvent.defaultPrevented).toBe(true);
    expect(preview.getState().item?.id).toBe("second");

    dispatchKey("ArrowLeft");
    expect(preview.getState().item?.id).toBe("first");

    dispatchKey("End");
    expect(preview.getState().item?.id).toBe("third");

    dispatchKey("Home");
    expect(preview.getState().item?.id).toBe("first");

    dispatchKey("Escape");
    expect(preview.getState().visible).toBe(false);
  });

  it("can disable keyboard controls", () => {
    const preview = new PreviewEngine({
      items: createItems(),
      keyboard: false
    });

    preview.open(0);
    dispatchKey("ArrowRight");

    expect(preview.getState().item?.id).toBe("first");
  });

  it("removes keyboard listeners on destroy", () => {
    const preview = new PreviewEngine({
      items: createItems()
    });

    preview.open(0);
    preview.destroy();
    dispatchKey("ArrowRight");

    expect(preview.getState().item?.id).toBe("first");
  });

  it("enforces preview item shape at compile time", () => {
    // @ts-expect-error Preview items must include id and src.
    const invalidItem: PreviewItem = {
      id: "missing-src"
    };

    expect(invalidItem.id).toBe("missing-src");
  });
});
