import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type PromptEntryGraphNode = {
  promptId: string;
  filePath: string;
  exportName: string;
  directAtoms: string[];
  transitiveAtoms: string[];
};

type PromptAtomGraph = {
  generatedAt: string;
  promptEntries: PromptEntryGraphNode[];
};

type LoopCatalogItem = {
  id: string;
  title: string;
  directory: string;
};

type LoopCatalog = {
  generatedAt: string;
  items: LoopCatalogItem[];
};

type SkillCatalogItem = {
  id: string;
  path: string;
  directory: string;
};

type SkillCatalog = {
  generatedAt: string;
  items: SkillCatalogItem[];
};

type LoopAtomsPayload = {
  promptIds: string[];
  atoms: Array<{
    atomId: string;
  }>;
};

type SkillAtomsPayload = {
  promptIds: string[];
  atoms: Array<{
    atomId: string;
  }>;
};

type SkillCoverageUsage = {
  promptId: string;
  composition?: "atom" | "hub" | "router";
};

type SkillCoverage = {
  generatedAt: string;
  usages?: SkillCoverageUsage[];
};

type PromptRecord = {
  promptId: string;
  definitionFile: string;
  definitionExport: string;
  atoms: string[];
  loopIds: string[];
  agentLoops: string[];
  referencedSkillPaths: string[];
};

type SkillPromptRecord = {
  promptId: string;
  mappingPath: string;
  skillPath: string;
  definition: string;
  composition: string;
  atoms: string[];
  loopIds: string[];
  agentLoops: string[];
};

const ROOT = process.cwd();
const OUTPUT_PATH = path.join(ROOT, "docs", "prompt-registry.md");

function readJson<T>(relativePath: string): T {
  const absolutePath = path.join(ROOT, relativePath);
  return JSON.parse(readFileSync(absolutePath, "utf8")) as T;
}

