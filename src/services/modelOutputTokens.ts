import type { ProviderProtocol } from "../types";

export const MIN_RECOMMENDED_OUTPUT_FALLBACK_TOKENS = 16_384;

/**
 * Best-effort protocol defaults used only when model-specific output caps
 * cannot be resolved. Values intentionally target practical maximums.
 */
export const DEFAULT_PROTOCOL_MAX_OUTPUT_FALLBACK_TOKENS: Record<
  ProviderProtocol,
  number
> = {
  openai: 128000,
  openrouter: 128000,
  gemini: 65536,
  claude: 64000,
};

interface ModelOutputTokenDefaultEntry {
  providerProtocol: ProviderProtocol;
  modelId: string;
  maxOutputTokens: number;
}

interface ModelOutputTokenRule {
  providerProtocol: ProviderProtocol;
  pattern: RegExp;
  maxOutputTokens: number;
}

const MODEL_OUTPUT_TOKEN_SNAPSHOT_DATE = "2026-02-17";

/**
 * Curated max-output defaults from official provider docs (snapshot above).
 * Output cap is different from context window and must be tracked separately.
 */
const MODEL_OUTPUT_TOKEN_DEFAULTS: ModelOutputTokenDefaultEntry[] = [
  // OpenAI
  { providerProtocol: "openai", modelId: "gpt-5.2", maxOutputTokens: 128000 },
  {
    providerProtocol: "openai",
    modelId: "gpt-5.2-pro",
    maxOutputTokens: 128000,
  },
  {
    providerProtocol: "openai",
    modelId: "gpt-5.2-chat-latest",
    maxOutputTokens: 128000,
  },
  { providerProtocol: "openai", modelId: "gpt-5", maxOutputTokens: 128000 },
  {
    providerProtocol: "openai",
    modelId: "gpt-5-pro",
    maxOutputTokens: 128000,
  },
  {
    providerProtocol: "openai",
    modelId: "gpt-5-mini",
    maxOutputTokens: 128000,
  },
  {
    providerProtocol: "openai",
    modelId: "gpt-5-nano",
    maxOutputTokens: 128000,
  },
  {
    providerProtocol: "openai",
    modelId: "gpt-5-codex",
    maxOutputTokens: 128000,
  },
  {
    providerProtocol: "openai",
    modelId: "gpt-5-chat-latest",
    maxOutputTokens: 128000,
  },
  { providerProtocol: "openai", modelId: "gpt-4.1", maxOutputTokens: 32768 },
  {
    providerProtocol: "openai",
    modelId: "gpt-4.1-mini",
    maxOutputTokens: 32768,
  },
  {
    providerProtocol: "openai",
    modelId: "gpt-4.1-nano",
    maxOutputTokens: 32768,
  },
  { providerProtocol: "openai", modelId: "gpt-4o", maxOutputTokens: 16384 },
  {
    providerProtocol: "openai",
    modelId: "gpt-4o-mini",
    maxOutputTokens: 16384,
  },
  { providerProtocol: "openai", modelId: "o3", maxOutputTokens: 100000 },
  { providerProtocol: "openai", modelId: "o3-pro", maxOutputTokens: 100000 },
  { providerProtocol: "openai", modelId: "o3-mini", maxOutputTokens: 100000 },
  {
    providerProtocol: "openai",
    modelId: "o3-deep-research",
    maxOutputTokens: 100000,
  },
  { providerProtocol: "openai", modelId: "o4-mini", maxOutputTokens: 100000 },
  {
    providerProtocol: "openai",
    modelId: "o4-mini-deep-research",
    maxOutputTokens: 100000,
  },
  { providerProtocol: "openai", modelId: "o1", maxOutputTokens: 100000 },
  { providerProtocol: "openai", modelId: "o1-pro", maxOutputTokens: 100000 },
  { providerProtocol: "openai", modelId: "o1-mini", maxOutputTokens: 65536 },

  // Gemini
  {
    providerProtocol: "gemini",
    modelId: "gemini-3-pro-preview-02-26",
    maxOutputTokens: 65536,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-3-flash-preview-02-26",
    maxOutputTokens: 65536,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.5-pro",
    maxOutputTokens: 65536,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.5-flash",
    maxOutputTokens: 65536,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.5-flash-lite",
    maxOutputTokens: 65536,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.0-flash",
    maxOutputTokens: 8192,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.0-flash-001",
    maxOutputTokens: 8192,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.0-flash-lite",
    maxOutputTokens: 8192,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.0-flash-live-001",
    maxOutputTokens: 8192,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.5-flash-preview-tts",
    maxOutputTokens: 16384,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.5-pro-preview-tts",
    maxOutputTokens: 16384,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.5-flash-native-audio-preview-12-2025",
    maxOutputTokens: 8192,
  },

  // Claude
  {
    providerProtocol: "claude",
    modelId: "claude-opus-4-1",
    maxOutputTokens: 32768,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-opus-4-1-20250805",
    maxOutputTokens: 32768,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-opus-4-20250514",
    maxOutputTokens: 32000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-sonnet-4-20250514",
    maxOutputTokens: 64000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-sonnet-4-5",
    maxOutputTokens: 64000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-sonnet-4-5-20250929",
    maxOutputTokens: 64000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-haiku-4-5",
    maxOutputTokens: 64000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-haiku-4-5-20251001",
    maxOutputTokens: 64000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-opus-4-5",
    maxOutputTokens: 128000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-opus-4-5-20251101",
    maxOutputTokens: 128000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-3-7-sonnet-20250219",
    maxOutputTokens: 64000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-3-5-sonnet-20241022",
    maxOutputTokens: 8192,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-3-5-haiku-20241022",
    maxOutputTokens: 8192,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-3-opus-20240229",
    maxOutputTokens: 4096,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-3-sonnet-20240229",
    maxOutputTokens: 4096,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-3-haiku-20240307",
    maxOutputTokens: 4096,
  },
];

