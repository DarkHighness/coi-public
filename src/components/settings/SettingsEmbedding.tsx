import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  getEmbeddingModels,
  EmbeddingModelInfo,
} from "../../services/aiService";
import type { LocalTransformersDevice } from "../../types";
import { useSettings } from "../../hooks/useSettings";
import { useOptionalRuntimeContext } from "../../runtime/context";
import {
  clearTransformersCache,
  DEFAULT_LOCAL_TRANSFORMERS_MODEL_ID,
  getLocalTransformersModelMeta,
  getTransformersCacheSummary,
  getTransformersEmbeddingEngine,
  LOCAL_TRANSFORMERS_MODEL_OPTIONS,
  removeModelFromTransformersCache,
  resetTransformersEmbeddingEngine,
} from "../../services/rag/localEmbedding";
import type { TransformersCacheSummary } from "../../services/rag/localEmbedding/cacheManager";
import type { TransformersModelProgressEvent } from "../../services/rag/localEmbedding/transformersEngine";

interface SettingsEmbeddingProps {
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

type LocalModelAction = "prepare" | "test" | "clearModel" | "clearAll" | null;

interface LocalModelProgressState {
  status: "running" | "ready" | "error";
  percent: number | null;
  message: string;
}

interface LocalModelTestResult {
  ok: boolean;
  dimensions: number;
  elapsedMs: number;
  device?: LocalTransformersDevice;
  message: string;
}

const formatStorageBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export const SettingsEmbedding: React.FC<SettingsEmbeddingProps> = ({
  showToast,
}) => {
  const { t } = useTranslation();
  const runtimeContext = useOptionalRuntimeContext();
  const { settings: currentSettings, updateSettings: onUpdateSettings } =
    useSettings();
  const config = currentSettings.embedding;
  const isEnabled = config?.enabled ?? false;
  const runtime = config?.runtime ?? "local_transformers";
  const isLocalRuntime =
    runtime === "local_transformers" || runtime === "local_tfjs";
  const isLocalTransformers = runtime === "local_transformers";
  const ragStatus = runtimeContext?.state.rag.status ?? null;
  const localRuntimeEngine =
    ragStatus?.localRuntime?.engine ||
    (t("embedding.runtimeUnknown") || "Unknown");
  const localRuntimeBackend =
    ragStatus?.localRuntime?.backend ||
    (t("embedding.runtimeUnknown") || "Unknown");

  // Track previous model ID for model change detection
  const previousModelIdRef = useRef<string | null>(config?.modelId || null);

  // State for model change confirmation dialog
  const [modelChangeConfirm, setModelChangeConfirm] = useState<{
    show: boolean;
    pendingSettings: typeof currentSettings | null;
  }>({ show: false, pendingSettings: null });

  // State for dynamically fetched models (keyed by providerId)
  const [models, setModels] = useState<Record<string, EmbeddingModelInfo[]>>(
    () => {
      try {
        const cached = localStorage.getItem(
          "chronicles_embedding_models_cache",
        );
        if (cached) {
          const { timestamp, data } = JSON.parse(cached);
          // Cache valid for 24 hours
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            return data;
          }
        }
      } catch (e) {
        console.warn("Failed to load embedding models cache", e);
      }
      return {};
    },
  );

  const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>(
    {},
  );
  const localTransformersModel =
    config.local?.transformersModel ||
    config.modelId ||
    DEFAULT_LOCAL_TRANSFORMERS_MODEL_ID;
  const localTransformersModelMeta = getLocalTransformersModelMeta(
    localTransformersModel,
  );
  const localTransformersSelectValue = LOCAL_TRANSFORMERS_MODEL_OPTIONS.some(
    (item) => item.id === localTransformersModel,
  )
    ? localTransformersModel
    : "__custom__";
  const [customLocalModelId, setCustomLocalModelId] = useState(
    localTransformersModel,
  );
  const [localModelProgress, setLocalModelProgress] =
    useState<LocalModelProgressState | null>(null);
  const [localModelTestText, setLocalModelTestText] =
    useState("在雾中城堡搜索隐藏线索");
  const [localModelTestResult, setLocalModelTestResult] =
    useState<LocalModelTestResult | null>(null);
  const [localModelCacheSummary, setLocalModelCacheSummary] =
    useState<TransformersCacheSummary | null>(null);
  const [isLoadingLocalModelCache, setIsLoadingLocalModelCache] =
    useState(false);
  const [localModelAction, setLocalModelAction] =
    useState<LocalModelAction>(null);

  useEffect(() => {
    setCustomLocalModelId(localTransformersModel);
  }, [localTransformersModel]);

  // Fetch models from API for a provider
  // 支持强制刷新 force 参数
  const fetchModelsForProvider = useCallback(
    async (providerId: string, force = false) => {
      const runtimeMode =
        currentSettings.embedding.runtime ?? "local_transformers";
      if (
        runtimeMode === "local_transformers" ||
        runtimeMode === "local_tfjs"
      ) {
        return;
      }

      // 如果不是强制刷新，且已有缓存，则直接返回
      if (
        !force &&
        models[providerId]?.length > 0 &&
        !loadingModels[providerId]
      )
        return;
      if (loadingModels[providerId]) return;

      setLoadingModels((prev) => ({ ...prev, [providerId]: true }));
      try {
        // 如果 force，则不使用缓存
        if (force) {
          localStorage.removeItem("chronicles_embedding_models_cache");
        }
        const fetchedModels = await getEmbeddingModels(
          currentSettings,
          providerId,
        );
        if (fetchedModels.length > 0) {
          setModels((prev) => {
            const newModels = { ...prev, [providerId]: fetchedModels };
            // Update cache
            localStorage.setItem(
              "chronicles_embedding_models_cache",
              JSON.stringify({
                timestamp: Date.now(),
                data: newModels,
              }),
            );
            return newModels;
          });
        }
      } catch (error) {
        console.error(
          `Failed to fetch embedding models for provider ${providerId}:`,
          error,
        );
        // Keep using fallback models
      } finally {
        setLoadingModels((prev) => ({ ...prev, [providerId]: false }));
      }
    },
    [loadingModels, models, currentSettings],
  );

