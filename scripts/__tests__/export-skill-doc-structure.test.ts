import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

const REPO_ROOT = "/Users/twiliness/Desktop/coi";
const SCRIPT_PATH = `${REPO_ROOT}/scripts/export-skill-doc-structure.ts`;

const runScript = (): string => {
  const outDir = mkdtempSync(join(tmpdir(), "skill-export-"));
  execSync(`node --import tsx ${SCRIPT_PATH} -- --out ${outDir} --clean`, {
    cwd: REPO_ROOT,
    stdio: "pipe",
  });
  return outDir;
};

describe("export-skill-doc-structure script", () => {
  it("exports skill markdown structure + atoms + catalogs", () => {
    const outDir = runScript();
    const skillsRoot = join(outDir, "skills");

    const identityDir = join(skillsRoot, "core/identity");
    expect(existsSync(join(identityDir, "SKILL.md"))).toBe(true);
    expect(existsSync(join(identityDir, "atoms.json"))).toBe(true);

    const themeDir = join(skillsRoot, "theme/fantasy");
    expect(existsSync(join(themeDir, "SKILL.md"))).toBe(true);
    expect(existsSync(join(themeDir, "atoms.json"))).toBe(true);

    const identityAtoms = JSON.parse(
      readFileSync(join(identityDir, "atoms.json"), "utf8"),
    ) as {
      id: string;
      kind: string;
      promptIds: string[];
      stats: { totalCalls: number; uniqueAtomCount: number };
    };
    expect(identityAtoms.id).toBe("core-identity");
    expect(identityAtoms.kind).toBe("skill");
    expect(identityAtoms.promptIds).toContain("skills.core/identity");
    expect(identityAtoms.stats.uniqueAtomCount).toBeGreaterThan(0);
    expect(identityAtoms.stats.totalCalls).toBeGreaterThan(0);

    const themeAtoms = JSON.parse(
      readFileSync(join(themeDir, "atoms.json"), "utf8"),
    ) as {
      id: string;
      kind: string;
      promptIds: string[];
      stats: { totalCalls: number; uniqueAtomCount: number };
    };
    expect(themeAtoms.id).toBe("theme-fantasy");
    expect(themeAtoms.kind).toBe("skill");
    expect(themeAtoms.promptIds).toEqual([]);
    expect(themeAtoms.stats.totalCalls).toBe(0);
    expect(themeAtoms.stats.uniqueAtomCount).toBe(0);

    const catalogJson = JSON.parse(
      readFileSync(join(outDir, "catalog.json"), "utf8"),
    ) as {
      kind: string;
      items: Array<{ id: string }>;
    };
    expect(catalogJson.kind).toBe("skills");
    expect(catalogJson.items.length).toBeGreaterThan(100);
    expect(catalogJson.items.some((item) => item.id === "core-identity")).toBe(
      true,
    );
    expect(catalogJson.items.some((item) => item.id === "theme-fantasy")).toBe(
      true,
    );

    const catalogMd = readFileSync(join(outDir, "catalog.md"), "utf8");
    expect(catalogMd).toContain("# Skill Export Catalog");
    expect(catalogMd).toContain("`core-identity`");
  });
});
