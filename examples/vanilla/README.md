# Vanilla Example

A framework-free Vite example that wires Gallery lifecycle events to `GridLayout`, `Renderer`, `PreviewEngine`, and `WatermarkPlugin`.

```bash
pnpm install
pnpm --filter gallery-engine-example-vanilla dev
```

The example demonstrates:

- `Gallery` init, refresh, and event subscriptions
- responsive grid calculation with `GridLayout`
- DOM rendering through `Renderer`
- keyboard-aware preview state with `PreviewEngine`
- plugin installation with `WatermarkPlugin`