  // Fetch models when provider changes or component mounts
  useEffect(() => {
    if (isEnabled && !isLocalRuntime && config.providerId) {
      fetchModelsForProvider(config.providerId);
    }
  }, [config.providerId, isEnabled, isLocalRuntime]);

  const updateEmbedding = (field: string, value: any) => {
    const newSettings = {
      ...currentSettings,
      embedding: {
        ...currentSettings.embedding,
        [field]: value,
      },
    };

    // Auto-update dimensions when model changes
    if (field === "modelId") {
      const runtimeMode = newSettings.embedding.runtime ?? runtime;

      if (runtimeMode === "local_transformers") {
        const localConfig = newSettings.embedding.local || {};
        const selectedModel =
          value ||
          localConfig.transformersModel ||
          DEFAULT_LOCAL_TRANSFORMERS_MODEL_ID;
        const modelMeta = getLocalTransformersModelMeta(selectedModel);
        newSettings.embedding.local = {
          ...localConfig,
          backend: "transformers_js",
          transformersModel: selectedModel,
          deviceOrder: localConfig.deviceOrder || ["webgpu", "wasm", "cpu"],
          batchSize: localConfig.batchSize || 8,
          quantized: localConfig.quantized !== false,
        };
        newSettings.embedding.modelId = selectedModel;
        newSettings.embedding.dimensions = modelMeta?.dimensions ?? 384;
      } else {
        const providerId = config.providerId;
        const providerModels = models[providerId] || [];
        const model = providerModels.find((m) => m.id === value);
        if (model?.dimensions) {
          newSettings.embedding.dimensions = model.dimensions;
        }
      }

      // Check if model has changed and RAG has existing index
      const prevModel = previousModelIdRef.current;
      const hasExistingIndex =
        runtimeContext?.state.rag.isInitialized &&
        runtimeContext?.state.rag.status?.storageDocuments &&
        runtimeContext.state.rag.status.storageDocuments > 0;

      const nextModelId = newSettings.embedding.modelId || value;

      if (prevModel && prevModel !== nextModelId && hasExistingIndex) {
        // Show confirmation dialog
        setModelChangeConfirm({ show: true, pendingSettings: newSettings });
        return; // Don't apply settings yet
      }

      // Update reference
      previousModelIdRef.current = nextModelId;
    }

    if (field === "runtime") {
      if (value === "local_transformers") {
        const localConfig = newSettings.embedding.local || {};
        const transformersModel =
          localConfig.transformersModel ||
          newSettings.embedding.modelId ||
          DEFAULT_LOCAL_TRANSFORMERS_MODEL_ID;
        const modelMeta = getLocalTransformersModelMeta(transformersModel);
        newSettings.embedding.local = {
          ...localConfig,
          backend: "transformers_js",
          transformersModel,
          deviceOrder: localConfig.deviceOrder || ["webgpu", "wasm", "cpu"],
          batchSize: localConfig.batchSize || 8,
          quantized: localConfig.quantized !== false,
        };
        newSettings.embedding.modelId = transformersModel;
        newSettings.embedding.dimensions = modelMeta?.dimensions ?? 384;
      } else if (value === "local_tfjs") {
        const localConfig = newSettings.embedding.local || {};
        newSettings.embedding.local = {
          ...localConfig,
          backend: "tfjs",
          model: "use-lite-512",
          backendOrder: localConfig.backendOrder || ["webgpu", "webgl", "cpu"],
          batchSize: localConfig.batchSize || 8,
        };
        newSettings.embedding.modelId = "use-lite-512";
        newSettings.embedding.dimensions = 512;
      } else if (value === "remote") {
        const previousRuntime =
          currentSettings.embedding.runtime ?? "local_transformers";
        if (
          previousRuntime === "local_tfjs" ||
          previousRuntime === "local_transformers"
        ) {
          newSettings.embedding.modelId = "";
          newSettings.embedding.dimensions = undefined;
        }
      }
    }

    // Reset model when provider changes
    if (field === "providerId") {
      newSettings.embedding.modelId = "";
      // Trigger fetch for new provider
      fetchModelsForProvider(value);

      // Also check for existing index when provider changes
      const hasExistingIndex =
        runtimeContext?.state.rag.isInitialized &&
        runtimeContext?.state.rag.status?.storageDocuments &&
        runtimeContext.state.rag.status.storageDocuments > 0;
      if (previousModelIdRef.current && hasExistingIndex) {
        setModelChangeConfirm({ show: true, pendingSettings: newSettings });
        return;
      }

      previousModelIdRef.current = null;
    }

    onUpdateSettings(newSettings);
  };

  const buildLocalTransformersConfig = useCallback(() => {
    const localConfig = config.local || {};
    const deviceOrder =
      localConfig.deviceOrder && localConfig.deviceOrder.length > 0
        ? localConfig.deviceOrder
        : (["webgpu", "wasm", "cpu"] as LocalTransformersDevice[]);

    return {
      ...localConfig,
      backend: "transformers_js" as const,
      transformersModel: localTransformersModel,
      deviceOrder,
      batchSize: localConfig.batchSize || 8,
      quantized: localConfig.quantized !== false,
    };
  }, [config.local, localTransformersModel]);

