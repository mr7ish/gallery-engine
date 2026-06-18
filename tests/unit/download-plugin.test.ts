// @vitest-environment jsdom

import { DownloadPlugin } from "@gallery-engine/plugins";
import type { DownloadGalleryContext, DownloadableImage } from "@gallery-engine/plugins";
import { afterEach, describe, expect, it, vi } from "vitest";

const createImages = (): readonly DownloadableImage[] => [
  {
    id: "hero",
    src: "https://cdn.example.test/gallery/hero.photo.jpg?size=large",
    title: "Hero Photo",
    alt: "Landing hero",
    category: "featured"
  },
  {
    id: "detail",
    src: "/images/detail.png",
    alt: "Detail View"
  }
];

const createContext = (images = createImages()): DownloadGalleryContext => ({
  getConfig: () => ({
    images
  })
});

const getFirstImage = (): DownloadableImage => {
  const image = createImages()[0];

  if (!image) {
    throw new Error("Expected a fixture image.");
  }

  return image;
};

describe("DownloadPlugin", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("triggers a single image download with the default formatted filename", () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      return;
    });
    const image = getFirstImage();
    const plugin = new DownloadPlugin();

    plugin.install(createContext());

    const result = plugin.download(image);
    const anchorElement = document.querySelector("a");

    expect(result.filename).toBe("Hero Photo.jpg");
    expect(result.href).toBe(image.src);
    expect(result.index).toBe(0);
    expect(click).toHaveBeenCalledOnce();
    expect(anchorElement).toBeNull();
  });

  it("downloads an image by id from gallery config", () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      return;
    });
    const plugin = new DownloadPlugin();

    plugin.install(createContext());

    const result = plugin.download("detail");

    expect(result.image.id).toBe("detail");
    expect(result.filename).toBe("Detail View.png");
    expect(click).toHaveBeenCalledOnce();
  });

  it("triggers batch downloads for gallery images", () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      return;
    });
    const plugin = new DownloadPlugin({
      filenameTemplate: "gallery-{index}-{id}.{extension}"
    });

    plugin.install(createContext());

    const results = plugin.downloadMany();

    expect(results.map((result) => result.filename)).toEqual([
      "gallery-1-hero.jpg",
      "gallery-2-detail.png"
    ]);
    expect(results.map((result) => result.index)).toEqual([0, 1]);
    expect(click).toHaveBeenCalledTimes(2);
  });

  it("uses a filename formatter before templates", () => {
    const plugin = new DownloadPlugin({
      filenameTemplate: "ignored-{id}.{extension}",
      filenameFormatter: ({ image, index, extension }) =>
        `${(index + 1).toString()}-${image.category ?? "uncategorized"}-${image.id}.${extension}`
    });
    const image = getFirstImage();

    expect(plugin.formatFilename(image, 2)).toBe("3-featured-hero.jpg");
  });

  it("sanitizes invalid filename characters", () => {
    const plugin = new DownloadPlugin({
      filenameTemplate: "{title}-{id}.{extension}"
    });

    expect(
      plugin.formatFilename(
        {
          id: "one/two",
          src: "/image.webp",
          title: "A: B?"
        },
        0
      )
    ).toBe("A- B--one-two.webp");
  });

  it("throws when an image id is missing", () => {
    const plugin = new DownloadPlugin();

    plugin.install(createContext());

    expect(() => {
      plugin.download("missing");
    }).toThrow('DownloadPlugin image "missing" was not found.');
  });

  it("clears gallery context on destroy", () => {
    const plugin = new DownloadPlugin();

    plugin.install(createContext());
    plugin.destroy();

    expect(plugin.downloadMany()).toEqual([]);
  });

  it("enforces image shape at compile time", () => {
    // @ts-expect-error Downloadable images require a src.
    const invalidImage: DownloadableImage = {
      id: "missing-src"
    };

    expect(invalidImage.id).toBe("missing-src");
  });
});
