import { VirtualEngine } from "@gallery-engine/core";
import type { VirtualItem } from "@gallery-engine/core";
import { describe, expect, it } from "vitest";

const createItems = (count: number, height = 100): readonly VirtualItem[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `item-${String(index + 1)}`,
    x: 0,
    y: index * height,
    width: 200,
    height
  }));

describe("VirtualEngine", () => {
  it("calculates visible range for viewport intersections", () => {
    const virtualEngine = new VirtualEngine();
    virtualEngine.setItems(createItems(5));

    const result = virtualEngine.calculate({
      scrollTop: 100,
      height: 150
    });

    expect(result.range).toEqual({
      start: 0,
      end: 2
    });
    expect(result.visibleItems.map((item) => item.id)).toEqual(["item-1", "item-2", "item-3"]);
    expect(result.retainedIds).toEqual(["item-1", "item-2", "item-3"]);
    expect(result.recycledIds).toEqual([]);
  });

  it("extends the viewport by overscan pixels", () => {
    const virtualEngine = new VirtualEngine({
      overscan: 50
    });
    virtualEngine.setItems(createItems(5));

    const result = virtualEngine.calculate({
      scrollTop: 200,
      height: 50
    });

    expect(result.visibleItems.map((item) => item.id)).toEqual(["item-2", "item-3", "item-4"]);
  });

  it("returns an empty range when no items intersect", () => {
    const virtualEngine = new VirtualEngine();
    virtualEngine.setItems(createItems(2));

    const result = virtualEngine.calculate({
      scrollTop: 1_000,
      height: 100
    });

    expect(result).toEqual({
      range: {
        start: 0,
        end: -1
      },
      visibleItems: [],
      retainedIds: [],
      recycledIds: []
    });
  });

  it("reports recycled ids after the retained range changes", () => {
    const virtualEngine = new VirtualEngine();
    virtualEngine.setItems(createItems(6));

    virtualEngine.calculate({
      scrollTop: 0,
      height: 100
    });
    const result = virtualEngine.calculate({
      scrollTop: 400,
      height: 100
    });

    expect(result.visibleItems.map((item) => item.id)).toEqual(["item-4", "item-5", "item-6"]);
    expect(result.recycledIds).toEqual(["item-1", "item-2"]);
  });

  it("clamps negative scroll and viewport height values", () => {
    const virtualEngine = new VirtualEngine({
      overscan: -10
    });
    virtualEngine.setItems(createItems(3));

    const result = virtualEngine.calculate({
      scrollTop: -50,
      height: -20
    });

    expect(result.visibleItems.map((item) => item.id)).toEqual(["item-1"]);
  });

  it("retains only ids that still exist after item updates", () => {
    const virtualEngine = new VirtualEngine();
    virtualEngine.setItems(createItems(4));

    virtualEngine.calculate({
      scrollTop: 0,
      height: 300
    });
    virtualEngine.setItems(createItems(2));
    const result = virtualEngine.calculate({
      scrollTop: 0,
      height: 300
    });

    expect(result.retainedIds).toEqual(["item-1", "item-2"]);
    expect(result.recycledIds).toEqual([]);
  });

  it("can reset retained ids without changing items", () => {
    const virtualEngine = new VirtualEngine();
    virtualEngine.setItems(createItems(3));
    virtualEngine.calculate({
      scrollTop: 0,
      height: 100
    });

    virtualEngine.reset();
    const result = virtualEngine.calculate({
      scrollTop: 100,
      height: 100
    });

    expect(result.recycledIds).toEqual([]);
    expect(virtualEngine.getItems()).toHaveLength(3);
  });

  it("enforces virtual item shape at compile time", () => {
    // @ts-expect-error Virtual items must include height.
    const invalidItem: VirtualItem = {
      id: "missing-height",
      x: 0,
      y: 0,
      width: 100
    };

    expect(invalidItem.id).toBe("missing-height");
  });
});
