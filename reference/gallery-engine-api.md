# Gallery Engine API 设计规范

## 核心原则

### 配置优先

所有能力优先通过配置驱动。

```ts
new Gallery({
  layout: 'masonry',
  virtual: true,
  preview: true
})
```

### 类型优先

所有公开 API 必须具有完整 TypeScript 类型。

### 事件驱动

所有外部交互通过事件暴露。

```ts
gallery.on('preview:open')
```

---

## GalleryConfig

```ts
import { ConfigManager, DEFAULT_GALLERY_CONFIG, mergeConfig } from '@gallery-engine/core'

interface UserGalleryConfig {
  container: string | HTMLElement
  images: GalleryImage[]
  layout?: Partial<LayoutConfig>
  virtual?: Partial<VirtualScrollConfig>
  preview?: Partial<PreviewConfig>
  animation?: Partial<AnimationConfig>
  lazyLoad?: Partial<LazyLoadConfig>
  preload?: Partial<PreloadConfig>
  cache?: Partial<CacheConfig>
  theme?: Partial<ThemeConfig>
}

const configManager = new ConfigManager({
  container: '#gallery',
  images: []
})

const config = configManager.getConfig()
const updatedConfig = configManager.update({
  lazyLoad: {
    rootMargin: '300px'
  }
})
```

说明：

- `container` 与 `images` 是用户配置必填项
- 其他配置与 `DEFAULT_GALLERY_CONFIG` 深度合并
- 数组配置采用替换语义，不按索引合并
- `mergeConfig(baseConfig, overrideConfig)` 可用于独立合并普通配置对象

---

## GalleryImage

```ts
interface GalleryImage {
  id: string
  src: string
  thumbnail?: string
  alt?: string
  title?: string
  description?: string
  width?: number
  height?: number
  metadata?: Record<string, unknown>

  // 扩展字段
  createdAt?: Date
  tags?: string[]
  category?: string
  color?: string
}
```

---

## LayoutConfig

### Grid

```ts
interface GridLayoutConfig {
  columns?: number
  gap?: number
}
```

### Masonry

```ts
interface MasonryLayoutConfig {
  columns?: number
  gap?: number
  minColumnWidth?: number
}
```

### Justified

```ts
interface JustifiedLayoutConfig {
  rowHeight?: number
  gap?: number
}
```

### Timeline

```ts
interface TimelineLayoutConfig {
  groupBy?: string
}
```

---

## VirtualScrollConfig

```ts
interface VirtualScrollConfig {
  enabled: boolean
  overscan?: number
  recycle?: boolean
}
```

说明：

```text
overscan 表示额外渲染区域
```

例如：

```text
可视区域20张
overscan = 10
实际渲染40张
```

### VirtualEngine

```ts
import { VirtualEngine } from '@gallery-engine/core'
import type { VirtualItem, VirtualViewport } from '@gallery-engine/core'

const virtualEngine = new VirtualEngine({
  overscan: 200
})

const items: readonly VirtualItem[] = [
  {
    id: 'hero',
    x: 0,
    y: 0,
    width: 240,
    height: 180
  }
]

virtualEngine.setItems(items)

const viewport: VirtualViewport = {
  scrollTop: 0,
  height: 600
}

const result = virtualEngine.calculate(viewport)
```

说明：

- `VirtualEngine` 基于已完成布局的 `x`、`y`、`width`、`height` 计算可见范围
- `overscan` 使用像素值向视口上下扩展，避免滚动时频繁抖动
- `calculate()` 返回 `range`、`visibleItems`、`retainedIds` 与 `recycledIds`
- `retainedIds` 表示本次需要保留或复用的节点 ID
- `recycledIds` 表示上一次保留但本次不可见的节点 ID，可交给 Renderer 回收
- `reset()` 只清空保留状态，不移除已设置的布局数据

---

## LazyLoadConfig

```ts
interface LazyLoadConfig {
  enabled: boolean
  rootMargin?: string
  threshold?: number
}
```

默认：

```ts
{
  enabled: true,
  rootMargin: '200px',
  threshold: 0
}
```

---

## PreloadConfig

```ts
interface PreloadConfig {
  enabled: boolean
  distance?: number
  maxConcurrent?: number
}
```

示例：

```ts
{
  enabled:true,
  distance:20,
  maxConcurrent:4
}
```

---

## PreviewConfig

