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
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