const MODEL_OUTPUT_TOKEN_RULES: ModelOutputTokenRule[] = [
  // OpenAI snapshot models frequently include date suffixes.
  {
    providerProtocol: "openai",
    pattern: /^gpt-5(?:\.[0-9]+)?(?:-[a-z]+)*(?:-\d{4}-\d{2}-\d{2})?$/,
    maxOutputTokens: 128000,
  },
  {
    providerProtocol: "openai",
    pattern: /^gpt-4\.1(?:-(?:mini|nano))?(?:-\d{4}-\d{2}-\d{2})?$/,
    maxOutputTokens: 32768,
  },
  {
    providerProtocol: "openai",
    pattern: /^gpt-4o(?:-mini)?(?:-\d{4}-\d{2}-\d{2})?$/,
    maxOutputTokens: 16384,
  },
  {
    providerProtocol: "openai",
    pattern: /^o1-mini(?:-\d{4}-\d{2}-\d{2})?$/,
    maxOutputTokens: 65536,
  },
  {
    providerProtocol: "openai",
    pattern: /^o(?:1|3|4)(?:-[a-z-]+)?(?:-\d{4}-\d{2}-\d{2})?$/,
    maxOutputTokens: 100000,
  },

  // Gemini preview/date variants.
  {
    providerProtocol: "gemini",
    pattern: /^gemini-3-(?:pro|flash)-preview(?:-[0-9]{2}-[0-9]{2})?$/,
    maxOutputTokens: 65536,
  },
  {
    providerProtocol: "gemini",
    pattern: /^gemini-2\.5-(?:pro|flash|flash-lite)(?!.*(?:tts|audio))/,
    maxOutputTokens: 65536,
  },
  {
    providerProtocol: "gemini",
    pattern: /^gemini-2\.0-flash(?:-001|-lite|-live-001)?$/,
    maxOutputTokens: 8192,
  },
  {
    providerProtocol: "gemini",
    pattern: /^gemini-2\.5-(?:pro|flash)-preview-tts$/,
    maxOutputTokens: 16384,
  },
  {
    providerProtocol: "gemini",
    pattern: /^gemini-2\.5-flash-native-audio-preview(?:-[0-9]{2}-[0-9]{4})?$/,
    maxOutputTokens: 8192,
  },

  // Claude snapshot/date variants.
  {
    providerProtocol: "claude",
    pattern: /^claude-opus-4-5(?:-\d{8})?$/,
    maxOutputTokens: 128000,
  },
  {
    providerProtocol: "claude",
    pattern: /^claude-(?:sonnet|haiku)-4-5(?:-\d{8})?$/,
    maxOutputTokens: 64000,
  },
  {
    providerProtocol: "claude",
    pattern: /^claude-opus-4-1(?:-\d{8})?$/,
    maxOutputTokens: 32768,
  },
  {
    providerProtocol: "claude",
    pattern: /^claude-opus-4(?:-\d{8})?$/,
    maxOutputTokens: 32000,
  },
  {
    providerProtocol: "claude",
    pattern: /^claude-sonnet-4(?:-\d{8})?$/,
    maxOutputTokens: 64000,
  },
  {
    providerProtocol: "claude",
    pattern: /^claude-3-7-sonnet(?:-\d{8})?$/,
    maxOutputTokens: 64000,
  },
  {
    providerProtocol: "claude",
    pattern: /^claude-3-5-(?:sonnet|haiku)(?:-\d{8})?$/,
    maxOutputTokens: 8192,
  },
  {
    providerProtocol: "claude",
    pattern: /^claude-3-(?:opus|sonnet|haiku)(?:-\d{8})?$/,
    maxOutputTokens: 4096,
  },
];

const MAX_OUTPUT_TOKENS_BY_MODEL = new Map<string, number>(
  MODEL_OUTPUT_TOKEN_DEFAULTS.map((entry) => [
    `${entry.providerProtocol}/${entry.modelId.toLowerCase()}`,
    entry.maxOutputTokens,
  ]),
);

const normalizeModelId = (modelId: string): string =>
  modelId.trim().toLowerCase();

export const sanitizePositiveOutputTokens = (
  value: unknown,
): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : undefined;
};

export const isLowOutputFallbackSetting = (tokens: number): boolean =>
  tokens < MIN_RECOMMENDED_OUTPUT_FALLBACK_TOKENS;

export const getModelOutputTokenSnapshotDate = (): string =>
  MODEL_OUTPUT_TOKEN_SNAPSHOT_DATE;

export function getDefaultModelMaxOutputTokens(
  providerProtocol: ProviderProtocol | undefined,
  modelId: string,
): number | undefined {
  const model = modelId?.trim();
  if (!providerProtocol || !model) {
    return undefined;
  }

  const normalizedModel = normalizeModelId(model);
  const direct = MAX_OUTPUT_TOKENS_BY_MODEL.get(
    `${providerProtocol}/${normalizedModel}`,
  );
  if (direct) {
    return direct;
  }

  const rule = MODEL_OUTPUT_TOKEN_RULES.find(
    (item) =>
      item.providerProtocol === providerProtocol &&
      item.pattern.test(normalizedModel),
  );
  return rule?.maxOutputTokens;
}
