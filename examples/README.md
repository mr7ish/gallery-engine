# Gallery Engine Examples

Runnable examples live in workspace folders under `examples/*`.

| Example                    | Focus                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------- |
| [Vanilla](./vanilla)       | Framework-free Gallery lifecycle, grid rendering, preview, and watermark plugin usage. |
| [React](./react)           | React component mounting and cleanup around Gallery Engine primitives.                 |
| [Vue](./vue)               | Vue composition setup with Gallery lifecycle and renderer cleanup.                     |
| [Large Data](./large-data) | 10000-item virtual rendering with recycled DOM nodes.                                  |

Each example keeps Gallery Engine imports as named exports and uses package entrypoints such as `@gallery-engine/core`, `@gallery-engine/layouts`, `@gallery-engine/preview`, and `@gallery-engine/plugins`.
