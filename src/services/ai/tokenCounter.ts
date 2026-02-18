import type { AISettings } from "../../types";
import { estimateTokensForMixedText } from "./contextUsage";
import { createProviderConfig, getProviderInstance } from "./provider/registry";
import type { ClaudeConfig, GeminiConfig } from "../providers/types";
import { countTokens as countClaudeTokens } from "../providers/claudeProvider";
import { countTokens as countGeminiTokens } from "../providers/geminiProvider";

export type TokenCountSource = "provider_count_tokens" | "local_estimate";

export interface TokenCountResult {
  tokens: number;
  source: TokenCountSource;
  fallbackReason?: string;
}

export interface ReadTokenCounter {
  usesProviderCountTokens: boolean;
  count(content: string): TokenCountResult | Promise<TokenCountResult>;
}

export interface CreateReadTokenCounterParams {
  settings: AISettings | undefined;
  calibrationFactor: number;
}

type RemoteCountTarget =
  | {
      protocol: "gemini";
      modelId: string;
      config: GeminiConfig;
    }
  | {
      protocol: "claude";
      modelId: string;
      config: ClaudeConfig;
    };

const normalizeRemoteTokenCount = (value: number): number => {
  if (!Number.isFinite(value)) {
    throw new Error("Invalid provider token count response");
  }
  return Math.max(0, Math.floor(value));
};

const normalizeErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const resolveRemoteCountTarget = (
  settings: AISettings | undefined,
): RemoteCountTarget | null => {
  const providerId = settings?.story?.providerId;
  const modelId = settings?.story?.modelId?.trim();

  if (!providerId || !modelId) {
    return null;
  }

  const instance = getProviderInstance(settings, providerId, false);
  if (!instance) {
    return null;
  }

  if (!instance.apiKey || instance.apiKey.trim().length === 0) {
    return null;
  }

  const config = createProviderConfig(instance);

  if (instance.protocol === "gemini") {
    return {
      protocol: "gemini",
      modelId,
      config: config as GeminiConfig,
    };
  }

  if (instance.protocol === "claude") {
    return {
      protocol: "claude",
      modelId,
      config: config as ClaudeConfig,
    };
  }

  return null;
};

const createLocalEstimateResult = (
  content: string,
  calibrationFactor: number,
  fallbackReason?: string,
): TokenCountResult => ({
  tokens: estimateTokensForMixedText(content, { calibrationFactor }),
  source: "local_estimate",
  ...(fallbackReason ? { fallbackReason } : {}),
});

const countRemoteTokens = async (
  target: RemoteCountTarget,
  content: string,
): Promise<number> => {
  if (target.protocol === "gemini") {
    return countGeminiTokens(target.config, target.modelId, content);
  }
  return countClaudeTokens(target.config, target.modelId, content);
};

export const createReadTokenCounter = ({
  settings,
  calibrationFactor,
}: CreateReadTokenCounterParams): ReadTokenCounter => {
  const remoteTarget = resolveRemoteCountTarget(settings);

  if (!remoteTarget) {
    return {
      usesProviderCountTokens: false,
      count: (content: string): TokenCountResult =>
        createLocalEstimateResult(content, calibrationFactor),
    };
  }

  return {
    usesProviderCountTokens: true,
    count: async (content: string): Promise<TokenCountResult> => {
      let lastError: unknown;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const remoteTokens = await countRemoteTokens(remoteTarget, content);
          return {
            tokens: normalizeRemoteTokenCount(remoteTokens),
            source: "provider_count_tokens",
          };
        } catch (error) {
          lastError = error;
        }
      }

      return createLocalEstimateResult(
        content,
        calibrationFactor,
        normalizeErrorMessage(lastError),
      );
    },
  };
};
