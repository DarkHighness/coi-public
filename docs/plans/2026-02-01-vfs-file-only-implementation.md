# VFS File-Only Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make VFS the only canonical state store and hard-remove all non-file tools, with conversation stored as per-turn files under `current/`.

**Architecture:** AI writes all state via `vfs_*` tools only. Conversation is stored as full-snapshot turn files and a small index file. The UI derives a view state from VFS snapshots; no canonical GameState is mutated.

**Tech Stack:** TypeScript, React hooks, VFS session/store, Vitest.

**Baseline Note:** In this worktree, `pnpm vitest run` currently fails if `buildInfo` is missing. Continue work and note failures only if unrelated to this plan.

---

### Task 1: Add VFS conversation helpers + schema

**Files:**
- Create: `src/services/vfs/conversation.ts`
- Test: `src/services/vfs/__tests__/vfsConversation.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";
import {
  buildTurnId,
  buildTurnPath,
  readConversationIndex,
  readTurnFile,
  writeConversationIndex,
  writeTurnFile,
} from "../conversation";

describe("VFS conversation helpers", () => {
  it("builds ids and paths", () => {
    expect(buildTurnId(0, 3)).toBe("fork-0/turn-3");
    expect(buildTurnPath(0, 3)).toBe(
      "current/conversation/turns/fork-0/turn-3.json",
    );
  });

  it("writes and reads index + turn files", () => {
    const session = new VfsSession();
    writeConversationIndex(session, {
      activeForkId: 0,
      activeTurnId: "fork-0/turn-0",
      rootTurnIdByFork: { "0": "fork-0/turn-0" },
      latestTurnNumberByFork: { "0": 0 },
      turnOrderByFork: { "0": ["fork-0/turn-0"] },
    });

    writeTurnFile(session, 0, 0, {
      turnId: "fork-0/turn-0",
      forkId: 0,
      turnNumber: 0,
      parentTurnId: null,
      createdAt: 1,
      userAction: "",
      assistant: { narrative: "", choices: [] },
    });

    const index = readConversationIndex(session.snapshot());
    const turn = readTurnFile(session.snapshot(), 0, 0);

    expect(index?.activeTurnId).toBe("fork-0/turn-0");
    expect(turn?.turnNumber).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/vfs/__tests__/vfsConversation.test.ts`  
Expected: FAIL (module not found).

**Step 3: Write minimal implementation**

```ts
// conversation.ts (sketch)
export const buildTurnId = (forkId: number, turn: number) =>
  `fork-${forkId}/turn-${turn}`;
export const buildTurnPath = (forkId: number, turn: number) =>
  `current/conversation/turns/${buildTurnId(forkId, turn)}.json`;

export const writeTurnFile = (session: VfsSession, forkId: number, turn: number, data: TurnFile) => {
  session.writeFile(buildTurnPath(forkId, turn).replace("current/", ""), JSON.stringify(data), "application/json");
};
// readTurnFile, writeConversationIndex, readConversationIndex similarly
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/services/vfs/__tests__/vfsConversation.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/vfs/conversation.ts src/services/vfs/__tests__/vfsConversation.test.ts
git commit -m "[Feat]: add VFS conversation helpers"
```

---

### Task 2: Derive view state from VFS (world + conversation)

**Files:**
- Modify: `src/services/vfs/derivations.ts`
- Test: `src/services/vfs/__tests__/vfsDerivation.test.ts`

**Step 1: Write the failing test**

