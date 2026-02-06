/**
 * VFS Tool Handlers
 */

import {
  VFS_LS_TOOL,
  VFS_READ_TOOL,
  VFS_READ_MANY_TOOL,
  VFS_READ_JSON_TOOL,
  VFS_SCHEMA_TOOL,
  VFS_STAT_TOOL,
  VFS_GLOB_TOOL,
  VFS_SEARCH_TOOL,
  VFS_GREP_TOOL,
  VFS_LS_ENTRIES_TOOL,
  VFS_SUGGEST_DUPLICATES_TOOL,
  VFS_WRITE_TOOL,
  VFS_APPEND_TOOL,
  VFS_TEXT_EDIT_TOOL,
  VFS_EDIT_TOOL,
  VFS_MERGE_TOOL,
  VFS_MOVE_TOOL,
  VFS_DELETE_TOOL,
  VFS_COMMIT_TURN_TOOL,
  VFS_TX_TOOL,
  VFS_FINISH_SUMMARY_TOOL,
  VFS_SUBMIT_OUTLINE_PHASE_TOOL,
  getTypedArgs,
} from "../../tools";
import {
  createError,
  createSuccess,
  type ToolCallResult,
} from "../toolResult";
import type { VfsFileMap } from "../../vfs/types";
import { stripCurrentPath, toCurrentPath } from "../../vfs/currentAlias";
import { normalizeVfsPath } from "../../vfs/utils";
import { VfsSession } from "../../vfs/vfsSession";
import { getSchemaForPath } from "../../vfs/schemas";
import Fuse from "fuse.js";
import { getRAGService } from "../../rag";
import {
  outlinePhase0Schema,
  outlinePhase1Schema,
  outlinePhase2Schema,
  outlinePhase3Schema,
  outlinePhase4Schema,
  outlinePhase5Schema,
  outlinePhase6Schema,
  outlinePhase7Schema,
  outlinePhase8Schema,
  outlinePhase9Schema,
} from "../../schemas";
import {
  buildTurnId,
  type ConversationIndex,
  readConversationIndex,
  readTurnFile,
  writeConversationIndex,
  writeTurnFile,
} from "../../vfs/conversation";
import { registerToolHandler, type ToolContext } from "../toolHandlerRegistry";
import { getVfsSchemaHint } from "../../providers/utils";

interface VfsMatch {
  path: string;
  line: number;
  text: string;
}

interface FuseMatch extends VfsMatch {
  scopePath: string;
}

const cloneSession = (session: VfsSession): VfsSession => {
  const clone = new VfsSession();
  clone.restore(session.snapshot());
  clone.restoreToolSeenPaths(session.snapshotToolSeenPaths());
  return clone;
};

const commitSession = (target: VfsSession, source: VfsSession): void => {
  target.restore(source.snapshot());
  target.restoreToolSeenPaths(source.snapshotToolSeenPaths());
};

const getSession = (ctx: ToolContext): VfsSession => ctx.vfsSession;

const isReadOnlyToolPath = (path: string): boolean => {
  const normalized = normalizeVfsPath(path);
  return normalized === "skills" || normalized.startsWith("skills/");
};

const requireToolSeenForExistingFile = (
  session: VfsSession,
  path: string,
  operation: "overwrite" | "edit" | "merge" | "delete",
): ToolCallResult<never> | null => {
  const normalized = normalizeVfsPath(path);

  // Let the underlying VFS throw a read-only error so callers get the
  // most accurate message.
  if (isReadOnlyToolPath(normalized)) {
    return null;
  }

  const existing = session.readFile(normalized);
  if (!existing) {
    return null;
  }

  if (session.hasToolSeen(normalized)) {
    return null;
  }

  return createError(
    `Blocked: must read file before ${operation} in this session: ${toCurrentPath(normalized)} (use vfs_read first).`,
    "INVALID_ACTION",
  );
};

const TURN_ID_PATTERN = /^conversation\/turns\/fork-(\d+)\/turn-(\d+)\.json$/;

type JsonPointerResolveResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

const decodeJsonPointerToken = (token: string): string =>
  token.replace(/~1/g, "/").replace(/~0/g, "~");

const resolveJsonPointer = (
  document: unknown,
  pointer: string,
): JsonPointerResolveResult => {
  // RFC 6901: empty string means the whole document.
  // For ergonomics we also treat "/" as the root document (common user expectation).
  if (pointer === "" || pointer === "/") {
    return { ok: true, value: document };
  }
  if (!pointer.startsWith("/")) {
    return {
      ok: false,
      error: `Invalid JSON Pointer (must start with "/" or be empty): ${pointer}`,
    };
  }

  let current: unknown = document;
  const tokens = pointer
    .split("/")
    .slice(1)
    .map(decodeJsonPointerToken);

  for (const token of tokens) {
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(token)) {
        return {
          ok: false,
          error: `Pointer token "${token}" is not a valid array index`,
        };
      }
      const index = Number(token);
      if (!Number.isSafeInteger(index) || index < 0 || index >= current.length) {
        return { ok: false, error: `Array index out of bounds: ${token}` };
      }
      current = current[index];
      continue;
    }

    if (current && typeof current === "object") {
      const record = current as Record<string, unknown>;
      if (!(token in record)) {
        return { ok: false, error: `Missing key "${token}"` };
      }
      current = record[token];
      continue;
    }

    return {
      ok: false,
      error: `Cannot resolve "${token}" on a non-container value`,
    };
  }

  return { ok: true, value: current };
};

const describeJsonValueType = (value: unknown): string => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
};

const escapeRegExpChar = (char: string): string => {
  return char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const globToRegExp = (pattern: string, options?: { ignoreCase?: boolean }): RegExp => {
  // Supports:
  // - ** (any chars including '/')
  // - *  (any chars except '/')
  // - ?  (single char except '/')
  // We intentionally keep this small + deterministic; no brace expansions.
  let regex = "^";

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i] ?? "";

    if (char === "*") {
      const next = pattern[i + 1];
      if (next === "*") {
        const after = pattern[i + 2];
        // Special-case "**/" so it can match "no directory" as well as "many directories".
        // Example: "world/**/*.json" should match both "world/a.json" and "world/sub/a.json".
        if (after === "/") {
          regex += "(?:.*\\/)?";
          i += 2;
          continue;
        }
        regex += ".*";
        i += 1;
        continue;
      }
      regex += "[^/]*";
      continue;
    }

    if (char === "?") {
      regex += "[^/]";
      continue;
    }

    regex += escapeRegExpChar(char);
  }

  regex += "$";
  return new RegExp(regex, options?.ignoreCase ? "i" : undefined);
};

const resolveCurrentPathLoose = (
  path?: string,
): { ok: true; path: string } | { ok: false; error: ToolCallResult } => {
  if (!path) {
    return resolveCurrentPath(path);
  }
  const normalized = normalizeVfsPath(path);
  const qualified =
    normalized === "current" || normalized.startsWith("current/")
      ? normalized
      : `current/${normalized}`;
  return resolveCurrentPath(qualified);
};

const deriveConversationIndexFromSnapshot = (
  snapshot: VfsFileMap,
): { index: ConversationIndex } => {
  const turnsByFork = new Map<number, number[]>();

  for (const file of Object.values(snapshot)) {
    const match = TURN_ID_PATTERN.exec(normalizeVfsPath(file.path));
    if (!match) {
      continue;
    }
    const forkId = Number(match[1]);
    const turnNumber = Number(match[2]);
    if (!Number.isFinite(forkId) || !Number.isFinite(turnNumber)) {
      continue;
    }
    const turns = turnsByFork.get(forkId) ?? [];
    turns.push(turnNumber);
    turnsByFork.set(forkId, turns);
  }

  if (turnsByFork.size === 0) {
    return {
      index: {
        activeForkId: 0,
        activeTurnId: "fork-0/turn-0",
        rootTurnIdByFork: { "0": "fork-0/turn-0" },
        latestTurnNumberByFork: { "0": 0 },
        turnOrderByFork: { "0": ["fork-0/turn-0"] },
      },
    };
  }

  const forkIds = Array.from(turnsByFork.keys()).sort((a, b) => a - b);
  const activeForkId = forkIds[0];

  const rootTurnIdByFork: Record<string, string> = {};
  const latestTurnNumberByFork: Record<string, number> = {};
  const turnOrderByFork: Record<string, string[]> = {};

  for (const forkId of forkIds) {
    const turns = turnsByFork.get(forkId) ?? [];
    turns.sort((a, b) => a - b);
    const forkKey = String(forkId);
    const order = turns.map((turn) => buildTurnId(forkId, turn));
    turnOrderByFork[forkKey] = order;
    rootTurnIdByFork[forkKey] = order[0];
    latestTurnNumberByFork[forkKey] = turns[turns.length - 1];
  }

  const activeForkKey = String(activeForkId);
  const activeOrder = turnOrderByFork[activeForkKey] ?? [];
  const activeTurnId =
    activeOrder.length > 0 ? activeOrder[activeOrder.length - 1] : "fork-0/turn-0";

  return {
    index: {
      activeForkId,
      activeTurnId,
      rootTurnIdByFork,
      latestTurnNumberByFork,
      turnOrderByFork,
    },
  };
};

