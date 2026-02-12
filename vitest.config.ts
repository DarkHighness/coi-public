import { defineConfig } from "vitest/config";
import path from "path";
import { ViteToml } from "vite-plugin-toml";

export default defineConfig({
  plugins: [ViteToml()],
  test: {
    globals: true,
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "scripts/__tests__/**/*.test.ts",
    ],
    coverage: {
      enabled: false,
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text-summary", "json-summary"],
      reportOnFailure: true,
      thresholds: {
        perFile: false,

        "src/services/ai/agentic/turn/**": {
          lines: 85,
          statements: 85,
          functions: 85,
          branches: 70,
        },
        "src/services/ai/agentic/summary/**": {
          lines: 80,
          statements: 80,
          functions: 80,
          branches: 70,
        },
        "src/services/ai/agentic/outline/**": {
          lines: 60,
          statements: 60,
          functions: 60,
          branches: 40,
        },
        "src/services/prompts/**": {
          lines: 85,
          statements: 80,
          functions: 75,
          branches: 60,
        },
        "src/services/vfs/core/**": {
          lines: 85,
          statements: 85,
          functions: 80,
          branches: 75,
        },
        "src/services/tools/handlers/vfsHandlers.ts": {
          lines: 75,
          statements: 75,
          functions: 75,
          branches: 60,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
