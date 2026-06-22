# React Example

A Vite React example that mounts Gallery Engine primitives inside a React component and cleans them up from `useEffect`.

```bash
pnpm install
pnpm --filter gallery-engine-example-react dev
```

The example demonstrates:

- a React component that owns a Gallery container ref
- `Gallery` lifecycle initialization inside `useEffect`
- `Renderer` cleanup when the component unmounts
- named imports from Gallery Engine package entrypoints

This example declares React dependencies locally so the root package does not need to ship React as a dependency.
