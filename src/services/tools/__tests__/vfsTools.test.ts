import { describe, it, expect } from "vitest";
import {
  VFS_LS_TOOL,
  VFS_READ_TOOL,
  VFS_SEARCH_TOOL,
  VFS_GREP_TOOL,
  VFS_WRITE_TOOL,
  VFS_EDIT_TOOL,
  VFS_MERGE_TOOL,
  VFS_MOVE_TOOL,
  VFS_DELETE_TOOL,
  ALL_DEFINED_TOOLS,
} from "../../tools";

describe("VFS tools", () => {
  it("defines VFS tool names", () => {
    expect(VFS_LS_TOOL.name).toBe("vfs_ls");
    expect(VFS_READ_TOOL.name).toBe("vfs_read");
    expect(VFS_SEARCH_TOOL.name).toBe("vfs_search");
    expect(VFS_GREP_TOOL.name).toBe("vfs_grep");
    expect(VFS_WRITE_TOOL.name).toBe("vfs_write");
    expect(VFS_EDIT_TOOL.name).toBe("vfs_edit");
    expect(VFS_MERGE_TOOL.name).toBe("vfs_merge");
    expect(VFS_MOVE_TOOL.name).toBe("vfs_move");
    expect(VFS_DELETE_TOOL.name).toBe("vfs_delete");
  });

  it("only exposes vfs tools", () => {
    expect(ALL_DEFINED_TOOLS.every((t) => t.name.startsWith("vfs_"))).toBe(
      true,
    );
  });

  it("accepts null for optional VFS path parameters", () => {
    const searchResult = VFS_SEARCH_TOOL.parameters.safeParse({
      query: "test",
      path: null,
    });
    expect(searchResult.success).toBe(true);

    const grepResult = VFS_GREP_TOOL.parameters.safeParse({
      pattern: "test",
      path: null,
    });
    expect(grepResult.success).toBe(true);

    const lsResult = VFS_LS_TOOL.parameters.safeParse({
      path: null,
    });
    expect(lsResult.success).toBe(true);
  });

  it("allows redundant from fields on non-move/copy patch ops", () => {
    const editResult = VFS_EDIT_TOOL.parameters.safeParse({
      edits: [
        {
          path: "current/world/global.json",
          patch: [
            {
              op: "replace",
              path: "/time",
              value: "noon",
              from: "/unused",
            },
          ],
        },
      ],
    });
    expect(editResult.success).toBe(true);
  });

  it("accepts null from fields on non-move/copy patch ops", () => {
    const editResult = VFS_EDIT_TOOL.parameters.safeParse({
      edits: [
        {
          path: "current/world/global.json",
          patch: [
            {
              op: "add",
              path: "/flags/-",
              value: "new-flag",
              from: null,
            },
          ],
        },
      ],
    });
    expect(editResult.success).toBe(true);
  });
});