  const updateLocalModelProgress = useCallback(
    (event: TransformersModelProgressEvent) => {
      const status = event.status || "progress";
      const percent =
        typeof event.progress === "number"
          ? Math.max(0, Math.min(100, event.progress))
          : status === "done" || status === "ready"
            ? 100
            : null;

      const shortFile = event.file ? event.file.split("/").pop() : null;
      const progressMessage = shortFile
        ? `${t("embedding.localModelDownloadProgress") || "Downloading model files"}: ${shortFile}`
        : t("embedding.localModelPreparing") || "Preparing local model...";

      let message = progressMessage;
      if (status === "ready") {
        message = t("embedding.localModelReady") || "Model runtime is ready.";
      } else if (status === "done") {
        message =
          t("embedding.localModelDownloaded") || "Model files downloaded.";
      } else if (status === "download") {
        message =
          t("embedding.localModelDownloading") || "Downloading model files...";
      } else if (status === "initiate") {
        message =
          t("embedding.localModelInitializing") ||
          "Initializing local model runtime...";
      }

      setLocalModelProgress({
        status: status === "ready" ? "ready" : "running",
        percent,
        message,
      });
    },
    [t],
  );

  const refreshLocalModelCache = useCallback(async () => {
    setIsLoadingLocalModelCache(true);
    try {
      const summary = await getTransformersCacheSummary();
      setLocalModelCacheSummary(summary);
    } catch (error) {
      console.error(
        "[SettingsEmbedding] Failed to load local model cache:",
        error,
      );
      setLocalModelCacheSummary(null);
    } finally {
      setIsLoadingLocalModelCache(false);
    }
  }, []);

  useEffect(() => {
    if (!isLocalTransformers) {
      return;
    }
    void refreshLocalModelCache();
  }, [isLocalTransformers, refreshLocalModelCache]);

