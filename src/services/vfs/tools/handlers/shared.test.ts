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
  it("starts from current root and walks parents progressively", () => {
    const recovery = buildNotFoundRecovery("world/missing/chapter.json");

    expect(recovery[0]).toBe('Try: vfs_ls({ path: "current" })');
    expect(recovery[1]).toBe(
      'Then: vfs_search({ path: "current", query: "chapter.json", fuzzy: true })',
    );
    expect(recovery[2]).toContain('vfs_ls({ path: "current/world" })');
    expect(recovery[2]).toContain(
      'vfs_ls({ path: "current/world/missing" })',
    );
    expect(recovery[3]).toBe(
      'If you need expected JSON fields: vfs_schema({ paths: ["current/world/missing/chapter.json"] })',
    );
  });

  it("uses shared root when the missing path is in shared namespace", () => {
    const recovery = buildNotFoundRecovery("shared/config/theme.json");

    expect(recovery[0]).toBe('Try: vfs_ls({ path: "shared" })');
    expect(recovery[1]).toBe(
      'Then: vfs_search({ path: "shared", query: "theme.json", fuzzy: true })',
    );
    expect(recovery[2]).toContain('vfs_ls({ path: "shared/config" })');
    expect(recovery[3]).toBe(
      'If you need expected JSON fields: vfs_schema({ paths: ["shared/config/theme.json"] })',
    );
  });
});
