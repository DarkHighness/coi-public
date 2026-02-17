import { describe, expect, it } from "vitest";
import type { VfsFileMap } from "@/services/vfs/types";
import {
  diffSnapshotFiles,
  extractFileChunksFromSnapshot,
} from "../vfsExtraction";

const createFile = (
  path: string,
  content: string,
  contentType: "application/json" | "text/markdown" | "text/plain",
  hash: string,
) => ({
  path,
  content,
  contentType,
  hash,
  size: content.length,
  updatedAt: 1,
});

describe("vfsExtraction", () => {
  it("extracts JSON chunks with per-file overlap strategy", () => {
    const largeJson = JSON.stringify(
      {
        world: {
          title: "Arcadia",
          npcs: Array.from({ length: 6 }, (_, index) => ({
            id: `npc-${index}`,
            profile: {
              bio: `Bio-${index}-` + "x".repeat(820),
              hidden: `Secret-${index}-` + "y".repeat(820),
            },
          })),
        },
      },
      null,
      2,
    );

    const snapshot: VfsFileMap = {
      "current/world/global.json": createFile(
        "current/world/global.json",
        largeJson,
        "application/json",
        "hash-json-1",
      ),
    };

    const chunks = extractFileChunksFromSnapshot(snapshot, {
      saveId: "save-1",
      forkId: 0,
      turnNumber: 3,
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(
      chunks.every((chunk) => chunk.chunkMeta?.strategy === "text_window"),
    ).toBe(true);
    expect(chunks.some((chunk) => chunk.content.includes('"npcs"'))).toBe(true);
    expect(chunks.some((chunk) => chunk.content.includes("path:"))).toBe(false);
  });

  it("uses file-level overlap chunking for large JSON arrays", () => {
    const largeJson = JSON.stringify(
      {
        conversation: Array.from({ length: 140 }, (_, index) => ({
          role: index % 2 === 0 ? "user" : "assistant",
          content: `message-${index}-` + "z".repeat(180),
        })),
      },
      null,
      2,
    );

    const snapshot: VfsFileMap = {
      "current/conversation/history.json": createFile(
        "current/conversation/history.json",
        largeJson,
        "application/json",
        "hash-json-conversation",
      ),
    };

    const chunks = extractFileChunksFromSnapshot(snapshot, {
      saveId: "save-1",
      forkId: 0,
      turnNumber: 3,
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(
      chunks.every((chunk) => chunk.chunkMeta?.strategy === "text_window"),
    ).toBe(true);
    expect(
      chunks.every(
        (chunk) =>
          !chunk.content.includes("path: conversation[") &&
          !chunk.content.includes("heading_path:"),
      ),
    ).toBe(true);
  });

  it("extracts Markdown chunks with the same overlap strategy", () => {
    const markdown = [
      "# Chapter One",
      "",
      "## Scene Alpha",
      "",
      "Alpha paragraph " + "a".repeat(3600),
      "",
      "## Scene Beta",
      "",
      "Beta paragraph " + "b".repeat(3600),
    ].join("\n");

    const snapshot: VfsFileMap = {
      "current/world/notes.md": createFile(
        "current/world/notes.md",
        markdown,
        "text/markdown",
        "hash-md-1",
      ),
    };

    const chunks = extractFileChunksFromSnapshot(snapshot, {
      saveId: "save-1",
      forkId: 0,
      turnNumber: 3,
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(
      chunks.every((chunk) => chunk.chunkMeta?.strategy === "text_window"),
    ).toBe(true);
    expect(
      chunks.some((chunk) => chunk.content.includes("## Scene Alpha")),
    ).toBe(true);
  });

  it("applies adaptive overlap for text chunks", () => {
    const text = Array.from({ length: 12 }, (_, index) => {
      return `Paragraph ${index} ` + "lorem ipsum ".repeat(80);
    }).join("\n\n");

    const snapshot: VfsFileMap = {
      "current/world/plain.txt": createFile(
        "current/world/plain.txt",
        text,
        "text/plain",
        "hash-text-1",
      ),
    };

    const chunks = extractFileChunksFromSnapshot(snapshot, {
      saveId: "save-1",
      forkId: 0,
      turnNumber: 3,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(
      chunks.every((chunk) => chunk.chunkMeta?.strategy === "text_window"),
    ).toBe(true);

    const overlapValues = chunks
      .map((chunk) => chunk.chunkMeta?.overlapChars ?? 0)
      .slice(1);

    expect(overlapValues.every((value) => value >= 0 && value <= 1600)).toBe(
      true,
    );
    expect(overlapValues.some((value) => value >= 700)).toBe(true);
  });

  it("keeps huge JSON chunking at file level without path fan-out", () => {
    const hugeObject = {
      entries: Object.fromEntries(
        Array.from({ length: 420 }, (_, index) => [
          `node_${index}`,
          {
            name: `name-${index}`,
            notes: `notes-${index}-` + "x".repeat(220),
            flags: {
              active: index % 2 === 0,
              rank: index,
            },
          },
        ]),
      ),
    };

    const snapshot: VfsFileMap = {
      "current/world/huge.json": createFile(
        "current/world/huge.json",
        JSON.stringify(hugeObject, null, 2),
        "application/json",
        "hash-json-huge",
      ),
    };

    const chunks = extractFileChunksFromSnapshot(snapshot, {
      saveId: "save-1",
      forkId: 0,
      turnNumber: 3,
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.length).toBeLessThanOrEqual(36);
    expect(chunks.some((chunk) => chunk.content.includes('"entries"'))).toBe(
      true,
    );
    expect(chunks.some((chunk) => chunk.content.includes("path: $"))).toBe(
      false,
    );
  });

  it("caps per-file chunk count to avoid runaway indexing", () => {
    const text = Array.from({ length: 1200 }, (_, index) => {
      return `Paragraph ${index} ` + "lorem ipsum ".repeat(90);
    }).join("\n\n");

    const snapshot: VfsFileMap = {
      "current/world/very-long.txt": createFile(
        "current/world/very-long.txt",
        text,
        "text/plain",
        "hash-text-long",
      ),
    };

    const chunks = extractFileChunksFromSnapshot(snapshot, {
      saveId: "save-1",
      forkId: 0,
      turnNumber: 3,
    });

    expect(chunks.length).toBeLessThanOrEqual(36);
  });

  it("diffs snapshots by changed and removed paths", () => {
    const previous: VfsFileMap = {
      "current/world/a.json": createFile(
        "current/world/a.json",
        '{"a":1}',
        "application/json",
        "hash-a-1",
      ),
      "current/world/b.json": createFile(
        "current/world/b.json",
        '{"b":1}',
        "application/json",
        "hash-b-1",
      ),
    };

    const next: VfsFileMap = {
      "current/world/a.json": createFile(
        "current/world/a.json",
        '{"a":2}',
        "application/json",
        "hash-a-2",
      ),
      "current/world/c.json": createFile(
        "current/world/c.json",
        '{"c":1}',
        "application/json",
        "hash-c-1",
      ),
    };

    const diff = diffSnapshotFiles(previous, next);

    expect(diff.changedPaths).toEqual(
      expect.arrayContaining(["current/world/a.json", "current/world/c.json"]),
    );
    expect(diff.removedPaths).toEqual(["current/world/b.json"]);
  });
});
