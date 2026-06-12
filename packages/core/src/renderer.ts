import type { GalleryImage } from "./config-manager";

export interface RenderItem {
  readonly id: string;
  readonly image: GalleryImage;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface RendererOptions {
  readonly container: HTMLElement;
  readonly itemClassName?: string;
  readonly imageClassName?: string;
}

export interface RenderedNode {
  readonly id: string;
  readonly element: HTMLElement;
  readonly imageElement: HTMLImageElement;
}

const DEFAULT_ITEM_CLASS_NAME = "gallery-engine__item";
const DEFAULT_IMAGE_CLASS_NAME = "gallery-engine__image";

/**
 * Creates, updates, recycles, and destroys Gallery DOM nodes.
 */
export class Renderer {
  private readonly container: HTMLElement;
  private readonly itemClassName: string;
  private readonly imageClassName: string;
  private readonly renderedNodes = new Map<string, RenderedNode>();
  private readonly nodePool: HTMLElement[] = [];

  public constructor(options: RendererOptions) {
    this.container = options.container;
    this.itemClassName = options.itemClassName ?? DEFAULT_ITEM_CLASS_NAME;
    this.imageClassName = options.imageClassName ?? DEFAULT_IMAGE_CLASS_NAME;
  }

  /**
   * Render the provided items and recycle nodes that are no longer present.
   */
  public render(items: readonly RenderItem[]): void {
    const nextIds = new Set(items.map((item) => item.id));

    for (const id of this.renderedNodes.keys()) {
      if (!nextIds.has(id)) {
        this.recycleNode(id);
      }
    }

    const fragment = document.createDocumentFragment();

    for (const item of items) {
      const renderedNode = this.renderedNodes.get(item.id) ?? this.createRenderedNode(item.id);
      this.updateRenderedNode(renderedNode, item);
      this.renderedNodes.set(item.id, renderedNode);
      fragment.append(renderedNode.element);
    }

    this.container.append(fragment);
  }

  /**
   * Recycle all currently rendered nodes while keeping them available for reuse.
   */
  public clear(): void {
    for (const id of [...this.renderedNodes.keys()]) {
      this.recycleNode(id);
    }
  }

  /**
   * Destroy rendered nodes and the reuse pool.
   */
  public destroy(): void {
    this.renderedNodes.clear();
    this.nodePool.length = 0;
    this.container.replaceChildren();
  }

  /**
   * Return a rendered node snapshot by id.
   */
  public getRenderedNode(id: string): RenderedNode | undefined {
    return this.renderedNodes.get(id);
  }

  /**
   * Return the number of pooled nodes available for reuse.
   */
  public getPoolSize(): number {
    return this.nodePool.length;
  }

  private createRenderedNode(id: string): RenderedNode {
    const element = this.nodePool.pop() ?? document.createElement("div");
    const imageElement = getOrCreateImageElement(element);

    return {
      id,
      element,
      imageElement
    };
  }

  private updateRenderedNode(renderedNode: RenderedNode, item: RenderItem): void {
    const { element, imageElement } = renderedNode;

    element.className = this.itemClassName;
    element.dataset.galleryItemId = item.id;
    element.style.position = "absolute";
    element.style.transform = `translate3d(${String(item.x)}px, ${String(item.y)}px, 0)`;
    element.style.width = `${String(item.width)}px`;
    element.style.height = `${String(item.height)}px`;

    imageElement.className = this.imageClassName;
    imageElement.src = item.image.thumbnail ?? item.image.src;
    imageElement.alt = item.image.alt ?? "";
    imageElement.decoding = "async";
    imageElement.loading = "lazy";

    if (item.image.title) {
      imageElement.title = item.image.title;
    } else {
      imageElement.removeAttribute("title");
    }
  }

  private recycleNode(id: string): void {
    const renderedNode = this.renderedNodes.get(id);

    if (!renderedNode) {
      return;
    }

    renderedNode.element.remove();
    resetElement(renderedNode.element);
    this.renderedNodes.delete(id);
    this.nodePool.push(renderedNode.element);
  }
}

const getOrCreateImageElement = (element: HTMLElement): HTMLImageElement => {
  const existingImage = element.querySelector("img");

  if (existingImage) {
    return existingImage;
  }

  const imageElement = document.createElement("img");
  element.replaceChildren(imageElement);

  return imageElement;
};

const resetElement = (element: HTMLElement): void => {
  element.className = "";
  element.removeAttribute("style");
  delete element.dataset.galleryItemId;
};
