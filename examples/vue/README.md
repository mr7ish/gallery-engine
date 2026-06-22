# Vue Example

A Vite Vue example that keeps Gallery Engine state in a composition-style component and cleans up renderer and lifecycle state on unmount.

```bash
pnpm install
pnpm --filter gallery-engine-example-vue dev
```

The example demonstrates:

- `defineComponent` with a DOM ref for Gallery Engine
- `Gallery` lifecycle initialization in `onMounted`
- `Renderer` cleanup in `onBeforeUnmount`
- Masonry layout calculation with `MasonryLayout`

This example declares Vue dependencies locally so the root package does not need to ship Vue as a dependency.
