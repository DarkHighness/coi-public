import type {
  CausalChain,
  Faction,
  GameState,
  InventoryItem,
  KnowledgeEntry,
  Location,
  NPC,
  Quest,
  TimelineEvent,
} from "@/types";
import { VfsSession } from "./vfsSession";

const writeJson = (session: VfsSession, path: string, value: unknown) => {
  session.writeFile(path, JSON.stringify(value), "application/json");
};

const writeEntities = <T extends { id?: string }>(
  session: VfsSession,
  basePath: string,
  entities: T[] | undefined,
) => {
  if (!entities) {
    return;
  }
  for (const entity of entities) {
    if (!entity || !entity.id) {
      continue;
    }
    writeJson(session, `${basePath}/${entity.id}.json`, entity);
  }
};

export const seedVfsSessionFromGameState = (
  session: VfsSession,
  state: GameState,
): void => {
  writeJson(session, "world/global.json", {
    time: state.time,
    theme: state.theme,
    currentLocation: state.currentLocation,
    atmosphere: state.atmosphere,
    turnNumber: state.turnNumber,
    forkId: state.forkId,
  });

  if (state.character) {
    writeJson(session, "world/character.json", state.character);
  }

  writeEntities(session, "world/inventory", state.inventory as InventoryItem[]);
  writeEntities(session, "world/npcs", state.npcs as NPC[]);
  writeEntities(session, "world/quests", state.quests as Quest[]);
  writeEntities(session, "world/locations", state.locations as Location[]);
  writeEntities(session, "world/knowledge", state.knowledge as KnowledgeEntry[]);
  writeEntities(session, "world/factions", state.factions as Faction[]);
  writeEntities(session, "world/timeline", state.timeline as TimelineEvent[]);

  if (state.causalChains) {
    for (const chain of state.causalChains as CausalChain[]) {
      if (!chain || !chain.chainId) {
        continue;
      }
      writeJson(
        session,
        `world/causal_chains/${chain.chainId}.json`,
        chain,
      );
    }
  }
};
