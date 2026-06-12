/**
 * @vitest-environment jsdom
 */

import { Renderer } from "@gallery-engine/core";
import type { RenderItem } from "@gallery-engine/core";
import { afterEach, describe, expect, it } from "vitest";

const createItem = (id: string, x: number, y: number): RenderItem => ({
  id,
  image: {
    id,
    src: `/${id}.jpg`,
    thumbnail: `/${id}-thumb.jpg`,
    alt: `${id} alt`,
    title: `${id} title`
  },
  x,
  y,
  width: 120,
  height: 90
});

const getChild = (container: HTMLElement, index: number): HTMLElement => {
  const child = container.children.item(index);

  if (!(child instanceof HTMLElement)) {
    throw new Error(`Expected child at index ${String(index)}.`);
  }

  return child;
};

const getImage = (element: HTMLElement): HTMLImageElement => {
  const imageElement = element.querySelector("img");

  if (!(imageElement instanceof HTMLImageElement)) {
    throw new Error("Expected rendered image element.");
  }

  return imageElement;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("Renderer", () => {
  it("creates DOM nodes for render items", () => {
    const container = document.createElement("div");
    const renderer = new Renderer({ container });

    renderer.render([createItem("hero", 10, 20)]);

    const element = getChild(container, 0);
    const imageElement = getImage(element);

    expect(container.children).toHaveLength(1);
    expect(element.className).toBe("gallery-engine__item");
    expect(element.dataset.galleryItemId).toBe("hero");
    expect(element.style.transform).toBe("translate3d(10px, 20px, 0)");
    expect(element.style.width).toBe("120px");
    expect(element.style.height).toBe("90px");
    expect(imageElement.className).toBe("gallery-engine__image");
    expect(imageElement.getAttribute("src")).toBe("/hero-thumb.jpg");
    expect(imageElement.alt).toBe("hero alt");
    expect(imageElement.title).toBe("hero title");
    expect(imageElement.loading).toBe("lazy");
  });

  it("updates an existing node for the same item id", () => {
    const container = document.createElement("div");
    const renderer = new Renderer({ container });

    renderer.render([createItem("hero", 0, 0)]);
    const element = getChild(container, 0);

    renderer.render([
      {
        ...createItem("hero", 32, 48),
        image: {
          id: "hero",
          src: "/hero-large.jpg",
          alt: "updated alt"
        },
        width: 240,
        height: 180
      }
    ]);

    const updatedElement = getChild(container, 0);
    const imageElement = getImage(updatedElement);

    expect(updatedElement).toBe(element);
    expect(updatedElement.style.transform).toBe("translate3d(32px, 48px, 0)");
    expect(updatedElement.style.width).toBe("240px");
    expect(updatedElement.style.height).toBe("180px");
    expect(imageElement.getAttribute("src")).toBe("/hero-large.jpg");
    expect(imageElement.alt).toBe("updated alt");
    expect(imageElement.hasAttribute("title")).toBe(false);
    expect(renderer.getPoolSize()).toBe(0);
  });

  it("keeps DOM order aligned with render item order", () => {
    const container = document.createElement("div");
    const renderer = new Renderer({ container });

    renderer.render([createItem("first", 0, 0), createItem("second", 120, 0)]);
    renderer.render([createItem("second", 120, 0), createItem("first", 0, 0)]);

    expect(getChild(container, 0).dataset.galleryItemId).toBe("second");
    expect(getChild(container, 1).dataset.galleryItemId).toBe("first");
  });

  it("recycles removed nodes for future items", () => {
    const container = document.createElement("div");
    const renderer = new Renderer({ container });

    renderer.render([createItem("first", 0, 0), createItem("second", 120, 0)]);
    const firstElement = getChild(container, 0);
    const secondElement = getChild(container, 1);

    renderer.render([createItem("third", 240, 0)]);

    const reusedElement = getChild(container, 0);

    expect([firstElement, secondElement]).toContain(reusedElement);
    expect(reusedElement.dataset.galleryItemId).toBe("third");
    expect(renderer.getRenderedNode("first")).toBeUndefined();
    expect(renderer.getRenderedNode("second")).toBeUndefined();
    expect(renderer.getRenderedNode("third")?.element).toBe(reusedElement);
    expect(renderer.getPoolSize()).toBe(1);
  });

  it("clears rendered nodes into the pool and destroys all DOM state", () => {
    const container = document.createElement("div");
    const renderer = new Renderer({ container });

    renderer.render([createItem("first", 0, 0), createItem("second", 120, 0)]);
    renderer.clear();

    expect(container.children).toHaveLength(0);
    expect(renderer.getPoolSize()).toBe(2);

    renderer.destroy();

    expect(container.children).toHaveLength(0);
    expect(renderer.getPoolSize()).toBe(0);
  });

  it("supports custom class names", () => {
    const container = document.createElement("div");
    const renderer = new Renderer({
      container,
      itemClassName: "custom-item",
      imageClassName: "custom-image"
    });

    renderer.render([createItem("hero", 0, 0)]);

    const element = getChild(container, 0);
    const imageElement = getImage(element);

    expect(element.className).toBe("custom-item");
    expect(imageElement.className).toBe("custom-image");
  });

  it("enforces render item shape at compile time", () => {
    // @ts-expect-error Render items must include an image.
    const invalidItem: RenderItem = {
      id: "missing-image",
      x: 0,
      y: 0,
      width: 120,
      height: 90
    };

    expect(invalidItem.id).toBe("missing-image");
  });
});
