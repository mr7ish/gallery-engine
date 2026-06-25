# @gallery-engine/layouts

Layouts 提供 Gallery Engine 的布局计算能力，包括 Grid、Masonry、Justified 和布局注册表。它只负责计算位置，不直接操作 DOM。🧩

## Installation

```bash
pnpm add @gallery-engine/layouts
```

也可以使用 npm：

```bash
npm install @gallery-engine/layouts
```

## Grid Layout

```ts
import { GridLayout } from "@gallery-engine/layouts";
import type { LayoutInputItem } from "@gallery-engine/layouts";

const items: readonly LayoutInputItem[] = [
  { id: "a", width: 1200, height: 800 },
  { id: "b", width: 900, height: 1200 },
  { id: "c", width: 1600, height: 900 }
];

const layout = new GridLayout({
  columns: 3,
  gap: 16
});

const result = layout.calculate(items, {
  containerWidth: 960
});

console.log(result.items);
```

## Masonry Layout

```ts
import { MasonryLayout } from "@gallery-engine/layouts";

const layout = new MasonryLayout({
  minColumnWidth: 240,
  gap: 12
});

const result = layout.calculate(
  [
    { id: "portrait", width: 800, height: 1200 },
    { id: "landscape", width: 1600, height: 900 }
  ],
  {
    containerWidth: 1024
  }
);

console.log(result.height);
```

## Layout Registry

`LayoutRegistry` 适合把布局选择交给运行时配置或 UI 控件。⚙️

```ts
import { GridLayout, LayoutRegistry, MasonryLayout } from "@gallery-engine/layouts";

const registry = new LayoutRegistry();

registry.registerLayout(new GridLayout({ columns: 4 }));
registry.registerLayout(new MasonryLayout({ minColumnWidth: 260 }));

const layout = registry.getLayout("masonry");

if (layout) {
  const result = layout.calculate([], {
    containerWidth: 1200
  });

  console.log(result.width);
}
```

## Common APIs

- `GridLayout`: 固定列或最小列宽的网格布局。
- `MasonryLayout`: 瀑布流布局。
- `JustifiedLayout`: 行高驱动的等高对齐布局。
- `LayoutRegistry`: 布局注册和查找。
- `LayoutInputItem`: 布局输入项类型。
- `LayoutResult`: 布局计算结果类型。

## Notes

- 布局模块不依赖浏览器 DOM，适合单元测试和服务端预计算。
- 输出的 `x/y/width/height` 可以交给 `@gallery-engine/core` 的 `Renderer` 或你的自定义渲染层使用。
