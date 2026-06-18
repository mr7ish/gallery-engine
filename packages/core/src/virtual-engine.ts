export interface VirtualItem {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface VirtualViewport {
  readonly scrollTop: number;
  readonly height: number;
}

export interface VirtualRange {
  readonly start: number;
  readonly end: number;
}

export interface VirtualEngineOptions {
  readonly overscan?: number;
}

export interface VirtualResult<TItem extends VirtualItem = VirtualItem> {
  readonly range: VirtualRange;
  readonly visibleItems: readonly TItem[];
  readonly retainedIds: readonly string[];
  readonly recycledIds: readonly string[];
}

const DEFAULT_OVERSCAN = 0;
const EMPTY_RANGE: VirtualRange = {
  start: 0,
  end: -1
};

/**
 * Calculates virtualized visible ranges for already laid out items.
 */
export class VirtualEngine<TItem extends VirtualItem = VirtualItem> {
  private items: readonly TItem[] = [];
  private retainedIds = new Set<string>();
  private readonly overscan: number;

  public constructor(options: VirtualEngineOptions = {}) {
    this.overscan = Math.max(0, options.overscan ?? DEFAULT_OVERSCAN);
  }

  /**
   * Replace the full layout item list.
   */
  public setItems(items: readonly TItem[]): void {
    this.items = items;
    this.retainedIds = intersectIds(this.retainedIds, new Set(items.map((item) => item.id)));
  }

  /**
   * Return all known layout items.
   */
  public getItems(): readonly TItem[] {
    return this.items;
  }

  /**
   * Calculate the visible item range for a viewport.
   */
  public calculate(viewport: VirtualViewport): VirtualResult<TItem> {
    const normalizedViewport = normalizeViewport(viewport, this.overscan);
    const visibleEntries = this.items
      .map((item, index) => ({
        item,
        index
      }))
      .filter(({ item }) => intersectsViewport(item, normalizedViewport));

    const visibleItems = visibleEntries.map(({ item }) => item);
    const nextRetainedIds = new Set(visibleItems.map((item) => item.id));
    const recycledIds = [...this.retainedIds].filter((id) => !nextRetainedIds.has(id));
    this.retainedIds = nextRetainedIds;

    return {
      range: resolveRange(visibleEntries),
      visibleItems,
      retainedIds: [...nextRetainedIds],
      recycledIds
    };
  }

  /**
   * Clear retained state without changing the full item list.
   */
  public reset(): void {
    this.retainedIds.clear();
  }
}

interface NormalizedViewport {
  readonly top: number;
  readonly bottom: number;
}

const normalizeViewport = (viewport: VirtualViewport, overscan: number): NormalizedViewport => {
  const viewportTop = Math.max(0, viewport.scrollTop);
  const viewportHeight = Math.max(0, viewport.height);

  return {
    top: Math.max(0, viewportTop - overscan),
    bottom: viewportTop + viewportHeight + overscan
  };
};

const intersectsViewport = (item: VirtualItem, viewport: NormalizedViewport): boolean => {
  const itemTop = item.y;
  const itemBottom = item.y + item.height;

  return itemBottom >= viewport.top && itemTop <= viewport.bottom;
};

const resolveRange = (entries: readonly { readonly index: number }[]): VirtualRange => {
  if (entries.length === 0) {
    return EMPTY_RANGE;
  }

  return {
    start: entries[0]?.index ?? 0,
    end: entries[entries.length - 1]?.index ?? 0
  };
};

const intersectIds = (
  previousIds: ReadonlySet<string>,
  nextIds: ReadonlySet<string>
): Set<string> => new Set([...previousIds].filter((id) => nextIds.has(id)));
