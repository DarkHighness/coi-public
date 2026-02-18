import type {
  AtmosphereObject,
  GameState,
  SavePresetProfile,
  StoryOutline,
} from "@/types";
import { DEFAULT_CHARACTER } from "@/utils/constants";
import { VfsSession } from "./vfsSession";
import {
  writeConversationIndex,
  writeForkTree,
  writeTurnFile,
} from "./conversation";
import {
  buildCustomRulePackMarkdown,
  CUSTOM_RULES_README_CONTENT,
  CUSTOM_RULES_README_PATH,
  toCustomRulePackPath,
} from "./customRules";
import { ensureDirectoryScaffolds } from "./directoryScaffolds";
import { ensureWorkspaceMemoryDocuments } from "./memoryTemplates";
import { sanitizeCanonicalWorldRecord } from "./stateLayering";

const writeJson = (session: VfsSession, path: string, value: unknown) => {
  session.writeFile(path, JSON.stringify(value), "application/json");
};

const DEFAULT_SAVE_PRESET_PROFILE: SavePresetProfile = {
  narrativeStylePreset: "theme",
  worldDispositionPreset: "theme",
  playerMalicePreset: "theme",
  playerMaliceIntensity: "standard",
  locked: true,
};

const DEFAULT_REQUIRED_PLAYER_VISIBLE_FIELDS = {
  age: "Unspecified",
  gender: "Unspecified",
  profession: "Unspecified",
  background: "Unspecified",
  race: "Unspecified",
} as const;

const normalizePresetProfile = (
  profile: Partial<SavePresetProfile> | undefined | null,
): SavePresetProfile => ({
  narrativeStylePreset:
    profile?.narrativeStylePreset ??
    DEFAULT_SAVE_PRESET_PROFILE.narrativeStylePreset,
  worldDispositionPreset:
    profile?.worldDispositionPreset ??
    DEFAULT_SAVE_PRESET_PROFILE.worldDispositionPreset,
  playerMalicePreset:
    profile?.playerMalicePreset ??
    DEFAULT_SAVE_PRESET_PROFILE.playerMalicePreset,
  playerMaliceIntensity:
    profile?.playerMaliceIntensity ??
    DEFAULT_SAVE_PRESET_PROFILE.playerMaliceIntensity,
  locked: true,
});

const buildGlobalNotesMarkdown = (): string =>
  [
    "# World Notes (Story Teller AI)",
    "",
    "- Author: Story Teller AI (this AI instance writing to its future self)",
    "- Audience: Story Teller AI only (not player-facing raw content)",
    "- Purpose: Internal notes/prompts written by Story Teller AI for continuity and planning.",
    "- Visibility: Internal only. Do not surface raw notes content to player-facing narrative.",
    "",
    "## Index",
    "- Add concise bullets and link to topic notes when needed.",
    "",
  ].join("\n");

const ensureGlobalNotes = (session: VfsSession): void => {
  // Notes are Story Teller AI internal markdown self-notes.
  if (!session.readFile("world/notes.md")) {
    session.writeFile(
      "world/notes.md",
      buildGlobalNotesMarkdown(),
      "text/markdown",
    );
  }
};

const ensureCustomRulesReadme = (session: VfsSession): void => {
  if (!session.readFile(CUSTOM_RULES_README_PATH)) {
    session.writeFile(
      CUSTOM_RULES_README_PATH,
      CUSTOM_RULES_README_CONTENT,
      "text/markdown",
    );
  }
};

const ensureDirectoryStructure = (session: VfsSession): void => {
  ensureDirectoryScaffolds(session);
};

const omitUndefined = (value: JsonObject): JsonObject =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );

