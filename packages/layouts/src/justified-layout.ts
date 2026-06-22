import type {
  Layout,
  LayoutCalculationContext,
  LayoutInputItem,
  LayoutItem,
  LayoutResult
} from "./types";

export interface JustifiedLayoutOptions {
  readonly rowHeight?: number;
  readonly gap?: number;
}

interface RowEntry<TItem extends LayoutInputItem> {
  readonly item: TItem;
  readonly aspectRatio: number;
}

interface ResolvedRow {
  readonly height: number;
  readonly items: readonly LayoutItem[];
}

const DEFAULT_ROW_HEIGHT = 220;
const DEFAULT_GAP = 12;

/**
 * Calculates rows that preserve image ratios while justified rows fill the container width.
 */
export class JustifiedLayout<
  TItem extends LayoutInputItem = LayoutInputItem
> implements Layout<TItem> {
  public readonly name = "justified";

  private readonly rowHeight: number;
  private readonly gap: number;

  public constructor(options: JustifiedLayoutOptions = {}) {
    this.rowHeight = normalizePositiveNumber(options.rowHeight ?? DEFAULT_ROW_HEIGHT);
    this.gap = Math.max(0, options.gap ?? DEFAULT_GAP);
  }

  /**
   * Calculate item positions for a justified row layout.
   */
  public calculate(items: readonly TItem[], context: LayoutCalculationContext): LayoutResult {
    const containerWidth = Math.max(0, context.containerWidth);
    const layoutItems: LayoutItem[] = [];
    const row: RowEntry<TItem>[] = [];
    let rowAspectRatioSum = 0;
    let y = 0;

    for (const item of items) {
      const aspectRatio = resolveAspectRatio(item);
      row.push({
        item,
        aspectRatio
      });
      rowAspectRatioSum += aspectRatio;

      if (shouldJustifyRow(row, rowAspectRatioSum, this.rowHeight, this.gap, containerWidth)) {
        const resolvedRow = resolveRow(row, {
          y,
          rowHeight: this.rowHeight,
          gap: this.gap,
          containerWidth,
          justify: true,
          aspectRatioSum: rowAspectRatioSum
        });

        layoutItems.push(...resolvedRow.items);
        y += resolvedRow.height + this.gap;
        row.length = 0;
        rowAspectRatioSum = 0;
      }
    }

    if (row.length > 0) {
      const resolvedRow = resolveRow(row, {
        y,
        rowHeight: this.rowHeight,
        gap: this.gap,
        containerWidth,
        justify: false,
        aspectRatioSum: rowAspectRatioSum
      });

      layoutItems.push(...resolvedRow.items);
      y += resolvedRow.height;
    }

    return {
      width: containerWidth,
      height: resolveLayoutHeight(layoutItems),
      items: layoutItems
    };
  }
}

interface ResolveRowOptions {
  readonly y: number;
  readonly rowHeight: number;
  readonly gap: number;
  readonly containerWidth: number;
  readonly justify: boolean;
  readonly aspectRatioSum: number;
}

const shouldJustifyRow = (
  row: readonly RowEntry<LayoutInputItem>[],
  aspectRatioSum: number,
  rowHeight: number,
  gap: number,
  containerWidth: number
): boolean => {
  if (containerWidth <= 0) {
    return true;
  }

  const rowGap = gap * Math.max(0, row.length - 1);
  return aspectRatioSum * rowHeight + rowGap >= containerWidth;
};

const resolveRow = <TItem extends LayoutInputItem>(
  row: readonly RowEntry<TItem>[],
  options: ResolveRowOptions
): ResolvedRow => {
  const rowGap = options.gap * Math.max(0, row.length - 1);
  const height = options.justify
    ? resolveJustifiedRowHeight(options.containerWidth, rowGap, options.aspectRatioSum)
    : options.rowHeight;
  let x = 0;
  const items = row.map((entry) => {
    const width = height * entry.aspectRatio;
    const layoutItem = {
      id: entry.item.id,
      x,
      y: options.y,
      width,
      height
    };

    x += width + options.gap;

    return layoutItem;
  });

  return {
    height,
    items
  };
};

const resolveJustifiedRowHeight = (
  containerWidth: number,
  rowGap: number,
  aspectRatioSum: number
): number => {
  if (containerWidth <= 0 || aspectRatioSum <= 0) {
    return 0;
  }

  return Math.max(0, (containerWidth - rowGap) / aspectRatioSum);
};

const resolveLayoutHeight = (items: readonly LayoutItem[]): number =>
  items.reduce((height, item) => Math.max(height, item.y + item.height), 0);

const resolveAspectRatio = (item: LayoutInputItem): number => {
  if (item.width !== undefined && item.height !== undefined && item.width > 0 && item.height > 0) {
    return item.width / item.height;
  }

  return 1;
};

const normalizePositiveNumber = (value: number): number => Math.max(1, value);
