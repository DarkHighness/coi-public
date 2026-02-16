import { describe, expect, it } from "vitest";
import { vfsToolRegistry } from "../../vfs/tools";
import { vfsToolCapabilityRegistry } from "../../vfs/core/toolCapabilityRegistry";

const definitions = vfsToolRegistry.getDefinitions();
const byName = new Map(definitions.map((tool) => [tool.name, tool]));

describe("VFS tools", () => {
  it("defines v2 tool names", () => {
    const names = definitions.map((tool) => tool.name);
    expect(names).toContain("vfs_read_chars");
    expect(names).toContain("vfs_read_lines");
    expect(names).toContain("vfs_read_json");
    expect(names).toContain("vfs_write_file");
    expect(names).toContain("vfs_append_text");
    expect(names).toContain("vfs_edit_lines");
    expect(names).toContain("vfs_patch_json");
    expect(names).toContain("vfs_merge_json");
    expect(names).toContain("vfs_move");
    expect(names).toContain("vfs_delete");
    expect(names).toContain("vfs_finish_outline_phase_0");
    expect(names).toContain("vfs_finish_outline_phase_9");
    expect(names).not.toContain("vfs_read");
    expect(names).not.toContain("vfs_mutate");
    expect(names).not.toContain("vfs_finish_outline");
  });

  it("only exposes vfs tools", () => {
    expect(definitions.every((tool) => tool.name.startsWith("vfs_"))).toBe(
      true,
    );
  });

  it("rejects null for optional VFS path parameters", () => {
    const search = byName.get("vfs_search");
    const ls = byName.get("vfs_ls");
    expect(search).toBeDefined();
    expect(ls).toBeDefined();
    if (!search || !ls) return;

    expect(
      search.parameters.safeParse({
        query: "test",
        path: null,
      }).success,
    ).toBe(false);
    expect(
      ls.parameters.safeParse({
        path: null,
      }).success,
    ).toBe(false);
  });

  it("allows redundant from fields on non-move/copy patch ops", () => {
    const patch = byName.get("vfs_patch_json");
    expect(patch).toBeDefined();
    if (!patch) return;

    const result = patch.parameters.safeParse({
      path: "current/world/global.json",
      patch: [
        {
          op: "replace",
          path: "/time",
          value: "noon",
          from: "/unused",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("keeps vfs_finish_summary schema free of runtime-only fields", () => {
    const finishSummary = byName.get("vfs_finish_summary");
    expect(finishSummary).toBeDefined();
    if (!finishSummary) return;

    expect(
      finishSummary.parameters.safeParse({
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
      }).success,
    ).toBe(false);
  });

  it("accepts nextSessionReferencesMarkdown in vfs_finish_summary args", () => {
    const finishSummary = byName.get("vfs_finish_summary");
    expect(finishSummary).toBeDefined();
    if (!finishSummary) return;

    const result = finishSummary.parameters.safeParse({
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

  it("does not expose vfs_finish_turn meta and accepts retconAck without summary", () => {
    const finishTurn = byName.get("vfs_finish_turn");
    expect(finishTurn).toBeDefined();
    if (!finishTurn) return;

    const withMeta = finishTurn.parameters.safeParse({
      userAction: "look around",
      assistant: {
        narrative: "You scan the room.",
        choices: [{ text: "Inspect desk" }, { text: "Open door" }],
      },
      meta: { playerRate: { vote: "up", createdAt: Date.now() } },
    });
    expect(withMeta.success).toBe(false);

    const withoutSummary = finishTurn.parameters.safeParse({
      userAction: "look around",
      assistant: {
        narrative: "You scan the room.",
        choices: [{ text: "Inspect desk" }, { text: "Open door" }],
      },
      retconAck: { hash: "abc123" },
    });
    expect(withoutSummary.success).toBe(true);
  });

  it("embeds permission contract and matches capability registry", () => {
    for (const tool of definitions) {
      const capability = vfsToolCapabilityRegistry.get(tool.name);
      expect(capability, `missing capability for ${tool.name}`).toBeDefined();
      expect(tool.description).toContain("Permission contract:");
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