function readJsonLines(filePath: string): Array<Record<string, unknown>> {
  if (!existsSync(filePath)) return [];
  const lines = readFileSync(filePath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const records: Array<Record<string, unknown>> = [];
  for (const line of lines) {
    try {
      records.push(JSON.parse(line) as Record<string, unknown>);
    } catch {
      // Ignore malformed jsonl lines
    }
  }
  return records;
}

function addToSetMap(
  map: Map<string, Set<string>>,
  key: string,
  value: string,
): void {
  const set = map.get(key) ?? new Set<string>();
  set.add(value);
  map.set(key, set);
}

function setToSortedArray(set: Set<string> | undefined): string[] {
  if (!set || set.size === 0) return [];
  return [...set].sort((left, right) => left.localeCompare(right));
}

function dedupeSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function escapeMd(value: string): string {
  return value.replace(/\|/g, "\\|").trim();
}

function formatInlineList(values: string[], empty = "(none)"): string {
  if (values.length === 0) return empty;
  return values.map((item) => `\`${escapeMd(item)}\``).join(", ");
}

function formatInlineListWithBreak(values: string[], empty = "(none)"): string {
  if (values.length === 0) return empty;
  return values.map((item) => `\`${escapeMd(item)}\``).join("<br>");
}

function getSkillPathsFromText(text: string): string[] {
  const matches = text.match(/current\/skills\/[A-Za-z0-9/_-]+\/SKILL\.md/g);
  if (!matches) return [];
  return dedupeSorted(matches);
}

function toAgentLoopLabel(loopId: string): string {
  if (loopId === "turn") {
    return "turn loop (`src/services/ai/agentic/turn/adventure.ts`)";
  }
  if (loopId === "cleanup") {
    return "cleanup loop (`src/services/ai/agentic/cleanup/cleanup.ts`)";
  }
  if (loopId === "summary_query") {
    return "summary query loop (`src/services/ai/agentic/summary/summaryQueryLoop.ts`)";
  }
  if (loopId === "summary_compact") {
    return "summary compact loop (`src/services/ai/agentic/summary/summaryCompactLoop.ts`)";
  }
  if (loopId === "outline" || loopId.startsWith("outline_phase_")) {
    return "outline loop (`src/services/ai/agentic/outline/outline.ts`)";
  }
  return `unknown (${loopId})`;
}

function main(): void {
  const promptGraph = readJson<PromptAtomGraph>(
    "src/services/prompts/trace/generated/prompt-atom-graph.json",
  );
  const loopCatalog = readJson<LoopCatalog>("dist/debug/loops/catalog.json");
  const skillCatalog = readJson<SkillCatalog>("dist/debug/skills/catalog.json");
  const skillCoverage = readJson<SkillCoverage>(
    "src/services/prompts/trace/generated/skill-atom-coverage.json",
  );

  const loopsByPrompt = new Map<string, Set<string>>();
  const skillRefsByLoop = new Map<string, Set<string>>();
  const skillRefsByPrompt = new Map<string, Set<string>>();
  const loopsBySkillPath = new Map<string, Set<string>>();

  const loopPromptIdsByLoop = new Map<string, string[]>();

  for (const loop of loopCatalog.items) {
    const loopDir = path.join(ROOT, "dist/debug/loops", loop.directory);
    const atomsPath = path.join(loopDir, "atoms.json");
    const promptsPath = path.join(loopDir, "prompts.jsonl");

    const atomsPayload = readJson<LoopAtomsPayload>(
      path.relative(ROOT, atomsPath),
    );
    const promptIds = dedupeSorted(atomsPayload.promptIds ?? []);
    loopPromptIdsByLoop.set(loop.id, promptIds);

    for (const promptId of promptIds) {
      addToSetMap(loopsByPrompt, promptId, loop.id);
    }

    const jsonlRows = readJsonLines(promptsPath);
    const skillPaths = new Set<string>();
    for (const row of jsonlRows) {
      const text = typeof row.text === "string" ? row.text : "";
      for (const skillPath of getSkillPathsFromText(text)) {
        skillPaths.add(skillPath);
      }
    }
    skillRefsByLoop.set(loop.id, skillPaths);

    for (const skillPath of skillPaths) {
      addToSetMap(loopsBySkillPath, skillPath, loop.id);
    }

    for (const promptId of promptIds) {
      for (const skillPath of skillPaths) {
        addToSetMap(skillRefsByPrompt, promptId, skillPath);
      }
    }
  }

  const promptEntryById = new Map<string, PromptEntryGraphNode>();
  for (const entry of promptGraph.promptEntries) {
    promptEntryById.set(entry.promptId, entry);
  }

  const preludeAtomsByPrompt = new Map<string, string[]>();
  for (const loop of loopCatalog.items) {
    if (!loop.id.endsWith("_prelude")) continue;
    const atomsPath = path.join(
      ROOT,
      "dist/debug/loops",
      loop.directory,
      "atoms.json",
    );
    const atomsPayload = readJson<LoopAtomsPayload>(
      path.relative(ROOT, atomsPath),
    );
    const promptIds = dedupeSorted(atomsPayload.promptIds ?? []);
    if (promptIds.length !== 1) continue;
    const promptId = promptIds[0]!;
    preludeAtomsByPrompt.set(
      promptId,
      dedupeSorted((atomsPayload.atoms ?? []).map((atom) => atom.atomId)),
    );
  }

  const nonSkillPromptIds = dedupeSorted(
    [
      ...promptGraph.promptEntries
        .map((entry) => entry.promptId)
        .filter((promptId) => !promptId.startsWith("skills.")),
      ...[...loopsByPrompt.keys()].filter(
        (promptId) => !promptId.startsWith("skills."),
      ),
    ].filter((promptId) => !promptId.startsWith("test.")),
  );

  const nonSkillPromptRecords: PromptRecord[] = nonSkillPromptIds.map(
    (promptId) => {
      const graphEntry = promptEntryById.get(promptId);
      const loopIds = setToSortedArray(loopsByPrompt.get(promptId));
      const agentLoops = dedupeSorted(
        loopIds.map((loopId) => toAgentLoopLabel(loopId)),
      );
      const referencedSkillPaths = setToSortedArray(
        skillRefsByPrompt.get(promptId),
      );

      if (graphEntry) {
        return {
          promptId,
          definitionFile: graphEntry.filePath,
          definitionExport: graphEntry.exportName,
          atoms: dedupeSorted(graphEntry.transitiveAtoms ?? []),
          loopIds,
          agentLoops,
          referencedSkillPaths,
        };
      }

      const isOutlinePrelude = /^outline\.phase\d+\.prelude$/.test(promptId);
      return {
        promptId,
        definitionFile: isOutlinePrelude
          ? "src/services/prompts/storyOutline.ts"
          : "unknown",
        definitionExport: isOutlinePrelude
          ? "getOutlinePhasePreludePrompt"
          : "unknown",
        atoms: preludeAtomsByPrompt.get(promptId) ?? [],
        loopIds,
        agentLoops,
        referencedSkillPaths,
      };
    },
  );

  const compositionByPrompt = new Map<string, string>();
  for (const usage of skillCoverage.usages ?? []) {
    if (usage.promptId) {
      compositionByPrompt.set(usage.promptId, usage.composition ?? "unknown");
    }
  }

  const skillPromptRecords: SkillPromptRecord[] = [];
  for (const skill of skillCatalog.items) {
    const skillDir = path.join(ROOT, "dist/debug/skills", skill.directory);
    const atomsPath = path.join(skillDir, "atoms.json");
    const atomsPayload = existsSync(atomsPath)
      ? readJson<SkillAtomsPayload>(path.relative(ROOT, atomsPath))
      : { promptIds: [], atoms: [] };

    const promptId = atomsPayload.promptIds[0] || `skills.${skill.directory}`;
    const skillPath = skill.path;
    const loopIds = setToSortedArray(loopsBySkillPath.get(skillPath));
    const agentLoops = dedupeSorted(
      loopIds.map((loopId) => toAgentLoopLabel(loopId)),
    );
    const atoms = dedupeSorted(
      (atomsPayload.atoms ?? []).map((atom) => atom.atomId),
    );

    skillPromptRecords.push({
      promptId,
      mappingPath: skill.directory,
      skillPath,
      definition: "src/services/vfs/globalSkills/generator.ts (SKILL_MAPPINGS)",
      composition: compositionByPrompt.get(promptId) ?? "unknown",
      atoms,
      loopIds,
      agentLoops,
    });
  }

  skillPromptRecords.sort((left, right) =>
    left.promptId.localeCompare(right.promptId),
  );

  const loopRows = loopCatalog.items
    .map((loop) => {
      const promptIds = loopPromptIdsByLoop.get(loop.id) ?? [];
      const skillRefs = setToSortedArray(skillRefsByLoop.get(loop.id));
      return `| \`${escapeMd(loop.id)}\` | ${escapeMd(
        toAgentLoopLabel(loop.id),
      )} | ${formatInlineListWithBreak(promptIds)} | ${formatInlineListWithBreak(
        skillRefs,
      )} |`;
    })
    .join("\n");

  const nonSkillSections = nonSkillPromptRecords
    .map((record) => {
      return [
        `### \`${escapeMd(record.promptId)}\``,
        `- 定义位置: \`${escapeMd(record.definitionFile)}\` -> \`${escapeMd(record.definitionExport)}\``,
        `- 组成 Atom (${record.atoms.length}): ${formatInlineList(record.atoms)}`,
        `- 使用的 loop (${record.loopIds.length}): ${formatInlineList(record.loopIds)}`,
        `- 对应 AgentLoop (${record.agentLoops.length}): ${formatInlineList(record.agentLoops)}`,
        `- 同环路中引用的 SKILL (${record.referencedSkillPaths.length}): ${formatInlineList(record.referencedSkillPaths)}`,
      ].join("\n");
    })
    .join("\n\n");

  const skillRows = skillPromptRecords
    .map((record) => {
      return `| \`${escapeMd(record.promptId)}\` | \`${escapeMd(
        record.definition,
      )}\`<br>mapping: \`${escapeMd(record.mappingPath)}\` | \`${escapeMd(
        record.skillPath,
      )}\` | \`${escapeMd(record.composition)}\` | ${formatInlineListWithBreak(
        record.atoms,
      )} | ${formatInlineListWithBreak(record.loopIds)} | ${formatInlineListWithBreak(
        record.agentLoops,
      )} |`;
    })
    .join("\n");

  const content = [
    "# Prompt Registry (Atom Trace Output)",
    "",
    `生成时间: ${new Date().toISOString()}`,
    "",
    "## Data Sources",
    `- prompt graph: \`src/services/prompts/trace/generated/prompt-atom-graph.json\` (generatedAt: ${promptGraph.generatedAt})`,
    `- loop export: \`dist/debug/loops/catalog.json\` (generatedAt: ${loopCatalog.generatedAt})`,
    `- skill export: \`dist/debug/skills/catalog.json\` (generatedAt: ${skillCatalog.generatedAt})`,
    `- skill coverage: \`src/services/prompts/trace/generated/skill-atom-coverage.json\` (generatedAt: ${skillCoverage.generatedAt})`,
    "",
    "## Summary",
    `- non-skill prompts: ${nonSkillPromptRecords.length}`,
    `- skill prompts (\`skills.*\`): ${skillPromptRecords.length}`,
    `- loop exports: ${loopCatalog.items.length}`,
    "",
    "## Loop -> Prompt -> Skill 引用",
    "",
    "| Loop ID | AgentLoop | Prompt IDs | Prompt 文本中引用的 SKILL 路径 |",
    "| --- | --- | --- | --- |",
    loopRows,
    "",
    "## 非 Skill Prompt 详表",
    "",
    nonSkillSections,
    "",
    "## Skill Prompt 详表 (`skills.*`)",
    "",
    "| Prompt ID | 定义位置 | SKILL 输出路径 | 组合类型 | 组成 Atom | 出现于 Loop 导出 | 对应 AgentLoop |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    skillRows,
    "",
  ].join("\n");

  writeFileSync(OUTPUT_PATH, content, "utf8");
  console.log(`Prompt registry doc written: ${OUTPUT_PATH}`);
  console.log(`non-skill prompts: ${nonSkillPromptRecords.length}`);
  console.log(`skill prompts: ${skillPromptRecords.length}`);
}

main();
