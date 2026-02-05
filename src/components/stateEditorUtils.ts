import type { GameState } from "../types";
import type { VfsSession } from "../services/vfs/vfsSession";
import type { VfsContentType } from "../services/vfs/types";
import { applySectionEdit } from "../services/vfs/editor";
import { deriveGameStateFromVfs } from "../services/vfs/derivations";
import { mergeDerivedViewState } from "../hooks/vfsViewState";
import { writeVfsFile } from "./vfsExplorer/fileOps";

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
  | "customRules"
  | "outline";

interface ApplyVfsStateEditParams {
  session: VfsSession;
  section: EditableVfsSection;
  data: unknown;
  baseState: GameState;
  options?: { allowOutlineEdit?: boolean };
}

interface ApplyVfsFileEditParams {
  session: VfsSession;
  path: string;
  content: string;
  contentType: VfsContentType;
  baseState: GameState;
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

export const applyVfsFileEdit = ({
  session,
  path,
  content,
  contentType,
  baseState,
}: ApplyVfsFileEditParams): GameState => {
  writeVfsFile(session, path, content, contentType);
  const derived = deriveGameStateFromVfs(session.snapshot());
  return mergeDerivedViewState(baseState, derived);
};
