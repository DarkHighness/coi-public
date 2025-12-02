import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  getEmbeddingModels,
  EmbeddingModelInfo,
} from "../../services/aiService";
import { useSettings } from "../../hooks/useSettings";
import { useOptionalRAGContext } from "../../contexts/RAGContext";

interface SettingsEmbeddingProps {
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export const SettingsEmbedding: React.FC<SettingsEmbeddingProps> = ({
  showToast,
}) => {
  const { t } = useTranslation();
  const ragContext = useOptionalRAGContext();
  const { settings: currentSettings, updateSettings: onUpdateSettings } =
    useSettings();
  const config = currentSettings.embedding;
  const isEnabled = config?.enabled ?? false;

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

  // Fetch models from API for a provider
  // 支持强制刷新 force 参数
  const fetchModelsForProvider = useCallback(
    async (providerId: string, force = false) => {
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
    if (isEnabled && config.providerId) {
      fetchModelsForProvider(config.providerId);
    }
  }, [config.providerId, isEnabled]);

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
      const providerId = config.providerId;
      const providerModels = models[providerId] || [];
      const model = providerModels.find((m) => m.id === value);
      if (model?.dimensions) {
        newSettings.embedding.dimensions = model.dimensions;
      }

      // Check if model has changed and RAG has existing index
      const prevModel = previousModelIdRef.current;
      const hasExistingIndex =
        ragContext?.isInitialized &&
        ragContext?.status?.storageDocuments &&
        ragContext.status.storageDocuments > 0;

      if (prevModel && prevModel !== value && hasExistingIndex) {
        // Show confirmation dialog
        setModelChangeConfirm({ show: true, pendingSettings: newSettings });
        return; // Don't apply settings yet
      }

      // Update reference
      previousModelIdRef.current = value;
    }

    // Reset model when provider changes
    if (field === "providerId") {
      newSettings.embedding.modelId = "";
      // Trigger fetch for new provider
      fetchModelsForProvider(value);

      // Also check for existing index when provider changes
      const hasExistingIndex =
        ragContext?.isInitialized &&
        ragContext?.status?.storageDocuments &&
        ragContext.status.storageDocuments > 0;
      if (previousModelIdRef.current && hasExistingIndex) {
        setModelChangeConfirm({ show: true, pendingSettings: newSettings });
        return;
      }

      previousModelIdRef.current = null;
    }

    onUpdateSettings(newSettings);
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
      if (ragContext?.actions?.handleModelMismatch) {
        try {
          await ragContext.actions.handleModelMismatch("rebuild");
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
      if (ragContext?.actions?.handleModelMismatch) {
        await ragContext.actions.handleModelMismatch("disable");
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

  const currentProvider = getProviderById(config.providerId);
  const isProviderEnabled = currentProvider?.enabled ?? false;
  const hasApiKey =
    currentProvider?.apiKey && currentProvider.apiKey.trim() !== "";

  // Check if there are any available providers
  const availableProviders = currentSettings.providers.instances.filter(
    (p) => p.enabled && p.apiKey && p.apiKey.trim() !== "",
  );
  const hasNoAvailableProviders = availableProviders.length === 0;

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Warning: No available providers */}
      {hasNoAvailableProviders && isEnabled && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-4 flex items-start gap-3">
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
            {t("refresh") || "刷新"}
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
              {t("embedding.noApiKey") || "Provider has no API key configured"}
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
              {t("embedding.statusInfo") ||
                "Embeddings will be generated when story content is created. This enables semantic search for relevant context during story generation."}
            </span>
          </div>
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
