import { describe, expect, it, vi } from "vitest";
import { ensureRagSaveContext } from "./rag";

const forkTree = {
  nodes: {
    0: { id: 0, parentId: null },
  },
} as any;

describe("ensureRagSaveContext", () => {
  it("returns false when save id is missing", async () => {
    const switchSave = vi.fn(async () => true);

    await expect(
      ensureRagSaveContext({
        embeddingEnabled: true,
        ragInitialized: true,
        saveId: "",
        forkId: 1,
        forkTree,
        switchSave,
      }),
    ).resolves.toBe(false);

    expect(switchSave).not.toHaveBeenCalled();
  });

  it("returns false when embedding disabled or rag not initialized", async () => {
    const switchSave = vi.fn(async () => true);

    await expect(
      ensureRagSaveContext({
        embeddingEnabled: false,
        ragInitialized: true,
        saveId: "save-a",
        forkId: 1,
        forkTree,
        switchSave,
      }),
    ).resolves.toBe(false);

    await expect(
      ensureRagSaveContext({
        embeddingEnabled: true,
        ragInitialized: false,
        saveId: "save-a",
        forkId: 1,
        forkTree,
        switchSave,
      }),
    ).resolves.toBe(false);

    expect(switchSave).not.toHaveBeenCalled();
  });

  it("delegates to switchSave and returns its result", async () => {
    const switchSave = vi.fn(async () => true);

    await expect(
      ensureRagSaveContext({
        embeddingEnabled: true,
        ragInitialized: true,
        saveId: "save-a",
        forkId: 3,
        forkTree,
        switchSave,
      }),
    ).resolves.toBe(true);

    expect(switchSave).toHaveBeenCalledWith("save-a", 3, forkTree);
  });

  it("returns false and logs error when switchSave throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const switchSave = vi.fn(async () => {
      throw new Error("network");
    });

    await expect(
      ensureRagSaveContext({
        embeddingEnabled: true,
        ragInitialized: true,
        saveId: "save-a",
        forkId: 3,
        forkTree,
        switchSave,
      }),
    ).resolves.toBe(false);

    expect(errorSpy).toHaveBeenCalled();
  });
});
