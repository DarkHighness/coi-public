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
      viteCompression({
        verbose: true,
        disable: false,
        threshold: 10240,
        algorithm: "gzip",
        ext: ".gz",
      }),
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
      exclude: [
        "@electric-sql/pglite",
        "@electric-sql/pglite/worker",
        "@huggingface/transformers",
        "onnxruntime-web",
        "@tensorflow/tfjs-core",
        "@tensorflow/tfjs-backend-webgpu",
        "@tensorflow/tfjs-backend-webgl",
        "@tensorflow/tfjs-backend-cpu",
        "@tensorflow-models/universal-sentence-encoder",
      ],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // ===== App chunks =====
            if (id.includes("services/rag/localEmbedding/")) {
              return "rag-local-embedding";
            }

            if (id.includes("services/rag/")) {
              return "rag-service";
            }

            if (id.includes("services/prompts/")) {
              return "ai-prompts";
            }

            if (
              id.includes("services/ai/") ||
              id.includes("services/providers/") ||
              id.includes("services/zodCompiler") ||
              id.includes("services/zodSchemas") ||
              id.includes("services/messageTypes")
            ) {
              return "ai-runtime";
            }

            if (id.includes("hooks/") && !id.includes("node_modules")) {
              return "app-hooks";
            }

            if (id.includes("components/") && !id.includes("node_modules")) {
              if (id.includes("SettingsModal") || id.includes("components/settings/")) {
                return "settings-ui";
              }

              if (id.includes("Sidebar") || id.includes("sidebar/")) {
                return "sidebar-ui";
              }
            }

            // ===== Vendor chunks =====
            if (!id.includes("node_modules")) {
              return undefined;
            }

            if (
              id.includes("@huggingface/transformers") ||
              id.includes("onnxruntime-web")
            ) {
              return "vendor-embed-transformers";
            }

            if (
              id.includes("@tensorflow/") ||
              id.includes("@tensorflow-models/universal-sentence-encoder")
            ) {
              return "vendor-embed-tfjs";
            }

            if (id.includes("react") || id.includes("react-dom")) {
              return "vendor-react";
            }

            if (id.includes("react-router")) {
              return "vendor-router";
            }

            if (id.includes("i18next") || id.includes("react-i18next")) {
              return "vendor-i18n";
            }

            if (id.includes("@electric-sql/pglite")) {
              return "vendor-pglite";
            }

            if (
              id.includes("monaco-editor") ||
              id.includes("@monaco-editor") ||
              id.includes("@codemirror/") ||
              id.includes("@uiw/react-codemirror")
            ) {
              return "vendor-editor";
            }

            if (
              id.includes("react-markdown") ||
              id.includes("remark-gfm") ||
              id.includes("remark-math")
            ) {
              return "vendor-markdown";
            }

            if (
              id.includes("@google/genai") ||
              id.includes("@google/generative-ai") ||
              (id.includes("openai") && !id.includes("@openrouter")) ||
              id.includes("@anthropic-ai/sdk") ||
              id.includes("@openrouter")
            ) {
              return "vendor-ai-sdks";
            }

            if (id.includes("framer-motion")) {
              return "vendor-framer";
            }

            if (id.includes("zod")) {
              return "vendor-zod";
            }

            return "vendor-misc";
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  };
});
