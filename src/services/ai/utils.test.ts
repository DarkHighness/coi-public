import { describe, expect, it } from "vitest";
import {
  IMAGE_BASED_THEME,
  createLogEntry,
  createProviderConfig,
  extractJson,
  extractXmlTagValue,
  getProviderConfig,
  getProviderInstance,
  getThemeName,
  getThemeTranslation,
  normalizeSavePresetProfile,
  pickModelMatchedPrompt,
  resolveEffectivePresetProfile,
} from "./utils";

describe("ai utils", () => {
  it("finds enabled provider instance and handles missing/disabled", () => {
    const settings = {
      providers: {
        instances: [
          { id: "p1", protocol: "openai", enabled: true, apiKey: "k" },
          { id: "p2", protocol: "gemini", enabled: false, apiKey: "k2" },
        ],
      },
    } as any;

    expect(getProviderInstance(settings, "p1")?.id).toBe("p1");
    expect(getProviderInstance(settings, "p2")).toBeNull();
    expect(getProviderInstance(settings, "p2", false)?.id).toBe("p2");
    expect(getProviderInstance(settings, "none")).toBeNull();
  });

  it("creates protocol-specific provider config", () => {
    const openai = createProviderConfig({
      protocol: "openai",
      apiKey: "k",
      baseUrl: "https://example",
      geminiCompatibility: true,
    } as any);
    const gemini = createProviderConfig({
      protocol: "gemini",
      apiKey: "g",
      baseUrl: "https://g.example",
    } as any);

    expect(openai).toMatchObject({ apiKey: "k", baseUrl: "https://example" });
    expect(gemini).toMatchObject({ apiKey: "g", baseUrl: "https://g.example" });
  });

  it("builds provider config result by function type", () => {
    const settings = {
      providers: {
        instances: [
          { id: "provider-1", protocol: "openrouter", enabled: true, apiKey: "k" },
        ],
      },
      story: {
        providerId: "provider-1",
        modelId: "model-a",
        enabled: true,
        resolution: "1024x1024",
      },
    } as any;

    const result = getProviderConfig(settings, "story");
    expect(result).toMatchObject({
      modelId: "model-a",
      enabled: true,
      instance: { id: "provider-1", protocol: "openrouter" },
    });
  });

  it("creates log entry with inferred type and stage", () => {
    const log = createLogEntry({
      provider: "openai",
      model: "gpt-4.1",
      endpoint: "summary-query",
      usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
    });

    expect(log.type).toBe("summary");
    expect(log.stage).toBe("query");
    expect(log.usage.totalTokens).toBe(3);
  });

  it("returns imageBased theme name via main namespace", () => {
    const t = (key: string, options?: Record<string, unknown>) =>
      `${key}:${String(options?.defaultValue || "")}`;

    expect(getThemeName(undefined, t)).toContain("imageBased.name");
    expect(getThemeName(IMAGE_BASED_THEME, t)).toContain("imageBased.name");
    expect(getThemeName("fantasy", t)).toContain("fantasy.name");
    expect(getThemeTranslation(IMAGE_BASED_THEME, "example", t)).toBe("");
  });

  it("normalizes invalid preset profile values", () => {
    const normalized = normalizeSavePresetProfile({
      narrativeStylePreset: "invalid" as any,
      worldDispositionPreset: "mixed",
      playerMalicePreset: "unknown" as any,
      playerMaliceIntensity: "heavy",
      locked: false,
    });

    expect(normalized).toEqual({
      narrativeStylePreset: "theme",
      worldDispositionPreset: "mixed",
      playerMalicePreset: "theme",
      playerMaliceIntensity: "heavy",
      locked: true,
    });
  });

  it("prefers custom context preset tags over save profile", () => {
    const resolved = resolveEffectivePresetProfile({
      customContext:
        "<narrative_style>noir</narrative_style><world_disposition>benevolent</world_disposition><player_malice_profile>sabotage</player_malice_profile><player_malice_intensity>light</player_malice_intensity>",
      presetProfile: {
        narrativeStylePreset: "cinematic",
        worldDispositionPreset: "mixed",
        playerMalicePreset: "manipulation",
        playerMaliceIntensity: "heavy",
        locked: true,
      },
      settings: {},
    });

    expect(resolved.narrativeStylePreset).toEqual({
      value: "noir",
      source: "custom_context",
    });
    expect(resolved.playerMaliceIntensity).toEqual({
      value: "light",
      source: "custom_context",
    });
  });

  it("extracts xml tag values and picks first non-empty prompt match", () => {
    expect(extractXmlTagValue("<tag> value </tag>", "tag")).toBe("value");
    expect(extractXmlTagValue("<tag>   </tag>", "tag")).toBeUndefined();

    const prompt = pickModelMatchedPrompt(
      [
        { keywords: ["gpt"], prompt: "   " },
        { keywords: ["4.1"], prompt: "Use strict mode" },
      ] as any,
      "gpt-4.1-mini",
    );

    expect(prompt).toBe("Use strict mode");
  });

  it("extracts JSON from direct text, markdown blocks and substrings", () => {
    expect(extractJson('{"ok":true}')).toEqual({ ok: true });
    expect(extractJson("```json\n{\"a\":1}\n```")) .toEqual({ a: 1 });
    expect(extractJson("prefix text {\"b\":2} suffix")) .toEqual({ b: 2 });
    expect(extractJson("not json")).toBeNull();
  });
});
