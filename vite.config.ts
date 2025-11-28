import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { ViteToml } from "vite-plugin-toml";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: env.VITE_BASE_PATH || "/",
    server: {
      port: 3000,
      host: "0.0.0.0",
      headers: {
        // Required for SharedArrayBuffer (used by PGlite in SharedWorker)
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
    worker: {
      format: "es",
    },
    plugins: [react(), tailwindcss(), ViteToml()],
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    optimizeDeps: {
      exclude: ["@electric-sql/pglite", "@electric-sql/pglite/worker"],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Core React libraries
            if (id.includes("node_modules")) {
              // React ecosystem - keep together for better caching
              if (id.includes("react") || id.includes("react-dom")) {
                return "vendor-react";
              }

              // Router - separate chunk
              if (id.includes("react-router")) {
                return "vendor-router";
              }

              // i18n - separate for locale loading
              if (id.includes("i18next") || id.includes("react-i18next")) {
                return "vendor-i18n";
              }

              // AI SDKs - SPLIT BY PROVIDER for better caching and lazy loading
              // Users typically only use 1-2 providers, so splitting helps
              if (
                id.includes("@google/genai") ||
                id.includes("@google/generative-ai")
              ) {
                return "vendor-gemini";
              }

              if (id.includes("openai") && !id.includes("@openrouter")) {
                return "vendor-openai";
              }

              if (id.includes("@anthropic-ai/sdk")) {
                return "vendor-claude";
              }

              if (id.includes("@openrouter")) {
                return "vendor-openrouter";
              }

              // PGlite - separate because it's large database library
              if (id.includes("@electric-sql/pglite")) {
                return "vendor-pglite";
              }

              // Framer Motion - animation library, separate for performance
              if (id.includes("framer-motion")) {
                return "vendor-framer";
              }

              // Zod - schema validation, used across app
              if (id.includes("zod")) {
                return "vendor-zod";
              }

              // Other dependencies - catch-all
              return "vendor-misc";
            }

            // App code chunking
            // Translation data - separate chunk for better caching
            if (
              id.includes("utils/translations/") ||
              id.includes("src/locales/")
            ) {
              return "translations";
            }

            // Theme data - separate chunk
            if (id.includes("utils/constants/themes")) {
              return "theme-data";
            }

            // Services - group by functionality
            if (id.includes("services/") && !id.includes("node_modules")) {
              // AI Provider implementations - grouped together
              if (
                id.includes("geminiProvider") ||
                id.includes("openaiProvider") ||
                id.includes("openRouterProvider") ||
                id.includes("claudeProvider")
              ) {
                return "ai-providers";
              }

              // Core AI service and schemas
              if (
                id.includes("aiService") ||
                id.includes("schemas") ||
                id.includes("prompts") ||
                id.includes("messageTypes")
              ) {
                return "ai-core";
              }

              // RAG service - separate chunk (only loaded when used)
              if (id.includes("services/rag/")) {
                return "rag-service";
              }
            }

            // Hooks - separate chunk
            if (id.includes("hooks/") && !id.includes("node_modules")) {
              return "app-hooks";
            }

            // Components - large UI components get their own chunks
            if (id.includes("components/") && !id.includes("node_modules")) {
              // Settings modal - large, lazy loadable
              if (id.includes("SettingsModal")) {
                return "settings-ui";
              }

              // Sidebar - loaded on every page
              if (id.includes("Sidebar") || id.includes("sidebar/")) {
                return "sidebar-ui";
              }

              // RAG Debugger - developer tool, lazy load
              if (id.includes("ragDebugger") || id.includes("RAGDebugger")) {
                return "rag-debugger";
              }
            }
          },
        },
      },
      // Increase chunk size warning limit for AI SDKs
      chunkSizeWarningLimit: 600,
    },
  };
});
