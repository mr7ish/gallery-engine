import { Renderer, VirtualEngine } from "@gallery-engine/core";
import type { GalleryImage, RenderItem, VirtualItem } from "@gallery-engine/core";
import "./styles.css";

interface VirtualRenderItem extends RenderItem, VirtualItem {}

const TOTAL_ITEMS = 10_000;
const ITEM_HEIGHT = 172;
const ITEM_WIDTH = 240;
const VIEWPORT_OVERSCAN = 720;
const items = createItems(TOTAL_ITEMS);
const viewport = document.querySelector<HTMLElement>("#viewport");
const canvas = document.querySelector<HTMLElement>("#canvas");
const metrics = document.querySelector<HTMLElement>("#metrics");

if (!viewport || !canvas || !metrics) {
  throw new Error("Missing large data example DOM nodes.");
}

const virtualEngine = new VirtualEngine<VirtualRenderItem>({
  overscan: VIEWPORT_OVERSCAN
});
const renderer = new Renderer({
  container: canvas
});
let frameHandle: number | undefined;

canvas.style.height = `${String(TOTAL_ITEMS * ITEM_HEIGHT)}px`;
virtualEngine.setItems(items);
renderVirtualRange();

viewport.addEventListener("scroll", () => {
  if (frameHandle !== undefined) {
    cancelAnimationFrame(frameHandle);
  }

  frameHandle = requestAnimationFrame(() => {
    frameHandle = undefined;
    renderVirtualRange();
  });
});

function renderVirtualRange(): void {
  const result = virtualEngine.calculate({
    scrollTop: viewport.scrollTop,
    height: viewport.clientHeight
  });

  renderer.render(result.visibleItems);
  metrics.textContent = `range ${String(result.range.start)}-${String(result.range.end)} / DOM ${String(result.visibleItems.length)} / recycled ${String(result.recycledIds.length)}`;
}

function createItems(count: number): readonly VirtualRenderItem[] {
  return Array.from({ length: count }, (_, index) => {
    const image = createImage(index);

    return {
      id: image.id,
      image,
      x: (index % 4) * (ITEM_WIDTH + 16),
      y: Math.floor(index / 4) * ITEM_HEIGHT,
      width: ITEM_WIDTH,
      height: 156
    };
  });
}

function createImage(index: number): GalleryImage {
  const imageNumber = index + 1;
  const hue = 190 + (index % 60) * 3;
  const label = `Item ${String(imageNumber)}`;

  return {
    id: `large-${String(imageNumber)}`,
    src: createSvgDataUri(480, 312, hue, label),
    thumbnail: createSvgDataUri(240, 156, hue, label),
    alt: `Large data image ${String(imageNumber)}`,
    width: 480,
    height: 312
  };
}

function createSvgDataUri(width: number, height: number, hue: number, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}"><rect width="100%" height="100%" fill="hsl(${String(hue)} 60% 40%)"/><text x="24" y="${String(height - 28)}" font-family="Arial" font-size="28" fill="white">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
