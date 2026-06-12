import * as animations from "@gallery-engine/animations";
import * as core from "@gallery-engine/core";
import * as layouts from "@gallery-engine/layouts";
import * as plugins from "@gallery-engine/plugins";
import * as preview from "@gallery-engine/preview";
import * as shared from "@gallery-engine/shared";
import { describe, expect, it } from "vitest";

const packageModules = [
  {
    metadata: core.CORE_PACKAGE_METADATA,
    module: core,
    name: "@gallery-engine/core"
  },
  {
    metadata: layouts.LAYOUTS_PACKAGE_METADATA,
    module: layouts,
    name: "@gallery-engine/layouts"
  },
  {
    metadata: animations.ANIMATIONS_PACKAGE_METADATA,
    module: animations,
    name: "@gallery-engine/animations"
  },
  {
    metadata: preview.PREVIEW_PACKAGE_METADATA,
    module: preview,
    name: "@gallery-engine/preview"
  },
  {
    metadata: plugins.PLUGINS_PACKAGE_METADATA,
    module: plugins,
    name: "@gallery-engine/plugins"
  },
  {
    metadata: shared.SHARED_PACKAGE_METADATA,
    module: shared,
    name: "@gallery-engine/shared"
  }
];

describe("package entrypoints", () => {
  it("exposes stable named entrypoints for every workspace package", () => {
    expect.assertions(packageModules.length);

    for (const packageModule of packageModules) {
      expect(packageModule.metadata.name).toBe(packageModule.name);
    }
  });

  it("does not expose default exports from package entrypoints", () => {
    expect.assertions(packageModules.length);

    for (const packageModule of packageModules) {
      expect("default" in packageModule.module).toBe(false);
    }
  });
});
