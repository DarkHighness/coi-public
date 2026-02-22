import type { AISettings, ModelInfo, ProviderProtocol } from "../types";

export const DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS = 128_000;

interface ModelContextWindowDefaultEntry {
  providerProtocol: ProviderProtocol;
  modelId: string;
  contextWindow: number;
}

const MODEL_CONTEXT_WINDOWS_SNAPSHOT_DATE = "2026-02-07";

/**
 * Curated defaults from official provider docs (snapshot date above).
 * This list is a best-effort fallback for providers/endpoints that don't
 * expose context limits via `/v1/models`.
 */
const MODEL_CONTEXT_WINDOW_DEFAULTS: ModelContextWindowDefaultEntry[] = [
  // OpenAI
  { providerProtocol: "openai", modelId: "gpt-5.2", contextWindow: 400000 },
  {
    providerProtocol: "openai",
    modelId: "gpt-5.2-pro",
    contextWindow: 400000,
  },
  {
    providerProtocol: "openai",
    modelId: "gpt-5.2-chat-latest",
    contextWindow: 128000,
  },
  { providerProtocol: "openai", modelId: "gpt-5", contextWindow: 400000 },
  {
    providerProtocol: "openai",
    modelId: "gpt-5-pro",
    contextWindow: 400000,
  },
  {
    providerProtocol: "openai",
    modelId: "gpt-5-mini",
    contextWindow: 400000,
  },
  {
    providerProtocol: "openai",
    modelId: "gpt-5-nano",
    contextWindow: 400000,
  },
  {
    providerProtocol: "openai",
    modelId: "gpt-5-codex",
    contextWindow: 400000,
  },
  {
    providerProtocol: "openai",
    modelId: "gpt-5-chat-latest",
    contextWindow: 128000,
  },
  { providerProtocol: "openai", modelId: "gpt-4.1", contextWindow: 1047576 },
  {
    providerProtocol: "openai",
    modelId: "gpt-4.1-mini",
    contextWindow: 1047576,
  },
  {
    providerProtocol: "openai",
    modelId: "gpt-4.1-nano",
    contextWindow: 1047576,
  },
  { providerProtocol: "openai", modelId: "gpt-4o", contextWindow: 128000 },
  {
    providerProtocol: "openai",
    modelId: "gpt-4o-mini",
    contextWindow: 128000,
  },
  { providerProtocol: "openai", modelId: "o3", contextWindow: 200000 },
  {
    providerProtocol: "openai",
    modelId: "o3-pro",
    contextWindow: 200000,
  },
  {
    providerProtocol: "openai",
    modelId: "o3-mini",
    contextWindow: 200000,
  },
  {
    providerProtocol: "openai",
    modelId: "o3-deep-research",
    contextWindow: 200000,
  },
  { providerProtocol: "openai", modelId: "o4-mini", contextWindow: 200000 },
  {
    providerProtocol: "openai",
    modelId: "o4-mini-deep-research",
    contextWindow: 200000,
  },
  { providerProtocol: "openai", modelId: "o1", contextWindow: 200000 },
  {
    providerProtocol: "openai",
    modelId: "o1-pro",
    contextWindow: 200000,
  },
  { providerProtocol: "openai", modelId: "o1-mini", contextWindow: 128000 },

  // Gemini
  {
    providerProtocol: "gemini",
    modelId: "gemini-3-pro-preview-02-26",
    contextWindow: 1048576,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-3-flash-preview-02-26",
    contextWindow: 1048576,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.5-pro",
    contextWindow: 1048576,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.5-flash",
    contextWindow: 1048576,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.5-flash-lite",
    contextWindow: 1048576,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.0-flash",
    contextWindow: 1048576,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.0-flash-001",
    contextWindow: 1048576,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.0-flash-lite",
    contextWindow: 1048576,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.0-flash-live-001",
    contextWindow: 1048576,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.5-flash-preview-tts",
    contextWindow: 8192,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.5-pro-preview-tts",
    contextWindow: 8192,
  },
  {
    providerProtocol: "gemini",
    modelId: "gemini-2.5-flash-native-audio-preview-12-2025",
    contextWindow: 131072,
  },

  // Claude
  {
    providerProtocol: "claude",
    modelId: "claude-opus-4-1",
    contextWindow: 200000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-sonnet-4-5",
    contextWindow: 200000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-sonnet-4-5-20250929",
    contextWindow: 200000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-haiku-4-5",
    contextWindow: 200000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-haiku-4-5-20251001",
    contextWindow: 200000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-opus-4-5-20251101",
    contextWindow: 200000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-sonnet-4-20250514",
    contextWindow: 200000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-3-7-sonnet-20250219",
    contextWindow: 200000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-3-5-sonnet-20241022",
    contextWindow: 200000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-3-5-haiku-20241022",
    contextWindow: 200000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-3-opus-20240229",
    contextWindow: 200000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-3-sonnet-20240229",
    contextWindow: 200000,
  },
  {
    providerProtocol: "claude",
    modelId: "claude-3-haiku-20240307",
    contextWindow: 200000,
  },
];

