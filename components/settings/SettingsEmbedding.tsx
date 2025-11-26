import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AISettings } from "../../types";
import {
  getEmbeddingModels,
  EmbeddingModelInfo,
} from "../../services/aiService";
import { EMBEDDING_MODELS } from "../../services/embedding";

interface SettingsEmbeddingProps {
  currentSettings: AISettings;
  onUpdateSettings: (settings: AISettings) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export const SettingsEmbedding: React.FC<SettingsEmbeddingProps> = ({
  currentSettings,
  onUpdateSettings,
  showToast,
}) => {
  const { t } = useTranslation();
  const config = currentSettings.embedding;
  const isEnabled = config?.enabled ?? false;

  // State for dynamically fetched models
  const [models, setModels] = useState<Record<string, EmbeddingModelInfo[]>>({
    gemini: EMBEDDING_MODELS.gemini || [],
    openai: EMBEDDING_MODELS.openai || [],
    openrouter: EMBEDDING_MODELS.openrouter || [],
  });
  const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({
    gemini: false,
    openai: false,
    openrouter: false,
  });

  // Fetch models from API for a provider
  const fetchModelsForProvider = useCallback(
    async (provider: "gemini" | "openai" | "openrouter") => {
      if (loadingModels[provider]) return;

      setLoadingModels((prev) => ({ ...prev, [provider]: true }));
      try {
        const fetchedModels = await getEmbeddingModels(provider);
        if (fetchedModels.length > 0) {
          setModels((prev) => ({ ...prev, [provider]: fetchedModels }));
        }
      } catch (error) {
        console.error(
          `Failed to fetch embedding models for ${provider}:`,
          error,
        );
        // Keep using fallback models
      } finally {
        setLoadingModels((prev) => ({ ...prev, [provider]: false }));
      }
    },
    [loadingModels],
  );

  // Fetch models when provider changes or component mounts
  useEffect(() => {
    if (isEnabled && config.provider) {
      fetchModelsForProvider(config.provider);
    }
  }, [config.provider, isEnabled]);

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
      const provider = config.provider;
      const providerModels = models[provider] || [];
      const model = providerModels.find((m) => m.id === value);
      if (model?.dimensions) {
        newSettings.embedding.dimensions = model.dimensions;
      }
    }

    // Reset model when provider changes
    if (field === "provider") {
      const providerModels = models[value as keyof typeof models] || [];
      if (providerModels.length > 0) {
        newSettings.embedding.modelId = providerModels[0].id;
        newSettings.embedding.dimensions = providerModels[0].dimensions;
      }
      // Trigger fetch for new provider
      fetchModelsForProvider(value as "gemini" | "openai" | "openrouter");
    }

    onUpdateSettings(newSettings);
  };

  const getModelsForProvider = () => {
    return models[config.provider as keyof typeof models] || [];
  };

  return (
    <div className="space-y-6 animate-slide-in">
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
        {/* Provider Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-theme-muted uppercase tracking-widest">
            {t("embedding.provider") || "Provider"}
          </label>
          <select
            value={config.provider}
            onChange={(e) => updateEmbedding("provider", e.target.value)}
            className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-xs focus:border-theme-primary outline-none [&>option]:bg-theme-bg [&>option]:text-theme-text"
          >
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-theme-muted uppercase tracking-widest">
              {t("embedding.model") || "Embedding Model"}
            </label>
            {loadingModels[config.provider] && (
              <span className="text-[10px] text-theme-muted animate-pulse">
                {t("loading") || "Loading..."}
              </span>
            )}
          </div>
          <select
            value={config.modelId}
            onChange={(e) => updateEmbedding("modelId", e.target.value)}
            disabled={loadingModels[config.provider]}
            className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-xs focus:border-theme-primary outline-none font-mono [&>option]:bg-theme-bg [&>option]:text-theme-text disabled:opacity-50"
          >
            {getModelsForProvider().map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.dimensions}d)
              </option>
            ))}
          </select>
        </div>

        {/* Dimensions Display */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-theme-muted uppercase tracking-widest">
            {t("embedding.dimensions") || "Dimensions"}
          </span>
          <span className="text-theme-text font-mono">
            {config.dimensions || 768}
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
    </div>
  );
};
