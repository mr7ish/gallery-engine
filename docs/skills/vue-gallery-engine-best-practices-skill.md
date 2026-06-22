---
name: vue-gallery-engine-best-practices
description: 使用 Vue 3、TypeScript 与 Gallery Engine 构建图片画廊应用的最佳实践。用于实现或审查 Vue 示例、业务页面、组合式函数、组件封装、布局切换、图片加载、预览、动画、插件、测试与性能优化等任务。
---

# Vue Gallery Engine 最佳实践 Skill

## 核心原则

使用 Vue 只管理应用状态、DOM 容器引用和用户交互；Gallery Engine 负责画廊运行时能力，包括配置、事件、布局、渲染、图片加载、懒加载、虚拟滚动、预览、动画和插件。

始终遵守项目约束：

- 使用 TypeScript 和 ESM。
- 禁止 `any`。
- 禁止 `export default`。
- 公开能力使用命名导出。
- 新能力优先通过 `EventBus`、`Layout`、`Plugin` 扩展。
- 组件卸载时必须清理 Gallery Engine 实例、Renderer、监听器和浏览器事件。

## 适用场景

当任务涉及以下内容时使用本 Skill：

- 在 Vue 3 中接入 `@gallery-engine/core`、`@gallery-engine/layouts`、`@gallery-engine/preview`、`@gallery-engine/animations`、`@gallery-engine/plugins`。
- 新建 Vue 画廊组件、组合式函数或示例项目。
- 实现布局切换、预览、懒加载、无限滚动、虚拟滚动、动画、下载、水印、AI 标签或相似搜索。
- 排查 Vue 响应式状态和 Gallery Engine 命令式运行时之间的边界问题。
- 为 Vue 集成补充单元测试、E2E 测试或性能基准。

## 推荐组件边界

把 Vue 组件拆成三层：

1. 容器组件：持有 `containerRef`、输入数据、布局类型、用户控件。
2. 组合式函数：封装 Gallery Engine 生命周期，例如 `useGalleryEngine()`。
3. 展示组件：只渲染工具栏、状态栏、筛选器、标签等 Vue UI。

不要让 Vue 使用 `v-for` 重复渲染 Gallery Engine 已经接管的图片节点。画廊图片 DOM 应由 `Renderer` 或后续统一渲染层负责，Vue 只提供容器节点。

## 基础集成流程

使用 `onMounted` 初始化，使用 `onBeforeUnmount` 销毁：

```ts
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Gallery, Renderer } from "@gallery-engine/core";
import type { GalleryImage, RenderItem } from "@gallery-engine/core";
import { MasonryLayout } from "@gallery-engine/layouts";

export const useGalleryEngine = (images: readonly GalleryImage[]) => {
  const containerRef = ref<HTMLElement | null>(null);
  const status = ref("idle");
  let gallery: Gallery | undefined;
  let renderer: Renderer | undefined;

  const render = (): void => {
    const container = containerRef.value;

    if (!container || !renderer) {
      return;
    }

    const layout = new MasonryLayout<GalleryImage>({
      minColumnWidth: 260,
      gap: 16
    });
    const layoutResult = layout.calculate(images, {
      containerWidth: container.clientWidth
    });
    const renderItems = layoutResult.items.map((item, index): RenderItem => {
      const image = images[index];

      if (!image) {
        throw new Error(`Missing image for ${item.id}.`);
      }

      return {
        ...item,
        image
      };
    });

    container.style.height = `${String(layoutResult.height)}px`;
    renderer.render(renderItems);
    status.value = `rendered ${String(renderItems.length)} items`;
  };

  onMounted(() => {
    const container = containerRef.value;

    if (!container) {
      return;
    }

    gallery = new Gallery({
      container,
      images,
      layout: {
        type: "masonry"
      }
    });
    renderer = new Renderer({ container });
    gallery.on("mounted", render);
    gallery.on("layout:update", render);
    gallery.init();
    window.addEventListener("resize", render);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", render);
    renderer?.destroy();
    gallery?.destroy();
  });

  return {
    containerRef,
    status
  };
};
```