```ts
it("derives conversation nodes from turn files", () => {
  const files = {
    "current/conversation/index.json": makeJsonFile("current/conversation/index.json", {
      activeForkId: 0,
      activeTurnId: "fork-0/turn-1",
      rootTurnIdByFork: { "0": "fork-0/turn-0" },
      latestTurnNumberByFork: { "0": 1 },
      turnOrderByFork: { "0": ["fork-0/turn-0", "fork-0/turn-1"] },
    }),
    "current/conversation/turns/fork-0/turn-0.json": makeJsonFile(
      "current/conversation/turns/fork-0/turn-0.json",
      { turnId: "fork-0/turn-0", forkId: 0, turnNumber: 0, parentTurnId: null, createdAt: 1, userAction: "start", assistant: { narrative: "hello", choices: [] } },
    ),
    "current/conversation/turns/fork-0/turn-1.json": makeJsonFile(
      "current/conversation/turns/fork-0/turn-1.json",
      { turnId: "fork-0/turn-1", forkId: 0, turnNumber: 1, parentTurnId: "fork-0/turn-0", createdAt: 2, userAction: "go", assistant: { narrative: "ok", choices: [] } },
    ),
  };

  const state = deriveGameStateFromVfs(files as any);
  expect(state.activeNodeId).toContain("fork-0/turn-1");
  expect(state.currentFork.length).toBeGreaterThan(0);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/vfs/__tests__/vfsDerivation.test.ts`  
Expected: FAIL (missing conversation derivation).

**Step 3: Write minimal implementation**

