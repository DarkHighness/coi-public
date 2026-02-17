import type { VfsSession } from "./vfsSession";
import {
  buildCustomRulePackMarkdown,
  CUSTOM_RULES_README_CONTENT,
  CUSTOM_RULES_README_PATH,
  toCustomRulePackPath,
} from "./customRules";
import { ensureDirectoryScaffolds } from "./directoryScaffolds";
import {
  type CanonicalWorldEntityCategory,
  sanitizeCanonicalWorldRecord,
  sanitizeOutlineWorldCollections,
} from "./stateLayering";

type SectionName =
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

interface SectionEditOptions {
  allowOutlineEdit?: boolean;
}

type JsonRecord = JsonObject;

interface ActorBundle {
  profile: JsonRecord;
  skills?: unknown;
  conditions?: unknown;
  traits?: unknown;
  inventory?: unknown;
}

const json = (value: unknown) => JSON.stringify(value);

const toObjectRecord = (value: unknown): JsonRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
};

const toTrimmedId = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toActorBundle = (value: unknown): ActorBundle | null => {
  const record = toObjectRecord(value);
  if (!record) {
    return null;
  }
  const profile = toObjectRecord(record.profile);
  if (!profile) {
    return null;
  }
  return {
    profile,
    skills: record.skills,
    conditions: record.conditions,
    traits: record.traits,
    inventory: record.inventory,
  };
};

const readJson = (session: VfsSession, path: string): unknown | null => {
  const file = session.readFile(path);
  if (!file || file.contentType !== "application/json") {
    return null;
  }
  try {
    return JSON.parse(file.content) as unknown;
  } catch {
    return null;
  }
};

const writeJson = (session: VfsSession, path: string, value: unknown): void => {
  session.writeFile(path, json(value), "application/json");
};

const clearDir = (session: VfsSession, prefix: string): void => {
  const walk = (directoryPath: string): void => {
    const entries = session.list(directoryPath);
    for (const entry of entries) {
      const path = `${directoryPath}/${entry}`;
      if (session.readFile(path)) {
        session.deleteFile(path);
        continue;
      }
      walk(path);
    }
  };

  walk(prefix);
};

const PLAYER_ID = "char:player";

const writeActorBundle = (session: VfsSession, bundle: ActorBundle): void => {
  const profile = bundle.profile;
  const id = toTrimmedId(profile.id);
  if (!id) return;
  writeJson(session, `world/characters/${id}/profile.json`, profile);

  const writeSub = (subPath: string, items: unknown): void => {
    if (!Array.isArray(items)) return;
    clearDir(session, `world/characters/${id}/${subPath}`);
    for (const item of items) {
      const itemRecord = toObjectRecord(item);
      if (!itemRecord) continue;
      const itemId = toTrimmedId(itemRecord.id);
      if (!itemId) continue;
      writeJson(
        session,
        `world/characters/${id}/${subPath}/${itemId}.json`,
        itemRecord,
      );
    }
  };

  writeSub("skills", bundle?.skills);
  writeSub("conditions", bundle?.conditions);
  writeSub("traits", bundle?.traits);
  writeSub("inventory", bundle?.inventory);
};

const deleteActorBundle = (session: VfsSession, actorId: string): void => {
  const id = actorId.trim();
  if (!id) return;
  const profilePath = `world/characters/${id}/profile.json`;
  if (session.readFile(profilePath)) {
    session.deleteFile(profilePath);
  }
  clearDir(session, `world/characters/${id}/skills`);
  clearDir(session, `world/characters/${id}/conditions`);
  clearDir(session, `world/characters/${id}/traits`);
  clearDir(session, `world/characters/${id}/inventory`);
};

const listSections: Record<
  Exclude<SectionName, "global" | "character" | "outline" | "npcs">,
  { prefix: string; idField: "id" | "chainId" }
> = {
  inventory: {
    prefix: `world/characters/${PLAYER_ID}/inventory`,
    idField: "id",
  },
  // Note: "npcs" is handled explicitly below (actor bundles under world/characters/*).
  locations: { prefix: "world/locations", idField: "id" },
  quests: { prefix: "world/quests", idField: "id" },
  knowledge: { prefix: "world/knowledge", idField: "id" },
  factions: { prefix: "world/factions", idField: "id" },
  timeline: { prefix: "world/timeline", idField: "id" },
  customRules: { prefix: "custom_rules", idField: "id" },
  causalChains: { prefix: "world/causal_chains", idField: "chainId" },
};

const WORLD_SECTION_TO_CATEGORY = {
  locations: "locations",
  quests: "quests",
  knowledge: "knowledge",
  factions: "factions",
  timeline: "timeline",
  causalChains: "causal_chains",
} as const;

