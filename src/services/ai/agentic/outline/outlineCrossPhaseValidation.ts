import type {
  OutlinePlayerActor,
  OutlineLocations,
  OutlineNpcsRelationships,
} from "../../../schemas";

type ValidationResult =
  | { ok: true; error?: undefined }
  | { ok: false; error: string };

const uniqueIds = (items: Array<{ id?: string }>): string[] => {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const item of items) {
    const id = typeof item?.id === "string" ? item.id : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
};

export const validatePlayerCurrentLocationInLocations = (
  playerActor: OutlinePlayerActor["player"],
  locations: OutlineLocations["locations"],
): ValidationResult => {
  const playerLocationId = String(
    playerActor?.profile?.currentLocation ?? "",
  ).trim();
  if (!playerLocationId) {
    return {
      ok: false,
      error: "player_actor.player.profile.currentLocation is missing or empty.",
    };
  }

  const locationIds = new Set(uniqueIds(locations ?? []));
  if (locationIds.has(playerLocationId)) {
    return { ok: true };
  }

  const sample = Array.from(locationIds.values()).slice(0, 20);
  return {
    ok: false,
    error:
      `locations must include the player's currentLocation id="${playerLocationId}". ` +
      `Provided location ids: ${sample.length > 0 ? sample.join(", ") : "(none)"}`,
  };
};

export const validateNpcLocationsExist = (
  locations: OutlineLocations["locations"],
  npcs: OutlineNpcsRelationships["npcs"],
): ValidationResult => {
  const locationIds = new Set(uniqueIds(locations ?? []));
  if (locationIds.size === 0) {
    return {
      ok: false,
      error:
        "locations list is empty; cannot validate NPC currentLocation references.",
    };
  }

  const missing: Array<{ npcId: string; locationId: string }> = [];
  for (const npc of npcs ?? []) {
    const npcId = String(npc?.profile?.id ?? "unknown").trim() || "unknown";
    const npcLocation = String(npc?.profile?.currentLocation ?? "").trim();
    if (!npcLocation || !locationIds.has(npcLocation)) {
      missing.push({ npcId, locationId: npcLocation || "(missing)" });
    }
  }

  if (missing.length === 0) {
    return { ok: true };
  }

  const examples = missing
    .slice(0, 5)
    .map(({ npcId, locationId }) => `${npcId} -> ${locationId}`)
    .join("; ");
  const sampleIds = Array.from(locationIds.values()).slice(0, 20);
  return {
    ok: false,
    error:
      `npcs_relationships profile.currentLocation must reference an existing location id. ` +
      `Invalid NPC locations: ${examples}. ` +
      `Valid location ids: ${sampleIds.join(", ")}`,
  };
};
