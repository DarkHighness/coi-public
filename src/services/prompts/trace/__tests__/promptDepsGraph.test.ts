import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getPromptEntryAtoms } from "../graph";
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

describe("prompt atom dependency graph", () => {
  it("captures technologySkill -> technology via trace.record", () => {
    const graph = loadGraph() as any;
    const node = graph.atomNodes.find(
      (item: any) =>
        item.atomId === "atoms/worldbuilding/technology#technologySkill",
    );

    expect(node).toBeDefined();
    expect(node.directDependencies).toContain(
      "atoms/worldbuilding/technology#technology",
    );
  });

  it("exposes turn.system direct and transitive atoms", () => {
    const graph = loadGraph() as any;
    const entry = getPromptEntryAtoms(graph, "turn.system");

    expect(entry.direct.length).toBeGreaterThan(0);
    expect(entry.transitive.length).toBeGreaterThan(0);
    expect(entry.transitive).toContain(
      "atoms/core/hiddenLayerQuality#hiddenLayerQualityDescription",
    );
  });
});
