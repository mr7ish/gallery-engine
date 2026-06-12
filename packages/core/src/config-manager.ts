export type LayoutType = "grid" | "masonry" | "justified" | "timeline" | "carousel";

export type AnimationPreset = "fade" | "slide" | "zoom" | "flip" | "scale" | "bounce";

export interface GalleryImage {
  readonly id: string;
  readonly src: string;
  readonly thumbnail?: string;
  readonly alt?: string;
  readonly title?: string;
  readonly description?: string;
  readonly width?: number;
  readonly height?: number;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt?: Date;
  readonly tags?: readonly string[];
  readonly category?: string;
  readonly color?: string;
}

export interface GridLayoutConfig {
  readonly columns: number;
  readonly gap: number;
}

export interface MasonryLayoutConfig {
  readonly columns: number;
  readonly gap: number;
  readonly minColumnWidth: number;
}

export interface JustifiedLayoutConfig {
  readonly rowHeight: number;
  readonly gap: number;
}

export interface TimelineLayoutConfig {
  readonly groupBy: string;
}

export interface LayoutConfig {
  readonly type: LayoutType;
  readonly grid: GridLayoutConfig;
  readonly masonry: MasonryLayoutConfig;
  readonly justified: JustifiedLayoutConfig;
  readonly timeline: TimelineLayoutConfig;
}

export interface VirtualScrollConfig {
  readonly enabled: boolean;
  readonly overscan: number;
  readonly recycle: boolean;
}

export interface LazyLoadConfig {
  readonly enabled: boolean;
  readonly rootMargin: string;
  readonly threshold: number;
}

export interface PreloadConfig {
  readonly enabled: boolean;
  readonly distance: number;
  readonly maxConcurrent: number;
}

export interface PreviewConfig {
  readonly enabled: boolean;
  readonly fullscreen: boolean;
  readonly zoom: boolean;
  readonly drag: boolean;
  readonly keyboard: boolean;
  readonly gesture: boolean;
}

export interface AnimationConfig {
  readonly enabled: boolean;
  readonly enter: AnimationPreset;
  readonly leave: AnimationPreset;
  readonly preview: AnimationPreset;
  readonly stagger: number;
}

export interface CacheConfig {
  readonly enabled: boolean;
  readonly maxSize: number;
  readonly ttl: number;
}

export interface ThemeConfig {
  readonly mode: "light" | "dark" | "auto";
  readonly primaryColor: string;
}

export interface GalleryConfig {
  readonly container: string | HTMLElement;
  readonly images: readonly GalleryImage[];
  readonly layout: LayoutConfig;
  readonly virtual: VirtualScrollConfig;
  readonly preview: PreviewConfig;
  readonly animation: AnimationConfig;
  readonly lazyLoad: LazyLoadConfig;
  readonly preload: PreloadConfig;
  readonly cache: CacheConfig;
  readonly theme: ThemeConfig;
}

export type UserGalleryConfig = DeepPartial<GalleryConfig> &
  Pick<GalleryConfig, "container" | "images">;

export type GalleryConfigUpdate = DeepPartial<GalleryConfig>;

export type DeepPartial<TValue> = TValue extends Date | HTMLElement
  ? TValue
  : TValue extends readonly (infer TItem)[]
    ? readonly TItem[]
    : TValue extends object
      ? {
          readonly [TKey in keyof TValue]?: DeepPartial<TValue[TKey]>;
        }
      : TValue;

const DEFAULT_CONTAINER = "#gallery";

export const DEFAULT_GALLERY_CONFIG: GalleryConfig = {
  container: DEFAULT_CONTAINER,
  images: [],
  layout: {
    type: "grid",
    grid: {
      columns: 4,
      gap: 12
    },
    masonry: {
      columns: 4,
      gap: 12,
      minColumnWidth: 240
    },
    justified: {
      rowHeight: 240,
      gap: 12
    },
    timeline: {
      groupBy: "createdAt"
    }
  },
  virtual: {
    enabled: false,
    overscan: 10,
    recycle: true
  },
  preview: {
    enabled: true,
    fullscreen: true,
    zoom: true,
    drag: true,
    keyboard: true,
    gesture: true
  },
  animation: {
    enabled: true,
    enter: "fade",
    leave: "fade",
    preview: "zoom",
    stagger: 0.05
  },
  lazyLoad: {
    enabled: true,
    rootMargin: "200px",
    threshold: 0
  },
  preload: {
    enabled: true,
    distance: 20,
    maxConcurrent: 4
  },
  cache: {
    enabled: true,
    maxSize: 100,
    ttl: 300_000
  },
  theme: {
    mode: "auto",
    primaryColor: "#2563eb"
  }
};

/**
 * Owns default, user, and runtime Gallery configuration merging.
 */
export class ConfigManager {
  private config: GalleryConfig;

  public constructor(userConfig: UserGalleryConfig) {
    this.config = mergeConfig<GalleryConfig>(DEFAULT_GALLERY_CONFIG, userConfig);
  }

  /**
   * Return the current resolved config snapshot.
   */
  public getConfig(): GalleryConfig {
    return cloneConfig(this.config);
  }

  /**
   * Return the default config snapshot.
   */
  public getDefaultConfig(): GalleryConfig {
    return cloneConfig(DEFAULT_GALLERY_CONFIG);
  }

  /**
   * Merge a runtime config update into the current config.
   */
  public update(updateConfig: GalleryConfigUpdate): GalleryConfig {
    this.config = mergeConfig<GalleryConfig>(this.config, updateConfig);
    return this.getConfig();
  }
}

export const mergeConfig = <TConfig extends object>(
  baseConfig: TConfig,
  overrideConfig: DeepPartial<TConfig>
): TConfig => deepMerge(baseConfig, overrideConfig);

const cloneConfig = <TConfig extends object>(config: TConfig): TConfig => cloneValue(config);

const deepMerge = <TValue>(
  baseValue: TValue,
  overrideValue: DeepPartial<TValue> | undefined
): TValue => {
  if (overrideValue === undefined) {
    return cloneValue(baseValue);
  }

  if (!isPlainObject(baseValue) || !isPlainObject(overrideValue)) {
    return cloneValue(overrideValue as TValue);
  }

  const mergedEntries: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(baseValue), ...Object.keys(overrideValue)]);

  for (const key of keys) {
    const baseRecord = baseValue as Record<string, unknown>;
    const overrideRecord = overrideValue as Record<string, unknown>;
    mergedEntries[key] = deepMerge(baseRecord[key], overrideRecord[key]);
  }

  return mergedEntries as TValue;
};

const cloneValue = <TValue>(value: TValue): TValue => {
  if (Array.isArray(value)) {
    return [...value] as TValue;
  }

  if (isPlainObject(value)) {
    const clonedEntries: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      clonedEntries[key] = cloneValue(nestedValue);
    }

    return clonedEntries as TValue;
  }

  return value;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return Object.getPrototypeOf(value) === Object.prototype;
};
