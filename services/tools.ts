import {
  inventoryItemProperties,
  relationshipProperties,
  locationProperties,
  questProperties,
  knowledgeProperties,
  timelineEventProperties,
  causalChainProperties,
  factionProperties,
  skillProperties,
  conditionProperties,
} from "./schemas";

// --- ID Format Documentation ---
// All entities in the game use a standardized ID format: "{prefix}:{number}"
// - Inventory Items: "inv:{N}" (e.g., "inv:1", "inv:42")
// - NPCs/Relationships: "npc:{N}" (e.g., "npc:1", "npc:15")
// - Locations: "loc:{N}" (e.g., "loc:1", "loc:7")
// - Quests: "quest:{N}" (e.g., "quest:1", "quest:3")
// - Knowledge Entries: "know:{N}" (e.g., "know:1", "know:12")
// - Factions: "fac:{N}" (e.g., "fac:1", "fac:5")
// - Timeline Events: "evt:{N}" (e.g., "evt:1", "evt:100")
// - Causal Chains: "chain:{N}" (e.g., "chain:1", "chain:8")
// - Character Skills: "skill:{N}" (e.g., "skill:1", "skill:5")
// - Character Conditions: "cond:{N}" (e.g., "cond:1", "cond:3")
// - Hidden Traits: "trait:{N}" (e.g., "trait:1", "trait:2")

export const ID_PREFIXES = {
  inventory: "inv",
  npc: "npc",
  location: "loc",
  quest: "quest",
  knowledge: "know",
  faction: "fac",
  timeline: "evt",
  causalChain: "chain",
  skill: "skill",
  condition: "cond",
  hiddenTrait: "trait",
} as const;

export type EntityType = keyof typeof ID_PREFIXES;

// Helper to generate ID
export const generateEntityId = (type: EntityType, num: number): string => {
  return `${ID_PREFIXES[type]}:${num}`;
};

// Helper to parse ID
export const parseEntityId = (id: string): { type: string; num: number } | null => {
  const match = id.match(/^([a-z]+):(\d+)$/);
  if (!match) return null;
  return { type: match[1], num: parseInt(match[2], 10) };
};

// --- Tool Definitions ---

export const QUERY_INVENTORY_TOOL = {
  name: "query_inventory",
  description:
    "Query the player's inventory. Returns a list of items matching the query.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Name, ID (format: inv:N, e.g., 'inv:1'), or keyword to search for. If omitted, lists all items.",
      },
    },
  },
};

export const QUERY_RELATIONSHIPS_TOOL = {
  name: "query_relationships",
  description:
    "Query known NPCs and relationships. Returns a list of NPCs matching the query.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Name, ID (format: npc:N, e.g., 'npc:1'), or keyword to search for. If omitted, lists all known NPCs.",
      },
    },
  },
};

export const QUERY_LOCATIONS_TOOL = {
  name: "query_locations",
  description:
    "Query known locations. Returns a list of locations matching the query.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Name, ID (format: loc:N, e.g., 'loc:1'), or keyword to search for. If omitted, lists all known locations.",
      },
    },
  },
};

export const QUERY_QUESTS_TOOL = {
  name: "query_quests",
  description:
    "Query active and completed quests. Returns a list of quests matching the query.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Title, ID (format: quest:N, e.g., 'quest:1'), or keyword to search for. If omitted, lists all quests matching the status.",
      },
      status: {
        type: "string",
        enum: ["active", "completed", "failed", "all"],
        description: "Filter by quest status. Defaults to 'active'.",
      },
    },
  },
};

export const QUERY_KNOWLEDGE_TOOL = {
  name: "query_knowledge",
  description:
    "Query the player's accumulated knowledge/lore. Returns a list of entries matching the query.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Title, ID (format: know:N, e.g., 'know:1'), or keyword to search for. If omitted, lists all knowledge.",
      },
      category: {
        type: "string",
        enum: [
          "landscape",
          "history",
          "item",
          "legend",
          "faction",
          "culture",
          "magic",
          "technology",
          "other",
        ],
        description: "Filter by category.",
      },
    },
  },
};

