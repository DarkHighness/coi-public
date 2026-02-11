import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  generateVfsSkillSeeds,
  getSkillMappings,
} from "../src/services/vfs/globalSkills/generator";
import {
  clearPromptTraceRegistry,
  getPromptTraceHistory,
  getRegisteredPromptAtoms,
  setPromptTraceEnabled,
} from "../src/services/prompts/trace/runtime";
import type {
  PromptTrace,
  RegisteredPromptAtom,
} from "../src/services/prompts/trace/types";

type SkillMappingLite = {
  name: string;
  path: string;
  title: string;
  domain: string;
  visibility?: "catalog" | "nested";
};

type SkillTraceUsage = {
  skillId: string;
  skillPath: string;
  promptId: string;
  usedSkillAtomIds: string[];
  usedAtomIds: string[];
  atomCallCount: number;
};

type SkillAtomCoverageReport = {
  generatedAt: string;
  totals: {
    mappings: number;
    traces: number;
    registeredSkillAtoms: number;
    usedSkillAtoms: number;
    uncoveredSkillAtoms: number;
  };
  uncoveredSkillAtoms: RegisteredPromptAtom[];
  mappingsWithoutSkillAtoms: Array<{
    skillId: string;
    skillPath: string;
    promptId: string;
  }>;
  usages: SkillTraceUsage[];
};

const ROOT = process.cwd();
const ATOMS_ROOT = path.join(ROOT, "src/services/prompts/atoms");
const JSON_OUTPUT_PATH = path.join(
  ROOT,
  "src/services/prompts/trace/generated/skill-atom-coverage.json",
);
const MARKDOWN_OUTPUT_PATH = path.join(
  ROOT,
  "src/services/prompts/trace/generated/skill-composition.md",
);

function toRel(filePath: string): string {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const absolute = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "__tests__") continue;
        stack.push(absolute);
        continue;
      }

      if (
        entry.isFile() &&
        absolute.endsWith(".ts") &&
        !absolute.endsWith(".d.ts")
      ) {
        out.push(absolute);
      }
    }
  }

  return out.sort((left, right) => left.localeCompare(right));
}

async function importAllAtomModules(): Promise<void> {
  const files = listTsFiles(ATOMS_ROOT);
  for (const file of files) {
    await import(pathToFileURL(file).href);
  }
}

function getLatestTraceByPrompt(traces: PromptTrace[]): Map<string, PromptTrace> {
  const byPrompt = new Map<string, PromptTrace>();
  for (const trace of traces) {
    byPrompt.set(trace.promptId, trace);
  }
  return byPrompt;
}

function buildUsageForMapping(
  mapping: SkillMappingLite,
  traceByPrompt: Map<string, PromptTrace>,
): SkillTraceUsage {
  const promptId = `skills.${mapping.path}`;
  const trace = traceByPrompt.get(promptId);

  const usedSkillAtomIds = trace
    ? Array.from(
        new Set(
          trace.atoms
            .filter((atom) => atom.kind === "skill")
            .map((atom) => atom.atomId),
        ),
      ).sort((left, right) => left.localeCompare(right))
    : [];

  const usedAtomIds = trace
    ? Array.from(new Set(trace.atoms.map((atom) => atom.atomId))).sort((left, right) =>
        left.localeCompare(right),
      )
    : [];

  return {
    skillId: mapping.name,
    skillPath: mapping.path,
    promptId,
    usedSkillAtomIds,
    usedAtomIds,
    atomCallCount: trace?.atoms.length ?? 0,
  };
}