interface ModelContextWindowRule {
  providerProtocol: ProviderProtocol;
  pattern: RegExp;
  contextWindow: number;
}

const MODEL_CONTEXT_WINDOW_RULES: ModelContextWindowRule[] = [
  // OpenAI snapshots often include date suffixes.
  {
    providerProtocol: "openai",
    pattern: /^gpt-5(?:\.[0-9]+)?-chat-latest(?:-\d{4}-\d{2}-\d{2})?$/,
    contextWindow: 128000,
  },
  {
    providerProtocol: "openai",
    pattern: /^gpt-5(?:\.[0-9]+)?(?:-[a-z]+)*(?:-\d{4}-\d{2}-\d{2})?$/,
    contextWindow: 400000,
  },
  {
    providerProtocol: "openai",
    pattern: /^gpt-4\.1(?:-(?:mini|nano))?(?:-\d{4}-\d{2}-\d{2})?$/,
    contextWindow: 1047576,
  },
  {
    providerProtocol: "openai",
    pattern: /^gpt-4o(?:-mini)?(?:-\d{4}-\d{2}-\d{2})?$/,
    contextWindow: 128000,
  },
  {
    providerProtocol: "openai",
    pattern: /^o1-mini(?:-\d{4}-\d{2}-\d{2})?$/,
    contextWindow: 128000,
  },
  {
    providerProtocol: "openai",
    pattern: /^o(?:1|3|4)(?:-[a-z-]+)?(?:-\d{4}-\d{2}-\d{2})?$/,
    contextWindow: 200000,
  },

  // Gemini previews also frequently rev with date suffixes.
  {
    providerProtocol: "gemini",
    pattern:
      /^gemini-3-(?:pro|flash)-preview(?:-(?:[0-9]{2}-[0-9]{2}|[0-9]{8}|[0-9]{4}-[0-9]{2}-[0-9]{2}))?$/,
    contextWindow: 1048576,
  },
  {
    providerProtocol: "gemini",
    pattern: /^gemini-2\.5-(?:pro|flash|flash-lite)(?!.*(?:tts|audio))/,
    contextWindow: 1048576,
  },
  {
    providerProtocol: "gemini",
    pattern: /^gemini-2\.0-flash(?:-001|-lite|-live-001)?$/,
    contextWindow: 1048576,
  },
  {
    providerProtocol: "gemini",
    pattern: /^gemini-2\.5-(?:pro|flash)-preview-tts$/,
    contextWindow: 8192,
  },
  {
    providerProtocol: "gemini",
    pattern: /^gemini-2\.5-flash-native-audio-preview(?:-[0-9]{2}-[0-9]{4})?$/,
    contextWindow: 131072,
  },

  // Claude currently defaults to 200K without 1M beta headers.
  {
    providerProtocol: "claude",
    pattern: /^claude-(?:opus|sonnet|haiku)-/,
    contextWindow: 200000,
  },
];

const CONTEXT_WINDOW_BY_MODEL = new Map<string, number>(
  MODEL_CONTEXT_WINDOW_DEFAULTS.map((entry) => [
    `${entry.providerProtocol}/${entry.modelId.toLowerCase()}`,
    entry.contextWindow,
  ]),
);

const OPENROUTER_MODELS_API_URL = "https://openrouter.ai/api/v1/models";
const OPENROUTER_STATIC_MODELS_URL = "/resources/openrouter_models.json";
const OPENROUTER_MODELS_CACHE_TTL_MS = 5 * 60 * 1000;

function sanitizePositiveContextWindow(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : undefined;
}

function normalizeModelId(modelId: string): string {
  return modelId.trim().toLowerCase();
}

type JsonRecord = Record<string, unknown>;

interface OpenRouterContextCandidate {
  id: string;
  canonicalSlug?: string;
  name?: string;
  contextLength: number;
}

interface OpenRouterCatalogCacheEntry {
  timestamp: number;
  candidates: OpenRouterContextCandidate[];
}

const openRouterRemoteCatalogCache = new Map<
  string,
  OpenRouterCatalogCacheEntry