export const QUERY_TIMELINE_TOOL = {
  name: "query_timeline",
  description:
    "Query the world timeline and history. Returns a list of events matching the query.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Keyword, ID (format: evt:N, e.g., 'evt:1'), or category to search for. If omitted, lists recent events.",
      },
    },
  },
};

export const QUERY_CAUSAL_CHAIN_TOOL = {
  name: "query_causal_chain",
  description: "Query active causal chains (cause-and-effect sequences).",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Keyword or Chain ID (format: chain:N, e.g., 'chain:1').",
      },
    },
  },
};

export const QUERY_FACTIONS_TOOL = {
  name: "query_factions",
  description: "Query major factions and power groups.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Name, ID (format: fac:N, e.g., 'fac:1'), or keyword.",
      },
    },
  },
};

export const QUERY_GLOBAL_TOOL = {
  name: "query_global",
  description:
    "Query global game state properties like time, theme, environment, etc.",
  parameters: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["time", "theme", "environment", "all"],
        description: "The category of global state to retrieve.",
      },
    },
    required: ["category"],
  },
};

export const QUERY_CHARACTER_TOOL = {
  name: "query_character",
  description:
    "Query the player character's status, attributes, skills, conditions, and hidden traits.",
  parameters: {
    type: "object",
    properties: {
      aspect: {
        type: "string",
        enum: ["all", "profile", "attributes", "skills", "conditions", "hiddenTraits"],
        description: "The aspect of the character to query. Defaults to 'all'.",
      },
      query: {
        type: "string",
        description:
          "For skills/conditions/traits: Name or ID (skill:N, cond:N, trait:N) to search for specific items.",
      },
    },
  },
};

// --- Update Tools (Using Unified Schemas) ---

export const UPDATE_INVENTORY_TOOL = {
  name: "update_inventory",
  description: "Add, remove, or update items in the player's inventory.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "update", "remove"],
        description: "The action to perform on the inventory item.",
      },
      id: {
        type: "string",
        description: "Item ID (format: inv:N, e.g., 'inv:1'). Required for 'update' and 'remove' actions.",
      },
      name: {
        type: "string",
        description: "Item name. Required for 'add' action.",
      },
      visible: {
        type: "object",
        properties: {
          description: { type: "string", description: "Visual description of the item." },
          notes: { type: "string", description: "Player's notes about the item." },
        },
      },
      hidden: {
        type: "object",
        properties: {
          truth: { type: "string", description: "True nature/power of the item." },
          secrets: { type: "array", items: { type: "string" }, description: "Hidden secrets about the item." },
        },
      },
      lore: { type: "string", description: "Brief lore or history of the item." },
      unlocked: { type: "boolean", description: "Whether the hidden truth is revealed to the player." },
    },
    required: ["action"],
  },
};

export const UPDATE_RELATIONSHIP_TOOL = {
  name: "update_relationship",
  description: "Add, update, or remove NPC relationships.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "update", "remove"],
        description: "The action to perform on the relationship.",
      },
      id: {
        type: "string",
        description: "NPC ID (format: npc:N, e.g., 'npc:1'). Required for 'update' and 'remove' actions.",
      },
      known: { type: "boolean", description: "Whether the player knows this character." },
      visible: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name the player knows them by." },
          description: { type: "string", description: "Public perception of the NPC." },
          appearance: { type: "string", description: "Physical appearance." },
          relationshipType: { type: "string", description: "Relationship status from player's perspective." },
          currentImpression: { type: "string", description: "NPC's current observable state." },
          personality: { type: "string", description: "Public perception of personality." },
          affinity: { type: "integer", description: "Affinity score 0-100." },
          affinityKnown: { type: "boolean", description: "Whether the player knows the affinity level." },
        },
      },
      hidden: {
        type: "object",
        properties: {
          trueName: { type: "string", description: "The character's real name if different." },
          realPersonality: { type: "string", description: "True personality." },
          realMotives: { type: "string", description: "True underlying motives." },
          secrets: { type: "array", items: { type: "string" }, description: "Character's secrets." },
          trueAffinity: { type: "integer", description: "True affinity score." },
          relationshipType: { type: "string", description: "NPC's true view of the relationship." },
          status: { type: "string", description: "NPC's current state (e.g., 'plotting', 'injured')." },
        },
      },
      notes: { type: "string", description: "NPC's observations of player's behavior." },
      unlocked: { type: "boolean", description: "Whether hidden info is revealed (requires special ability)." },
    },
    required: ["action"],
  },
};

