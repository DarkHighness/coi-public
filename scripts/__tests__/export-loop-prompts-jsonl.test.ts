import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

const REPO_ROOT = "/Users/twiliness/Desktop/coi";
const SCRIPT_PATH = `${REPO_ROOT}/scripts/export-loop-prompts-jsonl.ts`;

const runScript = (): string => {
  const outDir = mkdtempSync(join(tmpdir(), "loop-export-"));
  execSync(
    `node --import tsx ${SCRIPT_PATH} -- --out ${outDir} --lang en --clean`,
    {
      cwd: REPO_ROOT,
      stdio: "pipe",
    },
  );
  return outDir;
};

describe("export-loop-prompts-jsonl script", () => {
  it("exports loop jsonl + atoms + catalogs", () => {
    const outDir = runScript();
    const loopsRoot = join(outDir, "loops");

    const requiredDirs = [
      join(loopsRoot, "turn"),
      join(loopsRoot, "cleanup"),
      join(loopsRoot, "summary_query"),
      join(loopsRoot, "summary_compact"),
      join(loopsRoot, "outline"),
      join(loopsRoot, "outline_phase_master_plan"),
      join(loopsRoot, "outline_phase_opening_narrative"),
      join(loopsRoot, "outline_phase_master_plan_prelude"),
      join(loopsRoot, "outline_phase_opening_narrative_prelude"),
    ];

    requiredDirs.forEach((dir) => {
      expect(existsSync(join(dir, "prompts.jsonl"))).toBe(true);
      expect(existsSync(join(dir, "atoms.json"))).toBe(true);
    });

    const firstTurnLine = readFileSync(
      join(loopsRoot, "turn", "prompts.jsonl"),
      "utf8",
    )
      .trim()
      .split("\n")[0];
    const parsedTurnLine = JSON.parse(firstTurnLine);
    expect(parsedTurnLine).toMatchObject({
      loopId: "turn",
      promptId: "turn.system",
      role: "system",
    });
    expect(typeof parsedTurnLine.section).toBe("string");
    expect(typeof parsedTurnLine.messageIndex).toBe("number");
    expect(typeof parsedTurnLine.text).toBe("string");

    const summaryQueryMessages = readFileSync(
      join(loopsRoot, "summary_query", "prompts.jsonl"),
      "utf8",
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { section: string; text: string });
    const queryInitialContext = summaryQueryMessages.find(
      (message) => message.section === "initial_context_effective",
    );
    expect(
      queryInitialContext?.text.startsWith("[CONTEXT: Summary Task]"),
    ).toBe(true);

    const summaryCompactMessages = readFileSync(
      join(loopsRoot, "summary_compact", "prompts.jsonl"),
      "utf8",
    )
      .trim()
      .split("\n")
      .map(
        (line) =>
          JSON.parse(line) as {
            promptId: string;
            section: string;
            role: string;
          },
      );
    expect(
      summaryCompactMessages.some(
        (message) =>
          message.promptId === "turn.system" &&
          message.section === "shared_story_system_instruction_effective" &&
          message.role === "system",
      ),
    ).toBe(true);

    const outlinePhasePrompt = JSON.parse(
      readFileSync(
        join(loopsRoot, "outline_phase_master_plan", "prompts.jsonl"),
        "utf8",
      )
        .trim()
        .split("\n")[0]!,
    ) as { text: string };
    expect(outlinePhasePrompt.text).toContain("<phase_context>");
    expect(outlinePhasePrompt.text).toContain("[PHASE 2 OF");
    expect(outlinePhasePrompt.text).toContain("current/outline/phases");
    expect(outlinePhasePrompt.text).toContain(
      "current/shared/narrative/outline/phases",
    );

    const turnAtoms = JSON.parse(
      readFileSync(join(loopsRoot, "turn", "atoms.json"), "utf8"),
    ) as {
      id: string;
      kind: string;
      promptIds: string[];
      atoms: unknown[];
      stats: { totalCalls: number; uniqueAtomCount: number };
    };
    expect(turnAtoms.id).toBe("turn");
    expect(turnAtoms.kind).toBe("loop");
    expect(turnAtoms.promptIds).toContain("turn.system");
    expect(turnAtoms.stats.uniqueAtomCount).toBeGreaterThan(0);
    expect(turnAtoms.stats.totalCalls).toBeGreaterThan(0);
    expect(Array.isArray(turnAtoms.atoms)).toBe(true);

    const catalogJson = JSON.parse(
      readFileSync(join(outDir, "catalog.json"), "utf8"),
    ) as {
      kind: string;
      items: Array<{ id: string; fileCount: number; atomCount: number }>;
    };
    expect(catalogJson.kind).toBe("loops");
    expect(catalogJson.items.length).toBeGreaterThanOrEqual(25);
    expect(
      catalogJson.items.some(
        (item) => item.id === "outline_phase_opening_narrative",
      ),
    ).toBe(true);

    const catalogMd = readFileSync(join(outDir, "catalog.md"), "utf8");
    expect(catalogMd).toContain("# Loop Export Catalog");
    expect(catalogMd).toContain("`turn`");
  });
});
