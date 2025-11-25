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
} from "../types";

export class GameDatabase {
  private state: GameState;

  constructor(initialState: GameState) {
    // Deep copy to ensure we don't mutate the original state reference until ready
    this.state = JSON.parse(JSON.stringify(initialState));
  }

  public getState(): GameState {
    return this.state;
  }

  // --- Query Methods ---

  public query(target: string, query?: string): unknown {
    const term = query?.toLowerCase();
    const filter = (list: any[]) => {
      if (!term) return list;
      return list.filter(
        (item) =>
          (item.name && item.name.toLowerCase().includes(term)) ||
          (item.title && item.title.toLowerCase().includes(term)) ||
          (item.visible?.name &&
            item.visible.name.toLowerCase().includes(term)) ||
          (item.id && String(item.id).includes(term)),
      );
    };

    switch (target) {
      case "inventory":
        return filter(this.state.inventory);
      case "relationship":
        return filter(this.state.relationships);
      case "location":
        if (term) return filter(this.state.locations);
        return this.state.locations.map((l) => ({
          id: l.id,
          name: l.name,
          visited: l.isVisited,
        }));
      case "quest":
        return filter(this.state.quests);
      case "knowledge":
        return filter(this.state.knowledge || []);
      case "faction":
        return filter(this.state.factions || []);
      case "character":
        return this.state.character;
      case "timeline":
        return this.state.timeline ? this.state.timeline.slice(-20) : [];
      case "causal_chain":
        return this.state.causalChains || [];
      case "global":
        return {
          time: this.state.time,
          envTheme: this.state.envTheme,
          theme: this.state.theme,
          activeNodeId: this.state.activeNodeId,
        };
      default:
        return { error: "Unknown target" };
    }
  }

  // --- Modification Methods ---

  public modify(
    target: string,
    action: "add" | "update" | "remove",
    data: unknown,
  ): void {
    switch (target) {
      case "inventory":
        this.modifyInventory(action, data);
        break;
      case "relationship":
        this.modifyRelationship(action, data);
        break;
      case "location":
        this.modifyLocation(action, data);
        break;
      case "quest":
        this.modifyQuest(action, data);
        break;
      case "knowledge":
        this.modifyKnowledge(action, data);
        break;
      case "faction":
        this.modifyFaction(action, data);
        break;
      case "character":
        this.modifyCharacter(data); // Character usually just updates
        break;
      case "timeline":
        this.modifyTimeline(action, data);
        break;
      case "causal_chain":
        this.modifyCausalChain(action, data);
        break;
      case "global":
        this.modifyGlobal(data);
        break;
    }
  }

  // --- Specific Modifiers (Logic migrated from stateProcessors) ---

  private modifyInventory(
    action: string,
    data: Partial<InventoryItem> & { id?: number },
  ) {
    if (action === "add") {
      const exists = this.state.inventory.some(
        (i) => (data.id && i.id === data.id) || i.name === data.name,
      );
      if (!exists) {
        const newId = data.id || this.state.nextIds.item++;
        this.state.inventory.push({
          id: newId,
          name: data.name || "Unknown Item",
          visible: {
            description: data.visible?.description || "A mysterious item.",
            notes: data.visible?.notes,
          },
          hidden: {
            truth: data.hidden?.truth || "The truth is hidden.",
            secrets: data.hidden?.secrets,
          },
          createdAt: Date.now(),
          lastModified: Date.now(),
          lore: data.lore,
          unlocked: data.unlocked ?? false,
          highlight: true,
        });
      }
    } else if (action === "remove") {
      this.state.inventory = this.state.inventory.filter(
        (i) => !(data.id && i.id === data.id) && i.name !== data.name,
      );
    } else if (action === "update") {
      const item = this.state.inventory.find(
        (i) => (data.id && i.id === data.id) || i.name === data.name,
      );
      if (item) {
        if (data.name) item.name = data.name;
        if (data.visible) Object.assign(item.visible, data.visible);
        if (data.hidden) Object.assign(item.hidden, data.hidden);
        if (data.unlocked !== undefined) item.unlocked = data.unlocked;
        item.highlight = true;
        item.lastModified = Date.now();
      }
    }
  }

