import type { GalleryConfig, GalleryConfigUpdate, UserGalleryConfig } from "./config-manager";
import { ConfigManager } from "./config-manager";
import type { EventHandler, EventName, EventPayload, Unsubscribe } from "./event-bus";
import { EventBus } from "./event-bus";

export interface GalleryEvents {
  readonly init: {
    readonly config: GalleryConfig;
  };
  readonly mounted: {
    readonly config: GalleryConfig;
    readonly container: HTMLElement | null;
  };
  readonly updated: {
    readonly config: GalleryConfig;
  };
  readonly destroy: undefined;
  readonly "layout:update": {
    readonly config: GalleryConfig;
  };
  readonly "plugin:install": {
    readonly name: string;
  };
  readonly "plugin:destroy": {
    readonly name: string;
  };
}

export interface Plugin {
  readonly name: string;
  install(gallery: Gallery): void;
  destroy?(): void;
}

export type GalleryState = "idle" | "initialized" | "destroyed";

/**
 * Public Gallery coordinator that owns config, events, and plugin registration.
 */
export class Gallery {
  private readonly configManager: ConfigManager;
  private readonly eventBus = new EventBus<GalleryEvents>();
  private readonly plugins = new Map<string, Plugin>();
  private containerElement: HTMLElement | null = null;
  private state: GalleryState = "idle";

  public constructor(userConfig: UserGalleryConfig) {
    this.configManager = new ConfigManager(userConfig);
  }

  /**
   * Initialize the Gallery lifecycle.
   */
  public init(): void {
    this.assertActive();

    if (this.state === "initialized") {
      return;
    }

    const config = this.configManager.getConfig();
    this.containerElement = resolveContainerElement(config.container);
    this.state = "initialized";
    this.eventBus.emit("init", { config });
    this.eventBus.emit("mounted", {
      config,
      container: this.containerElement
    });
  }

  /**
   * Destroy plugins, lifecycle state, and event handlers.
   */
  public destroy(): void {
    if (this.state === "destroyed") {
      return;
    }

    for (const plugin of [...this.plugins.values()].reverse()) {
      plugin.destroy?.();
      this.eventBus.emit("plugin:destroy", {
        name: plugin.name
      });
    }

    this.plugins.clear();
    this.containerElement = null;
    this.state = "destroyed";
    this.eventBus.emit("destroy");
    this.eventBus.clear();
  }

  /**
   * Notify listeners that Gallery layout/render state should refresh.
   */
  public refresh(): void {
    this.assertActive();

    const config = this.configManager.getConfig();
    this.eventBus.emit("layout:update", { config });
    this.eventBus.emit("updated", { config });
  }

  /**
   * Merge a runtime config update and notify listeners.
   */
  public update(updateConfig: GalleryConfigUpdate): GalleryConfig {
    this.assertActive();

    const config = this.configManager.update(updateConfig);
    this.eventBus.emit("updated", { config });

    return config;
  }

  /**
   * Install a plugin once by name.
   */
  public use(plugin: Plugin): this {
    this.assertActive();

    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already installed.`);
    }

    plugin.install(this);
    this.plugins.set(plugin.name, plugin);
    this.eventBus.emit("plugin:install", {
      name: plugin.name
    });

    return this;
  }

  /**
   * Return the current resolved config snapshot.
   */
  public getConfig(): GalleryConfig {
    return this.configManager.getConfig();
  }

  /**
   * Return the current lifecycle state.
   */
  public getState(): GalleryState {
    return this.state;
  }

  /**
   * Listen for a Gallery event.
   */
  public on<TName extends EventName<GalleryEvents>>(
    eventName: TName,
    handler: EventHandler<EventPayload<GalleryEvents, TName>>
  ): Unsubscribe {
    return this.eventBus.on(eventName, handler);
  }

  /**
   * Listen for a Gallery event once.
   */
  public once<TName extends EventName<GalleryEvents>>(
    eventName: TName,
    handler: EventHandler<EventPayload<GalleryEvents, TName>>
  ): Unsubscribe {
    return this.eventBus.once(eventName, handler);
  }

  /**
   * Remove a Gallery event listener.
   */
  public off<TName extends EventName<GalleryEvents>>(
    eventName: TName,
    handler: EventHandler<EventPayload<GalleryEvents, TName>>
  ): void {
    this.eventBus.off(eventName, handler);
  }

  private assertActive(): void {
    if (this.state === "destroyed") {
      throw new Error("Gallery has already been destroyed.");
    }
  }
}

const resolveContainerElement = (container: string | HTMLElement): HTMLElement | null => {
  if (typeof container === "string") {
    if (typeof document === "undefined") {
      return null;
    }

    return document.querySelector<HTMLElement>(container);
  }

  return container;
};
