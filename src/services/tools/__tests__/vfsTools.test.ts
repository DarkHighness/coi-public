import { describe, it, expect } from "vitest";
import { VFS_LS_TOOL, VFS_READ_TOOL } from "../../tools";

describe("VFS tools", () => {
  it("defines vfs_ls and vfs_read", () => {
    expect(VFS_LS_TOOL.name).toBe("vfs_ls");
    expect(VFS_READ_TOOL.name).toBe("vfs_read");
  });
});