- Extend `deriveGameStateFromVfs` to:
  - Parse `current/conversation/index.json` (if present).
  - Parse turn files and derive nodes:
    - Create user + model nodes per turn (IDs include `fork-<id>/turn-<n>`).
    - Parent for the user node = model node of parent turn.
    - Active node = model node of `activeTurnId`.
  - Derive `currentFork` via `deriveHistory`.
  - Fill summaries from index (if stored there).

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/services/vfs/__tests__/vfsDerivation.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/vfs/derivations.ts src/services/vfs/__tests__/vfsDerivation.test.ts
git commit -m "[Feat]: derive view state from VFS conversation"
```

---

### Task 3: Seed VFS without canonical GameState

**Files:**
- Modify: `src/services/vfs/seed.ts`
- Modify: `src/services/vfs/__tests__/vfsSeed.test.ts`

**Step 1: Write the failing test**

```ts
it("seeds world + conversation index/turn 0", () => {
  const session = new VfsSession();
  seedVfsSessionFromDefaults(session);
  expect(session.readFile("world/global.json")).toBeTruthy();
  expect(
    session.readFile("conversation/index.json"),
  ).toBeTruthy();
  expect(
    session.readFile("conversation/turns/fork-0/turn-0.json"),
  ).toBeTruthy();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/vfs/__tests__/vfsSeed.test.ts`  
Expected: FAIL (function missing).

**Step 3: Write minimal implementation**

- Replace `seedVfsSessionFromGameState` with `seedVfsSessionFromDefaults`.
- Create default world files using constants (theme, atmosphere, character).
- Create conversation index + turn-0 with empty narrative/choices.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/services/vfs/__tests__/vfsSeed.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/vfs/seed.ts src/services/vfs/__tests__/vfsSeed.test.ts
git commit -m "[Feat]: seed VFS from defaults"
```

---

### Task 4: Remove GameDatabase from agentic loop + auto-finish on turn file

**Files:**
- Modify: `src/services/ai/agentic/turn/loopInitializer.ts`
- Modify: `src/services/ai/agentic/turn/agenticLoop.ts`
- Modify: `src/services/ai/agentic/turn/contextInjector.ts`
- Modify: `src/services/ai/agentic/turn/resultAccumulator.ts`
- Modify: `src/services/ai/agentic/turn/finishTurnHandler.ts` (or delete)
- Test: `src/services/ai/agentic/turn/__tests__/toolCallProcessorVfs.test.ts`

**Step 1: Write the failing test**

```ts
it("finishes after writing a turn file", () => {
  // Simulate a vfs_write that writes the current turn file
  // Expect the loop to stop without any dedicated finish tool.
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/ai/agentic/turn/__tests__/toolCallProcessorVfs.test.ts`  
Expected: FAIL (still requires a dedicated finish tool).

**Step 3: Write minimal implementation**

- Remove `GameDatabase` from `LoopState` and `createLoopState`.
- Remove `injectReadyConsequences` DB usage (either no-op or use VFS).
- Remove any dedicated finish tool flow and `handleFinishTurn` usage.
- Add a completion check after tool calls:
  - If `current/conversation/index.json` exists and references an `activeTurnId` with a valid turn file, stop loop and build response from that turn file.
- Move response building into `resultAccumulator` (read turn file + derive state from VFS).

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/services/ai/agentic/turn/__tests__/toolCallProcessorVfs.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/ai/agentic/turn/loopInitializer.ts src/services/ai/agentic/turn/agenticLoop.ts src/services/ai/agentic/turn/contextInjector.ts src/services/ai/agentic/turn/resultAccumulator.ts src/services/ai/agentic/turn/finishTurnHandler.ts src/services/ai/agentic/turn/__tests__/toolCallProcessorVfs.test.ts
git commit -m "[Refactor]: finish turns from VFS files only"
```

---

### Task 5: Hard-remove non-VFS tools and handlers

**Files:**
- Modify: `src/services/tools.ts`
- Modify: `src/services/tools/handlers/index.ts`
- Modify: `src/services/tools/__tests__/vfsTools.test.ts`
- Modify: prompt/tool lists that enumerate available tools

**Step 1: Write the failing test**

```ts
it("only exposes vfs tools", () => {
  expect(ALL_DEFINED_TOOLS.every((t) => t.name.startsWith("vfs_"))).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/tools/__tests__/vfsTools.test.ts`  
Expected: FAIL (non-vfs tools present).

**Step 3: Write minimal implementation**

- Remove all non-vfs tool definitions from `ALL_DEFINED_TOOLS`.
- Ensure handler index registers only `vfsHandlers`.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/services/tools/__tests__/vfsTools.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/tools.ts src/services/tools/handlers/index.ts src/services/tools/__tests__/vfsTools.test.ts
git commit -m "[Refactor]: remove non-vfs tools"
```

---

### Task 6: Update prompts to file-only workflow

**Files:**
- Modify: `src/services/prompts/atoms/core/stateManagement.ts`
- Modify: `src/services/prompts/atoms/core/__tests__/stateManagement.test.ts`

**Step 1: Write the failing test**

```ts
const content = stateManagement();
expect(content).toContain("vfs_");
expect(content).toContain("current/conversation/turns/fork-");
expect(content).not.toContain(["finish", "turn"].join("_"));
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/prompts/atoms/core/__tests__/stateManagement.test.ts`  
Expected: FAIL

**Step 3: Write minimal implementation**

- Replace tool instructions with file-only workflow.
- Require writing `current/conversation/index.json` + turn file each turn.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/services/prompts/atoms/core/__tests__/stateManagement.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/prompts/atoms/core/stateManagement.ts src/services/prompts/atoms/core/__tests__/stateManagement.test.ts
git commit -m "[Feat]: prompt file-only state management"
```

---

### Task 7: UI derives state from VFS only

**Files:**
- Modify: `src/hooks/useVfsPersistence.ts`
- Modify: `src/hooks/useGameAction.ts`
- Modify: `src/hooks/useGameEngine.ts`

**Step 1: Write the failing test**

Add a small unit test (or adjust existing) to ensure UI state is derived from VFS snapshot after a turn, not from response.finalState.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run`  
Expected: FAIL (still uses response.finalState).

**Step 3: Write minimal implementation**

- After AI turn completes, re-derive view state from `vfsSession.snapshot()` via `deriveGameStateFromVfs`.
- Remove direct writes of world fields from `setGameState` (inventory, npcs, etc).
- Use derived view only for UI state updates.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run`  
Expected: PASS (except known buildInfo baseline, if still present).

**Step 5: Commit**

```bash
git add src/hooks/useVfsPersistence.ts src/hooks/useGameAction.ts src/hooks/useGameEngine.ts
git commit -m "[Refactor]: derive UI state from VFS only"
```

---

### Task 8: Final verification

**Step 1: Run core tests**

Run: `pnpm vitest run`  
Expected: PASS (note any unrelated failures).

**Step 2: Document any baseline failures**  
If failures remain, note them in the summary with file/line and whether they pre-existed.

---

**Plan complete.**
