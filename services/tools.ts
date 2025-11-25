import {
  inventoryItemProperties,
  relationshipProperties,
  locationProperties,
  questProperties,
  knowledgeProperties,
  timelineEventProperties,
  causalChainProperties,
  factionProperties,
} from "./schemas";

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
          "Name, ID (inv:1), or keyword to search for. If omitted, lists all items.",
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
          "Name, ID (npc:1), or keyword to search for. If omitted, lists all known NPCs.",
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
          "Name, ID (loc:1), or keyword to search for. If omitted, lists all known locations.",
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
          "Title, ID (quest:1), or keyword to search for. If omitted, lists all quests matching the status.",
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
          "Title, ID (know:1), or keyword to search for. If omitted, lists all knowledge.",
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
          "Keyword, ID, or category to search for. If omitted, lists recent events.",
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
        description: "Keyword or Chain ID.",
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
        description: "Name or keyword.",
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
      },
      data: {
        type: "object",
        description: "Item data. Must include 'name' or 'id'.",
        properties: {
          id: { type: "string", description: "Format: inv:1" },
          ...inventoryItemProperties,
          unlocked: { type: "boolean" },
        },
        required: ["name"],
      },
    },
    required: ["action", "data"],
  },
};

export const UPDATE_RELATIONSHIP_TOOL = {
  name: "update_relationship",
  description: "Add or update NPC relationships.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "update", "remove"],
      },
      data: {
        type: "object",
        description: "NPC data. Must include 'name' or 'id'.",
        properties: {
          id: { type: "string", description: "Format: npc:1" },
          ...relationshipProperties,
          known: { type: "boolean" },
          unlocked: { type: "boolean" },
        },
        required: ["name"],
      },
    },
    required: ["action", "data"],
  },
};

export const UPDATE_LOCATION_TOOL = {
  name: "update_location",
  description: "Update location details or add new locations.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "update"],
      },
      data: {
        type: "object",
        description: "Location data. Must include 'name' or 'id'.",
        properties: {
          id: { type: "string", description: "Format: loc:1" },
          ...locationProperties,
          isCurrent: {
            type: "boolean",
            description: "Set to true if player moves here.",
          },
          isVisited: { type: "boolean" },
        },
        required: ["name"],
      },
    },
    required: ["action", "data"],
  },
};

export const UPDATE_QUEST_TOOL = {
  name: "update_quest",
  description: "Add or update quests.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "update"],
      },
      data: {
        type: "object",
        description: "Quest data. Must include 'title' or 'id'.",
        properties: {
          id: { type: "string", description: "Format: quest:1" },
          ...questProperties,
          status: { type: "string", enum: ["active", "completed", "failed"] },
        },
        required: ["title"],
      },
    },
    required: ["action", "data"],
  },
};

export const UPDATE_KNOWLEDGE_TOOL = {
  name: "update_knowledge",
  description: "Add or update knowledge entries.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "update"],
      },
      data: {
        type: "object",
        description: "Knowledge data. Must include 'title' or 'id'.",
        properties: {
          id: { type: "string", description: "Format: know:1" },
          ...knowledgeProperties,
        },
        required: ["title"],
      },
    },
    required: ["action", "data"],
  },
};

export const UPDATE_TIMELINE_TOOL = {
  name: "update_timeline",
  description:
    "Add or update timeline events (World Events, NPC Actions, Consequences).",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "update"],
      },
      data: {
        type: "object",
        description:
          "Event data. Must include 'id' (for update) or be a new event.",
        properties: {
          ...timelineEventProperties,
        },
        required: ["visible"],
      },
    },
    required: ["action", "data"],
  },
};

export const UPDATE_CAUSAL_CHAIN_TOOL = {
  name: "update_causal_chain",
  description:
    "Create or update causal chains to track long-term consequences.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "update", "resolve"],
      },
      data: {
        type: "object",
        properties: {
          ...causalChainProperties,
        },
        required: ["chainId"],
      },
    },
    required: ["action", "data"],
  },
};

export const UPDATE_FACTION_TOOL = {
  name: "update_faction",
  description: "Update faction status, influence, or details.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "update"],
      },
      data: {
        type: "object",
        properties: {
          ...factionProperties,
        },
        required: ["name"],
      },
    },
    required: ["action", "data"],
  },
};

export const UPDATE_GLOBAL_TOOL = {
  name: "update_global",
  description: "Update global game state properties.",
  parameters: {
    type: "object",
    properties: {
      data: {
        type: "object",
        properties: {
          time: { type: "string" },
          envTheme: {
            type: "string",
            description: "Current atmosphere (e.g. 'Tense', 'Rainy')",
          },
          // Removed 'theme' and 'isImageGenerating' as they are not modifiable by AI
        },
      },
    },
    required: ["data"],
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
        description: "2-4 options for the player's next action.",
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
    },
    required: ["narrative", "choices"],
  },
};

export const TOOLS = [
  QUERY_INVENTORY_TOOL,
  QUERY_RELATIONSHIPS_TOOL,
  QUERY_LOCATIONS_TOOL,
  QUERY_QUESTS_TOOL,
  QUERY_KNOWLEDGE_TOOL,
  QUERY_TIMELINE_TOOL,
  QUERY_CAUSAL_CHAIN_TOOL,
  QUERY_FACTIONS_TOOL,
  QUERY_GLOBAL_TOOL,
  UPDATE_INVENTORY_TOOL,
  UPDATE_RELATIONSHIP_TOOL,
  UPDATE_LOCATION_TOOL,
  UPDATE_QUEST_TOOL,
  UPDATE_KNOWLEDGE_TOOL,
  UPDATE_TIMELINE_TOOL,
  UPDATE_CAUSAL_CHAIN_TOOL,
  UPDATE_FACTION_TOOL,
  UPDATE_GLOBAL_TOOL,
  FINISH_TURN_TOOL,
];
