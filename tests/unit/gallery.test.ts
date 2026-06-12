import { Gallery } from "@gallery-engine/core";
import type { Plugin } from "@gallery-engine/core";
import { describe, expect, it, vi } from "vitest";

const createGallery = (): Gallery =>
  new Gallery({
    container: "#gallery",
    images: []
  });

describe("Gallery", () => {
  it("initializes once and emits init and mounted events", () => {
    const gallery = createGallery();
    const initHandler = vi.fn();
    const mountedHandler = vi.fn();

    gallery.on("init", initHandler);
    gallery.on("mounted", mountedHandler);

    gallery.init();
    gallery.init();

    expect(gallery.getState()).toBe("initialized");
    expect(initHandler).toHaveBeenCalledOnce();
    expect(mountedHandler).toHaveBeenCalledOnce();
    expect(mountedHandler).toHaveBeenCalledWith({
      config: gallery.getConfig(),
      container: null
    });
  });

  it("updates config and emits updated events", () => {
    const gallery = createGallery();
    const updatedHandler = vi.fn();

    gallery.on("updated", updatedHandler);
    const updatedConfig = gallery.update({
      lazyLoad: {
        rootMargin: "320px"
      }
    });

    expect(updatedConfig.lazyLoad.rootMargin).toBe("320px");
    expect(updatedHandler).toHaveBeenCalledWith({
      config: updatedConfig
    });
  });

  it("refreshes through layout:update before updated", () => {
    const gallery = createGallery();
    const calls: string[] = [];

    gallery.on("layout:update", () => {
      calls.push("layout:update");
    });
    gallery.on("updated", () => {
      calls.push("updated");
    });

    gallery.refresh();

    expect(calls).toEqual(["layout:update", "updated"]);
  });

  it("installs plugins once and emits plugin install events", () => {
    const gallery = createGallery();
    const install = vi.fn();
    const installEventHandler = vi.fn();
    const plugin: Plugin = {
      name: "watermark",
      install
    };

    gallery.on("plugin:install", installEventHandler);
    const returnedGallery = gallery.use(plugin);

    expect(returnedGallery).toBe(gallery);
    expect(install).toHaveBeenCalledWith(gallery);
    expect(installEventHandler).toHaveBeenCalledWith({
      name: "watermark"
    });
    expect(() => gallery.use(plugin)).toThrow('Plugin "watermark" is already installed.');
  });

  it("destroys installed plugins in reverse order and clears listeners", () => {
    const gallery = createGallery();
    const calls: string[] = [];
    const destroyHandler = vi.fn();

    const firstPlugin: Plugin = {
      name: "first",
      install: () => undefined,
      destroy: () => {
        calls.push("first");
      }
    };
    const secondPlugin: Plugin = {
      name: "second",
      install: () => undefined,
      destroy: () => {
        calls.push("second");
      }
    };

    gallery.on("destroy", destroyHandler);
    gallery.use(firstPlugin);
    gallery.use(secondPlugin);
    gallery.destroy();
    gallery.destroy();

    expect(gallery.getState()).toBe("destroyed");
    expect(calls).toEqual(["second", "first"]);
    expect(destroyHandler).toHaveBeenCalledOnce();
    expect(() => {
      gallery.refresh();
    }).toThrow("Gallery has already been destroyed.");
  });

  it("supports once and off through the Gallery event API", () => {
    const gallery = createGallery();
    const onceHandler = vi.fn();
    const offHandler = vi.fn();

    gallery.once("updated", onceHandler);
    gallery.on("updated", offHandler);
    gallery.off("updated", offHandler);

    gallery.update({
      theme: {
        mode: "dark"
      }
    });
    gallery.update({
      theme: {
        mode: "light"
      }
    });

    expect(onceHandler).toHaveBeenCalledOnce();
    expect(offHandler).not.toHaveBeenCalled();
  });

  it("enforces event and plugin types at compile time", () => {
    const gallery = createGallery();

    gallery.on("updated", (payload) => {
      const mode = payload.config.theme.mode;
      expect(["auto", "dark", "light"]).toContain(mode);
    });

    // @ts-expect-error Event names must be part of GalleryEvents.
    gallery.on("imageClick", () => {
      return;
    });

    // @ts-expect-error Plugins must include a name.
    gallery.use({
      install: () => {
        return;
      }
    });
  });
});
