# API Examples

These examples use only named exports and keep module boundaries explicit.

## Gallery Lifecycle

```ts
import { Gallery } from "@gallery-engine/core";
import type { GalleryImage } from "@gallery-engine/core";

const images: readonly GalleryImage[] = [
  {
    id: "hero",
    src: "/images/hero.jpg",
    alt: "Hero image"
  }
];

const gallery = new Gallery({
  container: "#gallery",
  images
});

gallery.on("mounted", (state) => {
  state.initialized;
});

gallery.init();
gallery.refresh();
gallery.destroy();
```

## Typed EventBus

```ts
import { EventBus } from "@gallery-engine/core";

interface DemoEvents {
  "image:loaded": {
    readonly id: string;
    readonly src: string;
  };
  "preview:close": undefined;
}

const eventBus = new EventBus<DemoEvents>();

const unsubscribe = eventBus.on("image:loaded", (payload) => {
  payload.id;
});

eventBus.emit("image:loaded", {
  id: "hero",
  src: "/images/hero.jpg"
});
eventBus.emit("preview:close");
unsubscribe();
```

## Layout And Render

```ts
import { Renderer } from "@gallery-engine/core";
import { GridLayout } from "@gallery-engine/layouts";
import type { GalleryImage, RenderItem } from "@gallery-engine/core";

const container = document.querySelector<HTMLElement>("#gallery");

if (!container) {
  throw new Error("Missing gallery container.");
}

const images: readonly GalleryImage[] = [
  {
    id: "one",
    src: "/one.jpg",
    width: 800,
    height: 600
  }
];

const layout = new GridLayout<GalleryImage>({
  columns: 3,
  gap: 12
});
const layoutResult = layout.calculate(images, {
  containerWidth: 960
});
const renderItems: readonly RenderItem[] = layoutResult.items.map((item, index) => {
  const image = images[index];

  if (!image) {
    throw new Error(`Missing image for ${item.id}.`);
  }

  return {
    ...item,
    image
  };
});

const renderer = new Renderer({ container });
renderer.render(renderItems);
```

## Virtual Range Calculation

```ts
import { VirtualEngine } from "@gallery-engine/core";
import type { VirtualItem } from "@gallery-engine/core";

const virtualEngine = new VirtualEngine<VirtualItem>({
  overscan: 200
});

virtualEngine.setItems([
  {
    id: "item-1",
    x: 0,
    y: 0,
    width: 240,
    height: 180
  }
]);

const result = virtualEngine.calculate({
  scrollTop: 0,
  height: 600
});

result.visibleItems;
result.recycledIds;
```

## Preview State

```ts
import { PreviewEngine } from "@gallery-engine/preview";

const preview = new PreviewEngine({
  items: [
    {
      id: "hero",
      src: "/images/hero.jpg",
      title: "Hero"
    }
  ],
  keyboard: true,
  onChange: (state) => {
    state.current;
  }
});

preview.open(0);
preview.next();
preview.zoomIn();
preview.close();
preview.destroy();
```

## Plugin Installation

```ts
import { Gallery } from "@gallery-engine/core";
import { WatermarkPlugin } from "@gallery-engine/plugins";

const gallery = new Gallery({
  container: "#gallery",
  images: []
});

gallery.use(
  new WatermarkPlugin({
    text: "Private",
    position: "bottom-right",
    opacity: 0.72
  })
);
```
