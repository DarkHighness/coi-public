import { describe, expect, it, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getGeminiModels: vi.fn(async () => [{ id: "gemini-1", name: "Gemini 1" }]),
  validateGeminiConnection: vi.fn(async () => undefined),

  getOpenAIModels: vi.fn(async () => [{ id: "gpt-4o", name: "GPT-4o" }]),
  validateOpenAIConnection: vi.fn(async () => undefined),

  getOpenRouterModels: vi.fn(async () => [{ id: "or-1", name: "OR 1" }]),
  validateOpenRouterConnection: vi.fn(async () => undefined),

  getClaudeModels: vi.fn(async () => [{ id: "claude-1", name: "Claude 1" }]),
  validateClaudeConnection: vi.fn(async () => undefined),
}));

vi.mock("../../../providers/geminiProvider", () => ({
  getModels: mocks.getGeminiModels,
  validateConnection: mocks.validateGeminiConnection,
}));

vi.mock("../../../providers/openaiProvider", () => ({
  getModels: mocks.getOpenAIModels,
  validateConnection: mocks.validateOpenAIConnection,
}));

vi.mock("../../../providers/openRouterProvider", () => ({
  getModels: mocks.getOpenRouterModels,
  validateConnection: mocks.validateOpenRouterConnection,
}));

vi.mock("../../../providers/claudeProvider", () => ({
  getModels: mocks.getClaudeModels,
  validateConnection: mocks.validateClaudeConnection,
}));

import {
  createProviderConfig,
  getModelsForInstance,
  getProviderConfig,
  getProviderInstance,
  validateConnectionForInstance,
} from "../registry";

const createInstance = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "provider-1",
    name: "Provider",
    protocol: "openai",
    baseUrl: "https://api.example.com",
    apiKey: "key",
    enabled: true,
    createdAt: 1,
    lastModified: 1,
    ...overrides,
  }) as any;

describe("provider registry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves provider instance and builds function config", () => {
    const instance = createInstance({
      geminiCompatibility: true,
      geminiMessageFormat: true,
      claudeCompatibility: true,
      claudeMessageFormat: false,
    });

    const settings = {
      providers: { instances: [instance] },
      story: {
        providerId: instance.id,
        modelId: "gpt-4o",
        enabled: true,
        resolution: "1024x1024",
        thinkingEffort: "high",
        mediaResolution: "high",
        temperature: 0.4,
        topP: 0.9,
        topK: 20,
        minP: 0.1,
      },
    } as any;

    expect(getProviderInstance(settings, instance.id)).toEqual(instance);

    const cfg = getProviderConfig(settings, "story");
    expect(cfg).toMatchObject({
      modelId: "gpt-4o",
      enabled: true,
      resolution: "1024x1024",
      thinkingEffort: "high",
      mediaResolution: "high",
      temperature: 0.4,
      topP: 0.9,
      topK: 20,
      minP: 0.1,
    });

    expect(cfg?.config).toMatchObject({
      apiKey: "key",
      baseUrl: "https://api.example.com",
      geminiCompatibility: true,
      geminiMessageFormat: true,
      claudeCompatibility: true,
      claudeMessageFormat: false,
    });
  });

  it("returns null when provider is missing or disabled", () => {
    const disabled = createInstance({ enabled: false });
    const settings = {
      providers: { instances: [disabled] },
    } as any;

    expect(getProviderInstance(settings, "missing")).toBeNull();
    expect(getProviderInstance(settings, disabled.id)).toBeNull();
    expect(getProviderInstance(settings, disabled.id, false)).toEqual(disabled);
  });

  it("caches model list by id and config hash", async () => {
    const instance = createInstance({ id: "cache-provider", protocol: "openai" });

    const first = await getModelsForInstance(instance);
    const second = await getModelsForInstance(instance);

    expect(first).toEqual(second);
    expect(mocks.getOpenAIModels).toHaveBeenCalledTimes(1);

    const withNewBaseUrl = createInstance({
      id: "cache-provider",
      protocol: "openai",
      baseUrl: "https://api.changed.com",
    });

    await getModelsForInstance(withNewBaseUrl);
    expect(mocks.getOpenAIModels).toHaveBeenCalledTimes(2);
  });

  it("skips model fetch when api key is empty", async () => {
    const instance = createInstance({
      id: "no-key-provider",
      protocol: "gemini",
      apiKey: "",
    });

    const models = await getModelsForInstance(instance);

    expect(models).toEqual([]);
    expect(mocks.getGeminiModels).not.toHaveBeenCalled();
  });

  it("routes validateConnection by provider protocol", async () => {
    await validateConnectionForInstance(createInstance({ protocol: "gemini" }));
    await validateConnectionForInstance(createInstance({ protocol: "openai" }));
    await validateConnectionForInstance(
      createInstance({ protocol: "openrouter" }),
    );
    await validateConnectionForInstance(createInstance({ protocol: "claude" }));

    expect(mocks.validateGeminiConnection).toHaveBeenCalledTimes(1);
    expect(mocks.validateOpenAIConnection).toHaveBeenCalledTimes(1);
    expect(mocks.validateOpenRouterConnection).toHaveBeenCalledTimes(1);
    expect(mocks.validateClaudeConnection).toHaveBeenCalledTimes(1);
  });

  it("creates protocol-specific provider config", () => {
    expect(createProviderConfig(createInstance({ protocol: "gemini" }))).toMatchObject({
      apiKey: "key",
      baseUrl: "https://api.example.com",
    });
    expect(
      createProviderConfig(createInstance({ protocol: "openrouter" })),
    ).toEqual({ apiKey: "key" });
    expect(createProviderConfig(createInstance({ protocol: "claude" }))).toMatchObject({
      apiKey: "key",
      baseUrl: "https://api.example.com",
    });
  });
});
