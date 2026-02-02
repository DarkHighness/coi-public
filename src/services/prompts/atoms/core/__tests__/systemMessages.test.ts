import { describe, it, expect } from "vitest";
import {
  normalTurnInstruction,
  noToolCallError,
  sudoModeInstruction,
} from "../systemMessages";

describe("systemMessages atoms", () => {
  it("normal turn instruction uses VFS-only workflow", () => {
    const content = normalTurnInstruction({});
    expect(content).toContain("vfs_write");
    expect(content).toContain("current/conversation/");
    expect(content).not.toContain("finish_turn");
    expect(content).not.toContain("search_tool");
  });

  it("no-tool-call error references VFS tools", () => {
    const content = noToolCallError({});
    expect(content).toContain("vfs_");
    expect(content).not.toContain("finish_turn");
    expect(content).not.toContain("search_tool");
  });

  it("sudo mode instruction uses VFS-only workflow", () => {
    const content = sudoModeInstruction();
    expect(content).toContain("vfs_write");
    expect(content).not.toContain("complete_force_update");
  });
});
