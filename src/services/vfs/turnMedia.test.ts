import { describe, expect, it } from "vitest";
import { readTurnFile, writeTurnFile } from "./conversation";
import { patchTurnMediaAtTurn, patchTurnMediaForNode } from "./turnMedia";
import { VfsSession } from "./vfsSession";

describe("turnMedia", () => {
  it("patches turn media for a model node", () => {
    const session = new VfsSession();
    writeTurnFile(session, 1, 2, {
      turnId: "fork-1/turn-2",
      forkId: 1,
      turnNumber: 2,
      parentTurnId: "fork-1/turn-1",
      createdAt: 1,
      userAction: "Inspect relic",
      assistant: {
        narrative: "The relic hums.",
        choices: [],
      },
      media: {
        foo: "bar",
        imageUrl: "https://legacy.example/image.png",
      },
    });

    const patched = patchTurnMediaForNode(session, "model-fork-1/turn-2", {
      imageId: "img-9",
      imageUrl: null,
    });

    expect(patched).toBe(true);

    const stored = readTurnFile(session.snapshot(), 1, 2);
    expect(stored?.media).toMatchObject({
      foo: "bar",
      imageId: "img-9",
    });
    expect(
      (stored?.media as Record<string, unknown>)?.imageUrl,
    ).toBeUndefined();
  });

  it("removes media object when the last media key is cleared", () => {
    const session = new VfsSession();
    writeTurnFile(session, 0, 0, {
      turnId: "fork-0/turn-0",
      forkId: 0,
      turnNumber: 0,
      parentTurnId: null,
      createdAt: 1,
      userAction: "",
      assistant: {
        narrative: "Opening scene.",
        choices: [],
      },
      media: {
        imageId: "img-1",
      },
    });

    const patched = patchTurnMediaAtTurn(session, 0, 0, {
      imageId: null,
    });

    expect(patched).toBe(true);
    const stored = readTurnFile(session.snapshot(), 0, 0);
    expect(stored?.media).toBeUndefined();
  });

  it("returns false when node id cannot be mapped to a turn", () => {
    const session = new VfsSession();
    const patched = patchTurnMediaForNode(session, "model-root", {
      imageId: "img-x",
    });
    expect(patched).toBe(false);
  });
});
