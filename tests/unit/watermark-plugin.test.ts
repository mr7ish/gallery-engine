// @vitest-environment jsdom

import { WatermarkPlugin } from "@gallery-engine/plugins";
import type { WatermarkContent, WatermarkGalleryContext } from "@gallery-engine/plugins";
import { afterEach, describe, expect, it } from "vitest";

const createGalleryElement = (): HTMLElement => {
  document.body.innerHTML = '<main id="gallery"></main>';
  const element = document.querySelector<HTMLElement>("#gallery");

  if (!element) {
    throw new Error("Expected test gallery element.");
  }

  return element;
};

describe("WatermarkPlugin", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders a text watermark into a selector container", () => {
    const hostElement = createGalleryElement();

    const plugin = new WatermarkPlugin({
      text: "Private",
      position: "top-left",
      offset: {
        x: 12,
        y: 8
      },
      className: "custom-watermark",
      opacity: 0.5
    });

    plugin.install({
      getConfig: () => ({
        container: "#gallery"
      })
    });

    const element = plugin.getElement();

    expect(element).toBeInstanceOf(HTMLElement);
    expect(element?.textContent).toBe("Private");
    expect(element?.classList.contains("gallery-engine-watermark")).toBe(true);
    expect(element?.classList.contains("custom-watermark")).toBe(true);
    expect(element?.style.top).toBe("8px");
    expect(element?.style.left).toBe("12px");
    expect(element?.style.opacity).toBe("0.5");
    expect(hostElement.style.position).toBe("relative");
  });

  it("renders an image watermark with configured dimensions", () => {
    const hostElement = createGalleryElement();
    const plugin = new WatermarkPlugin({
      container: hostElement,
      image: {
        src: "/watermark.png",
        alt: "Brand mark",
        width: 96,
        height: "32px"
      },
      position: "bottom-right"
    });

    plugin.install();

    const imageElement = plugin.getElement()?.querySelector("img");

    expect(imageElement?.getAttribute("src")).toBe("/watermark.png");
    expect(imageElement?.alt).toBe("Brand mark");
    expect(imageElement?.style.width).toBe("96px");
    expect(imageElement?.style.height).toBe("32px");
    expect(plugin.getElement()?.style.bottom).toBe("16px");
    expect(plugin.getElement()?.style.right).toBe("16px");
  });

  it("supports center position offsets", () => {
    const hostElement = createGalleryElement();
    const plugin = new WatermarkPlugin({
      container: hostElement,
      content: {
        type: "text",
        value: "Center"
      },
      position: "center",
      offset: {
        x: 4,
        y: -6
      }
    });

    plugin.install();

    const element = plugin.getElement();

    expect(element?.style.top).toBe("50%");
    expect(element?.style.left).toBe("50%");
    expect(element?.style.marginLeft).toBe("4px");
    expect(element?.style.marginTop).toBe("-6px");
    expect(element?.style.transform).toBe("translate(-50%, -50%)");
  });

  it("updates mounted content without reinstalling the plugin", () => {
    const hostElement = createGalleryElement();
    const plugin = new WatermarkPlugin({
      container: hostElement,
      text: "Draft"
    });

    plugin.install();
    const firstElement = plugin.getElement();
    const updatedElement = plugin.update({
      content: {
        type: "text",
        value: "Approved"
      },
      position: "top-center",
      offset: {
        x: 2
      }
    });

    expect(firstElement?.isConnected).toBe(false);
    expect(updatedElement?.textContent).toBe("Approved");
    expect(updatedElement?.style.top).toBe("16px");
    expect(updatedElement?.style.left).toBe("50%");
    expect(updatedElement?.style.marginLeft).toBe("2px");
    expect(updatedElement?.style.transform).toBe("translateX(-50%)");
  });

  it("removes the watermark and restores host position on destroy", () => {
    const hostElement = createGalleryElement();
    const plugin = new WatermarkPlugin({
      container: hostElement,
      text: "Temporary"
    });

    plugin.install();
    const element = plugin.getElement();

    plugin.destroy();

    expect(element?.isConnected).toBe(false);
    expect(hostElement.style.position).toBe("");
    expect(plugin.getElement()).toBeUndefined();
  });

  it("uses gallery context container fields directly", () => {
    const hostElement = createGalleryElement();
    const context: WatermarkGalleryContext = {
      container: hostElement
    };
    const plugin = new WatermarkPlugin({
      text: "Context"
    });

    plugin.install(context);

    expect(plugin.getElement()?.textContent).toBe("Context");
  });

  it("enforces image watermark content shape at compile time", () => {
    // @ts-expect-error Image watermark content requires a src.
    const invalidContent: WatermarkContent = {
      type: "image"
    };

    expect(invalidContent.type).toBe("image");
  });
});
