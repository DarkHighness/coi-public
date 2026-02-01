import { describe, it, expect } from "vitest";
import { VfsSession } from "../../vfs/vfsSession";
import { dispatchToolCall } from "../handlers";
import type { GameDatabase } from "../../gameDatabase";

describe("VFS handlers", () => {
  it("writes and reads files via dispatch", () => {
    const session = new VfsSession();
    const ctx = { db: {} as GameDatabase, vfsSession: session };

    const writeResult = dispatchToolCall(
      "vfs_write",
      {
        files: [
          {
            path: "world/global.json",
            content: "{}",
            contentType: "application/json",
          },
        ],
      },
      ctx,
    ) as { success: boolean; data?: { written?: string[] } };

    expect(writeResult.success).toBe(true);

    const readResult = dispatchToolCall(
      "vfs_read",
      { path: "world/global.json" },
      ctx,
    ) as { success: boolean; data?: { content?: string } };

    expect(readResult.success).toBe(true);
    expect(readResult.data?.content).toBe("{}");
  });

  it("rejects semantic search when unavailable", () => {
    const session = new VfsSession();
    const ctx = { db: {} as GameDatabase, vfsSession: session };

    const searchResult = dispatchToolCall(
      "vfs_search",
      { query: "foo", semantic: true },
      ctx,
    ) as { success: boolean; code?: string };

    expect(searchResult.success).toBe(false);
    expect(searchResult.code).toBe("INVALID_DATA");
  });
});
