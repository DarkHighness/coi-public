import { describe, expect, it } from "vitest";
import { buildRagDocumentId } from "../documentId";

describe("buildRagDocumentId", () => {
  it("includes forkId to avoid cross-fork collisions", () => {
    const base = {
      saveId: "save-1",
      sourcePath: "world/a.txt",
      canonicalPath: "forks/0/world/a.txt",
      fileHash: "hash-123",
      chunkIndex: 0,
      provider: "local_transformers",
      modelId: "Xenova/all-MiniLM-L6-v2",
    };

    const idFork0 = buildRagDocumentId({ ...base, forkId: 0 });
    const idFork2 = buildRagDocumentId({ ...base, forkId: 2 });

    expect(idFork0).not.toBe(idFork2);
  });

  it("falls back to sourcePath when canonicalPath is missing", () => {
    const id = buildRagDocumentId({
      saveId: "save-2",
      forkId: 1,
      sourcePath: "world/notes.md",
      fileHash: "hash-xyz",
      chunkIndex: 3,
      provider: "openai",
      modelId: "text-embedding-3-small",
    });

    expect(id).toContain(
      "save-2::1::world/notes.md::hash-xyz::3::openai::text-embedding-3-small",
    );
  });
});