const asRecord = (value: unknown): JsonObject | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonObject;
};

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getKnownByList = (value: unknown): string[] => {
  const record = asRecord(value);
  if (!record || !Array.isArray(record.knownBy)) {
    return [];
  }
  return record.knownBy
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const stripUiOnlyFields = <T extends object>(value: T): T => {
  const next = { ...(value as JsonObject) };
  delete next.highlight;
  delete next.lastAccess;
  return next as T;
};

const buildPlaceholderDraftMarkdown = (placeholder: JsonObject): string => {
  const id = asTrimmedString(placeholder.id) ?? "unknown";
  const label =
    typeof placeholder.label === "string" ? placeholder.label.trim() : "";
  const visible = asRecord(placeholder.visible);
  const description =
    typeof visible?.description === "string" ? visible.description.trim() : "";
  const knownBy = getKnownByList(placeholder);

  const lines: string[] = ["# Placeholder Draft", "", `- id: ${id}`];
  if (label.length > 0) {
    lines.push(`- label: ${label}`);
  }
  if (knownBy.length > 0) {
    lines.push(`- knownBy: ${knownBy.join(", ")}`);
  }

  lines.push(
    "",
    "## Notes",
    description.length > 0 ? description : "- Pending concretization.",
    "",
    "## Raw Seed",
    "```json",
    JSON.stringify(stripUiOnlyFields(placeholder), null, 2),
    "```",
    "",
  );

  return lines.join("\n");
};

const writePlaceholderArtifacts = (
  session: VfsSession,
  placeholder: unknown,
): void => {
  const placeholderRecord = asRecord(placeholder);
  if (!placeholderRecord) {
    return;
  }
  const placeholderId = asTrimmedString(placeholderRecord.id);
  if (!placeholderId) {
    return;
  }
  session.writeFile(
    `world/placeholders/${placeholderId}.md`,
    buildPlaceholderDraftMarkdown(placeholderRecord),
    "text/markdown",
  );
};

const writePlaceholderDraftFile = (
  session: VfsSession,
  draftFile: unknown,
): void => {
  const draftRecord = asRecord(draftFile);
  if (!draftRecord) {
    return;
  }
  const rawPath =
    typeof draftRecord.path === "string" ? draftRecord.path.trim() : "";
  const rawMarkdown =
    typeof draftRecord.markdown === "string" ? draftRecord.markdown.trim() : "";

  if (!/^world\/placeholders\/[^/]+\.md$/.test(rawPath)) {
    return;
  }

  if (rawMarkdown.length === 0) {
    return;
  }

  session.writeFile(rawPath, rawMarkdown, "text/markdown");
};

const writeWorldInfoAndView = (
  session: VfsSession,
  worldInfo: unknown,
  playerActorId: string,
): void => {
  const worldInfoRecord = asRecord(worldInfo);
  const worldSettingUnlocked = worldInfoRecord?.worldSettingUnlocked;
  const worldSettingUnlockReason = worldInfoRecord?.worldSettingUnlockReason;
  const mainGoalUnlocked = worldInfoRecord?.mainGoalUnlocked;
  const mainGoalUnlockReason = worldInfoRecord?.mainGoalUnlockReason;
  const definition = sanitizeCanonicalWorldRecord(
    "world_info",
    worldInfo,
  ).sanitized;
  writeJson(session, "world/world_info.json", definition);
  writeJson(
    session,
    `world/characters/${playerActorId}/views/world_info.json`,
    omitUndefined({
      worldSettingUnlocked,
      worldSettingUnlockReason,
      mainGoalUnlocked,
      mainGoalUnlockReason,
    }),
  );
};

const writeQuestDefinitionAndView = (
  session: VfsSession,
  quest: unknown,
  playerActorId: string,
): void => {
  const questRecord = asRecord(quest);
  const questId = asTrimmedString(questRecord?.id);
  if (!questId) return;
  const status = questRecord?.status;
  const unlocked = questRecord?.unlocked;
  const unlockReason = questRecord?.unlockReason;
  const definition = sanitizeCanonicalWorldRecord("quests", quest).sanitized;
  writeJson(session, `world/quests/${questId}.json`, definition);

  const knownBy = getKnownByList(definition);
  if (!knownBy.includes(playerActorId)) return;

  writeJson(
    session,
    `world/characters/${playerActorId}/views/quests/${questId}.json`,
    omitUndefined({
      entityId: questId,
      status: status ?? "active",
      unlocked,
      unlockReason,
      objectiveState: questRecord?.objectiveState,
      acceptedAtGameTime: questRecord?.acceptedAtGameTime,
      completedAtGameTime: questRecord?.completedAtGameTime,
    }),
  );
};

const writeDefinitionAndView = (
  session: VfsSession,
  category:
    | "knowledge"
    | "timeline"
    | "locations"
    | "factions"
    | "causal_chains",
  entity: unknown,
  playerActorId: string,
  options?: { keyField?: string; viewExtra?: JsonObject },
): void => {
  const entityRecord = asRecord(entity);
  if (!entityRecord) return;
  const keyField = options?.keyField ?? "id";
  const id = entityRecord[keyField];
  if (typeof id !== "string" || id.trim().length === 0) return;

  const unlocked = entityRecord.unlocked;
  const unlockReason = entityRecord.unlockReason;
  const definition = sanitizeCanonicalWorldRecord(category, entity).sanitized;

  // Canonical write
  const basePath =
    category === "locations"
      ? "world/locations"
      : category === "factions"
        ? "world/factions"
        : category === "knowledge"
          ? "world/knowledge"
          : category === "timeline"
            ? "world/timeline"
            : "world/causal_chains";
  writeJson(session, `${basePath}/${id}.json`, definition);

  const knownBy = getKnownByList(definition);
  if (!knownBy.includes(playerActorId)) return;

  // View write
  const viewBase = `world/characters/${playerActorId}/views/${category}/${id}.json`;
  const view: JsonObject = omitUndefined({
    entityId: id,
    unlocked,
    unlockReason,
    ...(options?.viewExtra ?? {}),
  });
  writeJson(session, viewBase, view);
};

const writeActorBundle = (session: VfsSession, bundle: unknown): void => {
  const bundleRecord = asRecord(bundle);
  if (!bundleRecord) return;
  const profileRecord = asRecord(bundleRecord.profile);
  if (!profileRecord) return;
  const actorId = asTrimmedString(profileRecord.id);
  if (!actorId) return;

  const id = actorId;
  writeJson(
    session,
    `world/characters/${id}/profile.json`,
    stripUiOnlyFields(profileRecord),
  );

  const writeSub = (subPath: string, items: unknown) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      const itemRecord = asRecord(item);
      if (!itemRecord) continue;
      const itemId = asTrimmedString(itemRecord.id);
      if (!itemId) continue;
      writeJson(
        session,
        `world/characters/${id}/${subPath}/${itemId}.json`,
        stripUiOnlyFields(itemRecord),
      );
    }
  };

  writeSub("skills", bundleRecord.skills);
  writeSub("conditions", bundleRecord.conditions);
  writeSub("traits", bundleRecord.traits);
  writeSub("inventory", bundleRecord.inventory);
};

