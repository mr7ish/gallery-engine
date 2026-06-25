import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const resolveWorkspacePackage = (packagePath: string): string =>
  fileURLToPath(new URL(packagePath, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@gallery-engine/animations": resolveWorkspacePackage("./packages/animations/src/index.ts"),
      "@gallery-engine/core": resolveWorkspacePackage("./packages/core/src/index.ts"),
      "@gallery-engine/layouts": resolveWorkspacePackage("./packages/layouts/src/index.ts"),
      "@gallery-engine/plugins": resolveWorkspacePackage("./packages/plugins/src/index.ts"),
      "@gallery-engine/preview": resolveWorkspacePackage("./packages/preview/src/index.ts"),
      "@gallery-engine/shared": resolveWorkspacePackage("./packages/shared/src/index.ts"),
      "@gallery-engine/suite": resolveWorkspacePackage("./packages/suite/src/index.ts")
    }
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    coverage: {
      reporter: ["text", "html"]
    }
  }
});
