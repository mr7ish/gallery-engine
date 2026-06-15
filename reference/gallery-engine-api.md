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
gallery.open(index)
```

### close

```ts
gallery.close()
```

### next

```ts
gallery.next()
```

### prev

```ts
gallery.prev()
```

### zoomIn

```ts
gallery.zoomIn()
```

### zoomOut

```ts
gallery.zoomOut()
```

### resetZoom

```ts
gallery.resetZoom()
```

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
  name:string
  install(gallery: Gallery):void
  destroy?():void
}
```

### 注册插件

```ts
gallery.use(new WatermarkPlugin())
```

### 卸载插件

```ts
gallery.unuse(pluginName)
```

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