>();
const openRouterRemoteCatalogInFlight = new Map<
  string,
  Promise<OpenRouterContextCandidate[]>
>();
let openRouterStaticCatalogCache: OpenRouterContextCandidate[] | null = null;
let openRouterStaticCatalogInFlight: Promise<
  OpenRouterContextCandidate[]
> | null = null;

const isJsonRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readStringField = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const readNumericField = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

function tokenizeModelIdentifier(value: string): string[] {
  return normalizeModelId(value)
    .replaceAll("_", "-")
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 0);
}

function stripProviderPrefix(value: string): string {
  const normalized = normalizeModelId(value).replaceAll("_", "-");
  const slashIndex = normalized.lastIndexOf("/");
  return slashIndex >= 0 ? normalized.slice(slashIndex + 1) : normalized;
}

function modelPrefix(value: string): string | undefined {
  const normalized = normalizeModelId(value);
  const slashIndex = normalized.indexOf("/");
  if (slashIndex <= 0) return undefined;
  return normalized.slice(0, slashIndex);
}

const OPENROUTER_UPSTREAM_PROTOCOL_BY_PREFIX: Partial<
  Record<string, ProviderProtocol>
> = {
  anthropic: "claude",
  google: "gemini",
  openai: "openai",
};

function resolveOpenRouterUpstreamContextWindow(
  normalizedModelId: string,
): number | undefined {
  const slashIndex = normalizedModelId.indexOf("/");
  if (slashIndex <= 0 || slashIndex >= normalizedModelId.length - 1) {
    return undefined;
  }
  const upstreamPrefix = normalizedModelId.slice(0, slashIndex);
  const upstreamModelId = normalizedModelId.slice(slashIndex + 1);
  const upstreamProtocol =
    OPENROUTER_UPSTREAM_PROTOCOL_BY_PREFIX[upstreamPrefix];
  if (!upstreamProtocol) {
    return undefined;
  }
  return getDefaultModelContextWindow(upstreamProtocol, upstreamModelId);
}

function readOpenRouterCandidateContextLength(
  modelRecord: JsonRecord,
): number | undefined {
  const topProvider = isJsonRecord(modelRecord.top_provider)
    ? modelRecord.top_provider
    : isJsonRecord(modelRecord.topProvider)
      ? modelRecord.topProvider
      : undefined;
  return sanitizePositiveContextWindow(
    readNumericField(modelRecord.context_length) ??
      readNumericField(modelRecord.contextLength) ??
      (topProvider
        ? (readNumericField(topProvider.context_length) ??
          readNumericField(topProvider.contextLength))
        : undefined),
  );
}

function mapOpenRouterCatalogCandidates(
  payload: unknown,
): OpenRouterContextCandidate[] {
  const root = isJsonRecord(payload) ? payload : {};
  const rows = Array.isArray(root.data) ? root.data : [];
  const candidates: OpenRouterContextCandidate[] = [];

  for (const row of rows) {
    if (!isJsonRecord(row)) continue;

    const id =
      readStringField(row.id) ||
      readStringField(row.slug) ||
      readStringField(row.canonical_slug) ||
      readStringField(row.canonicalSlug);
    if (!id) continue;

    const contextLength = readOpenRouterCandidateContextLength(row);
    if (!contextLength) continue;

    candidates.push({
      id,
      canonicalSlug:
        readStringField(row.canonical_slug) ||
        readStringField(row.canonicalSlug),
      name: readStringField(row.name),
      contextLength,
    });
  }

  return candidates;
}

interface OpenRouterMatchScore {
  score: number;
  overlap: number;
  lengthDelta: number;
}

const OPENROUTER_CONTEXT_MATCH_MIN_SCORE = 1_200;

