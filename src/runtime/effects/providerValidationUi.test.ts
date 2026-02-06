import { describe, expect, it, vi } from "vitest";
import { presentProviderValidationResult } from "./providerValidationUi";

function createTranslator() {
  return vi.fn((key: string, options?: unknown) => {
    if (typeof options === "string") {
      return `${key}:${options}`;
    }

    if (options && typeof options === "object") {
      const payload = options as Record<string, unknown>;
      if (key === "providers.errors.requiredFeatureUnavailable") {
        return `required:${payload.feature}:${payload.provider}:${payload.error}`;
      }
      if (key === "providers.errors.optionalFeatureUnavailable") {
        return `optional:${payload.feature}:${payload.provider}:${payload.error}`;
      }
    }

    if (key === "missingApiKey") return "missing-api-key";
    if (key === "connectionFailed") return "connection-failed";

    return key;
  });
}

describe("presentProviderValidationResult", () => {
  it("returns false and opens settings for blocking missing key", () => {
    const showToast = vi.fn();
    const onBlockingIssue = vi.fn();

    const result = presentProviderValidationResult(
      {
        ok: false,
        issues: [
          {
            type: "missing_required_api_key",
            feature: "story",
            providerId: "p1",
            providerName: "Provider 1",
          },
        ],
      },
      {
        t: createTranslator(),
        showToast,
        onBlockingIssue,
      },
    );

    expect(result).toBe(false);
    expect(showToast).toHaveBeenCalledWith("missing-api-key", "error");
    expect(onBlockingIssue).toHaveBeenCalledTimes(1);
  });

  it("formats required provider failure message", () => {
    const showToast = vi.fn();
    const onBlockingIssue = vi.fn();

    const result = presentProviderValidationResult(
      {
        ok: false,
        issues: [
          {
            type: "required_connection_failed",
            feature: "embedding",
            providerId: "p2",
            providerName: "Embedding Provider",
            error: "provider-down",
          },
        ],
      },
      {
        t: createTranslator(),
        showToast,
        onBlockingIssue,
      },
    );

    expect(result).toBe(false);
    expect(showToast).toHaveBeenCalledWith(
      "required:providers.features.embedding:Embedding:Embedding Provider:provider-down",
      "error",
    );
    expect(onBlockingIssue).toHaveBeenCalledTimes(1);
  });

  it("emits optional warning toasts and returns validation ok", () => {
    const showToast = vi.fn();

    const result = presentProviderValidationResult(
      {
        ok: true,
        issues: [
          {
            type: "optional_connection_failed",
            feature: "audio",
            providerId: "p3",
            providerName: "Audio Provider",
            error: "audio-down",
          },
        ],
      },
      {
        t: createTranslator(),
        showToast,
      },
    );

    expect(result).toBe(true);
    expect(showToast).toHaveBeenCalledWith(
      "optional:providers.features.audio:Audio:Audio Provider:audio-down",
      "warning",
    );
  });
});
