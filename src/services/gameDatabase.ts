import {
  GameState,
  InventoryItem,
  NPC,
  Quest,
  Location,
  KnowledgeEntry,
  Faction,
  TimelineEvent,
  CausalChain,
  CharacterStatus,
  CharacterAttribute,
  Atmosphere,
  VersionedTimestamp,
  AccessTimestamp,
  createVersionedTimestamp,
} from "../types";
import { ID_PREFIXES, generateEntityId, EntityType } from "./tools";
import type { AtmosphereObject } from "../utils/constants/atmosphere";
import { repairGameState } from "./stateRepair";
import Fuse from "fuse.js";

// --- Tool Call Result Types ---

export interface ToolCallSuccess<T = unknown> {
  success: true;
  data: T;
  message: string;
}

export interface ToolCallError {
  success: false;
  error: string;
  code:
    | "NOT_FOUND"
    | "ALREADY_EXISTS"
    | "INVALID_ACTION"
    | "INVALID_DATA"
    | "UNKNOWN";
}

export type ToolCallResult<T = unknown> = ToolCallSuccess<T> | ToolCallError;

// --- Query Result Type Mappings ---

export interface LocationListItem {
  id: string;
  name: string;
  visited: boolean;
  isCurrent: boolean;
}

export interface CharacterProfile {
  name: string;
  title: string;
  status: string;
  appearance: string;
  profession: string;
  background: string;
  race: string;
}

export interface GlobalStateInfo {
  time: string;
  atmosphere: AtmosphereObject;
  theme: string;
  currentLocation: string;
}

// Query target to result type mapping
export type QueryResultMap = {
  inventory: InventoryItem[];
  npc: NPC[];
  location: Location[] | LocationListItem[];
  quest: Quest[];
  knowledge: KnowledgeEntry[];
  faction: Faction[];
  character:
    | CharacterStatus
    | CharacterProfile
    | CharacterAttribute[]
    | CharacterStatus["skills"]
    | CharacterStatus["conditions"]
    | CharacterStatus["hiddenTraits"];
  timeline: TimelineEvent[];
  causal_chain: CausalChain[];
  global: GlobalStateInfo;
};

// Modify target to result type mapping
export type ModifyResultMap = {
  inventory: InventoryItem | { id: string; name: string } | { removed: string };
  npc: NPC | { id: string; name: string } | { removed: string };
  location: Location | { id: string; name: string } | { removed: string };
  quest: Quest | { id: string; name: string } | { removed: string };
  knowledge: KnowledgeEntry | { id: string; name: string };
  faction: Faction | { id: string; name: string } | { removed: string };
  world_info: { updated: string[] };
  character: { updated: string[] };
  timeline: TimelineEvent;
  causal_chain: CausalChain | { triggered: boolean; description: string };
  global: {
    updated: string[];
    values: Record<string, string | AtmosphereObject>;
  };
};

// --- Helper Functions ---

export interface ListItem {
  id: string;
  name: string;
  // Optional extras for context
  type?: string;
  info?: string;
}

export interface PaginatedListResult {
  items: ListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export const createSuccess = <T>(
  data: T,
  message: string,
): ToolCallSuccess<T> => ({
  success: true,
  data,
  message,
});

export const createError = (
  error: string,
  code: ToolCallError["code"] = "UNKNOWN",
): ToolCallError => ({
  success: false,
  error,
  code,
});

/**
 * Case-insensitive string comparison for entity names and IDs.
 * Handles null/undefined values safely.
 */
const matchesIdentifier = (
  value: string | null | undefined,
  identifier: string | null | undefined,
): boolean => {
  if (!value || !identifier) return false;
  return value.toLowerCase() === identifier.toLowerCase();
};

/**
 * Merge source into target, handling null values as deletions.
 * - If a value is null, the key is deleted from the target.
 * - If a value is an object (not array), recursively merge.
 * - Otherwise, the value is copied to the target.
 */
const mergeWithNullDeletion = <T extends Record<string, any>>(
  target: T,
  source: Record<string, any>,
): void => {
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (value === null) {
      // null means delete this optional property
      delete (target as any)[key];
    } else if (
      value !== undefined &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] !== undefined &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      // Recursively merge nested objects
      mergeWithNullDeletion(target[key], value);
    } else if (value !== undefined) {
      // Copy the value
      (target as any)[key] = value;
    }
  }
};

export class GameDatabase {
  private state: GameState;

  constructor(initialState: GameState) {
    // Deep copy to ensure we don't mutate the original state reference until ready
    // Deep copy to ensure we don't mutate the original state reference until ready
    this.state = JSON.parse(JSON.stringify(initialState));

    // Auto-repair on load: Fix duplicate IDs and assign IDs to legacy entities
    repairGameState(this.state);
  }

  public getState(): GameState {
    return this.state;
  }

  // --- Versioned Timestamp Helper ---

  /**
   * 创建当前版本化时间戳
   * 用于记录实体修改时间，支持分叉比较
   */
  public createCurrentTimestamp(): VersionedTimestamp {
    return createVersionedTimestamp({
      forkId: this.state.forkId || 0,
      turnNumber: this.state.turnNumber || 0,
    });
  }

  // --- Pending Consequences Query ---

  /**
   * Get all pending consequences that are available for the AI to potentially trigger.
   * Returns all untriggered consequences from active chains.
   *
   * NOTE: This does NOT auto-trigger anything. It provides context for AI to decide.
   * The AI calls trigger_causal_chain when it decides a consequence should happen based on narrative.
   */
  public getReadyConsequences(): Array<{
    chainId: string;
    chainDescription: string;
    consequence: {
      id: string;
      description: string;
      triggerCondition?: string;
      severity?: string;
      known?: boolean;
    };
  }> {
    const results: Array<{
      chainId: string;
      chainDescription: string;
      consequence: {
        id: string;
        description: string;
        triggerCondition?: string;
        severity?: string;
        known?: boolean;
      };
    }> = [];

    for (const chain of this.state.causalChains) {
      if (chain.status !== "active" || !chain.pendingConsequences) continue;

      for (const conseq of chain.pendingConsequences) {
        // Skip already triggered consequences
        if (conseq.triggered) continue;

        // Return all untriggered consequences - AI decides when to trigger based on narrative
        results.push({
          chainId: chain.chainId,
          chainDescription: chain.rootCause.description,
          consequence: {
            id: conseq.id,
            description: conseq.description,
            triggerCondition: conseq.triggerCondition,
            severity: conseq.severity,
            known: conseq.known,
          },
        });
      }
    }

    return results;
  }

  /**
   * Trigger a specific consequence (called by AI via update_causal_chain action='trigger')
   */
  public triggerConsequence(
    chainId: string,
    consequenceId: string,
  ): ToolCallResult<{ triggered: boolean; description: string }> {
    const chain = this.state.causalChains.find((c) => c.chainId === chainId);
    if (!chain) {
      return createError(`Chain ${chainId} not found`, "NOT_FOUND");
    }

    const conseq = chain.pendingConsequences?.find(
      (c) => c.id === consequenceId,
    );
    if (!conseq) {
      return createError(
        `Consequence ${consequenceId} not found in chain ${chainId}`,
        "NOT_FOUND",
      );
    }

    if (conseq.triggered) {
      return createError(
        `Consequence ${consequenceId} already triggered`,
        "ALREADY_EXISTS",
      );
    }

    // Mark as triggered
    conseq.triggered = true;
    conseq.triggeredAtTurn = this.state.turnNumber || 0;

    return createSuccess(
      { triggered: true, description: conseq.description },
      `Triggered consequence: ${conseq.description}`,
    );
  }

  // Legacy method for backwards compatibility - now just returns ready consequences for context
  public checkPendingConsequences(): Array<{
    chainId: string;
    consequence: {
      id: string;
      description: string;
      triggered: boolean;
      reason: string;
    };
  }> {
    // Return ready consequences as context (not auto-triggered)
    return this.getReadyConsequences().map((rc) => ({
      chainId: rc.chainId,
      consequence: {
        id: rc.consequence.id,
        description: rc.consequence.description,
        triggered: false, // Not triggered yet - AI will decide
        reason: "ready_for_ai_decision",
      },
    }));
  }

  // --- Query Methods ---

  // Helper to update lastAccess for queried entities
  private updateLastAccess<
    T extends {
      id: string;
      lastAccess?: AccessTimestamp | Partial<AccessTimestamp>;
    },
  >(items: T[]): T[] {
    const forkId = this.state.forkId || 0;
    const turnNumber = this.state.turnNumber || 0;
    const timestamp = Date.now();
    items.forEach((item) => {
      item.lastAccess = { forkId, turnNumber, timestamp };
    });
    return items;
  }

  // Helper to match text against a term (supports regex)
  private matchesTerm(text: string | undefined, term: string): boolean {
    if (!text) return false;
    try {
      // Try to use the term as a regex pattern
      const regex = new RegExp(term, "i");
      return regex.test(text);
    } catch {
      // Fallback to simple includes if regex is invalid
      return text.toLowerCase().includes(term.toLowerCase());
    }
  }

  // Type-safe filter function for entities with name/title/id/visible fields
  private filterEntities<T extends Record<string, unknown>>(
    list: T[],
    term?: string,
  ): T[] {
    if (!term) return list;
    return list.filter((item) => {
      const name = item.name as string | undefined;
      const title = item.title as string | undefined;
      const id = item.id as string | undefined;
      const visible = item.visible as { name?: string } | undefined;
      return (
        this.matchesTerm(name, term) ||
        this.matchesTerm(title, term) ||
        this.matchesTerm(visible?.name, term) ||
        this.matchesTerm(String(id || ""), term)
      );
    });
  }