function resolveParentPath(
  skillPath: string,
  knownPaths: Set<string>,
): string | null {
  const segments = skillPath.split("/");
  for (let index = segments.length - 1; index > 0; index -= 1) {
    const candidate = segments.slice(0, index).join("/");
    if (knownPaths.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

function collectSubtreePaths(
  rootPath: string,
  childrenByParent: Map<string, string[]>,
): string[] {
  const visited = new Set<string>();
  const stack = [rootPath];

  while (stack.length > 0) {
    const next = stack.pop();
    if (!next || visited.has(next)) continue;
    visited.add(next);
    const children = childrenByParent.get(next) ?? [];
    for (const child of children) {
      if (!visited.has(child)) {
        stack.push(child);
      }
    }
  }

  return [...visited].sort((left, right) => left.localeCompare(right));
}

function buildCompositionMarkdown(input: {
  generatedAt: string;
  mappings: SkillMappingLite[];
  usages: SkillTraceUsage[];
}): string {
  const mappingsByPath = new Map(input.mappings.map((item) => [item.path, item]));
  const usageByPath = new Map(input.usages.map((item) => [item.skillPath, item]));
  const knownPaths = new Set(input.mappings.map((item) => item.path));

  const childrenByParent = new Map<string, string[]>();

  for (const mapping of input.mappings) {
    const parent = resolveParentPath(mapping.path, knownPaths);
    if (!parent) {
      continue;
    }

    const siblings = childrenByParent.get(parent) ?? [];
    siblings.push(mapping.path);
    siblings.sort((left, right) => left.localeCompare(right));
    childrenByParent.set(parent, siblings);
  }

  const hubs = input.mappings
    .filter((mapping) => (childrenByParent.get(mapping.path) ?? []).length > 0)
    .sort((left, right) => left.path.localeCompare(right.path));

  const domains = Array.from(
    new Set(input.mappings.map((mapping) => mapping.domain)),
  ).sort((left, right) => left.localeCompare(right));

  const lines: string[] = [];
  lines.push("# Skill Composition Map (Runtime Trace)");
  lines.push("");
  lines.push(`Generated at: ${input.generatedAt}`);
  lines.push("");
  lines.push("## Composition Rules");
  lines.push("");
  lines.push("- Hub skill: has one or more child skills.");
  lines.push("- Leaf skill: has no child skills and should land on concrete atoms.");
  lines.push("- Atom lists below come from runtime trace during `generateVfsSkillSeeds()`.");
  lines.push("");

  lines.push("## Recommended Skill Combination Strategy");
  lines.push("");
  lines.push("1. Start from a catalog-visible skill in the target domain.");
  lines.push("2. If it is a hub, choose one child leaf skill first, then add a second only if needed.");
  lines.push("3. Validate output with leaf `descendant atoms` to ensure guidance lands on real atoms.");
  lines.push("");

  lines.push("## Hub Skills");
  lines.push("");
  for (const hub of hubs) {
    const children = childrenByParent.get(hub.path) ?? [];
    lines.push(`- \`${hub.path}\` -> ${children.length} child skill(s)`);
    for (const child of children) {
      lines.push(`  - \`${child}\``);
    }
  }
  lines.push("");

  for (const domain of domains) {
    const domainMappings = input.mappings
      .filter((mapping) => mapping.domain === domain)
      .sort((left, right) => left.path.localeCompare(right.path));

    lines.push(`## Domain: \`${domain}\``);
    lines.push("");

    for (const mapping of domainMappings) {
      const usage = usageByPath.get(mapping.path);
      const directChildren = childrenByParent.get(mapping.path) ?? [];
      const isHub = directChildren.length > 0;

      const descendantPaths = collectSubtreePaths(mapping.path, childrenByParent);
      const leafDescendants = descendantPaths.filter(
        (pathItem) => (childrenByParent.get(pathItem) ?? []).length === 0,
      );

      const descendantSkillAtoms = Array.from(
        new Set(
          descendantPaths.flatMap(
            (pathItem) => usageByPath.get(pathItem)?.usedSkillAtomIds ?? [],
          ),
        ),
      ).sort((left, right) => left.localeCompare(right));

      const descendantAtoms = Array.from(
        new Set(
          descendantPaths.flatMap(
            (pathItem) => usageByPath.get(pathItem)?.usedAtomIds ?? [],
          ),
        ),
      ).sort((left, right) => left.localeCompare(right));

      lines.push(`### \`${mapping.path}\` (${isHub ? "hub" : "leaf"})`);
      lines.push("");
      lines.push(`- id: \`${mapping.name}\``);
      lines.push(`- title: ${mapping.title}`);
      lines.push(`- visibility: \`${mapping.visibility ?? "catalog"}\``);

      if (directChildren.length > 0) {
        lines.push(`- direct subskills (${directChildren.length}):`);
        for (const childPath of directChildren) {
          lines.push(`  - \`${childPath}\``);
        }
      } else {
        lines.push("- direct subskills: (none)");
      }

      if (usage) {
        lines.push(`- direct skill atoms (${usage.usedSkillAtomIds.length}):`);
        if (usage.usedSkillAtomIds.length === 0) {
          lines.push("  - (none)");
        } else {
          for (const atomId of usage.usedSkillAtomIds) {
            lines.push(`  - \`${atomId}\``);
          }
        }

        lines.push(`- direct atoms (${usage.usedAtomIds.length}):`);
        if (usage.usedAtomIds.length === 0) {
          lines.push("  - (none)");
        } else {
          for (const atomId of usage.usedAtomIds) {
            lines.push(`  - \`${atomId}\``);
          }
        }
      } else {
        lines.push("- direct skill atoms: (no trace)");
        lines.push("- direct atoms: (no trace)");
      }

      lines.push(`- leaf descendants (${leafDescendants.length}):`);
      for (const leafPath of leafDescendants) {
        lines.push(`  - \`${leafPath}\``);
      }

      lines.push(`- descendant skill atoms (${descendantSkillAtoms.length}):`);
      if (descendantSkillAtoms.length === 0) {
        lines.push("  - (none)");
      } else {
        for (const atomId of descendantSkillAtoms) {
          lines.push(`  - \`${atomId}\``);
        }
      }

      lines.push(`- descendant atoms (${descendantAtoms.length}):`);
      if (descendantAtoms.length === 0) {
        lines.push("  - (none)");
      } else {
        for (const atomId of descendantAtoms) {
          lines.push(`  - \`${atomId}\``);
        }
      }

      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  await importAllAtomModules();

  const mappings = getSkillMappings() as unknown as SkillMappingLite[];

  clearPromptTraceRegistry();
  setPromptTraceEnabled(true);
  try {
    generateVfsSkillSeeds();
  } finally {
    setPromptTraceEnabled(false);
  }

  const traces = getPromptTraceHistory().filter((trace) =>
    trace.promptId.startsWith("skills."),
  );
  const traceByPrompt = getLatestTraceByPrompt(traces);

  const usages = mappings
    .map((mapping) => buildUsageForMapping(mapping, traceByPrompt))
    .sort((left, right) => left.skillPath.localeCompare(right.skillPath));

  const registeredSkillAtoms = getRegisteredPromptAtoms().filter(
    (atom) => atom.kind === "skill" && atom.source.startsWith("atoms/"),
  );

  const usedSkillAtomIds = new Set(
    usages.flatMap((usage) => usage.usedSkillAtomIds),
  );

  const uncoveredSkillAtoms = registeredSkillAtoms
    .filter((atom) => !usedSkillAtomIds.has(atom.atomId))
    .sort((left, right) => left.atomId.localeCompare(right.atomId));

  const mappingsWithoutSkillAtoms = usages
    .filter((usage) => usage.usedSkillAtomIds.length === 0)
    .map((usage) => ({
      skillId: usage.skillId,
      skillPath: usage.skillPath,
      promptId: usage.promptId,
    }));

  const report: SkillAtomCoverageReport = {
    generatedAt: new Date().toISOString(),
    totals: {
      mappings: mappings.length,
      traces: traces.length,
      registeredSkillAtoms: registeredSkillAtoms.length,
      usedSkillAtoms: usedSkillAtomIds.size,
      uncoveredSkillAtoms: uncoveredSkillAtoms.length,
    },
    uncoveredSkillAtoms,
    mappingsWithoutSkillAtoms,
    usages,
  };

  const compositionMarkdown = buildCompositionMarkdown({
    generatedAt: report.generatedAt,
    mappings,
    usages,
  });

  fs.mkdirSync(path.dirname(JSON_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(
    JSON_OUTPUT_PATH,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(MARKDOWN_OUTPUT_PATH, compositionMarkdown, "utf8");

  if (uncoveredSkillAtoms.length > 0) {
    console.error("[skill-target-atoms] Uncovered skill-target atoms found:\n");
    for (const atom of uncoveredSkillAtoms) {
      console.error(`- ${atom.atomId} (${atom.exportName}) from ${atom.source}`);
    }
    console.error(
      `\n[skill-target-atoms] Coverage report: ${toRel(JSON_OUTPUT_PATH)}`,
    );
    console.error(
      `[skill-target-atoms] Composition doc: ${toRel(MARKDOWN_OUTPUT_PATH)}`,
    );
    process.exit(1);
  }

  console.log(
    `[skill-target-atoms] OK: ${registeredSkillAtoms.length} skill-target atoms are classified and used in VFS skills.`,
  );
  console.log(`[skill-target-atoms] Coverage report: ${toRel(JSON_OUTPUT_PATH)}`);
  console.log(`[skill-target-atoms] Composition doc: ${toRel(MARKDOWN_OUTPUT_PATH)}`);
}

void main();
