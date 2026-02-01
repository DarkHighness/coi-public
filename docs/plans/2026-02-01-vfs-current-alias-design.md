# VFS current/ Alias Design

## Goal
Provide a virtual `current/` root for AI tools so they can only read/write the
active turn, while persistence stores full snapshots under
`turns/fork-<id>/turn-<n>/...`.

## Constraints
- AI tools must only accept paths under `current/`.
- Historical paths (`turns/...`) are not writable via AI tools.
- VFS session keeps relative paths (`world/...`, `conversation/...`) for
  derivation and schema validation.

## Path Model
Logical (AI-visible):
- `current/world/...`
- `current/conversation/turn.json`

Physical (persisted):
- `turns/fork-<id>/turn-<n>/world/...`
- `turns/fork-<id>/turn-<n>/conversation/turn.json`

## Architecture
### 1) Tool-layer aliasing
In `vfs_*` handlers, map:
- Input: `current/<path>` → `<path>` (relative)
- Output: `<path>` → `current/<path>`

Handlers reject non-`current/` inputs to enforce “current-turn only.”
Schema registry remains unchanged because it sees relative paths.

### 2) Persistence prefixing
`VfsSession` stores relative paths only.
`saveVfsSessionSnapshot()` prefixes paths when saving:
`<path>` → `turns/fork-${forkId}/turn-${turn}/<path>`
Loading reverses the prefix and restores relative paths for the session.

### 3) Turn lifecycle
At turn start:
- Load latest snapshot for `(saveId, forkId)`; hydrate session with relative paths.
- Create a new turn by copying prior `world/` into the new turn’s session
  (full snapshot). Then set `current/` alias to this session.

At turn end:
- Save a full snapshot to `turns/.../turn-<n>/...`.
- Update `conversation/turn.json` for the current turn.

## Error Handling
- Reject any `vfs_*` calls with non-`current/` paths.
- Missing current snapshot → initialize empty session and minimal
  `world/global.json` + `world/character.json`.
- Snapshot load failures surface as tool errors and abort the turn.

## Testing
Add unit tests for:
- Handler path mapping (input/output only under `current/`).
- Snapshot prefix/unprefix behavior.
- Turn “copy-forward” behavior when starting a new turn.

## Rollout
- Implement aliasing + prefixing first (no UI changes).
- Migrate turn creation to copy-forward semantics.
- Keep AI prompt updated to reference `current/` paths.