function scoreOpenRouterIdentifier(
  targetModelId: string,
  candidateIdentifier: string,
): OpenRouterMatchScore {
  const targetNormalized = normalizeModelId(targetModelId).replaceAll("_", "-");
  const candidateNormalized = normalizeModelId(candidateIdentifier).replaceAll(
    "_",
    "-",
  );
  const targetShort = stripProviderPrefix(targetNormalized);
  const candidateShort = stripProviderPrefix(candidateNormalized);

  const targetTokens = tokenizeModelIdentifier(targetNormalized);
  const candidateTokens = tokenizeModelIdentifier(candidateNormalized);
  const targetTokenSet = new Set(targetTokens);
  const overlap = candidateTokens.reduce((count, token) => {
    return targetTokenSet.has(token) ? count + 1 : count;
  }, 0);

  let score = 0;

  if (candidateNormalized === targetNormalized) {
    score += 10_000;
  }
  if (
    candidateShort === targetShort ||
    candidateNormalized === targetShort ||
    candidateShort === targetNormalized
  ) {
    score += 8_500;
  }
  if (
    candidateNormalized.startsWith(targetNormalized) ||
    targetNormalized.startsWith(candidateNormalized)
  ) {
    score += 2_800;
  }
  if (
    candidateShort.startsWith(targetShort) ||
    targetShort.startsWith(candidateShort)
  ) {
    score += 2_400;
  }
  if (
    candidateNormalized.includes(targetNormalized) ||
    targetNormalized.includes(candidateNormalized)
  ) {
    score += 1_200;
  }
  if (
    candidateShort.includes(targetShort) ||
    targetShort.includes(candidateShort)
  ) {
    score += 900;
  }

  if (targetTokens.length > 0 && candidateTokens.length > 0) {
    score += overlap * 200;
    score += Math.round((overlap / targetTokens.length) * 1_000);
    score += Math.round((overlap / candidateTokens.length) * 400);
  }

  const targetPrefix = modelPrefix(targetNormalized);
  const candidatePrefix = modelPrefix(candidateNormalized);
  if (targetPrefix && candidatePrefix) {
    score += targetPrefix === candidatePrefix ? 150 : -150;
  }

  return {
    score,
    overlap,
    lengthDelta: Math.abs(candidateShort.length - targetShort.length),
  };
}

function findBestOpenRouterContextCandidate(
  modelId: string,
  candidates: OpenRouterContextCandidate[],
): OpenRouterContextCandidate | undefined {
  const target = modelId.trim();
  if (!target || candidates.length === 0) {
    return undefined;
  }

  const ranked = candidates
    .map((candidate) => {
      const idScore = scoreOpenRouterIdentifier(target, candidate.id);
      const canonicalScore = candidate.canonicalSlug
        ? scoreOpenRouterIdentifier(target, candidate.canonicalSlug)
        : null;
      const nameScore = candidate.name
        ? scoreOpenRouterIdentifier(target, candidate.name)
        : null;

      const scores = [idScore, canonicalScore, nameScore].filter(
        (item): item is OpenRouterMatchScore => item !== null,
      );
      scores.sort((a, b) => b.score - a.score);
      const bestScore = scores[0];

      return { candidate, score: bestScore };
    })
    .filter((item) => item.score.score >= OPENROUTER_CONTEXT_MATCH_MIN_SCORE);

  ranked.sort((a, b) => {
    if (b.score.score !== a.score.score) {
      return b.score.score - a.score.score;
    }
    if (b.score.overlap !== a.score.overlap) {
      return b.score.overlap - a.score.overlap;
    }
    if (a.score.lengthDelta !== b.score.lengthDelta) {
      return a.score.lengthDelta - b.score.lengthDelta;
    }
    return a.candidate.id.localeCompare(b.candidate.id);
  });

  return ranked[0]?.candidate;
}

export function resolveModelContextLengthFromModelInfos(
  modelId: string,
  models: ModelInfo[] | undefined,
): number | undefined {
  const target = modelId?.trim();
  if (!target || !Array.isArray(models) || models.length === 0) {
    return undefined;
  }

  const candidates: OpenRouterContextCandidate[] = [];
  for (const model of models) {
    if (!model?.id || typeof model.id !== "string") {
      continue;
    }
    const contextLength = sanitizePositiveContextWindow(model.contextLength);
    if (!contextLength) {
      continue;
    }
    candidates.push({
      id: model.id,
      name: model.name,
      contextLength,
    });
  }

  if (candidates.length === 0) {
    return undefined;
  }

  return findBestOpenRouterContextCandidate(target, candidates)?.contextLength;
}

export function resolveOpenRouterContextLengthFromModelInfos(
  modelId: string,
  models: ModelInfo[] | undefined,
): number | undefined {
  return resolveModelContextLengthFromModelInfos(modelId, models);
}

function resolveOpenRouterLookupApiKey(
  params: ResolveModelContextWindowTokensWithLookupParams,
): string | undefined {
  if (
    params.providerProtocol === "openrouter" &&
    typeof params.providerApiKey === "string" &&
    params.providerApiKey.trim().length > 0
  ) {
    return params.providerApiKey.trim();
  }

  const instances = params.settings?.providers?.instances;
  if (!Array.isArray(instances)) {
    return undefined;
  }

  const openRouterInstance = instances.find(
    (instance) =>
      instance?.protocol === "openrouter" &&
      typeof instance.apiKey === "string" &&
      instance.apiKey.trim().length > 0,
  );
  return openRouterInstance?.apiKey?.trim();
}

