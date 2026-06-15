export interface LayoutInputItem {
  readonly id: string;
  readonly width?: number;
  readonly height?: number;
}

export interface LayoutItem {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface LayoutResult {
  readonly width: number;
  readonly height: number;
  readonly items: readonly LayoutItem[];
}

export interface LayoutCalculationContext {
  readonly containerWidth: number;
}

export interface Layout<TItem extends LayoutInputItem = LayoutInputItem> {
  readonly name: string;
  calculate(items: readonly TItem[], context: LayoutCalculationContext): LayoutResult;
}

/**
 * Stores available layouts by name for runtime lookup.
 */
export class LayoutRegistry {
  private readonly layouts = new Map<string, Layout>();

  /**
   * Register a layout by its unique name.
   */
  public registerLayout(layout: Layout): void {
    if (this.layouts.has(layout.name)) {
      throw new Error(`Layout "${layout.name}" is already registered.`);
    }

    this.layouts.set(layout.name, layout);
  }

  /**
   * Return a registered layout by name.
   */
  public getLayout(name: string): Layout | undefined {
    return this.layouts.get(name);
  }

  /**
   * Return whether a layout name is registered.
   */
  public hasLayout(name: string): boolean {
    return this.layouts.has(name);
  }

  /**
   * Return registered layout names in insertion order.
   */
  public listLayouts(): readonly string[] {
    return [...this.layouts.keys()];
  }
}