```ts
interface PreviewConfig {
  enabled:boolean
  fullscreen?:boolean
  zoom?:boolean
  drag?:boolean
  keyboard?:boolean
  gesture?:boolean
}
```

---

## AnimationConfig

```ts
interface AnimationConfig {
  enabled:boolean
  enter?:AnimationPreset
  leave?:AnimationPreset
  preview?:AnimationPreset
  stagger?:number
}
```

### AnimationPreset

```ts
type AnimationPreset =
  | 'fade'
  | 'slide'
  | 'zoom'
  | 'flip'
  | 'scale'
  | 'bounce'
```

### AnimationEngine

```ts
import { AnimationEngine } from '@gallery-engine/animations'
import type { GsapAnimationAdapter } from '@gallery-engine/animations'

const adapter: GsapAnimationAdapter = {
  to: (target, vars) => gsap.to(target, vars),
  from: (target, vars) => gsap.from(target, vars),
  fromTo: (target, fromVars, toVars) => gsap.fromTo(target, fromVars, toVars)
}

const animationEngine = new AnimationEngine({
  adapter,
  hooks: {
    complete: event => {
      event.name
    }
  }
})

animationEngine.register({
  name: 'fade-in',
  vars: {
    opacity: 1,
    duration: 0.2
  }
})

animationEngine.play('fade-in', {
  target: document.querySelector('.gallery-engine__item')!
})
```

说明：

- `AnimationEngine` 通过 `GsapAnimationAdapter` 封装 GSAP-compatible 的 `to`、`from` 与 `fromTo`
- `register()` 注册命名动画，`unregister()` 移除动画
- `play()` 播放命名动画并返回底层 playback
- 生命周期 Hook 支持 `before-start`、`start`、`complete` 与 `cancel`
- Hook 可在 engine、definition 与 play options 三层配置，并按顺序组合执行
- `cancel()` 会调用底层 playback 的 `kill()`，`clear()` 会取消活跃动画并清空注册表

### 内置动画预设

```ts
import {
  createFadePreset,
  createSlidePreset,
  createScalePreset,
  createZoomPreset,
  createBouncePreset,
  registerBuiltInAnimationPresets
} from '@gallery-engine/animations'

animationEngine.register(createFadePreset())
animationEngine.register(createSlidePreset({ axis: 'x', distance: 40 }))
animationEngine.register(createScalePreset())
animationEngine.register(createZoomPreset({ transformOrigin: 'top left' }))
animationEngine.register(createBouncePreset())

registerBuiltInAnimationPresets(animationEngine, {
  fade: {
    duration: 0.16
  }
})
```

说明：

- 内置预设包含 `fade`、`slide`、`scale`、`zoom` 与 `bounce`
- 每个预设返回一个 `AnimationDefinition`，可直接传入 `AnimationEngine.register()`
- `slide` 支持 `axis` 与 `distance`
- `scale`、`zoom` 与 `bounce` 支持调整初始 scale
- `registerBuiltInAnimationPresets()` 可一次性注册全部内置预设

### FlipAnimation

```ts
import { FlipAnimation } from '@gallery-engine/animations'
import type { GsapFlipAdapter } from '@gallery-engine/animations'

const flipAdapter: GsapFlipAdapter = {
  getState: target => Flip.getState(target),
  from: (state, vars) => Flip.from(state, vars)
}

const flipAnimation = new FlipAnimation({
  adapter: flipAdapter,
  vars: {
    duration: 0.35,
    ease: 'power2.inOut'
  }
})

flipAnimation.open(
  {
    thumbnail: thumbnailElement,
    preview: previewElement
  },
  {
    applyTargetState: () => {
      previewElement.hidden = false
    }
  }
)

flipAnimation.close(
  {
    thumbnail: thumbnailElement,
    preview: previewElement
  },
  {
    applyTargetState: () => {
      previewElement.hidden = true
    }
  }
)
```

说明：

- `FlipAnimation` 通过 `GsapFlipAdapter` 封装 GSAP Flip 的 `getState()` 与 `from()`
- `captureThumbnailState()` 获取缩略图状态
- `capturePreviewState()` 获取预览图状态
- `open()` 从缩略图状态过渡到预览状态
- `close()` 从预览状态反向过渡到缩略图状态
- `applyTargetState` 在捕获起点后执行，用于切换 DOM 到目标状态
- `cancel()` 会调用当前 playback 的 `kill()`

---

## ThemeConfig

```ts
interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto'
  primaryColor?:string
}
```

---

