# Large Data Example

A Vite example focused on the high-performance path: 10000 laid-out items, `VirtualEngine` range calculation, and `Renderer` DOM recycling.

```bash
pnpm install
pnpm --filter gallery-engine-example-large-data dev
```

The example demonstrates:

- virtual range calculation with pixel overscan
- keeping visible DOM under the virtual rendering budget
- `requestAnimationFrame` scroll rendering
- recycled renderer nodes when scrolling through a large data set
