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
const OUTPUT_PATH = path.join(
  ROOT,
  "src/services/prompts/trace/generated/skill-atom-coverage.json",
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

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (uncoveredSkillAtoms.length > 0) {
    console.error("[skill-target-atoms] Uncovered skill-target atoms found:\n");
    for (const atom of uncoveredSkillAtoms) {
      console.error(`- ${atom.atomId} (${atom.exportName}) from ${atom.source}`);
    }
    console.error(
      `\n[skill-target-atoms] Coverage report: ${toRel(OUTPUT_PATH)}`,
    );
    process.exit(1);
  }

  console.log(
    `[skill-target-atoms] OK: ${registeredSkillAtoms.length} skill-target atoms are classified and used in VFS skills.`,
  );
  console.log(`[skill-target-atoms] Coverage report: ${toRel(OUTPUT_PATH)}`);
}

void main();
