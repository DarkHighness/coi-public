import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: env.VITE_BASE_PATH || "/",
    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    plugins: [react(), tailwindcss()],
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Core React libraries
            if (id.includes("node_modules")) {
              // React ecosystem
              if (id.includes("react") || id.includes("react-dom")) {
                return "vendor-react";
              }

              // Router
              if (id.includes("react-router")) {
                return "vendor-router";
              }

              // i18n
              if (id.includes("i18next") || id.includes("react-i18next")) {
                return "vendor-i18n";
              }

              // AI SDKs - split by provider for better caching
              if (
                id.includes("@google/genai") ||
                id.includes("@google/generative-ai")
              ) {
                return "vendor-gemini";
              }

              if (id.includes("openai")) {
                return "vendor-openai";
              }

              if (id.includes("@openrouter")) {
                return "vendor-openrouter";
              }

              // Other dependencies
              return "vendor-misc";
            }

            // Translation data - separate chunk for better caching
            if (id.includes("utils/translations/")) {
              return "translations";
            }

            // Theme data - separate chunk
            if (id.includes("utils/constants/themes")) {
              return "theme-data";
            }

            // Services - group AI services together
            if (id.includes("services/") && !id.includes("node_modules")) {
              if (
                id.includes("geminiProvider") ||
                id.includes("openaiProvider") ||
                id.includes("openRouterProvider")
              ) {
                return "ai-providers";
              }
              if (id.includes("aiService") || id.includes("schemas")) {
                return "ai-core";
              }
            }

            // Hooks - separate chunk
            if (id.includes("hooks/") && !id.includes("node_modules")) {
              return "app-hooks";
            }
          },
        },
      },
      // Increase chunk size warning limit for AI SDKs
      chunkSizeWarningLimit: 600,
    },
  };
});
