# Gallery Engine 任务拆解

## 任务目标

将 Gallery Engine 从文档阶段拆解为可直接开发的任务列表。

任务粒度：

```text
Epic → Feature → Task → SubTask
```

建议配合 GitHub Issues / Projects 使用。

---

## Epic 1：项目初始化

### Feature 1.1 Monorepo 初始化

- [x] 创建 pnpm workspace
- [x] 初始化 TypeScript 配置
- [x] 初始化 Vite 构建
- [x] 初始化 ESLint / Prettier
- [x] 初始化 Vitest
- [x] 初始化 Playwright
- [x] 配置 Git hooks（lint-staged）

产出：

```text
pnpm install 后可直接开发
```

---

### Feature 1.2 Package 基础结构

- [x] 创建 packages/core
- [x] 创建 packages/layouts
- [x] 创建 packages/animations
- [x] 创建 packages/preview
- [x] 创建 packages/plugins
- [x] 创建 packages/shared

产出：

```text
所有 package 可被独立构建
```

---

## Epic 2：核心引擎

### Feature 2.1 EventBus

- [x] 实现 on/off/emit/once
- [x] 添加类型安全事件映射
- [x] 编写单元测试

文件：

```text
packages/core/src/event-bus.ts
```

---

### Feature 2.2 ConfigManager

- [x] 默认配置
- [x] 深度合并逻辑
- [x] 运行时更新
- [x] 类型定义

文件：

```text
packages/core/src/config-manager.ts
```

---

### Feature 2.3 Gallery 主类

- [x] init
- [x] destroy
- [x] refresh
- [x] update
- [x] use(plugin)

文件：

```text
packages/core/src/gallery.ts
```

---

## Epic 3：图片加载系统

### Feature 3.1 ImageLoader

- [ ] 图片请求
- [ ] decode 支持
- [ ] 加载状态机
- [ ] 失败重试
- [ ] 并发控制

文件：

```text
packages/core/src/image-loader.ts
```

---

### Feature 3.2 CacheManager

- [x] ImageCache
- [x] LRU 策略
- [x] TTL 策略
- [x] 内存统计

文件：

```text
packages/shared/src/cache-manager.ts
```

---

## Epic 4：布局系统

### Feature 4.1 Layout 接口

- [x] Layout 类型定义
- [x] LayoutResult 定义
- [x] registerLayout API

文件：

```text
packages/layouts/src/types.ts
```

---

### Feature 4.2 GridLayout

- [x] 固定列布局
- [x] gap 支持
- [x] 响应式列数

文件：

```text
packages/layouts/src/grid-layout.ts
```

---

### Feature 4.3 MasonryLayout

- [x] 动态列高度
- [x] 最小列宽
- [x] 响应式布局

文件：

```text
packages/layouts/src/masonry-layout.ts
```

---

### Feature 4.4 JustifiedLayout

- [ ] 行高计算
- [ ] 比例裁剪
- [ ] gap 支持

文件：

```text
packages/layouts/src/justified-layout.ts
```

---

## Epic 5：渲染系统

### Feature 5.1 Renderer

- [x] 创建 DOM 节点
- [x] 更新节点
- [x] 销毁节点
- [x] 节点复用池

文件：

```text
packages/core/src/renderer.ts
```

---

### Feature 5.2 Lazy Load

- [x] IntersectionObserver 封装
- [x] rootMargin 支持
- [x] threshold 支持

文件：

```text
packages/core/src/lazy-observer.ts
```

---

### Feature 5.3 Infinite Scroll

- [x] batchSize 配置
- [x] 触底检测
- [x] 自动加载更多

文件：

```text
packages/core/src/infinite-scroll.ts
```

---

## Epic 6：虚拟滚动

### Feature 6.1 VirtualEngine

- [x] 可见区域计算
- [x] overscan 支持
- [x] DOM 回收
- [x] 节点复用

文件：

```text
packages/core/src/virtual-engine.ts
```

---

### Feature 6.2 ScrollManager

- [x] 滚动监听
- [x] requestAnimationFrame 节流
- [x] 滚动结束检测
- [x] 位置缓存

文件：

```text
packages/core/src/scroll-manager.ts
```

---

## Epic 7：预览系统

### Feature 7.1 PreviewEngine

