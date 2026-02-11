import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBlockingValidationIssue,
  getOptionalConnectionWarnings,
  getValidationFeatureFallbackLabel,
  validateProvidersForMode,
} from "./providerValidation";

const validateConnectionMock = vi.hoisted(() => vi.fn());
const getEnvApiKeyMock = vi.hoisted(() => vi.fn(() => ""));

vi.mock("../../services/aiService", () => ({
  validateConnection: validateConnectionMock,
}));

vi.mock("../../utils/env", () => ({
  getEnvApiKey: getEnvApiKeyMock,
}));

function createSettings(overrides: Record<string, unknown> = {}) {
  const base = {
    providers: {
      instances: [
        {
          id: "story-provider",
          name: "Story Provider",
          protocol: "openai",
          enabled: true,
          apiKey: "sk-story",
        },
        {
          id: "lore-provider",
          name: "Lore Provider",
          protocol: "openai",
          enabled: true,
          apiKey: "sk-lore",
        },
        {
          id: "image-provider",
          name: "Image Provider",
          protocol: "openai",
          enabled: true,
          apiKey: "sk-image",
        },
        {
          id: "audio-provider",
          name: "Audio Provider",
          protocol: "openai",
          enabled: true,
          apiKey: "sk-audio",
        },
        {
          id: "video-provider",
          name: "Video Provider",
          protocol: "openai",
          enabled: true,
          apiKey: "sk-video",
        },
        {
          id: "embedding-provider",
          name: "Embedding Provider",
          protocol: "openai",
          enabled: true,
          apiKey: "sk-embed",
        },
        {
          id: "script-provider",
          name: "Script Provider",
          protocol: "openai",
          enabled: true,
          apiKey: "sk-script",
        },
      ],
    },
    story: { providerId: "story-provider" },
    lore: { providerId: "lore-provider" },
    image: { providerId: "image-provider", enabled: true },
    audio: { providerId: "audio-provider", enabled: true },
    video: { providerId: "video-provider", enabled: true },
    embedding: {
      providerId: "embedding-provider",
      enabled: true,
      runtime: "remote",
      modelId: "text-embedding-3-small",
    },
    script: { providerId: "script-provider", enabled: true },
  } as any;

  return {
    ...base,
    ...overrides,
  } as any;
}

function replaceProviderApiKey(settings: any, providerId: string, apiKey: string) {
  settings.providers.instances = settings.providers.instances.map((instance: any) =>
    instance.id === providerId ? { ...instance, apiKey } : instance,
  );
}

describe("validateProvidersForMode", () => {
  beforeEach(() => {
    validateConnectionMock.mockReset();
    getEnvApiKeyMock.mockReset();
    getEnvApiKeyMock.mockReturnValue("");
    validateConnectionMock.mockResolvedValue({ isValid: true, error: null, localError: false });
  });

  it("checks only required providers in continue mode", async () => {
    const settings = createSettings();
    replaceProviderApiKey(settings, "image-provider", "");

    const result = await validateProvidersForMode(settings, "continue");

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(validateConnectionMock).not.toHaveBeenCalled();
  });

  it("skips embedding provider checks when local TFJS runtime is enabled", async () => {
    const settings = createSettings({
      embedding: {
        providerId: "embedding-provider",
        enabled: true,
        runtime: "local_tfjs",
        modelId: "use-lite-512",
      },
    });
    replaceProviderApiKey(settings, "embedding-provider", "");

    const result = await validateProvidersForMode(settings, "start");

    expect(
      result.issues.some((issue) => issue.feature === "embedding"),
    ).toBe(false);
  });

  it("skips embedding provider checks when local transformers runtime is enabled", async () => {
    const settings = createSettings({
      embedding: {
        providerId: "embedding-provider",
        enabled: true,
        runtime: "local_transformers",
        modelId: "Xenova/all-MiniLM-L6-v2",
      },
    });
    replaceProviderApiKey(settings, "embedding-provider", "");

    const result = await validateProvidersForMode(settings, "start");

    expect(
      result.issues.some((issue) => issue.feature === "embedding"),
    ).toBe(false);
  });

  it("returns missing_optional_api_key for enabled optional providers in start mode", async () => {
    const settings = createSettings();
    replaceProviderApiKey(settings, "image-provider", "");

    const result = await validateProvidersForMode(settings, "start");

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "missing_optional_api_key",
          feature: "image",
          providerId: "image-provider",
        }),
      ]),
    );
    expect(validateConnectionMock).not.toHaveBeenCalled();
  });

  it("returns required_connection_failed when required provider connection check fails", async () => {
    const settings = createSettings();

    validateConnectionMock.mockImplementation(
      async (_settings: any, providerId: string) => {
        if (providerId === "story-provider") {
          return { isValid: false, error: "story-down", localError: false };
        }
        return { isValid: true, error: null, localError: false };
      },
    );

    const result = await validateProvidersForMode(settings, "start");

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "required_connection_failed",
          feature: "story",
          providerId: "story-provider",
          error: "story-down",
        }),
      ]),
    );
    expect(validateConnectionMock).toHaveBeenCalledWith(
      settings,
      "story-provider",
    );
    expect(validateConnectionMock).toHaveBeenCalledWith(settings, "lore-provider");
  });

  it("reports optional warnings and skips duplicate optional checks on story provider", async () => {
    const settings = createSettings({
      image: { providerId: "story-provider", enabled: true },
      video: { providerId: "video-provider", enabled: false },
      script: { providerId: "script-provider", enabled: false },
      embedding: {
        providerId: "embedding-provider",
        enabled: false,
        modelId: "text-embedding-3-small",
      },
    });

    validateConnectionMock.mockImplementation(
      async (_settings: any, providerId: string) => {
        if (providerId === "audio-provider") {
          return { isValid: false, error: "audio-down", localError: false };
        }
        return { isValid: true, error: null, localError: false };
      },
    );

    const result = await validateProvidersForMode(settings, "start");

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "optional_connection_failed",
          feature: "audio",
          providerId: "audio-provider",
          error: "audio-down",
        }),
      ]),
    );
    expect(validateConnectionMock).toHaveBeenCalledTimes(3);
  });
});

describe("provider validation helpers", () => {
  it("returns labels and issue slices consistently", () => {
    expect(getValidationFeatureFallbackLabel("embedding")).toBe("Embedding");

    const issues = [
      {
        type: "optional_connection_failed",
        feature: "image",
        providerId: "p1",
        providerName: "P1",
      },
      {
        type: "required_connection_failed",
        feature: "story",
        providerId: "p2",
        providerName: "P2",
      },
    ] as any;

    expect(getBlockingValidationIssue(issues)?.type).toBe(
      "required_connection_failed",
    );
    expect(getOptionalConnectionWarnings(issues)).toHaveLength(1);
  });
});
