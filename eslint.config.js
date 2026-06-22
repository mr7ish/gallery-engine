import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "node_modules/**", "coverage/**", "playwright-report/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        project: ["./tsconfig.eslint.json"],
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      import: importPlugin
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true
        }
      ],
      "import/no-default-export": "error"
    }
  },
  {
    files: ["scripts/**/*.mjs"],
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off"
    }
  },
  {
    files: [
      "eslint.config.js",
      "playwright.config.ts",
      "vitest.config.ts",
      "vitest.benchmark.config.ts",
      "**/vite.config.ts"
    ],
    rules: {
      "@typescript-eslint/no-deprecated": "off",
      "import/no-default-export": "off"
    }
  }
);
