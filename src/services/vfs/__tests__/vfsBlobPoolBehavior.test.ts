import { describe, expect, it } from "vitest";
import { InMemoryVfsStore } from "../store";

describe("VFS blob pool behavior", () => {
  it("scopes identical content blobs per save", async () => {
    const store = new InMemoryVfsStore() as any;

    const sharedFile = {
      path: "world/global.json",
      content: '{"clock":"day-1"}',
      contentType: "application/json" as const,
      hash: "legacy-hash",
      size: 17,
      updatedAt: 1,
    };

    await store.saveSnapshot({
      saveId: "save-a",
      forkId: 0,
      turn: 0,
      createdAt: 1,
      files: { [sharedFile.path]: sharedFile },
    });

    await store.saveSnapshot({
      saveId: "save-b",
      forkId: 0,
      turn: 0,
      createdAt: 1,
      files: { [sharedFile.path]: sharedFile },
    });

    expect(store.blobs.size).toBe(2);
    const blobKeys = Array.from(store.blobs.keys()) as string[];
    blobKeys.sort();
    expect(blobKeys[0].startsWith("save-a:")).toBe(true);
    expect(blobKeys[1].startsWith("save-b:")).toBe(true);
  });

  it("loads snapshot even when some blobs are missing by skipping broken refs", async () => {
    const store = new InMemoryVfsStore() as any;

    await store.saveSnapshot({
      saveId: "save-a",
      forkId: 0,
      turn: 1,
      createdAt: 1,
      files: {
        "world/global.json": {
          path: "world/global.json",
          content: '{"clock":"day-1"}',
          contentType: "application/json",
          hash: "legacy-global",
          size: 17,
          updatedAt: 1,
        },
        "world/story.json": {
          path: "world/story.json",
          content: '{"title":"x"}',
          contentType: "application/json",
          hash: "legacy-story",
          size: 13,
          updatedAt: 1,
        },
      },
    });

    const snapshotRecord = store.snapshots.get("save-a:0:1");
    const anyRef = Object.values(snapshotRecord.fileRefs)[0] as {
      blobId: string;
    };
    store.blobs.delete(`save-a:${anyRef.blobId}`);

    const restored = await store.loadSnapshot("save-a", 0, 1);
    expect(restored).not.toBeNull();
    expect(Object.keys(restored!.files).length).toBe(1);
  });
});
