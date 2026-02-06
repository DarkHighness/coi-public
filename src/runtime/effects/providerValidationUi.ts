import {
  getBlockingValidationIssue,
  getOptionalConnectionWarnings,
  getValidationFeatureFallbackLabel,
} from "./providerValidation";
import type { RuntimeValidationResult } from "../state";

type ToastLevel = "info" | "error" | "success" | "warning";

interface ValidationUiPresenterOptions {
  t: (...args: any[]) => unknown;
  showToast: (message: string, type?: ToastLevel) => void;
  onBlockingIssue?: () => void;
}

function asText(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function resolveFeatureLabel(
  t: ValidationUiPresenterOptions["t"],
  feature: string,
): string {
  const fallback = getValidationFeatureFallbackLabel(feature as any);
  return asText(t(`providers.features.${feature}`, fallback), fallback);
}

export function presentProviderValidationResult(
  validation: RuntimeValidationResult,
  options: ValidationUiPresenterOptions,
): boolean {
  const { t, showToast, onBlockingIssue } = options;

  const blockingIssue = getBlockingValidationIssue(validation.issues);

  if (blockingIssue) {
    if (
      blockingIssue.type === "missing_required_api_key" ||
      blockingIssue.type === "missing_optional_api_key"
    ) {
      showToast(asText(t("missingApiKey"), "Missing API Key"), "error");
    } else {
      const featureLabel = resolveFeatureLabel(t, blockingIssue.feature);
      const errorText =
        blockingIssue.error ||
        asText(t("connectionFailed"), "Connection Failed");

      showToast(
        asText(
          t("providers.errors.requiredFeatureUnavailable", {
            feature: featureLabel,
            provider: blockingIssue.providerName,
            error: errorText,
          }),
          `Required feature unavailable: ${featureLabel}`,
        ),
        "error",
      );
    }

    onBlockingIssue?.();
    return false;
  }

  for (const issue of getOptionalConnectionWarnings(validation.issues)) {
    const featureLabel = resolveFeatureLabel(t, issue.feature);
    const errorText =
      issue.error || asText(t("connectionFailed"), "Connection failed");

    showToast(
      asText(
        t("providers.errors.optionalFeatureUnavailable", {
          feature: featureLabel,
          provider: issue.providerName,
          error: errorText,
        }),
        `Optional feature unavailable: ${featureLabel}`,
      ),
      "warning",
    );
  }

  return validation.ok;
}
