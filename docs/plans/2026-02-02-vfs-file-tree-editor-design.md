# VFS File Tree StateEditor Design

## Goal

Replace the current StateEditor (section-based JSON edits) with a VFS file tree
editor that directly reads/writes files in the VFS session and re-derives the
view state afterward.

## Scope

- Single modal (replace StateEditor) with file tree on the left and file editor
  on the right.
- File operations: read, write, rename, delete, new file/folder, search.
- JSON validation + schema validation for known paths.
- Outline editing locked by default; only allowed in god mode or explicit sudo
  toggle.
- Conversation files read-only by default; unlock via explicit toggle.

## Non-Goals

- Multi-tab editor or diff view.
- Full IDE features (syntax highlighting, git history, etc.).
- Backward compatibility with old non-VFS tools.

## UI / UX

- Left pane: tree rooted at `current/` (display only; internal paths are
  relative, e.g. `world/global.json`).
- Right pane: editable content for selected file, with actions: Format, Reset,
  Save.
- Search bar filters tree by path and file content.
- Read-only banners for outline and conversation files unless unlocked.

## Data Flow

1. On open, build tree from `vfsSession.snapshot()`.
2. Select file -> load content from VFS (JSON formatted).
3. Save:
   - Validate JSON if `contentType` is JSON.
   - If schema exists, validate with `getSchemaForPath`.
   - Write file to VFS.
   - Re-derive view state: `deriveGameStateFromVfs` + `mergeDerivedViewState`.
   - `setGameState` and `triggerSave()`.

## Access Control

- `current/outline/outline.json` is read-only unless:
  - `gameState.godMode === true`, or
  - Explicit UI toggle "Allow /sudo outline edit" is enabled.
- `current/conversation/**` is read-only unless:
  - Explicit UI toggle "Unlock conversation editing" is enabled.

## Error Handling

- Invalid JSON: block save and show inline error.
- Schema errors: show error list and block save.
- Missing VFS session: disable editing and show toast.
- Missing file on save: prompt to refresh tree.

## Testing

- Unit tests for tree building and read-only rules.
- Unit tests for file write validation helpers.
- StateEditor utility tests for save -> derive -> merge pipeline.
