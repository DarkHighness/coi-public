import type { TFunction } from "i18next";
import {
  getBlockingValidationIssue,
  getOptionalConnectionWarnings,
  getValidationFeatureFallbackLabel,
} from "./providerValidation";
import type { RuntimeValidationIssue, RuntimeValidationResult } from "../state";

type ToastLevel = "info" | "error" | "success" | "warning";
type TranslateFn = TFunction | ((key: string, options?: unknown) => unknown);

interface ValidationUiPresenterOptions {
  t: TranslateFn;
  showToast: (message: string, type?: ToastLevel) => void;
  onBlockingIssue?: () => void;
}

function asText(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

const translate = (
  t: TranslateFn,
  key: string,
  options?: unknown,
): unknown => (t as (k: string, o?: unknown) => unknown)(key, options);

function resolveFeatureLabel(
  t: ValidationUiPresenterOptions["t"],
  feature: RuntimeValidationIssue["feature"],
): string {
  const fallback = getValidationFeatureFallbackLabel(feature);
  return asText(translate(t, `providers.features.${feature}`, fallback), fallback);
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
      showToast(asText(translate(t, "missingApiKey"), "Missing API Key"), "error");
    } else {
      const featureLabel = resolveFeatureLabel(t, blockingIssue.feature);
      const errorText =
        blockingIssue.error ||
        asText(translate(t, "connectionFailed"), "Connection Failed");

      showToast(
        asText(
          translate(t, "providers.errors.requiredFeatureUnavailable", {
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
      issue.error || asText(translate(t, "connectionFailed"), "Connection failed");

    showToast(
      asText(
        translate(t, "providers.errors.optionalFeatureUnavailable", {
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
