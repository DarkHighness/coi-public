import type {
  AtmosphereObject,
  CausalChain,
  Faction,
  GameState,
  InventoryItem,
  KnowledgeEntry,
  Location,
  NPC,
  Quest,
  StoryOutline,
  TimelineEvent,
} from "@/types";
import { DEFAULT_CHARACTER } from "@/utils/constants";
import { VfsSession } from "./vfsSession";
import { writeConversationIndex, writeForkTree, writeTurnFile } from "./conversation";

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

  if (state.playerProfile) {
    writeJson(session, "world/player_profile.json", {
      profile: state.playerProfile,
    });
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

export const seedVfsSessionFromDefaults = (session: VfsSession): void => {
  writeJson(session, "world/global.json", {
    time: "Day 1, 08:00",
    theme: "fantasy",
    currentLocation: "Unknown",
    atmosphere: { envTheme: "fantasy", ambience: "quiet" },
    turnNumber: 0,
    forkId: 0,
  });

  writeJson(session, "world/character.json", DEFAULT_CHARACTER);

  writeConversationIndex(session, {
    activeForkId: 0,
    activeTurnId: "fork-0/turn-0",
    rootTurnIdByFork: { "0": "fork-0/turn-0" },
    latestTurnNumberByFork: { "0": 0 },
    turnOrderByFork: { "0": ["fork-0/turn-0"] },
  });

  writeForkTree(session, {
    nodes: {
      0: {
        id: 0,
        parentId: null,
        createdAt: 0,
        createdAtTurn: 0,
        sourceNodeId: "",
      },
    },
    nextForkId: 1,
  });

  writeTurnFile(session, 0, 0, {
    turnId: "fork-0/turn-0",
    forkId: 0,
    turnNumber: 0,
    parentTurnId: null,
    createdAt: Date.now(),
    userAction: "",
    assistant: { narrative: "", choices: [] },
  });
};

export const seedVfsSessionFromOutline = (
  session: VfsSession,
  outline: StoryOutline,
  options: {
    theme: string;
    time: string;
    currentLocation: string;
    atmosphere: AtmosphereObject;
    language?: string;
    customContext?: string;
    seedImageId?: string;
    narrativeScale?: GameState["narrativeScale"];
  },
): void => {
  writeJson(session, "world/global.json", {
    time: options.time,
    theme: options.theme,
    currentLocation: options.currentLocation,
    atmosphere: options.atmosphere,
    turnNumber: 0,
    forkId: 0,
    language: options.language,
    customContext: options.customContext,
    seedImageId: options.seedImageId,
    narrativeScale: options.narrativeScale,
  });

  writeForkTree(session, {
    nodes: {
      0: {
        id: 0,
        parentId: null,
        createdAt: 0,
        createdAtTurn: 0,
        sourceNodeId: "",
      },
    },
    nextForkId: 1,
  });

  if (outline.character) {
    writeJson(session, "world/character.json", outline.character);
  }

  writeEntities(session, "world/inventory", outline.inventory as InventoryItem[]);
  writeEntities(session, "world/npcs", outline.npcs as NPC[]);
  writeEntities(session, "world/quests", outline.quests as Quest[]);
  writeEntities(session, "world/locations", outline.locations as Location[]);
  writeEntities(
    session,
    "world/knowledge",
    outline.knowledge as KnowledgeEntry[],
  );
  writeEntities(session, "world/factions", outline.factions as Faction[]);
  writeEntities(session, "world/timeline", outline.timeline as TimelineEvent[]);
};
