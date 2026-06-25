# @gallery-engine/core

Core 是 Gallery Engine 的运行时核心。它负责配置合并、生命周期、事件通信、渲染辅助、图片加载、懒加载、无限滚动、虚拟滚动和插件调度。🚀

## Installation

```bash
pnpm add @gallery-engine/core
```

也可以使用 npm：

```bash
npm install @gallery-engine/core
```

## Usage

```ts
import { Gallery } from "@gallery-engine/core";
import type { GalleryImage } from "@gallery-engine/core";

const images: readonly GalleryImage[] = [
  {
    id: "mountain",
    src: "/images/mountain.jpg",
    alt: "Mountain",
    width: 1600,
    height: 1000
  }
];

const gallery = new Gallery({
  container: "#gallery",
  images,
  layout: {
    type: "grid"
  }
});

gallery.on("mounted", ({ container }) => {
  container?.classList.add("is-ready");
});

gallery.on("layout:update", ({ config }) => {
  console.log(`Layout changed to ${config.layout.type}`);
});

gallery.init();

gallery.update({
  layout: {
    type: "masonry"
  }
});

gallery.refresh();

window.addEventListener("beforeunload", () => {
  gallery.destroy();
});
```

## EventBus Example

如果你在扩展模块里需要独立的事件总线，可以直接使用类型安全的 `EventBus`。✨

```ts
import { EventBus } from "@gallery-engine/core";

interface AppEvents {
  readonly "image:selected": {
    readonly id: string;
  };
}

const bus = new EventBus<AppEvents>();

bus.on("image:selected", ({ id }) => {
  console.log(`Selected ${id}`);
});

bus.emit("image:selected", {
  id: "mountain"
});
```

## Common APIs

- `Gallery`: Gallery 生命周期、配置、事件和插件入口。
- `ConfigManager`: 默认配置、用户配置和运行时配置合并。
- `EventBus`: 类型安全事件通信。
- `Renderer`: DOM 节点渲染和复用。
- `ImageLoader`: 图片加载、解码、重试和并发控制。
- `LazyObserver`: `IntersectionObserver` 封装。
- `InfiniteScroll`: 触底加载检测。
- `VirtualEngine`: 可视区域与 overscan 计算。
- `ScrollManager`: 滚动监听、节流和滚动结束检测。
- `PluginManager`: 插件安装、卸载和生命周期派发。

## Notes

- 只使用命名导出，不提供 `export default`。
- 公共类型优先通过 `import type` 引入。
- 模块之间推荐通过事件和插件生命周期协作，避免直接耦合。