  public query(
    target: string,
    queryOrAspect?: string,
    extraQuery?: string,
    options: { page?: number; limit?: number } = {},
  ): ToolCallResult<QueryResultMap[keyof QueryResultMap]> {
    const term = queryOrAspect?.toLowerCase();
    const page = options.page || 1;
    const limit = options.limit || 20;

    // Helper for pagination
    const paginateResults = <T>(items: T[]): T[] => {
      const total = items.length;
      const totalPages = Math.ceil(total / limit);
      const safePage = Math.max(1, Math.min(page, totalPages || 1));
      const start = (safePage - 1) * limit;
      return items.slice(start, start + limit);
    };

    try {
      switch (target) {
        case "inventory": {
          const results = this.filterEntities(this.state.inventory, term);
          this.updateLastAccess(results);
          const paginated = paginateResults(results);
          return createSuccess<InventoryItem[]>(
            paginated,
            `Found ${results.length} items (showing page ${page})`,
          );
        }

        case "npc": {
          const results = this.filterEntities(this.state.npcs, term);
          this.updateLastAccess(results);
          const paginated = paginateResults(results);
          return createSuccess<NPC[]>(
            paginated,
            `Found ${results.length} NPCs (showing page ${page})`,
          );
        }

        case "location":
          if (term) {
            const results = this.filterEntities(this.state.locations, term);
            this.updateLastAccess(results);
            const paginated = paginateResults(results);
            return createSuccess<Location[]>(
              paginated,
              `Found ${results.length} locations (showing page ${page})`,
            );
          }
          // For listing, still update lastAccess for all
          this.updateLastAccess(this.state.locations);
          const locationList: LocationListItem[] = this.state.locations.map(
            (l) => ({
              id: l.id,
              name: l.name,
              visited: l.isVisited,
              isCurrent:
                matchesIdentifier(l.name, this.state.currentLocation) ||
                matchesIdentifier(l.id, this.state.currentLocation),
            }),
          );
          const paginatedList = paginateResults(locationList);
          return createSuccess<LocationListItem[]>(
            paginatedList,
            `Listed ${this.state.locations.length} locations (showing page ${page})`,
          );

        case "quest": {
          const results = this.filterEntities(this.state.quests, term);
          this.updateLastAccess(results);
          const paginated = paginateResults(results);
          return createSuccess<Quest[]>(
            paginated,
            `Found ${results.length} quests (showing page ${page})`,
          );
        }

        case "knowledge": {
          const results = this.filterEntities(this.state.knowledge || [], term);
          this.updateLastAccess(results);
          const paginated = paginateResults(results);
          return createSuccess<KnowledgeEntry[]>(
            paginated,
            `Found ${results.length} knowledge entries (showing page ${page})`,
          );
        }

        case "faction": {
          const results = this.filterEntities(this.state.factions || [], term);
          const paginated = paginateResults(results);
          return createSuccess<Faction[]>(
            paginated,
            `Found ${results.length} factions (showing page ${page})`,
          );
        }

        case "character": {
          const aspect = queryOrAspect || "all";
          const searchTerm = extraQuery?.toLowerCase();

          const filterByTerm = <T extends { id?: string; name?: string }>(
            list: T[],
          ): T[] => {
            if (!searchTerm) return list;
            return list.filter(
              (item) =>
                this.matchesTerm(item.name, searchTerm) ||
                this.matchesTerm(String(item.id || ""), searchTerm),
            );
          };

          switch (aspect) {
            case "profile":
              return createSuccess(
                {
                  name: this.state.character.name,
                  title: this.state.character.title,
                  status: this.state.character.status,
                  appearance: this.state.character.appearance,
                  profession: this.state.character.profession,
                  background: this.state.character.background,
                  race: this.state.character.race,
                },
                "Character profile retrieved",
              );
            case "attributes":
              return createSuccess(
                this.state.character.attributes,
                `Found ${this.state.character.attributes.length} attributes`,
              );
            case "skills":
              const skills = filterByTerm(this.state.character.skills);
              return createSuccess(
                paginateResults(skills),
                `Found ${skills.length} skills (showing page ${page})`,
              );
            case "conditions":
              const conditions = filterByTerm(this.state.character.conditions);
              return createSuccess(
                paginateResults(conditions),
                `Found ${conditions.length} conditions (showing page ${page})`,
              );
            case "hiddenTraits":
              const traits = filterByTerm(
                this.state.character.hiddenTraits || [],
              );
              return createSuccess(
                paginateResults(traits),
                `Found ${traits.length} hidden traits (showing page ${page})`,
              );
            case "all":
            default:
              return createSuccess(
                this.state.character,
                "Full character data retrieved",
              );
          }
        }

        case "timeline":
          const timeline = this.state.timeline || [];
          if (term) {
            const filtered = timeline.filter(
              (e) =>
                this.matchesTerm(e.id, term) ||
                this.matchesTerm(e.visible.description, term) ||
                this.matchesTerm(e.category, term),
            );
            const paginated = paginateResults(filtered);
            return createSuccess(
              paginated,
              `Found ${filtered.length} timeline events (showing page ${page})`,
            );
          }
          const paginatedTimeline = paginateResults(timeline);
          return createSuccess(
            paginatedTimeline,
            `Retrieved ${timeline.length} events (showing page ${page})`,
          );

        case "causal_chain":
          const chains = this.state.causalChains || [];
          if (term) {
            const filtered = chains.filter((c) =>
              this.matchesTerm(c.chainId, term),
            );
            const paginated = paginateResults(filtered);
            return createSuccess(
              paginated,
              `Found ${filtered.length} causal chains (showing page ${page})`,
            );
          }
          const paginatedChains = paginateResults(chains);
          return createSuccess(
            paginatedChains,
            `Retrieved ${chains.length} causal chains (showing page ${page})`,
          );

        case "global":
          return createSuccess(
            {
              time: this.state.time,
              atmosphere: this.state.atmosphere,
              theme: this.state.theme,
              currentLocation: this.state.currentLocation,
            },
            "Global state retrieved",
          );

        default:
          return createError(
            `Unknown query target: ${target}`,
            "INVALID_ACTION",
          );
      }
    } catch (error) {
      return createError(`Query failed: ${error}`, "UNKNOWN");
    }
  }

  // --- List Method ---

  public list(
    target: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): ToolCallResult<PaginatedListResult> {
    const term = search?.toLowerCase();

    // Helper for pagination
    const paginate = (items: ListItem[]): PaginatedListResult => {
      const filtered = term
        ? items.filter(
            (i) =>
              i.name.toLowerCase().includes(term) ||
              i.id.toLowerCase().includes(term),
          )
        : items;

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit);
      const safePage = Math.max(1, Math.min(page, totalPages || 1));
      const start = (safePage - 1) * limit;
      const end = start + limit;

      return {
        items: filtered.slice(start, end),
        total,
        page: safePage,
        totalPages,
      };
    };

