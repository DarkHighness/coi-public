import { describe, expect, it } from "vitest";
import { buildNotFoundRecovery, normalizeToolDocName } from "./shared";

describe("normalizeToolDocName", () => {
  it("strips namespace prefixes from tool names", () => {
    expect(normalizeToolDocName("functions.vfs_read_chars")).toBe(
      "vfs_read_chars",
    );
    expect(normalizeToolDocName("default_api:vfs_read_lines")).toBe(
      "vfs_read_lines",
    );
  });

  it("strips call signatures from tool names", () => {
    expect(normalizeToolDocName("vfs_read_json(path=...)")).toBe(
      "vfs_read_json",
    );
  });
});

describe("buildNotFoundRecovery", () => {
  it("starts from guaranteed root without cascade-prone parent walks", () => {
    const recovery = buildNotFoundRecovery("world/missing/chapter.json");

    expect(recovery[0]).toContain('vfs_ls({ path: "current" })');
    expect(recovery[1]).toContain(
      'vfs_search({ path: "current", query: "chapter.json", fuzzy: true })',
    );
    expect(recovery[2]).toContain("Confirm the correct path");
    // JSON file → includes vfs_schema suggestion
    expect(recovery[3]).toContain(
      'vfs_schema({ paths: ["current/world/missing/chapter.json"] })',
    );
    // No parent-walk chain (the old cascade-failure pattern)
    expect(recovery.join(" ")).not.toContain("walk parents");
  });

  it("uses shared root when the missing path is in shared namespace", () => {
    const recovery = buildNotFoundRecovery("shared/config/theme.json");

    expect(recovery[0]).toContain('vfs_ls({ path: "shared" })');
    expect(recovery[1]).toContain(
      'vfs_search({ path: "shared", query: "theme.json", fuzzy: true })',
    );
    expect(recovery[2]).toContain("Confirm the correct path");
    expect(recovery[3]).toContain(
      'vfs_schema({ paths: ["shared/config/theme.json"] })',
    );
  });

  it("omits vfs_schema step for non-JSON files", () => {
    const recovery = buildNotFoundRecovery("world/notes.md");

    expect(recovery).toHaveLength(3);
    expect(recovery[0]).toContain('vfs_ls({ path: "current" })');
    expect(recovery[1]).toContain(
      'vfs_search({ path: "current", query: "notes.md", fuzzy: true })',
    );
    expect(recovery.join(" ")).not.toContain("vfs_schema");
  });
});
