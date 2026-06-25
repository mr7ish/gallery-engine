# @gallery-engine/animations

Animations 提供 GSAP 兼容的动画注册、播放、生命周期 Hook、内置 presets，以及 FLIP 过渡能力。🎬

## Installation

```bash
pnpm add @gallery-engine/animations
```

也可以使用 npm：

```bash
npm install @gallery-engine/animations
```

> 这个包通过 adapter 对接 GSAP 风格 API，本身不强制安装 GSAP。你可以在应用层传入真实 `gsap`，也可以在测试中传入 mock adapter。

## Animation Engine

```ts
import { AnimationEngine, registerBuiltInAnimationPresets } from "@gallery-engine/animations";
import type { GsapAnimationAdapter } from "@gallery-engine/animations";

const adapter: GsapAnimationAdapter = {
  to: (target, vars) => gsap.to(target, vars),
  from: (target, vars) => gsap.from(target, vars),
  fromTo: (target, fromVars, toVars) => gsap.fromTo(target, fromVars, toVars)
};

const engine = new AnimationEngine({
  adapter,
  hooks: {
    complete: ({ name }) => {
      console.log(`${name} completed`);
    }
  }
});

registerBuiltInAnimationPresets(engine, {
  fade: {
    duration: 0.24
  }
});

const element = document.querySelector(".gallery-item");

if (element) {
  engine.play("fade", {
    target: element
  });
}
```

## Custom Animation

```ts
import { AnimationEngine } from "@gallery-engine/animations";

const engine = new AnimationEngine({
  adapter
});

engine.register({
  name: "lift",
  method: "to",
  vars: {
    y: -8,
    opacity: 1,
    duration: 0.2
  }
});

engine.play("lift", {
  target: document.querySelectorAll(".gallery-item")
});
```

## Built-In Presets

```ts
import {
  BUILT_IN_ANIMATION_PRESET_NAMES,
  createBuiltInAnimationPresets
} from "@gallery-engine/animations";

console.log(BUILT_IN_ANIMATION_PRESET_NAMES);

const presets = createBuiltInAnimationPresets({
  slide: {
    duration: 0.3,
    distance: 24
  }
});

console.log(presets.map((preset) => preset.name));
```

## Common APIs

- `AnimationEngine`: 动画注册、播放、取消和生命周期派发。
- `registerBuiltInAnimationPresets`: 注册内置动画。
- `createFadePreset`, `createSlidePreset`, `createScalePreset`, `createZoomPreset`, `createBouncePreset`: 独立创建内置动画定义。
- `FlipAnimation`: 管理前后状态快照并对接 GSAP Flip adapter。

## Notes

- 推荐把真实动画库放在应用层注入，保持 Gallery Engine 核心可测试。
- 生命周期 Hook 可用于埋点、调试或 UI 状态同步。