## Vue 响应式边界

保持图片数据不可变，优先使用 `readonly GalleryImage[]`。当图片列表变化时，调用 Gallery 的 `add()`、`addMany()`、`remove()`、`replace()` 或 `update()`，不要直接修改内部运行时状态。

推荐做法：

- Vue `ref` / `computed` 管理筛选条件、当前布局、加载状态、选中图片 id。
- Gallery Engine 管理图片节点、布局计算、事件派发和插件生命周期。
- 通过 `gallery.on(...)` 把运行时事件同步回 Vue 状态。
- 对 resize、scroll 等高频事件使用节流或已有 `ScrollManager`，避免让 Vue 响应式系统承担高频布局计算。

避免做法：

- 不要把 `Gallery`、`Renderer`、`ImageLoader` 实例放进深层 reactive 对象。
- 不要在模板中直接调用布局计算函数。
- 不要让 Vue 和 `Renderer` 同时操作同一批图片 DOM。

## 布局选择

根据业务场景选择布局：

- `GridLayout`：适合尺寸统一、信息密度稳定的列表。
- `MasonryLayout`：适合图片高度差异明显、瀑布流浏览。
- `JustifiedLayout`：适合摄影墙、作品集和希望每行填满容器的展示。

布局切换时保留同一组 `GalleryImage`，只替换 layout 实例并重新计算。切换后派发或响应 `layout:update`，让渲染层重绘。

```ts
import { GridLayout, JustifiedLayout, MasonryLayout } from "@gallery-engine/layouts";

export type VueGalleryLayoutType = "grid" | "masonry" | "justified";

export const createLayout = (type: VueGalleryLayoutType) => {
  if (type === "grid") {
    return new GridLayout({ minColumnWidth: 220, gap: 16 });
  }

  if (type === "justified") {
    return new JustifiedLayout({ rowHeight: 220, gap: 12 });
  }

  return new MasonryLayout({ minColumnWidth: 260, gap: 16 });
};
```

## 图片加载与缓存

使用 `ImageLoader` 处理图片请求、`decode()`、失败重试和并发控制。Vue 只展示加载状态，不直接承担图片加载状态机。

推荐配置：

- 首屏：较小 `maxConcurrent`，避免阻塞交互。
- 大图预览：开启 `decode`，保证展示稳定。
- 弱网：设置 `retries` 和 `retryDelay`。
- 图片元数据或已加载地址：使用 `CacheManager` 或 `createImageCache()` 缓存。

```ts
import { ImageLoader } from "@gallery-engine/core";

const imageLoader = new ImageLoader({
  maxConcurrent: 4,
  retries: 2,
  retryDelay: 120,
  decode: true,
  onStateChange: (state) => {
    // 在这里同步到 Vue ref，例如 loadingMap.value.set(state.id, state)
    state.status;
  }
});
```

## 懒加载、无限滚动与虚拟滚动

小型画廊优先使用普通渲染和 `LazyObserver`。数据量增大时逐步引入：

1. `LazyObserver`：图片进入视口再加载。
2. `InfiniteScroll`：分批展示数据。
3. `VirtualEngine` + `ScrollManager`：超大数据量下只渲染可见范围。

在 Vue 中不要对全部大数据做模板渲染。应让 `VirtualEngine` 输出可见范围，再交给 `Renderer` 或业务适配层渲染。

## 预览、缩放与全屏

预览相关状态可以放在 Vue 中，例如 `isPreviewOpen`、`activeImageId`，但实际打开、关闭、缩放、拖拽、全屏能力应使用 `@gallery-engine/preview`。

推荐事件流：

- 图片点击后通过 Gallery 事件或 Vue handler 设置当前图片。
- 调用 `PreviewEngine.open()`。
- 在 `preview:open`、`preview:close` 中同步 Vue 状态。
- 使用 `ZoomManager` 管理滚轮缩放、拖拽和双击缩放。
- 使用 `FullscreenManager` 管理浏览器全屏 API。

