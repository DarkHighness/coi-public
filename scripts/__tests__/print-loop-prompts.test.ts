import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

const REPO_ROOT = "/Users/twiliness/Desktop/coi";
const SCRIPT_PATH = `${REPO_ROOT}/scripts/print-loop-prompts.ts`;

const runSnapshotScript = (view: "static" | "effective" | "both"): string => {
  const tmp = mkdtempSync(join(tmpdir(), "loop-prompts-"));
  const outputPath = join(tmp, `snapshot-${view}.md`);
  execSync(
    `node --import tsx ${SCRIPT_PATH} -- --lang en --view ${view} --out ${outputPath}`,
    {
      cwd: REPO_ROOT,
      stdio: "pipe",
    },
  );
  return readFileSync(outputPath, "utf8");
};

describe("print-loop-prompts script", () => {
  it("prints both static and effective sections by default mode=both", () => {
    const content = runSnapshotScript("both");
    expect(content).toContain("View mode: both");
    expect(content).toContain("## turn (static)");
    expect(content).toContain("## turn (effective)");
    expect(content).toContain("## cleanup (effective)");
  });

  it("prints static-only view when requested", () => {
    const content = runSnapshotScript("static");
    expect(content).toContain("View mode: static");
    expect(content).toContain("## turn (static)");
    expect(content).not.toContain("## turn (effective)");
  });

  it("prints effective-only view when requested", () => {
    const content = runSnapshotScript("effective");
    expect(content).toContain("View mode: effective");
    expect(content).toContain("## turn (effective)");
    expect(content).not.toContain("## turn (static)");
  });
});

