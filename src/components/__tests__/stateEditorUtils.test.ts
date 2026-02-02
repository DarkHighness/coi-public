import { describe, it, expect, vi } from "vitest";
import { VfsSession } from "../../services/vfs/vfsSession";
import { applyVfsStateEdit } from "../stateEditorUtils";
import { applySectionEdit } from "../../services/vfs/editor";
import { deriveGameStateFromVfs } from "../../services/vfs/derivations";
import { mergeDerivedViewState } from "../../hooks/vfsViewState";

const mockDerivedState = { derived: true } as any;
const mockMergedState = { merged: true } as any;

vi.mock("../../services/vfs/editor", () => ({
  applySectionEdit: vi.fn(),
}));

vi.mock("../../services/vfs/derivations", () => ({
  deriveGameStateFromVfs: vi.fn(() => mockDerivedState),
}));

vi.mock("../../hooks/vfsViewState", () => ({
  mergeDerivedViewState: vi.fn(() => mockMergedState),
}));

describe("stateEditorUtils", () => {
  it("applies VFS section edits and merges derived state", () => {
    const session = new VfsSession();
    const baseState = { base: true } as any;

    const result = applyVfsStateEdit({
      session,
      section: "global",
      data: { time: "Night 1" },
      baseState,
    });

    expect(applySectionEdit).toHaveBeenCalledWith(
      session,
      "global",
      { time: "Night 1" },
      undefined,
    );
    expect(deriveGameStateFromVfs).toHaveBeenCalledWith(session.snapshot());
    expect(mergeDerivedViewState).toHaveBeenCalledWith(
      baseState,
      mockDerivedState,
    );
    expect(result).toBe(mockMergedState);
  });
});