export const UPDATE_LOCATION_TOOL = {
  name: "update_location",
  description: "Add, update, or remove locations. Use to track player movement and location discovery.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "update", "remove"],
        description: "The action to perform on the location.",
      },
      id: {
        type: "string",
        description: "Location ID (format: loc:N, e.g., 'loc:1'). Required for 'update' and 'remove' actions.",
      },
      name: {
        type: "string",
        description: "Location name. Required for 'add' action.",
      },
      visible: {
        type: "object",
        properties: {
          description: { type: "string", description: "Visual description of the location." },
          knownFeatures: { type: "array", items: { type: "string" }, description: "Known features." },
        },
      },
      hidden: {
        type: "object",
        properties: {
          fullDescription: { type: "string", description: "True nature of the location." },
          hiddenFeatures: { type: "array", items: { type: "string" }, description: "Hidden features." },
          secrets: { type: "array", items: { type: "string" }, description: "Location secrets." },
        },
      },
      environment: { type: "string", description: "Atmosphere/Environment tag." },
      isCurrent: { type: "boolean", description: "Set to true if player moves here." },
      isVisited: { type: "boolean", description: "Whether the location has been visited." },
      unlocked: { type: "boolean", description: "Whether hidden secrets are discovered." },
    },
    required: ["action"],
  },
};

export const UPDATE_QUEST_TOOL = {
  name: "update_quest",
  description: "Add, update, complete, fail, or remove quests.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "update", "complete", "fail", "remove"],
        description: "The action to perform on the quest.",
      },
      id: {
        type: "string",
        description: "Quest ID (format: quest:N, e.g., 'quest:1'). Required for 'update', 'complete', 'fail', 'remove' actions.",
      },
      title: {
        type: "string",
        description: "Quest title. Required for 'add' action.",
      },
      type: {
        type: "string",
        enum: ["main", "side", "hidden"],
        description: "Quest type.",
      },
      visible: {
        type: "object",
        properties: {
          description: { type: "string", description: "The apparent objective." },
          objectives: { type: "array", items: { type: "string" }, description: "Visible objectives." },
        },
      },
      hidden: {
        type: "object",
        properties: {
          trueDescription: { type: "string", description: "The hidden truth or real purpose." },
          trueObjectives: { type: "array", items: { type: "string" }, description: "True objectives." },
          secretOutcome: { type: "string", description: "Secret outcome." },
        },
      },
      unlocked: { type: "boolean", description: "Whether true objectives are revealed." },
    },
    required: ["action"],
  },
};

export const UPDATE_KNOWLEDGE_TOOL = {
  name: "update_knowledge",
  description: "Add or update knowledge entries. Knowledge can only be added or updated, never removed.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "update"],
        description: "The action to perform.",
      },
      id: {
        type: "string",
        description: "Knowledge ID (format: know:N, e.g., 'know:1'). Required for 'update' action.",
      },
      title: {
        type: "string",
        description: "Title of the knowledge entry. Required for 'add' action.",
      },
      category: {
        type: "string",
        enum: ["landscape", "history", "item", "legend", "faction", "culture", "magic", "technology", "other"],
        description: "Category of knowledge.",
      },
      visible: {
        type: "object",
        properties: {
          description: { type: "string", description: "What is commonly known." },
          details: { type: "string", description: "Additional details." },
        },
      },
      hidden: {
        type: "object",
        properties: {
          fullTruth: { type: "string", description: "The complete truth." },
          misconceptions: { type: "array", items: { type: "string" }, description: "Common misconceptions." },
          toBeRevealed: { type: "array", items: { type: "string" }, description: "Info to be revealed later." },
        },
      },
      discoveredAt: { type: "string", description: "When this knowledge was discovered." },
      relatedTo: { type: "array", items: { type: "string" }, description: "Related entity IDs." },
      unlocked: { type: "boolean", description: "Whether full truth is revealed." },
    },
    required: ["action"],
  },
};

