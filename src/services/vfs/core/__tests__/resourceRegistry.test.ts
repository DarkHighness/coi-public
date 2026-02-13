import { describe, expect, it } from "vitest";
import { vfsResourceRegistry } from "../resourceRegistry";

describe("vfsResourceRegistry", () => {
  it("resolves aliases to canonical matches", () => {
    const match = vfsResourceRegistry.match("current/world/global.json", {
      activeForkId: 6,
    });

    expect(match.canonicalPath).toBe("forks/6/story/world/global.json");
    expect(match.scope).toBe("fork");
    expect(match.permissionClass).toBe("default_editable");
    expect(match.criticality).toBe("core");
    expect(match.retention).toBe("save");
  });

  it("resolves immutable resources via templates", () => {
    const match = vfsResourceRegistry.match(
      "shared/system/refs/atmosphere/options.md",
    );

    expect(match.permissionClass).toBe("immutable_readonly");
    expect(match.domain).toBe("system");
    expect(match.allowedWriteOps).toEqual([]);
  });
});