  private modifyRelationship(
    action: string,
    data: Partial<Relationship> & {
      id?: number;
      name?: string;
      visible?: any;
      hidden?: any;
    },
  ) {
    if (action === "add") {
      const exists = this.state.relationships.some(
        (r) => (data.id && r.id === data.id) || r.visible.name === data.name,
      );
      if (!exists) {
        const newId = data.id || this.state.nextIds.npc++;
        this.state.relationships.push({
          id: newId,
          visible: {
            name: data.name,
            relationshipType: data.visible?.relationshipType || "Stranger",
            affinity: data.visible?.affinity || 0,
            description: data.visible?.description || "A stranger.",
            appearance: data.visible?.appearance,
            personality: data.visible?.personality,
            currentImpression: data.visible?.currentImpression,
            affinityKnown: data.visible?.affinityKnown ?? false,
          },
          hidden: {
            trueName: data.hidden?.trueName,
            relationshipType: data.hidden?.relationshipType || "Stranger",
            realPersonality: data.hidden?.realPersonality || "Unknown",
            realMotives: data.hidden?.realMotives || "Unknown",
            status: data.hidden?.status || "Normal",
            secrets: data.hidden?.secrets || [],
            trueAffinity: data.hidden?.trueAffinity || 0,
          },
          known: data.known ?? true,
          createdAt: Date.now(),
          lastModified: Date.now(),
          highlight: true,
        });
      }
    } else if (action === "update") {
      const npc = this.state.relationships.find(
        (r) => (data.id && r.id === data.id) || r.visible.name === data.name,
      );
      if (npc) {
        if (data.visible) Object.assign(npc.visible, data.visible);
        if (data.hidden) Object.assign(npc.hidden, data.hidden);
        if (data.known !== undefined) npc.known = data.known;
        npc.highlight = true;
        npc.lastModified = Date.now();
      }
    }
  }

  private modifyLocation(
    action: string,
    data: Partial<Location> & { id?: number; isCurrent?: boolean },
  ) {
    // If action is "update" and target is "current", we move the player
    if (action === "update" && data.isCurrent) {
      this.state.currentLocation = data.name;
    }

    if (action === "add") {
      const exists = this.state.locations.find((l) => l.name === data.name);
      if (!exists) {
        const newId = data.id || this.state.nextIds.location++;
        this.state.locations.push({
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
          isVisited: true,
          environment: data.environment || "Unknown",
          createdAt: Date.now(),
        });
        this.state.currentLocation = data.name; // Auto-move to new location if added? Usually yes.
      } else {
        // If exists, just ensure visited
        exists.isVisited = true;
        this.state.currentLocation = data.name;
      }
    } else if (action === "update") {
      const loc = this.state.locations.find(
        (l) => l.name === data.name || l.id === data.id,
      );
      if (loc) {
        if (data.visible) Object.assign(loc.visible, data.visible);
        if (data.hidden) Object.assign(loc.hidden, data.hidden);
        if (data.isVisited !== undefined) loc.isVisited = data.isVisited;
      }
    }
  }

