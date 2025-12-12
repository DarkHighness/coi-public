import type { ModelInfo, ProviderProtocol } from "../../../types";
import type { ModelCapabilities } from "../sessionStorage";

const DEFAULTS_BY_PROTOCOL: Record<ProviderProtocol, Omit<ModelCapabilities, "supportsRequiredToolChoice">> = {
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
): Omit<ModelCapabilities, "supportsRequiredToolChoice"> {
  const fallback = DEFAULTS_BY_PROTOCOL[protocol];
  const caps = modelInfo?.capabilities;

  return {
    supportsTools: caps?.tools ?? fallback.supportsTools,
    supportsParallelTools: caps?.parallelTools ?? fallback.supportsParallelTools,
    supportsImage: caps?.image ?? fallback.supportsImage,
    supportsVideo: caps?.video ?? fallback.supportsVideo,
    supportsAudio: caps?.audio ?? fallback.supportsAudio,
    supportsEmbedding: true, // vendor models 列表一般不含 embedding，按 protocol 默认能力处理
  };
}