export const seedVfsSessionFromGameState = (
  session: VfsSession,
  state: GameState,
): void => {
  session.setActiveForkId(state.forkId ?? 0);
  ensureDirectoryStructure(session);
  ensureGlobalNotes(session);
  ensureCustomRulesReadme(session);
  ensureWorkspaceMemoryDocuments(session);

  writeJson(session, "world/global.json", {
    time: state.time,
    theme: state.theme,
    currentLocation: state.currentLocation,
    atmosphere: state.atmosphere,
    turnNumber: state.turnNumber,
    forkId: state.forkId,
    language: state.language,
    customContext: state.customContext,
    presetProfile: normalizePresetProfile(state.presetProfile),
    seedImageId: state.seedImageId,
    narrativeScale: state.narrativeScale,
    initialPrompt: state.initialPrompt,
  });

  writeJson(session, "summary/state.json", {
    summaries: state.summaries ?? [],
    lastSummarizedIndex: state.lastSummarizedIndex ?? 0,
  });

  if (state.themeConfig) {
    writeJson(session, "world/theme_config.json", state.themeConfig);
  }

  if (state.customRules) {
    for (const rule of state.customRules) {
      const id = asTrimmedString(rule.id);
      if (!id) continue;
      const title = asTrimmedString(rule.title) ?? id;
      const priority =
        typeof rule.priority === "number" && Number.isFinite(rule.priority)
          ? rule.priority
          : 99;

      const packPath = toCustomRulePackPath(priority, title);
      const markdown = buildCustomRulePackMarkdown({
        category: title,
        whenToApply: "Use when this category is relevant to the current scene.",
        rules:
          typeof rule.content === "string" && rule.content.trim().length > 0
            ? rule.content
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean)
            : [],
      });
      session.writeFile(packPath, markdown, "text/markdown");
    }
  }

  for (const actor of state.actors) {
    writeActorBundle(session, actor);
  }

  const playerActorId = state.playerActorId || "char:player";

  if (state.worldInfo) {
    writeWorldInfoAndView(session, state.worldInfo, playerActorId);
  }

  // Canonical + player views split
  for (const q of state.quests) {
    writeQuestDefinitionAndView(session, q, playerActorId);
  }
  for (const loc of state.locations) {
    const locRecord = asRecord(loc);
    writeDefinitionAndView(session, "locations", loc, playerActorId, {
      viewExtra: {
        isVisited: locRecord?.isVisited,
        visitedCount: locRecord?.visitedCount,
        discoveredAtGameTime: locRecord?.discoveredAt,
      },
    });
  }
  for (const k of state.knowledge) {
    const knowledgeRecord = asRecord(k);
    writeDefinitionAndView(session, "knowledge", k, playerActorId, {
      viewExtra: {
        discoveredAtGameTime: knowledgeRecord?.discoveredAt,
        beliefSummary: knowledgeRecord?.beliefSummary,
      },
    });
  }
  for (const f of state.factions) {
    const factionRecord = asRecord(f);
    writeDefinitionAndView(session, "factions", f, playerActorId, {
      viewExtra: {
        standing: factionRecord?.standing,
        standingTag: factionRecord?.standingTag,
      },
    });
  }
  for (const e of state.timeline) {
    const timelineRecord = asRecord(e);
    writeDefinitionAndView(session, "timeline", e, playerActorId, {
      viewExtra: {
        rememberedAs: timelineRecord?.rememberedAs,
        suspicions: timelineRecord?.suspicions,
      },
    });
  }

  for (const [locId, items] of Object.entries(
    state.locationItemsByLocationId,
  )) {
    for (const item of items) {
      const itemRecord = asRecord(item);
      const id = asTrimmedString(itemRecord?.id);
      if (!id) continue;
      writeJson(
        session,
        `world/locations/${locId}/items/${id}.json`,
        stripUiOnlyFields(itemRecord),
      );
    }
  }

  for (const chain of state.causalChains) {
    const chainRecord = asRecord(chain);
    if (!chainRecord || !asTrimmedString(chainRecord.chainId)) {
      continue;
    }
    writeDefinitionAndView(session, "causal_chains", chain, playerActorId, {
      keyField: "chainId",
      viewExtra: {
        investigationNotes: chainRecord.investigationNotes,
        linkedEventIds: chainRecord.linkedEventIds,
      },
    });
  }

  if (state.placeholders) {
    for (const placeholder of state.placeholders) {
      const placeholderRecord = asRecord(placeholder);
      if (!placeholderRecord) continue;
      writePlaceholderArtifacts(session, stripUiOnlyFields(placeholderRecord));
    }
  }
};

