import React from "react";
import { useTranslation } from "react-i18next";
import { filterModels } from "../../services/aiService";
import { SettingsModelsProps, FunctionKey } from "./types";
import { AISettings } from "../../types";

export const SettingsModels: React.FC<SettingsModelsProps> = ({
  currentSettings,
  onUpdateSettings,
  loadingModels,
  onLoadModels,
  geminiModels,
  openaiModels,
  openrouterModels,
  showToast,
}) => {
  const { t } = useTranslation();

  const getFilteredModels = (
    provider: "gemini" | "openai" | "openrouter",
    type: FunctionKey,
  ) => {
    const list =
      provider === "gemini"
        ? geminiModels
        : provider === "openai"
          ? openaiModels
          : openrouterModels;
    return filterModels(list, type);
  };

  const updateFunction = (func: FunctionKey, field: string, value: any) => {
    // Special handling for model selection on text-related functions
    const textFunctions: FunctionKey[] = [
      "story",
      "translation",
      "lore",
      "script",
    ];

    if (
      field === "modelId" &&
      textFunctions.includes(func) &&
      value !== currentSettings[func].modelId
    ) {
      // Check if all text functions currently have invalid models
      const allInvalid = textFunctions.every((fn) => {
        const config = currentSettings[fn];
        const modelList = getFilteredModels(config.provider, fn);
        return !modelList.some((m) => m.id === config.modelId);
      });

      if (allInvalid) {
        // Prompt user for batch update
        const shouldBatchUpdate = window.confirm(
          t("models.batchUpdatePrompt") ||
            "All text-related models are currently unavailable. Would you like to apply this model selection to Story, Translation, Lore, and Script functions?",
        );

        if (shouldBatchUpdate) {
          // Batch update all text functions
          const newSettings = { ...currentSettings };
          textFunctions.forEach((fn) => {
            newSettings[fn] = {
              ...currentSettings[fn],
              provider: currentSettings[func].provider, // Use the provider from the function being updated
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
    onUpdateSettings(newSettings);
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex justify-end">
        <button
          onClick={() => onLoadModels(true)}
          disabled={loadingModels}
          className="px-3 py-1 bg-theme-surface-highlight border border-theme-border rounded text-xs text-theme-text hover:bg-theme-primary hover:text-theme-bg transition-colors flex items-center gap-2"
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

      {(
        [
          {
            key: "story",
            label: t("models.story"),
            help: t("models.storyHelp"),
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
          {
            key: "translation",
            label: t("models.translation"),
            help: t("models.translationHelp"),
            hasEnable: true,
          },
          {
            key: "lore",
            label: t("models.lore"),
            help: t("models.loreHelp"),
            hasEnable: true,
          },
        ] as const
      ).map((section) => {
        const sectionKey = section.key as FunctionKey;
        const config = currentSettings[sectionKey];
        const isEnabled = config.enabled !== false;
        const modelList = getFilteredModels(config.provider, sectionKey);
        const isModelValid = modelList.some((m) => m.id === config.modelId);

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
              <select
                value={config.provider}
                onChange={(e) =>
                  updateFunction(sectionKey, "provider", e.target.value)
                }
                className="bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-xs focus:border-theme-primary outline-none [&>option]:bg-theme-bg [&>option]:text-theme-text w-full"
              >
                <option value="gemini" className="text-black dark:text-white">
                  Gemini
                </option>
                <option value="openai" className="text-black dark:text-white">
                  OpenAI
                </option>
                <option
                  value="openrouter"
                  className="text-black dark:text-white"
                >
                  OpenRouter
                </option>
              </select>

              <div className="col-span-2 relative">
                <select
                  value={config.modelId}
                  onChange={(e) =>
                    updateFunction(sectionKey, "modelId", e.target.value)
                  }
                  className={`w-full bg-theme-bg border rounded p-2 text-theme-text text-xs focus:border-theme-primary outline-none font-mono appearance-none [&>option]:bg-theme-bg [&>option]:text-theme-text ${
                    !isModelValid && !loadingModels
                      ? "border-red-500 text-red-500"
                      : "border-theme-border"
                  }`}
                  disabled={loadingModels}
                >
                  <option
                    value={config.modelId}
                    className="text-black dark:text-white"
                  >
                    {config.modelId} (Current)
                  </option>
                  {modelList.map((m) => (
                    <option
                      key={m.id}
                      value={m.id}
                      className="text-black dark:text-white"
                    >
                      {m.name || m.id}
                    </option>
                  ))}
                </select>
                {loadingModels && (
                  <div className="absolute right-2 top-2 text-theme-muted text-xs">
                    {t("loadingGeneric")}
                  </div>
                )}
                {!isModelValid && !loadingModels && (
                  <div className="text-[10px] text-red-500 mt-1 font-bold uppercase tracking-wider">
                    Model not found in list. Please select a valid model.
                  </div>
                )}
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
                      className="bg-theme-bg border border-theme-border rounded p-1 text-theme-text text-xs focus:border-theme-primary outline-none [&>option]:bg-theme-bg [&>option]:text-theme-text w-1/2 text-white"
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
                      max="180"
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

                  {/* Manual Generation Toggle */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-theme-muted uppercase tracking-widest">
                        {t("models.manualImageGen")}
                      </label>
                      <p className="text-[10px] text-theme-muted italic mt-1">
                        {t("models.manualImageGenHelp")}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        onUpdateSettings({
                          ...currentSettings,
                          manualImageGen: !currentSettings.manualImageGen,
                        })
                      }
                      className={`w-8 h-4 rounded-full relative transition-colors ${
                        currentSettings.manualImageGen
                          ? "bg-green-500"
                          : "bg-theme-border"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                          currentSettings.manualImageGen ? "translate-x-4" : ""
                        }`}
                      ></span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
