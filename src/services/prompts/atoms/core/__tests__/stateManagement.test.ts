import { describe, it, expect } from "vitest";
import { stateManagement } from "../stateManagement";

describe("stateManagement atom", () => {
  it("requires VFS tools for state updates", () => {
    const content = stateManagement();
    expect(content).toContain("vfs_write");
    expect(content).toContain("vfs_edit");
    expect(content).toContain("JSON Patch");
    expect(content).toContain("vfs_delete");
    expect(content).toContain("current/world/");
  });
});