export const seedVfsSessionFromDefaults = (session: VfsSession): void => {
  ensureDirectoryStructure(session);
  ensureGlobalNotes(session);
  ensureCustomRulesReadme(session);
  ensureWorkspaceMemoryDocuments(session);

  writeJson(session, "world/global.json", {
    time: "Day 1, 08:00",
    theme: "fantasy",
    currentLocation: "Unknown",
    atmosphere: { envTheme: "fantasy", ambience: "quiet" },
    turnNumber: 0,
    forkId: 0,
    presetProfile: DEFAULT_SAVE_PRESET_PROFILE,
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
        age: DEFAULT_REQUIRED_PLAYER_VISIBLE_FIELDS.age,
        gender: DEFAULT_REQUIRED_PLAYER_VISIBLE_FIELDS.gender,
        profession: DEFAULT_REQUIRED_PLAYER_VISIBLE_FIELDS.profession,
        background: DEFAULT_REQUIRED_PLAYER_VISIBLE_FIELDS.background,
        race: DEFAULT_REQUIRED_PLAYER_VISIBLE_FIELDS.race,
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
    presetProfile?: SavePresetProfile;
    seedImageId?: string;
    narrativeScale?: GameState["narrativeScale"];
  },
): void => {
  const outlineRecord = asRecord(outline);
  const outlineNarrativeScale = outlineRecord?.narrativeScale;
  const outlinePlayer = outlineRecord?.player;
  const outlineNpcs = asArray(outlineRecord?.npcs);
  const outlinePlaceholders = asArray(outlineRecord?.placeholders);
  const outlineCausalChains = asArray(outlineRecord?.causalChains);
  const outlineLocationItems = asArray(outlineRecord?.locationItems);

  ensureDirectoryStructure(session);
  ensureGlobalNotes(session);
  ensureCustomRulesReadme(session);
  ensureWorkspaceMemoryDocuments(session);

  writeJson(session, "world/global.json", {
    time: options.time,
    theme: options.theme,
    currentLocation: options.currentLocation,
    atmosphere: options.atmosphere,
    turnNumber: 0,
    forkId: 0,
    language: options.language,
    customContext: options.customContext,
    presetProfile: normalizePresetProfile(options.presetProfile),
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

  // Canonical world info + per-actor unlock state
  writeWorldInfoAndView(
    session,
    {
      title: outline.title,
      premise: outline.premise,
      narrativeScale: outlineNarrativeScale,
      worldSetting: outline.worldSetting,
      mainGoal: outline.mainGoal,
      worldSettingUnlocked: false,
      mainGoalUnlocked: false,
    },
    "char:player",
  );

  // Actor-first outline seeding
  if (outlinePlayer) {
    writeActorBundle(session, outlinePlayer);
  }
  for (const npc of outlineNpcs) {
    writeActorBundle(session, npc);
  }
  for (const draftFile of outlinePlaceholders) {
    writePlaceholderDraftFile(session, draftFile);
  }

  // Canonical + per-actor views.
  const playerActorId = "char:player";
  const gameTime = options.time;
  const currentLocId = options.currentLocation;

  for (const q of outline.quests) {
    writeQuestDefinitionAndView(session, q, playerActorId);
  }
  for (const k of outline.knowledge) {
    writeDefinitionAndView(session, "knowledge", k, playerActorId, {
      viewExtra: { discoveredAtGameTime: gameTime },
    });
  }
  for (const e of outline.timeline) {
    writeDefinitionAndView(session, "timeline", e, playerActorId);
  }
  for (const f of outline.factions) {
    writeDefinitionAndView(session, "factions", f, playerActorId);
  }
  for (const loc of outline.locations) {
    const locId = asTrimmedString(asRecord(loc)?.id);
    writeDefinitionAndView(session, "locations", loc, playerActorId, {
      viewExtra: {
        discoveredAtGameTime: gameTime,
        isVisited: !!locId && locId === currentLocId,
        visitedCount: !!locId && locId === currentLocId ? 1 : 0,
      },
    });
  }
  for (const chain of outlineCausalChains) {
    const chainRecord = asRecord(chain);
    writeDefinitionAndView(session, "causal_chains", chain, playerActorId, {
      keyField: "chainId",
      viewExtra: {
        linkedEventIds: chainRecord?.linkedEventIds,
      },
    });
  }

  for (const item of outlineLocationItems) {
    const itemRecord = asRecord(item);
    const locId = asTrimmedString(itemRecord?.locationId);
    const id = asTrimmedString(itemRecord?.id);
    if (!locId || !id || !itemRecord) continue;
    writeJson(
      session,
      `world/locations/${locId}/items/${id}.json`,
      stripUiOnlyFields(itemRecord),
    );
  }
};
