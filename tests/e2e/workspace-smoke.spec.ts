import { expect, test } from "@playwright/test";

test("workspace e2e runner is configured", () => {
  expect("@gallery-engine/core").toContain("gallery-engine");
});
