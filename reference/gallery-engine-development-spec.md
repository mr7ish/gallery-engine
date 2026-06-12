# Gallery Engine 开发规范

## 文档目标

本规范用于统一：

- 项目结构
- 编码规范
- 提交规范
- 测试规范
- 发布规范
- 性能规范

所有代码提交必须遵循本规范。

---

## Monorepo 结构

采用 pnpm workspace 管理。

```text
gallery-engine/
├── packages/
│   ├── core/
│   ├── layouts/
│   ├── animations/
│   ├── preview/
│   ├── plugins/
│   └── shared/
├── docs/
├── examples/
├── playground/
├── tests/
└── scripts/
```

初始化后的根目录必须包含：

- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `eslint.config.js`
- `prettier.config.cjs`
- `vitest.config.ts`
- `playwright.config.ts`

根命令：

```text
pnpm build
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm lint
pnpm format
```

---

## Package 拆分规范

### Core

位置：

```text
packages/core
```

职责：

- Gallery
- EventBus
- Renderer
- Observer
- VirtualEngine

禁止 GSAP、Preview 与插件业务逻辑直接进入 Core。

### Layouts

包含：

- grid
- masonry
- justified
- timeline
- carousel

### Animations

包含：

- fade
- slide
- scale
- zoom
- flip

### Preview

包含：

- lightbox
- gesture
- zoom
- fullscreen

### Plugins

包含：

- watermark
- download
- filter
- exif
- share

### Shared

包含：

- utils
- types
- constants
- cache

---

## 命名规范

### 文件名

统一使用 kebab-case。

示例：

```text
virtual-engine.ts
image-loader.ts
event-bus.ts
```

### 类名

统一使用 PascalCase。

示例：

```ts
VirtualEngine
ImageLoader
GalleryRenderer
```

### 变量

统一使用 camelCase。

示例：

```ts
visibleRange
imageCache
layoutResult
```

### 常量

统一使用 UPPER_SNAKE_CASE。

示例：

```ts
DEFAULT_OVERSCAN
MAX_CACHE_SIZE
```

---

## TypeScript 规范

- 禁止在公共 API 中使用 any，优先使用 unknown
- 优先使用 interface 描述对象结构
- 公开函数必须显式声明返回值
- 统一使用命名导出，禁止 export default

---

## 代码风格规范

### 单一职责原则

一个类只做一件事。

错误示例：

```ts
class Gallery {
  render()
  loadImage()
  preview()
  animate()
}
```

正确示例：

```ts
Gallery
Renderer
ImageLoader
PreviewEngine
AnimationEngine
```

### 函数长度

推荐 ≤ 50 行，超过应拆分。

### 类长度

推荐 ≤ 500 行，超过拆分模块。

---

## 注释规范

### 必须注释

公开 API 必须包含 JSDoc：

```ts
/**
 * Open preview
 */
open(index:number):void
```

### 禁止无意义注释

```ts
// add image
images.push(item)
```

---

## 错误处理规范

禁止直接散落 console.error。

统一使用：

```ts
ErrorCenter.report()
```

错误等级：

- INFO
- WARN
- ERROR
- FATAL

---

## 日志规范

禁止直接使用 console.log。

统一使用：

```ts
logger.info()
logger.warn()
logger.error()
```

---

## EventBus 规范

事件命名统一使用：

```text
module:event
```

示例：

```text
image:loaded
preview:open
layout:update
```

禁止使用 open、update、change 等模糊命名。

---

## 性能规范

### DOM 数量

- 普通模式 ≤ 1000
- 虚拟模式 ≤ 100

### Layout 计算

单次 < 16ms。

### 滚动

目标 60 FPS，最低 55 FPS。

### 图片加载

不阻塞主线程。

---

## 缓存规范

统一使用 CacheManager。

禁止在各模块散落 new Map()。

缓存类型：

- ImageCache
- LayoutCache
- PreviewCache

---

## 单元测试规范

测试框架：

- Vitest

目录：

```text
tests/unit
```

覆盖率要求：

- Statements ≥ 90%
- Branches ≥ 85%
- Functions ≥ 90%
- Lines ≥ 90%

重点测试：

- Virtual Engine
- Layout Engine
- CacheManager

---

## E2E 测试规范

工具：

- Playwright

目录：

```text
tests/e2e
```

测试内容：

- Lazy Load
- Infinite Scroll
- Preview
- Virtual Scroll

---

## Benchmark 规范

目录：

```text
tests/benchmark
```

测试场景：

- 1000 图片：FPS、Memory、Render Time
- 5000 图片：Scroll Performance
- 10000 图片：Virtual Render Cost

---

## Commit 规范

采用 Conventional Commits。

示例：

```text
feat: add masonry layout
fix: resolve preview flicker
docs: update api document
test: add virtual scroll tests
refactor: split render engine
```

---

## Branch 规范

- main
- develop
- feature/*
- fix/*

示例：

```text
feature/virtual-scroll
fix/image-cache
```

---

## CI/CD 规范

每次 PR 自动执行：

- Lint
- Type Check
- Unit Test
- E2E Test
- Build

全部通过才允许合并。

---

## Release 规范

遵循 Semantic Version：

```text
MAJOR.MINOR.PATCH
```

示例：

```text
1.0.0
1.1.0
1.1.1
```

---

## 文档规范

所有功能必须包含：

- Usage
- Config
- API
- Example

文档优先级：

```text
API → Architecture → Guide → Example
```

---

## Pull Request 规范

必须包含：

- 功能描述
- 变更内容
- 测试结果
- 截图（如有）

---

## 最终质量标准

进入主分支前必须满足：

- Type Check 通过
- ESLint 通过
- Unit Test 通过
- E2E Test 通过
- Benchmark 未退化
- API 文档已更新
- 示例已补充
- 无严重内存泄漏
- 无明显掉帧
- 无阻塞主线程行为

Gallery Engine 的所有代码均以长期维护、可扩展、高性能为第一优先级。
