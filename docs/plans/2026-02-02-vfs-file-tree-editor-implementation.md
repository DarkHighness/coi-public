# VFS File Tree StateEditor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the StateEditor with a VFS file tree editor that reads/writes VFS files, validates JSON/schema, and re-derives view state after edits.

**Architecture:** Build a tree from `vfsSession.snapshot()` and render it as a navigable file tree. A file editor panel reads/writes VFS files, validates JSON and schemas when available, then re-derives view state with `deriveGameStateFromVfs` + `mergeDerivedViewState`. Outline and conversation files are protected by explicit toggles.

**Tech Stack:** React + TypeScript, VFS session helpers, Vitest.

---

### Task 1: VFS tree builder + read-only rules

**Files:**

- Create: `src/components/vfsExplorer/tree.ts`
- Test: `src/components/__tests__/vfsTree.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildVfsTree, isReadonlyPath } from "../vfsExplorer/tree";

describe("vfs tree builder", () => {
  it("builds a current/ rooted tree from snapshot paths", () => {
    const tree = buildVfsTree({
      "world/global.json": { path: "world/global.json" } as any,
      "conversation/index.json": { path: "conversation/index.json" } as any,
    });
    expect(tree.name).toBe("current");
    expect(tree.children?.some((n) => n.name === "world")).toBe(true);
  });

  it("marks outline/conversation as readonly by default", () => {
    expect(isReadonlyPath("outline/outline.json", false, false)).toBe(true);
    expect(isReadonlyPath("conversation/index.json", false, false)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/__tests__/vfsTree.test.ts`  
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

Create `buildVfsTree(files)` that:

- Accepts a VFS snapshot map and builds a nested tree.
- Uses display root `current/` but stores relative paths (no `current/`).
- Sorts folders before files.

Add `isReadonlyPath(path, allowOutlineEdit, allowConversationEdit)`:

- `outline/outline.json` readonly unless allowOutlineEdit.
- `conversation/**` readonly unless allowConversationEdit.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/__tests__/vfsTree.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/vfsExplorer/tree.ts src/components/__tests__/vfsTree.test.ts
git commit -m "[Feat]: add VFS file tree helpers"
```

---

### Task 2: File read/write helpers with JSON + schema validation

**Files:**

- Create: `src/components/vfsExplorer/fileOps.ts`
- Test: `src/components/__tests__/vfsFileOps.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { VfsSession } from "../../services/vfs/vfsSession";
import { writeVfsFile } from "../vfsExplorer/fileOps";

describe("vfs file ops", () => {
  it("validates JSON when contentType is application/json", () => {
    const session = new VfsSession();
    expect(() =>
      writeVfsFile(session, "world/global.json", "{", "application/json"),
    ).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/__tests__/vfsFileOps.test.ts`  
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

Implement:

- `readVfsFile(session, path)` -> `{ content, contentType } | null`
- `formatVfsContent(content, contentType)` -> pretty JSON if JSON
- `writeVfsFile(session, path, content, contentType)`:
  - If JSON: parse, then attempt schema validation with `getSchemaForPath`.
  - If schema missing, allow JSON without schema.
  - Write via `session.writeFile`.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/__tests__/vfsFileOps.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/vfsExplorer/fileOps.ts src/components/__tests__/vfsFileOps.test.ts
git commit -m "[Feat]: add VFS file ops helpers"
```

---

### Task 3: Replace StateEditor UI with file tree editor

**Files:**

- Modify: `src/components/StateEditor.tsx`
- Modify: `src/components/stateEditorUtils.ts`
- Test: `src/components/__tests__/stateEditorUtils.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { VfsSession } from "../../services/vfs/vfsSession";
import { applyVfsFileEdit } from "../stateEditorUtils";
import { writeVfsFile } from "../vfsExplorer/fileOps";

vi.mock("../vfsExplorer/fileOps", () => ({ writeVfsFile: vi.fn() }));

it("applies file edits then re-derives view state", () => {
  const session = new VfsSession();
  const baseState = {} as any;
  applyVfsFileEdit({
    session,
    path: "world/global.json",
    content: "{}",
    contentType: "application/json",
    baseState,
  });
  expect(writeVfsFile).toHaveBeenCalled();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/__tests__/stateEditorUtils.test.ts`  
Expected: FAIL

**Step 3: Write minimal implementation**

1. Extend `stateEditorUtils.ts` with `applyVfsFileEdit(...)`:
   - Use `writeVfsFile`.
   - Re-derive with `deriveGameStateFromVfs` + `mergeDerivedViewState`.

2. Replace `StateEditor.tsx` UI:
   - Left file tree from `buildVfsTree(snapshot)`.
   - Search filter input (path + content).
   - Toggle “Allow /sudo outline edit”.
   - Toggle “Unlock conversation editing”.
   - Right editor shows file content and Save/Format/Reset.
   - Save uses `applyVfsFileEdit` and `triggerSave()`.
   - Outline + conversation read-only by default.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/__tests__/stateEditorUtils.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/StateEditor.tsx src/components/stateEditorUtils.ts src/components/__tests__/stateEditorUtils.test.ts
git commit -m "[Refactor]: replace StateEditor with VFS file tree editor"
```

---

### Task 4: Localization updates

**Files:**

- Modify: `src/locales/en/translation.json`
- Modify: `src/locales/zh/translation.json`

**Step 1: Update translations**

Add keys under `stateEditor` for:

- `fileTree`, `searchPlaceholder`, `newFile`, `newFolder`, `rename`, `delete`, `save`
- `readOnly`, `allowOutlineEdit`, `unlockConversationEdit`, `invalidSchema`

**Step 2: Commit**

```bash
git add src/locales/en/translation.json src/locales/zh/translation.json
git commit -m "[Feat]: add VFS editor i18n strings"
```

---

### Task 5: Final verification

**Step 1: Run tests**

Run: `pnpm vitest run`  
Expected: PASS (note baseline buildInfo failure if still present)

**Step 2: Document failures if any**

If `buildInfo` is still missing, list failing suites explicitly in summary.

---

**Plan complete.**
