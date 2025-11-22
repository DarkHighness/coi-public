import React from "react";
import { useTranslation } from "react-i18next";
import { validateConnection } from "../../services/aiService";
import { getEnvApiKey } from "../../utils/env";
import { SettingsCredentialsProps } from "./types";

export const SettingsCredentials: React.FC<SettingsCredentialsProps> = ({
  currentSettings,
  onUpdateSettings,
  showToast,
  onLoadModels,
}) => {
  const { t, i18n } = useTranslation();

  const updateCreds = (
    provider: "gemini" | "openai" | "openrouter",
    field: "apiKey" | "baseUrl",
    value: string,
  ) => {
    const newSettings = {
      ...currentSettings,
      [provider]: { ...currentSettings[provider], [field]: value },
    };
    onUpdateSettings(newSettings);
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    onUpdateSettings({ ...currentSettings, language: lang as any });
  };

  return (
    <div className="space-y-8 animate-slide-in">
      <div className="bg-theme-surface-highlight/30 p-4 rounded border border-theme-border">
        <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest mb-4">
          {t("languageLabel")}
        </h3>
        <div className="flex gap-4">
          <button
            onClick={() => changeLanguage("en")}
            className={`flex-1 py-2 rounded border transition-colors ${
              i18n.language === "en"
                ? "bg-theme-primary text-theme-bg border-theme-primary"
                : "bg-theme-bg text-theme-text border-theme-border hover:border-theme-primary"
            }`}
          >
            English
          </button>
          <button
            onClick={() => changeLanguage("zh")}
            className={`flex-1 py-2 rounded border transition-colors ${
              i18n.language === "zh"
                ? "bg-theme-primary text-theme-bg border-theme-primary"
                : "bg-theme-bg text-theme-text border-theme-border hover:border-theme-primary"
            }`}
          >
            中文 (Chinese)
          </button>
        </div>
      </div>

      {/* Gemini Inputs */}
      <div className="bg-theme-surface-highlight/30 p-4 rounded border border-theme-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">
            {t("creds.geminiTitle")}
          </h3>
          <button
            onClick={async () => {
              const { isValid, error } = await validateConnection("gemini");
              showToast(
                isValid
                  ? t("connectionSuccess")
                  : error || t("connectionFailed"),
                isValid ? "info" : "error",
              );
            }}
            className="text-xs text-theme-primary hover:text-theme-primary-hover underline"
          >
            {t("testConnection")}
          </button>
        </div>
        <form onSubmit={(e) => e.preventDefault()}>
          <input
            type="password"
            value={currentSettings.gemini.apiKey || ""}
            onChange={(e) => updateCreds("gemini", "apiKey", e.target.value)}
            placeholder={
              getEnvApiKey() ? t("loadedFromEnv") : t("creds.apiKeyPlaceholder")
            }
            className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none mb-2"
            onBlur={() => onLoadModels(false)}
          />
          <input
            type="text"
            value={currentSettings.gemini.baseUrl || ""}
            onChange={(e) => updateCreds("gemini", "baseUrl", e.target.value)}
            placeholder="Base URL (Optional)"
            className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none"
            onBlur={() => onLoadModels(false)}
          />
        </form>
      </div>
      {/* OpenAI Inputs */}
      <div className="bg-theme-surface-highlight/30 p-4 rounded border border-theme-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">
            {t("creds.openaiTitle")}
          </h3>
          <button
            onClick={async () => {
              const { isValid, error } = await validateConnection("openai");
              showToast(
                isValid
                  ? t("connectionSuccess")
                  : error || t("connectionFailed"),
                isValid ? "info" : "error",
              );
            }}
            className="text-xs text-theme-primary hover:text-theme-primary-hover underline"
          >
            {t("testConnection")}
          </button>
        </div>
        <form onSubmit={(e) => e.preventDefault()}>
          <input
            type="password"
            value={currentSettings.openai.apiKey || ""}
            onChange={(e) => updateCreds("openai", "apiKey", e.target.value)}
            placeholder={t("creds.apiKeyPlaceholder")}
            className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none mb-2"
            onBlur={() => onLoadModels(false)}
          />
          <input
            type="text"
            value={currentSettings.openai.baseUrl || ""}
            onChange={(e) => updateCreds("openai", "baseUrl", e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none"
            onBlur={() => onLoadModels(false)}
          />
        </form>
      </div>

      {/* OpenRouter Inputs */}
      <div className="bg-theme-surface-highlight/30 p-4 rounded border border-theme-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">
            OpenRouter
          </h3>
          <button
            onClick={async () => {
              const { isValid, error } = await validateConnection("openrouter");
              showToast(
                isValid
                  ? t("connectionSuccess")
                  : error || t("connectionFailed"),
                isValid ? "info" : "error",
              );
            }}
            className="text-xs text-theme-primary hover:text-theme-primary-hover underline"
          >
            {t("testConnection")}
          </button>
        </div>
        <form onSubmit={(e) => e.preventDefault()}>
          <input
            type="password"
            value={currentSettings.openrouter.apiKey || ""}
            onChange={(e) =>
              updateCreds("openrouter", "apiKey", e.target.value)
            }
            placeholder={t("creds.apiKeyPlaceholder")}
            className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none mb-2"
            onBlur={() => onLoadModels(false)}
          />
          <input
            type="text"
            value={currentSettings.openrouter.baseUrl || ""}
            onChange={(e) =>
              updateCreds("openrouter", "baseUrl", e.target.value)
            }
            placeholder="https://openrouter.ai/api/v1"
            className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none"
            onBlur={() => onLoadModels(false)}
          />
        </form>
      </div>
    </div>
  );
};
