import { describe, expect, it } from "vitest";
import { modelInfoToCapabilities } from "../modelCapabilities";

describe("modelInfoToCapabilities", () => {
  it("falls back to protocol defaults when modelInfo is missing", () => {
    expect(modelInfoToCapabilities("gemini", undefined)).toMatchObject({
      supportsTools: true,
      supportsParallelTools: true,
      supportsImage: true,
      supportsVideo: true,
      supportsAudio: true,
      supportsEmbedding: true,
    });

    expect(modelInfoToCapabilities("claude", undefined)).toMatchObject({
      supportsTools: true,
      supportsParallelTools: true,
      supportsImage: false,
      supportsVideo: false,
      supportsAudio: false,
      supportsEmbedding: true,
    });
  });

  it("prefers model capabilities over protocol defaults", () => {
    const caps = modelInfoToCapabilities("openai", {
      id: "custom-model",
      name: "Custom",
      capabilities: {
        text: true,
        tools: false,
        parallelTools: false,
        image: false,
        video: true,
        audio: false,
      },
    } as any);

    expect(caps).toEqual({
      supportsTools: false,
      supportsParallelTools: false,
      supportsImage: false,
      supportsVideo: true,
      supportsAudio: false,
      supportsEmbedding: true,
    });
  });
});
