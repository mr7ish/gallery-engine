export type WatermarkPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface WatermarkOffset {
  readonly x?: number;
  readonly y?: number;
}

export interface ImageWatermarkContent {
  readonly type: "image";
  readonly src: string;
  readonly alt?: string;
  readonly width?: number | string;
  readonly height?: number | string;
}

export interface TextWatermarkContent {
  readonly type: "text";
  readonly value: string;
}

export type WatermarkContent = ImageWatermarkContent | TextWatermarkContent;

export interface WatermarkPluginOptions {
  readonly container?: string | HTMLElement;
  readonly content?: WatermarkContent;
  readonly text?: string;
  readonly image?: Omit<ImageWatermarkContent, "type">;
  readonly position?: WatermarkPosition;
  readonly offset?: WatermarkOffset;
  readonly opacity?: number;
  readonly zIndex?: number;
  readonly className?: string;
}

export interface WatermarkGalleryConfig {
  readonly container?: string | HTMLElement;
}

export interface WatermarkGalleryContext {
  readonly container?: string | HTMLElement;
  getConfig?(): WatermarkGalleryConfig;
}

/**
 * DOM plugin that renders a non-interactive text or image watermark over a gallery container.
 */
export class WatermarkPlugin {
  public readonly name = "watermark";

  private options: WatermarkPluginOptions;
  private hostElement: HTMLElement | undefined;
  private watermarkElement: HTMLElement | undefined;
  private previousHostPosition: string | undefined;

  public constructor(options: WatermarkPluginOptions = {}) {
    this.options = options;
  }

  /**
   * Resolve the gallery container and mount the watermark element.
   */
  public install(context: WatermarkGalleryContext = {}): void {
    this.destroy();

    const hostElement = this.resolveContainer(context);
    this.ensurePositionedHost(hostElement);

    const watermarkElement = this.createWatermarkElement(hostElement.ownerDocument);
    hostElement.append(watermarkElement);

    this.hostElement = hostElement;
    this.watermarkElement = watermarkElement;
  }

  /**
   * Remove the watermark element and restore host positioning changed by the plugin.
   */
  public destroy(): void {
    this.watermarkElement?.remove();

    if (this.hostElement && this.previousHostPosition !== undefined) {
      this.hostElement.style.position = this.previousHostPosition;
    }

    this.hostElement = undefined;
    this.watermarkElement = undefined;
    this.previousHostPosition = undefined;
  }

  /**
   * Handle plugin-manager destroy lifecycle dispatches.
   */
  public onDestroy(): void {
    this.destroy();
  }

  /**
   * Merge runtime options and rerender when already installed.
   */
  public update(options: WatermarkPluginOptions): HTMLElement | undefined {
    this.options = mergeWatermarkOptions(this.options, options);

    if (!this.hostElement) {
      return undefined;
    }

    this.watermarkElement?.remove();
    this.watermarkElement = this.createWatermarkElement(this.hostElement.ownerDocument);
    this.hostElement.append(this.watermarkElement);

    return this.watermarkElement;
  }

  /**
   * Return the mounted watermark element for inspection or advanced styling.
   */
  public getElement(): HTMLElement | undefined {
    return this.watermarkElement;
  }

  private resolveContainer(context: WatermarkGalleryContext): HTMLElement {
    const container =
      this.options.container ?? context.container ?? context.getConfig?.().container;

    if (!container) {
      throw new Error("WatermarkPlugin requires a container option or gallery config container.");
    }

    if (typeof container !== "string") {
      return container;
    }

    if (typeof document === "undefined") {
      throw new Error("WatermarkPlugin requires a DOM document to resolve a selector container.");
    }

    const element = document.querySelector<HTMLElement>(container);

    if (!element) {
      throw new Error(`WatermarkPlugin container "${container}" was not found.`);
    }

    return element;
  }

  private ensurePositionedHost(hostElement: HTMLElement): void {
    const computedPosition =
      hostElement.ownerDocument.defaultView?.getComputedStyle(hostElement).position ??
      hostElement.style.position;

    if (computedPosition !== "static") {
      return;
    }

    this.previousHostPosition = hostElement.style.position;
    hostElement.style.position = "relative";
  }

  private createWatermarkElement(ownerDocument: Document): HTMLElement {
    const element = ownerDocument.createElement("div");
    const content = resolveWatermarkContent(this.options);

    element.classList.add("gallery-engine-watermark");
    addClassNames(element, this.options.className);
    element.dataset.galleryEnginePlugin = this.name;
    applyBaseStyle(element, this.options);
    applyPositionStyle(element, this.options.position ?? "bottom-right", this.options.offset);

    if (content.type === "image") {
      element.append(createImageElement(ownerDocument, content));
      return element;
    }

    element.textContent = content.value;
    element.style.whiteSpace = "nowrap";

    return element;
  }
}

