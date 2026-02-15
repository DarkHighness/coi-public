import { describe, expect, it } from "vitest";
import { VfsSession } from "../../vfs/vfsSession";
import { dispatchToolCall, dispatchToolCallAsync } from "../handlers";
import { createSummaryPayload } from "./vfsHandlers.helpers";

describe("VFS handlers search/commit", () => {
  it("supports regex/fuzzy search and validates invalid regex", async () => {
    const session = new VfsSession();
    session.writeFile("world/notes.md", "dragon knight", "text/markdown");
    const ctx = { vfsSession: session, embeddingEnabled: false };

    const regex = (await dispatchToolCallAsync(
      "vfs_search",
      { query: "drag.n", regex: true, path: "current/world" },
      ctx,
    )) as any;

    expect(regex.success).toBe(true);
    expect(regex.data.results[0].path).toBe("current/world/notes.md");

    const fuzzy = (await dispatchToolCallAsync(
      "vfs_search",
      { query: "dragn", fuzzy: true, path: "current/world" },
      ctx,
    )) as any;

    expect(fuzzy.success).toBe(true);
    expect(fuzzy.data.results[0].path).toBe("current/world/notes.md");

    const invalidRegex = (await dispatchToolCallAsync(
      "vfs_search",
      { query: "[", regex: true, path: "current/world" },
      ctx,
    )) as any;

    expect(invalidRegex.success).toBe(false);
    expect(invalidRegex.code).toBe("INVALID_DATA");
  });

  it("returns RAG_DISABLED when semantic search is requested without embeddings", async () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session, embeddingEnabled: false };

    const result = (await dispatchToolCallAsync(
      "vfs_search",
      { query: "anything", semantic: true },
      ctx,
    )) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("RAG_DISABLED");
  });

  it("commits turn with finish tool and updates conversation index", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const commit = dispatchToolCall(
      "vfs_commit_turn",
      {
        userAction: "look around",
        assistant: {
          narrative: "You scan the room.",
          choices: [{ text: "Inspect desk" }, { text: "Open door" }],
        },
      },
      ctx,
    ) as any;

    expect(commit.success).toBe(true);
    expect(commit.data.turnId).toBe("fork-0/turn-1");

    const index = dispatchToolCall(
      "vfs_read",
      { path: "current/conversation/index.json" },
      ctx,
    ) as any;

    expect(index.success).toBe(true);
    expect(JSON.parse(index.data.content).activeTurnId).toBe("fork-0/turn-1");
  });

  it("validates and commits summary via finish tool", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const invalid = dispatchToolCall(
      "vfs_commit_summary",
      {
        ...createSummaryPayload(),
      },
      ctx,
    ) as any;

    expect(invalid.success).toBe(false);
    expect(invalid.code).toBe("INVALID_DATA");

    const commit = dispatchToolCall(
      "vfs_commit_summary",
      {
        ...createSummaryPayload(),
        nodeRange: { fromIndex: 0, toIndex: 0 },
        lastSummarizedIndex: 1,
      },
      ctx,
    ) as any;

    expect(commit.success).toBe(true);
    expect(commit.data.path).toBe("current/summary/state.json");

    const summaryState = dispatchToolCall(
      "vfs_read",
      {
        path: "current/summary/state.json",
        mode: "json",
        pointers: ["/lastSummarizedIndex", "/summaries/0/displayText"],
      },
      ctx,
    ) as any;

    expect(summaryState.success).toBe(true);
    expect(summaryState.data.extracts[0].json).toBe("1");
    expect(summaryState.data.extracts[1].json).toBe('"A short recap."');
  });

  it("commits soul markdown with dedicated finish tool", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const invalid = dispatchToolCall("vfs_commit_soul", {}, ctx) as any;
    expect(invalid.success).toBe(false);

    const commit = dispatchToolCall(
      "vfs_commit_soul",
      {
        currentSoul: "# Player Soul (This Save)\n\n## Guidance For AI\n- Keep concise.\n",
        globalSoul: "# Player Soul (Global)\n\n## Guidance For AI\n- Reduce AI flavor.\n",
      },
      ctx,
    ) as any;

    expect(commit.success).toBe(true);
    expect(commit.data.updated).toContain("current/world/soul.md");
    expect(commit.data.updated).toContain("current/world/global/soul.md");

    const currentSoul = dispatchToolCall(
      "vfs_read",
      { path: "current/world/soul.md" },
      ctx,
    ) as any;
    expect(currentSoul.success).toBe(true);
    expect(currentSoul.data.content).toContain("Player Soul (This Save)");

    const globalSoul = dispatchToolCall(
      "vfs_read",
      { path: "current/world/global/soul.md" },
      ctx,
    ) as any;
    expect(globalSoul.success).toBe(true);
    expect(globalSoul.data.content).toContain("Player Soul (Global)");
  });
});
