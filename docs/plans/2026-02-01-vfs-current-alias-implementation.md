# VFS Current Alias Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `current/` virtual root for VFS tools and persist snapshots under `turns/fork-<id>/turn-<n>/...`.

**Architecture:** VFS sessions keep relative paths (`world/...`, `conversation/...`). Tool handlers map `current/` ⇄ relative paths. Persistence prefixes snapshot paths with `turns/fork-<id>/turn-<n>/` and strips on load. New-game seeding writes initial world files into the VFS session.

**Tech Stack:** TypeScript, Zod, Vitest, IndexedDB, existing VFS store/session.

---

### Task 1: Add current/ alias helpers

**Files:**
- Create: `src/services/vfs/currentAlias.ts`
- Test: `src/services/vfs/__tests__/currentAlias.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { stripCurrentPath, toCurrentPath } from "../currentAlias";

describe("current alias", () => {
  it("prefixes and strips current paths", () => {
    expect(toCurrentPath("world/global.json")).toBe(
      "current/world/global.json",
    );
    expect(stripCurrentPath("current/world/global.json")).toBe(
      "world/global.json",
    );
  });

  it("handles current root", () => {
    expect(toCurrentPath("")).toBe("current");
    expect(stripCurrentPath("current")).toBe("");
  });

  it("rejects non-current paths", () => {
    expect(() => stripCurrentPath("world/global.json")).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/vfs/__tests__/currentAlias.test.ts`  
Expected: FAIL (module not found).

**Step 3: Write minimal implementation**

```ts
import { normalizeVfsPath } from "./utils";

const CURRENT_ROOT = "current";

export const toCurrentPath = (path: string): string => {
  const normalized = normalizeVfsPath(path);
  return normalized ? `${CURRENT_ROOT}/${normalized}` : CURRENT_ROOT;
};

export const stripCurrentPath = (path?: string): string => {
  const normalized = normalizeVfsPath(path ?? CURRENT_ROOT);
  if (normalized === CURRENT_ROOT) {
    return "";
  }
  if (normalized.startsWith(`${CURRENT_ROOT}/`)) {
    return normalized.slice(CURRENT_ROOT.length + 1);
  }
  throw new Error(`Path must be under ${CURRENT_ROOT}/`);
};
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/services/vfs/__tests__/currentAlias.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/vfs/currentAlias.ts src/services/vfs/__tests__/currentAlias.test.ts
git commit -m "[Feat]: add current alias helpers"
```

---

### Task 2: Enforce current/ in VFS handlers

**Files:**
- Modify: `src/services/tools/handlers/vfsHandlers.ts`
- Modify: `src/services/tools/__tests__/vfsHandlers.test.ts`

**Step 1: Write the failing test**

```ts
it("rejects non-current paths and returns current-prefixed paths", () => {
  const session = new VfsSession();
  const ctx = { db: {} as GameDatabase, vfsSession: session };

  const badWrite = dispatchToolCall(
    "vfs_write",
    { files: [{ path: "world/global.json", content: "{}", contentType: "application/json" }] },
    ctx,
  ) as { success: boolean };
  expect(badWrite.success).toBe(false);

  const okWrite = dispatchToolCall(
    "vfs_write",
    { files: [{ path: "current/world/global.json", content: "{}", contentType: "application/json" }] },
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
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/tools/__tests__/vfsHandlers.test.ts`  
Expected: FAIL (no current alias enforcement).

**Step 3: Write minimal implementation**

