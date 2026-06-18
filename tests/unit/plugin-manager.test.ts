import { PluginManager } from "@gallery-engine/core";
import type { ManagedPlugin, PluginLifecycleEvent } from "@gallery-engine/core";
import { describe, expect, it, vi } from "vitest";

interface PluginContext {
  readonly id: string;
}

const createContext = (): PluginContext => ({
  id: "gallery"
});

describe("PluginManager", () => {
  it("installs plugins once and emits install events", () => {
    const context = createContext();
    const install = vi.fn<(context: PluginContext) => void>();
    const onInstall = vi.fn<(event: PluginLifecycleEvent<PluginContext>) => void>();
    const plugin: ManagedPlugin<PluginContext> = {
      name: "watermark",
      install
    };
    const pluginManager = new PluginManager({
      context,
      onInstall
    });

    expect(pluginManager.install(plugin)).toBe(plugin);
    expect(install).toHaveBeenCalledWith(context);
    expect(pluginManager.has("watermark")).toBe(true);
    expect(pluginManager.getNames()).toEqual(["watermark"]);
    expect(onInstall).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "watermark",
        phase: "install",
        plugin,
        context
      })
    );
    expect(() => {
      pluginManager.install(plugin);
    }).toThrow('Plugin "watermark" is already installed.');
  });

  it("dispatches lifecycle hooks in registration order", () => {
    const context = createContext();
    const calls: string[] = [];
    const onLifecycle = vi.fn<(event: PluginLifecycleEvent<PluginContext>) => void>();
    const pluginManager = new PluginManager({
      context,
      onLifecycle
    });

    pluginManager.install({
      name: "first",
      onInit: (_context, payload) => {
        calls.push(`first:${String(payload)}`);
      }
    });
    pluginManager.install({
      name: "second",
      onInit: (_context, payload) => {
        calls.push(`second:${String(payload)}`);
      }
    });
    pluginManager.dispatch("init", "ready");

    expect(calls).toEqual(["first:ready", "second:ready"]);
    expect(onLifecycle.mock.calls.map(([event]) => event.name)).toEqual(["first", "second"]);
  });

  it("uninstalls plugins and calls destroy hooks", () => {
    const context = createContext();
    const onDestroy = vi.fn<(context: PluginContext, payload: unknown) => void>();
    const destroy = vi.fn<(context: PluginContext) => void>();
    const onUninstall = vi.fn<(event: PluginLifecycleEvent<PluginContext>) => void>();
    const pluginManager = new PluginManager({
      context,
      onUninstall
    });

    pluginManager.install({
      name: "download",
      onDestroy,
      destroy
    });

    expect(pluginManager.uninstall("download")).toBe(true);
    expect(onDestroy).toHaveBeenCalledWith(context, undefined);
    expect(destroy).toHaveBeenCalledWith(context);
    expect(onUninstall).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "download",
        phase: "uninstall"
      })
    );
    expect(pluginManager.uninstall("download")).toBe(false);
  });

  it("clears plugins in reverse registration order", () => {
    const context = createContext();
    const calls: string[] = [];
    const pluginManager = new PluginManager({
      context
    });

    pluginManager.install({
      name: "first",
      destroy: () => {
        calls.push("first");
      }
    });
    pluginManager.install({
      name: "second",
      destroy: () => {
        calls.push("second");
      }
    });

    pluginManager.clear();

    expect(calls).toEqual(["second", "first"]);
    expect(pluginManager.getNames()).toEqual([]);
  });

  it("returns plugin snapshots", () => {
    const context = createContext();
    const plugin: ManagedPlugin<PluginContext> = {
      name: "preview"
    };
    const pluginManager = new PluginManager({
      context
    });

    pluginManager.install(plugin);

    expect(pluginManager.get("preview")).toBe(plugin);
    expect(pluginManager.getPlugins()).toEqual([
      {
        name: "preview",
        plugin
      }
    ]);
  });

  it("validates plugin names", () => {
    const pluginManager = new PluginManager({
      context: createContext()
    });

    expect(() => {
      pluginManager.install({
        name: " "
      });
    }).toThrow("Plugin name is required.");
  });

  it("enforces plugin shape at compile time", () => {
    const pluginManager = new PluginManager({
      context: createContext()
    });

    // @ts-expect-error Plugins must include a name.
    const invalidPlugin: ManagedPlugin<PluginContext> = {
      install: () => {
        return;
      }
    };

    expect("install" in invalidPlugin).toBe(true);
    expect(pluginManager.getNames()).toEqual([]);
  });
});
