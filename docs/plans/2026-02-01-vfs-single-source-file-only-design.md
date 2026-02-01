# VFS-Only State (Single Source of Truth) Design

## Goal
Make VFS the **only** canonical state store. All prior domain tools are **hard removed**. The AI and runtime may only read/write game state through file tools (`vfs_*`). The UI renders a **derived view state** from VFS snapshots and never mutates a canonical `GameState`.

## Non-Goals
- No backward compatibility with existing save formats or tool surfaces.
- No hybrid DB + VFS support.
- No partial tool retention; old tools are removed, not hidden.

## Core Principles
- **Single source of truth:** all canonical state lives under `current/`.
- **File tools only:** AI uses `vfs_ls/read/write/edit/search/grep/move/delete` exclusively.
- **Derived UI:** view state is computed from VFS snapshots and is never canonical.
- **Fork-native:** conversation turns are organized by `forkId` and `turnNumber`.

## File Layout (Canonical)
```
current/
  world/
    global.json
    character.json
    inventory/<id>.json
    npcs/<id>.json
    quests/<id>.json
    locations/<id>.json
    knowledge/<id>.json
    factions/<id>.json
    timeline/<id>.json
    causal_chains/<id>.json
  conversation/
    index.json
    turns/
      fork-<id>/
        turn-<n>.json
```

### `current/conversation/turns/fork-<id>/turn-<n>.json` (Full Snapshot)
Each turn file is self-contained for rendering.
```
{
  "turnId": "fork-0/turn-3",
  "turnNumber": 3,
  "forkId": 0,
  "parentTurnId": "fork-0/turn-2",
  "createdAt": 1700000000000,
  "userAction": "…",
  "assistant": {
    "narrative": "…",
    "choices": [ ... ],
    "narrativeTone": "…",
    "atmosphere": { ... },
    "ending": "continue|death|victory|…",
    "forceEnd": false
  },
  "media": { "image": "...", "audio": "..." },
  "meta": { "modelId": "...", "usage": { ... } }
}
```

### `current/conversation/index.json`
Authoritative index for navigation and active turn selection.
```
{
  "activeForkId": 0,
  "activeTurnId": "fork-0/turn-3",
  "rootTurnIdByFork": { "0": "fork-0/turn-0" },
  "latestTurnNumberByFork": { "0": 3 },
  "turnOrderByFork": {
    "0": ["fork-0/turn-0", "fork-0/turn-1", "fork-0/turn-2", "fork-0/turn-3"]
  }
}
```

## Tooling Changes (Hard Removal)
- Remove all non-VFS tools from definitions, handlers, prompts, and tests.
- The tool registry registers **only** `vfsHandlers` (and optional minimal `search_tool` that returns only vfs tools).
- `GameDatabase`-based mutations are removed from runtime paths.

## Runtime & Data Flow
- **Writes:** AI updates state by writing files under `current/` only.
- **Reads:** UI calls `deriveViewStateFromVfs(snapshot)` to compute render state.
- **No canonical GameState:** any in-memory state is an ephemeral view model derived from VFS and is fully replaceable.

## Implications
- Remove or repurpose `GameDatabase` usage.
- Replace any direct `setGameState` for canonical data with re-derivation from VFS.
- Update prompts and tests to enforce file-only tool usage.

## Open Decisions (resolved)
- Conversation storage: per-turn files under `turns/fork-<id>/turn-<n>.json`.
- Turn file contents: full snapshot.
- Fork layout: foldered by fork, not flat.