    try {
      let items: ListItem[] = [];

      switch (target as any) {
        case "inventory":
          items = this.state.inventory.map((i) => ({
            id: i.id,
            name: i.name,
            info: (i.visible as any)?.description?.substring(0, 50) + "...",
          }));
          break;
        case "npc":
          items = this.state.npcs.map((r) => ({
            id: r.id,
            name: (r.visible as any)?.name || "Unknown",
            info: `NPC Role: ${(r.visible as any)?.npcType || "Unknown"}`,
          }));
          break;
        case "location":
          items = this.state.locations.map((l) => ({
            id: l.id,
            name: l.name,
            info:
              l.id === this.state.currentLocation
                ? "(Current Location)"
                : l.isVisited
                  ? "Visited"
                  : "Unknown",
          }));
          break;
        case "quest":
          items = this.state.quests.map((q) => ({
            id: q.id,
            name: (q as any).title || (q.visible as any)?.name || "Quest",
            info: `Status: ${(q as any).status || (q.visible as any)?.status || "Active"}`,
          }));
          break;
        case "knowledge":
          items = this.state.knowledge.map((k) => ({
            id: k.id,
            name: k.id,
            info: (k as any).description?.substring(0, 50) || "Knowledge entry",
          }));
          break;
        case "faction":
          items = this.state.factions.map((f) => ({
            id: f.id,
            name: f.name,
            info: (f as any).description?.substring(0, 50) || "Faction",
          }));
          break;
        case "timeline":
          items = this.state.timeline.map((t) => ({
            id: t.id,
            name: (t as any).title || "Event",
            info: `Turn: ${(t as any).turnNumber}`,
          }));
          break;
        case "causal_chain":
          items = this.state.causalChains.map((c) => ({
            id: c.chainId,
            name: c.chainId,
            info: (c as any).rootCause?.description?.substring(0, 50) + "...",
          }));
          break;
        case "global":
          items = [
            {
              id: "global",
              name: "Global State",
              info: `Time: ${this.state.time}, Loc: ${this.state.currentLocation}`,
            },
          ];
          break;
        case "notes":
          const notes = this.state.notes || {};
          items = Object.keys(notes).map((key) => ({
            id: key,
            name: key,
            info:
              notes[key].length > 50
                ? notes[key].substring(0, 50) + "..."
                : notes[key],
          }));
          break;
        default:
          return createError(
            `Unknown list target: ${target}`,
            "INVALID_ACTION",
          );
      }

      const result = paginate(items);
      return createSuccess(
        result,
        `Listed ${target} (Page ${result.page}/${result.totalPages}, Total ${result.total})`,
      );
    } catch (error) {
      return createError(`List failed: ${error}`, "UNKNOWN");
    }
  }

  // --- Modification Methods ---

  public modify(
    target: string,
    action: string,
    data: unknown,
  ): ToolCallResult<unknown> {
    try {
      switch (target) {
        case "inventory":
          return this.modifyInventory(action, data as any);
        case "npc":
          return this.modifyNpc(action, data as any);
        case "location":
          return this.modifyLocation(action, data as any);
        case "quest":
          return this.modifyQuest(action, data as any);
        case "knowledge":
          return this.modifyKnowledge(action, data as any);
        case "faction":
          return this.modifyFaction(action, data as any);
        case "world_info":
          return this.modifyWorldInfo(data as any);
        case "character":
          return this.modifyCharacter(data as any);
        case "timeline":
          return this.modifyTimeline(action, data as any);
        case "causal_chain":
          return this.modifyCausalChain(action, data as any);
        case "global":
          return this.modifyGlobal(data as any);
        default:
          return createError(
            `Unknown modification target: ${target}`,
            "INVALID_ACTION",
          );
      }
    } catch (error) {
      return createError(`Modification failed: ${error}`, "UNKNOWN");
    }
  }

  // --- Fuzzy Matching Helpers ---

  /**
   * Suggest similar entities for NOT_FOUND errors
   */
  private suggestSimilar(identifier: string, collection: any[]): string {
    if (!collection.length) return "";

    const items = collection.map((item) => ({
      id: item.id,
      name: item.name || item.title || item.visible?.name || item.id,
    }));

    const fuse = new Fuse(items, {
      keys: ["name", "id"],
      threshold: 0.4,
    });

    const results = fuse.search(identifier);
    if (!results.length) return "";

    const suggestions = results
      .slice(0, 3)
      .map((r) => `"${r.item.name}" (ID: ${r.item.id})`)
      .join(", ");

    return ` Did you mean: ${suggestions}?`;
  }

  // --- Specific Modifiers ---

  private modifyInventory(
    action: string,
    data: Partial<InventoryItem> & {
      id?: string;
      name?: string;
      unlockReason?: string;
    },
  ): ToolCallResult<
    InventoryItem | { id: string; name: string } | { removed: string }
  > {
    if (action === "add") {
      if (!data.name) {
        return createError(
          "Item name is required for 'add' action",
          "INVALID_DATA",
        );
      }

      // Validate ID is provided by AI
      const finalId = data.id;
      if (!finalId) {
        return createError(
          "ID is required. AI must generate a unique ID for new items.",
          "INVALID_DATA",
        );
      }

      // 1. Check ID Conflict
      if (this.state.inventory.some((i) => matchesIdentifier(i.id, finalId))) {
        return createError(
          `ID "${finalId}" already exists. AI must generate a unique ID.`,
          "ALREADY_EXISTS",
        );
      }

      // 2. Check Name Conflict (Keep strict to prevent logical duplicates)
      const existing = this.state.inventory.find((i) =>
        matchesIdentifier(i.name, data.name),
      );
      if (existing) {
        return createError(
          `Item "${data.name}" already exists with ID "${existing.id}". Use action 'update' if you want to modify it.`,
          "ALREADY_EXISTS",
        );
      }

      const newId = finalId;
      if (
        data.unlocked === true &&
        (!data.unlockReason ||
          typeof data.unlockReason !== "string" ||
          data.unlockReason.trim() === "")
      ) {
        return createError(
          "unlockReason is required to set unlocked=true when adding an item",
          "INVALID_DATA",
        );
      }

      const newItem: InventoryItem = {
        id: newId,
        name: data.name,
        visible: {
          description: data.visible?.description || "A mysterious item.",
          observation: data.visible?.observation,
        },
        hidden: {
          truth: data.hidden?.truth || "The truth is hidden.",
          secrets: data.hidden?.secrets,
        },
        createdAt: Date.now(),
        modifiedAt: this.createCurrentTimestamp(),
        lastModified: Date.now(), // Keep for backward compatibility
        lore: data.lore,
        unlocked: data.unlocked ?? false,
        highlight: true,
      };
      this.state.inventory.push(newItem);
      return createSuccess(
        { id: newItem.id, name: newItem.name },
        `Added item: ${newItem.name} (${newItem.id})`,
      );
    }

    if (action === "remove") {
      const identifier = data.id || data.name;
      if (!identifier) {
        return createError(
          "Item ID or name is required for 'remove' action",
          "INVALID_DATA",
        );
      }

      const index = this.state.inventory.findIndex(
        (i) =>
          matchesIdentifier(i.id, identifier) ||
          matchesIdentifier(i.name, identifier),
      );
      if (index === -1) {
        const suggestion = this.suggestSimilar(
          identifier,
          this.state.inventory,
        );
        return createError(
          `Item "${identifier}" not found.${suggestion}`,
          "NOT_FOUND",
        );
      }

      const removed = this.state.inventory.splice(index, 1)[0];
      return createSuccess(
        { removed: removed.id },
        `Removed item: ${removed.name}`,
      );
    }

    if (action === "update") {
      const identifier = data.id || data.name;
      if (!identifier) {
        return createError(
          "Item ID or name is required for 'update' action",
          "INVALID_DATA",
        );
      }

      const item = this.state.inventory.find(
        (i) =>
          matchesIdentifier(i.id, identifier) ||
          matchesIdentifier(i.name, identifier),
      );
      if (!item) {
        const suggestion = this.suggestSimilar(
          identifier,
          this.state.inventory,
        );
        return createError(
          `Item "${identifier}" not found.${suggestion}`,
          "NOT_FOUND",
        );
      }

      if (data.name && data.name !== identifier) item.name = data.name;
      if (data.visible) mergeWithNullDeletion(item.visible, data.visible);
      if (data.hidden) mergeWithNullDeletion(item.hidden, data.hidden);
      if (data.lore !== undefined) item.lore = data.lore;
      if (data.unlocked !== undefined) {
        if (data.unlocked === true) {
          if (
            !data.unlockReason ||
            typeof data.unlockReason !== "string" ||
            data.unlockReason.trim() === ""
          ) {
            return createError(
              "unlockReason is required to set unlocked=true when updating an item",
              "INVALID_DATA",
            );
          }
        }
        item.unlocked = data.unlocked;
      }
      item.highlight = true;
      item.modifiedAt = this.createCurrentTimestamp();
      item.lastModified = Date.now(); // Keep for backward compatibility

      return createSuccess(item, `Updated item: ${item.name}`);
    }

    return createError(`Invalid action: ${action}`, "INVALID_ACTION");
  }

  private modifyNpc(
    action: string,
    data: Partial<NPC> & {
      id?: string;
      name?: string;
      visible?: any;
      hidden?: any;
      unlockReason?: string;
    },
  ): ToolCallResult<NPC | { id: string; name: string } | { removed: string }> {
    const getName = () => data.visible?.name || data.name;

    if (action === "add") {
      const name = getName();
      if (!name) {
        return createError(
          "NPC name is required for 'add' action",
          "INVALID_DATA",
        );
      }

      // Validate ID is provided by AI
      const finalId = data.id;
      if (!finalId) {
        return createError(
          "ID is required. AI must generate a unique ID for new NPCs.",
          "INVALID_DATA",
        );
      }

      // 1. Check ID Conflict
      if (this.state.npcs.some((r) => matchesIdentifier(r.id, finalId))) {
        return createError(
          `ID "${finalId}" already exists. AI must generate a unique ID.`,
          "ALREADY_EXISTS",
        );
      }

      // 2. Check Name Conflict
      const existing = this.state.npcs.find((r) =>
        matchesIdentifier(r.visible.name, name),
      );
      if (existing) {
        return createError(
          `NPC "${name}" already exists with ID "${existing.id}". Use action 'update' if you want to modify it.`,
          "ALREADY_EXISTS",
        );
      }

      const newId = finalId;
      if (
        data.unlocked === true &&
        (!data.unlockReason ||
          typeof data.unlockReason !== "string" ||
          data.unlockReason.trim() === "")
      ) {
        return createError(
          "unlockReason is required to set unlocked=true when adding an NPC",
          "INVALID_DATA",
        );
      }

      const newNpc: NPC = {
        id: newId,
        currentLocation: data.currentLocation || "Unknown",
        visible: {
          name: name,
          npcType: data.visible?.npcType || "Stranger",
          affinity: data.visible?.affinity ?? 50,
          affinityKnown: data.visible?.affinityKnown ?? false,
          description: data.visible?.description || "A stranger.",
          appearance: data.visible?.appearance,
          personality: data.visible?.personality,
          impression: data.visible?.impression, // Protagonist's impression of NPC
          status: data.visible?.status, // What protagonist thinks NPC is doing
        },
        hidden: {
          trueName: data.hidden?.trueName,
          npcType: data.hidden?.npcType || "Stranger",
          realPersonality: data.hidden?.realPersonality || "Unknown",
          realMotives: data.hidden?.realMotives || "Unknown",
          status: data.hidden?.status || "Unknown", // What NPC is actually doing
          secrets: data.hidden?.secrets || [],
          trueAffinity: data.hidden?.trueAffinity ?? 50,
          impression: data.hidden?.impression, // NPC's impression of protagonist
        },
        known: data.known ?? true,
        createdAt: Date.now(),
        modifiedAt: this.createCurrentTimestamp(),
        lastModified: Date.now(), // Keep for backward compatibility
        notes: data.notes,
        unlocked: data.unlocked ?? false,
        highlight: true,
      };
      this.state.npcs.push(newNpc);
      return createSuccess(
        newNpc,
        `Added NPC: ${newNpc.visible.name} (${newNpc.id})`,
      );
    }

    if (action === "remove") {
      const identifier = data.id || getName();
      if (!identifier) {
        return createError(
          "NPC ID or name is required for 'remove' action",
          "INVALID_DATA",
        );
      }

      const index = this.state.npcs.findIndex(
        (r) =>
          matchesIdentifier(r.id, identifier) ||
          matchesIdentifier(r.visible.name, identifier),
      );
      if (index === -1) {
        const suggestion = this.suggestSimilar(identifier, this.state.npcs);
        return createError(
          `NPC "${identifier}" not found.${suggestion}`,
          "NOT_FOUND",
        );
      }

      const removed = this.state.npcs.splice(index, 1)[0];
      return createSuccess(
        { removed: removed.id },
        `Removed NPC: ${removed.visible.name}`,
      );
    }

    if (action === "update") {
      const identifier = data.id || getName();
      if (!identifier) {
        return createError(
          "NPC ID or name is required for 'update' action",
          "INVALID_DATA",
        );
      }

      const npc = this.state.npcs.find(
        (r) =>
          matchesIdentifier(r.id, identifier) ||
          matchesIdentifier(r.visible.name, identifier),
      );
      if (!npc) {
        const suggestion = this.suggestSimilar(identifier, this.state.npcs);
        return createError(
          `NPC "${identifier}" not found.${suggestion}`,
          "NOT_FOUND",
        );
      }

      if (data.visible) mergeWithNullDeletion(npc.visible, data.visible);
      if (data.hidden) mergeWithNullDeletion(npc.hidden, data.hidden);
      if (data.currentLocation !== undefined)
        npc.currentLocation = data.currentLocation;
      if (data.known !== undefined) npc.known = data.known;
      if (data.notes !== undefined) {
        if (data.notes === null) {
          delete npc.notes;
        } else {
          npc.notes = data.notes;
        }
      }
      if (data.unlocked !== undefined) {
        if (data.unlocked === true) {
          if (
            !data.unlockReason ||
            typeof data.unlockReason !== "string" ||
            data.unlockReason.trim() === ""
          ) {
            return createError(
              "unlockReason is required to set unlocked=true when updating an NPC",
              "INVALID_DATA",
            );
          }
        }
        npc.unlocked = data.unlocked;
      }
      npc.highlight = true;
      npc.modifiedAt = this.createCurrentTimestamp();
      npc.lastModified = Date.now(); // Keep for backward compatibility

      return createSuccess(npc, `Updated NPC: ${npc.visible.name}`);
    }

    return createError(`Invalid action: ${action}`, "INVALID_ACTION");
  }

  private modifyLocation(
    action: string,
    data: Partial<Location> & {
      id?: string;
      isCurrent?: boolean;
      unlockReason?: string;
    },
  ): ToolCallResult<
    Location | { id: string; name: string } | { removed: string }
  > {
    if (action === "add") {
      if (!data.name) {
        return createError(
          "Location name is required for 'add' action",
          "INVALID_DATA",
        );
      }

      // Validate ID is provided by AI
      const finalId = data.id;
      if (!finalId) {
        return createError(
          "ID is required. AI must generate a unique ID for new locations.",
          "INVALID_DATA",
        );
      }

      // 1. Check ID Conflict
      if (this.state.locations.some((l) => matchesIdentifier(l.id, finalId))) {
        return createError(
          `ID "${finalId}" already exists. AI must generate a unique ID.`,
          "ALREADY_EXISTS",
        );
      }

      // 2. Check Name Conflict
      const existing = this.state.locations.find((l) =>
        matchesIdentifier(l.name, data.name),
      );
      if (existing) {
        return createError(
          `Location "${data.name}" already exists with ID "${existing.id}". Use action 'update' if you want to modify it.`,
          "ALREADY_EXISTS",
        );
      }

      const newId = finalId;
      if (
        data.unlocked === true &&
        (!data.unlockReason ||
          typeof data.unlockReason !== "string" ||
          data.unlockReason.trim() === "")
      ) {
        return createError(
          "unlockReason is required to set unlocked=true when adding a location",
          "INVALID_DATA",
        );
      }

      const newLocation: Location = {
        id: newId,
        name: data.name,
        visible: {
          description: data.visible?.description || "A new place.",
          knownFeatures: data.visible?.knownFeatures || [],
          environment: data.visible?.environment,
          ambience: data.visible?.ambience,
          weather: data.visible?.weather,
        },
        hidden: {
          fullDescription: data.hidden?.fullDescription || "",
          hiddenFeatures: data.hidden?.hiddenFeatures || [],
          secrets: data.hidden?.secrets || [],
        },
        isVisited: data.isVisited || true,
        createdAt: Date.now(),
        unlocked: data.unlocked ?? false,
        highlight: true,
      };
      this.state.locations.push(newLocation);
      this.state.currentLocation = data.name;
      if (this.state.character) {
        this.state.character.currentLocation = data.name;
      }

      return createSuccess(
        { id: newLocation.id, name: newLocation.name },
        `Added location: ${newLocation.name} (${newLocation.id})`,
      );
    }

    if (action === "remove") {
      const identifier = data.id || data.name;
      if (!identifier) {
        return createError(
          "Location ID or name is required for 'remove' action",
          "INVALID_DATA",
        );
      }

      const index = this.state.locations.findIndex(
        (l) =>
          matchesIdentifier(l.id, identifier) ||
          matchesIdentifier(l.name, identifier),
      );
      if (index === -1) {
        const suggestion = this.suggestSimilar(
          identifier,
          this.state.locations,
        );
        return createError(
          `Location "${identifier}" not found.${suggestion}`,
          "NOT_FOUND",
        );
      }

      const removed = this.state.locations[index];

      // Prevent removing the current location
      if (
        matchesIdentifier(this.state.currentLocation, removed.name) ||
        matchesIdentifier(this.state.currentLocation, removed.id)
      ) {
        return createError(
          `Cannot remove current location "${removed.name}"`,
          "INVALID_ACTION",
        );
      }

      this.state.locations.splice(index, 1);
      return createSuccess(
        { removed: removed.id },
        `Removed location: ${removed.name}`,
      );
    }

    if (action === "update") {
      const identifier = data.id || data.name;
      if (!identifier) {
        return createError(
          "Location ID or name is required for 'update' action",
          "INVALID_DATA",
        );
      }

      const loc = this.state.locations.find(
        (l) =>
          matchesIdentifier(l.name, identifier) ||
          matchesIdentifier(l.id, identifier),
      );
      if (!loc) {
        const suggestion = this.suggestSimilar(
          identifier,
          this.state.locations,
        );
        return createError(
          `Location "${identifier}" not found.${suggestion}`,
          "NOT_FOUND",
        );
      }

      if (data.visible) mergeWithNullDeletion(loc.visible, data.visible);
      if (data.hidden) mergeWithNullDeletion(loc.hidden, data.hidden);
      if (data.isVisited !== undefined) loc.isVisited = data.isVisited;
      if (data.unlocked !== undefined) {
        if (data.unlocked === true) {
          if (
            !data.unlockReason ||
            typeof data.unlockReason !== "string" ||
            data.unlockReason.trim() === ""
          ) {
            return createError(
              "unlockReason is required to set unlocked=true when updating a location",
              "INVALID_DATA",
            );
          }
        }
        loc.unlocked = data.unlocked;
      }
      loc.highlight = true;

      return createSuccess(loc, `Updated location: ${loc.name}`);
    }

    return createError(`Invalid action: ${action}`, "INVALID_ACTION");
  }

  private modifyQuest(
    action: string,
    data: Partial<Quest> & { id?: string; unlockReason?: string },
  ): ToolCallResult<
    Quest | { id: string; name: string } | { removed: string }
  > {
    if (action === "add") {
      if (!data.title) {
        return createError(
          "Quest title is required for 'add' action",
          "INVALID_DATA",
        );
      }

      // Validate ID is provided by AI
      const finalId = data.id;
      if (!finalId) {
        return createError(
          "ID is required. AI must generate a unique ID for new quests.",
          "INVALID_DATA",
        );
      }

      // 1. Check ID Conflict
      if (this.state.quests.some((q) => matchesIdentifier(q.id, finalId))) {
        return createError(
          `ID "${finalId}" already exists. AI must generate a unique ID.`,
          "ALREADY_EXISTS",
        );
      }

      // 2. Check Name Conflict
      const existing = this.state.quests.find((q) =>
        matchesIdentifier(q.title, data.title),
      );
      if (existing) {
        return createError(
          `Quest "${data.title}" already exists with ID "${existing.id}". Use action 'update' if you want to modify it.`,
          "ALREADY_EXISTS",
        );
      }

      const newId = finalId;
      if (
        data.unlocked === true &&
        (!data.unlockReason ||
          typeof data.unlockReason !== "string" ||
          data.unlockReason.trim() === "")
      ) {
        return createError(
          "unlockReason is required to set unlocked=true when adding a quest",
          "INVALID_DATA",
        );
      }

      const newQuest: Quest = {
        id: newId,
        title: data.title,
        type: data.type || "side",
        status: "active",
        visible: {
          description: data.visible?.description || "",
          objectives: data.visible?.objectives || [],
        },
        hidden: {
          trueDescription: data.hidden?.trueDescription,
          trueObjectives: data.hidden?.trueObjectives,
          secretOutcome: data.hidden?.secretOutcome,
        },
        createdAt: Date.now(),
        modifiedAt: this.createCurrentTimestamp(),
        lastModified: Date.now(), // Keep for backward compatibility
        unlocked: data.unlocked ?? false,
        highlight: true,
      };
      this.state.quests.push(newQuest);
      return createSuccess(
        { id: newQuest.id, name: newQuest.title },
        `Added quest: ${newQuest.title} (${newQuest.id})`,
      );
    }

    if (action === "remove") {
      const identifier = data.id || data.title;
      if (!identifier) {
        return createError(
          "Quest ID or title is required for 'remove' action",
          "INVALID_DATA",
        );
      }

      const index = this.state.quests.findIndex(
        (q) =>
          matchesIdentifier(q.id, identifier) ||
          matchesIdentifier(q.title, identifier),
      );
      if (index === -1) {
        const suggestion = this.suggestSimilar(identifier, this.state.quests);
        return createError(
          `Quest "${identifier}" not found.${suggestion}`,
          "NOT_FOUND",
        );
      }

      const removed = this.state.quests.splice(index, 1)[0];
      return createSuccess(
        { removed: removed.id },
        `Removed quest: ${removed.title}`,
      );
    }

    if (action === "update" || action === "complete" || action === "fail") {
      const identifier = data.id || data.title;
      if (!identifier) {
        return createError("Quest ID or title is required", "INVALID_DATA");
      }

      const quest = this.state.quests.find(
        (q) =>
          matchesIdentifier(q.title, identifier) ||
          matchesIdentifier(q.id, identifier),
      );
      if (!quest) {
        const suggestion = this.suggestSimilar(identifier, this.state.quests);
        return createError(
          `Quest "${identifier}" not found.${suggestion}`,
          "NOT_FOUND",
        );
      }

      if (action === "complete") quest.status = "completed";
      else if (action === "fail") quest.status = "failed";
      else if (data.status) quest.status = data.status;

      if (data.visible) mergeWithNullDeletion(quest.visible, data.visible);
      if (data.hidden) mergeWithNullDeletion(quest.hidden, data.hidden);
      if (data.unlocked !== undefined) {
        if (data.unlocked === true) {
          if (
            !data.unlockReason ||
            typeof data.unlockReason !== "string" ||
            data.unlockReason.trim() === ""
          ) {
            return createError(
              "unlockReason is required to set unlocked=true when updating a quest",
              "INVALID_DATA",
            );
          }
        }
        quest.unlocked = data.unlocked;
      }
      quest.highlight = true;
      quest.modifiedAt = this.createCurrentTimestamp();
      quest.lastModified = Date.now(); // Keep for backward compatibility

      return createSuccess(
        quest,
        `Updated quest: ${quest.title} (${quest.status})`,
      );
    }

    return createError(`Invalid action: ${action}`, "INVALID_ACTION");
  }

  private modifyKnowledge(
    action: string,
    data: Partial<KnowledgeEntry> & { id?: string; unlockReason?: string },
  ): ToolCallResult<KnowledgeEntry | { id: string; name: string }> {
    if (action === "add") {
      if (!data.title) {
        return createError(
          "Knowledge title is required for 'add' action",
          "INVALID_DATA",
        );
      }

      // Validate ID is provided by AI
      const finalId = data.id;
      if (!finalId) {
        return createError(
          "ID is required. AI must generate a unique ID for new knowledge.",
          "INVALID_DATA",
        );
      }

      // 1. Check ID Conflict
      if (this.state.knowledge.some((k) => matchesIdentifier(k.id, finalId))) {
        return createError(
          `ID "${finalId}" already exists. AI must generate a unique ID.`,
          "ALREADY_EXISTS",
        );
      }

      // 2. Check Title Conflict
      const existing = this.state.knowledge.find((k) =>
        matchesIdentifier(k.title, data.title),
      );
      if (existing) {
        return createError(
          `Knowledge "${data.title}" already exists with ID "${existing.id}". Use action 'update' if you want to modify it.`,
          "ALREADY_EXISTS",
        );
      }

      const newId = finalId;
      if (
        data.unlocked === true &&
        (!data.unlockReason ||
          typeof data.unlockReason !== "string" ||
          data.unlockReason.trim() === "")
      ) {
        return createError(
          "unlockReason is required to set unlocked=true when adding knowledge",
          "INVALID_DATA",
        );
      }

      const newKnowledge: KnowledgeEntry = {
        id: newId,
        title: data.title,
        category: data.category || "other",
        visible: {
          description: data.visible?.description || "",
          details: data.visible?.details,
        },
        hidden: {
          fullTruth: data.hidden?.fullTruth || "",
          misconceptions: data.hidden?.misconceptions,
          toBeRevealed: data.hidden?.toBeRevealed,
        },
        discoveredAt: data.discoveredAt,
        relatedTo: data.relatedTo,
        unlocked: data.unlocked ?? false,
        createdAt: Date.now(),
        modifiedAt: this.createCurrentTimestamp(),
        lastModified: Date.now(), // Keep for backward compatibility
        highlight: true,
      };
      this.state.knowledge.push(newKnowledge);
      return createSuccess(
        { id: newKnowledge.id, name: newKnowledge.title },
        `Added knowledge: ${newKnowledge.title} (${newKnowledge.id})`,
      );
    }

    if (action === "update") {
      const identifier = data.id || data.title;
      if (!identifier) {
        return createError(
          "Knowledge ID or title is required for 'update' action",
          "INVALID_DATA",
        );
      }

      const k = this.state.knowledge.find(
        (k) =>
          matchesIdentifier(k.title, identifier) ||
          matchesIdentifier(k.id, identifier),
      );
      if (!k) {
        const suggestion = this.suggestSimilar(
          identifier,
          this.state.knowledge,
        );
        return createError(
          `Knowledge "${identifier}" not found.${suggestion}`,
          "NOT_FOUND",
        );
      }

      if (data.visible) mergeWithNullDeletion(k.visible, data.visible);
      if (data.hidden) mergeWithNullDeletion(k.hidden, data.hidden);
      if (data.category !== undefined) {
        if (data.category === null) {
          delete k.category;
        } else {
          k.category = data.category;
        }
      }
      if (data.unlocked !== undefined) {
        if (data.unlocked === true) {
          if (
            !data.unlockReason ||
            typeof data.unlockReason !== "string" ||
            data.unlockReason.trim() === ""
          ) {
            return createError(
              "unlockReason is required to set unlocked=true when updating knowledge",
              "INVALID_DATA",
            );
          }
        }
        k.unlocked = data.unlocked;
      }
      k.highlight = true;
      k.modifiedAt = this.createCurrentTimestamp();
      k.lastModified = Date.now(); // Keep for backward compatibility

      return createSuccess(k, `Updated knowledge: ${k.title}`);
    }

    return createError(
      `Invalid action: ${action}. Knowledge can only be added or updated.`,
      "INVALID_ACTION",
    );
  }

  private modifyFaction(
    action: string,
    data: Partial<Faction> & { id?: string; unlockReason?: string },
  ): ToolCallResult<
    Faction | { id: string; name: string } | { removed: string }
  > {
    if (action === "add") {
      if (!data.name) {
        return createError(
          "Faction name is required for 'add' action",
          "INVALID_DATA",
        );
      }

      // Validate ID is provided by AI
      const finalId = data.id;
      if (!finalId) {
        return createError(
          "ID is required. AI must generate a unique ID for new factions.",
          "INVALID_DATA",
        );
      }

      // 1. Check ID Conflict
      if (this.state.factions.some((f) => matchesIdentifier(f.id, finalId))) {
        return createError(
          `ID "${finalId}" already exists. AI must generate a unique ID.`,
          "ALREADY_EXISTS",
        );
      }

      // 2. Check Name Conflict
      const nameExists = this.state.factions.some((f) =>
        matchesIdentifier(f.name, data.name),
      );
      if (nameExists) {
        return createError(
          `Faction "${data.name}" already exists`,
          "ALREADY_EXISTS",
        );
      }

      const newId = finalId;
      if (
        data.unlocked === true &&
        (!data.unlockReason ||
          typeof data.unlockReason !== "string" ||
          data.unlockReason.trim() === "")
      ) {
        return createError(
          "unlockReason is required to set unlocked=true when adding a faction",
          "INVALID_DATA",
        );
      }

      const newFaction: Faction = {
        id: newId,
        name: data.name,
        visible: data.visible || { agenda: "Neutral" },
        hidden: data.hidden || { agenda: "Unknown" },
        highlight: true,
        unlocked: data.unlocked ?? false,
      };
      this.state.factions.push(newFaction);
      return createSuccess(
        { id: newFaction.id, name: newFaction.name },
        `Added faction: ${newFaction.name} (${newFaction.id})`,
      );
    }

    if (action === "remove") {
      const identifier = data.id || data.name;
      if (!identifier) {
        return createError(
          "Faction ID or name is required for 'remove' action",
          "INVALID_DATA",
        );
      }

      const index = this.state.factions.findIndex(
        (f) =>
          matchesIdentifier(f.id, identifier) ||
          matchesIdentifier(f.name, identifier),
      );
      if (index === -1) {
        return createError(`Faction "${identifier}" not found`, "NOT_FOUND");
      }

      const removed = this.state.factions.splice(index, 1)[0];
      return createSuccess(
        { removed: removed.id },
        `Removed faction: ${removed.name}`,
      );
    }

    if (action === "update") {
      const identifier = data.id || data.name;
      if (!identifier) {
        return createError(
          "Faction ID or name is required for 'update' action",
          "INVALID_DATA",
        );
      }

      const f = this.state.factions.find(
        (f) =>
          matchesIdentifier(f.name, identifier) ||
          matchesIdentifier(f.id, identifier),
      );
      if (!f) {
        return createError(`Faction "${identifier}" not found`, "NOT_FOUND");
      }

      if (data.name && data.name !== identifier) f.name = data.name;
      if (data.visible) mergeWithNullDeletion(f.visible, data.visible);
      if (data.hidden) mergeWithNullDeletion(f.hidden, data.hidden);
      if (data.unlocked !== undefined) {
        if (data.unlocked === true) {
          if (
            !data.unlockReason ||
            typeof data.unlockReason !== "string" ||
            data.unlockReason.trim() === ""
          ) {
            return createError(
              "unlockReason is required to set unlocked=true when updating a faction",
              "INVALID_DATA",
            );
          }
        }
        f.unlocked = data.unlocked;
      }
      f.highlight = true;

      return createSuccess(f, `Updated faction: ${f.name}`);
    }

    return createError(`Invalid action: ${action}`, "INVALID_ACTION");
  }

  private modifyWorldInfo(data: {
    unlockWorldSetting?: boolean;
    unlockMainGoal?: boolean;
    reason: string;
  }): ToolCallResult<{ updated: string[] }> {
    const updated: string[] = [];

    if (!this.state.outline) {
      return createError("No story outline exists", "NOT_FOUND");
    }

    if (data.unlockWorldSetting) {
      // Mark worldSetting as unlocked by adding an unlocked flag
      if (
        !data.reason ||
        typeof data.reason !== "string" ||
        data.reason.trim() === ""
      ) {
        return createError(
          "reason is required to unlock worldSetting",
          "INVALID_DATA",
        );
      }
      if (!this.state.outline.worldSettingUnlocked) {
        (this.state.outline as any).worldSettingUnlocked = true;
        updated.push("worldSetting");
      }
    }

    if (data.unlockMainGoal) {
      // Mark mainGoal as unlocked
      if (
        !data.reason ||
        typeof data.reason !== "string" ||
        data.reason.trim() === ""
      ) {
        return createError(
          "reason is required to unlock mainGoal",
          "INVALID_DATA",
        );
      }
      if (!this.state.outline.mainGoalUnlocked) {
        (this.state.outline as any).mainGoalUnlocked = true;
        updated.push("mainGoal");
      }
    }

    if (updated.length === 0) {
      return createSuccess({ updated: [] }, "No changes made");
    }

    return createSuccess(
      { updated },
      `World info unlocked: ${updated.join(", ")} (${data.reason})`,
    );
  }

  private modifyCharacter(data: {
    profile?: Partial<CharacterStatus>;
    attributes?: Array<{
      action: string;
      name: string;
      value?: number;
      maxValue?: number;
      color?: string;
    }>;
    skills?: Array<{
      action: string;
      id?: string;
      name: string;
      [key: string]: any;
    }>;
    conditions?: Array<{
      action: string;
      id?: string;
      name: string;
      [key: string]: any;
    }>;
    hiddenTraits?: Array<{
      action: string;
      id?: string;
      name: string;
      [key: string]: any;
    }>;
  }): ToolCallResult<{ updated: string[] }> {
    const updated: string[] = [];

    // Profile updates
    if (data.profile) {
      if (data.profile.status)
        this.state.character.status = data.profile.status;
      if (data.profile.appearance)
        this.state.character.appearance = data.profile.appearance;
      if (data.profile.profession)
        this.state.character.profession = data.profile.profession;
      if (data.profile.background)
        this.state.character.background = data.profile.background;
      if (data.profile.race) this.state.character.race = data.profile.race;
      if (data.profile.title) this.state.character.title = data.profile.title;
      if (data.profile.currentLocation) {
        this.state.character.currentLocation = data.profile.currentLocation;
        // Sync global location and isVisited
        this.state.currentLocation = data.profile.currentLocation;
        const loc = this.state.locations.find((l) =>
          matchesIdentifier(l.name, data.profile.currentLocation),
        );
        if (loc) {
          loc.isVisited = true;
        }
      }
      updated.push("profile");
    }

    // Attribute updates
    if (data.attributes) {
      for (const attr of data.attributes) {
        if (attr.action === "add") {
          const exists = this.state.character.attributes.find(
            (a) => a.label === attr.name,
          );
          if (!exists) {
            this.state.character.attributes.push({
              label: attr.name,
              value: attr.value ?? 0,
              maxValue: attr.maxValue ?? 100,
              color: (attr.color as CharacterAttribute["color"]) || "gray",
            });
            updated.push(`attribute:${attr.name}:added`);
          }
        } else if (attr.action === "update") {
          const existing = this.state.character.attributes.find(
            (a) => a.label === attr.name,
          );
          if (existing) {
            if (attr.value !== undefined) existing.value = attr.value;
            if (attr.maxValue !== undefined) existing.maxValue = attr.maxValue;
            if (attr.color)
              existing.color = attr.color as CharacterAttribute["color"];
            updated.push(`attribute:${attr.name}:updated`);
          }
        } else if (attr.action === "remove") {
          const index = this.state.character.attributes.findIndex(
            (a) => a.label === attr.name,
          );
          if (index !== -1) {
            this.state.character.attributes.splice(index, 1);
            updated.push(`attribute:${attr.name}:removed`);
          }
        }
      }
    }

    // Skill updates
    if (data.skills) {
      for (const skill of data.skills) {
        if (skill.action === "add") {
          const exists = this.state.character.skills.find((s) =>
            matchesIdentifier(s.name, skill.name),
          );
          if (!exists) {
            const newId = skill.id;
            if (!newId) {
              return createError(
                "ID is required. AI must generate a unique ID for skills.",
                "INVALID_DATA",
              );
            }
            this.state.character.skills.push({
              id: newId,
              name: skill.name,
              level: skill.level || "Novice",
              visible: skill.visible || { description: "", knownEffects: [] },
              hidden: skill.hidden || {
                trueDescription: "",
                hiddenEffects: [],
              },
              category: skill.category,
              unlocked: skill.unlocked ?? false,
              highlight: true,
            });
            updated.push(`skill:${skill.name}:added`);
          }
        } else if (skill.action === "update") {
          const existing = this.state.character.skills.find(
            (s) =>
              matchesIdentifier(s.id, skill.id) ||
              matchesIdentifier(s.name, skill.name),
          );
          if (existing) {
            if (skill.level !== undefined) {
              if (skill.level === null) {
                delete existing.level;
              } else {
                existing.level = skill.level;
              }
            }
            if (skill.visible)
              mergeWithNullDeletion(existing.visible, skill.visible);
            if (skill.hidden)
              mergeWithNullDeletion(existing.hidden, skill.hidden);
            if (skill.unlocked !== undefined)
              existing.unlocked = skill.unlocked;
            existing.highlight = true;
            updated.push(`skill:${skill.name}:updated`);
          }
        } else if (skill.action === "remove") {
          const index = this.state.character.skills.findIndex(
            (s) =>
              matchesIdentifier(s.id, skill.id) ||
              matchesIdentifier(s.name, skill.name),
          );
          if (index !== -1) {
            this.state.character.skills.splice(index, 1);
            updated.push(`skill:${skill.name}:removed`);
          }
        }
      }
    }

    // Condition updates
    if (data.conditions) {
      for (const cond of data.conditions) {
        if (cond.action === "add") {
          const exists = this.state.character.conditions.find((c) =>
            matchesIdentifier(c.name, cond.name),
          );
          if (!exists) {
            const newId = cond.id;
            if (!newId) {
              return createError(
                "ID is required. AI must generate a unique ID for conditions.",
                "INVALID_DATA",
              );
            }
            this.state.character.conditions.push({
              id: newId,
              name: cond.name,
              type: cond.type || "neutral",
              visible: cond.visible || {
                description: "",
                perceivedSeverity: "",
              },
              hidden: cond.hidden || {
                trueCause: "",
                actualSeverity: "",
                progression: "",
              },
              effects: cond.effects || { visible: [], hidden: [] },
              severity: cond.severity,
              unlocked: cond.unlocked ?? false,
              highlight: true,
            });
            updated.push(`condition:${cond.name}:added`);
          }
        } else if (cond.action === "update") {
          const existing = this.state.character.conditions.find(
            (c) =>
              matchesIdentifier(c.id, cond.id) ||
              matchesIdentifier(c.name, cond.name),
          );
          if (existing) {
            if (cond.type !== undefined) {
              if (cond.type === null) {
                delete (existing as any).type;
              } else {
                existing.type = cond.type;
              }
            }
            if (cond.visible)
              mergeWithNullDeletion(existing.visible, cond.visible);
            if (cond.hidden)
              mergeWithNullDeletion(existing.hidden, cond.hidden);
            if (cond.effects !== undefined) {
              if (cond.effects === null) {
                delete (existing as any).effects;
              } else {
                existing.effects = cond.effects;
              }
            }
            if (cond.severity !== undefined) {
              if (cond.severity === null) {
                delete existing.severity;
              } else {
                existing.severity = cond.severity;
              }
            }
            if (cond.unlocked !== undefined) existing.unlocked = cond.unlocked;
            existing.highlight = true;
            updated.push(`condition:${cond.name}:updated`);
          }
        } else if (cond.action === "remove") {
          const index = this.state.character.conditions.findIndex(
            (c) =>
              matchesIdentifier(c.id, cond.id) ||
              matchesIdentifier(c.name, cond.name),
          );
          if (index !== -1) {
            this.state.character.conditions.splice(index, 1);
            updated.push(`condition:${cond.name}:removed`);
          }
        }
      }
    }

    // Hidden Trait updates
    if (data.hiddenTraits) {
      if (!this.state.character.hiddenTraits) {
        this.state.character.hiddenTraits = [];
      }

      for (const trait of data.hiddenTraits) {
        if (trait.action === "add") {
          const exists = this.state.character.hiddenTraits!.find((t) =>
            matchesIdentifier(t.name, trait.name),
          );
          if (!exists) {
            const newId = trait.id;
            if (!newId) {
              return createError(
                "ID is required. AI must generate a unique ID for hidden traits.",
                "INVALID_DATA",
              );
            }
            this.state.character.hiddenTraits!.push({
              id: newId,
              name: trait.name,
              description: trait.description || "",
              effects: trait.effects || [],
              triggerConditions: trait.triggerConditions,
              unlocked: trait.unlocked ?? false,
              highlight: true,
            });
            updated.push(`trait:${trait.name}:added`);
          }
        } else if (trait.action === "update") {
          const existing = this.state.character.hiddenTraits!.find(
            (t) =>
              matchesIdentifier(t.id, trait.id) ||
              matchesIdentifier(t.name, trait.name),
          );
          if (existing) {
            if (trait.description) existing.description = trait.description;
            if (trait.effects) existing.effects = trait.effects;
            if (trait.triggerConditions)
              existing.triggerConditions = trait.triggerConditions;
            if (trait.unlocked !== undefined)
              existing.unlocked = trait.unlocked;
            existing.highlight = true;
            updated.push(`trait:${trait.name}:updated`);
          }
        } else if (trait.action === "remove") {
          const index = this.state.character.hiddenTraits!.findIndex(
            (t) =>
              matchesIdentifier(t.id, trait.id) ||
              matchesIdentifier(t.name, trait.name),
          );
          if (index !== -1) {
            this.state.character.hiddenTraits!.splice(index, 1);
            updated.push(`trait:${trait.name}:removed`);
          }
        }
      }
    }

    if (updated.length === 0) {
      return createError("No valid character updates provided", "INVALID_DATA");
    }

    return createSuccess(
      { updated },
      `Character updated: ${updated.join(", ")}`,
    );
  }

  private modifyTimeline(
    action: string,
    data: Partial<TimelineEvent> & { description?: string },
  ): ToolCallResult<TimelineEvent> {
    if (action === "add") {
      const newId = data.id;
      if (!newId) {
        return createError(
          "ID is required. AI must generate a unique ID for timeline events.",
          "INVALID_DATA",
        );
      }
      const newEvent: TimelineEvent = {
        id: newId,
        gameTime: data.gameTime || this.state.time,
        category: data.category || "world_event",
        visible: {
          description: data.visible?.description || data.description || "Event",
          causedBy: data.visible?.causedBy,
        },
        hidden: {
          trueDescription: data.hidden?.trueDescription || "",
          trueCausedBy: data.hidden?.trueCausedBy,
          consequences: data.hidden?.consequences,
        },
        involvedEntities: data.involvedEntities,
        chainId: data.chainId,
        unlocked: data.unlocked ?? false,
        known: data.known ?? false,
        highlight: true,
      };
      this.state.timeline.push(newEvent);
      return createSuccess(newEvent, `Added timeline event: ${newEvent.id}`);
    }

    if (action === "update") {
      if (!data.id) {
        return createError(
          "Event ID is required for 'update' action",
          "INVALID_DATA",
        );
      }

      const event = this.state.timeline.find((e) => e.id === data.id);
      if (!event) {
        return createError(
          `Timeline event "${data.id}" not found`,
          "NOT_FOUND",
        );
      }

      if (data.visible) mergeWithNullDeletion(event.visible, data.visible);
      if (data.hidden) mergeWithNullDeletion(event.hidden, data.hidden);
      if (data.unlocked !== undefined) event.unlocked = data.unlocked;
      if (data.known !== undefined) event.known = data.known;
      event.highlight = true;

      return createSuccess(event, `Updated timeline event: ${event.id}`);
    }

    return createError(`Invalid action: ${action}`, "INVALID_ACTION");
  }

  private modifyCausalChain(
    action: string,
    data: Partial<CausalChain> & { consequenceId?: string },
  ): ToolCallResult<CausalChain | { triggered: boolean; description: string }> {
    if (action === "add") {
      if (!data.chainId) {
        return createError(
          "Chain ID is required for 'add' action",
          "INVALID_DATA",
        );
      }
      if (!data.rootCause) {
        return createError(
          "Root cause is required for 'add' action",
          "INVALID_DATA",
        );
      }

      const exists = this.state.causalChains.find(
        (c) => c.chainId === data.chainId,
      );
      if (exists) {
        return createError(
          `Causal chain "${data.chainId}" already exists`,
          "ALREADY_EXISTS",
        );
      }

      // Auto-set createdAtTurn for new pending consequences
      const currentTurn = this.state.turnNumber || 0;
      const processedConsequences = data.pendingConsequences?.map((c, idx) => ({
        ...c,
        id: c.id || `conseq:${data.chainId}:${idx}`,
        createdAtTurn: currentTurn,
        triggered: false,
      }));

      const newChain: CausalChain = {
        chainId: data.chainId,
        rootCause: data.rootCause,
        events: [],
        status: data.status || "active",
        pendingConsequences: processedConsequences,
      };
      this.state.causalChains.push(newChain);
      return createSuccess(newChain, `Added causal chain: ${newChain.chainId}`);
    }

    // NEW: 'trigger' action - AI decides to trigger a pending consequence
    if (action === "trigger") {
      if (!data.chainId) {
        return createError(
          "Chain ID is required for 'trigger' action",
          "INVALID_DATA",
        );
      }
      if (!data.consequenceId) {
        return createError(
          "consequenceId is required for 'trigger' action",
          "INVALID_DATA",
        );
      }

      return this.triggerConsequence(data.chainId, data.consequenceId);
    }

    if (action === "update" || action === "resolve" || action === "interrupt") {
      if (!data.chainId) {
        return createError("Chain ID is required", "INVALID_DATA");
      }

      const chain = this.state.causalChains.find(
        (c) => c.chainId === data.chainId,
      );
      if (!chain) {
        return createError(
          `Causal chain "${data.chainId}" not found`,
          "NOT_FOUND",
        );
      }

      if (action === "resolve") chain.status = "resolved";
      else if (action === "interrupt") chain.status = "interrupted";
      else if (data.status) chain.status = data.status;

      if (data.pendingConsequences) {
        // Map pending consequences with defaults
        chain.pendingConsequences = data.pendingConsequences.map((c, idx) => ({
          ...c,
          id: c.id || `conseq:${chain.chainId}:${idx}`,
          triggered: c.triggered ?? false,
        }));
      }

      return createSuccess(
        chain,
        `Updated causal chain: ${chain.chainId} (${chain.status})`,
      );
    }

    return createError(`Invalid action: ${action}`, "INVALID_ACTION");
  }

  private modifyGlobal(data: {
    time?: string;
    atmosphere?: AtmosphereObject;
  }): ToolCallResult<{
    updated: string[];
    values: Record<string, string | AtmosphereObject>;
  }> {
    const updated: string[] = [];
    const values: Record<string, string | AtmosphereObject> = {};

    if (data.time) {
      this.state.time = data.time;
      updated.push("time");
      values.time = data.time;
    }
    if (data.atmosphere) {
      this.state.atmosphere = data.atmosphere;
      updated.push("atmosphere");
      values.atmosphere = data.atmosphere;
    }

    if (updated.length === 0) {
      return createError("No valid global updates provided", "INVALID_DATA");
    }

    return createSuccess(
      { updated, values },
      `Global state updated: ${updated.join(", ")}`,
    );
  }

  // --- Unlock Method ---

  public unlock(
    category: string,
    identifier: { id?: string; name?: string },
    reason: string,
  ): ToolCallResult<{
    category: string;
    identifier: string;
    unlocked: boolean;
  }> {
    const { id, name } = identifier;
    if (!id && !name) {
      return createError(
        "Either 'id' or 'name' must be provided to identify the entity",
        "INVALID_DATA",
      );
    }

    const findEntity = <T extends { id?: string; name?: string }>(
      list: T[],
    ): T | undefined => {
      return list.find(
        (item) =>
          (id && matchesIdentifier(item.id, id)) ||
          (name && matchesIdentifier(item.name, name)),
      );
    };

    let entity: { unlocked?: boolean; unlockReason?: string } | undefined;
    let entityIdentifier: string = id || name || "unknown";

    switch (category) {
      case "inventory": {
        entity = findEntity(this.state.inventory);
        break;
      }
      case "npc": {
        entity = findEntity(this.state.npcs);
        break;
      }
      case "location": {
        entity = findEntity(this.state.locations);
        break;
      }
      case "quest": {
        entity = findEntity(this.state.quests);
        break;
      }
      case "knowledge": {
        entity = findEntity(this.state.knowledge);
        break;
      }
      case "timeline": {
        entity = findEntity(this.state.timeline);
        break;
      }
      case "faction": {
        entity = findEntity(this.state.factions);
        break;
      }
      case "skill": {
        entity = findEntity(this.state.character.skills);
        break;
      }
      case "condition": {
        entity = findEntity(this.state.character.conditions);
        break;
      }
      case "hidden_trait": {
        entity = findEntity(this.state.character.hiddenTraits);
        break;
      }
      default:
        return createError(
          `Unknown category: ${category}. Valid categories: inventory, npc, location, quest, knowledge, timeline, faction, skill, condition, hidden_trait`,
          "INVALID_DATA",
        );
    }

    if (!entity) {
      return createError(
        `Entity not found in ${category} with ${id ? `id: ${id}` : `name: ${name}`}`,
        "NOT_FOUND",
      );
    }

    // Set unlock status
    entity.unlocked = true;
    entity.unlockReason = reason;

    return createSuccess(
      { category, identifier: entityIdentifier, unlocked: true },
      `Unlocked ${category}: ${entityIdentifier} - ${reason}`,
    );
  }

  // ============================================================================
  // LOW-LEVEL STORAGE API
  // These methods provide pure CRUD operations for tool handlers.
  // Business logic (validation, conflict checks) is handled by the handlers.
  // ============================================================================

  // --- Inventory ---
  public getInventoryById(id: string): InventoryItem | undefined {
    return this.state.inventory.find((i) => matchesIdentifier(i.id, id));
  }

  public getInventoryByName(name: string): InventoryItem | undefined {
    return this.state.inventory.find((i) => matchesIdentifier(i.name, name));
  }

  public addInventoryItem(item: InventoryItem): void {
    this.state.inventory.push(item);
  }

  public updateInventoryItem(
    id: string,
    updates: Partial<InventoryItem>,
  ): boolean {
    const item = this.getInventoryById(id);
    if (!item) return false;
    if (updates.name !== undefined) item.name = updates.name;
    if (updates.visible) mergeWithNullDeletion(item.visible, updates.visible);
    if (updates.hidden) mergeWithNullDeletion(item.hidden, updates.hidden);
    if (updates.lore !== undefined) item.lore = updates.lore;
    if (updates.unlocked !== undefined) item.unlocked = updates.unlocked;
    if (updates.unlockReason !== undefined)
      item.unlockReason = updates.unlockReason;
    item.highlight = true;
    item.modifiedAt = this.createCurrentTimestamp();
    item.lastModified = Date.now();
    return true;
  }

  public removeInventoryItem(id: string): InventoryItem | undefined {
    const index = this.state.inventory.findIndex((i) =>
      matchesIdentifier(i.id, id),
    );
    if (index === -1) return undefined;
    return this.state.inventory.splice(index, 1)[0];
  }

  // --- NPC ---
  public getNpcById(id: string): NPC | undefined {
    return this.state.npcs.find((n) => matchesIdentifier(n.id, id));
  }

  public getNpcByName(name: string): NPC | undefined {
    return this.state.npcs.find((n) => matchesIdentifier(n.visible.name, name));
  }

  public addNpc(npc: NPC): void {
    this.state.npcs.push(npc);
  }

  public updateNpc(
    id: string,
    updates: Partial<NPC> & { visible?: any; hidden?: any },
  ): boolean {
    const npc = this.getNpcById(id);
    if (!npc) return false;
    if (updates.visible) mergeWithNullDeletion(npc.visible, updates.visible);
    if (updates.hidden) mergeWithNullDeletion(npc.hidden, updates.hidden);
    if (updates.currentLocation !== undefined)
      npc.currentLocation = updates.currentLocation;
    if (updates.known !== undefined) npc.known = updates.known;
    if (updates.notes !== undefined) {
      if (updates.notes === null) delete npc.notes;
      else npc.notes = updates.notes;
    }
    if (updates.unlocked !== undefined) npc.unlocked = updates.unlocked;
    if (updates.unlockReason !== undefined)
      npc.unlockReason = updates.unlockReason;
    npc.highlight = true;
    npc.modifiedAt = this.createCurrentTimestamp();
    npc.lastModified = Date.now();
    return true;
  }

  public removeNpc(id: string): NPC | undefined {
    const index = this.state.npcs.findIndex((n) => matchesIdentifier(n.id, id));
    if (index === -1) return undefined;
    return this.state.npcs.splice(index, 1)[0];
  }

  // --- Location ---
  public getLocationById(id: string): Location | undefined {
    return this.state.locations.find((l) => matchesIdentifier(l.id, id));
  }

  public getLocationByName(name: string): Location | undefined {
    return this.state.locations.find((l) => matchesIdentifier(l.name, name));
  }

  public addLocation(location: Location): void {
    this.state.locations.push(location);
  }

  public updateLocation(id: string, updates: Partial<Location>): boolean {
    const loc = this.getLocationById(id);
    if (!loc) return false;
    if (updates.name !== undefined) loc.name = updates.name;
    if (updates.visible) mergeWithNullDeletion(loc.visible, updates.visible);
    if (updates.hidden) mergeWithNullDeletion(loc.hidden, updates.hidden);
    if (updates.isVisited !== undefined) loc.isVisited = updates.isVisited;
    if (updates.unlocked !== undefined) loc.unlocked = updates.unlocked;
    if (updates.unlockReason !== undefined)
      loc.unlockReason = updates.unlockReason;
    loc.highlight = true;
    return true;
  }

  public removeLocation(id: string): Location | undefined {
    const index = this.state.locations.findIndex((l) =>
      matchesIdentifier(l.id, id),
    );
    if (index === -1) return undefined;
    return this.state.locations.splice(index, 1)[0];
  }

  public setCurrentLocation(name: string): void {
    this.state.currentLocation = name;
    if (this.state.character) {
      this.state.character.currentLocation = name;
    }
  }

  // --- Quest ---
  public getQuestById(id: string): Quest | undefined {
    return this.state.quests.find((q) => matchesIdentifier(q.id, id));
  }

  public addQuest(quest: Quest): void {
    this.state.quests.push(quest);
  }

  public updateQuest(id: string, updates: Partial<Quest>): boolean {
    const quest = this.getQuestById(id);
    if (!quest) return false;
    if (updates.title !== undefined) (quest as any).title = updates.title;
    if (updates.visible) mergeWithNullDeletion(quest.visible, updates.visible);
    if (updates.hidden) mergeWithNullDeletion(quest.hidden, updates.hidden);
    if (updates.unlocked !== undefined) quest.unlocked = updates.unlocked;
    if (updates.unlockReason !== undefined)
      quest.unlockReason = updates.unlockReason;
    quest.highlight = true;
    quest.modifiedAt = this.createCurrentTimestamp();
    return true;
  }

  public removeQuest(id: string): Quest | undefined {
    const index = this.state.quests.findIndex((q) =>
      matchesIdentifier(q.id, id),
    );
    if (index === -1) return undefined;
    return this.state.quests.splice(index, 1)[0];
  }

  // --- Knowledge ---
  public getKnowledgeById(id: string): KnowledgeEntry | undefined {
    return this.state.knowledge.find((k) => matchesIdentifier(k.id, id));
  }

  public addKnowledge(entry: KnowledgeEntry): void {
    this.state.knowledge.push(entry);
  }

  public updateKnowledge(
    id: string,
    updates: Partial<KnowledgeEntry>,
  ): boolean {
    const entry = this.getKnowledgeById(id);
    if (!entry) return false;
    if (updates.visible) mergeWithNullDeletion(entry.visible, updates.visible);
    if (updates.hidden) mergeWithNullDeletion(entry.hidden, updates.hidden);
    if (updates.category !== undefined) entry.category = updates.category;
    if (updates.unlocked !== undefined) entry.unlocked = updates.unlocked;
    if (updates.unlockReason !== undefined)
      entry.unlockReason = updates.unlockReason;
    entry.highlight = true;
    entry.modifiedAt = this.createCurrentTimestamp();
    return true;
  }

  // --- Timeline ---
  public getTimelineEventById(id: string): TimelineEvent | undefined {
    return this.state.timeline.find((t) => matchesIdentifier(t.id, id));
  }

  public addTimelineEvent(event: TimelineEvent): void {
    this.state.timeline.push(event);
  }

  public updateTimelineEvent(
    id: string,
    updates: Partial<TimelineEvent>,
  ): boolean {
    const event = this.getTimelineEventById(id);
    if (!event) return false;
    if (updates.visible) mergeWithNullDeletion(event.visible, updates.visible);
    if (updates.hidden) mergeWithNullDeletion(event.hidden, updates.hidden);
    if (updates.category !== undefined) event.category = updates.category;
    if (updates.known !== undefined) event.known = updates.known;
    return true;
  }

  // --- Faction ---
  public getFactionById(id: string): Faction | undefined {
    return this.state.factions.find((f) => matchesIdentifier(f.id, id));
  }

  public getFactionByName(name: string): Faction | undefined {
    return this.state.factions.find((f) => matchesIdentifier(f.name, name));
  }

  public addFaction(faction: Faction): void {
    this.state.factions.push(faction);
  }

  public updateFaction(id: string, updates: Partial<Faction>): boolean {
    const faction = this.getFactionById(id);
    if (!faction) return false;
    if (updates.name !== undefined) faction.name = updates.name;
    if (updates.visible)
      mergeWithNullDeletion(faction.visible as any, updates.visible as any);
    if (updates.hidden)
      mergeWithNullDeletion(faction.hidden as any, updates.hidden as any);
    if (updates.unlocked !== undefined) faction.unlocked = updates.unlocked;
    if (updates.unlockReason !== undefined)
      faction.unlockReason = updates.unlockReason;
    faction.highlight = true;
    return true;
  }

  public removeFaction(id: string): Faction | undefined {
    const index = this.state.factions.findIndex((f) =>
      matchesIdentifier(f.id, id),
    );
    if (index === -1) return undefined;
    return this.state.factions.splice(index, 1)[0];
  }

  // --- Causal Chain ---
  public getCausalChainById(chainId: string): CausalChain | undefined {
    return this.state.causalChains.find((c) =>
      matchesIdentifier(c.chainId, chainId),
    );
  }

  public addCausalChain(chain: CausalChain): void {
    this.state.causalChains.push(chain);
  }

  public updateCausalChain(
    chainId: string,
    updates: Partial<CausalChain>,
  ): boolean {
    const chain = this.getCausalChainById(chainId);
    if (!chain) return false;
    if (updates.status !== undefined) chain.status = updates.status;
    if (updates.pendingConsequences !== undefined) {
      chain.pendingConsequences = updates.pendingConsequences;
    }
    if (updates.events !== undefined) {
      chain.events = updates.events;
    }
    return true;
  }

  // --- Character ---
  public getCharacter(): CharacterStatus {
    return this.state.character;
  }

  public updateCharacterProfile(updates: Partial<CharacterProfile>): void {
    if (updates.name !== undefined) this.state.character.name = updates.name;
    if (updates.title !== undefined) this.state.character.title = updates.title;
    if (updates.appearance !== undefined)
      this.state.character.appearance = updates.appearance;
    if (updates.background !== undefined)
      this.state.character.background = updates.background;
    if (updates.profession !== undefined)
      this.state.character.profession = updates.profession;
    if (updates.status !== undefined)
      this.state.character.status = updates.status;
    if (updates.race !== undefined) this.state.character.race = updates.race;
  }

  public getCharacterAttributeByLabel(
    label: string,
  ): CharacterAttribute | undefined {
    return this.state.character.attributes.find((a) =>
      matchesIdentifier(a.label, label),
    );
  }

  public addCharacterAttribute(attr: CharacterAttribute): void {
    this.state.character.attributes.push(attr);
  }

  public updateCharacterAttribute(
    label: string,
    updates: Partial<CharacterAttribute>,
  ): boolean {
    const attr = this.getCharacterAttributeByLabel(label);
    if (!attr) return false;
    if (updates.value !== undefined) attr.value = updates.value;
    if (updates.maxValue !== undefined) attr.maxValue = updates.maxValue;
    if (updates.color !== undefined) attr.color = updates.color;
    if (updates.icon !== undefined) attr.icon = updates.icon;
    if (updates.label !== undefined) attr.label = updates.label;
    return true;
  }

  public removeCharacterAttribute(label: string): boolean {
    const index = this.state.character.attributes.findIndex((a) =>
      matchesIdentifier(a.label, label),
    );
    if (index === -1) return false;
    this.state.character.attributes.splice(index, 1);
    return true;
  }

  public getCharacterSkillById(
    id: string,
  ): CharacterStatus["skills"][number] | undefined {
    return this.state.character.skills.find((s) => matchesIdentifier(s.id, id));
  }

  public addCharacterSkill(skill: CharacterStatus["skills"][number]): void {
    this.state.character.skills.push(skill);
  }

  public updateCharacterSkill(
    id: string,
    updates: Partial<CharacterStatus["skills"][number]>,
  ): boolean {
    const skill = this.getCharacterSkillById(id);
    if (!skill) return false;
    if (updates.name !== undefined) skill.name = updates.name;
    if (updates.visible)
      mergeWithNullDeletion(skill.visible as any, updates.visible as any);
    if (updates.hidden)
      mergeWithNullDeletion(skill.hidden as any, updates.hidden as any);
    return true;
  }

  public removeCharacterSkill(id: string): boolean {
    const index = this.state.character.skills.findIndex((s) =>
      matchesIdentifier(s.id, id),
    );
    if (index === -1) return false;
    this.state.character.skills.splice(index, 1);
    return true;
  }

  public getCharacterConditionById(
    id: string,
  ): CharacterStatus["conditions"][number] | undefined {
    return this.state.character.conditions.find((c) =>
      matchesIdentifier(c.id, id),
    );
  }

  public addCharacterCondition(
    condition: CharacterStatus["conditions"][number],
  ): void {
    this.state.character.conditions.push(condition);
  }

  public updateCharacterCondition(
    id: string,
    updates: Partial<CharacterStatus["conditions"][number]>,
  ): boolean {
    const condition = this.getCharacterConditionById(id);
    if (!condition) return false;
    if (updates.name !== undefined) condition.name = updates.name;
    if (updates.visible)
      mergeWithNullDeletion(condition.visible as any, updates.visible as any);
    if (updates.hidden)
      mergeWithNullDeletion(condition.hidden as any, updates.hidden as any);
    return true;
  }

  public removeCharacterCondition(id: string): boolean {
    const index = this.state.character.conditions.findIndex((c) =>
      matchesIdentifier(c.id, id),
    );
    if (index === -1) return false;
    this.state.character.conditions.splice(index, 1);
    return true;
  }

  public getCharacterTraitById(
    id: string,
  ): CharacterStatus["hiddenTraits"][number] | undefined {
    return (this.state.character.hiddenTraits || []).find((t) =>
      matchesIdentifier(t.id, id),
    );
  }

  public addCharacterTrait(
    trait: CharacterStatus["hiddenTraits"][number],
  ): void {
    if (!this.state.character.hiddenTraits)
      this.state.character.hiddenTraits = [];
    this.state.character.hiddenTraits.push(trait);
  }

  public updateCharacterTrait(
    id: string,
    updates: Partial<CharacterStatus["hiddenTraits"][number]>,
  ): boolean {
    const trait = this.getCharacterTraitById(id);
    if (!trait) return false;
    if (updates.name !== undefined) trait.name = updates.name;
    if (updates.description !== undefined)
      trait.description = updates.description;
    if (updates.effects !== undefined) trait.effects = updates.effects;
    if (updates.triggerConditions !== undefined)
      trait.triggerConditions = updates.triggerConditions;
    if (updates.unlocked !== undefined) trait.unlocked = updates.unlocked;
    if (updates.unlockReason !== undefined)
      trait.unlockReason = updates.unlockReason;
    if (updates.icon !== undefined) trait.icon = updates.icon;
    if (updates.highlight !== undefined) trait.highlight = updates.highlight;
    return true;
  }

  public removeCharacterTrait(id: string): boolean {
    if (!this.state.character.hiddenTraits) return false;
    const index = this.state.character.hiddenTraits.findIndex((t) =>
      matchesIdentifier(t.id, id),
    );
    if (index === -1) return false;
    this.state.character.hiddenTraits.splice(index, 1);
    return true;
  }

  // --- Global State ---
  public getGlobalState(): GlobalStateInfo {
    return {
      time: this.state.time,
      atmosphere: this.state.atmosphere,
      theme: this.state.theme,
      currentLocation: this.state.currentLocation,
    };
  }

  public updateGlobalState(updates: Partial<GlobalStateInfo>): void {
    if (updates.time !== undefined) this.state.time = updates.time;
    if (updates.atmosphere !== undefined)
      this.state.atmosphere = updates.atmosphere;
    if (updates.theme !== undefined) this.state.theme = updates.theme;
    if (updates.currentLocation !== undefined)
      this.state.currentLocation = updates.currentLocation;
  }

  // --- Notes ---
  public getNote(key: string): string | undefined {
    return this.state.notes?.[key];
  }

  public setNote(key: string, value: string): void {
    if (!this.state.notes) this.state.notes = {};
    this.state.notes[key] = value;
  }

  public removeNote(key: string): boolean {
    if (!this.state.notes || !(key in this.state.notes)) return false;
    delete this.state.notes[key];
    return true;
  }

  public getAllNoteKeys(): string[] {
    return Object.keys(this.state.notes || {});
  }

  // --- Player Profile (Per-save) ---
  public getPlayerProfile(): string | undefined {
    return this.state.playerProfile;
  }

  public updatePlayerProfile(profile: string): void {
    this.state.playerProfile = profile;
  }

  public removeKnowledge(id: string): boolean {
    const index = this.state.knowledge.findIndex((k) =>
      matchesIdentifier(k.id, id),
    );
    if (index === -1) return false;
    this.state.knowledge.splice(index, 1);
    return true;
  }

  public removeTimelineEvent(id: string): boolean {
    const index = this.state.timeline.findIndex((t) =>
      matchesIdentifier(t.id, id),
    );
    if (index === -1) return false;
    this.state.timeline.splice(index, 1);
    return true;
  }

  public removeCausalChain(chainId: string): boolean {
    const index = this.state.causalChains.findIndex((c) =>
      matchesIdentifier(c.chainId, chainId),
    );
    if (index === -1) return false;
    this.state.causalChains.splice(index, 1);
    return true;
  }

  // --- Helpers exposed for handlers ---
  public getSuggestSimilar(identifier: string, collection: any[]): string {
    return this.suggestSimilar(identifier, collection);
  }

  public getInventoryList(): InventoryItem[] {
    return this.state.inventory;
  }

  public getNpcList(): NPC[] {
    return this.state.npcs;
  }

  public getLocationList(): Location[] {
    return this.state.locations;
  }

  public getQuestList(): Quest[] {
    return this.state.quests;
  }

  public getKnowledgeList(): KnowledgeEntry[] {
    return this.state.knowledge;
  }

  public getFactionList(): Faction[] {
    return this.state.factions;
  }

  public getTimelineList(): TimelineEvent[] {
    return this.state.timeline;
  }

  public getCausalChainList(): CausalChain[] {
    return this.state.causalChains;
  }
}