const ensureConversationIndex = (
  draft: VfsSession,
): ConversationIndex => {
  const snapshot = draft.snapshot();
  const existing = readConversationIndex(snapshot);
  if (existing) {
    return existing;
  }

  const { index } = deriveConversationIndexFromSnapshot(snapshot);
  writeConversationIndex(draft, index);

  // Ensure the active turn file exists (best-effort). This keeps downstream
  // consumers robust when migrating from older snapshots.
  const match = /fork-(\d+)\/turn-(\d+)/.exec(index.activeTurnId);
  if (match) {
    const forkId = Number(match[1]);
    const turnNumber = Number(match[2]);
    const existingTurn = readTurnFile(snapshot, forkId, turnNumber);
    if (!existingTurn) {
      writeTurnFile(draft, forkId, turnNumber, {
        turnId: index.activeTurnId,
        forkId,
        turnNumber,
        parentTurnId: null,
        createdAt: Date.now(),
        userAction: "",
        assistant: { narrative: "", choices: [] },
      });
    }
  }

  return index;
};

type VfsCatalogEntry = {
  path: string;
  id: string;
  displayName: string;
  unlocked?: boolean;
  status?: string;
};

type VfsCatalogCategoryResult = {
  total: number;
  truncated: boolean;
  entries: VfsCatalogEntry[];
};

type DuplicateCandidate = VfsCatalogEntry & { matchText: string };

const PLAYER_ID = "char:player";

const safeParseJson = (input: string): unknown | null => {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return null;
  }
};

const normalizeDisplayName = (value: unknown): string => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return "Unknown";
};

const viewPathFor = (category: string, entityId: string): string =>
  `world/characters/${PLAYER_ID}/views/${category}/${entityId}.json`;

const tryReadViewJson = (
  snapshot: VfsFileMap,
  category: string,
  entityId: string,
): any | null => {
  const file = snapshot[viewPathFor(category, entityId)];
  if (!file || file.contentType !== "application/json") {
    return null;
  }
  return safeParseJson(file.content) as any;
};

const listCatalogEntriesForCategory = (
  session: VfsSession,
  category: string,
): DuplicateCandidate[] => {
  const snapshot = session.snapshot();

  if (category === "world_info") {
    const file = snapshot["world/world_info.json"];
    if (!file || file.contentType !== "application/json") {
      return [];
    }
    const parsed = safeParseJson(file.content) as any;
    const displayName = normalizeDisplayName(parsed?.title);
    return [
      {
        path: toCurrentPath(file.path),
        id: "world_info",
        displayName,
        matchText: `${displayName} ${normalizeDisplayName(parsed?.premise)}`.trim(),
      },
    ];
  }

  if (category === "quest_views") {
    return Object.values(snapshot)
      .filter(
        (file) =>
          file.contentType === "application/json" &&
          file.path.startsWith(`world/characters/${PLAYER_ID}/views/quests/`) &&
          file.path.endsWith(".json"),
      )
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.entityId === "string" && parsed.entityId.trim()
            ? parsed.entityId
            : file.path.split("/").pop()?.replace(/\.json$/, "") || file.path;
        const quest = snapshot[`world/quests/${id}.json`];
        const questParsed = quest ? (safeParseJson(quest.content) as any) : null;
        const displayName = normalizeDisplayName(questParsed?.title ?? id);
        const unlocked = parsed?.unlocked === true;
        const status =
          typeof parsed?.status === "string" && parsed.status.trim()
            ? parsed.status.trim()
            : undefined;
        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          unlocked,
          status,
          matchText: displayName,
        };
      });
  }

  if (category === "knowledge_views") {
    return Object.values(snapshot)
      .filter(
        (file) =>
          file.contentType === "application/json" &&
          file.path.startsWith(`world/characters/${PLAYER_ID}/views/knowledge/`) &&
          file.path.endsWith(".json"),
      )
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.entityId === "string" && parsed.entityId.trim()
            ? parsed.entityId
            : file.path.split("/").pop()?.replace(/\.json$/, "") || file.path;
        const entry = snapshot[`world/knowledge/${id}.json`];
        const entryParsed = entry ? (safeParseJson(entry.content) as any) : null;
        const displayName = normalizeDisplayName(entryParsed?.title ?? id);
        const unlocked = parsed?.unlocked === true;
        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          unlocked,
          matchText: displayName,
        };
      });
  }

  if (category === "timeline_views") {
    return Object.values(snapshot)
      .filter(
        (file) =>
          file.contentType === "application/json" &&
          file.path.startsWith(`world/characters/${PLAYER_ID}/views/timeline/`) &&
          file.path.endsWith(".json"),
      )
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.entityId === "string" && parsed.entityId.trim()
            ? parsed.entityId
            : file.path.split("/").pop()?.replace(/\.json$/, "") || file.path;
        const ev = snapshot[`world/timeline/${id}.json`];
        const evParsed = ev ? (safeParseJson(ev.content) as any) : null;
        const displayName = normalizeDisplayName(evParsed?.name ?? id);
        const unlocked = parsed?.unlocked === true;
        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          unlocked,
          matchText: displayName,
        };
      });
  }

  if (category === "location_views") {
    return Object.values(snapshot)
      .filter(
        (file) =>
          file.contentType === "application/json" &&
          file.path.startsWith(`world/characters/${PLAYER_ID}/views/locations/`) &&
          file.path.endsWith(".json"),
      )
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.entityId === "string" && parsed.entityId.trim()
            ? parsed.entityId
            : file.path.split("/").pop()?.replace(/\.json$/, "") || file.path;
        const loc = snapshot[`world/locations/${id}.json`];
        const locParsed = loc ? (safeParseJson(loc.content) as any) : null;
        const displayName = normalizeDisplayName(locParsed?.name ?? id);
        const unlocked = parsed?.unlocked === true;
        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          unlocked,
          matchText: displayName,
        };
      });
  }

  if (category === "faction_views") {
    return Object.values(snapshot)
      .filter(
        (file) =>
          file.contentType === "application/json" &&
          file.path.startsWith(`world/characters/${PLAYER_ID}/views/factions/`) &&
          file.path.endsWith(".json"),
      )
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.entityId === "string" && parsed.entityId.trim()
            ? parsed.entityId
            : file.path.split("/").pop()?.replace(/\.json$/, "") || file.path;
        const fac = snapshot[`world/factions/${id}.json`];
        const facParsed = fac ? (safeParseJson(fac.content) as any) : null;
        const displayName = normalizeDisplayName(facParsed?.name ?? id);
        const unlocked = parsed?.unlocked === true;
        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          unlocked,
          matchText: displayName,
        };
      });
  }

  if (category === "causal_chain_views") {
    return Object.values(snapshot)
      .filter(
        (file) =>
          file.contentType === "application/json" &&
          file.path.startsWith(
            `world/characters/${PLAYER_ID}/views/causal_chains/`,
          ) &&
          file.path.endsWith(".json"),
      )
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.entityId === "string" && parsed.entityId.trim()
            ? parsed.entityId
            : file.path.split("/").pop()?.replace(/\.json$/, "") || file.path;
        const chain = snapshot[`world/causal_chains/${id}.json`];
        const chainParsed = chain ? (safeParseJson(chain.content) as any) : null;
        const displayName = normalizeDisplayName(chainParsed?.chainId ?? id);
        const unlocked = parsed?.unlocked === true;
        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          unlocked,
          matchText: displayName,
        };
      });
  }

  if (category === "inventory") {
    return Object.values(snapshot)
      .filter(
        (file) =>
          file.contentType === "application/json" &&
          file.path.startsWith(`world/characters/${PLAYER_ID}/inventory/`) &&
          file.path.endsWith(".json"),
      )
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.id === "string" && parsed.id.trim()
            ? parsed.id
            : file.path.split("/").pop()?.replace(/\.json$/, "") || file.path;
        const displayName = normalizeDisplayName(parsed?.name);
        const unlocked = parsed?.unlocked === true;
        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          unlocked,
          matchText: displayName,
        };
      });
  }

  if (category === "location_items") {
    return Object.values(snapshot)
      .filter((file) => {
        if (file.contentType !== "application/json") return false;
        if (!file.path.startsWith("world/locations/")) return false;
        if (!file.path.includes("/items/")) return false;
        return file.path.endsWith(".json");
      })
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.id === "string" && parsed.id.trim()
            ? parsed.id
            : file.path.split("/").pop()?.replace(/\.json$/, "") || file.path;
        const displayName = normalizeDisplayName(parsed?.name);
        const unlocked = parsed?.unlocked === true;
        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          unlocked,
          matchText: displayName,
        };
      });
  }

  if (category === "npcs") {
    return Object.values(snapshot)
      .filter(
        (file) =>
          file.contentType === "application/json" &&
          file.path.startsWith("world/characters/") &&
          file.path.endsWith("/profile.json"),
      )
      .filter((file) => {
        const parsed = safeParseJson(file.content) as any;
        return parsed?.kind === "npc";
      })
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.id === "string" && parsed.id.trim()
            ? parsed.id
            : file.path.split("/")[2] || file.path;
        const displayName = normalizeDisplayName(parsed?.visible?.name);
        const unlocked = parsed?.unlocked === true;
        const status =
          typeof parsed?.visible?.status === "string" && parsed.visible.status.trim()
            ? parsed.visible.status.trim()
            : undefined;

        const trueName =
          typeof parsed?.hidden?.trueName === "string" && parsed.hidden.trueName.trim()
            ? parsed.hidden.trueName.trim()
            : "";
        const matchText = trueName ? `${displayName} ${trueName}` : displayName;

        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          unlocked,
          status,
          matchText,
        };
      });
  }

  if (category === "locations") {
    return Object.values(snapshot)
      .filter(
        (file) =>
          file.contentType === "application/json" &&
          file.path.startsWith("world/locations/") &&
          file.path.endsWith(".json"),
      )
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.id === "string" && parsed.id.trim()
            ? parsed.id
            : file.path.split("/").pop()?.replace(/\.json$/, "") || file.path;
        const displayName = normalizeDisplayName(parsed?.name);
        const view = tryReadViewJson(snapshot, "locations", id);
        const unlocked = view?.unlocked === true;
        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          unlocked,
          matchText: displayName,
        };
      });
  }

  if (category === "quests") {
    return Object.values(snapshot)
      .filter(
        (file) =>
          file.contentType === "application/json" &&
          file.path.startsWith("world/quests/") &&
          file.path.endsWith(".json"),
      )
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.id === "string" && parsed.id.trim()
            ? parsed.id
            : file.path.split("/").pop()?.replace(/\.json$/, "") || file.path;
        const displayName = normalizeDisplayName(parsed?.title);
        const view = tryReadViewJson(snapshot, "quests", id);
        const unlocked = view?.unlocked === true;
        const status =
          typeof view?.status === "string" && view.status.trim()
            ? view.status.trim()
            : undefined;
        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          unlocked,
          status,
          matchText: displayName,
        };
      });
  }

  if (category === "knowledge") {
    return Object.values(snapshot)
      .filter(
        (file) =>
          file.contentType === "application/json" &&
          file.path.startsWith("world/knowledge/") &&
          file.path.endsWith(".json"),
      )
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.id === "string" && parsed.id.trim()
            ? parsed.id
            : file.path.split("/").pop()?.replace(/\.json$/, "") || file.path;
        const displayName = normalizeDisplayName(parsed?.title);
        const view = tryReadViewJson(snapshot, "knowledge", id);
        const unlocked = view?.unlocked === true;
        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          unlocked,
          matchText: displayName,
        };
      });
  }

  if (category === "factions") {
    return Object.values(snapshot)
      .filter(
        (file) =>
          file.contentType === "application/json" &&
          file.path.startsWith("world/factions/") &&
          file.path.endsWith(".json"),
      )
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.id === "string" && parsed.id.trim()
            ? parsed.id
            : file.path.split("/").pop()?.replace(/\.json$/, "") || file.path;
        const displayName = normalizeDisplayName(parsed?.name);
        const view = tryReadViewJson(snapshot, "factions", id);
        const unlocked = view?.unlocked === true;
        const status =
          typeof parsed?.status === "string" && parsed.status.trim()
            ? parsed.status.trim()
            : undefined;
        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          unlocked,
          status,
          matchText: displayName,
        };
      });
  }

  if (category === "timeline") {
    return Object.values(snapshot)
      .filter(
        (file) =>
          file.contentType === "application/json" &&
          file.path.startsWith("world/timeline/") &&
          file.path.endsWith(".json"),
      )
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.id === "string" && parsed.id.trim()
            ? parsed.id
            : file.path.split("/").pop()?.replace(/\.json$/, "") || file.path;
        const displayName = normalizeDisplayName(parsed?.event || parsed?.description);
        const view = tryReadViewJson(snapshot, "timeline", id);
        const unlocked = view?.unlocked === true;
        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          unlocked,
          matchText: displayName,
        };
      });
  }

  if (category === "causal_chains") {
    return Object.values(snapshot)
      .filter(
        (file) =>
          file.contentType === "application/json" &&
          file.path.startsWith("world/causal_chains/") &&
          file.path.endsWith(".json"),
      )
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.chainId === "string" && parsed.chainId.trim()
            ? parsed.chainId
            : file.path.split("/").pop()?.replace(/\.json$/, "") || file.path;
        const cause = typeof parsed?.cause === "string" ? parsed.cause : "";
        const effect = typeof parsed?.effect === "string" ? parsed.effect : "";
        const displayName =
          `${cause} → ${effect}`.trim() !== "→"
            ? `${cause} → ${effect}`.trim()
            : id;
        const view = tryReadViewJson(snapshot, "causal_chains", id);
        const unlocked = view?.unlocked === true;
        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          unlocked,
          matchText: displayName,
        };
      });
  }

  if (category === "character_profile") {
    const file = snapshot[`world/characters/${PLAYER_ID}/profile.json`];
    if (!file || file.contentType !== "application/json") {
      return [];
    }
    const parsed = safeParseJson(file.content) as any;
    const displayName = normalizeDisplayName(parsed?.visible?.name);
    const status =
      typeof parsed?.visible?.status === "string" && parsed.visible.status.trim()
        ? parsed.visible.status.trim()
        : undefined;
    return [
      {
        path: toCurrentPath(file.path),
        id: "character_profile",
        displayName,
        status,
        matchText: displayName,
      },
    ];
  }

  if (category === "character_skills") {
    return Object.values(snapshot)
      .filter(
        (file) =>
          file.contentType === "application/json" &&
          file.path.startsWith(`world/characters/${PLAYER_ID}/skills/`) &&
          file.path.endsWith(".json"),
      )
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.id === "string" && parsed.id.trim()
            ? parsed.id
            : file.path.split("/").pop()?.replace(/\.json$/, "") || file.path;
        const displayName = normalizeDisplayName(parsed?.name);
        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          matchText: displayName,
        };
      });
  }

  if (category === "character_conditions") {
    return Object.values(snapshot)
      .filter(
        (file) =>
          file.contentType === "application/json" &&
          file.path.startsWith(`world/characters/${PLAYER_ID}/conditions/`) &&
          file.path.endsWith(".json"),
      )
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.id === "string" && parsed.id.trim()
            ? parsed.id
            : file.path.split("/").pop()?.replace(/\.json$/, "") || file.path;
        const displayName = normalizeDisplayName(parsed?.name);
        const status =
          typeof parsed?.status === "string" && parsed.status.trim()
            ? parsed.status.trim()
            : undefined;
        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          status,
          matchText: displayName,
        };
      });
  }

  if (category === "character_traits") {
    return Object.values(snapshot)
      .filter(
        (file) =>
          file.contentType === "application/json" &&
          file.path.startsWith(`world/characters/${PLAYER_ID}/traits/`) &&
          file.path.endsWith(".json"),
      )
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.id === "string" && parsed.id.trim()
            ? parsed.id
            : file.path.split("/").pop()?.replace(/\.json$/, "") || file.path;
        const displayName = normalizeDisplayName(parsed?.name);
        const unlocked = parsed?.unlocked === true;
        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          unlocked,
          matchText: displayName,
        };
      });
  }

  if (category === "placeholders") {
    return Object.values(snapshot)
      .filter(
        (file) =>
          file.contentType === "application/json" &&
          file.path.startsWith("world/placeholders/") &&
          file.path.endsWith(".json"),
      )
      .map((file) => {
        const parsed = safeParseJson(file.content) as any;
        const id =
          typeof parsed?.id === "string" && parsed.id.trim()
            ? parsed.id
            : file.path.split("/").pop()?.replace(/\.json$/, "") || file.path;
        const displayName = normalizeDisplayName(parsed?.label);
        const unlocked = parsed?.unlocked === true;
        return {
          path: toCurrentPath(file.path),
          id,
          displayName,
          unlocked,
          matchText: displayName,
        };
      });
  }

  if (category === "summary") {
    const file = snapshot["summary/state.json"];
    if (!file || file.contentType !== "application/json") {
      return [];
    }
    const parsed = safeParseJson(file.content) as any;
    const summaries = Array.isArray(parsed?.summaries) ? parsed.summaries : [];
    return summaries.map((summary: any, idx: number) => {
      const idRaw = summary?.id;
      const id =
        typeof idRaw === "number" && Number.isFinite(idRaw)
          ? String(idRaw)
          : `summary:${idx}`;
      const displayName = normalizeDisplayName(summary?.displayText);
      return {
        path: "current/summary/state.json",
        id,
        displayName,
        matchText: displayName,
      };
    });
  }

  return [];
};