组件卸载时必须退出预览相关监听并销毁实例。

## 动画

常规入场、离场和状态切换使用 `AnimationEngine` 与内置 presets。缩略图到预览图的过渡使用 `FlipAnimation`。

Vue 侧只控制“什么时候触发动画”，不要把动画中间状态写入大量响应式数据。动画生命周期事件可以同步到 Vue 状态栏或埋点。

优先策略：

- 布局重排：使用 FLIP。
- 图片出现：使用 fade 或 scale preset。
- 预览打开：使用 zoom 或 fade preset。
- 大量节点：降低动画数量，避免所有节点同时触发复杂动画。

## 插件接入

插件应在 Gallery 实例初始化后注册，并在组件卸载时随 Gallery 销毁。

常用插件：

- `WatermarkPlugin`：展示文字或图片水印。
- `DownloadPlugin`：单图、批量或全部下载。
- `AiTagsPlugin`：通过外部 provider 生成标签。
- `AiSearchPlugin`：通过外部 provider 提取特征并相似搜索。

AI 插件不得在 Gallery Engine 内绑定具体 AI SDK。Vue 应注入 provider，并负责展示 loading、错误和结果。

```ts
import { AiTagsPlugin } from "@gallery-engine/plugins";

const aiTagsPlugin = new AiTagsPlugin({
  provider: {
    generateTags: async ({ image }) => ["gallery", image.category ?? "image"]
  },
  renderTags: false
});

gallery.use(aiTagsPlugin);
```

## 错误处理

Vue 组件必须暴露清晰的错误边界：

- 容器不存在：直接返回或抛出明确错误。
- 图片缺失：抛出包含 image id 的错误。
- 加载失败：由 `ImageLoader` 状态驱动 UI。
- 插件 provider 失败：保留原始错误对象，并在 UI 中显示简短错误文案。

不要吞掉 Gallery Engine 事件中的错误。需要记录时，把错误转换为结构化状态：

```ts
interface VueGalleryError {
  readonly source: "image" | "layout" | "preview" | "plugin";
  readonly message: string;
  readonly cause?: unknown;
}
```

## 性能实践

优先做到：

- 图片对象保持稳定 id。
- 布局计算只在图片、容器宽度或布局配置变化时执行。
- resize 处理节流。
- 大列表使用 `VirtualEngine`。
- 图片加载使用 `ImageLoader` 并发控制。
- 预览大图提前加载或缓存。
- 避免在 Vue 模板中渲染上千个图片节点。

避免做到：

- 每次响应式更新都重建 Gallery 实例。
- 每次 render 都 new 所有插件。
- 在 watch 中深度监听完整图片数组。
- 把 DOM 节点、Gallery 实例、Renderer 实例放入可序列化业务状态。

## 测试策略

每个 Vue 集成任务至少覆盖：

- 单元测试：组合式函数的初始化、事件同步、卸载清理。
- 布局测试：Grid、Masonry、Justified 的输入输出稳定。
- 图片加载测试：成功、失败、重试、并发控制。
- E2E 测试：图片渲染、懒加载、预览打开关闭、滚动加载。
- 性能测试：大数据量下渲染和滚动不退化。

