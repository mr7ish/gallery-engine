import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

interface ExampleExpectation {
  readonly directory: string;
  readonly packageName: string;
  readonly sourceFile: string;
  readonly markers: readonly string[];
}

const examples: readonly ExampleExpectation[] = [
  {
    directory: "vanilla",
    packageName: "gallery-engine-example-vanilla",
    sourceFile: "src/main.ts",
    markers: [
      "new Gallery",
      "new Renderer",
      "new GridLayout",
      "new PreviewEngine",
      "new WatermarkPlugin"
    ]
  },
  {
    directory: "react",
    packageName: "gallery-engine-example-react",
    sourceFile: "src/main.ts",
    markers: ["ReactGalleryExample", "useEffect", "new Gallery", "new Renderer", "createRoot"]
  },
  {
    directory: "vue",
    packageName: "gallery-engine-example-vue",
    sourceFile: "src/main.ts",
    markers: [
      "VueGalleryExample",
      "defineComponent",
      "onMounted",
      "new Gallery",
      "new MasonryLayout"
    ]
  },
  {
    directory: "large-data",
    packageName: "gallery-engine-example-large-data",
    sourceFile: "src/main.ts",
    markers: ["TOTAL_ITEMS = 10_000", "new VirtualEngine", "new Renderer", "requestAnimationFrame"]
  }
];

const readWorkspaceFile = (filePath: string): Promise<string> =>
  readFile(path.join(workspaceRoot, filePath), "utf8");

describe("example projects", () => {
  it("defines all Feature 12.2 example workspaces", async () => {
    const workspace = await readWorkspaceFile("pnpm-workspace.yaml");
    const overview = await readWorkspaceFile("examples/README.md");

    expect(workspace).toContain('"examples/*"');
    expect(overview).toContain("Vanilla");
    expect(overview).toContain("React");
    expect(overview).toContain("Vue");
    expect(overview).toContain("Large Data");

    for (const example of examples) {
      const packageJson = JSON.parse(
        await readWorkspaceFile(`examples/${example.directory}/package.json`)
      ) as {
        readonly name: string;
        readonly private: boolean;
        readonly type: string;
        readonly scripts: Record<string, string>;
      };
      const readme = await readWorkspaceFile(`examples/${example.directory}/README.md`);
      const html = await readWorkspaceFile(`examples/${example.directory}/index.html`);

      expect(packageJson.name).toBe(example.packageName);
      expect(packageJson.private).toBe(true);
      expect(packageJson.type).toBe("module");
      expect(packageJson.scripts.dev).toContain("vite");
      expect(packageJson.scripts.build).toBe("vite build");
      expect(readme).toContain("pnpm --filter");
      expect(html).toContain('script type="module"');
    }
  });

  it("uses Gallery Engine named exports without default exports", async () => {
    for (const example of examples) {
      const source = await readWorkspaceFile(`examples/${example.directory}/${example.sourceFile}`);

      expect(source).toContain("@gallery-engine/");
      expect(source).not.toContain("export default");

      for (const marker of example.markers) {
        expect(source).toContain(marker);
      }
    }
  });
});
