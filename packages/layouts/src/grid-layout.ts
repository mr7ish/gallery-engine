import type { Layout, LayoutCalculationContext, LayoutInputItem, LayoutResult } from "./types";

export interface GridLayoutOptions {
  readonly columns?: number;
  readonly gap?: number;
  readonly minColumnWidth?: number;
}

const DEFAULT_COLUMNS = 4;
const DEFAULT_GAP = 12;

/**
 * Calculates a column-based grid layout with optional responsive columns.
 */
export class GridLayout<TItem extends LayoutInputItem = LayoutInputItem> implements Layout<TItem> {
  public readonly name = "grid";

  private readonly columns: number | undefined;
  private readonly gap: number;
  private readonly minColumnWidth: number | undefined;

  public constructor(options: GridLayoutOptions = {}) {
    this.columns = options.columns;
    this.gap = options.gap ?? DEFAULT_GAP;
    this.minColumnWidth = options.minColumnWidth;
  }

  /**
   * Calculate item positions for a grid container.
   */
  public calculate(items: readonly TItem[], context: LayoutCalculationContext): LayoutResult {
    const containerWidth = Math.max(0, context.containerWidth);
    const columns = this.resolveColumns(containerWidth);
    const columnWidth = resolveColumnWidth(containerWidth, columns, this.gap);

    const layoutItems = items.map((item, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const height = resolveItemHeight(item, columnWidth);

      return {
        id: item.id,
        x: column * (columnWidth + this.gap),
        y: row * (height + this.gap),
        width: columnWidth,
        height
      };
    });

    const layoutHeight = layoutItems.reduce(
      (maxHeight, item) => Math.max(maxHeight, item.y + item.height),
      0
    );

    return {
      width: containerWidth,
      height: layoutHeight,
      items: layoutItems
    };
  }

  private resolveColumns(containerWidth: number): number {
    if (this.columns !== undefined) {
      return normalizeColumnCount(this.columns);
    }

    if (this.minColumnWidth !== undefined && this.minColumnWidth > 0) {
      return Math.max(
        1,
        Math.floor((containerWidth + this.gap) / (this.minColumnWidth + this.gap))
      );
    }

    return DEFAULT_COLUMNS;
  }
}

const normalizeColumnCount = (columns: number): number => Math.max(1, Math.floor(columns));

const resolveColumnWidth = (containerWidth: number, columns: number, gap: number): number => {
  const totalGap = gap * Math.max(0, columns - 1);
  return Math.max(0, (containerWidth - totalGap) / columns);
};

const resolveItemHeight = (item: LayoutInputItem, columnWidth: number): number => {
  if (item.width !== undefined && item.height !== undefined && item.width > 0) {
    return columnWidth * (item.height / item.width);
  }

  return columnWidth;
};