  private modifyQuest(action: string, data: Partial<Quest> & { id?: number }) {
    if (action === "add") {
      const exists = this.state.quests.find((q) => q.title === data.title);
      if (!exists) {
        const newId = data.id || this.state.nextIds.quest++;
        this.state.quests.push({
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
          },
          createdAt: Date.now(),
          lastModified: Date.now(),
          highlight: true,
        });
      }
    } else if (action === "update") {
      const quest = this.state.quests.find(
        (q) => q.title === data.title || q.id === data.id,
      );
      if (quest) {
        if (data.status) quest.status = data.status;
        if (data.visible) Object.assign(quest.visible, data.visible);
        if (data.hidden) Object.assign(quest.hidden, data.hidden);
        quest.highlight = true;
        quest.lastModified = Date.now();
      }
    }
  }

  private modifyKnowledge(
    action: string,
    data: Partial<KnowledgeEntry> & { id?: number },
  ) {
    if (action === "add") {
      const exists = this.state.knowledge.find((k) => k.title === data.title);
      if (!exists) {
        const newId = data.id || this.state.nextIds.knowledge++;
        this.state.knowledge.push({
          id: newId,
          category: data.category || "other", // Default to 'other' if invalid
          title: data.title,
          visible: {
            description: data.visible?.description || "",
            details: data.visible?.details,
          },
          hidden: {
            fullTruth: data.hidden?.fullTruth || "",
          },
          unlocked: data.unlocked ?? false,
          createdAt: Date.now(),
          lastModified: Date.now(),
          highlight: true,
        });
      }
    } else if (action === "update") {
      const k = this.state.knowledge.find(
        (k) => k.title === data.title || k.id === data.id,
      );
      if (k) {
        if (data.visible) Object.assign(k.visible, data.visible);
        if (data.hidden) Object.assign(k.hidden, data.hidden);
        if (data.unlocked !== undefined) k.unlocked = data.unlocked;
        k.highlight = true;
        k.lastModified = Date.now();
      }
    }
  }

  private modifyFaction(
    action: string,
    data: Partial<Faction> & { id?: number },
  ) {
    if (action === "add") {
      const exists = this.state.factions.find((f) => f.name === data.name);
      if (!exists) {
        const newId = data.id || this.state.nextIds.faction++;
        this.state.factions.push({
          id: newId,
          name: data.name || "Unknown Faction",
          visible: data.visible || "Neutral",
          hidden: data.hidden || "Unknown",
          highlight: true,
        });
      }
    } else if (action === "update") {
      const f = this.state.factions.find(
        (f) => f.name === data.name || f.id === data.id,
      );
      if (f) {
        if (data.visible) f.visible = data.visible;
        if (data.hidden) f.hidden = data.hidden;
        f.highlight = true;
      }
    }
  }

  private modifyCharacter(data: Partial<CharacterStatus>) {
    if (data.status) this.state.character.status = data.status;
    if (data.appearance) this.state.character.appearance = data.appearance;
    if (data.profession) this.state.character.profession = data.profession;
  }

  private modifyTimeline(
    action: string,
    data: Partial<TimelineEvent> & { description?: string },
  ) {
    if (action === "add") {
      const newEvent: TimelineEvent = {
        id: data.id || Date.now().toString(),
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
        known: data.known ?? true,
        highlight: true,
      };
      this.state.timeline.push(newEvent);
    } else if (action === "update") {
      const event = this.state.timeline.find((e) => e.id === data.id);
      if (event) {
        if (data.visible) Object.assign(event.visible, data.visible);
        if (data.hidden) Object.assign(event.hidden, data.hidden);
        if (data.unlocked !== undefined) event.unlocked = data.unlocked;
        if (data.known !== undefined) event.known = data.known;
        event.highlight = true;
      }
    }
  }

  private modifyCausalChain(action: string, data: Partial<CausalChain>) {
    if (action === "add") {
      if (data.chainId && data.rootCause) {
        this.state.causalChains.push({
          chainId: data.chainId,
          rootCause: data.rootCause,
          events: [],
          status: data.status || "active",
          pendingConsequences: data.pendingConsequences,
        });
      }
    } else if (action === "update") {
      const chain = this.state.causalChains.find(
        (c) => c.chainId === data.chainId,
      );
      if (chain) {
        if (data.status) chain.status = data.status;
        if (data.pendingConsequences)
          chain.pendingConsequences = data.pendingConsequences;
      }
    }
  }

  private modifyGlobal(data: any) {
    if (data.time) this.state.time = data.time;
    if (data.envTheme) this.state.envTheme = data.envTheme;
  }
}
