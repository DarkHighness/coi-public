import { describe, it, expect } from "vitest";
import {
  VFS_LS_TOOL,
  VFS_READ_TOOL,
  VFS_SCHEMA_TOOL,
  VFS_SEARCH_TOOL,
  VFS_WRITE_TOOL,
  VFS_MOVE_TOOL,
  VFS_DELETE_TOOL,
  VFS_COMMIT_TURN_TOOL,
  VFS_COMMIT_SOUL_TOOL,
  VFS_COMMIT_SUMMARY_TOOL,
  VFS_COMMIT_OUTLINE_PHASE_TOOLS,
  ALL_DEFINED_TOOLS,
} from "../../tools";
import { vfsToolCapabilityRegistry } from "../../vfs/core/toolCapabilityRegistry";

describe("VFS tools", () => {
  it("defines v5 tool names", () => {
    expect(VFS_LS_TOOL.name).toBe("vfs_ls");
    expect(VFS_READ_TOOL.name).toBe("vfs_read");
    expect(VFS_SCHEMA_TOOL.name).toBe("vfs_schema");
    expect(VFS_SEARCH_TOOL.name).toBe("vfs_search");
    expect(VFS_WRITE_TOOL.name).toBe("vfs_write");
    expect(VFS_MOVE_TOOL.name).toBe("vfs_move");
    expect(VFS_DELETE_TOOL.name).toBe("vfs_delete");
    expect(VFS_COMMIT_TURN_TOOL.name).toBe("vfs_commit_turn");
    expect(VFS_COMMIT_SOUL_TOOL.name).toBe("vfs_commit_soul");
    expect(VFS_COMMIT_SUMMARY_TOOL.name).toBe("vfs_commit_summary");
  });

  it("defines phase-specific outline commit tools", () => {
    const commitNames = VFS_COMMIT_OUTLINE_PHASE_TOOLS.map((tool) => tool.name);
    expect(commitNames).toHaveLength(10);
    for (let phase = 0; phase <= 9; phase += 1) {
      expect(commitNames).toContain(`vfs_commit_outline_phase_${phase}`);
    }
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

    const lsResult = VFS_LS_TOOL.parameters.safeParse({
      path: null,
    });
    expect(lsResult.success).toBe(true);
  });

  it("allows redundant from fields on non-move/copy patch ops", () => {
    const writeResult = VFS_WRITE_TOOL.parameters.safeParse({
      ops: [
        {
          op: "patch_json",
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
    expect(writeResult.success).toBe(true);
  });

  it("accepts application/jsonl content type for jsonl write targets", () => {
    const result = VFS_WRITE_TOOL.parameters.safeParse({
      ops: [
        {
          op: "write_file",
          path: "current/conversation/session.jsonl",
          content: '{"role":"user"}\n{"role":"assistant"}',
          contentType: "application/jsonl",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("allows write_file contentType to be omitted for system inference", () => {
    const result = VFS_WRITE_TOOL.parameters.safeParse({
      ops: [
        {
          op: "write_file",
          path: "current/world/global.json",
          content: "{}",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects runtime-only fields in vfs_commit_summary AI args", () => {
    const result = VFS_COMMIT_SUMMARY_TOOL.parameters.safeParse({
      displayText: "summary",
      visible: {
        narrative: "n",
        majorEvents: ["e"],
        characterDevelopment: "c",
        worldState: "w",
      },
      hidden: {
        truthNarrative: "t",
        hiddenPlots: ["p"],
        npcActions: ["a"],
        worldTruth: "wt",
        unrevealed: ["u"],
      },
      nodeRange: { fromIndex: 1, toIndex: 2 },
      lastSummarizedIndex: 3,
    });

    expect(result.success).toBe(false);
  });

  it("accepts nextSessionReferencesMarkdown in vfs_commit_summary args", () => {
    const result = VFS_COMMIT_SUMMARY_TOOL.parameters.safeParse({
      displayText: "summary",
      visible: {
        narrative: "n",
        majorEvents: ["e"],
        characterDevelopment: "c",
        worldState: "w",
      },
      hidden: {
        truthNarrative: "t",
        hiddenPlots: ["p"],
        npcActions: ["a"],
        worldTruth: "wt",
        unrevealed: ["u"],
      },
      nextSessionReferencesMarkdown:
        "- current/skills/commands/runtime/SKILL.md\n- current/conversation/session.jsonl",
    });

    expect(result.success).toBe(true);
  });

  it("accepts optional target fields in vfs_commit_soul schema", () => {
    const empty = VFS_COMMIT_SOUL_TOOL.parameters.safeParse({});
    expect(empty.success).toBe(true);

    const currentOnly = VFS_COMMIT_SOUL_TOOL.parameters.safeParse({
      currentSoul: "# Player Soul (This Save)\n",
    });
    expect(currentOnly.success).toBe(true);

    const globalOnly = VFS_COMMIT_SOUL_TOOL.parameters.safeParse({
      globalSoul: "# Player Soul (Global)\n",
    });
    expect(globalOnly.success).toBe(true);
  });

  it("does not expose vfs_commit_turn meta and accepts retconAck without summary", () => {
    const withMeta = VFS_COMMIT_TURN_TOOL.parameters.safeParse({
      userAction: "look around",
      assistant: {
        narrative: "You scan the room.",
        choices: [{ text: "Inspect desk" }, { text: "Open door" }],
      },
      meta: { playerRate: { vote: "up", createdAt: Date.now() } },
    });
    expect(withMeta.success).toBe(false);

    const withoutSummary = VFS_COMMIT_TURN_TOOL.parameters.safeParse({
      userAction: "look around",
      assistant: {
        narrative: "You scan the room.",
        choices: [{ text: "Inspect desk" }, { text: "Open door" }],
      },
      retconAck: { hash: "abc123" },
    });
    expect(withoutSummary.success).toBe(true);
  });

  it("embeds permission contract into vfs tool descriptions", () => {
    expect(VFS_LS_TOOL.description).toContain("Permission contract:");
    expect(VFS_LS_TOOL.description).toContain("read-only");
    expect(VFS_WRITE_TOOL.description).toContain(
      "elevated_editable requires one-time user-confirmed token",
    );
    expect(VFS_COMMIT_TURN_TOOL.description).toContain("finish protocol tool");
    expect(VFS_COMMIT_SOUL_TOOL.description).toContain("finish protocol tool");
  });

  it("keeps tool descriptions aligned with capability registry", () => {
    for (const tool of ALL_DEFINED_TOOLS) {
      const capability = vfsToolCapabilityRegistry.get(tool.name);
      expect(capability, `missing capability for ${tool.name}`).toBeDefined();
      if (!capability) continue;

      if (capability.readOnly) {
        expect(tool.description).toContain("read-only");
      }

      if (capability.needsElevationFor.includes("elevated_editable")) {
        expect(tool.description).toContain(
          "elevated_editable requires one-time user-confirmed token",
        );
      }

      if (capability.isFinishTool) {
        expect(tool.description).toContain("finish protocol tool");
      }
    }
  });
});
