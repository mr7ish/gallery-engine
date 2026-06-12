# Gallery Engine 架构设计文档

## 架构目标

Gallery Engine 采用 Core + Engine + Plugin 架构模式。

设计目标：

- 高内聚
- 低耦合
- 可扩展
- 可维护
- 可测试

---

## 总体架构

```text
┌──────────────────────────┐
│         Gallery          │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│        Event Bus         │
└────────────┬─────────────┘
             │
  ┌──────────┼──────────┐
  ▼          ▼          ▼
Layout     Render     Preview
Engine     Engine     Engine

  ▼          ▼          ▼
Virtual    Image     Animation
Engine     Loader      Engine

             │
             ▼
           Plugins
```

---

## 模块划分

### Gallery

唯一对外暴露对象。

职责：

- 初始化
- 生命周期管理
- 配置管理
- 插件管理

```ts
class Gallery {
  init()
  destroy()
  refresh()
  use(plugin)
}
```

### Event Bus

所有模块通信中心，禁止模块直接互相调用。

示例：

```ts
emit('image:load')
emit('preview:open')
emit('layout:update')
emit('scroll:end')
```

### Config Manager

负责默认配置、用户配置与运行时配置的合并。

```ts
const config = mergeConfig(defaultConfig, userConfig)
```

### Image Loader

负责图片请求、缓存、失败重试与预加载。

状态机：

```text
idle → loading → loaded → error
```

```ts
interface ImageState {
  status: 'idle' | 'loading' | 'loaded' | 'error'
}
```

### Layout Engine

负责 Grid、Masonry、Justified、Timeline 等布局计算。

```ts
interface Layout {
  calculate(items): LayoutResult
}
```

输出：

```ts
interface LayoutItem {
  x:number
  y:number
  width:number
  height:number
}
```

### Render Engine

只负责 DOM 的创建、更新与销毁，不包含业务逻辑。

### Virtual Engine

负责：

- 可见区域计算
- 缓冲区计算
- 节点回收
- 节点复用

示例：

```text
10000张图片
实际渲染 80张
```

```ts
interface VirtualRange {
  start:number
  end:number
}
```

计算流程：

```text
scroll → viewport → range → render
```

### Observer Engine

统一封装：

- IntersectionObserver
- ResizeObserver
- MutationObserver

避免重复创建 Observer。

### Preview Engine

负责：

- 打开
- 关闭
- 切换
- 缩放
- 拖拽

```ts
interface PreviewState {
  visible:boolean
  current:number
  zoom:number
}
```

### Animation Engine

统一管理 GSAP，禁止各模块直接调用 gsap。

```ts
interface Animation {
  play()
  reverse()
  destroy()
}
```

### Flip Engine

负责 FLIP 动画：

```text
获取旧状态 → 移动节点 → 获取新状态 → GSAP Flip
```

用于缩略图与预览图之间的平滑转换。

### Cache Manager

管理：

- Image Cache
- Layout Cache
- Preview Cache

```ts
Map<string, any>
```

支持 LRU 与 TTL 策略。

### Plugin Manager

负责插件注册与生命周期管理。

```ts
interface Plugin {
  name:string
  install(gallery):void
}
```

生命周期：

- onInit
- onLoad
- onRender
- onPreview
- onDestroy

---

## 数据流

### 初始化

```text
Gallery → Config → Layout → Render
```

### 滚动

```text
Scroll → Virtual → Layout → Render
```

### 图片加载

```text
Image Loader → Cache → Render
```

### 图片预览

```text
Click → Preview → Animation → Render
```

---

## 事件流

### 打开预览

```text
image:click
  ↓
preview:before-open
  ↓
preview:open
  ↓
animation:start
  ↓
animation:end
```

### 图片加载

```text
image:before-load
  ↓
image:loading
  ↓
image:loaded
```

### 布局更新

```text
layout:before-update
  ↓
layout:update
  ↓
render:update
```

---

## 性能优化策略

### 避免频繁重排

统一通过 requestAnimationFrame 更新。

### Observer 替代 Scroll

优先使用 IntersectionObserver。

### 图片解码

支持：

```ts
img.decode()
```

### Worker 计算布局

复杂布局交给 Web Worker。

### DOM 复用池

离开视口时进入对象池，重新进入时直接复用。

---

## 错误处理

统一 Error Center。

错误类型：

```ts
ImageLoadError
LayoutError
PluginError
AnimationError
```

统一派发：

```ts
emit('error')
```

---

## 最终架构原则

- Gallery 只负责协调
- Engine 只负责计算
- Render 只负责渲染
- Plugin 只负责扩展
- Event Bus 负责通信

任何模块都不允许跨层直接依赖。
