import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

const resolveBrowserExecutablePath = (): string | undefined => {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => existsSync(candidate));
};

const browserExecutablePath = resolveBrowserExecutablePath();

export default defineConfig({
  testDir: "tests/e2e",
  reporter: "list",
  use: {
    trace: "on-first-retry",
    ...(browserExecutablePath
      ? {
          launchOptions: {
            executablePath: browserExecutablePath
          }
        }
      : {})
  }
});