运行顺序：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm benchmark
pnpm build
```

## 功能点对照清单

使用本节逐项确认 Vue 集成是否覆盖 Gallery Engine 已开发能力。实现业务页面时不必一次接入所有能力，但应明确每项能力在 Vue 层的推荐落点。

| Epic / Feature       | Vue 推荐用法                                                                      | 检查重点                                                |
| -------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1.1 Monorepo 初始化  | 在 Vue 示例或业务包中通过 workspace 依赖引用 `@gallery-engine/*` 包。             | 使用 pnpm workspace，不复制源码，不新增重复构建配置。   |
| 1.2 Package 基础结构 | 只从包入口导入命名导出。                                                          | 不使用深层私有路径，不使用 default import。             |
| 2.1 EventBus         | 通过 `gallery.on(...)` 同步 Vue 状态，必要时封装事件订阅清理函数。                | 覆盖 `on/off/emit/once`，卸载时取消订阅。               |
| 2.2 ConfigManager    | Vue 传入用户配置，运行时更新使用 `gallery.update()` 或 `ConfigManager.update()`。 | 保持配置不可变，数组配置使用替换语义。                  |
| 2.3 Gallery 主类     | 在 `onMounted` 中创建并 `init()`，在 `onBeforeUnmount` 中 `destroy()`。           | 覆盖 `init/update/destroy/add/addMany/remove/replace`。 |
| 3.1 ImageLoader      | 用 `ImageLoader` 管理请求、`decode()`、重试、状态和并发。                         | Vue 只展示状态，不手写图片加载状态机。                  |
| 3.2 CacheManager     | 缓存图片元数据、加载结果、AI 标签或搜索特征。                                     | 设置容量、TTL、LRU 策略，避免缓存无界增长。             |
| 4.1 Layout 接口      | 把业务布局封装成 `Layout` 实现，再通过 `calculate()` 得到渲染输入。               | 新布局必须稳定返回 `LayoutResult`。                     |
| 4.2 GridLayout       | 用于等宽网格、管理后台、规则卡片墙。                                              | 检查列数、gap、缺省尺寸和容器宽度变化。                 |
| 4.3 MasonryLayout    | 用于瀑布流和高度差异明显的图片集。                                                | 检查最短列放置、响应式列宽、布局高度。                  |
| 4.4 JustifiedLayout  | 用于摄影墙、作品集和行宽填满展示。                                                | 检查目标行高、宽高比、gap、最后一行策略。               |
| 5.1 Renderer         | Vue 提供容器，`Renderer.render()` 管理图片节点。                                  | 不让 Vue `v-for` 与 Renderer 同时渲染同一批图片。       |
| 5.2 Lazy Load        | 使用 `LazyObserver` 观察图片占位节点，进入视口后设置真实 src。                    | 配置 `root/rootMargin/threshold/once`。                 |
| 5.3 Infinite Scroll  | 用 Vue 保存当前可见批次状态，`InfiniteScroll` 决定何时加载更多。                  | 检查 `batchSize`、`threshold`、`reset()`。              |
| 6.1 VirtualEngine    | 大数据量时只把可见范围交给渲染层。                                                | 检查 viewport、overscan、range 计算。                   |
| 6.2 ScrollManager    | 高频滚动状态交给 `ScrollManager`，Vue 只接收节流后的状态。                        | 检查 start/scroll/end 事件和清理。                      |
| 7.1 PreviewEngine    | 点击图片后调用预览实例打开，Vue 同步当前图片和打开状态。                          | 覆盖 open/close/next/prev 和边界图片。                  |
| 7.2 Zoom & Drag      | 预览图上使用 `ZoomManager` 管理缩放、拖拽、双击缩放。                             | 检查缩放上下限、pan 边界和 reset。                      |
| 7.3 Fullscreen       | 通过 `FullscreenManager` 进入或退出浏览器全屏。                                   | 检查 fullscreenchange 同步和卸载清理。                  |
| 8.1 AnimationEngine  | Vue 触发动画时机，动画执行交给 engine。                                           | 检查生命周期事件、取消和错误处理。                      |
| 8.2 内置动画         | 入场用 fade/scale，切换用 slide，预览用 zoom，局部强调用 bounce。                 | 大量节点避免同时复杂动画。                              |
| 8.3 FLIP 动画        | 布局切换和缩略图到预览图过渡优先使用 `FlipAnimation`。                            | 先记录 before/after 状态，再播放过渡。                  |
| 9.1 PluginManager    | 插件在 Gallery 实例创建后注册，随实例销毁。                                       | 检查 install/uninstall/lifecycle 事件。                 |
| 9.2 WatermarkPlugin  | Vue 提供水印配置 UI，插件负责文字或图片水印渲染。                                 | 检查位置、透明度、图片水印尺寸。                        |
| 9.3 DownloadPlugin   | Vue 触发下载命令，插件处理文件名模板、批量下载和安全字符。                        | 检查单图、批量、全部下载和 formatter。                  |
| 10.1 Auto Tagging    | Vue 注入 `AiTagsPlugin` provider，并展示标签、缓存和错误状态。                    | 不绑定具体 AI SDK，检查缓存 key 和 force。              |
| 10.2 Similar Search  | Vue 提供搜索入口，`AiSearchPlugin` 处理特征提取、相似度和排序。                   | 检查向量维度、limit、minScore、相似度算法。             |
| 11.1 Unit Tests      | 对组合式函数、布局适配、事件同步、插件 provider 写单测。                          | 覆盖成功、失败、清理和边界输入。                        |
| 11.2 E2E Tests       | 用 Playwright 验证真实页面交互。                                                  | 覆盖懒加载、预览、虚拟滚动和无限滚动。                  |
| 11.3 Benchmark       | 大图集场景跑 benchmark，记录渲染和滚动性能。                                      | 对比变更前后指标，不只看测试是否通过。                  |
| 12.1 API 文档        | 新增 Vue 集成能力时同步更新 API 文档和 generated 文档。                           | 运行 `pnpm docs:api`。                                  |
| 12.2 示例项目        | 示例应覆盖 Vanilla、Vue、React、大数据量等典型场景。                              | 示例依赖写入 workspace 和 lockfile。                    |

## Vue 实现决策树

按以下顺序选择实现方式：

1. 只是展示几十张图片：`Gallery` + `Renderer` + `GridLayout` 或 `MasonryLayout`。
2. 图片需要进入视口再加载：加入 `LazyObserver` 和 `ImageLoader`。
3. 图片数量持续增长：加入 `InfiniteScroll`。
4. 图片数量达到上千级：使用 `VirtualEngine` + `ScrollManager`。
5. 需要点击查看大图：加入 `PreviewEngine`、`ZoomManager`、`FullscreenManager`。
6. 需要布局切换或预览过渡：加入 `AnimationEngine` 或 `FlipAnimation`。
7. 需要业务扩展：优先写 `Plugin`，不要改 Gallery 核心。
8. 需要 AI 标签或相似搜索：注入 provider，保持 Gallery Engine 与具体 AI SDK 解耦。

## 文档维护要求

当 Vue 集成新增或调整功能时，同步检查：

- `reference/gallery-engine-api.md` 是否需要补充 API 或示例。
- `docs/api/generated/*.md` 是否需要通过 `pnpm docs:api` 更新。
- `examples/vue` 是否仍是最佳实践示例。
- `reference/gallery-engine-tasks.md` 是否需要更新任务状态。
- 本 Skill 是否需要补充新的 Vue 使用约定。

## 代码审查清单

提交前检查：

- 是否没有 `any` 和 `export default`。
- 是否所有公开入口都是命名导出。
- 是否在 `onBeforeUnmount` 中销毁实例和监听器。
- 是否没有让 Vue 与 `Renderer` 争用同一 DOM。
- 是否通过 Gallery Engine 事件同步状态，而不是读取内部私有状态。
- 是否为新增能力补充测试。
- 是否更新 API 文档、示例或任务状态。
- 是否运行必要验证命令。

## 推荐输出形态

当用户要求“用 Vue 接入 Gallery Engine”时，优先输出：

1. 一个组合式函数，例如 `useGalleryEngine()`。
2. 一个轻量 Vue 组件示例。
3. 必要的 CSS 容器约束。
4. 对应测试。
5. 文档说明和运行命令。

保持 Vue 层薄、Gallery Engine 层清晰、事件边界明确。
