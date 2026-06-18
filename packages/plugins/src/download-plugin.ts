export interface DownloadableImage {
  readonly id: string;
  readonly src: string;
  readonly alt?: string;
  readonly title?: string;
  readonly filename?: string;
  readonly category?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface DownloadFilenameContext {
  readonly image: DownloadableImage;
  readonly index: number;
  readonly extension: string;
  readonly basename: string;
}

export type DownloadFilenameFormatter = (context: DownloadFilenameContext) => string;

export interface DownloadPluginOptions {
  readonly filename?: string;
  readonly filenameTemplate?: string;
  readonly filenameFormatter?: DownloadFilenameFormatter;
  readonly document?: Document;
}

export interface DownloadRequestOptions {
  readonly filename?: string;
  readonly filenameTemplate?: string;
  readonly filenameFormatter?: DownloadFilenameFormatter;
}

export interface DownloadResult {
  readonly image: DownloadableImage;
  readonly href: string;
  readonly filename: string;
  readonly index: number;
}

export interface DownloadGalleryConfig {
  readonly images?: readonly DownloadableImage[];
}

export interface DownloadGalleryContext {
  getConfig?(): DownloadGalleryConfig;
}

/**
 * Plugin that triggers browser downloads for one image or a batch of gallery images.
 */
export class DownloadPlugin {
  public readonly name = "download";

  private options: DownloadPluginOptions;
  private context: DownloadGalleryContext | undefined;

  public constructor(options: DownloadPluginOptions = {}) {
    this.options = options;
  }

  /**
   * Store the gallery context so downloads can resolve images from gallery config.
   */
  public install(context: DownloadGalleryContext = {}): void {
    this.context = context;
  }

  /**
   * Release the gallery context.
   */
  public destroy(): void {
    this.context = undefined;
  }

  /**
   * Handle plugin-manager destroy lifecycle dispatches.
   */
  public onDestroy(): void {
    this.destroy();
  }

  /**
   * Trigger a single image download by image object or image id.
   */
  public download(
    imageOrId: DownloadableImage | string,
    options: DownloadRequestOptions = {}
  ): DownloadResult {
    const image = this.resolveImage(imageOrId);

    return this.downloadImage(image, 0, options);
  }

  /**
   * Trigger downloads for provided images or for all images from gallery config.
   */
  public downloadMany(
    imagesOrIds?: readonly (DownloadableImage | string)[],
    options: DownloadRequestOptions = {}
  ): readonly DownloadResult[] {
    const images = imagesOrIds
      ? imagesOrIds.map((imageOrId) => this.resolveImage(imageOrId))
      : this.getGalleryImages();

    return images.map((image, index) => this.downloadImage(image, index, options));
  }

  /**
   * Alias for batch downloads from gallery config or an explicit image list.
   */
  public downloadAll(
    imagesOrIds?: readonly (DownloadableImage | string)[],
    options: DownloadRequestOptions = {}
  ): readonly DownloadResult[] {
    return this.downloadMany(imagesOrIds, options);
  }

  /**
   * Format the browser download filename for an image.
   */
  public formatFilename(
    image: DownloadableImage,
    index = 0,
    options: DownloadRequestOptions = {}
  ): string {
    const extension = resolveFileExtension(image.src);
    const basename = resolveBasename(image, extension);
    const context: DownloadFilenameContext = {
      image,
      index,
      extension,
      basename
    };
    const formatter = options.filenameFormatter ?? this.options.filenameFormatter;

    if (formatter) {
      return sanitizeFilename(formatter(context));
    }

    if (options.filename ?? this.options.filename) {
      return sanitizeFilename(options.filename ?? this.options.filename ?? basename);
    }

    const template = options.filenameTemplate ?? this.options.filenameTemplate;

    if (template) {
      return sanitizeFilename(applyFilenameTemplate(template, context));
    }

    return sanitizeFilename(ensureExtension(image.filename ?? basename, extension));
  }

  /**
   * Merge runtime plugin options.
   */
  public update(options: DownloadPluginOptions): void {
    this.options = {
      ...this.options,
      ...options
    };
  }

  private downloadImage(
    image: DownloadableImage,
    index: number,
    options: DownloadRequestOptions
  ): DownloadResult {
    const filename = this.formatFilename(image, index, options);
    triggerBrowserDownload(this.resolveDocument(), image.src, filename);

    return {
      image,
      href: image.src,
      filename,
      index
    };
  }

  private resolveImage(imageOrId: DownloadableImage | string): DownloadableImage {
    if (typeof imageOrId !== "string") {
      return imageOrId;
    }

    const image = this.getGalleryImages().find((candidate) => candidate.id === imageOrId);

    if (!image) {
      throw new Error(`DownloadPlugin image "${imageOrId}" was not found.`);
    }

    return image;
  }

  private getGalleryImages(): readonly DownloadableImage[] {
    return this.context?.getConfig?.().images ?? [];
  }

  private resolveDocument(): Document {
    if (this.options.document) {
      return this.options.document;
    }

    if (typeof document === "undefined") {
      throw new Error("DownloadPlugin requires a DOM document to trigger downloads.");
    }

    return document;
  }
}

const DEFAULT_EXTENSION = "jpg";
const INVALID_FILENAME_CHARACTERS = new Set(["<", ">", ":", '"', "/", "\\", "|", "?", "*"]);

const triggerBrowserDownload = (ownerDocument: Document, href: string, filename: string): void => {
  const anchorElement = ownerDocument.createElement("a");
  anchorElement.href = href;
  anchorElement.download = filename;
  anchorElement.rel = "noopener";
  anchorElement.style.display = "none";
  ownerDocument.body.append(anchorElement);
  anchorElement.click();
  anchorElement.remove();
};

const applyFilenameTemplate = (template: string, context: DownloadFilenameContext): string =>
  template.replace(/\{(basename|category|extension|id|index|title|alt)\}/g, (_match, token) =>
    resolveTemplateToken(String(token), context)
  );

const resolveTemplateToken = (token: string, context: DownloadFilenameContext): string => {
  if (token === "index") {
    return (context.index + 1).toString();
  }

  if (token === "extension") {
    return context.extension;
  }

  if (token === "basename") {
    return context.basename;
  }

  const value =
    context.image[token as keyof Pick<DownloadableImage, "alt" | "category" | "id" | "title">];

  return value ?? "";
};

const resolveBasename = (image: DownloadableImage, extension: string): string => {
  if (image.filename) {
    return stripExtension(image.filename, extension);
  }

  if (image.title) {
    return image.title;
  }

  if (image.alt) {
    return image.alt;
  }

  return image.id;
};

const resolveFileExtension = (src: string): string => {
  const pathname = resolveUrlPathname(src);
  const filename =
    pathname
      .split("/")
      .filter((part) => part.length > 0)
      .at(-1) ?? "";
  const dotIndex = filename.lastIndexOf(".");

  if (dotIndex < 0 || dotIndex === filename.length - 1) {
    return DEFAULT_EXTENSION;
  }

  return filename.slice(dotIndex + 1).toLowerCase();
};

const resolveUrlPathname = (src: string): string => {
  try {
    return new URL(src, "https://gallery-engine.local").pathname;
  } catch {
    return src.split(/[?#]/, 1)[0] ?? src;
  }
};

const stripExtension = (filename: string, extension: string): string => {
  const suffix = `.${extension}`;

  if (!filename.toLowerCase().endsWith(suffix)) {
    return filename;
  }

  return filename.slice(0, -suffix.length);
};

const ensureExtension = (filename: string, extension: string): string => {
  const sanitizedExtension = extension.length > 0 ? extension : DEFAULT_EXTENSION;
  const expectedSuffix = `.${sanitizedExtension}`;

  if (filename.toLowerCase().endsWith(expectedSuffix)) {
    return filename;
  }

  return `${filename}.${sanitizedExtension}`;
};

const sanitizeFilename = (filename: string): string => {
  const normalizedFilename = Array.from(filename, (character) =>
    isInvalidFilenameCharacter(character) ? "-" : character
  )
    .join("")
    .trim();

  return normalizedFilename.length > 0 ? normalizedFilename : `download.${DEFAULT_EXTENSION}`;
};

const isInvalidFilenameCharacter = (character: string): boolean =>
  INVALID_FILENAME_CHARACTERS.has(character) || character.charCodeAt(0) < 32;
