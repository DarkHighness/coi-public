import { describe, it, expect } from "vitest";
import {
  VFS_LS_TOOL,
  VFS_READ_TOOL,
  VFS_SEARCH_TOOL,
  VFS_GREP_TOOL,
  VFS_WRITE_TOOL,
  VFS_EDIT_TOOL,
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
    expect(VFS_MOVE_TOOL.name).toBe("vfs_move");
    expect(VFS_DELETE_TOOL.name).toBe("vfs_delete");
  });

  it("only exposes vfs tools", () => {
    expect(ALL_DEFINED_TOOLS.every((t) => t.name.startsWith("vfs_"))).toBe(
      true,
    );
  });
});