export const UPDATE_TIMELINE_TOOL = {
  name: "update_timeline",
  description: "Add or update timeline events (World Events, NPC Actions, Consequences).",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "update"],
        description: "The action to perform.",
      },
      id: {
        type: "string",
        description: "Event ID (format: evt:N, e.g., 'evt:1'). Required for 'update' action.",
      },
      gameTime: { type: "string", description: "When the event happened in game time." },
      category: {
        type: "string",
        enum: ["player_action", "npc_action", "world_event", "consequence"],
        description: "Category of the event.",
      },
      visible: {
        type: "object",
        properties: {
          description: { type: "string", description: "Public description of the event." },
          causedBy: { type: "string", description: "Publicly known cause." },
        },
        required: ["description"],
      },
      hidden: {
        type: "object",
        properties: {
          trueDescription: { type: "string", description: "The true nature of the event." },
          trueCausedBy: { type: "string", description: "The real cause." },
          consequences: { type: "array", items: { type: "string" }, description: "Hidden consequences." },
        },
      },
      involvedEntities: { type: "array", items: { type: "string" }, description: "IDs of involved entities." },
      chainId: { type: "string", description: "Link to a CausalChain (format: chain:N)." },
      known: { type: "boolean", description: "Whether the player knows about this event." },
      unlocked: { type: "boolean", description: "Whether true cause is revealed." },
    },
    required: ["action"],
  },
};

export const UPDATE_CAUSAL_CHAIN_TOOL = {
  name: "update_causal_chain",
  description: "Create, update, or resolve causal chains to track long-term consequences.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "update", "resolve", "interrupt"],
        description: "The action to perform.",
      },
      chainId: {
        type: "string",
        description: "Chain ID (format: chain:N, e.g., 'chain:1'). Required for all actions.",
      },
      rootCause: {
        type: "object",
        properties: {
          eventId: { type: "string", description: "ID of the root cause event." },
          description: { type: "string", description: "Description of the root cause." },
        },
        description: "Required for 'add' action.",
      },
      status: {
        type: "string",
        enum: ["active", "resolved", "interrupted"],
        description: "Current status of the chain.",
      },
      pendingConsequences: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique ID for tracking (e.g., 'conseq:1')." },
            description: { type: "string" },
            delayTurns: { type: "integer", description: "Number of turns until this consequence may trigger." },
            probability: { type: "number", description: "Probability (0-1) of triggering when delay is reached." },
            conditions: { type: "array", items: { type: "string" }, description: "Optional conditions that must be true." },
          },
        },
        description: "Future consequences that may occur. The system will auto-track createdAtTurn.",
      },
    },
    required: ["action", "chainId"],
  },
};

export const UPDATE_FACTION_TOOL = {
  name: "update_faction",
  description: "Add, update, or remove factions and power groups.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "update", "remove"],
        description: "The action to perform.",
      },
      id: {
        type: "string",
        description: "Faction ID (format: fac:N, e.g., 'fac:1'). Required for 'update' and 'remove' actions.",
      },
      name: {
        type: "string",
        description: "Faction name. Required for 'add' action.",
      },
      visible: { type: "string", description: "Public agenda/reputation." },
      hidden: { type: "string", description: "Secret agenda/corruption." },
    },
    required: ["action"],
  },
};