- [x] open/close
- [x] next/prev
- [x] 键盘控制
- [x] 状态管理

文件：

```text
packages/preview/src/preview-engine.ts
```

---

### Feature 7.2 Zoom & Drag

- [x] 滚轮缩放
- [x] 双击缩放
- [x] 拖拽平移
- [x] Pinch 手势

文件：

```text
packages/preview/src/zoom-manager.ts
```

---

### Feature 7.3 Fullscreen

- [x] 浏览器全屏 API
- [x] F11 快捷键
- [x] 状态同步

文件：

```text
packages/preview/src/fullscreen-manager.ts
```

---

## Epic 8：动画系统

### Feature 8.1 AnimationEngine

- [x] GSAP 封装
- [x] 动画注册机制
- [x] 生命周期 Hook

文件：

```text
packages/animations/src/animation-engine.ts
```

---

### Feature 8.2 内置动画

- [x] Fade
- [x] Slide
- [x] Scale
- [x] Zoom
- [x] Bounce

文件：

```text
packages/animations/src/presets/*
```

---

### Feature 8.3 FLIP 动画

- [x] 缩略图状态获取
- [x] 预览状态获取
- [x] GSAP Flip 集成
- [x] 反向关闭动画

文件：

```text
packages/animations/src/flip-animation.ts
```

---

## Epic 9：插件系统

### Feature 9.1 PluginManager

- [x] 插件注册
- [x] 生命周期调度
- [x] 插件卸载

文件：

```text
packages/core/src/plugin-manager.ts
```

---

### Feature 9.2 WatermarkPlugin

- [x] 文字水印
- [x] 图片水印
- [x] 位置配置

文件：

```text
packages/plugins/src/watermark-plugin.ts
```

---

### Feature 9.3 DownloadPlugin

- [x] 单图下载
- [x] 批量下载
- [x] 文件名格式化

文件：

```text
packages/plugins/src/download-plugin.ts
```

---

## Epic 10：AI 扩展（可选）

### Feature 10.1 Auto Tagging

- [x] 图片标签生成接口
- [x] 标签缓存
- [x] UI 集成

文件：

```text
packages/plugins/src/ai-tags-plugin.ts
```

---

### Feature 10.2 Similar Search

- [x] 特征提取接口
- [x] 相似度计算
- [x] 搜索 API

文件：

```text
packages/plugins/src/ai-search-plugin.ts
```

---

## Epic 11：测试与性能

### Feature 11.1 Unit Tests

- [x] EventBus
- [x] Layouts
- [x] VirtualEngine
- [x] ScrollManager
- [x] ZoomManager
- [x] FullscreenManager
- [x] AnimationEngine
- [x] AnimationPresets
- [x] FlipAnimation
- [x] PluginManager
- [x] CacheManager

目录：

```text
tests/unit
```

---

### Feature 11.2 E2E Tests

- [x] Lazy Load
- [x] Infinite Scroll
- [x] Preview
- [x] Virtual Scroll

目录：

```text
tests/e2e
```

---

### Feature 11.3 Benchmark

- [x] 1000 图片测试
- [x] 5000 图片测试
- [x] 10000 图片测试
- [x] FPS 统计
- [x] Memory 统计

目录：

```text
tests/benchmark
```

---

## Epic 12：文档与示例

### Feature 12.1 API 文档

- [x] 自动生成类型文档
- [x] 示例代码
- [x] 配置说明

目录：

```text
docs/api
```

---

### Feature 12.2 示例项目

- [ ] Vanilla JS 示例
- [ ] React 示例
- [ ] Vue 示例
- [ ] 大数据量示例

目录：

```text
examples
```

---

## 推荐开发顺序

```text
1. EventBus + Config
2. Gallery 主类
3. Renderer
4. GridLayout
5. Lazy Load
6. Infinite Scroll
7. Preview
8. Masonry
9. Virtual Scroll
10. GSAP Animation
11. FLIP
12. Plugin System
13. AI 扩展
```

---

## 里程碑定义

### Milestone 1：可用版本

- Grid
- Lazy Load
- Infinite Scroll
- Preview

### Milestone 2：高性能版本

- Masonry
- Virtual Scroll
- GSAP Animation

### Milestone 3：完整版本

- FLIP Preview
- Plugin System
- AI Ready
