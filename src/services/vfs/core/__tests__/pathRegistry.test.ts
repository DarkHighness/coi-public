import { describe, expect, it } from "vitest";
import { vfsPathRegistry } from "../pathRegistry";

describe("vfsPathRegistry", () => {
  it("classifies world paths with active fork context", () => {
    const result = vfsPathRegistry.classify("world/global.json", {
      activeForkId: 5,
    });

    expect(result.canonicalPath).toBe("forks/5/story/world/global.json");
    expect(result.scope).toBe("fork");
    expect(result.permissionClass).toBe("default_editable");
    expect(result.domain).toBe("story");
    expect(result.criticality).toBe("core");
    expect(result.retention).toBe("save");
  });

  it("classifies workspace plan as editable fork markdown", () => {
    const result = vfsPathRegistry.classify("current/workspace/PLAN.md");

    expect(result.canonicalPath).toBe("forks/0/story/workspace/PLAN.md");
    expect(result.scope).toBe("fork");
    expect(result.permissionClass).toBe("default_editable");
    expect(result.domain).toBe("story");
  });

  it("classifies immutable and finish-guarded zones", () => {
    const immutable = vfsPathRegistry.classify("current/skills/index.json");
    expect(immutable.permissionClass).toBe("immutable_readonly");
    expect(immutable.scope).toBe("shared");
    expect(immutable.allowedWriteOps).toEqual([]);

    const finishGuarded = vfsPathRegistry.classify("conversation/index.json", {
      activeForkId: 0,
    });
    expect(finishGuarded.permissionClass).toBe("finish_guarded");
    expect(finishGuarded.allowedWriteOps).toContain("finish_commit");
  });
});
