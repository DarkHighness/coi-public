import type { VfsSession } from "./vfsSession";

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
  | "outline";

interface SectionEditOptions {
  allowOutlineEdit?: boolean;
}

const json = (value: unknown) => JSON.stringify(value);

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
  const entries = session.list(prefix);
  for (const entry of entries) {
    const path = `${prefix}/${entry}`;
    if (session.readFile(path)) {
      session.deleteFile(path);
    }
  }
};

const listSections: Record<
  Exclude<SectionName, "global" | "character" | "outline">,
  { prefix: string; idField: "id" | "chainId" }
> = {
  inventory: { prefix: "world/inventory", idField: "id" },
  npcs: { prefix: "world/npcs", idField: "id" },
  locations: { prefix: "world/locations", idField: "id" },
  quests: { prefix: "world/quests", idField: "id" },
  knowledge: { prefix: "world/knowledge", idField: "id" },
  factions: { prefix: "world/factions", idField: "id" },
  timeline: { prefix: "world/timeline", idField: "id" },
  causalChains: { prefix: "world/causal_chains", idField: "chainId" },
};

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
        ? { ...(existing as Record<string, unknown>), ...data }
        : { ...(data as Record<string, unknown>) };
    writeJson(session, "world/global.json", merged);
    return;
  }

  if (section === "character") {
    writeJson(session, "world/character.json", data);
    return;
  }

  if (section === "outline") {
    if (!options.allowOutlineEdit) {
      throw new Error("Outline edits are not allowed.");
    }
    writeJson(session, "outline/outline.json", data);
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
    const id = (item as Record<string, unknown>)[config.idField];
    if (typeof id !== "string" || id.trim().length === 0) {
      throw new Error(`Missing ${config.idField} for ${section} entry.`);
    }
    writeJson(session, `${config.prefix}/${id}.json`, item);
  }
};
