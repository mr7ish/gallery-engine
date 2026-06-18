import { GridLayout, LayoutRegistry, MasonryLayout } from "@gallery-engine/layouts";
import type { Layout, LayoutInputItem } from "@gallery-engine/layouts";
import { describe, expect, it } from "vitest";

const createItems = (count: number): readonly LayoutInputItem[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `image-${String(index + 1)}`,
    width: 400,
    height: 300
  }));

describe("LayoutRegistry", () => {
  it("registers and returns layouts by name", () => {
    const registry = new LayoutRegistry();
    const gridLayout = new GridLayout();

    registry.registerLayout(gridLayout);

    expect(registry.getLayout("grid")).toBe(gridLayout);
    expect(registry.hasLayout("grid")).toBe(true);
    expect(registry.listLayouts()).toEqual(["grid"]);
  });

  it("rejects duplicate layout names", () => {
    const registry = new LayoutRegistry();

    registry.registerLayout(new GridLayout());

    expect(() => {
      registry.registerLayout(new GridLayout());
    }).toThrow('Layout "grid" is already registered.');
  });

  it("enforces layout shape at compile time", () => {
    // @ts-expect-error Layouts must expose a calculate method.
    const invalidLayout: Layout = {
      name: "invalid"
    };

    expect(invalidLayout.name).toBe("invalid");
  });
});

describe("GridLayout", () => {
  it("calculates fixed columns with configured gap", () => {
    const layout = new GridLayout({
      columns: 3,
      gap: 10
    });

    const result = layout.calculate(createItems(5), {
      containerWidth: 320
    });

    expect(result.width).toBe(320);
    expect(result.items).toEqual([
      {
        id: "image-1",
        x: 0,
        y: 0,
        width: 100,
        height: 75
      },
      {
        id: "image-2",
        x: 110,
        y: 0,
        width: 100,
        height: 75
      },
      {
        id: "image-3",
        x: 220,
        y: 0,
        width: 100,
        height: 75
      },
      {
        id: "image-4",
        x: 0,
        y: 85,
        width: 100,
        height: 75
      },
      {
        id: "image-5",
        x: 110,
        y: 85,
        width: 100,
        height: 75
      }
    ]);
    expect(result.height).toBe(160);
  });

  it("calculates responsive columns from minColumnWidth", () => {
    const layout = new GridLayout({
      gap: 10,
      minColumnWidth: 150
    });

    const result = layout.calculate(createItems(4), {
      containerWidth: 470
    });

    expect(result.items.map((item) => item.x)).toEqual([0, 160, 320, 0]);
    expect(result.items[0]?.width).toBe(150);
    expect(result.items[3]?.y).toBe(122.5);
  });

  it("normalizes invalid fixed column counts to one column", () => {
    const layout = new GridLayout({
      columns: 0,
      gap: 8
    });

    const result = layout.calculate(createItems(2), {
      containerWidth: 200
    });

    expect(result.items.map((item) => item.x)).toEqual([0, 0]);
    expect(result.items.map((item) => item.y)).toEqual([0, 158]);
    expect(result.items[0]?.width).toBe(200);
  });

  it("uses square items when source dimensions are missing", () => {
    const layout = new GridLayout({
      columns: 2,
      gap: 20
    });

    const result = layout.calculate(
      [
        {
          id: "unknown-size"
        }
      ],
      {
        containerWidth: 220
      }
    );

    expect(result.items[0]).toEqual({
      id: "unknown-size",
      x: 0,
      y: 0,
      width: 100,
      height: 100
    });
  });

  it("handles zero-width containers without negative sizes", () => {
    const layout = new GridLayout({
      columns: 3,
      gap: 12
    });

    const result = layout.calculate(createItems(1), {
      containerWidth: 0
    });

    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
    expect(result.items[0]?.width).toBe(0);
    expect(result.items[0]?.height).toBe(0);
  });
});

describe("MasonryLayout", () => {
  it("places each item in the current shortest column", () => {
    const layout = new MasonryLayout({
      columns: 2,
      gap: 10
    });

    const result = layout.calculate(
      [
        {
          id: "tall",
          width: 100,
          height: 300
        },
        {
          id: "short",
          width: 100,
          height: 100
        },
        {
          id: "next-shortest",
          width: 100,
          height: 200
        }
      ],
      {
        containerWidth: 210
      }
    );

    expect(result.items).toEqual([
      {
        id: "tall",
        x: 0,
        y: 0,
        width: 100,
        height: 300
      },
      {
        id: "short",
        x: 110,
        y: 0,
        width: 100,
        height: 100
      },
      {
        id: "next-shortest",
        x: 110,
        y: 110,
        width: 100,
        height: 200
      }
    ]);
    expect(result.height).toBe(310);
  });

  it("calculates responsive columns from minColumnWidth", () => {
    const layout = new MasonryLayout({
      gap: 10,
      minColumnWidth: 150
    });

    const result = layout.calculate(createItems(4), {
      containerWidth: 470
    });

    expect(result.items.map((item) => item.x)).toEqual([0, 160, 320, 0]);
    expect(result.items[0]?.width).toBe(150);
    expect(result.items[3]?.y).toBe(122.5);
  });

  it("normalizes invalid fixed column counts to one column", () => {
    const layout = new MasonryLayout({
      columns: 0,
      gap: 8
    });

    const result = layout.calculate(createItems(2), {
      containerWidth: 200
    });

    expect(result.items.map((item) => item.x)).toEqual([0, 0]);
    expect(result.items.map((item) => item.y)).toEqual([0, 158]);
    expect(result.height).toBe(308);
  });

  it("uses square items when source dimensions are missing", () => {
    const layout = new MasonryLayout({
      columns: 2,
      gap: 20
    });

    const result = layout.calculate(
      [
        {
          id: "unknown-size"
        }
      ],
      {
        containerWidth: 220
      }
    );

    expect(result.items[0]).toEqual({
      id: "unknown-size",
      x: 0,
      y: 0,
      width: 100,
      height: 100
    });
  });

  it("returns an empty layout for empty input", () => {
    const layout = new MasonryLayout({
      columns: 3,
      gap: 12
    });

    const result = layout.calculate([], {
      containerWidth: 360
    });

    expect(result).toEqual({
      width: 360,
      height: 0,
      items: []
    });
  });
});
