import type { PromptAtomGraph } from "./types";

export function getAtomGraphNodeMap(
  graph: PromptAtomGraph,
): Map<string, string[]> {
  return new Map(
    graph.atomNodes.map((node) => [node.atomId, node.directDependencies]),
  );
}

export function collectTransitiveAtomDependencies(
  graph: PromptAtomGraph,
  atomIds: string[],
): string[] {
  const nodeMap = getAtomGraphNodeMap(graph);
  const visited = new Set<string>();
  const stack = [...atomIds];

  while (stack.length > 0) {
    const next = stack.pop();
    if (!next || visited.has(next)) continue;
    visited.add(next);

    const deps = nodeMap.get(next) || [];
    for (const dep of deps) {
      if (!visited.has(dep)) {
        stack.push(dep);
      }
    }
  }

  return [...visited].sort();
}

export function getPromptEntryAtoms(
  graph: PromptAtomGraph,
  promptId: string,
): { direct: string[]; transitive: string[] } {
  const entry = graph.promptEntries.find((item) => item.promptId === promptId);
  if (!entry) {
    return { direct: [], transitive: [] };
  }

  return {
    direct: [...entry.directAtoms],
    transitive: [...entry.transitiveAtoms],
  };
}
