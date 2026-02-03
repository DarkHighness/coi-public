# VFS Prompt + StateEditor Update Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update prompts to document VFS-only tooling + outline rules, and refactor StateEditor to write via VFS instead of mutating GameState.

**Architecture:** Centralize VFS workflow + outline immutability rules in prompts, remove legacy tool references, and implement a VFS editor helper that writes section edits as files. StateEditor calls that helper, then re-derives view state from VFS.

**Tech Stack:** React + TypeScript, VFS session/store, Vitest.

**Baseline Note:** `pnpm vitest run` currently fails if `src/utils/constants/buildInfo` is missing. Proceed and note these failures as baseline if still present.

---

### Task 1: Prompt rules for outline immutability + VFS layout

**Files:**
- Modify: `src/services/prompts/atoms/core/stateManagement.ts`
- Test: `src/services/prompts/atoms/core/__tests__/stateManagement.test.ts`

**Step 1: Write the failing test**

```ts
// add to stateManagement.test.ts
it("documents outline immutability and VFS outline paths", () => {
  const content = stateManagement();
  expect(content).toContain("current/outline/outline.json");
  expect(content).toContain("current/outline/progress.json");
  expect(content).toContain("outline is immutable");
  expect(content).toContain("sudo");
  expect(content).toContain("god mode");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/prompts/atoms/core/__tests__/stateManagement.test.ts`  
Expected: FAIL (missing outline rules)

**Step 3: Write minimal implementation**

- Add a **VFS Outline Rules** block to `stateManagement()`:
  - Default: outline is immutable
  - Only editable in sudo/god **and** explicit user request
  - If edited, write directly to `current/outline/outline.json` and reconcile `current/world/`
  - Outline progress saved to `current/outline/progress.json` during generation

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/services/prompts/atoms/core/__tests__/stateManagement.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/prompts/atoms/core/stateManagement.ts src/services/prompts/atoms/core/__tests__/stateManagement.test.ts
git commit -m "[Feat]: document outline VFS rules"
```

---

### Task 2: Remove legacy tool references in core policy prompts

**Files:**
- Modify: `src/services/prompts/atoms/core/idAndEntityPolicy.ts`
- Modify: `src/services/prompts/atoms/core/memoryPolicy.ts`
- Modify: `src/services/prompts/atoms/core/__tests__/promptHygiene.test.ts`

**Step 1: Write the failing test**

```ts
// extend promptHygiene.test.ts
import { idAndEntityPolicy } from "../idAndEntityPolicy";
import { memoryPolicy } from "../memoryPolicy";

