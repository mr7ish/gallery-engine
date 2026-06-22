import { Renderer, VirtualEngine } from "@gallery-engine/core";
import type { GalleryImage, RenderItem, VirtualItem } from "@gallery-engine/core";
import { GridLayout } from "@gallery-engine/layouts";
import type { LayoutItem } from "@gallery-engine/layouts";
import { describe, expect, it } from "vitest";

interface BenchmarkRenderItem extends RenderItem, VirtualItem {}

interface Measurement<TValue> {
  readonly durationMs: number;
  readonly memoryDeltaBytes: number;
  readonly value: TValue;
}

interface TimingSummary {
  readonly averageMs: number;
  readonly p95Ms: number;
  readonly maxMs: number;
  readonly estimatedFps: number;
}

interface ScrollBenchmarkSummary extends TimingSummary {
  readonly maxVisibleItems: number;
}

const KIB = 1024;
const MIB = KIB * KIB;
const CONTAINER_WIDTH = 1_200;
const VIEWPORT_HEIGHT = 720;
const FRAME_SAMPLE_COUNT = 120;
const MINIMUM_SCROLL_FPS = 55;
const MAX_NORMAL_RENDER_MS = 750;
const MAX_VIRTUAL_FRAME_MS = 1000 / MINIMUM_SCROLL_FPS;
const MAX_VIRTUAL_DOM_NODES = 100;
const MAX_RENDER_MEMORY_BYTES = 64 * MIB;

const createBenchmarkImages = (count: number): readonly GalleryImage[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `image-${String(index + 1)}`,
    src: `/benchmark/image-${String(index + 1)}.jpg`,
    thumbnail: `/benchmark/thumb-${String(index + 1)}.jpg`,
    alt: `Benchmark image ${String(index + 1)}`,
    width: 320 + (index % 5) * 24,
    height: 220 + (index % 7) * 18
  }));

const createVirtualItems = (count: number): readonly BenchmarkRenderItem[] =>
  createBenchmarkImages(count).map((image, index) => ({
    id: image.id,
    image,
    x: 0,
    y: index * 172,
    width: 240,
    height: 160
  }));

const toRenderItems = (
  layoutItems: readonly LayoutItem[],
  images: readonly GalleryImage[]
): readonly RenderItem[] =>
  layoutItems.map((item, index) => {
    const image = images[index];

    if (!image) {
      throw new Error(`Missing benchmark image for layout item ${item.id}.`);
    }

    return {
      ...item,
      image
    };
  });

const createBenchmarkContainer = (): HTMLElement => {
  const container = document.createElement("section");
  container.style.position = "relative";
  container.style.width = `${String(CONTAINER_WIDTH)}px`;
  document.body.append(container);
  return container;
};

const measure = <TValue>(callback: () => TValue): Measurement<TValue> => {
  const memoryBefore = process.memoryUsage().heapUsed;
  const startedAt = performance.now();
  const value = callback();
  const durationMs = performance.now() - startedAt;
  const memoryAfter = process.memoryUsage().heapUsed;

  return {
    durationMs,
    memoryDeltaBytes: Math.max(0, memoryAfter - memoryBefore),
    value
  };
};

const summarizeTimings = (samples: readonly number[]): TimingSummary => {
  const sortedSamples = [...samples].sort((left, right) => left - right);
  const totalMs = samples.reduce((total, sample) => total + sample, 0);
  const averageMs = totalMs / Math.max(1, samples.length);
  const p95Ms = percentile(sortedSamples, 95);
  const maxMs = sortedSamples[sortedSamples.length - 1] ?? 0;

  return {
    averageMs,
    p95Ms,
    maxMs,
    estimatedFps: 1000 / Math.max(averageMs, 0.001)
  };
};

const percentile = (sortedSamples: readonly number[], percentileValue: number): number => {
  if (sortedSamples.length === 0) {
    return 0;
  }

  const index = Math.min(
    sortedSamples.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sortedSamples.length) - 1)
  );

  return sortedSamples[index] ?? 0;
};