## Gallery 实例

### 创建实例

```ts
import { Gallery } from '@gallery-engine/core'

const gallery = new Gallery({
  container: '#gallery',
  images
})
```

---

## 生命周期方法

### init

```ts
gallery.init()
```

初始化配置、解析容器并派发：

```text
init
mounted
```

### destroy

```ts
gallery.destroy()
```

销毁 DOM、Observer、Event 与 Plugin。

### refresh

```ts
gallery.refresh()
```

重新计算 Layout、Render 与 Virtual Range。

当前核心阶段派发：

```text
layout:update
updated
```

### update

```ts
gallery.update(partialConfig)
```

动态更新配置。

返回合并后的 `GalleryConfig`，并派发 `updated`。

### use

```ts
gallery.use(plugin)
```

安装插件并派发 `plugin:install`。

---

## 数据方法

### add

```ts
gallery.add(image)
```

### addMany

```ts
gallery.addMany(images)
```

### remove

```ts
gallery.remove(id)
```

### clear

```ts
gallery.clear()
```

### replace

```ts
gallery.replace(images)
```

---

## 预览方法

### open

```ts
import { PreviewEngine } from '@gallery-engine/preview'

const preview = new PreviewEngine({
  items,
  keyboard: true,
  onChange: state => {
    state.current
  }
})

preview.open(index)
```

### close

```ts
preview.close()
```

### next

```ts
preview.next()
```

### prev

```ts
preview.prev()
```

### zoomIn

```ts
preview.zoomIn()
```

### zoomOut

```ts
preview.zoomOut()
```

### resetZoom

```ts
preview.resetZoom()
```

说明：

- `PreviewEngine` 管理 `visible`、`current`、`zoom` 与当前预览项
- 打开预览时会夹紧索引并重置缩放
- `next()` / `prev()` 支持首尾循环
- 键盘开启时支持 `ArrowLeft`、`ArrowRight`、`Space`、`Home`、`End`、`Escape`
- `destroy()` 会解除键盘监听

### ZoomManager

```ts
import { ZoomManager } from '@gallery-engine/preview'

const zoomManager = new ZoomManager({
  target: document.querySelector('.preview-image')!,
  minZoom: 1,
  maxZoom: 4,
  zoomStep: 0.25,
  doubleClickZoom: 2,
  onChange: state => {
    state.zoom
    state.panX
    state.panY
  }
})

zoomManager.attach()
```

说明：

- `ZoomManager` 管理预览图的 `zoom`、`panX`、`panY`、拖拽与 Pinch 状态
- 滚轮向上放大，滚轮向下缩小，并自动限制在 `minZoom` 与 `maxZoom` 之间
- 双击在 `doubleClickZoom` 与 `minZoom` 之间切换，回到最小缩放时会重置平移
- 指针拖拽在放大后更新平移位置
- 双指 Pinch 根据两指距离变化计算缩放
- `detach()` 会解除 DOM 监听，`destroy()` 会解除监听并重置状态

### FullscreenManager

```ts
import { FullscreenManager } from '@gallery-engine/preview'

const fullscreenManager = new FullscreenManager({
  target: document.querySelector('.preview-shell')!,
  keyboard: true,
  onChange: state => {
    state.active
    state.element
  }
})

fullscreenManager.attach()
await fullscreenManager.enter()
await fullscreenManager.exit()
```

说明：

- `FullscreenManager` 封装浏览器 Fullscreen API
- `enter()`、`exit()` 与 `toggle()` 返回当前全屏状态
- `keyboard: true` 时监听 `F11` 并切换全屏
- `fullscreenchange` 会同步 `active`、`element`、`target` 与 `available`
- `sync()` 可手动读取文档全屏状态并通知 `onChange`
- `detach()` 会解除 DOM 监听，`destroy()` 会解除监听并清空目标引用

---

## 布局方法

### setLayout

```ts
gallery.setLayout('masonry')
```

### registerLayout

```ts
gallery.registerLayout(layout)
```

---

## 渲染系统

### Renderer

```ts
import { Renderer } from '@gallery-engine/core'

const renderer = new Renderer({
  container: document.querySelector('#gallery')!
})

renderer.render([
  {
    id: 'hero',
    image,
    x: 0,
    y: 0,
    width: 240,
    height: 180
  }
])
```

说明：

- `Renderer` 只负责 DOM 创建、更新、销毁与节点复用
- `RenderItem` 是布局计算后的渲染输入
- `render([])` 或 `clear()` 会回收当前节点进入复用池
- `destroy()` 会清空容器、已渲染节点与复用池

