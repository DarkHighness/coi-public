import { readTurnFile, writeTurnFile } from "./conversation";
import type { VfsSession } from "./vfsSession";

export type TurnMediaPatch = {
  imagePrompt?: string | null;
  imageId?: string | null;
  imageUrl?: string | null;
  veoScript?: string | null;
};

const TURN_MEDIA_PATCH_KEYS: Array<keyof TurnMediaPatch> = [
  "imagePrompt",
  "imageId",
  "imageUrl",
  "veoScript",
];

const isValidTurnCoordinate = (value: number): boolean =>
  Number.isFinite(value) && Number.isInteger(value);

export const parseTurnFromModelNodeId = (
  nodeId: string,
): { forkId: number; turnNumber: number } | null => {
  const match = /^model-fork-(\d+)\/turn-(\d+)$/.exec(nodeId);
  if (!match) return null;

  const forkId = Number(match[1]);
  const turnNumber = Number(match[2]);
  if (!isValidTurnCoordinate(forkId) || !isValidTurnCoordinate(turnNumber)) {
    return null;
  }

  return { forkId, turnNumber };
};

export const patchTurnMediaAtTurn = (
  vfsSession: VfsSession,
  forkId: number,
  turnNumber: number,
  patch: TurnMediaPatch,
): boolean => {
  if (!isValidTurnCoordinate(forkId) || !isValidTurnCoordinate(turnNumber)) {
    return false;
  }

  const currentTurn = readTurnFile(vfsSession.snapshot(), forkId, turnNumber);
  if (!currentTurn) return false;

  const nextMedia: Record<string, unknown> =
    currentTurn.media &&
    typeof currentTurn.media === "object" &&
    !Array.isArray(currentTurn.media)
      ? { ...currentTurn.media }
      : {};

  for (const key of TURN_MEDIA_PATCH_KEYS) {
    if (!(key in patch)) continue;
    const value = patch[key];
    if (typeof value === "string") {
      nextMedia[key] = value;
    } else {
      delete nextMedia[key];
    }
  }

  const nextTurn = { ...currentTurn };
  if (Object.keys(nextMedia).length > 0) {
    nextTurn.media = nextMedia;
  } else {
    delete nextTurn.media;
  }

  writeTurnFile(vfsSession, forkId, turnNumber, nextTurn);
  return true;
};

export const patchTurnMediaForNode = (
  vfsSession: VfsSession,
  nodeId: string,
  patch: TurnMediaPatch,
): boolean => {
  const turn = parseTurnFromModelNodeId(nodeId);
  if (!turn) return false;

  return patchTurnMediaAtTurn(vfsSession, turn.forkId, turn.turnNumber, patch);
};