export const UPDATE_CHARACTER_TOOL = {
  name: "update_character",
  description: "Update character profile, attributes, skills, conditions, or hidden traits.",
  parameters: {
    type: "object",
    properties: {
      profile: {
        type: "object",
        properties: {
          status: { type: "string", description: "Current condition (e.g., 'Healthy', 'Injured')." },
          appearance: { type: "string", description: "Physical appearance description." },
          profession: { type: "string", description: "Character's profession/class." },
          background: { type: "string", description: "Character's background story." },
          race: { type: "string", description: "Character's race." },
          title: { type: "string", description: "Character's title/role." },
        },
        description: "Updates to core profile fields.",
      },
      attributes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["add", "update", "remove"] },
            name: { type: "string", description: "Attribute name (e.g., Health, Mana)." },
            value: { type: "integer", description: "New value." },
            maxValue: { type: "integer", description: "Maximum value." },
            color: { type: "string", enum: ["red", "blue", "green", "yellow", "purple", "gray"] },
          },
          required: ["action", "name"],
        },
        description: "Changes to numeric attributes.",
      },
      skills: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["add", "update", "remove"] },
            id: { type: "string", description: "Skill ID (format: skill:N)." },
            name: { type: "string", description: "Skill name." },
            level: { type: "string", description: "Skill level (e.g., Novice, Master)." },
            visible: {
              type: "object",
              properties: {
                description: { type: "string" },
                knownEffects: { type: "array", items: { type: "string" } },
              },
            },
            hidden: {
              type: "object",
              properties: {
                trueDescription: { type: "string" },
                hiddenEffects: { type: "array", items: { type: "string" } },
                drawbacks: { type: "array", items: { type: "string" } },
              },
            },
            category: { type: "string" },
            unlocked: { type: "boolean" },
          },
          required: ["action", "name"],
        },
        description: "Changes to skills.",
      },
      conditions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["add", "update", "remove"] },
            id: { type: "string", description: "Condition ID (format: cond:N)." },
            name: { type: "string", description: "Condition name." },
            type: { type: "string", enum: ["buff", "debuff", "neutral"] },
            visible: {
              type: "object",
              properties: {
                description: { type: "string" },
                perceivedSeverity: { type: "string" },
              },
            },
            hidden: {
              type: "object",
              properties: {
                trueCause: { type: "string" },
                actualSeverity: { type: "integer" },
                progression: { type: "string" },
                cure: { type: "string" },
              },
            },
            effects: {
              type: "object",
              properties: {
                visible: { type: "array", items: { type: "string" } },
                hidden: { type: "array", items: { type: "string" } },
              },
            },
            duration: { type: "integer", description: "Duration in turns." },
            unlocked: { type: "boolean" },
          },
          required: ["action", "name"],
        },
        description: "Changes to conditions (buffs/debuffs).",
      },
      hiddenTraits: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["add", "update", "remove"] },
            id: { type: "string", description: "Trait ID (format: trait:N)." },
            name: { type: "string", description: "Trait name." },
            description: { type: "string", description: "Trait description." },
            effects: { type: "array", items: { type: "string" } },
            triggerConditions: { type: "array", items: { type: "string" } },
            unlocked: { type: "boolean", description: "Whether the trait is revealed." },
          },
          required: ["action", "name"],
        },
        description: "Changes to hidden personality traits.",
      },
    },
  },
};

export const UPDATE_GLOBAL_TOOL = {
  name: "update_global",
  description: "Update global game state properties like time and environment theme.",
  parameters: {
    type: "object",
    properties: {
      time: { type: "string", description: "Update the in-game time." },
      envTheme: {
        type: "string",
        description: "Current visual atmosphere (e.g., 'Dark', 'Tense', 'Rainy').",
      },
      environment: {
        type: "string",
        enum: [
          "cave", "city", "combat", "desert", "dungeon", "forest", "horror",
          "market", "mystical", "ocean", "quiet", "rain", "scifi", "snow",
          "storm", "tavern"
        ],
        description: "Audio ambience environment.",
      },
    },
  },
};

