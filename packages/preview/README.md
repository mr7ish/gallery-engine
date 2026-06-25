# @gallery-engine/preview

Preview 提供图片预览状态管理、键盘导航、缩放、拖拽和全屏辅助能力。适合构建 Lightbox、详情预览和沉浸式查看器。🔍

## Installation

```bash
pnpm add @gallery-engine/preview
```

也可以使用 npm：

```bash
npm install @gallery-engine/preview
```

## Preview Engine

```ts
import { PreviewEngine } from "@gallery-engine/preview";
import type { PreviewItem } from "@gallery-engine/preview";

const items: readonly PreviewItem[] = [
  {
    id: "a",
    src: "/images/a.jpg",
    title: "Morning"
  },
  {
    id: "b",
    src: "/images/b.jpg",
    title: "Evening"
  }
];

const preview = new PreviewEngine({
  items,
  keyboard: true,
  onChange: (state) => {
    console.log({
      visible: state.visible,
      current: state.current,
      zoom: state.zoom,
      item: state.item?.title
    });
  }
});

preview.open(0);
preview.next();
preview.zoomIn();
preview.close();
preview.destroy();
```

## Zoom Manager

```ts
import { ZoomManager } from "@gallery-engine/preview";

const zoom = new ZoomManager({
  minZoom: 1,
  maxZoom: 4,
  zoomStep: 0.25,
  onChange: (state) => {
    imageElement.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  }
});

zoom.zoomIn();
zoom.setPan({ x: 24, y: 0 });
zoom.reset();
```

## Fullscreen Manager

```ts
import { FullscreenManager } from "@gallery-engine/preview";

const fullscreen = new FullscreenManager({
  target: document.querySelector<HTMLElement>("#preview") ?? document.body,
  onChange: ({ active }) => {
    console.log(active ? "Entered fullscreen" : "Exited fullscreen");
  }
});

await fullscreen.enter();
await fullscreen.exit();
```

## Common APIs

- `PreviewEngine`: 预览打开、关闭、上一张、下一张、缩放状态和键盘控制。
- `ZoomManager`: 缩放、平移、滚轮、双击和触摸缩放状态。
- `FullscreenManager`: 浏览器全屏 API 封装。

## Notes

- `PreviewEngine` 管状态，不强制渲染 UI。
- 你可以用 React、Vue、Vanilla DOM 或任意 UI 层消费 `onChange` 返回的状态。