const collectScrollBenchmark = (
  items: readonly BenchmarkRenderItem[],
  frameCount: number
): ScrollBenchmarkSummary => {
  const virtualEngine = new VirtualEngine<BenchmarkRenderItem>({
    overscan: VIEWPORT_HEIGHT
  });
  virtualEngine.setItems(items);

  const maxScrollTop = Math.max(0, items[items.length - 1]?.y ?? 0);
  const scrollStep = maxScrollTop / Math.max(1, frameCount - 1);
  const samples: number[] = [];
  let maxVisibleItems = 0;

  for (let frame = 0; frame < frameCount; frame += 1) {
    const scrollTop = frame * scrollStep;
    const measurement = measure(() =>
      virtualEngine.calculate({
        scrollTop,
        height: VIEWPORT_HEIGHT
      })
    );

    maxVisibleItems = Math.max(maxVisibleItems, measurement.value.visibleItems.length);
    samples.push(measurement.durationMs);
  }

  return {
    ...summarizeTimings(samples),
    maxVisibleItems
  };
};

describe("Gallery Engine benchmarks", () => {
  it("renders 1000 images within the first-screen render budget and records memory", () => {
    const images = createBenchmarkImages(1_000);
    const layout = new GridLayout<GalleryImage>({
      columns: 5,
      gap: 8
    });
    const container = createBenchmarkContainer();
    const renderer = new Renderer({ container });

    const result = measure(() => {
      const layoutResult = layout.calculate(images, {
        containerWidth: CONTAINER_WIDTH
      });
      const renderItems = toRenderItems(layoutResult.items, images);
      renderer.render(renderItems);

      return {
        itemCount: renderItems.length,
        layoutHeight: layoutResult.height
      };
    });

    expect(result.value.itemCount).toBe(1_000);
    expect(result.value.layoutHeight).toBeGreaterThan(0);
    expect(container.children).toHaveLength(1_000);
    expect(result.durationMs).toBeLessThanOrEqual(MAX_NORMAL_RENDER_MS);
    expect(result.memoryDeltaBytes).toBeLessThanOrEqual(MAX_RENDER_MEMORY_BYTES);

    renderer.destroy();
    container.remove();
  });

  it("keeps 5000-image virtual scrolling above the minimum FPS target", () => {
    const summary = collectScrollBenchmark(createVirtualItems(5_000), FRAME_SAMPLE_COUNT);

    expect(summary.maxVisibleItems).toBeLessThanOrEqual(MAX_VIRTUAL_DOM_NODES);
    expect(summary.averageMs).toBeLessThanOrEqual(MAX_VIRTUAL_FRAME_MS);
    expect(summary.estimatedFps).toBeGreaterThanOrEqual(MINIMUM_SCROLL_FPS);
  });

  it("keeps 10000-image virtual render cost bounded with recycled DOM", () => {
    const items = createVirtualItems(10_000);
    const virtualEngine = new VirtualEngine<BenchmarkRenderItem>({
      overscan: VIEWPORT_HEIGHT
    });
    const container = createBenchmarkContainer();
    const renderer = new Renderer({ container });
    const samples: number[] = [];
    let maxVisibleItems = 0;

    virtualEngine.setItems(items);

    const result = measure(() => {
      const maxScrollTop = Math.max(0, items[items.length - 1]?.y ?? 0);
      const scrollStep = maxScrollTop / Math.max(1, FRAME_SAMPLE_COUNT - 1);

      for (let frame = 0; frame < FRAME_SAMPLE_COUNT; frame += 1) {
        const scrollTop = frame * scrollStep;
        const frameMeasurement = measure(() => {
          const virtualResult = virtualEngine.calculate({
            scrollTop,
            height: VIEWPORT_HEIGHT
          });
          renderer.render(virtualResult.visibleItems);
          return virtualResult.visibleItems.length;
        });

        maxVisibleItems = Math.max(maxVisibleItems, frameMeasurement.value);
        samples.push(frameMeasurement.durationMs);
      }

      return summarizeTimings(samples);
    });

    expect(maxVisibleItems).toBeLessThanOrEqual(MAX_VIRTUAL_DOM_NODES);
    expect(container.children.length).toBeLessThanOrEqual(MAX_VIRTUAL_DOM_NODES);
    expect(renderer.getPoolSize()).toBeGreaterThan(0);
    expect(result.value.averageMs).toBeLessThanOrEqual(MAX_VIRTUAL_FRAME_MS);
    expect(result.memoryDeltaBytes).toBeLessThanOrEqual(MAX_RENDER_MEMORY_BYTES);

    renderer.destroy();
    container.remove();
  });
});