export const FINISH_TURN_TOOL = {
  name: "finish_turn",
  description:
    "Finish the turn and generate the final narrative response. Call this ONLY when you have completed all necessary state queries and modifications.",
  parameters: {
    type: "object",
    properties: {
      narrative: {
        type: "string",
        description:
          "The final story text to present to the player. Use the defined narrative style. Write in a vivid, engaging style. Show, don't tell. Focus on sensory details and character emotions.",
      },
      choices: {
        type: "array",
        description: `2-4 options for the player's next action. CRITICAL: Choices MUST be consistent with the player character's:
1. **Knowledge/Cognition**: Only offer choices based on what the character KNOWS. If the player hasn't discovered a secret location, don't offer "Go to the hidden vault".
2. **Personality/Background**: Choices should reflect the character's personality. A shy scholar might not have "Loudly challenge the guard" as an option.
3. **Current Conditions**: If the character is injured, exhausted, or under a debuff, choices should reflect limitations. Don't offer "Sprint across the rooftops" if legs are broken.
4. **Skills & Abilities**: Offer choices that utilize the character's skills. A mage should have magic-based options; a warrior should have combat options.
5. **Hidden Traits**: If a hidden trait is unlocked, it may unlock new choice types (e.g., "Use your latent psychic powers").
DO NOT include meta-knowledge that only the player (not the character) would know.`,
        items: { type: "string" },
      },
      imagePrompt: {
        type: "string",
        description:
          "Optional prompt for generating an image of the current scene.",
      },
      generateImage: {
        type: "boolean",
        description: "Whether to generate an image for this turn.",
      },
      environment: {
        type: "string",
        enum: [
          "cave", "city", "combat", "desert", "dungeon", "forest", "horror",
          "market", "mystical", "ocean", "quiet", "rain", "scifi", "snow",
          "storm", "tavern"
        ],
        description: "The audio ambience for this scene.",
      },
      narrativeTone: {
        type: "string",
        description: "The tone of the narrative (e.g., 'suspenseful', 'cheerful', 'melancholy').",
      },
      aliveEntities: {
        type: "object",
        description: "IDs of entities that are DIRECTLY RELEVANT to the next turn and should be pre-loaded in context. Only include entities that will LIKELY be referenced again immediately.",
        properties: {
          inventory: { type: "array", items: { type: "string" }, description: "Item IDs (inv:N) relevant for next turn." },
          relationships: { type: "array", items: { type: "string" }, description: "NPC IDs (npc:N) relevant for next turn." },
          locations: { type: "array", items: { type: "string" }, description: "Location IDs (loc:N) relevant for next turn." },
          quests: { type: "array", items: { type: "string" }, description: "Quest IDs (quest:N) relevant for next turn." },
          knowledge: { type: "array", items: { type: "string" }, description: "Knowledge IDs (know:N) relevant for next turn." },
          timeline: { type: "array", items: { type: "string" }, description: "Event IDs (evt:N) relevant for next turn." },
          skills: { type: "array", items: { type: "string" }, description: "Character skill IDs relevant for next turn." },
          conditions: { type: "array", items: { type: "string" }, description: "Character condition IDs relevant for next turn." },
          hiddenTraits: { type: "array", items: { type: "string" }, description: "Character hidden trait IDs relevant for next turn." },
          causalChains: { type: "array", items: { type: "string" }, description: "CausalChain chainIds with pending consequences that may trigger soon." },
        },
      },
    },
    required: ["narrative", "choices"],
  },
};

export const TOOLS = [
  // Query Tools
  QUERY_INVENTORY_TOOL,
  QUERY_RELATIONSHIPS_TOOL,
  QUERY_LOCATIONS_TOOL,
  QUERY_QUESTS_TOOL,
  QUERY_KNOWLEDGE_TOOL,
  QUERY_TIMELINE_TOOL,
  QUERY_CAUSAL_CHAIN_TOOL,
  QUERY_FACTIONS_TOOL,
  QUERY_GLOBAL_TOOL,
  QUERY_CHARACTER_TOOL,
  // Update Tools
  UPDATE_INVENTORY_TOOL,
  UPDATE_RELATIONSHIP_TOOL,
  UPDATE_LOCATION_TOOL,
  UPDATE_QUEST_TOOL,
  UPDATE_KNOWLEDGE_TOOL,
  UPDATE_TIMELINE_TOOL,
  UPDATE_CAUSAL_CHAIN_TOOL,
  UPDATE_FACTION_TOOL,
  UPDATE_CHARACTER_TOOL,
  UPDATE_GLOBAL_TOOL,
  // Turn Control
  FINISH_TURN_TOOL,
];
