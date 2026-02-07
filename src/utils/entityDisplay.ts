import type { GameState } from "../types";

type DisplayState = Pick<
  GameState,
  | "playerActorId"
  | "character"
  | "actors"
  | "npcs"
  | "locations"
  | "quests"
  | "knowledge"
  | "factions"
  | "timeline"
  | "inventory"
>;

const ENTITY_PREFIXES = [
  "char",
  "loc",
  "quest",
  "knowledge",
  "faction",
  "timeline",
  "inv",
  "item",
] as const;

const normalizeText = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const normalizeEntityRef = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const lower = trimmed.toLowerCase();
  for (const prefix of ENTITY_PREFIXES) {
    const underscorePrefix = `${prefix}_`;
    if (lower.startsWith(underscorePrefix)) {
      return `${prefix}:${lower.slice(underscorePrefix.length)}`;
    }
  }
  return lower;
};

export const isSameEntityRef = (left: unknown, right: unknown): boolean => {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  return normalizeEntityRef(normalizedLeft) === normalizeEntityRef(normalizedRight);
};

const firstNonEmpty = (...values: unknown[]): string | null => {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) {
      return normalized;
    }
  }
  return null;
};

export const resolveLocationDisplayName = (
  ref: unknown,
  gameState: Pick<GameState, "locations">,
): string => {
  const raw = normalizeText(ref);
  if (!raw) {
    return "";
  }

  const locationMatch = (gameState.locations || []).find(
    (loc) => isSameEntityRef(loc.id, raw) || loc.name === raw,
  );
  return locationMatch?.name || raw;
};

/**
 * Resolve entity references (usually IDs) to player-friendly display names.
 * Falls back to original ref when no mapping can be found.
 */
export const resolveEntityDisplayName = (
  ref: unknown,
  gameState: DisplayState,
): string => {
  const raw = normalizeText(ref);
  if (!raw) {
    return "";
  }

  const playerId = gameState.playerActorId || "char:player";

  const locationMatch = (gameState.locations || []).find(
    (loc) => isSameEntityRef(loc.id, raw) || loc.name === raw,
  );
  if (locationMatch?.name) {
    return locationMatch.name;
  }

  if (isSameEntityRef(raw, playerId) || isSameEntityRef(raw, "char:player")) {
    const playerName = firstNonEmpty(gameState.character?.name);
    if (playerName) {
      return playerName;
    }
  }

  const actorMatch = (gameState.actors || []).find((bundle) =>
    isSameEntityRef(bundle?.profile?.id, raw),
  );
  const actorName = firstNonEmpty(
    actorMatch?.profile?.visible?.name,
    actorMatch?.profile?.id,
  );
  if (actorName) {
    return actorName;
  }

  const npcMatch = (gameState.npcs || []).find((npc) => isSameEntityRef(npc.id, raw));
  const npcName = firstNonEmpty(npcMatch?.visible?.name, npcMatch?.id);
  if (npcName) {
    return npcName;
  }

  const questMatch = (gameState.quests || []).find((quest) => isSameEntityRef(quest.id, raw));
  if (questMatch?.title) {
    return questMatch.title;
  }

  const knowledgeMatch = (gameState.knowledge || []).find((knowledge) =>
    isSameEntityRef(knowledge.id, raw),
  );
  if (knowledgeMatch?.title) {
    return knowledgeMatch.title;
  }

  const factionMatch = (gameState.factions || []).find((faction) =>
    isSameEntityRef(faction.id, raw),
  );
  if (factionMatch?.name) {
    return factionMatch.name;
  }

  const timelineMatch = (gameState.timeline || []).find((event) =>
    isSameEntityRef(event.id, raw),
  );
  if (timelineMatch?.name) {
    return timelineMatch.name;
  }

  const inventoryMatch = (gameState.inventory || []).find((item) =>
    isSameEntityRef(item.id, raw),
  );
  if (inventoryMatch?.name) {
    return inventoryMatch.name;
  }

  return raw;
};
