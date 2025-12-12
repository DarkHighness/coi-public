import type { ProviderProtocol } from "../../../types";
import type { ProviderCacheHint } from "../sessionStorage";

function djb2Hash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  // force unsigned 32-bit
  return (hash >>> 0).toString(16);
}

export function buildCacheHint(
  protocol: ProviderProtocol,
  systemInstruction: string,
  staticMessages: unknown[],
): ProviderCacheHint {
  const material = JSON.stringify({
    systemInstruction,
    staticMessages,
  });
  const key = djb2Hash(material);

  switch (protocol) {
    case "gemini":
      // 这里的 cachedContentName 目前仅作为 hint 标识符。
      // 如果未来接入 @google/genai 的 cached content API，可用它作为 key 映射。
      return { protocol: "gemini", cachedContentName: `coi:${key}` };
    case "openai":
      return { protocol: "openai", cacheKey: `coi:${key}` };
    case "openrouter":
      return { protocol: "openrouter", cacheKey: `coi:${key}` };
    case "claude":
      return { protocol: "claude", cacheKey: `coi:${key}` };
    default:
      return { protocol: "openai", cacheKey: `coi:${key}` };
  }
}