  const handlePrepareLocalModel = async () => {
    setLocalModelAction("prepare");
    setLocalModelProgress({
      status: "running",
      percent: null,
      message: t("embedding.localModelPreparing") || "Preparing local model...",
    });

    try {
      const startedAt = performance.now();
      const engine = await getTransformersEmbeddingEngine(
        buildLocalTransformersConfig(),
        updateLocalModelProgress,
      );
      const elapsedMs = Math.round(performance.now() - startedAt);
      setLocalModelProgress({
        status: "ready",
        percent: 100,
        message:
          t("embedding.localModelReadyWithDevice", {
            device: engine.device,
            elapsedMs,
          }) || `Model ready on ${engine.device} (${elapsedMs} ms)`,
      });
      showToast(
        t("embedding.localModelPrepared") || "Local embedding model is ready",
        "success",
      );
      await refreshLocalModelCache();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error || "Unknown error");
      setLocalModelProgress({
        status: "error",
        percent: null,
        message,
      });
      showToast(
        t("embedding.localModelActionFailed") ||
          "Failed to prepare local model",
        "error",
      );
    } finally {
      setLocalModelAction(null);
    }
  };

  const handleTestLocalModel = async () => {
    const text = localModelTestText.trim();
    if (!text) {
      showToast(
        t("embedding.localModelTestEmpty") || "Please provide test text first",
        "error",
      );
      return;
    }

    setLocalModelAction("test");
    setLocalModelTestResult(null);
    setLocalModelProgress({
      status: "running",
      percent: null,
      message: t("embedding.localModelTesting") || "Testing local model...",
    });

    try {
      const startedAt = performance.now();
      const engine = await getTransformersEmbeddingEngine(
        buildLocalTransformersConfig(),
        updateLocalModelProgress,
      );
      const vectors = await engine.embed([text]);
      const elapsedMs = Math.round(performance.now() - startedAt);
      const vector = vectors[0];

      if (!Array.isArray(vector) || vector.length === 0) {
        throw new Error("Test embedding returned no vector");
      }

      setLocalModelTestResult({
        ok: true,
        dimensions: vector.length,
        elapsedMs,
        device: engine.device,
        message:
          t("embedding.localModelTestPassed", {
            dimensions: vector.length,
            elapsedMs,
            device: engine.device,
          }) ||
          `Embedding test passed (${vector.length} dims, ${elapsedMs} ms, ${engine.device})`,
      });
      setLocalModelProgress({
        status: "ready",
        percent: 100,
        message: t("embedding.localModelReady") || "Model runtime is ready.",
      });
      showToast(
        t("embedding.localModelTestSuccess") || "Local model test succeeded",
        "success",
      );
      await refreshLocalModelCache();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error || "Unknown error");
      setLocalModelTestResult({
        ok: false,
        dimensions: 0,
        elapsedMs: 0,
        message,
      });
      setLocalModelProgress({
        status: "error",
        percent: null,
        message,
      });
      showToast(
        t("embedding.localModelTestFailed") || "Local model test failed",
        "error",
      );
    } finally {
      setLocalModelAction(null);
    }
  };

  const handleClearCurrentModelCache = async () => {
    const confirmMessage =
      t("embedding.localModelClearConfirm", {
        model: localTransformersModel,
      }) || `Clear cached files for model ${localTransformersModel}?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLocalModelAction("clearModel");
    try {
      const result = await removeModelFromTransformersCache(
        localTransformersModel,
      );
      await resetTransformersEmbeddingEngine();
      await refreshLocalModelCache();
      showToast(
        t("embedding.localModelClearedCurrent", { count: result.deleted }) ||
          `Removed ${result.deleted} cached files`,
        "info",
      );
    } catch (error) {
      console.error(
        "[SettingsEmbedding] Failed clearing current model cache:",
        error,
      );
      showToast(
        t("embedding.localModelActionFailed") ||
          "Failed to update local model cache",
        "error",
      );
    } finally {
      setLocalModelAction(null);
    }
  };

  const handleClearAllModelCache = async () => {
    const confirmMessage =
      t("embedding.localModelClearAllConfirm") ||
      "Clear all local model cache files?";
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLocalModelAction("clearAll");
    try {
      const cleared = await clearTransformersCache();
      await resetTransformersEmbeddingEngine();
      await refreshLocalModelCache();
      showToast(
        cleared
          ? t("embedding.localModelClearedAll") || "Cleared local model cache"
          : t("embedding.localModelClearedNone") ||
              "No local model cache to clear",
        "info",
      );
    } catch (error) {
      console.error(
        "[SettingsEmbedding] Failed clearing all model cache:",
        error,
      );
      showToast(
        t("embedding.localModelActionFailed") ||
          "Failed to update local model cache",
        "error",
      );
    } finally {
      setLocalModelAction(null);
    }
  };

  // Handle model change confirmation
  const handleModelChangeConfirm = async (action: "rebuild" | "disable") => {
    const pendingSettings = modelChangeConfirm.pendingSettings;
    if (!pendingSettings) {
      setModelChangeConfirm({ show: false, pendingSettings: null });
      return;
    }

    if (action === "rebuild") {
      // Apply settings and trigger rebuild
      onUpdateSettings(pendingSettings);
      previousModelIdRef.current = pendingSettings.embedding.modelId;

      // Trigger rebuild through RAG context
      if (runtimeContext?.actions?.rag?.handleModelMismatch) {
        try {
          await runtimeContext.actions.rag.handleModelMismatch("rebuild");
          showToast(
            t("embedding.rebuildStarted") || "Rebuilding RAG index...",
            "info",
          );
        } catch (error) {
          console.error("Failed to rebuild RAG index:", error);
          showToast(
            t("embedding.rebuildFailed") || "Failed to rebuild index",
            "error",
          );
        }
      }
    } else {
      // Disable RAG
      const disabledSettings = {
        ...pendingSettings,
        embedding: {
          ...pendingSettings.embedding,
          enabled: false,
        },
      };
      onUpdateSettings(disabledSettings);
      previousModelIdRef.current = pendingSettings.embedding.modelId;

      // Terminate RAG service
      if (runtimeContext?.actions?.rag?.handleModelMismatch) {
        await runtimeContext.actions.rag.handleModelMismatch("disable");
      }
      showToast(t("embedding.ragDisabled") || "RAG has been disabled", "info");
    }

    setModelChangeConfirm({ show: false, pendingSettings: null });
  };

  // Cancel model change
  const handleModelChangeCancel = () => {
    setModelChangeConfirm({ show: false, pendingSettings: null });
  };

  const getModelsForProvider = () => {
    return models[config.providerId] || [];
  };

  const getProviderById = (providerId: string) => {
    return currentSettings.providers.instances.find((p) => p.id === providerId);
  };

  const handleLocalModelPresetChange = (nextValue: string) => {
    if (nextValue === "__custom__") {
      return;
    }
    updateEmbedding("modelId", nextValue);
    setCustomLocalModelId(nextValue);
    setLocalModelProgress(null);
    setLocalModelTestResult(null);
  };

  const handleApplyCustomLocalModel = () => {
    const modelId = customLocalModelId.trim();
    if (!modelId) {
      showToast(
        t("embedding.localModelCustomRequired") ||
          "Please enter a valid model id",
        "error",
      );
      return;
    }
    updateEmbedding("modelId", modelId);
    setLocalModelProgress(null);
    setLocalModelTestResult(null);
  };

  const currentProvider = getProviderById(config.providerId);
  const isProviderEnabled = currentProvider?.enabled ?? false;
  const hasApiKey =
    currentProvider?.apiKey && currentProvider.apiKey.trim() !== "";

  // Check if there are any available providers
  const availableProviders = currentSettings.providers.instances.filter(
    (p) => p.enabled && p.apiKey && p.apiKey.trim() !== "",
  );
  const hasNoAvailableProviders =
    !isLocalRuntime && availableProviders.length === 0;

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Warning: No available providers */}
      {hasNoAvailableProviders && isEnabled && (
        <div className="border-l-2 border-red-500/60 pl-3 py-2 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-1">
              {t("embedding.noAvailableProviders") || "No Available Providers"}
            </h4>
            <p className="text-xs text-red-400">
              {t("embedding.noAvailableProvidersDesc") ||
                "No providers are available for embedding. Please go to the Providers tab to enable at least one provider and configure its API key."}
            </p>
          </div>
        </div>
      )}

      {/* Enable Toggle */}
      <div className="flex items-center justify-between pb-4 border-b border-theme-border">
        <div>
          <label className="text-sm font-bold text-theme-primary uppercase tracking-widest">
            {t("embedding.title") || "RAG Embedding"}
          </label>
          <p className="text-xs text-theme-muted mt-1 italic">
            {t("embedding.description") ||
              "Enable semantic search for story context retrieval"}
          </p>
        </div>
        <button
          onClick={() => updateEmbedding("enabled", !isEnabled)}
          className={`w-10 h-5 rounded-full relative transition-colors ${
            isEnabled ? "bg-green-500" : "bg-theme-border"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              isEnabled ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      <div
        className={`space-y-4 ${!isEnabled ? "opacity-40 pointer-events-none" : ""}`}
      >
        {/* Runtime Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-theme-muted uppercase tracking-widest">
            {t("embedding.runtime") || "Runtime"}
          </label>
          <select
            value={runtime}
            onChange={(e) => updateEmbedding("runtime", e.target.value)}
            className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-xs focus:border-theme-primary outline-none [&>option]:bg-theme-bg [&>option]:text-theme-text"
          >
            <option value="local_transformers">
              {t("embedding.runtimeLocalTransformers") ||
                "Local (Transformers.js, default)"}
            </option>
            <option value="local_tfjs">
              {t("embedding.runtimeLocalTfjs") || "Local (TFJS fallback)"}
            </option>
            <option value="remote">
              {t("embedding.runtimeRemote") || "Remote API"}
            </option>
          </select>
        </div>

        {isLocalRuntime && (
          <div className="border-l-2 border-red-500/60 pl-3 py-2 text-xs text-red-400 space-y-1">
            <div className="font-bold uppercase tracking-wider">
              {t("embedding.localWarningTitle") ||
                "Local Embedding (Privacy First)"}
            </div>
            <div>
              {isLocalTransformers
                ? t("embedding.localWarningDescTransformers") ||
                  "Runs embeddings on-device with Transformers.js (prefers WebGPU when available). Better privacy and no external embedding API, but model download/init can be slow and memory usage can be high."
                : t("embedding.localWarningDescTfjs") ||
                  "Runs embeddings on-device with TFJS (WebGPU → WebGL → CPU). Better privacy, but initialization is slower, memory usage is higher, and search performance may be noticeably worse."}
            </div>
          </div>
        )}

        {isLocalTransformers && (
          <div className="space-y-3 border border-theme-border/60 rounded p-3 bg-theme-surface-highlight/40">
            <div className="space-y-2">
              <label className="text-xs font-bold text-theme-muted uppercase tracking-widest">
                {t("embedding.localModel") || "Local Transformers Model"}
              </label>
              <select
                value={localTransformersSelectValue}
                onChange={(e) => handleLocalModelPresetChange(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-xs focus:border-theme-primary outline-none [&>option]:bg-theme-bg [&>option]:text-theme-text"
              >
                {LOCAL_TRANSFORMERS_MODEL_OPTIONS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label} ({model.dimensions}
                    {t("embedding.dimensions", "d")})
                  </option>
                ))}
                <option value="__custom__">
                  {t("embedding.localModelCustom") || "Custom Model ID"}
                </option>
              </select>
              {localTransformersSelectValue === "__custom__" && (
                <div className="flex gap-2">
                  <input
                    value={customLocalModelId}
                    onChange={(e) => setCustomLocalModelId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyCustomLocalModel();
                      }
                    }}
                    placeholder={
                      t("embedding.localModelCustomPlaceholder") ||
                      "e.g. Xenova/paraphrase-multilingual-MiniLM-L12-v2"
                    }
                    className="flex-1 bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-xs font-mono focus:border-theme-primary outline-none"
                  />
                  <button
                    onClick={handleApplyCustomLocalModel}
                    className="px-3 py-2 bg-theme-primary hover:bg-theme-primary/80 text-theme-bg rounded text-xs font-bold transition-colors"
                  >
                    {t("embedding.applyLocalModel") || "Apply"}
                  </button>
                </div>
              )}
              <p className="text-[10px] text-theme-muted">
                {localTransformersModelMeta
                  ? t("embedding.localModelHelp", {
                      languages:
                        localTransformersModelMeta.languages.join(", "),
                      approxSizeMB: localTransformersModelMeta.approxSizeMB,
                    }) ||
                    `${localTransformersModelMeta.description} Languages: ${localTransformersModelMeta.languages.join(", ")}. Approx ${localTransformersModelMeta.approxSizeMB} MB download.`
                  : t("embedding.localModelCustomHint") ||
                    "Using custom model ID. Ensure the model is compatible with transformers.js feature-extraction pipeline."}
              </p>
            </div>

            <div className="border-t border-theme-border/50 pt-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-theme-muted uppercase tracking-widest">
                    {t("embedding.localModelManager") || "Local Model Manager"}
                  </div>
                  <p className="text-[10px] text-theme-muted mt-1">
                    {t("embedding.localModelManagerDesc") ||
                      "Preload, test, and clear browser cache for local embedding models."}
                  </p>
                </div>
                <button
                  onClick={() => void refreshLocalModelCache()}
                  disabled={
                    isLoadingLocalModelCache || localModelAction !== null
                  }
                  className="px-2 py-1 border border-theme-border rounded text-[10px] text-theme-text hover:bg-theme-surface transition-colors disabled:opacity-50"
                >
                  {isLoadingLocalModelCache
                    ? t("loading") || "Loading..."
                    : t("refresh") || "Refresh"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button
                  onClick={handlePrepareLocalModel}
                  disabled={localModelAction !== null}
                  className="px-3 py-2 border border-theme-border rounded text-xs text-theme-text hover:bg-theme-surface transition-colors disabled:opacity-50"
                >
                  {localModelAction === "prepare"
                    ? t("embedding.localModelPreparing") || "Preparing..."
                    : t("embedding.localModelPrepareButton") ||
                      "Download / Initialize"}
                </button>
                <button
                  onClick={handleTestLocalModel}
                  disabled={localModelAction !== null}
                  className="px-3 py-2 border border-theme-border rounded text-xs text-theme-text hover:bg-theme-surface transition-colors disabled:opacity-50"
                >
                  {localModelAction === "test"
                    ? t("embedding.localModelTesting") || "Testing..."
                    : t("embedding.localModelTestButton") || "Run Test"}
                </button>
              </div>

              <textarea
                value={localModelTestText}
                onChange={(e) => setLocalModelTestText(e.target.value)}
                rows={2}
                className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-xs focus:border-theme-primary outline-none"
                placeholder={
                  t("embedding.localModelTestPlaceholder") ||
                  "Enter sample text for embedding test..."
                }
              />

              {localModelProgress && (
                <div
                  className={`rounded border px-2 py-2 text-[10px] ${
                    localModelProgress.status === "error"
                      ? "border-red-500/50 text-red-300"
                      : "border-theme-border text-theme-muted"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{localModelProgress.message}</span>
                    {localModelProgress.percent !== null && (
                      <span className="font-mono">
                        {Math.round(localModelProgress.percent)}%
                      </span>
                    )}
                  </div>
                  {localModelProgress.percent !== null && (
                    <div className="mt-2 h-1 bg-theme-border/60 rounded overflow-hidden">
                      <div
                        className="h-full bg-theme-primary transition-all duration-200"
                        style={{
                          width: `${Math.max(0, Math.min(100, localModelProgress.percent))}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {localModelTestResult && (
                <div
                  className={`rounded border px-2 py-2 text-[10px] ${
                    localModelTestResult.ok
                      ? "border-green-500/40 text-green-300"
                      : "border-red-500/50 text-red-300"
                  }`}
                >
                  {localModelTestResult.message}
                </div>
              )}

              <div className="border-t border-theme-border/50 pt-3 space-y-2">
                <div className="text-xs font-bold text-theme-muted uppercase tracking-widest">
                  {t("embedding.localModelCache") || "Model Cache"}
                </div>
                {!localModelCacheSummary?.available ? (
                  <p className="text-[10px] text-theme-muted">
                    {t("embedding.localModelCacheUnavailable") ||
                      "Browser cache API is not available in this runtime."}
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="rounded border border-theme-border/60 px-2 py-1">
                        <div className="text-theme-muted">
                          {t("embedding.localModelCacheFiles") || "Files"}
                        </div>
                        <div className="font-mono text-theme-text">
                          {localModelCacheSummary.totalEntries}
                        </div>
                      </div>
                      <div className="rounded border border-theme-border/60 px-2 py-1">
                        <div className="text-theme-muted">
                          {t("embedding.localModelCacheSize") || "Size"}
                        </div>
                        <div className="font-mono text-theme-text">
                          {formatStorageBytes(
                            localModelCacheSummary.totalBytes,
                          )}
                        </div>
                      </div>
                    </div>

                    {localModelCacheSummary.models.length === 0 && (
                      <p className="text-[10px] text-theme-muted">
                        {t("embedding.localModelCacheEmpty") ||
                          "No cached model files."}
                      </p>
                    )}

                    {localModelCacheSummary.models.length > 0 && (
                      <div className="max-h-32 overflow-auto rounded border border-theme-border/40 text-[10px]">
                        {localModelCacheSummary.models.map((item) => (
                          <div
                            key={item.modelId}
                            className="flex items-center justify-between px-2 py-1 border-b last:border-b-0 border-theme-border/30"
                          >
                            <span className="font-mono text-theme-text truncate pr-2">
                              {item.modelId}
                            </span>
                            <span className="text-theme-muted whitespace-nowrap">
                              {item.fileCount} /{" "}
                              {formatStorageBytes(item.totalBytes)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleClearCurrentModelCache}
                        disabled={localModelAction !== null}
                        className="px-3 py-1 border border-theme-border rounded text-[10px] text-theme-text hover:bg-theme-surface transition-colors disabled:opacity-50"
                      >
                        {localModelAction === "clearModel"
                          ? t("loading") || "Loading..."
                          : t("embedding.localModelClearCurrent") ||
                            "Clear Current Model Cache"}
                      </button>
                      <button
                        onClick={handleClearAllModelCache}
                        disabled={localModelAction !== null}
                        className="px-3 py-1 border border-red-500/50 rounded text-[10px] text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      >
                        {localModelAction === "clearAll"
                          ? t("loading") || "Loading..."
                          : t("embedding.localModelClearAll") ||
                            "Clear All Model Cache"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {!isLocalRuntime && (
          <>
            {/* 刷新按钮 */}
            <div className="flex justify-end">
              <button
                onClick={() => fetchModelsForProvider(config.providerId, true)}
                disabled={
                  loadingModels[config.providerId] ||
                  !config.providerId ||
                  hasNoAvailableProviders
                }
                className="px-3 py-1 bg-theme-surface-highlight border border-theme-border rounded text-xs text-theme-text hover:bg-theme-primary hover:text-theme-bg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingModels[config.providerId] ? (
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    ></path>
                  </svg>
                )}
                {t("refresh") || "Refresh"}
              </button>
            </div>

            {/* Provider Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-theme-muted uppercase tracking-widest">
                {t("embedding.provider") || "Provider"}
              </label>
              <select
                value={config.providerId}
                onChange={(e) => updateEmbedding("providerId", e.target.value)}
                className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-xs focus:border-theme-primary outline-none [&>option]:bg-theme-bg [&>option]:text-theme-text"
              >
                {currentSettings.providers.instances
                  .filter((p) => p.enabled)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.protocol})
                    </option>
                  ))}
              </select>
              {!isProviderEnabled && (
                <div className="text-[10px] text-yellow-500 mt-1 font-bold uppercase tracking-wider">
                  {t("embedding.providerDisabled") ||
                    "Selected provider is disabled"}
                </div>
              )}
              {!hasApiKey && isProviderEnabled && (
                <div className="text-[10px] text-red-500 mt-1 font-bold uppercase tracking-wider">
                  {t("embedding.noApiKey") ||
                    "Provider has no API key configured"}
                </div>
              )}
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-theme-muted uppercase tracking-widest">
                  {t("embedding.model") || "Embedding Model"}
                </label>
                {loadingModels[config.providerId] && (
                  <span className="text-[10px] text-theme-muted animate-pulse">
                    {t("loading") || "Loading..."}
                  </span>
                )}
              </div>
              <select
                value={config.modelId}
                onChange={(e) => updateEmbedding("modelId", e.target.value)}
                disabled={loadingModels[config.providerId]}
                className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-xs focus:border-theme-primary outline-none font-mono [&>option]:bg-theme-bg [&>option]:text-theme-text disabled:opacity-50"
              >
                <option value="">
                  {getModelsForProvider().length === 0
                    ? t("embedding.noModels") || "No models available"
                    : t("embedding.selectModel") || "Select a model..."}
                </option>
                {getModelsForProvider().map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.dimensions}
                    {t("embedding.dimensions", "d")})
                  </option>
                ))}
              </select>
              {!config.modelId && getModelsForProvider().length > 0 && (
                <div className="text-[10px] text-yellow-500 mt-1 font-bold uppercase tracking-wider">
                  {t("embedding.noModelSelected") ||
                    "Please select an embedding model"}
                </div>
              )}
              {getModelsForProvider().length === 0 &&
                !loadingModels[config.providerId] && (
                  <div className="text-[10px] text-red-500 mt-1 font-bold uppercase tracking-wider">
                    {t("embedding.noModelsAvailable") ||
                      "This provider does not support embedding models"}
                  </div>
                )}
            </div>
          </>
        )}

        {/* Dimensions Display */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-theme-muted uppercase tracking-widest">
            {t("embedding.dimensions") || "Dimensions"}
          </span>
          <span className="text-theme-text font-mono">
            {config.dimensions || t("embedding.notSet") || "Not set"}
          </span>
        </div>

        {/* Advanced Settings */}
        <details className="group pt-2">
          <summary className="text-xs font-bold text-theme-muted uppercase tracking-widest cursor-pointer hover:text-theme-primary transition-colors select-none flex items-center gap-2">
            <svg
              className="w-3 h-3 transition-transform group-open:rotate-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            {t("embedding.advanced") || "Advanced Settings"}
          </summary>

          <div className="mt-4 space-y-4 pl-4 border-l-2 border-theme-border/30">
            {/* Top K */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted">
                  {t("embedding.topK") || "Top K Results"}
                </label>
                <span className="text-[10px] font-mono text-theme-text">
                  {config.topK || 5}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={config.topK || 5}
                onChange={(e) =>
                  updateEmbedding("topK", parseInt(e.target.value))
                }
                className="w-full h-1 bg-theme-border rounded-lg appearance-none cursor-pointer accent-theme-primary"
              />
              <p className="text-[9px] text-theme-muted/70 italic">
                {t("embedding.topKHelp") ||
                  "Number of similar results to retrieve"}
              </p>
            </div>

            {/* Similarity Threshold */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted">
                  {t("embedding.threshold") || "Similarity Threshold"}
                </label>
                <span className="text-[10px] font-mono text-theme-text">
                  {(config.similarityThreshold || 0.7).toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.similarityThreshold || 0.7}
                onChange={(e) =>
                  updateEmbedding(
                    "similarityThreshold",
                    parseFloat(e.target.value),
                  )
                }
                className="w-full h-1 bg-theme-border rounded-lg appearance-none cursor-pointer accent-theme-primary"
              />
              <p className="text-[9px] text-theme-muted/70 italic">
                {t("embedding.thresholdHelp") ||
                  "Minimum similarity score (0-1) for results"}
              </p>
            </div>

            {/* Storage Resource Limits */}
            <div className="pt-4 border-t border-theme-border/30 space-y-4">
              <div className="text-xs font-bold text-theme-muted uppercase tracking-widest">
                {t("embedding.storageLimits") || "Storage Limits"}
              </div>

              {/* Max Storage Documents */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-[10px] uppercase tracking-wider text-theme-muted">
                    {t("embedding.maxStorage") || "Max Storage Documents"}
                  </label>
                  <span className="text-[10px] font-mono text-theme-text">
                    {(config.storage ?? config.lru)?.maxStorageDocuments ||
                      10000}
                  </span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="50000"
                  step="1000"
                  value={
                    (config.storage ?? config.lru)?.maxStorageDocuments || 10000
                  }
                  onChange={(e) =>
                    updateEmbedding("storage", {
                      ...(config.storage ?? config.lru),
                      maxStorageDocuments: parseInt(e.target.value),
                    })
                  }
                  className="w-full h-1 bg-theme-border rounded-lg appearance-none cursor-pointer accent-theme-primary"
                />
              </div>

              {/* Max RAG Storage MB */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-[10px] uppercase tracking-wider text-theme-muted">
                    {t("embedding.storageLimitMB") || "RAG Storage Budget (MB)"}
                  </label>
                  <span className="text-[10px] font-mono text-theme-text">
                    {(config.storage ?? config.lru)?.maxRagStorageMB || 512} MB
                  </span>
                </div>
                <input
                  type="range"
                  min="128"
                  max="4096"
                  step="64"
                  value={(config.storage ?? config.lru)?.maxRagStorageMB || 512}
                  onChange={(e) =>
                    updateEmbedding("storage", {
                      ...(config.storage ?? config.lru),
                      maxRagStorageMB: parseInt(e.target.value),
                    })
                  }
                  className="w-full h-1 bg-theme-border rounded-lg appearance-none cursor-pointer accent-theme-primary"
                />
                <p className="text-[9px] text-theme-muted/70 italic">
                  {t("embedding.storageLimitMBHelp") ||
                    "Controls reclaimable RAG storage. Protected current-fork latest chunks are never evicted."}
                </p>
              </div>

              {/* Max Docs Per Type */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-[10px] uppercase tracking-wider text-theme-muted">
                    {t("embedding.maxPerType") || "Max Per Type"}
                  </label>
                  <span className="text-[10px] font-mono text-theme-text">
                    {(config.storage ?? config.lru)?.maxDocumentsPerType ||
                      2000}
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="10000"
                  step="100"
                  value={
                    (config.storage ?? config.lru)?.maxDocumentsPerType || 2000
                  }
                  onChange={(e) =>
                    updateEmbedding("storage", {
                      ...(config.storage ?? config.lru),
                      maxDocumentsPerType: parseInt(e.target.value),
                    })
                  }
                  className="w-full h-1 bg-theme-border rounded-lg appearance-none cursor-pointer accent-theme-primary"
                />
              </div>

              {/* Max Versions Per Entity */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-[10px] uppercase tracking-wider text-theme-muted">
                    {t("embedding.maxVersions") || "Versions Per Entity"}
                  </label>
                  <span className="text-[10px] font-mono text-theme-text">
                    {(config.storage ?? config.lru)?.maxVersionsPerEntity || 5}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={
                    (config.storage ?? config.lru)?.maxVersionsPerEntity || 5
                  }
                  onChange={(e) =>
                    updateEmbedding("storage", {
                      ...(config.storage ?? config.lru),
                      maxVersionsPerEntity: parseInt(e.target.value),
                    })
                  }
                  className="w-full h-1 bg-theme-border rounded-lg appearance-none cursor-pointer accent-theme-primary"
                />
              </div>
            </div>
          </div>
        </details>

        {/* Status Info */}
        <div className="mt-4 p-3 bg-theme-surface-highlight rounded border border-theme-border">
          <div className="flex items-center gap-2 text-xs text-theme-muted">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              {isLocalRuntime
                ? isLocalTransformers
                  ? t("embedding.localStatusInfoTransformers") ||
                    "Local Transformers.js runtime is active (WebGPU preferred when available). Embeddings are generated on-device for stronger privacy."
                  : t("embedding.localStatusInfoTfjs") ||
                    "Local TFJS runtime is active. Embeddings are generated on-device for better privacy."
                : t("embedding.statusInfo") ||
                  "Embeddings will be generated when story content is created. This enables semantic search for relevant context during story generation."}
            </span>
          </div>

          {ragStatus && (
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-theme-muted">
                <span>
                  {t("embedding.storageLimitMB") || "RAG Storage Budget (MB)"}
                </span>
                <span className="font-mono text-theme-text">
                  {formatStorageBytes(ragStatus.storageLimitBytes || 0)}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                <div className="rounded border border-theme-border/60 px-2 py-1">
                  <div className="text-theme-muted">
                    {t("embedding.storageTierProtected") || "Protected"}
                  </div>
                  <div className="font-mono text-theme-text">
                    {formatStorageBytes(ragStatus.protectedBytes || 0)}
                  </div>
                </div>
                <div className="rounded border border-theme-border/60 px-2 py-1">
                  <div className="text-theme-muted">
                    {t("embedding.storageTierCurrentForkHistory") ||
                      "Current Fork History"}
                  </div>
                  <div className="font-mono text-theme-text">
                    {formatStorageBytes(ragStatus.currentForkHistoryBytes || 0)}
                  </div>
                </div>
                <div className="rounded border border-theme-border/60 px-2 py-1">
                  <div className="text-theme-muted">
                    {t("embedding.storageTierActiveOtherFork") ||
                      "Active Save Other Forks"}
                  </div>
                  <div className="font-mono text-theme-text">
                    {formatStorageBytes(ragStatus.activeOtherForkBytes || 0)}
                  </div>
                </div>
                <div className="rounded border border-theme-border/60 px-2 py-1">
                  <div className="text-theme-muted">
                    {t("embedding.storageTierInactiveGame") || "Inactive Saves"}
                  </div>
                  <div className="font-mono text-theme-text">
                    {formatStorageBytes(ragStatus.inactiveGameBytes || 0)}
                  </div>
                </div>
                <div className="rounded border border-theme-border/60 px-2 py-1">
                  <div className="text-theme-muted">
                    {t("embedding.runtimeEngineLabel") || "Runtime Engine"}
                  </div>
                  <div className="font-mono text-theme-text">
                    {localRuntimeEngine}
                  </div>
                </div>
                <div className="rounded border border-theme-border/60 px-2 py-1">
                  <div className="text-theme-muted">
                    {t("embedding.runtimeBackendLabel") || "Runtime Backend"}
                  </div>
                  <div className="font-mono text-theme-text">
                    {localRuntimeBackend}
                  </div>
                </div>
              </div>

              {ragStatus.protectedOverflow && (
                <div className="text-[10px] text-yellow-300 border border-yellow-500/40 bg-yellow-500/10 rounded px-2 py-1">
                  {t("embedding.protectedOverflowWarning") ||
                    "Protected current-fork latest vectors already exceed the configured budget. Increase budget or disable RAG."}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Model Change Confirmation Dialog */}
      {modelChangeConfirm.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-surface border border-theme-border rounded-lg shadow-xl max-w-md mx-4 overflow-hidden">
            <div className="p-4 border-b border-theme-border bg-theme-surface-highlight/50">
              <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest">
                {t("embedding.modelChangeTitle") || "Model Change Detected"}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-theme-text">
                {t("embedding.modelChangeDesc") ||
                  "You are changing the embedding model. The existing RAG index was built with a different model and will not work correctly."}
              </p>
              <p className="text-xs text-theme-muted italic">
                {t("embedding.modelChangeOptions") ||
                  "Choose to rebuild the index (recommended) or disable RAG for now."}
              </p>
            </div>
            <div className="p-4 border-t border-theme-border bg-theme-surface/50 flex justify-end gap-3">
              <button
                onClick={handleModelChangeCancel}
                className="px-4 py-2 text-xs text-theme-muted hover:text-theme-text transition-colors"
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                onClick={() => handleModelChangeConfirm("disable")}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded text-xs font-medium transition-colors"
              >
                {t("embedding.disableRag") || "Disable RAG"}
              </button>
              <button
                onClick={() => handleModelChangeConfirm("rebuild")}
                className="px-4 py-2 bg-theme-primary hover:bg-theme-primary/80 text-theme-bg rounded text-xs font-bold transition-colors"
              >
                {t("embedding.rebuildIndex") || "Rebuild Index"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
