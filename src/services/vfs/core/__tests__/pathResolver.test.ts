import { describe, expect, it } from "vitest";
import {
  canonicalToLogicalVfsPath,
  resolveVfsPath,
  toCanonicalVfsPath,
  toCurrentDisplayPath,
  toLogicalVfsPath,
} from "../pathResolver";

describe("pathResolver", () => {
  it("resolves current alias paths into canonical fork/shared namespaces", () => {
    const world = resolveVfsPath("current/world/global.json", {
      activeForkId: 2,
    });
    expect(world.canonicalPath).toBe("forks/2/story/world/global.json");
    expect(world.logicalPath).toBe("world/global.json");
    expect(world.mountKind).toBe("alias_current");

    const skills = resolveVfsPath("current/skills/README.md", {
      activeForkId: 2,
    });
    expect(skills.canonicalPath).toBe("shared/system/skills/README.md");
    expect(skills.logicalPath).toBe("skills/README.md");
  });

  it("accepts canonical inputs and derives display aliases", () => {
    const resolved = resolveVfsPath("shared/narrative/outline/outline.json", {
      activeForkId: 0,
    });

    expect(resolved.mountKind).toBe("canonical");
    expect(resolved.logicalPath).toBe("outline/outline.json");
    expect(resolved.displayPath).toBe("current/outline/outline.json");
  });

  it("maps outline story plan alias and canonical paths", () => {
    const alias = resolveVfsPath("current/outline/story_outline/plan.md", {
      activeForkId: 0,
    });

    expect(alias.canonicalPath).toBe(
      "shared/narrative/outline/story_outline/plan.md",
    );
    expect(alias.logicalPath).toBe("outline/story_outline/plan.md");

    const canonical = resolveVfsPath(
      "shared/narrative/outline/story_outline/plan.md",
      { activeForkId: 0 },
    );
    expect(canonical.displayPath).toBe("current/outline/story_outline/plan.md");
  });

  it("maps legacy logical paths into canonical paths", () => {
    expect(
      toCanonicalVfsPath("world/theme_config.json", { activeForkId: 1 }),
    ).toBe("shared/config/theme/theme_config.json");
    expect(
      toCanonicalVfsPath("conversation/history_rewrites/a.json", {
        activeForkId: 4,
      }),
    ).toBe("forks/4/ops/history_rewrites/a.json");
    expect(
      toCanonicalVfsPath("current/conversation/session.jsonl", {
        activeForkId: 4,
      }),
    ).toBe("forks/4/story/conversation/session.jsonl");
  });

  it("keeps non-active fork world files canonical unless loose mode", () => {
    const canonical = "forks/7/story/world/global.json";
    expect(canonicalToLogicalVfsPath(canonical, { activeForkId: 0 })).toBe(
      canonical,
    );
    expect(
      canonicalToLogicalVfsPath(canonical, {
        activeForkId: 0,
        looseFork: true,
      }),
    ).toBe("world/global.json");
  });

  it("provides convenience helpers for logical/current paths", () => {
    expect(
      toLogicalVfsPath("current/summary/state.json", { activeForkId: 1 }),
    ).toBe("summary/state.json");
    expect(
      toCurrentDisplayPath("forks/1/story/summary/state.json", {
        activeForkId: 1,
      }),
    ).toBe("current/summary/state.json");
  });
});
