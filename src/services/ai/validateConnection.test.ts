import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const validateGeminiConnectionMock = vi.hoisted(() => vi.fn());
const validateOpenAIConnectionMock = vi.hoisted(() => vi.fn());
const validateOpenRouterConnectionMock = vi.hoisted(() => vi.fn());
const validateClaudeConnectionMock = vi.hoisted(() => vi.fn());

vi.mock("../providers/geminiProvider", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../providers/geminiProvider")>();
  return {
    ...actual,
    validateConnection: validateGeminiConnectionMock,
  };
});

vi.mock("../providers/openaiProvider", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../providers/openaiProvider")>();
  return {
    ...actual,
    validateConnection: validateOpenAIConnectionMock,
  };
});

vi.mock("../providers/openRouterProvider", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../providers/openRouterProvider")>();
  return {
    ...actual,
    validateConnection: validateOpenRouterConnectionMock,
  };
});

vi.mock("../providers/claudeProvider", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../providers/claudeProvider")>();
  return {
    ...actual,
    validateConnection: validateClaudeConnectionMock,
  };
});

const createSettings = (
  protocol: "gemini" | "openai" | "openrouter" | "claude",
  providerId: string = "provider-1",
  options: { apiKey?: string; lastModified?: number } = {},
) =>
  ({
    providers: {
      instances: [
        {
          id: providerId,
          name: providerId,
          protocol,
          enabled: true,
          apiKey: options.apiKey ?? "sk-test",
          baseUrl: "https://example.test",
          createdAt: 0,
          lastModified: options.lastModified ?? 1,
        },
      ],
    },
  }) as any;

const loadValidateConnection = async () => {
  const module = await import("./utils");
  return module.validateConnection;
};

describe("validateConnection caching", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("caches successful remote validation for 15 minutes", async () => {
    validateGeminiConnectionMock.mockResolvedValue(undefined);
    const validateConnection = await loadValidateConnection();
    const settings = createSettings("gemini", "gemini-cache-success");

    const first = await validateConnection(settings, "gemini-cache-success");
    const second = await validateConnection(settings, "gemini-cache-success");

    expect(first).toEqual({ isValid: true });
    expect(second).toEqual({ isValid: true });
    expect(validateGeminiConnectionMock).toHaveBeenCalledTimes(1);
  });

  it("caches remote failures (non-local errors)", async () => {
    validateGeminiConnectionMock.mockRejectedValue(new Error("provider-down"));
    const validateConnection = await loadValidateConnection();
    const settings = createSettings("gemini", "gemini-cache-failure");

    const first = await validateConnection(settings, "gemini-cache-failure");
    const second = await validateConnection(settings, "gemini-cache-failure");

    expect(first).toMatchObject({
      isValid: false,
      localError: false,
      error: "provider-down",
    });
    expect(second).toMatchObject({
      isValid: false,
      localError: false,
      error: "provider-down",
    });
    expect(validateGeminiConnectionMock).toHaveBeenCalledTimes(1);
  });

  it("bypasses cache when forceRefresh=true", async () => {
    validateGeminiConnectionMock.mockResolvedValue(undefined);
    const validateConnection = await loadValidateConnection();
    const settings = createSettings("gemini", "gemini-force-refresh");

    await validateConnection(settings, "gemini-force-refresh");
    await validateConnection(settings, "gemini-force-refresh", {
      forceRefresh: true,
    });

    expect(validateGeminiConnectionMock).toHaveBeenCalledTimes(2);
  });

  it("expires cache after 15 minutes", async () => {
    validateGeminiConnectionMock.mockResolvedValue(undefined);
    const validateConnection = await loadValidateConnection();
    const settings = createSettings("gemini", "gemini-ttl");

    await validateConnection(settings, "gemini-ttl");
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    await validateConnection(settings, "gemini-ttl");

    expect(validateGeminiConnectionMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache local configuration errors", async () => {
    const validateConnection = await loadValidateConnection();
    const settings = createSettings("gemini", "gemini-local-error", {
      apiKey: "",
    });

    const first = await validateConnection(settings, "gemini-local-error");
    const second = await validateConnection(settings, "gemini-local-error");

    expect(first).toEqual({
      isValid: false,
      error: "API key is required",
      localError: true,
    });
    expect(second).toEqual({
      isValid: false,
      error: "API key is required",
      localError: true,
    });
    expect(validateGeminiConnectionMock).not.toHaveBeenCalled();
  });
});
