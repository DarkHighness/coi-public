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
            path: "current/world/global.json",
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
      { path: "current/world/global.json" },
      ctx,
    ) as { success: boolean; data?: { content?: string } };

    expect(readResult.success).toBe(true);
    expect(readResult.data?.content).toBe("{}");
  });

  it("falls back to text search for semantic queries", () => {
    const session = new VfsSession();
    const ctx = { db: {} as GameDatabase, vfsSession: session };

    session.writeFile("world/global.json", "hello world", "text/plain");

    const searchResult = dispatchToolCall(
      "vfs_search",
      { query: "hello", semantic: true },
      ctx,
    ) as { success: boolean; data?: { results?: Array<{ text: string }> } };

    expect(searchResult.success).toBe(true);
    expect(searchResult.data?.results?.[0]?.text).toContain("hello");
  });

  it("rejects non-current paths and returns current-prefixed paths", () => {
    const session = new VfsSession();
    const ctx = { db: {} as GameDatabase, vfsSession: session };

    const badWrite = dispatchToolCall(
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
    ) as { success: boolean };

    expect(badWrite.success).toBe(false);

    const okWrite = dispatchToolCall(
      "vfs_write",
      {
        files: [
          {
            path: "current/world/global.json",
            content: "{}",
            contentType: "application/json",
          },
        ],
      },
      ctx,
    ) as { success: boolean };

    expect(okWrite.success).toBe(true);

    const readResult = dispatchToolCall(
      "vfs_read",
      { path: "current/world/global.json" },
      ctx,
    ) as { success: boolean; data?: { path?: string } };

    expect(readResult.success).toBe(true);
    expect(readResult.data?.path).toBe("current/world/global.json");
  });
});
