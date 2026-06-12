# Gallery Engine 开发路线图

## 项目概述

Gallery Engine 是一个基于 TypeScript 构建的高性能图片画廊引擎。

核心目标：

- 大规模图片数据流畅渲染
- 懒加载与无限滚动
- 多种布局模式
- GSAP 动画驱动
- 全屏沉浸式预览
- 框架无关
- 插件化扩展
- 面向未来 AI 能力集成

---

## 核心设计原则

### Performance First

优先保证性能，即使面对 10000+ 图片依然保持流畅滚动。

### Motion First

动画是整个产品体验的重要组成部分，所有过渡均支持 GSAP 驱动。

### Framework Agnostic

不依赖 Vue、React、Angular，能够在任意框架中运行。

### Plugin Driven

所有高级功能尽量插件化，例如：

```ts
gallery.use(new WatermarkPlugin())
gallery.use(new DownloadPlugin())
```

### Type Safe

完整 TypeScript 类型支持。

---

## 技术栈

### Runtime

- TypeScript
- ES Module

### Build

- Vite
- Rollup

### Animation

- GSAP
- GSAP Flip
- GSAP ScrollTrigger

### Testing

- Vitest
- Playwright

### Documentation

- VitePress

---

## 项目目录规范

```text
gallery-engine/
├── packages/
│   ├── core/
│   ├── layouts/
│   ├── preview/
│   ├── animations/
│   ├── plugins/
│   └── shared/
├── docs/
├── examples/
├── playground/
├── tests/
└── scripts/
```

---

## 阶段一：基础能力

### 图片数据结构

```ts
export interface GalleryImage {
  id: string
  src: string
  width?: number
  height?: number
  thumbnail?: string
  alt?: string
  metadata?: Record<string, any>
}
```

### Gallery 初始化

```ts
new Gallery({
  container,
  images
})
```

要求：

- 自动挂载
- 自动渲染
- 自动销毁

### Grid 布局

```ts
layout: 'grid'
```

配置：

```ts
columns: 4
gap: 12
```

### 图片懒加载

基于 IntersectionObserver，支持 rootMargin 配置。

### 无限滚动

```ts
batchSize: 20
```

支持分批渲染与自动追加。

### 图片预览

支持点击打开、遮罩关闭、ESC 关闭、左右切换。

### GSAP 入场动画

```ts
animation: {
  enter: true
}
```

效果包括 Fade In 与 Slide Up。

---

## 阶段二：体验增强

### Masonry 瀑布流

```ts
layout: 'masonry'
```

支持动态列数与响应式布局。

### Skeleton 骨架屏

图片加载前显示占位块，加载完成后淡入替换。

### 图片预加载

后台提前缓存下一批图片，降低等待时间。

### 图片占位比例计算

根据 width 与 height 计算 aspect-ratio，避免布局抖动。

### GSAP Stagger

```ts
stagger: 0.05
```

实现依次出现动画。

### ScrollTrigger

图片进入视口时触发 Opacity、Scale、Rotate 等动画。

### 键盘控制

支持 ←、→、ESC、Space、Home、End。

---

## 阶段三：高性能渲染

### Virtual Scroll Engine

核心目标是只渲染可见区域。

例如：

```text
10000张图片
实际渲染 30~100 个 DOM 节点
```

### DOM 回收机制

离开缓冲区自动卸载，进入缓冲区重新挂载。

### 滚动位置缓存

支持刷新恢复与路由返回恢复。

### 图片缓存池

支持内存缓存与磁盘缓存。

### Worker 支持

复杂布局计算交给 Web Worker，避免阻塞主线程。

---

## 阶段四：高级预览系统

### 全屏预览

支持 F11 与浏览器全屏模式。

### GSAP FLIP 动画

点击缩略图后：

```text
缩略图
  ↓
变形
  ↓
全屏
```

关闭时反向执行。

### 图片缩放

支持鼠标滚轮、双击与 Pinch 缩放。

### 拖拽平移

支持鼠标拖拽与触摸拖拽。

### 惯性滚动

移动端支持 Momentum 效果。

### 图片切换动画

支持 Fade、Slide、Zoom、Flip 等切换方式。

### 手势系统

支持 Swipe、Pinch、Double Tap。

---

## 阶段五：布局系统扩展

### Justified Layout

类似 Google Photos 的排版方式。

### Timeline Layout

支持按时间分组展示。

### Horizontal Layout

支持横向滚动画廊。

### Carousel Layout

支持轮播模式。

### 自定义布局

开放 `registerLayout()` 注册自定义布局。

---

## 阶段六：动画系统扩展

### 动画引擎抽象层

统一管理：

- GSAP
- CSS Animation
- Web Animation API

### 动画生命周期

支持：

- beforeEnter
- enter
- afterEnter
- beforeLeave
- leave
- afterLeave

### 动画预设

内置：

- Fade
- Scale
- Slide
- Zoom
- Flip
- Bounce

### 动态主题动画

支持 Light、Dark 与自定义主题。

---

## 阶段七：插件系统

### 插件注册

```ts
gallery.use(plugin)
```

### 生命周期

- onInit
- onLoad
- onRender
- onPreview
- onDestroy

### Watermark Plugin

支持文字水印、图片水印、Logo 水印。

### Download Plugin

支持下载原图与批量下载。

### Share Plugin

支持复制链接与二维码分享。

### Exif Plugin

支持展示拍摄设备、ISO、镜头与快门信息。

### Filter Plugin

支持分类筛选、颜色筛选与标签筛选。

---

## 阶段八：AI 扩展能力

### 自动标签

自动识别风景、建筑、宠物、人物等标签。

### 图片聚类

自动生成相似图片分组。

### 图片搜索

```ts
gallery.search()
```

### 颜色搜索

支持按红色系、蓝色系、绿色系筛选。

### 相似图片推荐

根据视觉特征寻找相似图片。

---

## 公开 API

### 初始化

```ts
const gallery = new Gallery({
  container: '#gallery',
  images,
  layout: 'masonry'
})
```

### 方法

```ts
gallery.loadMore()
gallery.refresh()
gallery.destroy()
gallery.open(index)
gallery.close()
gallery.next()
gallery.prev()
gallery.search(keyword)
gallery.use(plugin)
```

### 事件

```ts
gallery.on('init')
gallery.on('loadMore')
gallery.on('imageClick')
gallery.on('previewOpen')
gallery.on('previewClose')
gallery.on('layoutChange')
gallery.on('destroy')
```

---

## 性能目标

### 首屏渲染

≤ 500ms

### 滚动性能

55~60 FPS

### 虚拟滚动模式

DOM < 100

### 内存占用

保持稳定增长，避免随着图片数量线性增长。

---

## 最终目标

打造一个面向现代 Web 的高性能图片画廊引擎：

- Performance First
- Motion First
- Framework Agnostic
- Plugin Driven
- AI Ready

不仅是图片展示组件，而是一个完整的 Gallery Engine。
