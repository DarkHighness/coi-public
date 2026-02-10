import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getOutlineSystemInstruction } from "../../storyOutline";
import {
  clearPromptTraceRegistry,
  getLatestPromptTrace,
  setPromptTraceEnabled,
} from "../runtime";
import { validatePromptTrace } from "../policy";
const loadGraph = () =>
  JSON.parse(
    fs.readFileSync(
      path.resolve(process.cwd(), "src/services/prompts/trace/generated/prompt-atom-graph.json"),
      "utf8",
    ),
  );


describe("prompt trace coverage - outline", () => {
  afterEach(() => {
    clearPromptTraceRegistry();
    setPromptTraceEnabled(false);
  });

  it("covers required atoms in outline.system", () => {
    setPromptTraceEnabled(true);

    const prompt = getOutlineSystemInstruction({
      language: "en",
      isRestricted: false,
      narrativeStyle: "Standard",
    });

    expect(prompt.length).toBeGreaterThan(0);

    const trace = getLatestPromptTrace("outline.system");
    expect(trace).toBeDefined();

    const result = validatePromptTrace(
      "outline.system",
      trace!,
      loadGraph() as any,
    );
    expect(result.ok).toBe(true);
  });
});