### LazyObserver

```ts
import { LazyObserver } from '@gallery-engine/core'

const lazyObserver = new LazyObserver({
  rootMargin: '200px',
  threshold: 0,
  onLoad: ({ element, data }) => {
    element.setAttribute('src', data.src)
  }
})

lazyObserver.observe(imageElement, {
  id: image.id,
  src: image.src
})
```

说明：

- `LazyObserver` 封装 `IntersectionObserver`
- `root`、`rootMargin`、`threshold` 透传给原生观察器
- 默认 `once: true`，元素首次进入视口后自动取消观察
- `disconnect()` 会清空所有观察目标

### InfiniteScroll

```ts
import { InfiniteScroll } from '@gallery-engine/core'

const infiniteScroll = new InfiniteScroll({
  items,
  batchSize: 20,
  threshold: 200,
  onLoadMore: state => {
    state.visibleItems
  }
})

const state = infiniteScroll.handleScroll({
  scrollTop: container.scrollTop,
  clientHeight: container.clientHeight,
  scrollHeight: container.scrollHeight
})
```

说明：

- `batchSize` 控制每次新增可见数据量
- `threshold` 表示距离底部多少像素内触发加载
- `loadMore()` 可手动加载下一批
- `updateItems()` 可替换全集数据并保持加载范围合理
- `reset()` 会重置为首批数据

### ScrollManager

```ts
import { ScrollManager } from '@gallery-engine/core'

const scrollManager = new ScrollManager({
  target: document.querySelector('#gallery')!,
  endDelay: 120,
  onScrollStart: state => {
    state.isScrolling
  },
  onScroll: state => {
    state.scrollTop
  },
  onScrollEnd: state => {
    state.isScrolling
  }
})

scrollManager.start()
scrollManager.savePosition('gallery')
scrollManager.restorePosition('gallery')
```

说明：

- `ScrollManager` 封装滚动监听，支持 `HTMLElement`、`Document` 与 `Window`
- `onScroll` 通过 `requestAnimationFrame` 节流，每帧最多触发一次
- `endDelay` 控制滚动停止后触发 `onScrollEnd` 的延迟时间
- `savePosition()`、`restorePosition()`、`getCachedPosition()` 与 `clearPosition()` 管理滚动位置缓存
- `stop()` 会移除监听并取消待执行的帧回调与结束检测
- `destroy()` 会停止监听并清空位置缓存

---

## 搜索方法

### search

```ts
gallery.search(keyword)
```

### filter

```ts
gallery.filter(fn)
```

### resetFilter

```ts
gallery.resetFilter()
```

---

## 缓存方法

### clearCache

```ts
gallery.clearCache()
```

### getCacheSize

```ts
gallery.getCacheSize()
```

---

## 插件系统

### Plugin

```ts
interface Plugin {
  name: string
  install(gallery: Gallery): void
  destroy?(gallery: Gallery): void
  onInit?(gallery: Gallery, payload: unknown): void
  onLoad?(gallery: Gallery, payload: unknown): void
  onRender?(gallery: Gallery, payload: unknown): void
  onPreview?(gallery: Gallery, payload: unknown): void
  onDestroy?(gallery: Gallery, payload: unknown): void
}
```

### 注册插件

```ts
gallery.use(new WatermarkPlugin())
```

### WatermarkPlugin

```ts
import { WatermarkPlugin } from '@gallery-engine/plugins'

gallery.use(
  new WatermarkPlugin({
    text: 'Private',
    position: 'bottom-right',
    offset: {
      x: 16,
      y: 16
    },
    opacity: 0.72
  })
)

gallery.use(
  new WatermarkPlugin({
    image: {
      src: '/brand-watermark.png',
      alt: 'Brand',
      width: 120
    },
    position: 'center'
  })
)
```

说明：
- `WatermarkPlugin` 渲染非交互式 DOM 水印，不拦截鼠标事件
- 支持文字水印、图片水印、透明度、层级、className、偏移量配置
- `position` 支持九宫格位置：`top-left`、`top-center`、`top-right`、`center-left`、`center`、`center-right`、`bottom-left`、`bottom-center`、`bottom-right`
- 插件卸载或 `destroy` 生命周期会移除水印 DOM，并恢复由插件修改的容器定位样式

### 卸载插件

