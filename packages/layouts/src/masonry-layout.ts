import type { Layout, LayoutCalculationContext, LayoutInputItem, LayoutResult } from "./types";

export interface MasonryLayoutOptions {
  readonly columns?: number;
  readonly gap?: number;
  readonly minColumnWidth?: number;
}

const DEFAULT_COLUMNS = 4;
const DEFAULT_GAP = 12;
const DEFAULT_MIN_COLUMN_WIDTH = 240;

/**
 * Calculates a masonry layout by placing each item in the shortest column.
 */
export class MasonryLayout<
  TItem extends LayoutInputItem = LayoutInputItem
> implements Layout<TItem> {
  public readonly name = "masonry";

  private readonly columns: number | undefined;
  private readonly gap: number;
  private readonly minColumnWidth: number;

  public constructor(options: MasonryLayoutOptions = {}) {
    this.columns = options.columns;
    this.gap = options.gap ?? DEFAULT_GAP;
    this.minColumnWidth = options.minColumnWidth ?? DEFAULT_MIN_COLUMN_WIDTH;
  }

  /**
   * Calculate item positions for a masonry container.
   */
  public calculate(items: readonly TItem[], context: LayoutCalculationContext): LayoutResult {
    const containerWidth = Math.max(0, context.containerWidth);
    const columns = this.resolveColumns(containerWidth);
    const columnWidth = resolveColumnWidth(containerWidth, columns, this.gap);
    const columnHeights = Array.from({ length: columns }, () => 0);

    const layoutItems = items.map((item) => {
      const column = findShortestColumn(columnHeights);
      const height = resolveItemHeight(item, columnWidth);
      const layoutItem = {
        id: item.id,
        x: column * (columnWidth + this.gap),
        y: columnHeights[column] ?? 0,
        width: columnWidth,
        height
      };

      columnHeights[column] = layoutItem.y + height + this.gap;

      return layoutItem;
    });

    return {
      width: containerWidth,
      height: resolveLayoutHeight(columnHeights, this.gap, layoutItems.length),
      items: layoutItems
    };
  }

  private resolveColumns(containerWidth: number): number {
    if (this.columns !== undefined) {
      return normalizeColumnCount(this.columns);
    }

    if (this.minColumnWidth > 0) {
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

const findShortestColumn = (columnHeights: readonly number[]): number => {
  let shortestColumn = 0;
  let shortestHeight = columnHeights[0] ?? 0;

  for (let index = 1; index < columnHeights.length; index += 1) {
    const columnHeight = columnHeights[index] ?? 0;

    if (columnHeight < shortestHeight) {
      shortestColumn = index;
      shortestHeight = columnHeight;
    }
  }

  return shortestColumn;
};

const resolveLayoutHeight = (
  columnHeights: readonly number[],
  gap: number,
  itemCount: number
): number => {
  if (itemCount === 0) {
    return 0;
  }

  return Math.max(0, Math.max(...columnHeights) - gap);
};
