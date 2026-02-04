import type {
  AtmosphereObject,
  CausalChain,
  Faction,
  GameState,
  KnowledgeEntry,
  Location,
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

const writeActorBundle = (session: VfsSession, bundle: any): void => {
  const profile = bundle?.profile;
  if (!profile || typeof profile !== "object") return;
  const actorId = (profile as any).id;
  if (typeof actorId !== "string" || actorId.trim().length === 0) return;

  const id = actorId.trim();
  writeJson(session, `world/characters/${id}/profile.json`, profile);

  const writeSub = (subPath: string, items: any[] | undefined) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const itemId = (item as any).id;
      if (typeof itemId !== "string" || itemId.trim().length === 0) continue;
      writeJson(
        session,
        `world/characters/${id}/${subPath}/${itemId.trim()}.json`,
        item,
      );
    }
  };

  writeSub("skills", bundle?.skills);
  writeSub("conditions", bundle?.conditions);
  writeSub("traits", bundle?.traits);
  writeSub("inventory", bundle?.inventory);
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
    language: state.language,
    customContext: state.customContext,
    seedImageId: state.seedImageId,
    narrativeScale: state.narrativeScale,
  });

  writeJson(session, "summary/state.json", {
    summaries: state.summaries ?? [],
    lastSummarizedIndex: state.lastSummarizedIndex ?? 0,
  });

  for (const actor of state.actors) {
    writeActorBundle(session, actor);
  }

  if (state.playerProfile) {
    writeJson(session, "world/player_profile.json", {
      profile: state.playerProfile,
    });
  }

  writeEntities(session, "world/quests", state.quests as Quest[]);
  writeEntities(session, "world/locations", state.locations as Location[]);
  writeEntities(session, "world/knowledge", state.knowledge as KnowledgeEntry[]);
  writeEntities(session, "world/factions", state.factions as Faction[]);
  writeEntities(session, "world/timeline", state.timeline as TimelineEvent[]);

  for (const [locId, items] of Object.entries(state.locationItemsByLocationId)) {
    if (!Array.isArray(items)) continue;
    for (const item of items as any[]) {
      const id = (item as any)?.id;
      if (typeof id !== "string" || id.trim().length === 0) continue;
      writeJson(session, `world/locations/${locId}/items/${id}.json`, item);
    }
  }

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

  writeJson(session, "summary/state.json", {
    summaries: [],
    lastSummarizedIndex: 0,
  });

  writeActorBundle(session, {
    profile: {
      id: "char:player",
      kind: "player",
      currentLocation: "Unknown",
      knownBy: ["char:player"],
      visible: {
        name: DEFAULT_CHARACTER.name,
        title: DEFAULT_CHARACTER.title,
        status: DEFAULT_CHARACTER.status,
        appearance: DEFAULT_CHARACTER.appearance,
        attributes: DEFAULT_CHARACTER.attributes,
      },
      relations: [],
    },
    skills: [],
    conditions: [],
    traits: [],
    inventory: [],
  });

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

  writeJson(session, "summary/state.json", {
    summaries: [],
    lastSummarizedIndex: 0,
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

  // Actor-first outline seeding
  if ((outline as any).player) {
    writeActorBundle(session, (outline as any).player);
  }
  if (Array.isArray((outline as any).npcs)) {
    for (const npc of (outline as any).npcs as any[]) {
      writeActorBundle(session, npc);
    }
  }
  if (Array.isArray((outline as any).placeholders)) {
    for (const placeholder of (outline as any).placeholders as any[]) {
      if (!placeholder || typeof placeholder !== "object") continue;
      const id = (placeholder as any).id;
      if (typeof id !== "string" || id.trim().length === 0) continue;
      writeJson(session, `world/placeholders/${id.trim()}.json`, placeholder);
    }
  }
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
