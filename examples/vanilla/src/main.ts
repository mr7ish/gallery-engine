import { Gallery, Renderer } from "@gallery-engine/core";
import type { GalleryImage, RenderItem } from "@gallery-engine/core";
import { GridLayout } from "@gallery-engine/layouts";
import { WatermarkPlugin } from "@gallery-engine/plugins";
import { PreviewEngine } from "@gallery-engine/preview";
import "./styles.css";

const images: readonly GalleryImage[] = Array.from({ length: 12 }, (_, index) => {
  const imageNumber = index + 1;
  const hue = 180 + index * 12;

  return {
    id: `vanilla-${String(imageNumber)}`,
    src: createSvgDataUri(960, 640, hue, `Image ${String(imageNumber)}`),
    thumbnail: createSvgDataUri(480, 320, hue, `Image ${String(imageNumber)}`),
    alt: `Gallery image ${String(imageNumber)}`,
    title: `Image ${String(imageNumber)}`,
    width: 960,
    height: 640
  };
});

const galleryContainer = document.querySelector<HTMLElement>("#gallery");
const refreshButton = document.querySelector<HTMLButtonElement>("#refresh");
const previewShell = document.querySelector<HTMLElement>("#preview");
const previewImage = document.querySelector<HTMLImageElement>("#preview-image");
const previewTitle = document.querySelector<HTMLElement>("#preview-title");
const previewClose = document.querySelector<HTMLButtonElement>("#preview-close");
const previewPrev = document.querySelector<HTMLButtonElement>("#preview-prev");
const previewNext = document.querySelector<HTMLButtonElement>("#preview-next");

if (
  !galleryContainer ||
  !refreshButton ||
  !previewShell ||
  !previewImage ||
  !previewTitle ||
  !previewClose ||
  !previewPrev ||
  !previewNext
) {
  throw new Error("Missing Vanilla example DOM nodes.");
}

const gallery = new Gallery({
  container: galleryContainer,
  images,
  layout: {
    type: "grid",
    grid: {
      columns: 3,
      gap: 16
    }
  },
  preview: {
    enabled: true
  }
});
const renderer = new Renderer({
  container: galleryContainer
});
const grid = new GridLayout<GalleryImage>({
  minColumnWidth: 260,
  gap: 16
});
const preview = new PreviewEngine({
  items: images,
  keyboard: true,
  onChange: renderPreview
});

gallery.use(
  new WatermarkPlugin({
    text: "Gallery Engine",
    position: "bottom-right",
    opacity: 0.72
  })
);
gallery.on("mounted", () => {
  renderGallery();
});
gallery.on("layout:update", () => {
  renderGallery();
});
gallery.init();

refreshButton.addEventListener("click", () => {
  gallery.refresh();
});
previewClose.addEventListener("click", () => {
  preview.close();
});
previewPrev.addEventListener("click", () => {
  preview.prev();
});
previewNext.addEventListener("click", () => {
  preview.next();
});
window.addEventListener("resize", () => {
  gallery.refresh();
});

function renderGallery(): void {
  const layoutResult = grid.calculate(images, {
    containerWidth: galleryContainer.clientWidth
  });
  const renderItems = toRenderItems(layoutResult.items);
  galleryContainer.style.height = `${String(layoutResult.height)}px`;
  renderer.render(renderItems);

  renderItems.forEach((item, index) => {
    const node = renderer.getRenderedNode(item.id);
    node?.element.addEventListener("click", () => {
      preview.open(index);
    });
  });
}

function renderPreview(): void {
  const state = preview.getState();
  const item = state.item;
  previewShell.hidden = !state.visible || !item;

  if (!item) {
    return;
  }

  previewImage.src = item.src;
  previewImage.alt = item.alt ?? "";
  previewImage.style.transform = `scale(${String(state.zoom)})`;
  previewTitle.textContent = item.title ?? item.id;
}

function toRenderItems(layoutItems: readonly Omit<RenderItem, "image">[]): readonly RenderItem[] {
  return layoutItems.map((item, index) => {
    const image = images[index];

    if (!image) {
      throw new Error(`Missing image for ${item.id}.`);
    }

    return {
      ...item,
      image
    };
  });
}

function createSvgDataUri(width: number, height: number, hue: number, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}" viewBox="0 0 ${String(width)} ${String(height)}"><rect width="100%" height="100%" fill="hsl(${String(hue)} 64% 42%)"/><circle cx="${String(width * 0.75)}" cy="${String(height * 0.3)}" r="${String(width * 0.18)}" fill="hsl(${String(hue + 36)} 72% 58%)" opacity="0.72"/><text x="48" y="${String(height - 56)}" font-family="Arial" font-size="44" fill="white">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