const resolveCurrentPath = (
  path?: string,
): { ok: true; path: string } | { ok: false; error: ToolCallResult } => {
  try {
    return { ok: true, path: stripCurrentPath(path ?? "current") };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: createError(message, "INVALID_DATA") };
  }
};

const withAtomicSession = <T>(
  ctx: ToolContext,
  action: (draft: VfsSession) => ToolCallResult<T>,
): ToolCallResult<T> => {
  const session = getSession(ctx);
  const draft = cloneSession(session);

  try {
    const result = action(draft);
    if (!result.success) {
      return result;
    }
    commitSession(session, draft);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("Path is read-only:")) {
      return createError(message, "INVALID_ACTION");
    }
    return createError(message, "UNKNOWN");
  }
};

registerToolHandler(VFS_LS_ENTRIES_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  const typedArgs = getTypedArgs("vfs_ls_entries", args);
  const limitPerCategory =
    typeof typedArgs.limitPerCategory === "number"
      ? typedArgs.limitPerCategory
      : null;

  const categories: Record<string, VfsCatalogCategoryResult> = {};

  for (const category of typedArgs.categories) {
    const candidates = listCatalogEntriesForCategory(session, category);

    const total = candidates.length;
    const entries: VfsCatalogEntry[] = candidates.map((entry) => {
      const result: VfsCatalogEntry = {
        path: entry.path,
        id: entry.id,
        displayName: entry.displayName,
      };
      if (typeof entry.unlocked === "boolean") {
        result.unlocked = entry.unlocked;
      }
      if (typeof entry.status === "string" && entry.status.trim()) {
        result.status = entry.status;
      }
      return result;
    });

    const limited =
      limitPerCategory && total > limitPerCategory
        ? entries.slice(0, limitPerCategory)
        : entries;

    categories[category] = {
      total,
      truncated: Boolean(limitPerCategory && total > limitPerCategory),
      entries: limited,
    };
  }

  return createSuccess({ categories }, "VFS catalog listed");
});

