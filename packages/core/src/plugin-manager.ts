export type PluginLifecyclePhase = "init" | "load" | "render" | "preview" | "destroy";

export interface PluginLifecycleEvent<TContext> {
  readonly name: string;
  readonly phase: PluginLifecyclePhase | "install" | "uninstall";
  readonly plugin: ManagedPlugin<TContext>;
  readonly context: TContext;
  readonly payload: unknown;
}

export type PluginLifecycleHandler<TContext> = (event: PluginLifecycleEvent<TContext>) => void;

export interface ManagedPlugin<TContext> {
  readonly name: string;
  install?(context: TContext): void;
  destroy?(context: TContext): void;
  onInit?(context: TContext, payload: unknown): void;
  onLoad?(context: TContext, payload: unknown): void;
  onRender?(context: TContext, payload: unknown): void;
  onPreview?(context: TContext, payload: unknown): void;
  onDestroy?(context: TContext, payload: unknown): void;
}

export interface PluginManagerOptions<TContext> {
  readonly context: TContext;
  readonly onInstall?: PluginLifecycleHandler<TContext>;
  readonly onUninstall?: PluginLifecycleHandler<TContext>;
  readonly onLifecycle?: PluginLifecycleHandler<TContext>;
}

export interface PluginSnapshot<TContext> {
  readonly name: string;
  readonly plugin: ManagedPlugin<TContext>;
}

/**
 * Registers plugins, dispatches plugin lifecycle hooks, and handles unload order.
 */
export class PluginManager<TContext> {
  private readonly context: TContext;
  private readonly onInstall: PluginLifecycleHandler<TContext> | undefined;
  private readonly onUninstall: PluginLifecycleHandler<TContext> | undefined;
  private readonly onLifecycle: PluginLifecycleHandler<TContext> | undefined;
  private readonly plugins = new Map<string, ManagedPlugin<TContext>>();

  public constructor(options: PluginManagerOptions<TContext>) {
    this.context = options.context;
    this.onInstall = options.onInstall;
    this.onUninstall = options.onUninstall;
    this.onLifecycle = options.onLifecycle;
  }

  /**
   * Install a plugin once by name.
   */
  public install<TPlugin extends ManagedPlugin<TContext>>(plugin: TPlugin): TPlugin {
    this.assertValidName(plugin.name);

    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already installed.`);
    }

    plugin.install?.(this.context);
    this.plugins.set(plugin.name, plugin);
    this.onInstall?.(this.createEvent(plugin, "install"));

    return plugin;
  }

  /**
   * Uninstall a plugin by name.
   */
  public uninstall(name: string): boolean {
    const plugin = this.plugins.get(name);

    if (!plugin) {
      return false;
    }

    this.runDestroy(plugin, undefined);
    this.plugins.delete(name);
    this.onUninstall?.(this.createEvent(plugin, "uninstall"));

    return true;
  }

  /**
   * Dispatch a lifecycle phase to installed plugins in registration order.
   */
  public dispatch(phase: PluginLifecyclePhase, payload?: unknown): void {
    for (const plugin of this.plugins.values()) {
      this.dispatchToPlugin(plugin, phase, payload);
    }
  }

  /**
   * Return whether a plugin is installed.
   */
  public has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Return an installed plugin by name.
   */
  public get(name: string): ManagedPlugin<TContext> | undefined {
    return this.plugins.get(name);
  }

  /**
   * Return installed plugin names in registration order.
   */
  public getNames(): readonly string[] {
    return [...this.plugins.keys()];
  }

  /**
   * Return installed plugin snapshots in registration order.
   */
  public getPlugins(): readonly PluginSnapshot<TContext>[] {
    return [...this.plugins.entries()].map(([name, plugin]) => ({
      name,
      plugin
    }));
  }

  /**
   * Uninstall all plugins in reverse registration order.
   */
  public clear(): void {
    for (const name of [...this.plugins.keys()].reverse()) {
      this.uninstall(name);
    }
  }

  private dispatchToPlugin(
    plugin: ManagedPlugin<TContext>,
    phase: PluginLifecyclePhase,
    payload: unknown
  ): void {
    if (phase === "destroy") {
      this.runDestroy(plugin, payload);
      this.onLifecycle?.(this.createEvent(plugin, phase, payload));
      return;
    }

    dispatchLifecycleHook(plugin, phase, this.context, payload);
    this.onLifecycle?.(this.createEvent(plugin, phase, payload));
  }

  private runDestroy(plugin: ManagedPlugin<TContext>, payload: unknown): void {
    plugin.onDestroy?.(this.context, payload);
    plugin.destroy?.(this.context);
  }

  private createEvent(
    plugin: ManagedPlugin<TContext>,
    phase: PluginLifecycleEvent<TContext>["phase"],
    payload?: unknown
  ): PluginLifecycleEvent<TContext> {
    return {
      name: plugin.name,
      phase,
      plugin,
      context: this.context,
      payload
    };
  }

  private assertValidName(name: unknown): void {
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new Error("Plugin name is required.");
    }
  }
}

const dispatchLifecycleHook = <TContext>(
  plugin: ManagedPlugin<TContext>,
  phase: Exclude<PluginLifecyclePhase, "destroy">,
  context: TContext,
  payload: unknown
): void => {
  if (phase === "init") {
    plugin.onInit?.(context, payload);
    return;
  }

  if (phase === "load") {
    plugin.onLoad?.(context, payload);
    return;
  }

  if (phase === "render") {
    plugin.onRender?.(context, payload);
    return;
  }

  plugin.onPreview?.(context, payload);
};
