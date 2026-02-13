import type { ModelInfo, ProviderProtocol } from "../../../types";
import type { ProviderModelCapabilities } from "./interfaces";

const DEFAULTS_BY_PROTOCOL: Record<
  ProviderProtocol,
  ProviderModelCapabilities
> = {
  gemini: {
    supportsTools: true,
    supportsParallelTools: true,
    supportsImage: true,
    supportsVideo: true,
    supportsAudio: true,
    supportsEmbedding: true,
  },
  openai: {
    supportsTools: true,
    supportsParallelTools: true,
    supportsImage: true,
    supportsVideo: false,
    supportsAudio: true,
    supportsEmbedding: true,
  },
  openrouter: {
    supportsTools: true,
    supportsParallelTools: true,
    supportsImage: true,
    supportsVideo: false,
    supportsAudio: true,
    supportsEmbedding: true,
  },
  claude: {
    supportsTools: true,
    supportsParallelTools: true,
    supportsImage: false,
    supportsVideo: false,
    supportsAudio: false,
    supportsEmbedding: false,
  },
};

export function modelInfoToCapabilities(
  protocol: ProviderProtocol,
  modelInfo: ModelInfo | undefined,
): ProviderModelCapabilities {
  const fallback = DEFAULTS_BY_PROTOCOL[protocol];
  const caps = modelInfo?.capabilities;

  return {
    supportsTools: caps?.tools ?? fallback.supportsTools,
    supportsParallelTools:
      caps?.parallelTools ?? fallback.supportsParallelTools,
    supportsImage: caps?.image ?? fallback.supportsImage,
    supportsVideo: caps?.video ?? fallback.supportsVideo,
    supportsAudio: caps?.audio ?? fallback.supportsAudio,
    supportsEmbedding: true, // vendor models list generally doesn't contain embedding, handled by protocol default capabilities
  };
}
