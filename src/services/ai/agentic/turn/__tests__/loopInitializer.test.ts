import { describe, expect, it } from "vitest";
import { VfsSession } from "@/services/vfs/vfsSession";
import { VFS_TOOLSETS } from "@/services/vfsToolsets";
import {
  accumulateUsage,
  addToolIfNew,
  createEmptyResponse,
  createInitialTools,
  createLoopState,
} from "../loopInitializer";

describe("loopInitializer", () => {
  it("creates empty response with expected action arrays", () => {
    const response = createEmptyResponse();

    expect(response).toMatchObject({
      narrative: "",
      choices: [],
      inventoryActions: [],
      npcActions: [],
      locationActions: [],
      questActions: [],
      knowledgeActions: [],
      factionActions: [],
      timelineEvents: [],
    });
  });

  it("creates initial tools strictly from VFS allowlist", () => {
    const turnTools = createInitialTools({
      isSudoMode: false,
      isRAGEnabled: false,
      isCleanupMode: false,
    });

    expect(turnTools.length).toBe(VFS_TOOLSETS.turn.tools.length);
    expect(
      turnTools.every((tool) => VFS_TOOLSETS.turn.tools.includes(tool.name)),
    ).toBe(true);
    expect(turnTools.some((tool) => tool.name === "vfs_commit_turn")).toBe(
      true,
    );
    expect(turnTools.some((tool) => tool.name === "vfs_commit_soul")).toBe(
      false,
    );
    expect(turnTools.some((tool) => tool.name === "vfs_commit_summary")).toBe(
      false,
    );

    const turnSearchTool = turnTools.find((tool) => tool.name === "vfs_search");
    expect(turnSearchTool).toBeDefined();
    expect((turnSearchTool?.parameters as any).shape.semantic).toBeUndefined();

    const ragEnabledTools = createInitialTools({
      isSudoMode: false,
      isRAGEnabled: true,
      isCleanupMode: false,
    });
    const ragSearchTool = ragEnabledTools.find(
      (tool) => tool.name === "vfs_search",
    );
    expect(ragSearchTool).toBeDefined();
    expect((ragSearchTool?.parameters as any).shape.semantic).toBeDefined();

    const cleanupTools = createInitialTools({
      isSudoMode: true,
      isRAGEnabled: true,
      isCleanupMode: true,
    });
    expect(
      cleanupTools.every((tool) =>
        VFS_TOOLSETS.cleanup.tools.includes(tool.name),
      ),
    ).toBe(true);
  });

  it("deduplicates added tools and accumulates usage", () => {
    const activeTools = createInitialTools({
      isSudoMode: false,
      isRAGEnabled: false,
      isCleanupMode: false,
    });
    const existing = activeTools[0];

    expect(addToolIfNew(activeTools, existing)).toBe(false);
    expect(
      activeTools.filter((tool) => tool.name === existing.name),
    ).toHaveLength(1);

    const totalUsage = { promptTokens: 1, completionTokens: 2, totalTokens: 3 };
    accumulateUsage(totalUsage, {
      promptTokens: 4,
      completionTokens: 5,
      totalTokens: 9,
    });
    accumulateUsage(totalUsage, undefined);

    expect(totalUsage).toEqual({
      promptTokens: 5,
      completionTokens: 7,
      totalTokens: 12,
    });
  });

  it("creates loop state with expected defaults and marker", () => {
    const vfsSession = new VfsSession();
    const state = createLoopState(
      {} as any,
      { embedding: { enabled: true } } as any,
      false,
      false,
      vfsSession,
      [],
    );

    expect(state.conversationMarker).toBeNull();
    expect(state.finishToolName).toBe("vfs_commit_turn");
    expect(state.isRAGEnabled).toBe(true);
    expect(state.budgetState).toMatchObject({
      toolCallsMax: 50,
      retriesMax: 3,
      loopIterationsMax: 20,
    });
    expect(state.requiredCommandSkillPaths).toEqual([
      "skills/commands/runtime/SKILL.md",
      "skills/commands/runtime/turn/SKILL.md",
    ]);
    expect(state.requiredSoulReadPaths).toEqual([
      "world/soul.md",
      "world/global/soul.md",
    ]);
    expect(state.requiredPresetSkillPaths).toEqual([]);
    expect(state.requiredPresetSkillRequirements).toEqual([]);
  });

  it("sets required command skill path for sudo/cleanup modes", () => {
    const vfsSession = new VfsSession();

    const sudoState = createLoopState(
      {} as any,
      { embedding: { enabled: false } } as any,
      true,
      false,
      vfsSession,
      [],
    );
    expect(sudoState.requiredCommandSkillPaths).toEqual([
      "skills/commands/runtime/SKILL.md",
      "skills/commands/runtime/sudo/SKILL.md",
    ]);

    const cleanupState = createLoopState(
      {} as any,
      { embedding: { enabled: false } } as any,
      false,
      true,
      vfsSession,
      [],
    );
    expect(cleanupState.requiredCommandSkillPaths).toEqual([
      "skills/commands/runtime/SKILL.md",
      "skills/commands/runtime/cleanup/SKILL.md",
    ]);
    expect(cleanupState.requiredSoulReadPaths).toEqual([]);
  });

  it("uses player-rate protocol skill when rate mode is active", () => {
    const vfsSession = new VfsSession();

    const state = createLoopState(
      { godMode: true, unlockMode: true } as any,
      { embedding: { enabled: false } } as any,
      false,
      false,
      vfsSession,
      [],
      undefined,
      null,
      [],
      undefined,
      undefined,
      {
        isPlayerRateMode: true,
      },
    );

    expect(state.isPlayerRateMode).toBe(true);
    expect(state.finishToolName).toBe("vfs_commit_soul");
    expect(state.requiredCommandSkillPaths).toEqual([
      "skills/commands/runtime/SKILL.md",
      "skills/commands/runtime/player-rate/SKILL.md",
    ]);
    expect(state.activeTools.some((tool) => tool.name === "vfs_commit_soul")).toBe(
      true,
    );
    expect(state.activeTools.some((tool) => tool.name === "vfs_commit_turn")).toBe(
      false,
    );
  });

  it("adds mode-specific runtime skill paths when god/unlock are active", () => {
    const vfsSession = new VfsSession();

    const state = createLoopState(
      { godMode: true, unlockMode: true } as any,
      { embedding: { enabled: false } } as any,
      false,
      false,
      vfsSession,
      [],
    );

    expect(state.requiredCommandSkillPaths).toEqual([
      "skills/commands/runtime/SKILL.md",
      "skills/commands/runtime/turn/SKILL.md",
      "skills/commands/runtime/god/SKILL.md",
      "skills/commands/runtime/unlock/SKILL.md",
    ]);
  });

  it("stores required preset skill paths with deduplication", () => {
    const vfsSession = new VfsSession();

    const state = createLoopState(
      {} as any,
      { embedding: { enabled: false } } as any,
      false,
      false,
      vfsSession,
      [
        "skills/presets/runtime/narrative-style/SKILL.md",
        "skills/presets/runtime/narrative-style/SKILL.md",
        "skills/presets/runtime/world-disposition/SKILL.md",
      ],
      undefined,
      null,
      [
        {
          path: "skills/presets/runtime/narrative-style/SKILL.md",
          tag: "narrative_style",
          profile: "cinematic",
          source: "save_profile",
        },
        {
          path: "skills/presets/runtime/narrative-style/SKILL.md",
          tag: "narrative_style",
          profile: "cinematic",
          source: "save_profile",
        },
      ],
    );

    expect(state.requiredPresetSkillPaths).toEqual([
      "skills/presets/runtime/narrative-style/SKILL.md",
      "skills/presets/runtime/world-disposition/SKILL.md",
    ]);
    expect(state.requiredPresetSkillRequirements).toEqual([
      {
        path: "skills/presets/runtime/narrative-style/SKILL.md",
        tag: "narrative_style",
        profile: "cinematic",
        source: "save_profile",
      },
    ]);
  });
});