it("avoids legacy tools in entity + memory policies", () => {
  const content = [idAndEntityPolicy(), memoryPolicy()].join("\n");
  expect(content).not.toContain("list_");
  expect(content).not.toContain("query_");
  expect(content).not.toContain("add_");
  expect(content).not.toContain(["search", "tool"].join("_"));
  expect(content).not.toContain(["finish", "turn"].join("_"));
  expect(content).toContain("vfs_");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/prompts/atoms/core/__tests__/promptHygiene.test.ts`  
Expected: FAIL (legacy tool references)

**Step 3: Write minimal implementation**

- Replace list/query/add_* examples with VFS inspection + file writes.
- In `memoryPolicy`, remove `update_notes`/`query_notes` references. Prefer:
  - Write persistent knowledge entries under `current/world/knowledge/`.
  - Use `vfs_search`/`vfs_grep` to avoid duplicates.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/services/prompts/atoms/core/__tests__/promptHygiene.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/prompts/atoms/core/idAndEntityPolicy.ts src/services/prompts/atoms/core/memoryPolicy.ts src/services/prompts/atoms/core/__tests__/promptHygiene.test.ts
git commit -m "[Refactor]: replace legacy tool references in prompts"
```

---

### Task 3: Add VFS editor helper for section edits

**Files:**
- Create: `src/services/vfs/editor.ts`
- Test: `src/services/vfs/__tests__/vfsEditor.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";
import { applySectionEdit } from "../editor";

const json = (value: unknown) => JSON.stringify(value);

it("merges global edits without losing extra fields", () => {
  const session = new VfsSession();
  session.writeFile("world/global.json", json({
    time: "Day 1", theme: "fantasy", currentLocation: "Town",
    atmosphere: { envTheme: "fantasy", ambience: "quiet" },
    turnNumber: 1, forkId: 0, language: "fr",
  }), "application/json");

  applySectionEdit(session, "global", {
    time: "Night 1", currentLocation: "Forest",
  });

  const updated = JSON.parse(session.readFile("world/global.json")!.content);
  expect(updated.language).toBe("fr");
  expect(updated.time).toBe("Night 1");
  expect(updated.currentLocation).toBe("Forest");
});

it("replaces inventory files from list", () => {
  const session = new VfsSession();
  session.writeFile("world/inventory/old.json", json({ id: "old" }), "application/json");
  applySectionEdit(session, "inventory", [{ id: "inv_1", name: "Item" }]);
  expect(session.readFile("world/inventory/old.json")).toBeNull();
  expect(session.readFile("world/inventory/inv_1.json")).toBeTruthy();
});

it("blocks outline edits unless allowed", () => {
  const session = new VfsSession();
  expect(() => applySectionEdit(session, "outline", { title: "New" })).toThrow();
  applySectionEdit(session, "outline", { title: "New" }, { allowOutlineEdit: true });
  expect(session.readFile("outline/outline.json")).toBeTruthy();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/vfs/__tests__/vfsEditor.test.ts`  
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

- Implement `applySectionEdit(session, section, data, options)`:
  - `global`: merge onto existing global JSON, preserve fields not in input
  - `character`: write `world/character.json`
  - array sections: delete all files under prefix, write each item by id
    - inventory/npcs/locations/quests/knowledge/factions/timeline: use `id`
    - causalChains: use `chainId`
  - `outline`: require `allowOutlineEdit` option, write `outline/outline.json`

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/services/vfs/__tests__/vfsEditor.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/vfs/editor.ts src/services/vfs/__tests__/vfsEditor.test.ts
git commit -m "[Feat]: add VFS editor helper"
```

---

### Task 4: Refactor StateEditor to write via VFS

**Files:**
- Modify: `src/components/StateEditor.tsx`
- Modify: `src/hooks/useGameEngine.ts`
- Modify: `src/contexts/GameEngineContext.tsx`
- Modify: `src/components/pages/GamePage.tsx`

**Step 1: Write the failing test**

Add a small unit test for the VFS editor helper usage in StateEditor (or update existing tests if present). If no UI test infra, add a shallow test that calls the new apply function through a minimal handler (or skip UI tests with permission).

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run`  
Expected: FAIL (if test added)

**Step 3: Write minimal implementation**

- Update `useGameEngine` return to include `vfsSession`.
- Extend `GameEngineContext` state/actions to expose `vfsSession` to UI.
- Pass `vfsSession` to `StateEditor` in `GamePage`.
- In `StateEditor`:
  - Add `vfsSession` prop and use `applySectionEdit` on save.
  - After write, derive view via `deriveGameStateFromVfs` + `mergeDerivedViewState` and call `setGameState`.
  - Call `triggerSave()` after successful edit.
  - Add `outline` section with read-only messaging unless `gameState.godMode` OR a local “Allow /sudo outline edit” toggle is enabled.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run`  
Expected: PASS (except baseline buildInfo issue if still present)

**Step 5: Commit**

```bash
git add src/components/StateEditor.tsx src/hooks/useGameEngine.ts src/contexts/GameEngineContext.tsx src/components/pages/GamePage.tsx
git commit -m "[Refactor]: route StateEditor edits through VFS"
```

---

### Task 5: Final verification

**Step 1: Run full tests**

Run: `pnpm vitest run`  
Expected: PASS (note buildInfo baseline if still present)

**Step 2: Document baseline failures if any**

If failures remain, list them explicitly in the final summary.

---

**Plan complete.**