- Use `stripCurrentPath()` on all input paths in vfs handlers.
- Use `toCurrentPath()` on all output paths (read/search/grep).
- If path missing, treat it as `current` for `vfs_ls`.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/services/tools/__tests__/vfsHandlers.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/tools/handlers/vfsHandlers.ts src/services/tools/__tests__/vfsHandlers.test.ts
git commit -m "[Feat]: enforce current alias in VFS handlers"
```

---

### Task 3: Prefix snapshot paths for turns

**Files:**
- Modify: `src/services/vfs/persistence.ts`
- Modify: `src/services/vfs/__tests__/vfsPersistence.test.ts`

**Step 1: Write the failing test**

```ts
it("prefixes snapshot paths with turns folder", async () => {
  const store = new InMemoryVfsStore();
  const session = new VfsSession();
  session.writeFile("world/global.json", "{}", "application/json");

  await saveVfsSessionSnapshot(store, session, {
    saveId: "slot-1",
    forkId: 0,
    turn: 1,
  });

  const loaded = await store.loadSnapshot("slot-1", 0, 1);
  const paths = Object.keys(loaded?.files || {});
  expect(paths[0]).toBe("turns/fork-0/turn-1/world/global.json");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/vfs/__tests__/vfsPersistence.test.ts`  
Expected: FAIL (paths not prefixed).

**Step 3: Write minimal implementation**

- Add helper to build turn root: `turns/fork-${forkId}/turn-${turn}`.
- Prefix paths inside `createVfsSnapshot`.
- Add `restoreVfsSessionFromSnapshot()` that strips prefix for a given snapshot.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/services/vfs/__tests__/vfsPersistence.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/vfs/persistence.ts src/services/vfs/__tests__/vfsPersistence.test.ts
git commit -m "[Feat]: prefix VFS snapshot paths by turn"
```

---

### Task 4: Seed VFS from GameState

**Files:**
- Create: `src/services/vfs/seed.ts`
- Test: `src/services/vfs/__tests__/vfsSeed.test.ts`

**Step 1: Write the failing test**

```ts
import { deriveGameStateFromVfs } from "../derivations";
import { seedVfsSessionFromGameState } from "../seed";

it("writes world/global and entity files", () => {
  const state = deriveGameStateFromVfs({});
  state.turnNumber = 1;
  state.forkId = 0;
  state.inventory = [
    { id: "inv_key", name: "Key", visible: { description: "A key." } } as any,
  ];

  const session = new VfsSession();
  seedVfsSessionFromGameState(session, state);

  expect(session.readFile("world/global.json")).toBeTruthy();
  expect(session.readFile("world/inventory/inv_key.json")).toBeTruthy();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/vfs/__tests__/vfsSeed.test.ts`  
Expected: FAIL (module not found).

**Step 3: Write minimal implementation**

- Write `world/global.json` from state’s `time/theme/currentLocation/atmosphere/turnNumber/forkId`.
- Write `world/character.json`.
- Write entity files under `world/<type>/<id>.json` for inventory/npcs/quests/locations/knowledge/factions/timeline/causal_chains.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/services/vfs/__tests__/vfsSeed.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/vfs/seed.ts src/services/vfs/__tests__/vfsSeed.test.ts
git commit -m "[Feat]: seed VFS from GameState"
```

---

### Task 5: Wire persistence load/save + seeding

**Files:**
- Modify: `src/hooks/useVfsPersistence.ts`
- Modify: `src/hooks/useGameEngine.ts`

**Step 1: Write the failing test**

Add a small unit test to confirm `restoreVfsSessionFromSnapshot()` strips the turn prefix and writes relative paths into a session.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/vfs/__tests__/vfsPersistence.test.ts`  
Expected: FAIL (no restore helper).

**Step 3: Write minimal implementation**

- Use `restoreVfsSessionFromSnapshot()` when loading snapshots in `useVfsPersistence`.
- If session is empty on save, call `seedVfsSessionFromGameState()` before saving.
- Expose `seedFromGameState` from `useVfsPersistence` and call it from `startNewGame` after the outline state is applied.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/services/vfs/__tests__/vfsPersistence.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/vfs/persistence.ts src/hooks/useVfsPersistence.ts src/hooks/useGameEngine.ts
git commit -m "[Feat]: wire current alias persistence flow"
```

---

### Task 6: Update prompts to use current/

**Files:**
- Modify: `src/services/prompts/atoms/core/stateManagement.ts`
- Modify: `src/services/prompts/atoms/core/__tests__/stateManagement.test.ts`

**Step 1: Write the failing test**

```ts
const content = stateManagement();
expect(content).toContain("current/world/");
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/prompts/atoms/core/__tests__/stateManagement.test.ts`  
Expected: FAIL

**Step 3: Write minimal implementation**

- Replace VFS examples to use `current/world/...`
- Add requirement to update `current/conversation/turn.json` each turn.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/services/prompts/atoms/core/__tests__/stateManagement.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/prompts/atoms/core/stateManagement.ts src/services/prompts/atoms/core/__tests__/stateManagement.test.ts
git commit -m "[Feat]: update VFS prompts to current alias"
```

---

### Task 7: Final verification

**Step 1: Run VFS + tool tests**

Run: `pnpm vitest run src/services/vfs/__tests__`  
Run: `pnpm vitest run src/services/tools/__tests__/vfsHandlers.test.ts`  
Expected: PASS

**Step 2: Note baseline failure**

Full `pnpm vitest run` still fails on existing `src/services/zodCompiler.test.ts`. Document in summary.

---

**Plan complete.**