registerToolHandler(VFS_SUGGEST_DUPLICATES_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  const typedArgs = getTypedArgs("vfs_suggest_duplicates", args);
  const threshold =
    typeof typedArgs.threshold === "number" ? typedArgs.threshold : 0.25;
  const limitGroups =
    typeof typedArgs.limitGroups === "number" ? typedArgs.limitGroups : 10;
  const maxCandidatesPerGroup =
    typeof typedArgs.maxCandidatesPerGroup === "number"
      ? typedArgs.maxCandidatesPerGroup
      : 8;

  const candidates = listCatalogEntriesForCategory(session, typedArgs.category);
  if (candidates.length < 2) {
    return createSuccess(
      { category: typedArgs.category, threshold, groups: [] },
      "No candidates",
    );
  }

  const fuse = new Fuse(candidates, {
    keys: ["matchText"],
    includeScore: true,
    threshold,
    ignoreLocation: true,
    findAllMatches: false,
  });

  const parent = new Map<string, string>();
  const minScore = new Map<string, number>();

  for (const item of candidates) {
    parent.set(item.path, item.path);
    minScore.set(item.path, Number.POSITIVE_INFINITY);
  }

  const find = (x: string): string => {
    const p = parent.get(x);
    if (!p) return x;
    if (p === x) return x;
    const root = find(p);
    parent.set(x, root);
    return root;
  };

  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) {
      parent.set(rb, ra);
    }
  };

  for (const item of candidates) {
    const results = fuse.search(item.matchText);
    for (const result of results) {
      const other = result.item;
      if (!other || other.path === item.path) {
        continue;
      }
      const score =
        typeof result.score === "number" && Number.isFinite(result.score)
          ? result.score
          : null;
      if (score === null || score > threshold) {
        continue;
      }

      union(item.path, other.path);

      const prevA = minScore.get(item.path) ?? Number.POSITIVE_INFINITY;
      const prevB = minScore.get(other.path) ?? Number.POSITIVE_INFINITY;
      minScore.set(item.path, Math.min(prevA, score));
      minScore.set(other.path, Math.min(prevB, score));
    }
  }

  const groupsByRoot = new Map<string, DuplicateCandidate[]>();
  for (const item of candidates) {
    const root = find(item.path);
    const list = groupsByRoot.get(root) ?? [];
    list.push(item);
    groupsByRoot.set(root, list);
  }

  const groups = Array.from(groupsByRoot.values())
    .filter((group) => group.length >= 2)
    .map((group) => {
      const scored = group
        .map((candidate) => {
          const score = minScore.get(candidate.path);
          return {
            path: candidate.path,
            displayName: candidate.displayName,
            score:
              typeof score === "number" && Number.isFinite(score) ? score : 0,
          };
        })
        .sort((a, b) => a.score - b.score);

      return {
        candidates: scored.slice(0, maxCandidatesPerGroup),
      };
    })
    .sort(
      (a, b) =>
        (b.candidates?.length ?? 0) - (a.candidates?.length ?? 0) ||
        (a.candidates?.[0]?.score ?? 0) - (b.candidates?.[0]?.score ?? 0),
    )
    .slice(0, limitGroups);

  return createSuccess(
    { category: typedArgs.category, threshold, groups },
    "Duplicate suggestions ready",
  );
});

registerToolHandler(VFS_FINISH_SUMMARY_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_finish_summary", args);
  const nodeRange = typedArgs.nodeRange;

  if (!nodeRange || typeof nodeRange.toIndex !== "number") {
    return createError("vfs_finish_summary: missing nodeRange", "INVALID_DATA");
  }

  if (typedArgs.lastSummarizedIndex !== nodeRange.toIndex + 1) {
    return createError(
      `vfs_finish_summary: lastSummarizedIndex must equal nodeRange.toIndex + 1 (expected ${nodeRange.toIndex + 1}, got ${typedArgs.lastSummarizedIndex})`,
      "INVALID_DATA",
    );
  }

  return withAtomicSession(ctx, (draft) => {
    const existingFile = draft.readFile("summary/state.json");
    const parsed = existingFile ? safeParseJson(existingFile.content) : null;
    const existingState = parsed as any;
    const existingSummaries = Array.isArray(existingState?.summaries)
      ? existingState.summaries
      : [];

    const maxId = existingSummaries.reduce((max: number, summary: any) => {
      const id = summary?.id;
      return typeof id === "number" && Number.isFinite(id) ? Math.max(max, id) : max;
    }, -1);
    const nextId = maxId + 1;

    const summary = {
      id: nextId,
      createdAt: Date.now(),
      displayText: typedArgs.displayText,
      visible: typedArgs.visible,
      hidden: typedArgs.hidden,
      timeRange: typedArgs.timeRange ?? null,
      nodeRange: typedArgs.nodeRange,
    };

    const nextSummaries = [...existingSummaries, summary];

    draft.mergeJson("summary/state.json", {
      summaries: nextSummaries,
      lastSummarizedIndex: typedArgs.lastSummarizedIndex,
    });

    return createSuccess(
      { summary, path: "current/summary/state.json" },
      "Summary state updated",
    );
  });
});

const OUTLINE_PHASE_SCHEMAS = [
  outlinePhase0Schema,
  outlinePhase1Schema,
  outlinePhase2Schema,
  outlinePhase3Schema,
  outlinePhase4Schema,
  outlinePhase5Schema,
  outlinePhase6Schema,
  outlinePhase7Schema,
  outlinePhase8Schema,
  outlinePhase9Schema,
] as const;

const formatOutlineSubmitValidationError = (error: unknown): string => {
  const err = error as any;
  const issues = err?.issues;
  if (!Array.isArray(issues)) {
    return String(err?.message ?? error);
  }
  return issues
    .slice(0, 8)
    .map((issue: any) => {
      const path = Array.isArray(issue?.path) ? issue.path.join(".") : "";
      const message =
        typeof issue?.message === "string" ? issue.message : "Invalid";
      return path ? `${path}: ${message}` : message;
    })
    .join("; ");
};

registerToolHandler(VFS_SUBMIT_OUTLINE_PHASE_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  const typedArgs = getTypedArgs("vfs_submit_outline_phase", args);
  const phase = typedArgs.phase;
  if (
    typeof phase !== "number" ||
    !Number.isInteger(phase) ||
    phase < 0 ||
    phase > 9
  ) {
    return createError(
      `Invalid outline phase: ${String(typedArgs.phase)}`,
      "INVALID_DATA",
    );
  }

  const schema = OUTLINE_PHASE_SCHEMAS[phase];
  const parsed = schema.safeParse(typedArgs.data);
  if (!parsed.success) {
    return createError(
      `Outline phase ${phase} validation failed: ${formatOutlineSubmitValidationError(parsed.error)}`,
      "INVALID_DATA",
    );
  }

  const path = `outline/phases/phase${phase}.json`;
  session.writeFile(path, JSON.stringify(parsed.data), "application/json");
  return createSuccess(
    { phase, path: toCurrentPath(path) },
    "Outline phase submitted",
  );
});

const isInScope = (filePath: string, rootPath?: string): boolean => {
  if (!rootPath) {
    return true;
  }
  const normalized = normalizeVfsPath(rootPath);
  if (!normalized) {
    return true;
  }
  return filePath === normalized || filePath.startsWith(`${normalized}/`);
};

const makeRegexMatcher = (regex: RegExp) => {
  return (line: string): boolean => {
    const matches = regex.test(line);
    if (regex.global || regex.sticky) {
      regex.lastIndex = 0;
    }
    return matches;
  };
};

const collectMatches = (
  files: VfsFileMap,
  rootPath: string | undefined,
  matcher: (line: string) => boolean,
  limit: number,
): VfsMatch[] => {
  const matches: VfsMatch[] = [];

  for (const file of Object.values(files)) {
    if (!isInScope(file.path, rootPath)) {
      continue;
    }

    const lines = file.content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (matcher(line)) {
        matches.push({ path: file.path, line: i + 1, text: line });
        if (matches.length >= limit) {
          return matches;
        }
      }
    }
  }

  return matches;
};

const collectFuzzyMatches = (
  files: VfsFileMap,
  rootPath: string | undefined,
  query: string,
  limit: number,
): VfsMatch[] => {
  if (limit <= 0) {
    return [];
  }

  const candidates: FuseMatch[] = [];

  for (const file of Object.values(files)) {
    if (!isInScope(file.path, rootPath)) {
      continue;
    }

    const lines = file.content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const text = lines[i];
      candidates.push({
        path: file.path,
        line: i + 1,
        text,
        scopePath: file.path,
      });
    }
  }

  const fuse = new Fuse(candidates, {
    includeScore: true,
    shouldSort: true,
    ignoreLocation: true,
    threshold: 0.4,
    minMatchCharLength: Math.min(2, query.length),
    keys: [
      { name: "text", weight: 0.8 },
      { name: "scopePath", weight: 0.2 },
    ],
  });

  return fuse.search(query, { limit }).map((result) => ({
    path: result.item.path,
    line: result.item.line,
    text: result.item.text,
  }));
};

