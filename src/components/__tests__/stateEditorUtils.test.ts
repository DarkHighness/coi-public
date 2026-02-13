import { beforeEach, describe, expect, it, vi } from "vitest";
import { VfsSession } from "../../services/vfs/vfsSession";
import {
  applyVfsBatchMoveFiles,
  applyVfsDeletePath,
  applyVfsFileEdit,
  applyVfsRenamePath,
  applyVfsStateEdit,
} from "../stateEditorUtils";
import { applySectionEdit } from "../../services/vfs/editor";
import { deriveGameStateFromVfs } from "../../services/vfs/derivations";
import { mergeDerivedViewState } from "../../hooks/vfsViewState";
import { writeVfsFile } from "../vfsExplorer/fileOps";

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

vi.mock("../vfsExplorer/fileOps", () => ({
  writeVfsFile: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

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

  it("applies file edits then re-derives view state", () => {
    const session = new VfsSession();
    const baseState = { base: true } as any;

    const result = applyVfsFileEdit({
      session,
      path: "world/global.json",
      content: "{}",
      contentType: "application/json",
      baseState,
    });

    expect(writeVfsFile).toHaveBeenCalledWith(
      session,
      "world/global.json",
      "{}",
      "application/json",
      undefined,
    );
    expect(deriveGameStateFromVfs).toHaveBeenCalledWith(session.snapshot());
    expect(mergeDerivedViewState).toHaveBeenCalledWith(
      baseState,
      mockDerivedState,
    );
    expect(result).toBe(mockMergedState);
  });

  it("blocks deleting README files directly", () => {
    const session = new VfsSession();
    const baseState = { base: true } as any;
    session.writeFile("sandbox/docs/README.md", "# Docs", "text/markdown");

    expect(() =>
      applyVfsDeletePath({
        session,
        path: "sandbox/docs/README.md",
        isFolder: false,
        baseState,
      }),
    ).toThrow("README files are locked and cannot be deleted.");
  });

  it("allows renaming non-scaffold folders with README markers", () => {
    const session = new VfsSession();
    const baseState = { base: true } as any;
    session.writeFile("sandbox/docs/README.md", "# Docs", "text/markdown");
    session.writeFile("sandbox/docs/spec.md", "content", "text/markdown");

    applyVfsRenamePath({
      session,
      fromPath: "sandbox/docs",
      toPath: "sandbox/docs-renamed",
      isFolder: true,
      baseState,
    });

    expect(session.readFile("sandbox/docs/README.md")).toBeNull();
    expect(session.readFile("sandbox/docs/spec.md")).toBeNull();
    expect(session.readFile("sandbox/docs-renamed/README.md")).toBeTruthy();
    expect(session.readFile("sandbox/docs-renamed/spec.md")).toBeTruthy();
  });

  it("blocks deleting scaffold directories", () => {
    const session = new VfsSession();
    const baseState = { base: true } as any;

    expect(() =>
      applyVfsDeletePath({
        session,
        path: "custom_rules/00-system-core",
        isFolder: true,
        baseState,
      }),
    ).toThrow("Scaffold folders are locked and cannot be deleted.");
  });
  it("moves selected files in one derived pass", () => {
    const session = new VfsSession();
    const baseState = { base: true } as any;

    session.writeFile("sandbox/source/a.md", "A", "text/markdown");
    session.writeFile("sandbox/source/b.md", "B", "text/markdown");
    session.writeFile("sandbox/target/README.md", "# Target", "text/markdown");

    const result = applyVfsBatchMoveFiles({
      session,
      sourcePaths: ["sandbox/source/a.md", "sandbox/source/b.md"],
      targetDirectory: "sandbox/target",
      baseState,
    });

    expect(result).toBe(mockMergedState);
    expect(session.readFile("sandbox/source/a.md")).toBeNull();
    expect(session.readFile("sandbox/source/b.md")).toBeNull();
    expect(session.readFile("sandbox/target/a.md")).toBeTruthy();
    expect(session.readFile("sandbox/target/b.md")).toBeTruthy();
    expect(deriveGameStateFromVfs).toHaveBeenCalledTimes(1);
    expect(mergeDerivedViewState).toHaveBeenCalledTimes(1);
  });

  it("fails atomically when destination contains conflicts", () => {
    const session = new VfsSession();
    const baseState = { base: true } as any;

    session.writeFile("sandbox/source/a.md", "A", "text/markdown");
    session.writeFile("sandbox/source/b.md", "B", "text/markdown");
    session.writeFile("sandbox/target/README.md", "# Target", "text/markdown");
    session.writeFile("sandbox/target/a.md", "existing", "text/markdown");

    expect(() =>
      applyVfsBatchMoveFiles({
        session,
        sourcePaths: ["sandbox/source/a.md", "sandbox/source/b.md"],
        targetDirectory: "sandbox/target",
        baseState,
      }),
    ).toThrow("Target already exists: sandbox/target/a.md");

    expect(session.readFile("sandbox/source/a.md")).toBeTruthy();
    expect(session.readFile("sandbox/source/b.md")).toBeTruthy();
    expect(session.readFile("sandbox/target/a.md")?.content).toBe("existing");
    expect(session.readFile("sandbox/target/b.md")).toBeNull();
  });

  it("rejects directory inputs for batch move", () => {
    const session = new VfsSession();
    const baseState = { base: true } as any;

    session.writeFile(
      "sandbox/source/docs/README.md",
      "# Docs",
      "text/markdown",
    );
    session.writeFile("sandbox/source/docs/file.md", "F", "text/markdown");
    session.writeFile("sandbox/target/README.md", "# Target", "text/markdown");

    expect(() =>
      applyVfsBatchMoveFiles({
        session,
        sourcePaths: ["sandbox/source/docs"],
        targetDirectory: "sandbox/target",
        baseState,
      }),
    ).toThrow("Batch move only supports files: sandbox/source/docs");
  });

  it("rejects target paths that are files", () => {
    const session = new VfsSession();
    const baseState = { base: true } as any;

    session.writeFile("sandbox/source/a.md", "A", "text/markdown");
    session.writeFile("sandbox/target.md", "file", "text/markdown");

    expect(() =>
      applyVfsBatchMoveFiles({
        session,
        sourcePaths: ["sandbox/source/a.md"],
        targetDirectory: "sandbox/target.md",
        baseState,
      }),
    ).toThrow("Target must be a directory path.");
  });

  it("rejects batch move when source list is empty", () => {
    const session = new VfsSession();
    const baseState = { base: true } as any;

    session.writeFile("sandbox/target/README.md", "# Target", "text/markdown");

    expect(() =>
      applyVfsBatchMoveFiles({
        session,
        sourcePaths: [],
        targetDirectory: "sandbox/target",
        baseState,
      }),
    ).toThrow("No source files selected for batch move.");
  });

  it("rejects batch move when files would collide by filename", () => {
    const session = new VfsSession();
    const baseState = { base: true } as any;

    session.writeFile("sandbox/source-a/shared.md", "A", "text/markdown");
    session.writeFile("sandbox/source-b/shared.md", "B", "text/markdown");
    session.writeFile("sandbox/target/README.md", "# Target", "text/markdown");

    expect(() =>
      applyVfsBatchMoveFiles({
        session,
        sourcePaths: [
          "sandbox/source-a/shared.md",
          "sandbox/source-b/shared.md",
        ],
        targetDirectory: "sandbox/target",
        baseState,
      }),
    ).toThrow("Target filename conflict within batch: shared.md");

    expect(session.readFile("sandbox/source-a/shared.md")).toBeTruthy();
    expect(session.readFile("sandbox/source-b/shared.md")).toBeTruthy();
    expect(session.readFile("sandbox/target/shared.md")).toBeNull();
  });

  it("rejects batch move when source file does not exist", () => {
    const session = new VfsSession();
    const baseState = { base: true } as any;

    session.writeFile("sandbox/target/README.md", "# Target", "text/markdown");

    expect(() =>
      applyVfsBatchMoveFiles({
        session,
        sourcePaths: ["sandbox/source/missing.md"],
        targetDirectory: "sandbox/target",
        baseState,
      }),
    ).toThrow("Source file not found: sandbox/source/missing.md");
  });
});
