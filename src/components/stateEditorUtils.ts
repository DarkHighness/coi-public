import type { GameState } from "../types";
import type { VfsSession } from "../services/vfs/vfsSession";
import { applySectionEdit } from "../services/vfs/editor";
import { deriveGameStateFromVfs } from "../services/vfs/derivations";
import { mergeDerivedViewState } from "../hooks/vfsViewState";

export type EditableVfsSection =
  | "global"
  | "character"
  | "inventory"
  | "npcs"
  | "locations"
  | "quests"
  | "knowledge"
  | "factions"
  | "timeline"
  | "causalChains"
  | "outline";

interface ApplyVfsStateEditParams {
  session: VfsSession;
  section: EditableVfsSection;
  data: unknown;
  baseState: GameState;
  options?: { allowOutlineEdit?: boolean };
}

export const applyVfsStateEdit = ({
  session,
  section,
  data,
  baseState,
  options,
}: ApplyVfsStateEditParams): GameState => {
  applySectionEdit(session, section, data, options);
  const derived = deriveGameStateFromVfs(session.snapshot());
  return mergeDerivedViewState(baseState, derived);
};