```ts
gallery.unuse(pluginName)
```

### 生命周期调度

```ts
gallery.dispatchPluginLifecycle('init')
gallery.dispatchPluginLifecycle('render', {
  visibleCount: 20
})
```

### PluginManager

```ts
import { PluginManager } from '@gallery-engine/core'

const pluginManager = new PluginManager({
  context: gallery,
  onInstall: event => {
    event.name
  },
  onLifecycle: event => {
    event.phase
  }
})

pluginManager.install(plugin)
pluginManager.dispatch('render')
pluginManager.uninstall(plugin.name)
```

说明：

- `PluginManager` 管理插件注册、生命周期调度与卸载
- 插件名称必须唯一
- `dispatch()` 支持 `init`、`load`、`render`、`preview`、`destroy`
- `clear()` 会按注册顺序反向卸载插件
- `Gallery.use()` 与 `Gallery.unuse()` 基于 `PluginManager` 实现

---

## 自定义布局

### Layout

```ts
import { GridLayout, LayoutRegistry } from '@gallery-engine/layouts'

interface Layout<TItem extends LayoutInputItem = LayoutInputItem> {
  name: string
  calculate(items: readonly TItem[], context: LayoutCalculationContext): LayoutResult
}
```

### LayoutResult

```ts
interface LayoutResult {
  width: number
  height: number
  items: readonly LayoutItem[]
}
```

### LayoutRegistry

```ts
const registry = new LayoutRegistry()
registry.registerLayout(new GridLayout())

const layout = registry.getLayout('grid')
```

### GridLayout

```ts
const grid = new GridLayout({
  columns: 4,
  gap: 12
})

const result = grid.calculate(images, {
  containerWidth: 960
})
```

说明：

- `columns` 指定固定列数
- `gap` 指定行列间距
- 未设置 `columns` 且设置 `minColumnWidth` 时，会根据容器宽度计算响应式列数
- 图片存在 `width` 与 `height` 时按比例计算高度，否则使用方形占位

### MasonryLayout

```ts
import { MasonryLayout } from '@gallery-engine/layouts'

const masonry = new MasonryLayout({
  minColumnWidth: 240,
  gap: 12
})

const result = masonry.calculate(images, {
  containerWidth: 960
})
```

说明：

- 每个图片会放入当前最短列
- `columns` 可指定固定列数
- 未设置 `columns` 时通过 `minColumnWidth` 计算响应式列数
- 图片存在 `width` 与 `height` 时按比例计算高度，否则使用方形占位

---

## Event API

### EventBus

```ts
import { EventBus } from '@gallery-engine/core'

interface GalleryEvents {
  'image:loaded': {
    id: string
    src: string
  }
  'preview:close': undefined
}

const eventBus = new EventBus<GalleryEvents>()
```

### 注册事件

```ts
const unsubscribe = eventBus.on('image:loaded', payload => {
  payload.id
})
```

### 单次事件

```ts
eventBus.once('preview:close', () => {})
```

### 派发事件

```ts
eventBus.emit('image:loaded', {
  id: 'hero',
  src: '/hero.jpg'
})
eventBus.emit('preview:close')
```

### 监听事件

```ts
gallery.on(event, handler)
```

### 单次监听

```ts
gallery.once(event, handler)
```

### 取消监听

```ts
gallery.off(event, handler)
```

---

## 生命周期事件

```text
init
mounted
updated
destroy
```

## 图片事件

```text
image:before-load
image:loading
image:loaded
image:error
image:click
```

## 布局事件

```text
layout:before-update
layout:update
```

## 预览事件

```text
preview:before-open
preview:open
preview:close
preview:change
```

## 滚动事件

```text
scroll
scroll:start
scroll:end
```

## 虚拟滚动事件

```text
virtual:range-change
```

## 插件事件

```text
plugin:install
plugin:destroy
```

## 错误事件

```text
error
```

---

## 类型导出规范

所有公共类型统一导出：

```ts
import type {
  GalleryConfig,
  GalleryImage,
  Plugin,
  Layout
} from 'gallery-engine'
```

---

## 未来扩展保留

```ts
gallery.searchByImage(file)
gallery.findSimilar(id)
gallery.generateTags(id)
gallery.cluster()
```

---

## API 设计原则

- 新增能力优先通过新增配置项
- 新增事件必须向后兼容
- 新增插件优先独立安装
- 所有新能力优先通过 Plugin、Layout、Event 扩展，而不是修改核心模块
