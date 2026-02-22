import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AISettings,
  ProviderInstance,
  ProviderProtocol,
} from "../../types";
import { validateConnection } from "../../services/aiService";
import {
  PROVIDER_TEMPLATES,
  createProviderFromTemplate,
  getTemplateKeys,
  type ProviderTemplateKey,
} from "../../utils/constants/providerTemplates";
import { useSettings } from "../../hooks/useSettings";
import { useTutorialContextOptional } from "../../contexts/TutorialContext";

interface SettingsProvidersProps {
  showToast: (msg: string, type?: "info" | "error") => void;
}

interface ProviderFormData {
  name: string;
  protocol: ProviderProtocol;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  openaiApiMode?: "response" | "chat";
  isRestrictedChannel: boolean;
  geminiCompatibility?: boolean;
  geminiMessageFormat?: boolean;
  claudeCompatibility?: boolean;
  claudeMessageFormat?: boolean;
  compatibleImageGeneration?: boolean;
}

type ModalMode = "add" | "edit" | "template" | null;

const DEFAULT_BASE_URLS: Record<ProviderProtocol, string> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  claude: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com",
};

export const SettingsProviders: React.FC<SettingsProvidersProps> = ({
  showToast,
}) => {
  const { t } = useTranslation();
  const { settings: currentSettings, updateSettings: onUpdateSettings } =
    useSettings();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProviderFormData>({
    name: "",
    protocol: "openai",
    baseUrl: "",
    apiKey: "",
    enabled: true,
    openaiApiMode: "response",
    isRestrictedChannel: false,
    geminiCompatibility: false,
    geminiMessageFormat: false,
    claudeCompatibility: false,
    claudeMessageFormat: false,
    compatibleImageGeneration: false,
  });
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProviderTemplateKey>("openai");
  const [templateApiKey, setTemplateApiKey] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [showModalApiKey, setShowModalApiKey] = useState(false);
  const [showTemplateApiKey, setShowTemplateApiKey] = useState(false);

  // Tutorial context
  const tutorial = useTutorialContextOptional();

  // Handle Add Provider click - auto-advance to modal step so spotlight moves to modal
  const handleAddProviderClick = () => {
    if (tutorial?.isActive && tutorial.currentStep?.id === "add-provider") {
      tutorial.markStepActionComplete();
      tutorial.nextStep(); // Move to modal step
    }
    handleOpenAdd(); // Open the manual provider add form
  };

  // Helper: Mask API key for display
  const maskApiKey = (key: string): string => {
    if (!key || key.length < 8) return "••••••••";
    return `${key.slice(0, 4)}${"•".repeat(20)}${key.slice(-4)}`;
  };

  // Helper: Get protocol badge style
  const getProtocolBadgeStyle = (protocol: ProviderProtocol): string => {
    switch (protocol) {
      case "gemini":
        return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
      case "openai":
        return "bg-green-500/20 text-green-400 border border-green-500/30";
      case "openrouter":
        return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
      case "claude":
        return "bg-orange-500/20 text-orange-400 border border-orange-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
    }
  };

  // Helper: Check if provider is in use
  const isProviderInUse = (
    providerId: string,
  ): { inUse: boolean; features: string[] } => {
    const features: string[] = [];
    const functionKeys: Array<
      "story" | "lore" | "script" | "image" | "video" | "audio" | "translation"
    > = ["story", "lore", "script", "image", "video", "audio", "translation"];

    functionKeys.forEach((key) => {
      if (currentSettings[key]?.providerId === providerId) {
        features.push(key);
      }
    });

    if (currentSettings.embedding?.providerId === providerId) {
      features.push("embedding");
    }

    return { inUse: features.length > 0, features };
  };

  // Open add modal
  const handleOpenAdd = () => {
    setFormData({
      name: "",
      protocol: "openai",
      baseUrl: DEFAULT_BASE_URLS["openai"],
      apiKey: "",
      enabled: true,
      openaiApiMode: "response",
      isRestrictedChannel: false,
      geminiCompatibility: false,
      geminiMessageFormat: false,
      claudeCompatibility: false,
      claudeMessageFormat: false,
      compatibleImageGeneration: false,
    });
    setModalMode("add");
  };

  // Open template modal
  const handleOpenTemplate = () => {
    setSelectedTemplate("openai");
    setTemplateApiKey("");
    setModalMode("template");
  };

  // Open edit modal
  const handleOpenEdit = (instance: ProviderInstance) => {
    setEditingId(instance.id);
    setFormData({
      name: instance.name,
      protocol: instance.protocol,
      baseUrl: instance.baseUrl,
      apiKey: "", // Clear API key - leave empty to keep current
      enabled: instance.enabled,
      openaiApiMode: instance.openaiApiMode || "response",
      isRestrictedChannel: instance.isRestrictedChannel || false,
      geminiCompatibility: instance.geminiCompatibility || false,
      geminiMessageFormat: instance.geminiMessageFormat || false,
      claudeCompatibility: instance.claudeCompatibility || false,
      claudeMessageFormat: instance.claudeMessageFormat || false,
      compatibleImageGeneration: instance.compatibleImageGeneration || false,
    });
    setModalMode("edit");
  };

  // Close modal
  const handleCloseModal = () => {
    setModalMode(null);
    setEditingId(null);
  };

  // Add provider
  const handleAdd = () => {
    if (
      !formData.name.trim() ||
      !formData.baseUrl.trim() ||
      !formData.apiKey.trim()
    ) {
      showToast(t("providers.validation.requiredFields"), "error");
      return;
    }

    let finalBaseUrl = formData.baseUrl.trim();

    // Auto-append /v1 for OpenAI and OpenRouter if missing
    if (
      (formData.protocol === "openai" || formData.protocol === "openrouter") &&
      !finalBaseUrl.endsWith("/") &&
      !finalBaseUrl.endsWith("/v1")
    ) {
      finalBaseUrl += "/v1";
    }

    const newInstance: ProviderInstance = {
      id: `provider-${currentSettings.providers.nextId}`,
      name: formData.name.trim(),
      protocol: formData.protocol,
      baseUrl: finalBaseUrl,
      apiKey: formData.apiKey,
      enabled: formData.enabled,
      openaiApiMode:
        formData.protocol === "openai" || formData.protocol === "openrouter"
          ? formData.openaiApiMode || "response"
          : undefined,
      isRestrictedChannel: formData.isRestrictedChannel,
      geminiCompatibility: formData.geminiCompatibility,
      geminiMessageFormat: formData.geminiMessageFormat,
      claudeCompatibility: formData.claudeCompatibility,
      claudeMessageFormat: formData.claudeMessageFormat,
      compatibleImageGeneration: formData.compatibleImageGeneration,
      createdAt: Date.now(),
      lastModified: Date.now(),
    };

    const newSettings: AISettings = {
      ...currentSettings,
      providers: {
        instances: [...currentSettings.providers.instances, newInstance],
        nextId: currentSettings.providers.nextId + 1,
      },
    };

    onUpdateSettings(newSettings);
    showToast(t("providers.toast.added", { name: formData.name }), "info");
    handleCloseModal();
  };

  // Add from template
  const handleAddFromTemplate = () => {
    if (!templateApiKey.trim()) {
      showToast(t("providers.validation.apiKeyRequired"), "error");
      return;
    }

    const newInstance = createProviderFromTemplate(
      selectedTemplate,
      templateApiKey,
      currentSettings.providers.nextId,
    );

    const newSettings: AISettings = {
      ...currentSettings,
      providers: {
        instances: [...currentSettings.providers.instances, newInstance],
        nextId: currentSettings.providers.nextId + 1,
      },
    };

    onUpdateSettings(newSettings);
    showToast(t("providers.toast.added", { name: newInstance.name }), "info");
    handleCloseModal();
  };

  // Edit provider
  const handleEdit = () => {
    if (!editingId) return;

    if (!formData.name.trim() || !formData.baseUrl.trim()) {
      showToast(t("providers.validation.nameUrlRequired"), "error");
      return;
    }

    const existingInstance = currentSettings.providers.instances.find(
      (inst) => inst.id === editingId,
    );
    if (!existingInstance) return;

    // If API Key is empty, keep the existing one
    const newApiKey =
      formData.apiKey.trim() !== "" ? formData.apiKey : existingInstance.apiKey;

    // Auto-append /v1 for OpenAI and OpenRouter if missing
    let finalBaseUrl = formData.baseUrl.trim();
    if (
      (formData.protocol === "openai" || formData.protocol === "openrouter") &&
      !finalBaseUrl.endsWith("/") &&
      !finalBaseUrl.endsWith("/v1")
    ) {
      finalBaseUrl += "/v1";
    }

    const updatedInstances = currentSettings.providers.instances.map((inst) =>
      inst.id === editingId
        ? {
            ...inst,
            name: formData.name.trim(),
            protocol: formData.protocol,
            baseUrl: finalBaseUrl,
            apiKey: newApiKey,
            enabled: formData.enabled,
            openaiApiMode:
              formData.protocol === "openai" ||
              formData.protocol === "openrouter"
                ? formData.openaiApiMode || "response"
                : undefined,
            isRestrictedChannel: formData.isRestrictedChannel,
            geminiCompatibility: formData.geminiCompatibility,
            geminiMessageFormat: formData.geminiMessageFormat,
            claudeCompatibility: formData.claudeCompatibility,
            claudeMessageFormat: formData.claudeMessageFormat,
            compatibleImageGeneration: formData.compatibleImageGeneration,
            lastModified: Date.now(),
          }
        : inst,
    );

    const newSettings: AISettings = {
      ...currentSettings,
      providers: {
        ...currentSettings.providers,
        instances: updatedInstances,
      },
    };

    onUpdateSettings(newSettings);
    showToast(t("providers.toast.updated", { name: formData.name }), "info");
    handleCloseModal();
  };

  // Delete provider
  const handleDelete = (id: string) => {
    const instance = currentSettings.providers.instances.find(
      (inst) => inst.id === id,
    );
    if (!instance) return;

    const { inUse, features } = isProviderInUse(id);

    if (inUse) {
      const featureList = features.join(", ");
      if (
        !confirm(t("providers.confirm.deleteInUse", { features: featureList }))
      ) {
        return;
      }
    }

    const updatedInstances = currentSettings.providers.instances.filter(
      (inst) => inst.id !== id,
    );

    const newSettings: AISettings = {
      ...currentSettings,
      providers: {
        ...currentSettings.providers,
        instances: updatedInstances,
      },
    };

    onUpdateSettings(newSettings);
    showToast(t("providers.toast.deleted", { name: instance.name }), "info");
    setShowDeleteConfirm(null);
  };

  // Toggle enabled
  const handleToggleEnabled = (id: string) => {
    const instance = currentSettings.providers.instances.find(
      (inst) => inst.id === id,
    );
    if (!instance) return;

    const newEnabled = !instance.enabled;

    if (!newEnabled) {
      const { inUse, features } = isProviderInUse(id);
      if (inUse) {
        const featureList = features.join(", ");
        if (
          !confirm(
            t("providers.confirm.disableInUse", { features: featureList }),
          )
        ) {
          return;
        }
      }
    }

    const updatedInstances = currentSettings.providers.instances.map((inst) =>
      inst.id === id
        ? { ...inst, enabled: newEnabled, lastModified: Date.now() }
        : inst,
    );

    const newSettings: AISettings = {
      ...currentSettings,
      providers: {
        ...currentSettings.providers,
        instances: updatedInstances,
      },
    };

    onUpdateSettings(newSettings);
    showToast(
      newEnabled
        ? t("providers.toast.enabled", { name: instance.name })
        : t("providers.toast.disabled", { name: instance.name }),
      "info",
    );
  };

  // Test connection
  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    const { isValid, error } = await validateConnection(currentSettings, id, {
      forceRefresh: true,
    });
    setTestingId(null);

    showToast(
      isValid ? t("connectionSuccess") : error || t("connectionFailed"),
      isValid ? "info" : "error",
    );
  };

  // Check if there are any available providers
  const availableProviders = currentSettings.providers.instances.filter(
    (p) => p.enabled && p.apiKey && p.apiKey.trim() !== "",
  );
  const hasNoAvailableProviders = availableProviders.length === 0;

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Warning: No available providers */}
      {hasNoAvailableProviders &&
        currentSettings.providers.instances.length > 0 && (
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
                {t("providers.noAvailableProviders") ||
                  "No Available Providers"}
              </h4>
              <p className="text-xs text-red-400">
                {t("providers.noAvailableProvidersDesc") ||
                  "All providers are either disabled or missing API keys. Please enable at least one provider and configure its API key to use the application."}
              </p>
            </div>
          </div>
        )}

      {/* Header with action buttons */}
      <div className="pb-6 border-b border-theme-border/25">
        <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest mb-4">
          {t("providers.configuration")}
        </h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleAddProviderClick}
            data-tutorial-id="add-provider-button"
            className="px-1 py-1 text-sm font-bold uppercase tracking-widest text-theme-primary hover:text-theme-primary-hover border-b border-transparent hover:border-theme-primary/60 transition-colors"
          >
            {t("providers.addProvider")}
          </button>
          <button
            onClick={handleOpenTemplate}
            className="px-1 py-1 text-sm font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text border-b border-transparent hover:border-theme-muted transition-colors"
          >
            {t("providers.addFromTemplate")}
          </button>
        </div>
      </div>

      {/* Provider list */}
      <div className="space-y-2">
        {currentSettings.providers.instances.length === 0 ? (
          <div className="py-6 text-center text-theme-text-secondary story-text border-b border-theme-border/25">
            {t("providers.noProviders")}
          </div>
        ) : (
          currentSettings.providers.instances.map((instance) => {
            const { inUse, features } = isProviderInUse(instance.id);
            const hasApiKey = instance.apiKey && instance.apiKey.trim() !== "";

            return (
              <div
                key={instance.id}
                className={`px-2 py-3 border-b border-theme-border/25 transition-colors ${
                  instance.enabled ? "" : "opacity-60"
                }`}
              >
                {/* Single row layout */}
                <div className="flex items-center gap-3">
                  {/* Enable checkbox */}
                  <button
                    onClick={() => handleToggleEnabled(instance.id)}
                    className={`w-5 h-5 rounded-none border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                      instance.enabled
                        ? "bg-theme-primary border-theme-primary"
                        : "bg-theme-bg border-theme-border"
                    }`}
                    title={
                      instance.enabled
                        ? t("providers.enabled")
                        : t("providers.disabled")
                    }
                  >
                    {instance.enabled && (
                      <svg
                        className="w-3 h-3 text-theme-bg"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Protocol badge */}
                  <span
                    className={`px-2 py-0.5 rounded-none text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${getProtocolBadgeStyle(
                      instance.protocol,
                    )}`}
                  >
                    {instance.protocol}
                  </span>

                  {/* Provider name */}
                  <span className="font-medium text-theme-text flex-1 min-w-0 truncate">
                    {instance.name}
                  </span>

                  {/* Token Stats */}
                  {instance.tokenStats && (
                    <div className="hidden sm:flex flex-col items-end mr-2 text-[10px] text-theme-muted leading-tight">
                      <span title={t("tokenStats.totalTokens")}>
                        {instance.tokenStats.totalTokens.toLocaleString()}{" "}
                        <span className="capitalize">
                          {t("logPanel.tokens")}
                        </span>
                      </span>
                      <span
                        className="opacity-70"
                        title={`${t("tokenStats.in")} / ${t("tokenStats.out")}`}
                      >
                        {t("tokenStats.in")}{" "}
                        {instance.tokenStats.promptTokens.toLocaleString()} |{" "}
                        {t("tokenStats.out")}{" "}
                        {instance.tokenStats.completionTokens.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Status indicators */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!hasApiKey && (
                      <span
                        className="text-yellow-500 text-xs"
                        title={t("providers.missingApiKey")}
                      >
                        <svg
                          className="w-4 h-4"
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
                      </span>
                    )}
                    {inUse && (
                      <span
                        className="text-theme-primary text-xs"
                        title={t("providers.inUse", {
                          features: features.join(", "),
                        })}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleTestConnection(instance.id)}
                      disabled={testingId === instance.id || !hasApiKey}
                      className="p-1.5 text-theme-muted hover:text-theme-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t("testConnection")}
                    >
                      {testingId === instance.id ? (
                        <svg
                          className="w-4 h-4 animate-spin"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleOpenEdit(instance)}
                      className="p-1.5 text-theme-muted hover:text-theme-primary transition-colors"
                      title={t("edit")}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(instance.id)}
                      className="p-1.5 text-theme-muted hover:text-red-500 transition-colors"
                      title={t("providers.delete")}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Delete confirmation inline */}
                {showDeleteConfirm === instance.id && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded">
                    <p className="text-sm text-red-500 mb-2">
                      {t("providers.deleteConfirmMessage", {
                        name: instance.name,
                      })}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(instance.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                      >
                        {t("confirm")}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="px-3 py-1 bg-theme-bg text-theme-text rounded text-xs border border-theme-border hover:border-theme-primary transition-colors"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {(modalMode === "add" || modalMode === "edit") && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-bg border border-theme-border/25 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold text-theme-text mb-4">
                {modalMode === "add"
                  ? t("providers.addProviderTitle")
                  : t("providers.editProviderTitle")}
              </h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  modalMode === "add" ? handleAdd() : handleEdit();
                }}
                className="space-y-4"
              >
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-1">
                    {t("providers.nameLabel")}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., OpenAI Official, DeepSeek"
                    className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none focus:border-theme-primary"
                    required
                  />
                </div>

                {/* Protocol */}
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-1">
                    {t("providers.protocolLabel")}
                  </label>
                  <select
                    value={formData.protocol}
                    onChange={(e) => {
                      const newProtocol = e.target.value as ProviderProtocol;
                      // Check if current URL is a default one or empty
                      const currentIsDefault =
                        !formData.baseUrl ||
                        Object.values(DEFAULT_BASE_URLS).includes(
                          formData.baseUrl,
                        );

                      setFormData({
                        ...formData,
                        protocol: newProtocol,
                        // Only auto-switch URL if user hasn't entered a custom one
                        baseUrl: currentIsDefault
                          ? DEFAULT_BASE_URLS[newProtocol]
                          : formData.baseUrl,
                        openaiApiMode:
                          newProtocol === "openai" ||
                          newProtocol === "openrouter"
                            ? formData.openaiApiMode || "response"
                            : undefined,
                      });
                    }}
                    className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none focus:border-theme-primary"
                  >
                    <option value="gemini">{t("providers.gemini")}</option>
                    <option value="openai">{t("providers.openai")}</option>
                    <option value="openrouter">
                      {t("providers.openrouter")}
                    </option>
                    <option value="claude">{t("providers.claude")}</option>
                  </select>
                </div>

                {/* Base URL */}
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-1">
                    {t("providers.baseUrlLabel")}
                  </label>
                  <input
                    type="text"
                    value={formData.baseUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, baseUrl: e.target.value })
                    }
                    placeholder="https://api.openai.com/v1"
                    className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none focus:border-theme-primary"
                    required
                  />
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-1">
                    {t("providers.apiKeyField")}
                    {modalMode === "edit" && (
                      <span className="text-theme-muted text-xs ml-2">
                        (
                        {t("providers.leaveEmptyToKeep") ||
                          "Leave empty to keep current"}
                        )
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showModalApiKey ? "text" : "password"}
                      value={formData.apiKey}
                      onChange={(e) =>
                        setFormData({ ...formData, apiKey: e.target.value })
                      }
                      placeholder={
                        modalMode === "edit"
                          ? "Enter new API Key or leave empty"
                          : "Paste API Key here..."
                      }
                      className="w-full bg-theme-bg border border-theme-border rounded p-2 pr-10 text-theme-text text-sm outline-none focus:border-theme-primary"
                      required={modalMode === "add"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalApiKey(!showModalApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-text transition-colors"
                      title={showModalApiKey ? "Hide API Key" : "Show API Key"}
                    >
                      {showModalApiKey ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* OpenAI-compatible API Mode (OpenAI/OpenRouter only) */}
                {(formData.protocol === "openai" ||
                  formData.protocol === "openrouter") && (
                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-1">
                      {t("creds.openaiApiMode")}
                    </label>
                    <select
                      value={formData.openaiApiMode || "response"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          openaiApiMode: e.target.value as "response" | "chat",
                        })
                      }
                      className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none focus:border-theme-primary"
                    >
                      <option value="response">
                        {t("creds.openaiApiModeResponse")}
                      </option>
                      <option value="chat">
                        {t("creds.openaiApiModeChat")}
                      </option>
                    </select>
                    <p className="text-xs text-theme-muted mt-1">
                      {t("creds.openaiApiModeHelp")}
                    </p>
                  </div>
                )}

                {/* Gemini Compatibility Mode (Only for OpenAI protocol) */}
                {formData.protocol === "openai" && (
                  <div className="flex items-start gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="geminiCompatibility"
                      checked={formData.geminiCompatibility}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          geminiCompatibility: e.target.checked,
                          // Reset message format when disabling compatibility
                          geminiMessageFormat: e.target.checked
                            ? formData.geminiMessageFormat
                            : false,
                        })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="geminiCompatibility"
                        className="block text-sm font-medium text-theme-text"
                      >
                        {t("creds.geminiCompatibility")}
                      </label>
                      <p className="text-xs text-theme-muted">
                        {t("creds.geminiCompatibilityHelp")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Gemini Message Format Conversion (Only when Gemini compatibility is enabled) */}
                {formData.protocol === "openai" &&
                  formData.geminiCompatibility && (
                    <div className="flex items-start gap-2 pt-2 pl-4">
                      <input
                        type="checkbox"
                        id="geminiMessageFormat"
                        checked={formData.geminiMessageFormat}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            geminiMessageFormat: e.target.checked,
                          })
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="geminiMessageFormat"
                          className="block text-sm font-medium text-theme-text"
                        >
                          {t("creds.geminiMessageFormat")}
                        </label>
                        <p className="text-xs text-theme-muted">
                          {t("creds.geminiMessageFormatHelp")}
                        </p>
                      </div>
                    </div>
                  )}

                {/* Claude Compatibility Mode (Only for OpenAI protocol) */}
                {formData.protocol === "openai" && (
                  <div className="flex items-start gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="claudeCompatibility"
                      checked={formData.claudeCompatibility}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          claudeCompatibility: e.target.checked,
                          // Reset message format when disabling compatibility
                          claudeMessageFormat: e.target.checked
                            ? formData.claudeMessageFormat
                            : false,
                        })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="claudeCompatibility"
                        className="block text-sm font-medium text-theme-text"
                      >
                        {t("creds.claudeCompatibility")}
                      </label>
                      <p className="text-xs text-theme-muted">
                        {t("creds.claudeCompatibilityHelp")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Claude Message Format Conversion (Only when Claude compatibility is enabled) */}
                {formData.protocol === "openai" &&
                  formData.claudeCompatibility && (
                    <div className="flex items-start gap-2 pt-2 pl-4">
                      <input
                        type="checkbox"
                        id="claudeMessageFormat"
                        checked={formData.claudeMessageFormat}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            claudeMessageFormat: e.target.checked,
                          })
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="claudeMessageFormat"
                          className="block text-sm font-medium text-theme-text"
                        >
                          {t("creds.claudeMessageFormat")}
                        </label>
                        <p className="text-xs text-theme-muted">
                          {t("creds.claudeMessageFormatHelp")}
                        </p>
                      </div>
                    </div>
                  )}

                {/* Compatibility Image Generation (For Gemini or OpenAI protocol) */}
                {(formData.protocol === "openai" ||
                  formData.protocol === "gemini") && (
                  <div className="flex items-start gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="compatibleImageGeneration"
                      checked={formData.compatibleImageGeneration}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          compatibleImageGeneration: e.target.checked,
                        })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="compatibleImageGeneration"
                        className="block text-sm font-medium text-theme-text"
                      >
                        {t("creds.compatibleImageGeneration") ||
                          "Compatible Image Generation"}
                      </label>
                      <p className="text-xs text-theme-muted">
                        {t("creds.compatibleImageGenerationHelp") ||
                          "Use chat API for image generation (supports gemini-3-pro-image)"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Enabled */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-theme-text">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) =>
                        setFormData({ ...formData, enabled: e.target.checked })
                      }
                      className="rounded"
                    />
                    {t("providers.enableProvider")}
                  </label>
                </div>

                {/* Restricted Channel */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-theme-text">
                    <input
                      type="checkbox"
                      checked={formData.isRestrictedChannel}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isRestrictedChannel: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    {t("providers.restrictedChannel")}
                  </label>
                  <p className="text-xs text-theme-muted mt-1 ml-6">
                    {t("providers.restrictedChannelDesc")}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-theme-primary text-theme-bg rounded hover:bg-theme-primary-hover transition-colors text-sm font-medium"
                  >
                    {modalMode === "add"
                      ? t("providers.addButton")
                      : t("providers.saveChanges")}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 bg-theme-bg text-theme-text rounded border border-theme-border hover:border-theme-primary transition-colors text-sm font-medium"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {modalMode === "template" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-theme-bg border border-theme-border/25 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            data-tutorial-id="provider-template-modal"
          >
            <div className="p-6">
              <h3 className="text-lg font-bold text-theme-text mb-4">
                {t("providers.addFromTemplateTitle")}
              </h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddFromTemplate();
                }}
                className="space-y-4"
              >
                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    {t("providers.selectTemplate")}
                  </label>
                  <div className="space-y-2">
                    {getTemplateKeys().map((key) => {
                      const template = PROVIDER_TEMPLATES[key];
                      return (
                        <label
                          key={key}
                          className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${
                            selectedTemplate === key
                              ? "border-theme-primary bg-theme-primary/10"
                              : "border-theme-border hover:border-theme-primary/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="template"
                            value={key}
                            checked={selectedTemplate === key}
                            onChange={(e) =>
                              setSelectedTemplate(
                                e.target.value as ProviderTemplateKey,
                              )
                            }
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-theme-text">
                              {template.name}
                            </div>
                            <div className="text-xs text-theme-text-secondary mt-1">
                              {template.description}
                            </div>
                            <div className="text-xs text-theme-text-secondary mt-1 font-mono">
                              {template.baseUrl}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-1">
                    {t("providers.apiKeyRequired")}
                  </label>
                  <div className="relative">
                    <input
                      type={showTemplateApiKey ? "text" : "password"}
                      value={templateApiKey}
                      onChange={(e) => setTemplateApiKey(e.target.value)}
                      placeholder="Paste API Key here..."
                      className="w-full bg-theme-bg border border-theme-border rounded p-2 pr-10 text-theme-text text-sm outline-none focus:border-theme-primary"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowTemplateApiKey(!showTemplateApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-text transition-colors"
                      title={
                        showTemplateApiKey ? "Hide API Key" : "Show API Key"
                      }
                    >
                      {showTemplateApiKey ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-theme-primary text-theme-bg rounded hover:bg-theme-primary-hover transition-colors text-sm font-medium"
                  >
                    {t("providers.addProviderButton")}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 bg-theme-bg text-theme-text rounded border border-theme-border hover:border-theme-primary transition-colors text-sm font-medium"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