const mapEntityIdToVfsPath = (session: VfsSession, entityId: string): string | null => {
  const normalized = normalizeVfsPath(entityId);
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("story:")) {
    const nodeId = normalized.slice("story:".length);
    if (!nodeId) {
      return null;
    }
    return `conversation/turns/${nodeId}.json`;
  }

  if (normalized.startsWith("char:")) {
    const candidate = `world/characters/${normalized}/profile.json`;
    return session.readFile(candidate) ? candidate : null;
  }

  if (normalized.startsWith("npc:")) {
    const candidate = `world/characters/${normalized}/profile.json`;
    return session.readFile(candidate) ? candidate : null;
  }

  if (normalized.startsWith("loc:") || normalized.startsWith("location:")) {
    return `world/locations/${normalized}.json`;
  }

  if (normalized.startsWith("inv:") || normalized.startsWith("item:")) {
    const playerPath = `world/characters/${PLAYER_ID}/inventory/${normalized}.json`;
    if (session.readFile(playerPath)) {
      return playerPath;
    }
    // Location dropped items: world/locations/<locId>/items/<itemId>.json
    const snapshot = session.snapshot();
    const match = Object.keys(snapshot).find(
      (p) =>
        p.startsWith("world/locations/") &&
        p.includes("/items/") &&
        p.endsWith(`/${normalized}.json`),
    );
    return match ?? null;
  }

  if (normalized.startsWith("quest:")) {
    return `world/quests/${normalized}.json`;
  }

  if (normalized.startsWith("knowledge:") || normalized.startsWith("know:")) {
    return `world/knowledge/${normalized}.json`;
  }

  if (normalized.startsWith("faction:") || normalized.startsWith("fac:")) {
    return `world/factions/${normalized}.json`;
  }

  if (normalized.startsWith("timeline:") || normalized.startsWith("event:")) {
    return `world/timeline/${normalized}.json`;
  }

  if (
    normalized.startsWith("skill:") ||
    normalized.startsWith("condition:") ||
    normalized.startsWith("trait:") ||
    normalized.startsWith("attr:") ||
    normalized.startsWith("attribute:")
  ) {
    if (normalized.startsWith("skill:")) {
      return `world/characters/${PLAYER_ID}/skills/${normalized}.json`;
    }
    if (normalized.startsWith("condition:")) {
      return `world/characters/${PLAYER_ID}/conditions/${normalized}.json`;
    }
    if (normalized.startsWith("trait:")) {
      return `world/characters/${PLAYER_ID}/traits/${normalized}.json`;
    }
    return `world/characters/${PLAYER_ID}/profile.json`;
  }

  if (normalized.startsWith("outline:")) {
    return "outline/outline.json";
  }

  if (normalized.startsWith("chain:") || normalized.startsWith("causal_chain:")) {
    return `world/causal_chains/${normalized}.json`;
  }

  return null;
};

const formatRagPreview = (content: unknown): string => {
  if (typeof content !== "string") {
    return "";
  }
  const firstLine = content.split(/\r?\n/).find((line) => line.trim().length > 0);
  const preview = (firstLine ?? content).trim();
  if (preview.length <= 240) {
    return preview;
  }
  return `${preview.slice(0, 240)}…`;
};

const searchSemanticWithRag = async (
  session: VfsSession,
  query: string,
  options: {
    rootPath?: string;
    limit: number;
    forkId?: number;
    beforeTurn?: number;
  },
): Promise<VfsMatch[]> => {
  const ragService = getRAGService();
  if (!ragService || !ragService.initialized) {
    return [];
  }

  const { rootPath, limit, forkId, beforeTurn } = options;
  const requestedTopK = Math.min(Math.max(limit * 4, limit), 50);

  try {
    const results = await ragService.search(query, {
      topK: requestedTopK,
      threshold: 0.2,
      forkId,
      beforeTurn,
      currentForkOnly: true,
    });

    const mapped: VfsMatch[] = [];

    for (const result of results) {
      const path = mapEntityIdToVfsPath(session, result.document.entityId);
      if (!path) {
        continue;
      }
      if (rootPath && !isInScope(path, rootPath)) {
        continue;
      }
      if (!session.readFile(path)) {
        continue;
      }
      mapped.push({
        path,
        line: 1,
        text: formatRagPreview(result.document.content),
      });
      if (mapped.length >= limit) {
        break;
      }
    }

    return mapped;
  } catch (error) {
    console.warn("[VFS] Semantic search via RAG failed, falling back to text.", error);
    return [];
  }
};

// ============================================================================
// VFS Handlers
// ============================================================================

registerToolHandler(VFS_LS_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  const typedArgs = getTypedArgs("vfs_ls", args);
  const resolved = resolveCurrentPath(typedArgs.path);
  if (!resolved.ok) {
    return resolved.error;
  }
  const entries = session.list(resolved.path);
  return createSuccess({ entries }, "VFS entries listed");
});

registerToolHandler(VFS_READ_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  const typedArgs = getTypedArgs("vfs_read", args);
  const resolved = resolveCurrentPath(typedArgs.path);
  if (!resolved.ok) {
    return resolved.error;
  }
  const file = session.readFile(resolved.path);
  if (!file) {
    return createError(`File not found: ${typedArgs.path}`, "NOT_FOUND");
  }
  session.noteToolSeen(resolved.path);

  const startRaw = typedArgs.start;
  const offsetRaw = typedArgs.offset;
  const maxChars = typedArgs.maxChars;

  const start = typeof startRaw === "number" ? startRaw : 0;
  const hasOffset = typeof offsetRaw === "number";
  const hasMaxChars = typeof maxChars === "number";

  if (start > 0 && !hasOffset && !hasMaxChars) {
    return createError(
      "vfs_read: when providing start, also provide offset (preferred) or maxChars to avoid huge reads",
      "INVALID_DATA",
    );
  }

  const length = hasOffset ? offsetRaw : hasMaxChars ? maxChars : undefined;
  const totalChars = file.content.length;
  const sliceStart = Math.min(Math.max(start, 0), totalChars);
  const sliceEndExclusive =
    typeof length === "number"
      ? Math.min(sliceStart + Math.max(length, 0), totalChars)
      : totalChars;

  const content = file.content.slice(sliceStart, sliceEndExclusive);
  const truncated = sliceStart !== 0 || sliceEndExclusive !== totalChars;

  return createSuccess(
    {
      ...file,
      content,
      truncated,
      sliceStart,
      sliceEndExclusive,
      totalChars,
      path: toCurrentPath(file.path),
    },
    "VFS file read",
  );
});

