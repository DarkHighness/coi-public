import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildGlobalVfsSkills } from "../src/services/vfs/globalSkills";
import { getAllSkillCatalogEntries } from "../src/services/vfs/globalSkills";
import {
  generateVfsSkillSeeds,
  getSkillMappings,
} from "../src/services/vfs/globalSkills/generator";
import {
  clearPromptTraceRegistry,
  getPromptTraceHistory,
  setPromptTraceEnabled,
} from "../src/services/prompts/trace/runtime";
import type { PromptTrace } from "../src/services/prompts/trace/types";

type Args = {
  outDir: string;
  clean: boolean;
};

type AggregatedAtom = {
  atomId: string;
  kind: "atom" | "skill";
  source: string;
  exportName: string;
  callCount: number;
};

type AtomsPayload = {
  id: string;
  kind: "skill";
  promptIds: string[];
  atoms: AggregatedAtom[];
  stats: {
    totalCalls: number;
    uniqueAtomCount: number;
  };
  generatedAt: string;
};

type SkillCatalogItem = {
  id: string;
  title: string;
  path: string;
  fileCount: number;
  atomCount: number;
  directory: string;
};

type SkillMappingLite = {
  path: string;
};

const DEFAULT_OUT_DIR = "dist/debug/skills";

const parseArgs = (argv: string[]): Args => {
  const args: Args = {
    outDir: DEFAULT_OUT_DIR,
    clean: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i] ?? "";
    if (token === "--") {
      continue;
    }
    if (token === "--out" && argv[i + 1]) {
      args.outDir = argv[i + 1]!;
      i += 1;
      continue;
    }
    if (token === "--clean") {
      args.clean = true;
      continue;
    }
    if (token === "--no-clean") {
      args.clean = false;
      continue;
    }
    if (token === "--help" || token === "-h") {
      console.log(
        [
          "Usage: node --import tsx scripts/export-skill-doc-structure.ts [options]",
          "",
          "Options:",
          `  --out <dir>           Output directory (default: ${DEFAULT_OUT_DIR})`,
          "  --clean               Remove output directory before export (default: on)",
          "  --no-clean            Keep existing files and overwrite touched paths only",
          "  --help                Show this help message",
        ].join("\n"),
      );
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
};

const resolveRoots = (
  outDir: string,
): { rootDir: string; skillsDir: string } => {
  const rootDir = path.resolve(process.cwd(), outDir);
  const skillsDir =
    path.basename(rootDir) === "skills"
      ? rootDir
      : path.join(rootDir, "skills");
  return { rootDir, skillsDir };
};

const getLatestTraceByPrompt = (
  traces: PromptTrace[],
): Map<string, PromptTrace> => {
  const map = new Map<string, PromptTrace>();
  for (const trace of traces) {
    map.set(trace.promptId, trace);
  }
  return map;
};

const buildAtomsPayload = (
  id: string,
  promptIds: string[],
  traceByPrompt: Map<string, PromptTrace>,
  generatedAt: string,
): AtomsPayload => {
  const ids = Array.from(new Set(promptIds));
  const byKey = new Map<string, AggregatedAtom>();
  let totalCalls = 0;

  for (const promptId of ids) {
    const trace = traceByPrompt.get(promptId);
    if (!trace) continue;
    for (const atom of trace.atoms) {
      if (atom.kind !== "atom" && atom.kind !== "skill") continue;
      const key = `${atom.atomId}|${atom.kind}|${atom.source}|${atom.exportName}`;
      const current = byKey.get(key);
      if (current) {
        current.callCount += 1;
      } else {
        byKey.set(key, {
          atomId: atom.atomId,
          kind: atom.kind,
          source: atom.source,
          exportName: atom.exportName,
          callCount: 1,
        });
      }
      totalCalls += 1;
    }
  }

  const atoms = [...byKey.values()].sort((left, right) => {
    const byAtomId = left.atomId.localeCompare(right.atomId);
    if (byAtomId !== 0) return byAtomId;
    return left.exportName.localeCompare(right.exportName);
  });

  return {
    id,
    kind: "skill",
    promptIds: ids,
    atoms,
    stats: {
      totalCalls,
      uniqueAtomCount: atoms.length,
    },
    generatedAt,
  };
};

const getSkillPathFromCatalogPath = (catalogPath: string): string => {
  const prefix = "current/skills/";
  if (!catalogPath.startsWith(prefix) || !catalogPath.endsWith("/SKILL.md")) {
    throw new Error(`Unsupported skill catalog path: ${catalogPath}`);
  }
  return catalogPath.slice(prefix.length, -"/SKILL.md".length);
};

const buildCatalogMarkdown = (
  generatedAt: string,
  items: SkillCatalogItem[],
): string => {
  const totalFiles = items.reduce((sum, item) => sum + item.fileCount, 0);
  const totalAtoms = items.reduce((sum, item) => sum + item.atomCount, 0);

  const lines: string[] = [
    "# Skill Export Catalog",
    "",
    `Generated: ${generatedAt}`,
    "",
    "## Summary",
    `- items: ${items.length}`,
    `- files: ${totalFiles}`,
    `- atoms: ${totalAtoms}`,
    "",
    "## Items",
  ];

  for (const item of items) {
    lines.push(
      `- \`${item.id}\` | title: ${item.title} | path: \`${item.path}\` | files: ${item.fileCount} | atoms: ${item.atomCount} | dir: \`${item.directory}\``,
    );
  }

  lines.push("");
  return lines.join("\n");
};

const main = (): void => {
  const args = parseArgs(process.argv.slice(2));
  const { rootDir, skillsDir } = resolveRoots(args.outDir);

  if (args.clean) {
    rmSync(rootDir, { recursive: true, force: true });
  }
  mkdirSync(rootDir, { recursive: true });
  mkdirSync(skillsDir, { recursive: true });

  clearPromptTraceRegistry();
  setPromptTraceEnabled(true);
  try {
    generateVfsSkillSeeds();
  } finally {
    setPromptTraceEnabled(false);
  }

  const traceByPrompt = getLatestTraceByPrompt(getPromptTraceHistory());
  const allFiles = Object.values(buildGlobalVfsSkills());
  const allCatalogEntries = [...getAllSkillCatalogEntries()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  const promptIdBySkillPath = new Map<string, string>();
  const mappings = getSkillMappings() as readonly SkillMappingLite[];
  for (const mapping of mappings) {
    promptIdBySkillPath.set(mapping.path, `skills.${mapping.path}`);
  }

  const generatedAt = new Date().toISOString();
  const catalogItems: SkillCatalogItem[] = [];

  for (const entry of allCatalogEntries) {
    const skillPath = getSkillPathFromCatalogPath(entry.path);
    const skillDir = path.join(skillsDir, skillPath);
    mkdirSync(skillDir, { recursive: true });

    const skillPrefix = `skills/${skillPath}/`;
    const markdownFiles = allFiles
      .filter(
        (file) =>
          file.path.startsWith(skillPrefix) && file.path.endsWith(".md"),
      )
      .sort((left, right) => left.path.localeCompare(right.path));

    for (const file of markdownFiles) {
      const relativeDocPath = file.path.slice(skillPrefix.length);
      const outputPath = path.join(skillDir, relativeDocPath);
      mkdirSync(path.dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, file.content, "utf8");
    }

    const promptId = promptIdBySkillPath.get(skillPath);
    const promptIds = promptId ? [promptId] : [];
    const atomsPayload = buildAtomsPayload(
      entry.id,
      promptIds,
      traceByPrompt,
      generatedAt,
    );

    writeFileSync(
      path.join(skillDir, "atoms.json"),
      `${JSON.stringify(atomsPayload, null, 2)}\n`,
      "utf8",
    );

    catalogItems.push({
      id: entry.id,
      title: entry.title,
      path: entry.path,
      fileCount: markdownFiles.length + 1,
      atomCount: atomsPayload.stats.uniqueAtomCount,
      directory: path.relative(rootDir, skillDir).split(path.sep).join("/"),
    });
  }

  const catalogJson = {
    version: 1,
    generatedAt,
    kind: "skills" as const,
    items: catalogItems,
  };

  writeFileSync(
    path.join(rootDir, "catalog.json"),
    `${JSON.stringify(catalogJson, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(rootDir, "catalog.md"),
    buildCatalogMarkdown(generatedAt, catalogItems),
    "utf8",
  );

  console.log(`Skill doc export completed: ${rootDir}`);
  console.log(`Skill entries: ${catalogItems.length}`);
};

main();
