import { defineConfig } from "vitest/config";
import path from "path";
import { ViteToml } from "vite-plugin-toml";

export default defineConfig({
  plugins: [ViteToml()],
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
