import {
  GameState,
  InventoryItem,
  Relationship,
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
  relationship: Relationship[];
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
  inventory: InventoryItem | { removed: string };
  relationship: Relationship | { removed: string };
  location: Location | { removed: string };
  quest: Quest | { removed: string };
  knowledge: KnowledgeEntry;
  faction: Faction | { removed: string };
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

const createSuccess = <T>(data: T, message: string): ToolCallSuccess<T> => ({
  success: true,
  data,
  message,
});

const createError = (
  error: string,
  code: ToolCallError["code"] = "UNKNOWN",
): ToolCallError => ({
  success: false,
  error,
  code,
});

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
    this.state = JSON.parse(JSON.stringify(initialState));
  }

  public getState(): GameState {
    return this.state;
  }

  // --- Versioned Timestamp Helper ---

  /**
   * 创建当前版本化时间戳
   * 用于记录实体修改时间，支持分叉比较
   */
  private createCurrentTimestamp(): VersionedTimestamp {
    return createVersionedTimestamp({
      forkId: this.state.forkId || 0,
      turnNumber: this.state.turnNumber || 0,
    });
  }

  // --- Pending Consequences Query ---

  /**
   * Get all pending consequences that are READY to potentially trigger.
   * Returns consequences where readyAfterTurn < currentTurn and not yet triggered.
   *
   * NOTE: This does NOT auto-trigger anything. It provides context for AI to decide.
   * The AI calls update_causal_chain with action='trigger' when it decides a consequence should happen.
   */
  public getReadyConsequences(): Array<{
    chainId: string;
    chainDescription: string;
    consequence: {
      id: string;
      description: string;
      conditions?: string[];
      readyAfterTurn: number;
      known?: boolean;
    };
  }> {
    const currentTurn = this.state.turnNumber || 0;
    const results: Array<{
      chainId: string;
      chainDescription: string;
      consequence: {
        id: string;
        description: string;
        conditions?: string[];
        readyAfterTurn: number;
        known?: boolean;
      };
    }> = [];

    for (const chain of this.state.causalChains) {
      if (chain.status !== "active" || !chain.pendingConsequences) continue;

      for (const conseq of chain.pendingConsequences) {
        // Skip already triggered consequences
        if (conseq.triggered) continue;

        // Check if ready (current turn is AFTER readyAfterTurn)
        if (currentTurn <= conseq.readyAfterTurn) continue;

        // This consequence is READY for AI to potentially trigger
        results.push({
          chainId: chain.chainId,
          chainDescription: chain.rootCause.description,
          consequence: {
            id: conseq.id,
            description: conseq.description,
            conditions: conseq.conditions,
            readyAfterTurn: conseq.readyAfterTurn,
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

  // --- ID Generation ---

  private generateId(type: EntityType): string {
    const keyMap: Record<EntityType, keyof typeof this.state.nextIds> = {
      inventory: "item",
      npc: "npc",
      location: "location",
      quest: "quest",
      knowledge: "knowledge",
      faction: "faction",
      timeline: "timeline",
      causalChain: "causalChain",
      skill: "skill",
      condition: "condition",
      hiddenTrait: "hiddenTrait",
    };

    const key = keyMap[type];
    const nextNum = this.state.nextIds[key] || 1;
    this.state.nextIds[key] = nextNum + 1;

    return generateEntityId(type, nextNum);
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

  // Type-safe filter function for entities with name/title/id/visible fields
  private filterEntities<T extends Record<string, unknown>>(
    list: T[],
    term?: string,
  ): T[] {
    if (!term) return list;
    const lowerTerm = term.toLowerCase();
    return list.filter((item) => {
      const name = item.name as string | undefined;
      const title = item.title as string | undefined;
      const id = item.id as string | undefined;
      const visible = item.visible as { name?: string } | undefined;
      return (
        (name && name.toLowerCase().includes(lowerTerm)) ||
        (title && title.toLowerCase().includes(lowerTerm)) ||
        (visible?.name && visible.name.toLowerCase().includes(lowerTerm)) ||
        (id && String(id).toLowerCase().includes(lowerTerm))
      );
    });
  }

  public query(
    target: string,
    queryOrAspect?: string,
    extraQuery?: string,
  ): ToolCallResult<QueryResultMap[keyof QueryResultMap]> {
    const term = queryOrAspect?.toLowerCase();

    try {
      switch (target) {
        case "inventory": {
          const results = this.filterEntities(this.state.inventory, term);
          this.updateLastAccess(results);
          return createSuccess<InventoryItem[]>(
            results,
            `Found ${results.length} items`,
          );
        }

        case "relationship": {
          const results = this.filterEntities(this.state.relationships, term);
          this.updateLastAccess(results);
          return createSuccess<Relationship[]>(
            results,
            `Found ${results.length} NPCs`,
          );
        }

        case "location":
          if (term) {
            const results = this.filterEntities(this.state.locations, term);
            this.updateLastAccess(results);
            return createSuccess<Location[]>(
              results,
              `Found ${results.length} locations`,
            );
          }
          // For listing, still update lastAccess for all
          this.updateLastAccess(this.state.locations);
          return createSuccess<LocationListItem[]>(
            this.state.locations.map((l) => ({
              id: l.id,
              name: l.name,
              visited: l.isVisited,
              isCurrent:
                l.name === this.state.currentLocation ||
                l.id === this.state.currentLocation,
            })),
            `Listed ${this.state.locations.length} locations`,
          );

        case "quest": {
          const results = this.filterEntities(this.state.quests, term);
          this.updateLastAccess(results);
          return createSuccess<Quest[]>(
            results,
            `Found ${results.length} quests`,
          );
        }

        case "knowledge": {
          const results = this.filterEntities(this.state.knowledge || [], term);
          this.updateLastAccess(results);
          return createSuccess<KnowledgeEntry[]>(
            results,
            `Found ${results.length} knowledge entries`,
          );
        }

        case "faction": {
          const results = this.filterEntities(this.state.factions || [], term);
          return createSuccess<Faction[]>(
            results,
            `Found ${results.length} factions`,
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
                (item.name && item.name.toLowerCase().includes(searchTerm)) ||
                (item.id && String(item.id).toLowerCase().includes(searchTerm)),
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
              return createSuccess(
                filterByTerm(this.state.character.skills),
                `Found skills`,
              );
            case "conditions":
              return createSuccess(
                filterByTerm(this.state.character.conditions),
                `Found conditions`,
              );
            case "hiddenTraits":
              return createSuccess(
                filterByTerm(this.state.character.hiddenTraits || []),
                `Found hidden traits`,
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
          const timeline = this.state.timeline
            ? this.state.timeline.slice(-20)
            : [];
          if (term) {
            const filtered = timeline.filter(
              (e) =>
                e.id?.toLowerCase().includes(term) ||
                e.visible.description.toLowerCase().includes(term) ||
                e.category.toLowerCase().includes(term),
            );
            return createSuccess(
              filtered,
              `Found ${filtered.length} timeline events`,
            );
          }
          return createSuccess(
            timeline,
            `Retrieved ${timeline.length} recent events`,
          );

        case "causal_chain":
          const chains = this.state.causalChains || [];
          if (term) {
            const filtered = chains.filter((c) =>
              c.chainId.toLowerCase().includes(term),
            );
            return createSuccess(
              filtered,
              `Found ${filtered.length} causal chains`,
            );
          }
          return createSuccess(
            chains,
            `Retrieved ${chains.length} causal chains`,
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
        case "relationship":
          return this.modifyRelationship(action, data as any);
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

  // --- Specific Modifiers ---

  private modifyInventory(
    action: string,
    data: Partial<InventoryItem> & { id?: string; name?: string },
  ): ToolCallResult<InventoryItem | { removed: string }> {
    if (action === "add") {
      if (!data.name) {
        return createError(
          "Item name is required for 'add' action",
          "INVALID_DATA",
        );
      }

      const exists = this.state.inventory.some(
        (i) => (data.id && i.id === data.id) || i.name === data.name,
      );
      if (exists) {
        return createError(
          `Item "${data.name}" already exists`,
          "ALREADY_EXISTS",
        );
      }

      const newId = data.id || this.generateId("inventory");
      const newItem: InventoryItem = {
        id: newId,
        name: data.name,
        visible: {
          description: data.visible?.description || "A mysterious item.",
          notes: data.visible?.notes,
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
        newItem,
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
        (i) => i.id === identifier || i.name === identifier,
      );
      if (index === -1) {
        return createError(`Item "${identifier}" not found`, "NOT_FOUND");
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
        (i) => i.id === identifier || i.name === identifier,
      );
      if (!item) {
        return createError(`Item "${identifier}" not found`, "NOT_FOUND");
      }

      if (data.name && data.name !== identifier) item.name = data.name;
      if (data.visible) mergeWithNullDeletion(item.visible, data.visible);
      if (data.hidden) mergeWithNullDeletion(item.hidden, data.hidden);
      if (data.lore !== undefined) item.lore = data.lore;
      if (data.unlocked !== undefined) item.unlocked = data.unlocked;
      item.highlight = true;
      item.modifiedAt = this.createCurrentTimestamp();
      item.lastModified = Date.now(); // Keep for backward compatibility

      return createSuccess(item, `Updated item: ${item.name}`);
    }

    return createError(`Invalid action: ${action}`, "INVALID_ACTION");
  }

  private modifyRelationship(
    action: string,
    data: Partial<Relationship> & {
      id?: string;
      name?: string;
      visible?: any;
      hidden?: any;
    },
  ): ToolCallResult<Relationship | { removed: string }> {
    const getName = () => data.visible?.name || data.name;

    if (action === "add") {
      const name = getName();
      if (!name) {
        return createError(
          "NPC name is required for 'add' action",
          "INVALID_DATA",
        );
      }

      const exists = this.state.relationships.some(
        (r) => (data.id && r.id === data.id) || r.visible.name === name,
      );
      if (exists) {
        return createError(`NPC "${name}" already exists`, "ALREADY_EXISTS");
      }

      const newId = data.id || this.generateId("npc");
      const newNpc: Relationship = {
        id: newId,
        visible: {
          name: name,
          relationshipType: data.visible?.relationshipType || "Stranger",
          affinity: data.visible?.affinity ?? 50,
          affinityKnown: data.visible?.affinityKnown ?? false,
          description: data.visible?.description || "A stranger.",
          appearance: data.visible?.appearance,
          personality: data.visible?.personality,
          currentImpression: data.visible?.currentImpression,
        },
        hidden: {
          trueName: data.hidden?.trueName,
          relationshipType: data.hidden?.relationshipType || "Stranger",
          realPersonality: data.hidden?.realPersonality || "Unknown",
          realMotives: data.hidden?.realMotives || "Unknown",
          status: data.hidden?.status || "Normal",
          secrets: data.hidden?.secrets || [],
          trueAffinity: data.hidden?.trueAffinity ?? 50,
        },
        known: data.known ?? true,
        createdAt: Date.now(),
        modifiedAt: this.createCurrentTimestamp(),
        lastModified: Date.now(), // Keep for backward compatibility
        notes: data.notes,
        unlocked: data.unlocked ?? false,
        highlight: true,
      };
      this.state.relationships.push(newNpc);
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

      const index = this.state.relationships.findIndex(
        (r) => r.id === identifier || r.visible.name === identifier,
      );
      if (index === -1) {
        return createError(`NPC "${identifier}" not found`, "NOT_FOUND");
      }

      const removed = this.state.relationships.splice(index, 1)[0];
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

      const npc = this.state.relationships.find(
        (r) => r.id === identifier || r.visible.name === identifier,
      );
      if (!npc) {
        return createError(`NPC "${identifier}" not found`, "NOT_FOUND");
      }

      if (data.visible) mergeWithNullDeletion(npc.visible, data.visible);
      if (data.hidden) mergeWithNullDeletion(npc.hidden, data.hidden);
      if (data.known !== undefined) npc.known = data.known;
      if (data.notes !== undefined) {
        if (data.notes === null) {
          delete npc.notes;
        } else {
          npc.notes = data.notes;
        }
      }
      if (data.unlocked !== undefined) npc.unlocked = data.unlocked;
      npc.highlight = true;
      npc.modifiedAt = this.createCurrentTimestamp();
      npc.lastModified = Date.now(); // Keep for backward compatibility

      return createSuccess(npc, `Updated NPC: ${npc.visible.name}`);
    }

    return createError(`Invalid action: ${action}`, "INVALID_ACTION");
  }

  private modifyLocation(
    action: string,
    data: Partial<Location> & { id?: string; isCurrent?: boolean },
  ): ToolCallResult<Location | { removed: string }> {
    if (action === "add") {
      if (!data.name) {
        return createError(
          "Location name is required for 'add' action",
          "INVALID_DATA",
        );
      }

      const exists = this.state.locations.find((l) => l.name === data.name);
      if (exists) {
        return createError(
          `Location "${data.name}" already exists`,
          "ALREADY_EXISTS",
        );
      }

      const newId = data.id || this.generateId("location");
      const newLocation: Location = {
        id: newId,
        name: data.name,
        visible: {
          description: data.visible?.description || "A new place.",
          knownFeatures: data.visible?.knownFeatures || [],
        },
        hidden: {
          fullDescription: data.hidden?.fullDescription || "",
          hiddenFeatures: data.hidden?.hiddenFeatures || [],
          secrets: data.hidden?.secrets || [],
        },
        isVisited: data.isVisited || true,
        environment: data.environment || "Unknown",
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
        newLocation,
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
        (l) => l.id === identifier || l.name === identifier,
      );
      if (index === -1) {
        return createError(`Location "${identifier}" not found`, "NOT_FOUND");
      }

      const removed = this.state.locations.splice(index, 1)[0];
      if (
        this.state.currentLocation === removed.name ||
        this.state.currentLocation === removed.id
      ) {
        this.state.currentLocation = this.state.locations[0]?.name || "";
      }

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
        (l) => l.name === identifier || l.id === identifier,
      );
      if (!loc) {
        return createError(`Location "${identifier}" not found`, "NOT_FOUND");
      }

      if (data.visible) mergeWithNullDeletion(loc.visible, data.visible);
      if (data.hidden) mergeWithNullDeletion(loc.hidden, data.hidden);
      if (data.environment !== undefined) {
        if (data.environment === null) {
          delete loc.environment;
        } else {
          loc.environment = data.environment;
        }
      }
      if (data.isVisited !== undefined) loc.isVisited = data.isVisited;
      if (data.unlocked !== undefined) loc.unlocked = data.unlocked;
      loc.highlight = true;

      return createSuccess(loc, `Updated location: ${loc.name}`);
    }

    return createError(`Invalid action: ${action}`, "INVALID_ACTION");
  }

  private modifyQuest(
    action: string,
    data: Partial<Quest> & { id?: string },
  ): ToolCallResult<Quest | { removed: string }> {
    if (action === "add") {
      if (!data.title) {
        return createError(
          "Quest title is required for 'add' action",
          "INVALID_DATA",
        );
      }

      const exists = this.state.quests.find((q) => q.title === data.title);
      if (exists) {
        return createError(
          `Quest "${data.title}" already exists`,
          "ALREADY_EXISTS",
        );
      }

      const newId = data.id || this.generateId("quest");
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
        newQuest,
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
        (q) => q.id === identifier || q.title === identifier,
      );
      if (index === -1) {
        return createError(`Quest "${identifier}" not found`, "NOT_FOUND");
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
        (q) => q.title === identifier || q.id === identifier,
      );
      if (!quest) {
        return createError(`Quest "${identifier}" not found`, "NOT_FOUND");
      }

      if (action === "complete") quest.status = "completed";
      else if (action === "fail") quest.status = "failed";
      else if (data.status) quest.status = data.status;

      if (data.visible) mergeWithNullDeletion(quest.visible, data.visible);
      if (data.hidden) mergeWithNullDeletion(quest.hidden, data.hidden);
      if (data.unlocked !== undefined) quest.unlocked = data.unlocked;
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
    data: Partial<KnowledgeEntry> & { id?: string },
  ): ToolCallResult<KnowledgeEntry> {
    if (action === "add") {
      if (!data.title) {
        return createError(
          "Knowledge title is required for 'add' action",
          "INVALID_DATA",
        );
      }

      const exists = this.state.knowledge.find((k) => k.title === data.title);
      if (exists) {
        return createError(
          `Knowledge "${data.title}" already exists`,
          "ALREADY_EXISTS",
        );
      }

      const newId = data.id || this.generateId("knowledge");
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
        newKnowledge,
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
        (k) => k.title === identifier || k.id === identifier,
      );
      if (!k) {
        return createError(`Knowledge "${identifier}" not found`, "NOT_FOUND");
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
      if (data.unlocked !== undefined) k.unlocked = data.unlocked;
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
    data: Partial<Faction> & { id?: string },
  ): ToolCallResult<Faction | { removed: string }> {
    if (action === "add") {
      if (!data.name) {
        return createError(
          "Faction name is required for 'add' action",
          "INVALID_DATA",
        );
      }

      const exists = this.state.factions.find((f) => f.name === data.name);
      if (exists) {
        return createError(
          `Faction "${data.name}" already exists`,
          "ALREADY_EXISTS",
        );
      }

      const newId = data.id || this.generateId("faction");
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
        newFaction,
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
        (f) => f.id === identifier || f.name === identifier,
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
        (f) => f.name === identifier || f.id === identifier,
      );
      if (!f) {
        return createError(`Faction "${identifier}" not found`, "NOT_FOUND");
      }

      if (data.name && data.name !== identifier) f.name = data.name;
      if (data.visible) mergeWithNullDeletion(f.visible, data.visible);
      if (data.hidden) mergeWithNullDeletion(f.hidden, data.hidden);
      if (data.unlocked !== undefined) f.unlocked = data.unlocked;
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
      if (!this.state.outline.worldSettingUnlocked) {
        (this.state.outline as any).worldSettingUnlocked = true;
        updated.push("worldSetting");
      }
    }

    if (data.unlockMainGoal) {
      // Mark mainGoal as unlocked
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
        const loc = this.state.locations.find(
          (l) => l.name === data.profile.currentLocation,
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
          const exists = this.state.character.skills.find(
            (s) => s.name === skill.name,
          );
          if (!exists) {
            const newId = skill.id || this.generateId("skill");
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
            (s) => s.id === skill.id || s.name === skill.name,
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
            (s) => s.id === skill.id || s.name === skill.name,
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
          const exists = this.state.character.conditions.find(
            (c) => c.name === cond.name,
          );
          if (!exists) {
            const newId = cond.id || this.generateId("condition");
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
                actualSeverity: 0,
                progression: "",
              },
              effects: cond.effects || { visible: [], hidden: [] },
              duration: cond.duration,
              unlocked: cond.unlocked ?? false,
              highlight: true,
            });
            updated.push(`condition:${cond.name}:added`);
          }
        } else if (cond.action === "update") {
          const existing = this.state.character.conditions.find(
            (c) => c.id === cond.id || c.name === cond.name,
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
            if (cond.duration !== undefined) {
              if (cond.duration === null) {
                delete existing.duration;
              } else {
                existing.duration = cond.duration;
              }
            }
            if (cond.unlocked !== undefined) existing.unlocked = cond.unlocked;
            existing.highlight = true;
            updated.push(`condition:${cond.name}:updated`);
          }
        } else if (cond.action === "remove") {
          const index = this.state.character.conditions.findIndex(
            (c) => c.id === cond.id || c.name === cond.name,
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
          const exists = this.state.character.hiddenTraits!.find(
            (t) => t.name === trait.name,
          );
          if (!exists) {
            const newId = trait.id || this.generateId("hiddenTrait");
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
            (t) => t.id === trait.id || t.name === trait.name,
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
            (t) => t.id === trait.id || t.name === trait.name,
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
      const newId = data.id || this.generateId("timeline");
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
    data: Partial<CausalChain> & { triggerConsequenceId?: string },
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
      if (!data.triggerConsequenceId) {
        return createError(
          "triggerConsequenceId is required for 'trigger' action",
          "INVALID_DATA",
        );
      }

      return this.triggerConsequence(data.chainId, data.triggerConsequenceId);
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
        // Auto-set createdAtTurn for new pending consequences
        const currentTurn = this.state.turnNumber || 0;
        chain.pendingConsequences = data.pendingConsequences.map((c, idx) => ({
          ...c,
          id: c.id || `conseq:${chain.chainId}:${idx}`,
          createdAtTurn: c.createdAtTurn ?? currentTurn,
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
}
