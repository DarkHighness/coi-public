import { describe, expect, it } from "vitest";
import { resolveOutlineToolNameAlias } from "./toolNameAlias";

describe("resolveOutlineToolNameAlias", () => {
  const allowed = [
    "vfs_ls",
    "vfs_schema",
    "vfs_read",
    "vfs_search",
    "vfs_commit_outline_phase_3",
  ];

  it("keeps exact tool name unchanged", () => {
    expect(resolveOutlineToolNameAlias("vfs_read", allowed)).toBe("vfs_read");
  });

  it("strips common prefixes and resolves to allowed tool name", () => {
    expect(resolveOutlineToolNameAlias("default_api:vfs_read", allowed)).toBe(
      "vfs_read",
    );
    expect(resolveOutlineToolNameAlias("functions.vfs_read", allowed)).toBe(
      "vfs_read",
    );
    expect(
      resolveOutlineToolNameAlias(
        "default_api:functions.vfs_commit_outline_phase_3",
        allowed,
      ),
    ).toBe("vfs_commit_outline_phase_3");
  });

  it("strips generic namespace prefixes when they wrap an allowed name", () => {
    expect(resolveOutlineToolNameAlias("abc:vfs_schema", allowed)).toBe(
      "vfs_schema",
    );
  });

  it("returns original name when no allowed candidate can be resolved", () => {
    expect(resolveOutlineToolNameAlias("default_api:nonexistent_tool", allowed)).toBe(
      "default_api:nonexistent_tool",
    );
  });
});