registerToolHandler(VFS_SCHEMA_TOOL, (args, ctx) => {
  void ctx;
  const typedArgs = getTypedArgs("vfs_schema", args);

  const schemas: Array<{ path: string; hint: string }> = [];
  const missing: Array<{ path: string; error: string }> = [];

  for (const inputPath of typedArgs.paths) {
    const resolved = resolveCurrentPathLoose(inputPath);
    if (!resolved.ok) {
      return resolved.error;
    }

    try {
      const schema = getSchemaForPath(resolved.path);
      schemas.push({
        path: toCurrentPath(resolved.path),
        hint: getVfsSchemaHint(schema),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      missing.push({ path: inputPath, error: message });
    }
  }

  return createSuccess({ schemas, missing }, "VFS schema described");
});

registerToolHandler(VFS_STAT_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  const typedArgs = getTypedArgs("vfs_stat", args);
  const snapshot = session.snapshotAll();
  const snapshotPaths = Object.keys(snapshot);

  const stats: Array<
    | {
        kind: "file";
        path: string;
        contentType: string;
        totalChars: number;
        size: number;
        hash: string;
        updatedAt: number;
      }
    | {
        kind: "dir";
        path: string;
        fileCount: number;
        entries: string[];
      }
  > = [];
  const missing: string[] = [];

  for (const inputPath of typedArgs.paths) {
    const resolved = resolveCurrentPathLoose(inputPath);
    if (!resolved.ok) {
      return resolved.error;
    }

    const normalized = normalizeVfsPath(resolved.path);
    const file = session.readFile(normalized);
    if (file) {
      stats.push({
        kind: "file",
        path: toCurrentPath(file.path),
        contentType: file.contentType,
        totalChars: file.content.length,
        size: file.size,
        hash: file.hash,
        updatedAt: file.updatedAt,
      });
      continue;
    }

    const prefix = normalized.replace(/\/$/, "");
    const isDir =
      prefix === "" ||
      snapshotPaths.some((path) => path.startsWith(prefix + "/"));
    if (!isDir) {
      missing.push(inputPath);
      continue;
    }

    const fileCount =
      prefix === ""
        ? snapshotPaths.length
        : snapshotPaths.filter((path) => path.startsWith(prefix + "/")).length;
    const entries = session.list(prefix);
    stats.push({
      kind: "dir",
      path: toCurrentPath(prefix),
      fileCount,
      entries,
    });
  }

  return createSuccess({ stats, missing }, "VFS stat complete");
});

registerToolHandler(VFS_GLOB_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  const typedArgs = getTypedArgs("vfs_glob", args);
  const limit = typedArgs.limit ?? 200;
  const ignoreCase = Boolean(typedArgs.ignoreCase);
  const metaFields = typedArgs.metaFields ?? null;
  const returnMeta = Boolean(typedArgs.returnMeta) || metaFields !== null;
  if (limit <= 0) {
    return createSuccess(
      { matches: [], entries: returnMeta ? [] : undefined, truncated: false, totalMatches: 0 },
      "VFS glob complete",
    );
  }

  const regexes: RegExp[] = [];
  for (const raw of typedArgs.patterns) {
    const resolved = resolveCurrentPathLoose(raw);
    if (!resolved.ok) return resolved.error;
    const normalizedPattern = normalizeVfsPath(resolved.path);
    try {
      regexes.push(globToRegExp(normalizedPattern, { ignoreCase }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createError(`Invalid glob: ${message}`, "INVALID_DATA");
    }
  }

  const excludeRegexes: RegExp[] = [];
  if (typedArgs.excludePatterns) {
    for (const raw of typedArgs.excludePatterns) {
      const resolved = resolveCurrentPathLoose(raw);
      if (!resolved.ok) return resolved.error;
      const normalizedPattern = normalizeVfsPath(resolved.path);
      try {
        excludeRegexes.push(globToRegExp(normalizedPattern, { ignoreCase }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return createError(`Invalid exclude glob: ${message}`, "INVALID_DATA");
      }
    }
  }

  const snapshotPaths = Object.keys(session.snapshotAll());
  const matched = new Set<string>();

  for (const path of snapshotPaths) {
    if (excludeRegexes.some((re) => re.test(path))) {
      continue;
    }
    for (const regex of regexes) {
      if (regex.test(path)) {
        matched.add(path);
        break;
      }
    }
  }

  const allMatches = Array.from(matched).sort();
  const truncated = allMatches.length > limit;
  const selectedMatches = truncated ? allMatches.slice(0, limit) : allMatches;
  const matches = selectedMatches.map((p) => toCurrentPath(p));

  const entries = returnMeta
    ? selectedMatches.flatMap((path) => {
        const file = session.readFile(path);
        if (!file) {
          return [];
        }
        const entry: Record<string, unknown> = { path: toCurrentPath(file.path) };
        const include = (field: string): boolean =>
          metaFields === null ? true : metaFields.includes(field as any);

        if (include("contentType")) entry.contentType = file.contentType;
        if (include("totalChars")) entry.totalChars = file.content.length;
        if (include("size")) entry.size = file.size;
        if (include("hash")) entry.hash = file.hash;
        if (include("updatedAt")) entry.updatedAt = file.updatedAt;

        return [entry];
      })
    : undefined;

  return createSuccess(
    { matches, entries, truncated, totalMatches: allMatches.length },
    "VFS glob complete",
  );
});

registerToolHandler(VFS_READ_JSON_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  const typedArgs = getTypedArgs("vfs_read_json", args);
  const resolved = resolveCurrentPath(typedArgs.path);
  if (!resolved.ok) {
    return resolved.error;
  }
  const file = session.readFile(resolved.path);
  if (!file) {
    return createError(`File not found: ${typedArgs.path}`, "NOT_FOUND");
  }
  if (file.contentType !== "application/json") {
    return createError(`File is not JSON: ${typedArgs.path}`, "INVALID_DATA");
  }

  let document: unknown;
  try {
    document = JSON.parse(file.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createError(`Invalid JSON: ${message}`, "INVALID_DATA");
  }
  session.noteToolSeen(resolved.path);

  const maxChars = typedArgs.maxChars ?? 4000;
  const extracts: Array<{
    pointer: string;
    type: string;
    json: string;
    truncated: boolean;
    jsonChars: number;
  }> = [];
  const missing: Array<{ pointer: string; error: string }> = [];

  for (const pointer of typedArgs.pointers) {
    const resolvedPointer = resolveJsonPointer(document, pointer);
    if (!resolvedPointer.ok) {
      missing.push({ pointer, error: resolvedPointer.error });
      continue;
    }

    const valueType = describeJsonValueType(resolvedPointer.value);
    const jsonString = JSON.stringify(resolvedPointer.value);
    const fullJson = typeof jsonString === "string" ? jsonString : "null";
    let json = fullJson;
    let truncated = false;
    if (json.length > maxChars) {
      json = json.slice(0, maxChars);
      truncated = true;
    }

    extracts.push({
      pointer,
      type: valueType,
      json,
      truncated,
      jsonChars: fullJson.length,
    });
  }

  return createSuccess(
    {
      path: toCurrentPath(file.path),
      contentType: file.contentType,
      extracts,
      missing,
      size: file.size,
      hash: file.hash,
      updatedAt: file.updatedAt,
    },
    "VFS JSON subpaths read",
  );
});

registerToolHandler(VFS_READ_MANY_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  const typedArgs = getTypedArgs("vfs_read_many", args);
  const maxChars = typedArgs.maxChars;

  const files: Array<{
    path: string;
    contentType: string;
    content: string;
    truncated: boolean;
    size: number;
    hash: string;
    updatedAt: number;
  }> = [];
  const missing: string[] = [];

  for (const inputPath of typedArgs.paths) {
    const resolved = resolveCurrentPath(inputPath);
    if (!resolved.ok) {
      return resolved.error;
    }
    const file = session.readFile(resolved.path);
    if (!file) {
      missing.push(inputPath);
      continue;
    }
    session.noteToolSeen(resolved.path);

    let content = file.content;
    let truncated = false;
    if (typeof maxChars === "number" && content.length > maxChars) {
      content = content.slice(0, maxChars);
      truncated = true;
    }

    files.push({
      path: toCurrentPath(file.path),
      contentType: file.contentType,
      content,
      truncated,
      size: file.size,
      hash: file.hash,
      updatedAt: file.updatedAt,
    });
  }

  return createSuccess({ files, missing }, "VFS files read");
});

registerToolHandler(VFS_SEARCH_TOOL, async (args, ctx) => {
  const session = getSession(ctx);
  const typedArgs = getTypedArgs("vfs_search", args);
  const limit = typedArgs.limit ?? 20;
  if (limit <= 0) {
    return createSuccess({ results: [] }, "VFS search complete");
  }
  const resolvedPath = typedArgs.path
    ? resolveCurrentPath(typedArgs.path)
    : null;
  if (resolvedPath && !resolvedPath.ok) {
    return resolvedPath.error;
  }
  const rootPath = resolvedPath?.ok ? resolvedPath.path : undefined;
  const files = session.snapshotAll();
  const regex = Boolean(typedArgs.regex);
  const fuzzy = Boolean(typedArgs.fuzzy);
  const semantic = Boolean(typedArgs.semantic);

  if (regex) {
    let regex: RegExp;
    try {
      regex = new RegExp(typedArgs.query);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createError(`Invalid regex: ${message}`, "INVALID_DATA");
    }

    const rawResults = collectMatches(
      files,
      rootPath,
      makeRegexMatcher(regex),
      limit,
    );
    const results = rawResults.map((match) => ({
      ...match,
      path: toCurrentPath(match.path),
    }));
    return createSuccess({ results }, "VFS search complete");
  }

  if (semantic) {
    const forkId =
      typeof ctx.gameState?.forkId === "number" ? ctx.gameState?.forkId : undefined;
    const beforeTurn =
      typeof ctx.gameState?.turnNumber === "number"
        ? ctx.gameState?.turnNumber
        : undefined;

    const ragMatches =
      ctx.settings?.embedding?.enabled ?? false
        ? await searchSemanticWithRag(session, typedArgs.query, {
            rootPath,
            limit,
            forkId,
            beforeTurn,
          })
        : [];

    if (ragMatches.length > 0) {
      const results = ragMatches.map((match) => ({
        ...match,
        path: toCurrentPath(match.path),
      }));
      return createSuccess({ results }, "VFS search complete");
    }

    const semanticMatches = session.searchSemantic(typedArgs.query, {
      path: rootPath,
      limit,
    });
    if (semanticMatches.length > 0) {
      const results = semanticMatches
        .slice(0, limit)
        .map((match) => ({ ...match, path: toCurrentPath(match.path) }));
      return createSuccess({ results }, "VFS search complete");
    }
  }

  const rawResults = fuzzy
    ? collectFuzzyMatches(files, rootPath, typedArgs.query, limit)
    : collectMatches(
        files,
        rootPath,
        (line) => line.includes(typedArgs.query),
        limit,
      );

  const results = rawResults.map((match) => ({
    ...match,
    path: toCurrentPath(match.path),
  }));

  return createSuccess({ results }, "VFS search complete");
});

registerToolHandler(VFS_GREP_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  const typedArgs = getTypedArgs("vfs_grep", args);
  const limit = typedArgs.limit ?? 20;
  const resolvedPath = typedArgs.path
    ? resolveCurrentPath(typedArgs.path)
    : null;
  if (resolvedPath && !resolvedPath.ok) {
    return resolvedPath.error;
  }
  const rootPath = resolvedPath?.ok ? resolvedPath.path : undefined;
  const files = session.snapshotAll();

  let regex: RegExp;
  try {
    regex = new RegExp(typedArgs.pattern, typedArgs.flags);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createError(`Invalid regex: ${message}`, "INVALID_DATA");
  }

  const results = collectMatches(
    files,
    rootPath,
    makeRegexMatcher(regex),
    limit,
  );
  const mapped = results.map((match) => ({ ...match, path: toCurrentPath(match.path) }));

  return createSuccess({ results: mapped }, "VFS grep complete");
});

registerToolHandler(VFS_WRITE_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_write", args);

  return withAtomicSession(ctx, (draft) => {
    const written: string[] = [];

    for (const file of typedArgs.files) {
      const resolved = resolveCurrentPath(file.path);
      if (!resolved.ok) {
        return resolved.error;
      }
      const seenError = requireToolSeenForExistingFile(draft, resolved.path, "overwrite");
      if (seenError) {
        return seenError;
      }
      draft.writeFile(resolved.path, file.content, file.contentType);
      written.push(toCurrentPath(resolved.path));
    }

    return createSuccess({ written }, "VFS files written");
  });
});

const findTextMarker = (
  text: string,
  marker: string,
  options: { regex: boolean; flags?: string; occurrence: "first" | "last" },
): { start: number; end: number } | null => {
  if (!marker) return null;

  if (!options.regex) {
    const idx =
      options.occurrence === "last" ? text.lastIndexOf(marker) : text.indexOf(marker);
    if (idx < 0) return null;
    return { start: idx, end: idx + marker.length };
  }

  let re: RegExp;
  try {
    const flags = options.flags ?? "";
    const hasGlobal = flags.includes("g");
    re = new RegExp(marker, hasGlobal ? flags : `${flags}g`);
  } catch (error) {
    throw new Error(
      `Invalid regex marker: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let match: RegExpExecArray | null = null;
  let last: RegExpExecArray | null = null;
  while ((match = re.exec(text))) {
    last = match;
    if (options.occurrence === "first") {
      break;
    }
    if (match[0].length === 0) {
      // Avoid infinite loops on empty matches.
      re.lastIndex += 1;
    }
  }
  if (!last) return null;
  return { start: last.index, end: last.index + last[0].length };
};

const ensureSeparatorNewline = (left: string, right: string): string => {
  if (!left) return "";
  if (left.endsWith("\n")) return "";
  if (right.startsWith("\n")) return "";
  return "\n";
};

registerToolHandler(VFS_APPEND_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_append", args);

  return withAtomicSession(ctx, (draft) => {
    const appended: Array<{
      path: string;
      appendedChars: number;
      totalChars: number;
      created: boolean;
    }> = [];

    for (const op of typedArgs.appends) {
      const resolved = resolveCurrentPath(op.path);
      if (!resolved.ok) {
        return resolved.error;
      }
      if (!resolved.path.startsWith("world/") || !resolved.path.endsWith(".md")) {
        return createError(
          `vfs_append is only allowed under current/world/**.md: ${op.path}`,
          "INVALID_ACTION",
        );
      }

      const existing = draft.readFile(resolved.path);
      const ensureNewline = op.ensureNewline ?? true;
      const maxTotalChars =
        typeof op.maxTotalChars === "number" ? op.maxTotalChars : null;

      if (existing && existing.contentType !== "text/plain") {
        return createError(
          `File is not text/plain: ${op.path}`,
          "INVALID_DATA",
        );
      }

      const base = existing ? existing.content : "";
      const sep = existing && ensureNewline ? ensureSeparatorNewline(base, op.content) : "";
      const next = `${base}${sep}${op.content}`;

      if (maxTotalChars && next.length > maxTotalChars) {
        return createError(
          `Append would exceed maxTotalChars (${maxTotalChars}) for ${op.path}`,
          "INVALID_DATA",
        );
      }

      draft.writeFile(resolved.path, next, "text/plain");
      appended.push({
        path: toCurrentPath(resolved.path),
        appendedChars: (sep + op.content).length,
        totalChars: next.length,
        created: !existing,
      });
    }

    return createSuccess({ appended }, "VFS files appended");
  });
});

registerToolHandler(VFS_TEXT_EDIT_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_text_edit", args);

  return withAtomicSession(ctx, (draft) => {
    const edited: Array<{ path: string; totalChars: number; created: boolean }> = [];

    for (const fileEdit of typedArgs.files) {
      const resolved = resolveCurrentPath(fileEdit.path);
      if (!resolved.ok) {
        return resolved.error;
      }
      if (!resolved.path.startsWith("world/") || !resolved.path.endsWith(".md")) {
        return createError(
          `vfs_text_edit is only allowed under current/world/**.md: ${fileEdit.path}`,
          "INVALID_ACTION",
        );
      }

      const existing = draft.readFile(resolved.path);
      const createIfMissing = fileEdit.createIfMissing ?? true;
      const maxTotalChars =
        typeof fileEdit.maxTotalChars === "number" ? fileEdit.maxTotalChars : null;

      if (!existing && !createIfMissing) {
        return createError(`File not found: ${fileEdit.path}`, "NOT_FOUND");
      }

      if (existing) {
        if (existing.contentType !== "text/plain") {
          return createError(
            `File is not text/plain: ${fileEdit.path}`,
            "INVALID_DATA",
          );
        }
      }

      let content = existing ? existing.content : "";
      const created = !existing;

      for (const op of fileEdit.ops as any[]) {
        if (op.op === "insert_after" || op.op === "insert_before") {
          const markerMatch = findTextMarker(content, op.marker, {
            regex: op.markerIsRegex === true,
            flags: typeof op.markerFlags === "string" ? op.markerFlags : undefined,
            occurrence: op.occurrence === "last" ? "last" : "first",
          });

          if (!markerMatch) {
            const ifNotFound = op.ifNotFound === "append" ? "append" : "error";
            if (ifNotFound === "append") {
              const sep = ensureSeparatorNewline(content, op.marker);
              content = `${content}${sep}${op.marker}\n${op.content}`;
              continue;
            }
            return createError(
              `Marker not found for ${op.op}: ${fileEdit.path}`,
              "NOT_FOUND",
            );
          }

          const insertAt = op.op === "insert_after" ? markerMatch.end : markerMatch.start;
          content = `${content.slice(0, insertAt)}${op.content}${content.slice(insertAt)}`;
          continue;
        }

        if (op.op === "replace_between") {
          const startMatch = findTextMarker(content, op.start, {
            regex: op.startIsRegex === true,
            flags: typeof op.startFlags === "string" ? op.startFlags : undefined,
            occurrence: op.occurrence === "last" ? "last" : "first",
          });
          if (!startMatch) {
            const ifNotFound = op.ifNotFound === "append" ? "append" : "error";
            if (ifNotFound === "append") {
              const sep = ensureSeparatorNewline(content, op.start);
              content = `${content}${sep}${op.start}\n${op.content}\n${op.end}\n`;
              continue;
            }
            return createError(
              `Start marker not found: ${fileEdit.path}`,
              "NOT_FOUND",
            );
          }

          const afterStart = content.slice(startMatch.end);
          const endMatchInTail = findTextMarker(afterStart, op.end, {
            regex: op.endIsRegex === true,
            flags: typeof op.endFlags === "string" ? op.endFlags : undefined,
            occurrence: "first",
          });
          if (!endMatchInTail) {
            const ifNotFound = op.ifNotFound === "append" ? "append" : "error";
            if (ifNotFound === "append") {
              const sep = ensureSeparatorNewline(content, op.start);
              content = `${content}${sep}${op.start}\n${op.content}\n${op.end}\n`;
              continue;
            }
            return createError(`End marker not found: ${fileEdit.path}`, "NOT_FOUND");
          }

          const endAbsStart = startMatch.end + endMatchInTail.start;
          content = `${content.slice(0, startMatch.end)}${op.content}${content.slice(endAbsStart)}`;
          continue;
        }

        if (op.op === "replace") {
          const count = typeof op.count === "number" ? op.count : 1;
          let remaining = count;
          while (remaining > 0) {
            const idx = content.indexOf(op.from);
            if (idx < 0) break;
            content = `${content.slice(0, idx)}${op.to}${content.slice(idx + op.from.length)}`;
            remaining -= 1;
          }
          continue;
        }

        if (op.op === "regex_replace") {
          let re: RegExp;
          try {
            const flags = typeof op.flags === "string" ? op.flags : "";
            const hasGlobal = flags.includes("g");
            re = new RegExp(op.pattern, hasGlobal ? flags : `${flags}g`);
          } catch (error) {
            return createError(
              `Invalid regex: ${error instanceof Error ? error.message : String(error)}`,
              "INVALID_DATA",
            );
          }

          const count = typeof op.count === "number" ? op.count : 1;
          let replacements = 0;
          content = content.replace(re, (match: string, ...rest: any[]) => {
            void rest;
            if (replacements >= count) return match;
            replacements += 1;
            return op.replacement;
          });
          continue;
        }

        return createError(`Unknown text edit op: ${String(op?.op)}`, "INVALID_DATA");
      }

      if (maxTotalChars && content.length > maxTotalChars) {
        return createError(
          `Edits would exceed maxTotalChars (${maxTotalChars}) for ${fileEdit.path}`,
          "INVALID_DATA",
        );
      }

      draft.writeFile(resolved.path, content, "text/plain");
      edited.push({ path: toCurrentPath(resolved.path), totalChars: content.length, created });
    }

    return createSuccess({ edited }, "VFS text files edited");
  });
});

registerToolHandler(VFS_EDIT_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_edit", args);

  return withAtomicSession(ctx, (draft) => {
    const edited: string[] = [];

    for (const edit of typedArgs.edits) {
      const resolved = resolveCurrentPath(edit.path);
      if (!resolved.ok) {
        return resolved.error;
      }
      const existing = draft.readFile(resolved.path);
      if (!existing) {
        return createError(`File not found: ${edit.path}`, "NOT_FOUND");
      }
      const seenError = requireToolSeenForExistingFile(draft, resolved.path, "edit");
      if (seenError) {
        return seenError;
      }
      draft.applyJsonPatch(resolved.path, edit.patch);
      edited.push(toCurrentPath(resolved.path));
    }

    return createSuccess({ edited }, "VFS files edited");
  });
});

registerToolHandler(VFS_MERGE_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_merge", args);

  return withAtomicSession(ctx, (draft) => {
    const merged: string[] = [];

    for (const file of typedArgs.files) {
      const resolved = resolveCurrentPath(file.path);
      if (!resolved.ok) {
        return resolved.error;
      }
      const seenError = requireToolSeenForExistingFile(draft, resolved.path, "merge");
      if (seenError) {
        return seenError;
      }
      draft.mergeJson(resolved.path, file.content);
      merged.push(toCurrentPath(resolved.path));
    }

    return createSuccess({ merged }, "VFS files merged");
  });
});

registerToolHandler(VFS_MOVE_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_move", args);

  return withAtomicSession(ctx, (draft) => {
    const moved: Array<{ from: string; to: string }> = [];

    for (const move of typedArgs.moves) {
      const resolvedFrom = resolveCurrentPath(move.from);
      if (!resolvedFrom.ok) {
        return resolvedFrom.error;
      }
      const resolvedTo = resolveCurrentPath(move.to);
      if (!resolvedTo.ok) {
        return resolvedTo.error;
      }
      const from = normalizeVfsPath(resolvedFrom.path);
      const to = normalizeVfsPath(resolvedTo.path);
      try {
        draft.renameFile(from, to);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.startsWith("Path is read-only:")) {
          return createError(message, "INVALID_ACTION");
        }
        return createError(message, "NOT_FOUND");
      }
      draft.renameToolSeenPath(from, to);
      moved.push({ from: toCurrentPath(from), to: toCurrentPath(to) });
    }

    return createSuccess({ moved }, "VFS files moved");
  });
});

registerToolHandler(VFS_DELETE_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_delete", args);

  return withAtomicSession(ctx, (draft) => {
    const deleted: string[] = [];

    for (const path of typedArgs.paths) {
      const resolved = resolveCurrentPath(path);
      if (!resolved.ok) {
        return resolved.error;
      }
      const normalized = normalizeVfsPath(resolved.path);
      const seenError = requireToolSeenForExistingFile(draft, normalized, "delete");
      if (seenError) {
        return seenError;
      }
      try {
        draft.deleteFile(normalized);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.startsWith("Path is read-only:")) {
          return createError(message, "INVALID_ACTION");
        }
        return createError(message, "NOT_FOUND");
      }
      draft.forgetToolSeenPath(normalized);
      deleted.push(toCurrentPath(normalized));
    }

    return createSuccess({ deleted }, "VFS files deleted");
  });
});

registerToolHandler(VFS_COMMIT_TURN_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_commit_turn", args);

  return withAtomicSession(ctx, (draft) => {
    const existingIndex = ensureConversationIndex(draft);

    const forkId = existingIndex.activeForkId ?? 0;
    const forkKey = String(forkId);
    const order = existingIndex.turnOrderByFork?.[forkKey] ?? [];
    const latestFromIndex = existingIndex.latestTurnNumberByFork?.[forkKey];
    const latestFromOrder = order.reduce((max, id) => {
      const match = /fork-(\d+)\/turn-(\d+)/.exec(id);
      if (!match) return max;
      const turn = Number(match[2]);
      return Number.isFinite(turn) ? Math.max(max, turn) : max;
    }, -1);
    const latest =
      typeof latestFromIndex === "number" ? latestFromIndex : latestFromOrder;

    const turnNumber = latest + 1;
    const turnId = buildTurnId(forkId, turnNumber);

    const parentTurnId =
      typeof existingIndex.activeTurnId === "string" &&
      existingIndex.activeTurnId.length > 0
        ? existingIndex.activeTurnId
        : order.length > 0
          ? order[order.length - 1]
          : null;

    writeTurnFile(draft, forkId, turnNumber, {
      turnId,
      forkId,
      turnNumber,
      parentTurnId,
      createdAt: typedArgs.createdAt ?? Date.now(),
      userAction: typedArgs.userAction,
      assistant: typedArgs.assistant,
    });

    const nextOrder = order.includes(turnId) ? order : [...order, turnId];

    writeConversationIndex(draft, {
      ...existingIndex,
      activeForkId: forkId,
      activeTurnId: turnId,
      rootTurnIdByFork:
        existingIndex.rootTurnIdByFork?.[forkKey] != null
          ? existingIndex.rootTurnIdByFork
          : { ...existingIndex.rootTurnIdByFork, [forkKey]: turnId },
      latestTurnNumberByFork: {
        ...existingIndex.latestTurnNumberByFork,
        [forkKey]: turnNumber,
      },
      turnOrderByFork: {
        ...existingIndex.turnOrderByFork,
        [forkKey]: nextOrder,
      },
    });

    return createSuccess(
      { turnId, forkId, turnNumber },
      "Turn committed to conversation",
    );
  });
});

registerToolHandler(VFS_TX_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_tx", args);

  return withAtomicSession(ctx, (draft) => {
    const commitIndices = typedArgs.ops
      .map((op, index) => ({ index, op }))
      .filter((entry) => entry.op.op === "commit_turn")
      .map((entry) => entry.index);

    if (commitIndices.length > 1) {
      return createError("vfs_tx: commit_turn may appear at most once", "INVALID_DATA");
    }

    if (commitIndices.length === 1 && commitIndices[0] !== typedArgs.ops.length - 1) {
      return createError(
        "vfs_tx: commit_turn must be the last operation in the batch",
        "INVALID_DATA",
      );
    }

    const written: string[] = [];
    const edited: string[] = [];
    const merged: string[] = [];
    const moved: Array<{ from: string; to: string }> = [];
    const deleted: string[] = [];
    let committed: { turnId: string; forkId: number; turnNumber: number } | null = null;

    for (const op of typedArgs.ops) {
      if (op.op === "write") {
        const resolved = resolveCurrentPath(op.path);
        if (!resolved.ok) {
          return resolved.error;
        }
        const seenError = requireToolSeenForExistingFile(draft, resolved.path, "overwrite");
        if (seenError) {
          return seenError;
        }
        draft.writeFile(resolved.path, op.content, op.contentType);
        written.push(toCurrentPath(resolved.path));
        continue;
      }

      if (op.op === "edit") {
        const resolved = resolveCurrentPath(op.path);
        if (!resolved.ok) {
          return resolved.error;
        }
        const existing = draft.readFile(resolved.path);
        if (!existing) {
          return createError(`File not found: ${op.path}`, "NOT_FOUND");
        }
        const seenError = requireToolSeenForExistingFile(draft, resolved.path, "edit");
        if (seenError) {
          return seenError;
        }
        draft.applyJsonPatch(resolved.path, op.patch);
        edited.push(toCurrentPath(resolved.path));
        continue;
      }

      if (op.op === "merge") {
        const resolved = resolveCurrentPath(op.path);
        if (!resolved.ok) {
          return resolved.error;
        }
        const seenError = requireToolSeenForExistingFile(draft, resolved.path, "merge");
        if (seenError) {
          return seenError;
        }
        draft.mergeJson(resolved.path, op.content);
        merged.push(toCurrentPath(resolved.path));
        continue;
      }

      if (op.op === "move") {
        const resolvedFrom = resolveCurrentPath(op.from);
        if (!resolvedFrom.ok) {
          return resolvedFrom.error;
        }
        const resolvedTo = resolveCurrentPath(op.to);
        if (!resolvedTo.ok) {
          return resolvedTo.error;
        }
        const from = normalizeVfsPath(resolvedFrom.path);
        const to = normalizeVfsPath(resolvedTo.path);
        try {
          draft.renameFile(from, to);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.startsWith("Path is read-only:")) {
            return createError(message, "INVALID_ACTION");
          }
          return createError(message, "NOT_FOUND");
        }
        draft.renameToolSeenPath(from, to);
        moved.push({ from: toCurrentPath(from), to: toCurrentPath(to) });
        continue;
      }

      if (op.op === "delete") {
        const resolved = resolveCurrentPath(op.path);
        if (!resolved.ok) {
          return resolved.error;
        }
        const normalized = normalizeVfsPath(resolved.path);
        const seenError = requireToolSeenForExistingFile(draft, normalized, "delete");
        if (seenError) {
          return seenError;
        }
        try {
          draft.deleteFile(normalized);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.startsWith("Path is read-only:")) {
            return createError(message, "INVALID_ACTION");
          }
          return createError(message, "NOT_FOUND");
        }
        draft.forgetToolSeenPath(normalized);
        deleted.push(toCurrentPath(normalized));
        continue;
      }

      if (op.op === "commit_turn") {
        const existingIndex = ensureConversationIndex(draft);

        const forkId = existingIndex.activeForkId ?? 0;
        const forkKey = String(forkId);
        const order = existingIndex.turnOrderByFork?.[forkKey] ?? [];
        const latestFromIndex = existingIndex.latestTurnNumberByFork?.[forkKey];
        const latestFromOrder = order.reduce((max, id) => {
          const match = /fork-(\d+)\/turn-(\d+)/.exec(id);
          if (!match) return max;
          const turn = Number(match[2]);
          return Number.isFinite(turn) ? Math.max(max, turn) : max;
        }, -1);
        const latest =
          typeof latestFromIndex === "number" ? latestFromIndex : latestFromOrder;

        const turnNumber = latest + 1;
        const turnId = buildTurnId(forkId, turnNumber);

        const parentTurnId =
          typeof existingIndex.activeTurnId === "string" &&
          existingIndex.activeTurnId.length > 0
            ? existingIndex.activeTurnId
            : order.length > 0
              ? order[order.length - 1]
              : null;

        writeTurnFile(draft, forkId, turnNumber, {
          turnId,
          forkId,
          turnNumber,
          parentTurnId,
          createdAt: op.createdAt ?? Date.now(),
          userAction: op.userAction,
          assistant: op.assistant,
        });

        const nextOrder = order.includes(turnId) ? order : [...order, turnId];

        writeConversationIndex(draft, {
          ...existingIndex,
          activeForkId: forkId,
          activeTurnId: turnId,
          rootTurnIdByFork:
            existingIndex.rootTurnIdByFork?.[forkKey] != null
              ? existingIndex.rootTurnIdByFork
              : { ...existingIndex.rootTurnIdByFork, [forkKey]: turnId },
          latestTurnNumberByFork: {
            ...existingIndex.latestTurnNumberByFork,
            [forkKey]: turnNumber,
          },
          turnOrderByFork: {
            ...existingIndex.turnOrderByFork,
            [forkKey]: nextOrder,
          },
        });

        committed = { turnId, forkId, turnNumber };
        continue;
      }

      return createError(`vfs_tx: unknown op: ${(op as any).op}`, "INVALID_DATA");
    }

    return createSuccess(
      { written, edited, merged, moved, deleted, committed },
      "VFS transaction applied",
    );
  });
});
