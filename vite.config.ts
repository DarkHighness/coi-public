import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { ViteToml } from "vite-plugin-toml";
import viteCompression from "vite-plugin-compression";

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
    plugins: [
      react(),
      tailwindcss(),
      ViteToml(),
      // Gzip compression
      viteCompression({
        verbose: true,
        disable: false,
        threshold: 10240,
        algorithm: "gzip",
        ext: ".gz",
      }),
      // Brotli compression
      viteCompression({
        verbose: true,
        disable: false,
        threshold: 10240,
        algorithm: "brotliCompress",
        ext: ".br",
      }),
    ],
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
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
              if (
                id.includes("@google/genai") ||
                id.includes("@google/generative-ai")
              ) {
                return "provider-gemini-sdk";
              }

              if (id.includes("openai") && !id.includes("@openrouter")) {
                return "provider-openai-sdk";
              }

              if (id.includes("@anthropic-ai/sdk")) {
                return "provider-claude-sdk";
              }

              if (id.includes("@openrouter")) {
                return "provider-openrouter-sdk";
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
            // Translation data - separate chunk per language
            if (id.includes("src/locales/en/")) {
              return "locales-en";
            }
            if (id.includes("src/locales/zh/")) {
              return "locales-zh";
            }
            if (id.includes("utils/translations/")) {
              return "translations-legacy";
            }

            // Theme data - separate chunk
            if (id.includes("utils/constants/themes")) {
              return "theme-data";
            }

            // Services - group by functionality
            if (id.includes("services/") && !id.includes("node_modules")) {
              // AI Provider implementations - SPLIT INDIVIDUALLY
              if (id.includes("geminiProvider")) {
                return "provider-gemini";
              }
              if (id.includes("openaiProvider")) {
                return "provider-openai";
              }
              if (id.includes("openRouterProvider")) {
                return "provider-openrouter";
              }
              if (id.includes("claudeProvider")) {
                return "provider-claude";
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