export const applySectionEdit = (
  session: VfsSession,
  section: SectionName,
  data: unknown,
  options: SectionEditOptions = {},
): void => {
  if (section === "global") {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Global edits must be an object.");
    }
    const existing = readJson(session, "world/global.json");
    const merged =
      existing && typeof existing === "object" && !Array.isArray(existing)
        ? { ...(existing as JsonObject), ...data }
        : { ...(data as JsonObject) };
    writeJson(session, "world/global.json", merged);
    return;
  }

  if (section === "character") {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Character edits must be an object.");
    }

    const maybeBundle = toActorBundle(data);
    if (maybeBundle) {
      writeActorBundle(session, maybeBundle);
      return;
    }

    throw new Error(
      "Character edits must use actor bundle shape: { profile, skills?, conditions?, traits?, inventory? }.",
    );
  }

  if (section === "npcs") {
    if (!Array.isArray(data)) {
      throw new Error(`Section "${section}" expects an array.`);
    }

    // Remove existing NPC actors (preserve the player).
    const actorIds = session.list("world/characters");
    for (const actorId of actorIds) {
      if (actorId === PLAYER_ID) continue;
      const profile = toObjectRecord(
        readJson(session, `world/characters/${actorId}/profile.json`),
      );
      if (profile && profile.kind === "npc") {
        deleteActorBundle(session, actorId);
      }
    }

    // Write new NPCs from actor bundles.
    for (const entry of data) {
      const bundle = toActorBundle(entry);
      if (!bundle) {
        throw new Error(
          "NPC entries must use actor bundle shape: { profile, skills?, conditions?, traits?, inventory? }.",
        );
      }
      const profileId = toTrimmedId(bundle.profile.id);
      if (!profileId) {
        throw new Error("Missing profile.id for npc entry.");
      }
      writeActorBundle(session, bundle);
    }
    return;
  }

  if (section === "outline") {
    if (!options.allowOutlineEdit) {
      throw new Error("Outline edits are not allowed.");
    }
    const sanitized = sanitizeOutlineWorldCollections(data);
    for (const warning of sanitized.warnings) {
      console.warn(`[VFS Editor] ${warning}`);
    }
    writeJson(session, "outline/outline.json", sanitized.sanitized);
    return;
  }

  if (section === "customRules") {
    if (!Array.isArray(data)) {
      throw new Error(`Section "${section}" expects an array.`);
    }

    clearDir(session, "custom_rules");
    ensureDirectoryScaffolds(session);

    if (!session.readFile(CUSTOM_RULES_README_PATH)) {
      session.writeFile(
        CUSTOM_RULES_README_PATH,
        CUSTOM_RULES_README_CONTENT,
        "text/markdown",
      );
    }

    for (const ruleValue of data) {
      const rule = toObjectRecord(ruleValue);
      if (!rule) continue;
      const id = toTrimmedId(rule.id);
      const title = typeof rule.title === "string" ? rule.title : null;
      const content = typeof rule.content === "string" ? rule.content : null;
      const priority = typeof rule.priority === "number" ? rule.priority : 99;
      if (!id) {
        throw new Error("Missing id for custom rule entry.");
      }

      const path = toCustomRulePackPath(priority, title || id);
      const markdown = buildCustomRulePackMarkdown({
        category: title || id,
        whenToApply: "Use when this category is relevant to the current scene.",
        rules:
          typeof content === "string" && content.trim().length > 0
            ? content
                .split(/\r?\n/)
                .map((line: string) => line.trim())
                .filter(Boolean)
            : [],
      });
      session.writeFile(path, markdown, "text/markdown");
    }
    return;
  }

  const config = listSections[section];
  if (!config) {
    throw new Error(`Unsupported section: ${section}`);
  }

  if (!Array.isArray(data)) {
    throw new Error(`Section "${section}" expects an array.`);
  }

  clearDir(session, config.prefix);

  for (const item of data) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const id = (item as JsonObject)[config.idField];
    if (typeof id !== "string" || id.trim().length === 0) {
      throw new Error(`Missing ${config.idField} for ${section} entry.`);
    }
    const category = (
      WORLD_SECTION_TO_CATEGORY as Record<
        string,
        CanonicalWorldEntityCategory | undefined
      >
    )[section];
    if (category) {
      const sanitized = sanitizeCanonicalWorldRecord(category, item);
      if (sanitized.strippedKeys.length > 0) {
        console.warn(
          `[VFS Editor] Ignored view/UI fields for ${section}/${id}: ${sanitized.strippedKeys.join(", ")}`,
        );
      }
      writeJson(session, `${config.prefix}/${id}.json`, sanitized.sanitized);
      continue;
    }

    writeJson(session, `${config.prefix}/${id}.json`, item);
  }
};
