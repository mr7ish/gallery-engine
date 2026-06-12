import { ConfigManager, DEFAULT_GALLERY_CONFIG, mergeConfig } from "@gallery-engine/core";
import { describe, expect, it } from "vitest";

describe("ConfigManager", () => {
  it("merges required user config with defaults", () => {
    const configManager = new ConfigManager({
      container: "#photos",
      images: [
        {
          id: "hero",
          src: "/hero.jpg"
        }
      ]
    });

    const config = configManager.getConfig();

    expect(config.container).toBe("#photos");
    expect(config.images).toEqual([
      {
        id: "hero",
        src: "/hero.jpg"
      }
    ]);
    expect(config.lazyLoad).toEqual(DEFAULT_GALLERY_CONFIG.lazyLoad);
    expect(config.layout.grid.columns).toBe(4);
  });

  it("deep merges nested config without replacing sibling defaults", () => {
    const configManager = new ConfigManager({
      container: "#photos",
      images: [],
      layout: {
        grid: {
          columns: 6
        }
      },
      theme: {
        mode: "dark"
      }
    });

    const config = configManager.getConfig();

    expect(config.layout.grid.columns).toBe(6);
    expect(config.layout.grid.gap).toBe(DEFAULT_GALLERY_CONFIG.layout.grid.gap);
    expect(config.layout.masonry).toEqual(DEFAULT_GALLERY_CONFIG.layout.masonry);
    expect(config.theme.mode).toBe("dark");
    expect(config.theme.primaryColor).toBe(DEFAULT_GALLERY_CONFIG.theme.primaryColor);
  });

  it("updates runtime config by merging into the current config", () => {
    const configManager = new ConfigManager({
      container: "#photos",
      images: [],
      preview: {
        enabled: false
      }
    });

    const updatedConfig = configManager.update({
      preview: {
        keyboard: false
      },
      preload: {
        maxConcurrent: 8
      }
    });

    expect(updatedConfig.preview.enabled).toBe(false);
    expect(updatedConfig.preview.keyboard).toBe(false);
    expect(updatedConfig.preview.zoom).toBe(DEFAULT_GALLERY_CONFIG.preview.zoom);
    expect(updatedConfig.preload.maxConcurrent).toBe(8);
  });

  it("replaces arrays instead of deep merging them by index", () => {
    const configManager = new ConfigManager({
      container: "#photos",
      images: [
        {
          id: "first",
          src: "/first.jpg"
        }
      ]
    });

    const updatedConfig = configManager.update({
      images: [
        {
          id: "second",
          src: "/second.jpg"
        }
      ]
    });

    expect(updatedConfig.images).toEqual([
      {
        id: "second",
        src: "/second.jpg"
      }
    ]);
  });

  it("returns config snapshots that cannot mutate internal state", () => {
    const configManager = new ConfigManager({
      container: "#photos",
      images: []
    });
    const firstSnapshot = configManager.getConfig();
    const mutableSnapshot = firstSnapshot as {
      layout: {
        grid: {
          columns: number;
        };
      };
    };

    mutableSnapshot.layout.grid.columns = 99;

    expect(configManager.getConfig().layout.grid.columns).toBe(
      DEFAULT_GALLERY_CONFIG.layout.grid.columns
    );
  });

  it("merges plain config objects independently of ConfigManager", () => {
    const mergedConfig = mergeConfig(
      {
        layout: {
          columns: 4,
          gap: 12
        }
      },
      {
        layout: {
          gap: 16
        }
      }
    );

    expect(mergedConfig).toEqual({
      layout: {
        columns: 4,
        gap: 16
      }
    });
  });

  it("requires container and images in user config at compile time", () => {
    new ConfigManager({
      container: "#photos",
      images: []
    });

    // @ts-expect-error User config must include a container.
    new ConfigManager({
      images: []
    });

    // @ts-expect-error User config must include an image list.
    new ConfigManager({
      container: "#photos"
    });
  });
});
