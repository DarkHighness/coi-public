import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { PromptTrace } from "../types";
import { getRequiredAtomsForPrompt, validatePromptTrace } from "../policy";

function makeTrace(promptId: string, atomIds: string[]): PromptTrace {
  const now = Date.now();
  return {
    promptId,
    startedAt: now,
    endedAt: now,
    totalChars: 1024,
    sections: [],
    atoms: atomIds.map((atomId, index) => ({
      id: `${atomId}:${index + 1}`,
      atomId,
      source: "tests/policy",
      exportName: `atom_${index}`,
      kind: "atom",
      argsHash: "00000000",
      outputChars: 128,
      included: true,
      startedAt: now,
      endedAt: now,
    })),
  };
}
const loadGraph = () =>
  JSON.parse(
    fs.readFileSync(
      path.resolve(
        process.cwd(),
        "src/services/prompts/trace/generated/prompt-atom-graph.json",
      ),
      "utf8",
    ),
  );

describe("prompt trace policy guard", () => {
  it("passes when all required atoms are present in runtime and static graph", () => {
    const required = getRequiredAtomsForPrompt("turn.system");
    const trace = makeTrace("turn.system", required);

    const result = validatePromptTrace(
      "turn.system",
      trace,
      loadGraph() as any,
    );
    expect(result.ok).toBe(true);
    expect(result.missingRequiredAtoms).toHaveLength(0);
  });

  it("fails when required runtime atoms are missing", () => {
    const trace = makeTrace("turn.system", []);
    const result = validatePromptTrace(
      "turn.system",
      trace,
      loadGraph() as any,
    );

    expect(result.ok).toBe(false);
    expect((result.missingRuntimeAtoms || []).length).toBeGreaterThan(0);
  });

  it("fails static check when prompt entry has no required atoms", () => {
    const required = getRequiredAtomsForPrompt("turn.system");
    const trace = makeTrace("turn.system", required);

    const brokenGraph = {
      ...(loadGraph() as any),
      promptEntries: [
        {
          promptId: "turn.system",
          filePath: "tests",
          exportName: "fake",
          directAtoms: [],
          transitiveAtoms: [],
        },
      ],
    };

    const result = validatePromptTrace(
      "turn.system",
      trace,
      brokenGraph as any,
    );
    expect(result.ok).toBe(false);
    expect((result.missingStaticAtoms || []).length).toBeGreaterThan(0);
  });
});
