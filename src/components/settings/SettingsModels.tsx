import React from "react";
import { useTranslation } from "react-i18next";
import { filterModels } from "../../services/aiService";
import { FunctionKey } from "./types";
import { AISettings } from "../../types";
import { useSettings } from "../../hooks/useSettings";

interface SettingsModelsProps {
  showToast: (msg: string, type?: "info" | "error") => void;
}

export const SettingsModels: React.FC<SettingsModelsProps> = ({
  showToast,
}) => {
  const { t } = useTranslation();
  const {
    settings: currentSettings,
    updateSettings: onUpdateSettings,
    providerModels,
    isLoadingModels: loadingModels,
    loadModels: onLoadModels,
  } = useSettings();

  // Toggle custom model input mode (persisted in settings)
  const toggleCustomMode = (sectionKey: FunctionKey) => {
    const config = currentSettings[sectionKey];
    onUpdateSettings({
      ...currentSettings,
      [sectionKey]: {
        ...config,
        isCustomModel: !config.isCustomModel,
      },
    });
  };

  // Auto-refresh models on mount if empty
  React.useEffect(() => {
    const hasModels = Object.keys(providerModels).length > 0;
    if (!hasModels && !loadingModels) {
      onLoadModels(false);
    }
  }, []);

  const getFilteredModels = (providerId: string, type: FunctionKey) => {
    const list = providerModels[providerId] || [];
    return filterModels(
      list,
      type,
      currentSettings.extra?.disableModelFilter ?? false,
    );
  };

  const getProviderById = (providerId: string) => {
    return currentSettings.providers.instances.find((p) => p.id === providerId);
  };

  const updateFunction = (func: FunctionKey, field: string, value: any) => {
    // Special handling for model selection on text-related functions
    const textFunctions: FunctionKey[] = ["story", "lore", "script"];

    if (
      field === "modelId" &&
      textFunctions.includes(func) &&
      value !== currentSettings[func].modelId
    ) {
      // Check if all text functions currently have invalid models
      const allInvalid = textFunctions.every((fn) => {
        const config = currentSettings[fn];
        const modelList = getFilteredModels(config.providerId, fn);
        return !modelList.some((m) => m.id === config.modelId);
      });

      if (allInvalid) {
        // Prompt user for batch update
        const shouldBatchUpdate = window.confirm(
          t("models.batchUpdatePrompt") ||
            "All text-related models are currently unavailable. Would you like to apply this model selection to Story, Lore, and Script functions?",
        );

        if (shouldBatchUpdate) {
          // Batch update all text functions
          const newSettings = { ...currentSettings };
          textFunctions.forEach((fn) => {
            newSettings[fn] = {
              ...currentSettings[fn],
              providerId: currentSettings[func].providerId, // Use the providerId from the function being updated
              modelId: value,
            };
          });
          onUpdateSettings(newSettings);
          showToast(
            t("models.batchUpdateSuccess") ||
              "Model updated for all text-related functions",
            "info",
          );
          return;
        }
      }
    }

    // Normal single function update
    const newSettings = {
      ...currentSettings,
      [func]: { ...currentSettings[func], [field]: value },
    };

    // If changing providerId, clear modelId
    if (field === "providerId") {
      newSettings[func].modelId = "";
    }

    onUpdateSettings(newSettings);
  };

  // Check if there are any available providers
  const availableProviders = currentSettings.providers.instances.filter(
    (p) => p.enabled && p.apiKey && p.apiKey.trim() !== "",
  );
  const hasNoAvailableProviders = availableProviders.length === 0;

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Warning: No available providers */}
      {hasNoAvailableProviders && (
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
              {t("providers.noAvailableProviders") || "No Available Providers"}
            </h4>
            <p className="text-xs text-red-400">
              {t("providers.noAvailableProvidersDesc") ||
                "No providers are available. Please go to the Providers tab to enable at least one provider and configure its API key."}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => onLoadModels(true)}
          disabled={loadingModels || hasNoAvailableProviders}
          className="px-3 py-1 bg-theme-surface-highlight border border-theme-border rounded text-xs text-theme-text hover:bg-theme-primary hover:text-theme-bg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingModels ? (
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
          {t("refresh")}
        </button>
      </div>

      {/* Disable Model Filter Toggle */}
      <div className="flex items-center justify-between p-3 bg-theme-bg border border-yellow-500/30 rounded">
        <div>
          <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
            {t("models.disableFilter") || "Disable Model Filter"}
          </div>
          <div className="text-[10px] text-theme-muted mt-1">
            {t("models.disableFilterHelp") ||
              "Show all models, bypassing capability detection. Use with caution."}
          </div>
        </div>
        <button
          onClick={() => {
            const newValue = !currentSettings.extra?.disableModelFilter;
            if (newValue) {
              // Show warning when enabling
              const confirmed = window.confirm(
                t("models.disableFilterWarning") ||
                  "⚠️ WARNING ⚠️\n\nDisabling model filter will show ALL models regardless of their capabilities.\n\nSelecting an incompatible model may cause generation to fail.\n\nAre you sure you want to proceed?",
              );
              if (!confirmed) return;
            }
            onUpdateSettings({
              ...currentSettings,
              extra: {
                ...currentSettings.extra,
                disableModelFilter: newValue,
              },
            });
          }}
          className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${
            currentSettings.extra?.disableModelFilter
              ? "bg-yellow-500"
              : "bg-theme-border"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              currentSettings.extra?.disableModelFilter ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      {/* Context Length Slider */}
      <div className="space-y-2 pb-4 border-b border-theme-border">
        <div className="flex justify-between">
          <label className="text-sm font-bold text-theme-primary uppercase tracking-widest">
            {t("models.contextLen")}
          </label>
          <span className="text-theme-text font-mono">
            {currentSettings.contextLen || 16} {t("turn")}
          </span>
        </div>
        <input
          type="range"
          min="4"
          max="50"
          step="2"
          value={currentSettings.contextLen || 16}
          onChange={(e) =>
            onUpdateSettings({
              ...currentSettings,
              contextLen: parseInt(e.target.value),
            })
          }
          className="w-full accent-theme-primary"
        />
        <p className="text-xs text-theme-muted italic">
          {t("models.contextLenHelp")}
        </p>
      </div>

      {/* Fresh Segment Count Slider */}
      <div className="space-y-2 pb-4 border-b border-theme-border">
        <div className="flex justify-between">
          <label className="text-sm font-bold text-theme-primary uppercase tracking-widest">
            {t("models.freshSegmentCount")}
          </label>
          <span className="text-theme-text font-mono">
            {currentSettings.freshSegmentCount ?? 4} {t("turn")}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          value={currentSettings.freshSegmentCount ?? 4}
          onChange={(e) =>
            onUpdateSettings({
              ...currentSettings,
              freshSegmentCount: parseInt(e.target.value),
            })
          }
          className="w-full accent-theme-primary"
        />
        <p className="text-xs text-theme-muted italic">
          {t("models.freshSegmentCountHelp")}
        </p>
      </div>

      {(
        [
          {
            key: "story",
            label: t("models.story"),
            help: t("models.storyHelp"),
            hasEnable: false,
          },
          {
            key: "lore",
            label: t("models.lore"),
            help: t("models.loreHelp"),
            hasEnable: false,
          },
          {
            key: "script",
            label: t("models.script"),
            help: t("models.scriptHelp"),
            hasEnable: true,
          },
          {
            key: "image",
            label: t("models.image"),
            help: t("models.imageHelp"),
            hasEnable: true,
          },
          {
            key: "video",
            label: t("models.video"),
            help: t("models.videoHelp"),
            hasEnable: true,
          },
          {
            key: "audio",
            label: t("models.audio"),
            help: t("models.audioHelp"),
            hasEnable: true,
          },
        ] as const
      ).map((section) => {
        const sectionKey = section.key as FunctionKey;
        const config = currentSettings[sectionKey];
        const isEnabled = config.enabled !== false;
        const provider = getProviderById(config.providerId);
        const modelList = getFilteredModels(config.providerId, sectionKey);
        const isModelValid = modelList.some((m) => m.id === config.modelId);
        const isProviderAvailable =
          provider && provider.enabled && provider.apiKey;

        return (
          <div
            key={section.key}
            className="space-y-3 pb-6 border-b border-theme-border last:border-0"
          >
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-theme-primary uppercase tracking-widest">
                {section.label}
              </label>
              {section.hasEnable && (
                <button
                  onClick={() =>
                    updateFunction(sectionKey, "enabled", !isEnabled)
                  }
                  className={`w-8 h-4 rounded-full relative transition-colors ${
                    isEnabled ? "bg-green-500" : "bg-theme-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                      isEnabled ? "translate-x-4" : ""
                    }`}
                  ></span>
                </button>
              )}
            </div>

            <div
              className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${
                section.hasEnable && !isEnabled
                  ? "opacity-40 pointer-events-none"
                  : ""
              }`}
            >
              <div className="flex flex-col md:flex-row gap-3 col-span-1 md:col-span-3">
                <div className="relative w-full md:w-1/3">
                  <select
                    value={config.providerId}
                    onChange={(e) =>
                      updateFunction(sectionKey, "providerId", e.target.value)
                    }
                    className={`w-full bg-theme-bg border rounded p-2 text-theme-text text-xs focus:border-theme-primary outline-none [&>option]:bg-theme-bg [&>option]:text-theme-text ${
                      !isProviderAvailable
                        ? "border-yellow-500"
                        : "border-theme-border"
                    }`}
                  >
                    {currentSettings.providers.instances
                      .filter((p) => p.enabled)
                      .map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          className="text-black dark:text-white"
                        >
                          {p.name} ({p.protocol})
                        </option>
                      ))}
                  </select>
                  {!isProviderAvailable && (
                    <div className="text-[10px] text-yellow-500 mt-1 font-bold uppercase tracking-wider">
                      {!provider
                        ? t("settings.providerNotFound") || "Provider not found"
                        : !provider.enabled
                          ? t("settings.providerDisabled") ||
                            "Provider disabled"
                          : t("settings.providerNoApiKey") ||
                            "Provider missing API key"}
                    </div>
                  )}
                </div>

                <div className="relative w-full md:w-2/3">
                  <div className="flex gap-2">
                    {config.isCustomModel ? (
                      /* Custom model input mode */
                      <input
                        type="text"
                        value={config.modelId}
                        onChange={(e) =>
                          updateFunction(sectionKey, "modelId", e.target.value)
                        }
                        placeholder={
                          t("models.customModelPlaceholder") ||
                          "Enter model ID..."
                        }
                        className="flex-1 bg-theme-bg border border-yellow-500/50 rounded p-2 text-theme-text text-xs focus:border-theme-primary outline-none font-mono"
                      />
                    ) : (
                      /* Dropdown mode */
                      <select
                        value={config.modelId}
                        onChange={(e) =>
                          updateFunction(sectionKey, "modelId", e.target.value)
                        }
                        className={`flex-1 bg-theme-bg border rounded p-2 text-theme-text text-xs focus:border-theme-primary outline-none font-mono appearance-none [&>option]:bg-theme-bg [&>option]:text-theme-text ${
                          !isModelValid && !loadingModels && config.modelId
                            ? "border-yellow-500/50"
                            : "border-theme-border"
                        }`}
                        disabled={loadingModels}
                      >
                        <option
                          value={config.modelId}
                          className="text-black dark:text-white"
                        >
                          {config.modelId} (
                          {t("saveManager.current") || "Current"})
                        </option>
                        {modelList.map((m, idx) => (
                          <option
                            key={`${config.providerId}-${m.id}-${idx}`}
                            value={m.id}
                            className="text-black dark:text-white"
                          >
                            {m.name || m.id}
                          </option>
                        ))}
                      </select>
                    )}
                    {/* Toggle button for custom mode */}
                    <button
                      type="button"
                      onClick={() => toggleCustomMode(sectionKey)}
                      title={
                        config.isCustomModel
                          ? t("models.switchToDropdown") || "Switch to dropdown"
                          : t("models.switchToCustom") || "Enter manually"
                      }
                      className={`px-2 py-1 border rounded text-xs transition-colors flex-shrink-0 ${
                        config.isCustomModel
                          ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/30"
                          : "bg-theme-surface-highlight border-theme-border text-theme-muted hover:text-theme-text hover:border-theme-primary"
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        {config.isCustomModel ? (
                          /* List icon for switching back to dropdown */
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                          />
                        ) : (
                          /* Pencil icon for switching to custom input */
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        )}
                      </svg>
                    </button>
                  </div>
                  {loadingModels && !config.isCustomModel && (
                    <div className="absolute right-10 top-2 text-theme-muted text-xs">
                      {t("loadingGeneric")}
                    </div>
                  )}
                  {/* Show warning for custom mode OR non-listed models (both are valid custom models) */}
                  {(config.isCustomModel ||
                    (!isModelValid && !loadingModels && config.modelId)) && (
                    <div className="text-[10px] text-yellow-500 mt-1 font-bold uppercase tracking-wider">
                      {t("models.customModelWarning") ||
                        "Custom model is unverified"}
                    </div>
                  )}
                </div>
              </div>

              {sectionKey === "image" && (
                <div className="col-span-3 mt-1 border-t border-theme-border pt-2 space-y-3">
                  {/* Resolution */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-theme-muted uppercase tracking-widest">
                      {t("models.resolution")}
                    </label>
                    <select
                      value={config.resolution || "1024x1024"}
                      onChange={(e) =>
                        updateFunction(sectionKey, "resolution", e.target.value)
                      }
                      className="bg-theme-bg border border-theme-border rounded p-1 text-theme-text text-xs focus:border-theme-primary outline-none [&>option]:bg-theme-bg [&>option]:text-theme-text w-1/2"
                    >
                      <option
                        value="1024x1024"
                        className="text-black dark:text-white"
                      >
                        {t("models.resolutions.ratio11")}
                      </option>
                      <option
                        value="832x1248"
                        className="text-black dark:text-white"
                      >
                        {t("models.resolutions.ratio23")}
                      </option>
                      <option
                        value="1248x832"
                        className="text-black dark:text-white"
                      >
                        {t("models.resolutions.ratio32")}
                      </option>
                      <option
                        value="864x1184"
                        className="text-black dark:text-white"
                      >
                        {t("models.resolutions.ratio34")}
                      </option>
                      <option
                        value="1184x864"
                        className="text-black dark:text-white"
                      >
                        {t("models.resolutions.ratio43")}
                      </option>
                      <option
                        value="896x1152"
                        className="text-black dark:text-white"
                      >
                        {t("models.resolutions.ratio45")}
                      </option>
                      <option
                        value="1152x896"
                        className="text-black dark:text-white"
                      >
                        {t("models.resolutions.ratio54")}
                      </option>
                      <option
                        value="768x1344"
                        className="text-black dark:text-white"
                      >
                        {t("models.resolutions.ratio916")}
                      </option>
                      <option
                        value="1344x768"
                        className="text-black dark:text-white"
                      >
                        {t("models.resolutions.ratio169")}
                      </option>
                      <option
                        value="1536x672"
                        className="text-black dark:text-white"
                      >
                        {t("models.resolutions.ratio219")}
                      </option>
                    </select>
                  </div>

                  {/* Timeout Setting */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-theme-muted uppercase tracking-widest">
                        {t("models.imageTimeout")}
                      </label>
                      <span className="text-xs text-theme-text font-mono">
                        {currentSettings.imageTimeout || 60}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="360"
                      step="10"
                      value={currentSettings.imageTimeout || 60}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...currentSettings,
                          imageTimeout: parseInt(e.target.value),
                        })
                      }
                      className="w-full accent-theme-primary"
                    />
                    <p className="text-[10px] text-theme-muted italic">
                      {t("models.imageTimeoutHelp")}
                    </p>
                  </div>
                </div>
              )}
              {/* Advanced Parameters for Text Models */}
              {["story", "lore", "script"].includes(sectionKey) && (
                <div className="col-span-3 mt-2">
                  <details className="group">
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
                      {t("models.advancedParams") || "Advanced Parameters"}
                    </summary>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-theme-border/30">
                      {/* Temperature */}
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-[10px] uppercase tracking-wider text-theme-muted">
                            {t("models.temperature") || "Temperature"}
                          </label>
                          <span className="text-[10px] font-mono text-theme-text">
                            {config.temperature ?? 1.0}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={config.temperature ?? 1.0}
                          onChange={(e) =>
                            updateFunction(
                              sectionKey,
                              "temperature",
                              parseFloat(e.target.value),
                            )
                          }
                          className="w-full h-1 bg-theme-border rounded-lg appearance-none cursor-pointer accent-theme-primary"
                        />
                        <p className="text-[9px] text-theme-muted/70 italic">
                          {t("models.temperatureHelp") ||
                            "Controls randomness (0 = deterministic, 2 = creative)"}
                        </p>
                      </div>

                      {/* Top P */}
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-[10px] uppercase tracking-wider text-theme-muted">
                            {t("models.topP") || "Top P"}
                          </label>
                          <span className="text-[10px] font-mono text-theme-text">
                            {config.topP ?? 0.95}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={config.topP ?? 0.95}
                          onChange={(e) =>
                            updateFunction(
                              sectionKey,
                              "topP",
                              parseFloat(e.target.value),
                            )
                          }
                          className="w-full h-1 bg-theme-border rounded-lg appearance-none cursor-pointer accent-theme-primary"
                        />
                        <p className="text-[9px] text-theme-muted/70 italic">
                          {t("models.topPHelp") ||
                            "Nucleus sampling (lower = more focused)"}
                        </p>
                      </div>

                      {/* Top K */}
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-[10px] uppercase tracking-wider text-theme-muted">
                            {t("models.topK") || "Top K"}
                          </label>
                          <span className="text-[10px] font-mono text-theme-text">
                            {config.topK ?? 40}
                          </span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={config.topK ?? 40}
                          onChange={(e) =>
                            updateFunction(
                              sectionKey,
                              "topK",
                              parseInt(e.target.value),
                            )
                          }
                          className="w-full bg-theme-bg border border-theme-border rounded px-2 py-1 text-xs text-theme-text focus:border-theme-primary outline-none"
                        />
                        <p className="text-[9px] text-theme-muted/70 italic">
                          {t("models.topKHelp") ||
                            "Limits vocabulary to top K tokens"}
                        </p>
                      </div>

                      {/* Min P (OpenRouter/Some backends) */}
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-[10px] uppercase tracking-wider text-theme-muted">
                            {t("models.minP") || "Min P"}
                          </label>
                          <span className="text-[10px] font-mono text-theme-text">
                            {config.minP ?? 0.0}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={config.minP ?? 0.0}
                          onChange={(e) =>
                            updateFunction(
                              sectionKey,
                              "minP",
                              parseFloat(e.target.value),
                            )
                          }
                          className="w-full h-1 bg-theme-border rounded-lg appearance-none cursor-pointer accent-theme-primary"
                        />
                        <p className="text-[9px] text-theme-muted/70 italic">
                          {t("models.minPHelp") ||
                            "Minimum probability threshold"}
                        </p>
                      </div>

                      {/* Thinking Effort */}
                      <div className="space-y-1 col-span-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <label className="text-[10px] uppercase tracking-wider text-theme-muted">
                              {t("models.thinkingEffort") || "Thinking Effort"}
                            </label>
                            <p className="text-[9px] text-theme-muted/70 italic mt-0.5">
                              {t("models.thinkingEffortHelp") ||
                                "Adjust the reasoning/thinking intensity"}
                            </p>
                          </div>
                          <select
                            value={config.thinkingEffort || "none"}
                            onChange={(e) =>
                              updateFunction(
                                sectionKey,
                                "thinkingEffort",
                                e.target.value,
                              )
                            }
                            className="bg-theme-bg border border-theme-border rounded px-2 py-1 text-xs text-theme-text focus:border-theme-primary outline-none min-w-[100px] appearance-none"
                          >
                            <option
                              value="none"
                              className="bg-theme-bg text-theme-text"
                            >
                              {t("models.efforts.none") || "None"}
                            </option>
                            <option
                              value="minimal"
                              className="bg-theme-bg text-theme-text"
                            >
                              {t("models.efforts.minimal") || "Minimal"}
                            </option>
                            <option
                              value="low"
                              className="bg-theme-bg text-theme-text"
                            >
                              {t("models.efforts.low") || "Low"}
                            </option>
                            <option
                              value="medium"
                              className="bg-theme-bg text-theme-text"
                            >
                              {t("models.efforts.medium") || "Medium"}
                            </option>
                            <option
                              value="high"
                              className="bg-theme-bg text-theme-text"
                            >
                              {t("models.efforts.high") || "High"}
                            </option>
                            <option
                              value="xhigh"
                              className="bg-theme-bg text-theme-text"
                            >
                              {t("models.efforts.xhigh") || "X-High"}
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
