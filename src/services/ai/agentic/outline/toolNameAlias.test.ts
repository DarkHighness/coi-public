import { describe, expect, it } from "vitest";
import { resolveOutlineToolNameAlias } from "./toolNameAlias";

describe("resolveOutlineToolNameAlias", () => {
  const allowed = [
    "vfs_ls",
    "vfs_schema",
    "vfs_read_chars",
    "vfs_search",
    "vfs_finish_outline_master_plan",
  ];

  it("keeps exact tool name unchanged", () => {
    expect(resolveOutlineToolNameAlias("vfs_read_chars", allowed)).toBe(
      "vfs_read_chars",
    );
  });

  it("strips common prefixes and resolves to allowed tool name", () => {
    expect(
      resolveOutlineToolNameAlias("default_api:vfs_read_chars", allowed),
    ).toBe("vfs_read_chars");
    expect(
      resolveOutlineToolNameAlias("functions.vfs_read_chars", allowed),
    ).toBe("vfs_read_chars");
    expect(
      resolveOutlineToolNameAlias(
        "default_api:functions.vfs_finish_outline_master_plan",
        allowed,
      ),
    ).toBe("vfs_finish_outline_master_plan");
  });

  it("strips generic namespace prefixes when they wrap an allowed name", () => {
    expect(resolveOutlineToolNameAlias("abc:vfs_schema", allowed)).toBe(
      "vfs_schema",
    );
  });

  it("returns original name when no allowed candidate can be resolved", () => {
    expect(
      resolveOutlineToolNameAlias("default_api:nonexistent_tool", allowed),
    ).toBe("default_api:nonexistent_tool");
  });
});
