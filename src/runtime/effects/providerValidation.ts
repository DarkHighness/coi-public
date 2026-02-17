import { validateConnection } from "../../services/aiService";
import { getEnvApiKey } from "../../utils/env";
import type { AISettings } from "../../types";
import type {
  RuntimeValidationIssue,
  RuntimeValidationMode,
  RuntimeValidationResult,
} from "../state";

type ValidationFeature = RuntimeValidationIssue["feature"];

interface FeatureConfig {
  feature: ValidationFeature;
  providerId: string;
  enabled: boolean;
  required: boolean;
}

export function getValidationFeatureFallbackLabel(feature: ValidationFeature) {
  switch (feature) {
    case "story":
      return "Story generation";
    case "lore":
      return "Lore generation";
    case "image":
      return "Image";
    case "audio":
      return "Audio";
    case "video":
      return "Video";
    case "embedding":
      return "Embedding";
    case "script":
      return "Script";
    default:
      return feature;
  }
}

export function getBlockingValidationIssue(
  issues: RuntimeValidationIssue[],
): RuntimeValidationIssue | undefined {
  return issues.find(
    (issue) =>
      issue.type === "missing_required_api_key" ||
      issue.type === "missing_optional_api_key" ||
      issue.type === "required_connection_failed",
  );
}

export function getOptionalConnectionWarnings(
  issues: RuntimeValidationIssue[],
): RuntimeValidationIssue[] {
  return issues.filter((issue) => issue.type === "optional_connection_failed");
}

function getProviderInstance(aiSettings: AISettings, providerId: string) {
  return aiSettings.providers.instances.find(
    (instance) => instance.id === providerId,
  );
}

function hasApiKey(aiSettings: AISettings, providerId: string): boolean {
  const instance = getProviderInstance(aiSettings, providerId);
  if (!instance) return false;

  if (instance.protocol === "gemini") {
    return !!(instance.apiKey || getEnvApiKey());
  }

  return !!(instance.apiKey && instance.apiKey.trim() !== "");
}

function isProviderAvailable(
  aiSettings: AISettings,
  providerId: string,
): boolean {
  const instance = getProviderInstance(aiSettings, providerId);
  if (!instance) return false;
  return instance.enabled && hasApiKey(aiSettings, providerId);
}

function pushMissingApiKeyIssue(
  issues: RuntimeValidationIssue[],
  aiSettings: AISettings,
  config: FeatureConfig,
) {
  const providerName =
    getProviderInstance(aiSettings, config.providerId)?.name ||
    config.providerId;

  issues.push({
    type: config.required
      ? "missing_required_api_key"
      : "missing_optional_api_key",
    feature: config.feature,
    providerId: config.providerId,
    providerName,
  });
}

export async function validateProvidersForMode(
  aiSettings: AISettings,
  mode: RuntimeValidationMode,
): Promise<RuntimeValidationResult> {
  const issues: RuntimeValidationIssue[] = [];

  const requiredFeatures: FeatureConfig[] = [
    {
      feature: "story",
      providerId: aiSettings.story.providerId,
      enabled: true,
      required: true,
    },
    {
      feature: "lore",
      providerId: aiSettings.lore.providerId,
      enabled: true,
      required: true,
    },
  ];

  const embeddingRuntime = aiSettings.embedding.runtime ?? "local_transformers";
  const embeddingUsesRemoteProvider =
    embeddingRuntime !== "local_tfjs" &&
    embeddingRuntime !== "local_transformers";

  const optionalFeatures: FeatureConfig[] = [
    {
      feature: "image",
      providerId: aiSettings.image.providerId,
      enabled: aiSettings.image.enabled !== false,
      required: false,
    },
    {
      feature: "audio",
      providerId: aiSettings.audio.providerId,
      enabled: aiSettings.audio.enabled !== false,
      required: false,
    },
    {
      feature: "video",
      providerId: aiSettings.video.providerId,
      enabled: aiSettings.video.enabled !== false,
      required: false,
    },
    {
      feature: "embedding",
      providerId: aiSettings.embedding.providerId,
      enabled:
        aiSettings.embedding.enabled === true && embeddingUsesRemoteProvider,
      required: false,
    },
    {
      feature: "script",
      providerId: aiSettings.script.providerId,
      enabled: aiSettings.script.enabled !== false,
      required: false,
    },
  ];

  const featuresToCheckAvailability =
    mode === "continue"
      ? requiredFeatures
      : [...requiredFeatures, ...optionalFeatures.filter((f) => f.enabled)];

  for (const feature of featuresToCheckAvailability) {
    if (!isProviderAvailable(aiSettings, feature.providerId)) {
      pushMissingApiKeyIssue(issues, aiSettings, feature);
    }
  }

  const hasBlockingMissingKey = issues.some(
    (issue) =>
      issue.type === "missing_required_api_key" ||
      issue.type === "missing_optional_api_key",
  );

  if (hasBlockingMissingKey || mode === "continue") {
    return {
      ok: issues.length === 0,
      issues,
    };
  }

  const connectionCheckByProviderId = new Map<
    string,
    Promise<Awaited<ReturnType<typeof validateConnection>>>
  >();
  const validateProviderConnection = (
    providerId: string,
  ): Promise<Awaited<ReturnType<typeof validateConnection>>> => {
    const existing = connectionCheckByProviderId.get(providerId);
    if (existing) {
      return existing;
    }
    const request = validateConnection(aiSettings, providerId);
    connectionCheckByProviderId.set(providerId, request);
    return request;
  };

  const requiredConnectionChecks = requiredFeatures;
  for (const feature of requiredConnectionChecks) {
    const providerName =
      getProviderInstance(aiSettings, feature.providerId)?.name ||
      feature.providerId;
    const { isValid, error, localError } = await validateProviderConnection(
      feature.providerId,
    );

    if (!isValid && !localError) {
      issues.push({
        type: "required_connection_failed",
        feature: feature.feature,
        providerId: feature.providerId,
        providerName,
        error: error || undefined,
      });
    }
  }

  const optionalConnectionChecks = optionalFeatures.filter(
    (feature) =>
      feature.enabled && feature.providerId !== aiSettings.story.providerId,
  );

  for (const feature of optionalConnectionChecks) {
    const providerName =
      getProviderInstance(aiSettings, feature.providerId)?.name ||
      feature.providerId;

    const { isValid, error, localError } = await validateProviderConnection(
      feature.providerId,
    );

    if (!isValid && !localError) {
      issues.push({
        type: "optional_connection_failed",
        feature: feature.feature,
        providerId: feature.providerId,
        providerName,
        error: error || undefined,
      });
    }
  }

  const hasBlockingIssue = issues.some(
    (issue) =>
      issue.type === "missing_required_api_key" ||
      issue.type === "missing_optional_api_key" ||
      issue.type === "required_connection_failed",
  );

  return {
    ok: !hasBlockingIssue,
    issues,
  };
}
