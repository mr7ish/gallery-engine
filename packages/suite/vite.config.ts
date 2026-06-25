import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: "src/index.ts",
      fileName: "index",
      formats: ["es"]
    },
    rollupOptions: {
      external: [
        "@gallery-engine/animations",
        "@gallery-engine/core",
        "@gallery-engine/layouts",
        "@gallery-engine/plugins",
        "@gallery-engine/preview",
        "@gallery-engine/shared"
      ]
    },
    sourcemap: true
  }
});
