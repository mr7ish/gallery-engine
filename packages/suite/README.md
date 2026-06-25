# @gallery-engine/suite

Suite 是 Gallery Engine 的一站式入口包。它聚合 `core`、`layouts`、`animations`、`preview`、`plugins` 和 `shared` 的稳定命名 API，适合应用项目快速接入。🌟

## Installation

```bash
pnpm add @gallery-engine/suite
```

也可以使用 npm：

```bash
npm install @gallery-engine/suite
```

如果你非常关注 bundle 体积或只需要少量能力，可以继续安装单独子包，例如 `@gallery-engine/core` 或 `@gallery-engine/layouts`。

## Basic Usage

```ts
import {
  Gallery,
  GridLayout,
  PreviewEngine,
  WatermarkPlugin,
  createImageCache
} from "@gallery-engine/suite";
import type { GalleryImage } from "@gallery-engine/suite";

const images: readonly GalleryImage[] = [
  {
    id: "a",
    src: "/images/a.jpg",
    width: 1200,
    height: 800
  }
];

const gallery = new Gallery({
  container: "#gallery",
  images
});

gallery.use(
  new WatermarkPlugin({
    text: "Gallery Engine"
  })
);

gallery.init();

const layout = new GridLayout({
  columns: 3,
  gap: 16
});

const layoutResult = layout.calculate(images, {
  containerWidth: 960
});

const preview = new PreviewEngine({
  items: images,
  onChange: (state) => {
    console.log(state.item?.id);
  }
});

const cache = createImageCache();

cache.set(images[0].src, images[0]);
preview.open(0);

console.log(layoutResult.items);
```

## Namespace Imports

Suite 也保留了命名空间导出，方便你按领域组织代码并避免命名冲突。🗂️

```ts
import { Core, Layouts, Plugins } from "@gallery-engine/suite";

const gallery = new Core.Gallery({
  container: "#gallery",
  images: []
});

const masonry = new Layouts.MasonryLayout({
  minColumnWidth: 260
});

gallery.use(new Plugins.WatermarkPlugin({ text: "Demo" }));

console.log(masonry.name);
```

## What Is Included

- `Core`: `Gallery`, `EventBus`, `Renderer`, `ImageLoader`, `VirtualEngine`, `PluginManager` 等。
- `Layouts`: `GridLayout`, `MasonryLayout`, `JustifiedLayout`, `LayoutRegistry`。
- `Animations`: `AnimationEngine`, 内置动画 presets, `FlipAnimation`。
- `Preview`: `PreviewEngine`, `ZoomManager`, `FullscreenManager`。
- `Plugins`: `WatermarkPlugin`, `DownloadPlugin`, `AiTagsPlugin`, `AiSearchPlugin`。
- `Shared`: `CacheManager`, `createImageCache`。

## Notes

- `@gallery-engine/suite` 不实现额外运行时逻辑，只做稳定 API 聚合。
- 所有导出都是命名导出，没有默认导出。
- 推荐业务应用使用 `suite` 起步，底层库或体积敏感场景使用子包。