function getOpenRouterRemoteCacheKey(apiKey: string | undefined): string {
  return apiKey?.trim() || "";
}

async function loadOpenRouterRemoteCandidates(
  apiKey: string | undefined,
): Promise<OpenRouterContextCandidate[]> {
  const cacheKey = getOpenRouterRemoteCacheKey(apiKey);
  if (!cacheKey || typeof fetch !== "function") {
    return [];
  }

  const cached = openRouterRemoteCatalogCache.get(cacheKey);
  if (
    cached &&
    Date.now() - cached.timestamp < OPENROUTER_MODELS_CACHE_TTL_MS
  ) {
    return cached.candidates;
  }

  const inFlight = openRouterRemoteCatalogInFlight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const requestPromise = (async (): Promise<OpenRouterContextCandidate[]> => {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${cacheKey}`,
      };
      if (typeof window !== "undefined" && window.location?.origin) {
        headers["HTTP-Referer"] = window.location.origin;
      }
      headers["X-Title"] = "CoI Game";

      const response = await fetch(OPENROUTER_MODELS_API_URL, {
        method: "GET",
        headers,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const candidates = mapOpenRouterCatalogCandidates(payload);
      if (candidates.length > 0) {
        openRouterRemoteCatalogCache.set(cacheKey, {
          timestamp: Date.now(),
          candidates,
        });
      }
      return candidates;
    } catch (error) {
      console.warn(
        "[ContextWindow] Failed to load OpenRouter /v1/models:",
        error,
      );
      return [];
    } finally {
      openRouterRemoteCatalogInFlight.delete(cacheKey);
    }
  })();

  openRouterRemoteCatalogInFlight.set(cacheKey, requestPromise);
  return requestPromise;
}

async function loadOpenRouterStaticCandidates(): Promise<
  OpenRouterContextCandidate[]
> {
  if (openRouterStaticCatalogCache) {
    return openRouterStaticCatalogCache;
  }
  if (openRouterStaticCatalogInFlight) {
    return openRouterStaticCatalogInFlight;
  }
  if (typeof fetch !== "function") {
    return [];
  }

  openRouterStaticCatalogInFlight = (async (): Promise<
    OpenRouterContextCandidate[]
  > => {
    try {
      const response = await fetch(OPENROUTER_STATIC_MODELS_URL);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const candidates = mapOpenRouterCatalogCandidates(payload);
      openRouterStaticCatalogCache = candidates;
      return candidates;
    } catch (error) {
      console.warn(
        "[ContextWindow] Failed to load static OpenRouter model catalog:",
        error,
      );
      openRouterStaticCatalogCache = [];
      return [];
    } finally {
      openRouterStaticCatalogInFlight = null;
    }
  })();

  return openRouterStaticCatalogInFlight;
}

interface ResolveOpenRouterCatalogContextWindowParams {
  modelId: string;
  apiKey?: string;
}

export async function resolveOpenRouterCatalogContextWindow(
  params: ResolveOpenRouterCatalogContextWindowParams,
): Promise<number | undefined> {
  const targetModelId = params.modelId?.trim();
  if (!targetModelId) {
    return undefined;
  }

  const remoteCandidates = await loadOpenRouterRemoteCandidates(params.apiKey);
  const remoteMatch = findBestOpenRouterContextCandidate(
    targetModelId,
    remoteCandidates,
  );
  if (remoteMatch) {
    return remoteMatch.contextLength;
  }

  const staticCandidates = await loadOpenRouterStaticCandidates();
  const staticMatch = findBestOpenRouterContextCandidate(
    targetModelId,
    staticCandidates,
  );
  return staticMatch?.contextLength;
}

export function buildModelContextWindowKey(
  providerId: string,
  modelId: string,
): string {
  const provider = providerId?.trim();
  const model = modelId?.trim();
  if (!provider || !model) {
    return "";
  }
  return `${provider}::${normalizeModelId(model)}`;
}

export function getPerModelContextWindowOverride(
  settings: AISettings,
  providerId: string,
  modelId: string,
): number | undefined {
  const key = buildModelContextWindowKey(providerId, modelId);
  if (!key) {
    return undefined;
  }
  return sanitizePositiveContextWindow(settings.modelContextWindows?.[key]);
}

export function getLearnedModelContextWindow(
  settings: AISettings,
  providerId: string,
  modelId: string,
): number | undefined {
  const key = buildModelContextWindowKey(providerId, modelId);
  if (!key) {
    return undefined;
  }
  return sanitizePositiveContextWindow(
    settings.learnedModelContextWindows?.[key],
  );
}

export function upsertPerModelContextWindowOverride(
  source: Record<string, number> | undefined,
  providerId: string,
  modelId: string,
  contextWindow: number | undefined,
): Record<string, number> {
  const next: Record<string, number> = { ...(source || {}) };
  const key = buildModelContextWindowKey(providerId, modelId);
  if (!key) {
    return next;
  }

  const normalized = sanitizePositiveContextWindow(contextWindow);
  if (normalized) {
    next[key] = normalized;
  } else {
    delete next[key];
  }

  return next;
}

export function upsertLearnedModelContextWindow(
  source: Record<string, number> | undefined,
  providerId: string,
  modelId: string,
  contextWindow: number | undefined,
  maxContextWindow?: number,
): Record<string, number> {
  const next: Record<string, number> = { ...(source || {}) };
  const key = buildModelContextWindowKey(providerId, modelId);
  if (!key) {
    return next;
  }

  const normalized = sanitizePositiveContextWindow(contextWindow);
  if (!normalized) {
    return next;
  }

  const upperBound = sanitizePositiveContextWindow(maxContextWindow);
  const bounded = upperBound ? Math.min(normalized, upperBound) : normalized;

  const existing = sanitizePositiveContextWindow(next[key]);
  next[key] = existing ? Math.min(existing, bounded) : bounded;
  return next;
}

export function getDefaultModelContextWindow(
  providerProtocol: ProviderProtocol | undefined,
  modelId: string,
): number | undefined {
  const model = modelId?.trim();
  if (!providerProtocol || !model) {
    return undefined;
  }

  const normalizedModel = normalizeModelId(model);
  const direct = CONTEXT_WINDOW_BY_MODEL.get(
    `${providerProtocol}/${normalizedModel}`,
  );
  if (direct) {
    return direct;
  }

  const rule = MODEL_CONTEXT_WINDOW_RULES.find(
    (item) =>
      item.providerProtocol === providerProtocol &&
      item.pattern.test(normalizedModel),
  );
  if (rule?.contextWindow) {
    return rule.contextWindow;
  }

  if (providerProtocol === "openrouter") {
    return resolveOpenRouterUpstreamContextWindow(normalizedModel);
  }

  return undefined;
}

export function applyDefaultContextWindowsToModels(
  providerProtocol: ProviderProtocol,
  models: ModelInfo[],
): ModelInfo[] {
  return models.map((model) => {
    const current = sanitizePositiveContextWindow(model.contextLength);
    if (current) {
      return model;
    }

    const fallback = getDefaultModelContextWindow(providerProtocol, model.id);
    if (!fallback) {
      return model;
    }

    return {
      ...model,
      contextLength: fallback,
    };
  });
}

export type ContextWindowSource =
  | "settings.modelContextWindows"
  | "settings.learnedModelContextWindows"
  | "provider.modelMetadata"
  | "defaults.modelMap"
  | "fallback.default";

export interface ContextOverflowDiagnostics {
  requestedTokens?: number;
  limitTokens?: number;
}

function parseTokenNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const normalized = raw.replace(/[,_\s]/g, "");
  if (!/^\d+$/.test(normalized)) {
    return undefined;
  }
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function extractFirstTokenNumber(
  message: string,
  patterns: RegExp[],
): number | undefined {
  for (const pattern of patterns) {
    const matched = message.match(pattern);
    const parsed = parseTokenNumber(matched?.[1]);
    if (parsed) {
      return parsed;
    }
  }
  return undefined;
}

const REQUESTED_TOKEN_PATTERNS = [
  /requested\s+(\d[\d,._\s]*)\s+tokens?/i,
  /resulted in\s+(\d[\d,._\s]*)\s+tokens?/i,
  /prompt(?:\s+tokens?)?\s*[:=]\s*(\d[\d,._\s]*)/i,
  /input(?:\s+tokens?)?\s*[:=]\s*(\d[\d,._\s]*)/i,
  /(\d[\d,._\s]*)\s*tokens?\s*(?:in|for)\s*(?:messages|prompt|input)/i,
];

const LIMIT_TOKEN_PATTERNS = [
  /maximum context length is\s+(\d[\d,._\s]*)\s+tokens?/i,
  /context(?:\s+window|\s+length|\s+limit)[^\d]{0,24}(\d[\d,._\s]*)/i,
  /max(?:imum)?\s*(?:input|prompt)?\s*tokens?[^\d]{0,16}(\d[\d,._\s]*)/i,
  /limit(?:ed)?\s+to\s+(\d[\d,._\s]*)\s+tokens?/i,
];

export function parseContextOverflowDiagnostics(
  error: unknown,
): ContextOverflowDiagnostics {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error || "");

  const requestedFromComparison = (() => {
    const compared = message.match(
      /(\d[\d,._\s]*)\s*(?:tokens?)?\s*>\s*(\d[\d,._\s]*)\s*(?:tokens?|maximum|max|limit)/i,
    );
    return parseTokenNumber(compared?.[1]);
  })();

  const limitFromComparison = (() => {
    const compared = message.match(
      /(\d[\d,._\s]*)\s*(?:tokens?)?\s*>\s*(\d[\d,._\s]*)\s*(?:tokens?|maximum|max|limit)/i,
    );
    return parseTokenNumber(compared?.[2]);
  })();

  const requestedTokens =
    requestedFromComparison ||
    extractFirstTokenNumber(message, REQUESTED_TOKEN_PATTERNS);
  const limitTokens =
    limitFromComparison ||
    extractFirstTokenNumber(message, LIMIT_TOKEN_PATTERNS);

  return {
    requestedTokens,
    limitTokens,
  };
}

export function deriveLearnedContextWindowFromOverflow(
  diagnostics: ContextOverflowDiagnostics,
): number | undefined {
  const { requestedTokens, limitTokens } = diagnostics;
  const safetyWithLimit = 0.9;
  const safetyRequestOnly = 0.85;

  if (requestedTokens && limitTokens) {
    return sanitizePositiveContextWindow(
      Math.floor(Math.min(requestedTokens, limitTokens) * safetyWithLimit),
    );
  }

  if (limitTokens) {
    return sanitizePositiveContextWindow(
      Math.floor(limitTokens * safetyWithLimit),
    );
  }

  if (requestedTokens) {
    return sanitizePositiveContextWindow(
      Math.floor(requestedTokens * safetyRequestOnly),
    );
  }

  return undefined;
}

export const LEARNED_CONTEXT_RELAX_SUCCESS_STREAK = 3;
export const LEARNED_CONTEXT_RELAX_FACTOR = 1.02;
export const LEARNED_CONTEXT_RELAX_CAP_RATIO = 0.95;

export interface RelaxLearnedContextWindowResult {
  nextLearned: number;
  nextSuccessStreak: number;
  relaxed: boolean;
}

export function relaxLearnedContextWindowOnSuccess(params: {
  currentLearned: number;
  successStreak: number;
  providerProtocol?: ProviderProtocol;
  modelId: string;
  fallback: number;
}): RelaxLearnedContextWindowResult {
  const current = sanitizePositiveContextWindow(params.currentLearned);
  if (!current) {
    return {
      nextLearned: 0,
      nextSuccessStreak: 0,
      relaxed: false,
    };
  }

  const baseUpperBoundRaw =
    getDefaultModelContextWindow(params.providerProtocol, params.modelId) ||
    params.fallback;
  const baseUpperBound =
    sanitizePositiveContextWindow(baseUpperBoundRaw) || current;
  const relaxUpperBound =
    sanitizePositiveContextWindow(
      Math.floor(baseUpperBound * LEARNED_CONTEXT_RELAX_CAP_RATIO),
    ) || baseUpperBound;
  const boundedCurrent = Math.min(current, relaxUpperBound);

  const nextSuccess = Math.max(0, params.successStreak) + 1;
  if (nextSuccess < LEARNED_CONTEXT_RELAX_SUCCESS_STREAK) {
    return {
      nextLearned: boundedCurrent,
      nextSuccessStreak: boundedCurrent < current ? 0 : nextSuccess,
      relaxed: false,
    };
  }

  const relaxedCandidate = sanitizePositiveContextWindow(
    Math.floor(boundedCurrent * LEARNED_CONTEXT_RELAX_FACTOR),
  );
  const nextLearned = relaxedCandidate
    ? Math.min(relaxedCandidate, relaxUpperBound)
    : boundedCurrent;

  return {
    nextLearned,
    nextSuccessStreak:
      nextLearned > boundedCurrent ? 0 : LEARNED_CONTEXT_RELAX_SUCCESS_STREAK,
    relaxed: nextLearned > boundedCurrent,
  };
}

export interface ResolveContextWindowResult {
  value: number;
  source: ContextWindowSource;
}

export interface ResolveContextWindowUpperBoundParams {
  settings: AISettings;
  providerId: string;
  providerProtocol?: ProviderProtocol;
  modelId: string;
  providerReportedContextLength?: number;
  fallback: number;
}

export function resolveModelContextWindowUpperBound(
  params: ResolveContextWindowUpperBoundParams,
): number {
  const {
    settings,
    providerId,
    providerProtocol,
    modelId,
    providerReportedContextLength,
    fallback,
  } = params;

  const override = getPerModelContextWindowOverride(
    settings,
    providerId,
    modelId,
  );
  if (override) {
    return override;
  }

  const providerValue = sanitizePositiveContextWindow(
    providerReportedContextLength,
  );
  if (providerValue) {
    return providerValue;
  }

  const mappedDefault = getDefaultModelContextWindow(providerProtocol, modelId);
  if (mappedDefault) {
    return mappedDefault;
  }

  return (
    sanitizePositiveContextWindow(fallback) ||
    DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS
  );
}

export function resolveModelContextWindowTokens(params: {
  settings: AISettings;
  providerId: string;
  providerProtocol?: ProviderProtocol;
  modelId: string;
  providerReportedContextLength?: number;
  fallback: number;
}): ResolveContextWindowResult {
  const {
    settings,
    providerId,
    providerProtocol,
    modelId,
    providerReportedContextLength,
  } = params;

  const upperBound = resolveModelContextWindowUpperBound(params);

  const override = getPerModelContextWindowOverride(
    settings,
    providerId,
    modelId,
  );
  if (override) {
    return {
      value: override,
      source: "settings.modelContextWindows",
    };
  }

  const learned = getLearnedModelContextWindow(settings, providerId, modelId);
  if (learned) {
    return {
      value: Math.min(learned, upperBound),
      source: "settings.learnedModelContextWindows",
    };
  }

  const providerValue = sanitizePositiveContextWindow(
    providerReportedContextLength,
  );
  if (providerValue) {
    return {
      value: providerValue,
      source: "provider.modelMetadata",
    };
  }

  const mappedDefault = getDefaultModelContextWindow(providerProtocol, modelId);
  if (mappedDefault) {
    return {
      value: mappedDefault,
      source: "defaults.modelMap",
    };
  }

  return {
    value: upperBound,
    source: "fallback.default",
  };
}

export interface ResolveModelContextWindowTokensWithLookupParams {
  settings: AISettings;
  providerId: string;
  providerProtocol?: ProviderProtocol;
  modelId: string;
  providerReportedContextLength?: number;
  providerApiKey?: string;
  fallback: number;
}

export async function resolveModelContextWindowTokensWithLookup(
  params: ResolveModelContextWindowTokensWithLookupParams,
): Promise<ResolveContextWindowResult> {
  const override = getPerModelContextWindowOverride(
    params.settings,
    params.providerId,
    params.modelId,
  );
  if (override) {
    return {
      value: override,
      source: "settings.modelContextWindows",
    };
  }

  const providerValue = sanitizePositiveContextWindow(
    params.providerReportedContextLength,
  );

  let openRouterCatalogValue: number | undefined;
  if (!providerValue) {
    openRouterCatalogValue = await resolveOpenRouterCatalogContextWindow({
      modelId: params.modelId,
      apiKey: resolveOpenRouterLookupApiKey(params),
    });
  }

  return resolveModelContextWindowTokens({
    settings: params.settings,
    providerId: params.providerId,
    providerProtocol: params.providerProtocol,
    modelId: params.modelId,
    providerReportedContextLength: providerValue ?? openRouterCatalogValue,
    fallback: params.fallback,
  });
}

export function __resetOpenRouterContextLookupCacheForTests(): void {
  openRouterRemoteCatalogCache.clear();
  openRouterRemoteCatalogInFlight.clear();
  openRouterStaticCatalogCache = null;
  openRouterStaticCatalogInFlight = null;
}

export function getCopyableModelContextWindowDefaults(): Record<
  string,
  number
> {
  return MODEL_CONTEXT_WINDOW_DEFAULTS.reduce<Record<string, number>>(
    (acc, item) => {
      acc[`${item.providerProtocol}/${item.modelId}`] = item.contextWindow;
      return acc;
    },
    {},
  );
}

export function getModelContextWindowDefaultsMeta(): {
  snapshotDate: string;
  entries: number;
} {
  return {
    snapshotDate: MODEL_CONTEXT_WINDOWS_SNAPSHOT_DATE,
    entries: MODEL_CONTEXT_WINDOW_DEFAULTS.length,
  };
}
