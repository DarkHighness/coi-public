import { beforeEach, describe, expect, it, vi } from "vitest";

const getProviderInstanceMock = vi.hoisted(() => vi.fn());
const createProviderConfigMock = vi.hoisted(() => vi.fn());

const getGeminiEmbeddingModelsMock = vi.hoisted(() => vi.fn());
const getOpenAIEmbeddingModelsMock = vi.hoisted(() => vi.fn());
const getOpenRouterEmbeddingModelsMock = vi.hoisted(() => vi.fn());
const getClaudeEmbeddingModelsMock = vi.hoisted(() => vi.fn());

vi.mock("./utils", () => ({
  getProviderInstance: getProviderInstanceMock,
  createProviderConfig: createProviderConfigMock,
}));

vi.mock("../providers/geminiProvider", () => ({
  getEmbeddingModels: getGeminiEmbeddingModelsMock,
}));

vi.mock("../providers/openaiProvider", () => ({
  getEmbeddingModels: getOpenAIEmbeddingModelsMock,
}));

vi.mock("../providers/openRouterProvider", () => ({
  getEmbeddingModels: getOpenRouterEmbeddingModelsMock,
}));

vi.mock("../providers/claudeProvider", () => ({
  getEmbeddingModels: getClaudeEmbeddingModelsMock,
}));

import { getEmbeddingModels } from "./embeddings";

describe("ai/embeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createProviderConfigMock.mockReturnValue({ apiKey: "k" });
  });

  it("returns empty list when provider instance is missing", async () => {
    getProviderInstanceMock.mockReturnValue(null);

    const models = await getEmbeddingModels({} as any, "missing");

    expect(models).toEqual([]);
    expect(createProviderConfigMock).not.toHaveBeenCalled();
  });

  it("dispatches to gemini embedding provider", async () => {
    getProviderInstanceMock.mockReturnValue({ protocol: "gemini" });
    getGeminiEmbeddingModelsMock.mockResolvedValue([{ id: "g-1" }]);

    const models = await getEmbeddingModels({} as any, "p1");

    expect(createProviderConfigMock).toHaveBeenCalled();
    expect(getGeminiEmbeddingModelsMock).toHaveBeenCalledWith({ apiKey: "k" });
    expect(models).toEqual([{ id: "g-1" }]);
  });

  it("dispatches to openai/openrouter/claude providers", async () => {
    getOpenAIEmbeddingModelsMock.mockResolvedValue([{ id: "o-1" }]);
    getOpenRouterEmbeddingModelsMock.mockResolvedValue([{ id: "r-1" }]);
    getClaudeEmbeddingModelsMock.mockResolvedValue([{ id: "c-1" }]);

    getProviderInstanceMock.mockReturnValueOnce({ protocol: "openai" });
    await expect(getEmbeddingModels({} as any, "p-openai")).resolves.toEqual([
      { id: "o-1" },
    ]);

    getProviderInstanceMock.mockReturnValueOnce({ protocol: "openrouter" });
    await expect(getEmbeddingModels({} as any, "p-openrouter")).resolves.toEqual([
      { id: "r-1" },
    ]);

    getProviderInstanceMock.mockReturnValueOnce({ protocol: "claude" });
    await expect(getEmbeddingModels({} as any, "p-claude")).resolves.toEqual([
      { id: "c-1" },
    ]);
  });

  it("returns empty list for unknown protocol", async () => {
    getProviderInstanceMock.mockReturnValue({ protocol: "local_tfjs" });

    const models = await getEmbeddingModels({} as any, "p-unknown");

    expect(models).toEqual([]);
  });

  it("returns empty list when provider fetch throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getProviderInstanceMock.mockReturnValue({ protocol: "gemini" });
    getGeminiEmbeddingModelsMock.mockRejectedValue(new Error("network down"));

    const models = await getEmbeddingModels({} as any, "p1");

    expect(models).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
  });
});