const DEFAULT_TEXT_WATERMARK: TextWatermarkContent = {
  type: "text",
  value: "Gallery Engine"
};

const DEFAULT_OFFSET: Required<WatermarkOffset> = {
  x: 16,
  y: 16
};

const mergeWatermarkOptions = (
  baseOptions: WatermarkPluginOptions,
  updateOptions: WatermarkPluginOptions
): WatermarkPluginOptions => {
  const offset = mergeOffset(baseOptions.offset, updateOptions.offset);
  const mergedOptions: WatermarkPluginOptions = {
    ...baseOptions,
    ...updateOptions
  };

  if (!offset) {
    return mergedOptions;
  }

  return {
    ...mergedOptions,
    offset
  };
};

const mergeOffset = (
  baseOffset: WatermarkOffset | undefined,
  updateOffset: WatermarkOffset | undefined
): WatermarkOffset | undefined => {
  if (!baseOffset && !updateOffset) {
    return undefined;
  }

  return {
    ...baseOffset,
    ...updateOffset
  };
};

const resolveWatermarkContent = (options: WatermarkPluginOptions): WatermarkContent => {
  if (options.content) {
    return options.content;
  }

  if (options.image) {
    return {
      ...options.image,
      type: "image"
    };
  }

  if (options.text) {
    return {
      type: "text",
      value: options.text
    };
  }

  return DEFAULT_TEXT_WATERMARK;
};

const addClassNames = (element: HTMLElement, className: string | undefined): void => {
  const classNames = className?.split(/\s+/).filter((name) => name.length > 0) ?? [];

  element.classList.add(...classNames);
};

const createImageElement = (
  ownerDocument: Document,
  content: ImageWatermarkContent
): HTMLImageElement => {
  const imageElement = ownerDocument.createElement("img");
  imageElement.src = content.src;
  imageElement.alt = content.alt ?? "";
  imageElement.style.display = "block";
  imageElement.style.maxWidth = "100%";
  imageElement.style.maxHeight = "100%";

  applySize(imageElement, "width", content.width);
  applySize(imageElement, "height", content.height);

  return imageElement;
};

const applySize = (
  element: HTMLElement,
  property: "width" | "height",
  value: number | string | undefined
): void => {
  if (value === undefined) {
    return;
  }

  element.style[property] = typeof value === "number" ? toPixelValue(value) : value;
};

const applyBaseStyle = (element: HTMLElement, options: WatermarkPluginOptions): void => {
  element.style.position = "absolute";
  element.style.pointerEvents = "none";
  element.style.userSelect = "none";
  element.style.boxSizing = "border-box";
  element.style.display = "inline-flex";
  element.style.alignItems = "center";
  element.style.justifyContent = "center";
  element.style.opacity = String(clampOpacity(options.opacity ?? 0.72));
  element.style.zIndex = String(options.zIndex ?? 10);
};

const applyPositionStyle = (
  element: HTMLElement,
  position: WatermarkPosition,
  offset: WatermarkOffset | undefined
): void => {
  const resolvedOffset = {
    x: offset?.x ?? DEFAULT_OFFSET.x,
    y: offset?.y ?? DEFAULT_OFFSET.y
  };

  resetPositionStyle(element);

  if (position.includes("top")) {
    element.style.top = toPixelValue(resolvedOffset.y);
  }

  if (position.includes("bottom")) {
    element.style.bottom = toPixelValue(resolvedOffset.y);
  }

  if (position.includes("left")) {
    element.style.left = toPixelValue(resolvedOffset.x);
  }

  if (position.includes("right")) {
    element.style.right = toPixelValue(resolvedOffset.x);
  }

  applyCenteredPositionStyle(element, position, resolvedOffset);
};

const resetPositionStyle = (element: HTMLElement): void => {
  element.style.top = "auto";
  element.style.right = "auto";
  element.style.bottom = "auto";
  element.style.left = "auto";
  element.style.transform = "";
  element.style.marginLeft = "0px";
  element.style.marginTop = "0px";
};

const applyCenteredPositionStyle = (
  element: HTMLElement,
  position: WatermarkPosition,
  offset: Required<WatermarkOffset>
): void => {
  if (position === "center") {
    element.style.top = "50%";
    element.style.left = "50%";
    element.style.marginLeft = toPixelValue(offset.x);
    element.style.marginTop = toPixelValue(offset.y);
    element.style.transform = "translate(-50%, -50%)";
    return;
  }

  if (position.endsWith("center")) {
    element.style.left = "50%";
    element.style.marginLeft = toPixelValue(offset.x);
    element.style.transform = "translateX(-50%)";
    return;
  }

  if (position.startsWith("center")) {
    element.style.top = "50%";
    element.style.marginTop = toPixelValue(offset.y);
    element.style.transform = "translateY(-50%)";
  }
};

const clampOpacity = (value: number): number => Math.min(1, Math.max(0, value));

const toPixelValue = (value: number): string => `${value.toString()}px`;
