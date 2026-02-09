import { describe, expect, it } from "vitest";
import { parseModelCapabilities } from "./modelUtils";

describe("parseModelCapabilities", () => {
  it("parses modalities from architecture.modality", () => {
    const result = parseModelCapabilities({
      architecture: {
        modality: "->text ->image ->audio ->video",
      },
    });

    expect(result).toMatchObject({
      text: true,
      image: true,
      audio: true,
      video: true,
    });
  });

  it("parses output_modalities fallback", () => {
    const result = parseModelCapabilities({
      architecture: {
        output_modalities: ["text", "image"],
      },
    });

    expect(result.text).toBe(true);
    expect(result.image).toBe(true);
  });

  it("infers tool support from description/name/context", () => {
    const byDesc = parseModelCapabilities({
      description: "supports function calling and tools",
    });
    const byCtx = parseModelCapabilities({ context_length: 5000 });

    expect(byDesc.tools).toBe(true);
    expect(byCtx.tools).toBe(true);
  });

  it("applies explicit tool flags and parallel tools", () => {
    const result = parseModelCapabilities({
      supports_tools: true,
      supports_parallel_function_calling: true,
    });

    expect(result.tools).toBe(true);
    expect(result.parallelTools).toBe(true);
  });

  it("detects tools via supported_parameters", () => {
    const result = parseModelCapabilities({
      supported_parameters: ["tool_choice"],
    });

    expect(result.tools).toBe(true);
  });
});
