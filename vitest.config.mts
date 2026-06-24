import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // `server-only` throws when imported in jsdom; stub it so server-only modules
      // (e.g. src/lib/ai/model-spec.ts) remain unit-testable. The real package still
      // guards the client/server boundary at production build time.
      "server-only": fileURLToPath(new URL("./src/testing/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["**/node_modules/**", "**/.next/**", "e2e/**", "playwright.config.ts"],
    setupFiles: ["./src/testing/setup-tests.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
