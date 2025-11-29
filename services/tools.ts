/**
 * ============================================================================
 * Tool Definitions - 使用 Zod Schema 定义 AI 工具
 * ============================================================================
 *
 * 所有工具参数使用 Zod schema 定义，通过 zodCompiler 编译为各 Provider 格式。
 *
 * --- ID Format Documentation ---
 * All entities in the game use a standardized ID format: "{prefix}:{number}"
 * - Inventory Items: "inv:{N}" (e.g., "inv:1", "inv:42")
 * - NPCs/Relationships: "npc:{N}" (e.g., "npc:1", "npc:15")
 * - Locations: "loc:{N}" (e.g., "loc:1", "loc:7")
 * - Quests: "quest:{N}" (e.g., "quest:1", "quest:3")
 * - Knowledge Entries: "know:{N}" (e.g., "know:1", "know:12")
 * - Factions: "fac:{N}" (e.g., "fac:1", "fac:5")
 * - Timeline Events: "evt:{N}" (e.g., "evt:1", "evt:100")
 * - Causal Chains: "chain:{N}" (e.g., "chain:1", "chain:8")
 * - Character Skills: "skill:{N}" (e.g., "skill:1", "skill:5")
 * - Character Conditions: "cond:{N}" (e.g., "cond:1", "cond:3")
 * - Hidden Traits: "trait:{N}" (e.g., "trait:1", "trait:2")
 */

import { z } from "zod";
import type { ZodToolDefinition } from "./providers/types";
import {
  atmosphereSchema,
  inventoryItemVisibleSchema,
  inventoryItemHiddenSchema,
  relationshipVisibleSchema,
  relationshipHiddenSchema,
  locationVisibleSchema,
  locationHiddenSchema,
  questVisibleSchema,
  questHiddenSchema,
  questTypeSchema,
  knowledgeVisibleSchema,
  knowledgeHiddenSchema,
  knowledgeCategorySchema,
  timelineEventVisibleSchema,
  timelineEventHiddenSchema,
  timelineEventCategorySchema,
  skillVisibleSchema,
  skillHiddenSchema,
  conditionVisibleSchema,
  conditionHiddenSchema,
  conditionTypeSchema,
  attributeColorSchema,
  factionMemberSchema,
  factionRelationSchema,
  causalChainStatusSchema,
  finishTurnSchema,
  forceUpdateSchema,
} from "./zodSchemas";

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
export const parseEntityId = (
  id: string,
): { type: string; num: number } | null => {
  const match = id.match(/^([a-z]+):(\d+)$/);
  if (!match) return null;
  return { type: match[1], num: parseInt(match[2], 10) };
};

// ============================================================================
// Query Tools - 使用 Zod Schema 定义参数
// ============================================================================

export const QUERY_INVENTORY_TOOL: ZodToolDefinition = {
  name: "query_inventory",
  description:
    "Check what the player is carrying. Use this to verify if they have the necessary tools, weapons, or items for an action, or to describe their equipment.",
  parameters: z.object({
    query: z
      .string()
      .optional()
      .describe(
        "Name, ID (format: inv:N), or keyword. If omitted, lists all items.",
      ),
  }),
};

export const QUERY_RELATIONSHIPS_TOOL: ZodToolDefinition = {
  name: "query_relationships",
  description:
    "Recall details about NPCs the player has met. Use this to check their current status, location, personality, or past interactions before generating dialogue.",
  parameters: z.object({
    query: z
      .string()
      .optional()
      .describe(
        "Name, ID (format: npc:N), or keyword. If omitted, lists all known NPCs.",
      ),
  }),
};

export const QUERY_LOCATIONS_TOOL: ZodToolDefinition = {
  name: "query_locations",
  description:
    "Recall details about known locations. Use this to describe the environment, check for connected paths, or remember past events in a specific place.",
  parameters: z.object({
    query: z
      .string()
      .optional()
      .describe(
        "Name, ID (format: loc:N), or keyword. If omitted, lists all known locations.",
      ),
  }),
};

export const QUERY_QUESTS_TOOL: ZodToolDefinition = {
  name: "query_quests",
  description:
    "Query active and completed quests. Returns a list of quests matching the query.",
  parameters: z.object({
    query: z
      .string()
      .optional()
      .describe(
        "Title, ID (format: quest:N, e.g., 'quest:1'), or keyword to search for. If omitted, lists all quests matching the status.",
      ),
    status: z
      .enum(["active", "completed", "failed", "all"])
      .optional()
      .describe("Filter by quest status. Defaults to 'active'."),
  }),
};

export const QUERY_KNOWLEDGE_TOOL: ZodToolDefinition = {
  name: "query_knowledge",
  description:
    "Query the player's accumulated knowledge/lore. Returns a list of entries matching the query.",
  parameters: z.object({
    query: z
      .string()
      .optional()
      .describe(
        "Title, ID (format: know:N, e.g., 'know:1'), or keyword to search for. If omitted, lists all knowledge.",
      ),
    category: knowledgeCategorySchema
      .optional()
      .describe("Filter by category."),
  }),
};

export const QUERY_TIMELINE_TOOL: ZodToolDefinition = {
  name: "query_timeline",
  description:
    "Query the world timeline and history. Returns a list of events matching the query.",
  parameters: z.object({
    query: z
      .string()
      .optional()
      .describe(
        "Keyword, ID (format: evt:N, e.g., 'evt:1'), or category to search for. If omitted, lists recent events.",
      ),
  }),
};

export const QUERY_CAUSAL_CHAIN_TOOL: ZodToolDefinition = {
  name: "query_causal_chain",
  description: "Query active causal chains (cause-and-effect sequences).",
  parameters: z.object({
    query: z
      .string()
      .optional()
      .describe("Keyword or Chain ID (format: chain:N, e.g., 'chain:1')."),
  }),
};

export const QUERY_FACTIONS_TOOL: ZodToolDefinition = {
  name: "query_factions",
  description: "Query major factions and power groups.",
  parameters: z.object({
    query: z
      .string()
      .optional()
      .describe("Name, ID (format: fac:N, e.g., 'fac:1'), or keyword."),
  }),
};

export const QUERY_GLOBAL_TOOL: ZodToolDefinition = {
  name: "query_global",
  description:
    "Query global game state properties like time, theme, environment, etc.",
  parameters: z.object({
    category: z
      .enum(["time", "theme", "environment", "all"])
      .describe("The category of global state to retrieve."),
  }),
};

export const QUERY_CHARACTER_TOOL: ZodToolDefinition = {
  name: "query_character",
  description:
    "Query the player character's status, attributes, skills, conditions, and hidden traits.",
  parameters: z.object({
    aspect: z
      .enum([
        "all",
        "profile",
        "attributes",
        "skills",
        "conditions",
        "hiddenTraits",
      ])
      .optional()
      .describe("The aspect of the character to query. Defaults to 'all'."),
    query: z
      .string()
      .optional()
      .describe(
        "For skills/conditions/traits: Name or ID (skill:N, cond:N, trait:N) to search for specific items.",
      ),
  }),
};

// ============================================================================
// Update Tools - 使用 Zod Schema 定义参数
// ============================================================================
// IMPORTANT: For all update tools, to REMOVE an optional property, set its value to null.
// Example: To remove an NPC's notes, set notes: null
// Example: To remove a skill's level, set level: null
// The system will delete these properties from the entity when it sees null values.

export const UPDATE_INVENTORY_TOOL: ZodToolDefinition = {
  name: "update_inventory",
  description: `Modify the player's inventory. Use this when the player finds, buys, uses, breaks, or loses an item.
IMPORTANT: To REMOVE an optional property (like clearing lore), set it to null.`,
  parameters: z.discriminatedUnion("action", [
    // Add action - id is optional (auto-generated if not provided)
    z.object({
      action: z.literal("add"),
      id: z
        .string()
        .optional()
        .describe(
          "Item ID (format: inv:N). Optional for 'add' - will be auto-generated if not provided.",
        ),
      name: z.string().describe("Item name. Required for 'add' action."),
      visible: inventoryItemVisibleSchema.partial().optional(),
      hidden: inventoryItemHiddenSchema.partial().optional(),
      lore: z
        .string()
        .optional()
        .describe("Brief lore or history of the item."),
      unlocked: z
        .boolean()
        .optional()
        .describe("Whether the hidden truth is revealed to the player."),
    }),
    // Update action - id is required
    z.object({
      action: z.literal("update"),
      id: z
        .string()
        .describe("Item ID (format: inv:N, e.g., 'inv:1'). Required."),
      name: z.string().optional().describe("Updated item name."),
      visible: inventoryItemVisibleSchema.partial().optional(),
      hidden: inventoryItemHiddenSchema.partial().optional(),
      lore: z
        .string()
        .optional()
        .describe("Brief lore or history of the item."),
      unlocked: z
        .boolean()
        .optional()
        .describe("Whether the hidden truth is revealed to the player."),
    }),
    // Remove action - id is required
    z.object({
      action: z.literal("remove"),
      id: z
        .string()
        .describe("Item ID (format: inv:N, e.g., 'inv:1'). Required."),
    }),
  ]),
};

export const UPDATE_RELATIONSHIP_TOOL: ZodToolDefinition = {
  name: "update_relationship",
  description: `Modify an NPC's state. Use this when the player's actions change an NPC's opinion, location, or physical condition.
CRITICAL: Update 'notes' to record how the NPC perceives the player's behavior (e.g., "Suspicious of player's magic").
IMPORTANT: To REMOVE an optional property, set it to null.`,
  parameters: z.discriminatedUnion("action", [
    // Add action - id is optional
    z.object({
      action: z.literal("add"),
      id: z
        .string()
        .optional()
        .describe(
          "NPC ID (format: npc:N). Optional for 'add' - will be auto-generated.",
        ),
      name: z.string().describe("NPC name. Required for 'add' action."),
      currentLocation: z
        .string()
        .optional()
        .describe("NPC's current location ID (e.g., 'loc:1')."),
      known: z
        .boolean()
        .optional()
        .describe("Whether the player knows this character."),
      visible: relationshipVisibleSchema.partial().optional(),
      hidden: relationshipHiddenSchema.partial().optional(),
      notes: z
        .string()
        .optional()
        .describe("NPC's observations of player's behavior."),
      unlocked: z
        .boolean()
        .optional()
        .describe("Whether hidden info is revealed."),
    }),
    // Update action - id is required
    z.object({
      action: z.literal("update"),
      id: z
        .string()
        .describe("NPC ID (format: npc:N, e.g., 'npc:1'). Required."),
      name: z.string().optional().describe("Updated NPC name."),
      currentLocation: z
        .string()
        .optional()
        .describe(
          "NPC's current location ID (e.g., 'loc:1'). Update when NPC moves.",
        ),
      known: z
        .boolean()
        .optional()
        .describe("Whether the player knows this character."),
      visible: relationshipVisibleSchema.partial().optional(),
      hidden: relationshipHiddenSchema.partial().optional(),
      notes: z
        .string()
        .optional()
        .describe("NPC's observations of player's behavior."),
      unlocked: z
        .boolean()
        .optional()
        .describe("Whether hidden info is revealed."),
    }),
    // Remove action - id is required
    z.object({
      action: z.literal("remove"),
      id: z
        .string()
        .describe("NPC ID (format: npc:N, e.g., 'npc:1'). Required."),
    }),
  ]),
};

export const UPDATE_LOCATION_TOOL: ZodToolDefinition = {
  name: "update_location",
  description: `Update the world map. Use this when the player discovers a new place, moves to a new area, or when the environment changes (e.g., "The bridge collapses").
IMPORTANT: To REMOVE an optional property, set it to null.`,
  parameters: z.discriminatedUnion("action", [
    // Add action - id is optional
    z.object({
      action: z.literal("add"),
      id: z
        .string()
        .optional()
        .describe(
          "Location ID (format: loc:N). Optional for 'add' - will be auto-generated.",
        ),
      name: z.string().describe("Location name. Required for 'add' action."),
      visible: locationVisibleSchema.partial().optional(),
      hidden: locationHiddenSchema.partial().optional(),
      environment: z
        .string()
        .optional()
        .describe("Atmosphere/Environment tag."),
      isCurrent: z
        .boolean()
        .optional()
        .describe("Set to true if player moves here."),
      isVisited: z
        .boolean()
        .optional()
        .describe("Whether the location has been visited."),
      unlocked: z
        .boolean()
        .optional()
        .describe("Whether hidden secrets are discovered."),
    }),
    // Update action - id is required
    z.object({
      action: z.literal("update"),
      id: z
        .string()
        .describe("Location ID (format: loc:N, e.g., 'loc:1'). Required."),
      name: z.string().optional().describe("Updated location name."),
      visible: locationVisibleSchema.partial().optional(),
      hidden: locationHiddenSchema.partial().optional(),
      environment: z
        .string()
        .optional()
        .describe("Atmosphere/Environment tag."),
      isCurrent: z
        .boolean()
        .optional()
        .describe("Set to true if player moves here."),
      isVisited: z
        .boolean()
        .optional()
        .describe("Whether the location has been visited."),
      unlocked: z
        .boolean()
        .optional()
        .describe("Whether hidden secrets are discovered."),
    }),
    // Remove action - id is required
    z.object({
      action: z.literal("remove"),
      id: z
        .string()
        .describe("Location ID (format: loc:N, e.g., 'loc:1'). Required."),
    }),
  ]),
};

export const UPDATE_QUEST_TOOL: ZodToolDefinition = {
  name: "update_quest",
  description: "Add, update, complete, fail, or remove quests.",
  parameters: z.discriminatedUnion("action", [
    // Add action - id is optional
    z.object({
      action: z.literal("add"),
      id: z
        .string()
        .optional()
        .describe(
          "Quest ID (format: quest:N). Optional for 'add' - will be auto-generated.",
        ),
      title: z.string().describe("Quest title. Required for 'add' action."),
      type: questTypeSchema.optional().describe("Quest type."),
      visible: questVisibleSchema.partial().optional(),
      hidden: questHiddenSchema.partial().optional(),
      unlocked: z
        .boolean()
        .optional()
        .describe("Whether true objectives are revealed."),
    }),
    // Update action - id is required
    z.object({
      action: z.literal("update"),
      id: z
        .string()
        .describe("Quest ID (format: quest:N, e.g., 'quest:1'). Required."),
      title: z.string().optional().describe("Updated quest title."),
      type: questTypeSchema.optional().describe("Quest type."),
      visible: questVisibleSchema.partial().optional(),
      hidden: questHiddenSchema.partial().optional(),
      unlocked: z
        .boolean()
        .optional()
        .describe("Whether true objectives are revealed."),
    }),
    // Complete action - id is required
    z.object({
      action: z.literal("complete"),
      id: z
        .string()
        .describe("Quest ID (format: quest:N, e.g., 'quest:1'). Required."),
    }),
    // Fail action - id is required
    z.object({
      action: z.literal("fail"),
      id: z
        .string()
        .describe("Quest ID (format: quest:N, e.g., 'quest:1'). Required."),
    }),
    // Remove action - id is required
    z.object({
      action: z.literal("remove"),
      id: z
        .string()
        .describe("Quest ID (format: quest:N, e.g., 'quest:1'). Required."),
    }),
  ]),
};

export const UPDATE_KNOWLEDGE_TOOL: ZodToolDefinition = {
  name: "update_knowledge",
  description:
    "Add or update knowledge entries. Knowledge can only be added or updated, never removed.",
  parameters: z.discriminatedUnion("action", [
    // Add action - id is optional
    z.object({
      action: z.literal("add"),
      id: z
        .string()
        .optional()
        .describe(
          "Knowledge ID (format: know:N). Optional for 'add' - will be auto-generated.",
        ),
      title: z
        .string()
        .describe("Title of the knowledge entry. Required for 'add' action."),
      category: knowledgeCategorySchema
        .optional()
        .describe("Category of knowledge."),
      visible: knowledgeVisibleSchema.partial().optional(),
      hidden: knowledgeHiddenSchema.partial().optional(),
      discoveredAt: z
        .string()
        .optional()
        .describe("When this knowledge was discovered."),
      relatedTo: z.array(z.string()).optional().describe("Related entity IDs."),
      unlocked: z
        .boolean()
        .optional()
        .describe("Whether full truth is revealed."),
    }),
    // Update action - id is required
    z.object({
      action: z.literal("update"),
      id: z
        .string()
        .describe("Knowledge ID (format: know:N, e.g., 'know:1'). Required."),
      title: z.string().optional().describe("Updated title."),
      category: knowledgeCategorySchema
        .optional()
        .describe("Category of knowledge."),
      visible: knowledgeVisibleSchema.partial().optional(),
      hidden: knowledgeHiddenSchema.partial().optional(),
      discoveredAt: z
        .string()
        .optional()
        .describe("When this knowledge was discovered."),
      relatedTo: z.array(z.string()).optional().describe("Related entity IDs."),
      unlocked: z
        .boolean()
        .optional()
        .describe("Whether full truth is revealed."),
    }),
  ]),
};

export const UPDATE_TIMELINE_TOOL: ZodToolDefinition = {
  name: "update_timeline",
  description:
    "Add or update timeline events (World Events, NPC Actions, Consequences).",
  parameters: z.discriminatedUnion("action", [
    // Add action - id is optional
    z.object({
      action: z.literal("add"),
      id: z
        .string()
        .optional()
        .describe(
          "Event ID (format: evt:N). Optional for 'add' - will be auto-generated.",
        ),
      gameTime: z
        .string()
        .optional()
        .describe("When the event happened in game time."),
      category: timelineEventCategorySchema
        .optional()
        .describe("Category of the event."),
      visible: timelineEventVisibleSchema.optional(),
      hidden: timelineEventHiddenSchema.optional(),
      involvedEntities: z
        .array(z.string())
        .optional()
        .describe("IDs of involved entities."),
      chainId: z
        .string()
        .optional()
        .describe("Link to a CausalChain (format: chain:N)."),
      known: z
        .boolean()
        .optional()
        .describe("Whether the player knows about this event."),
      unlocked: z
        .boolean()
        .optional()
        .describe("Whether true cause is revealed."),
    }),
    // Update action - id is required
    z.object({
      action: z.literal("update"),
      id: z
        .string()
        .describe("Event ID (format: evt:N, e.g., 'evt:1'). Required."),
      gameTime: z
        .string()
        .optional()
        .describe("When the event happened in game time."),
      category: timelineEventCategorySchema
        .optional()
        .describe("Category of the event."),
      visible: timelineEventVisibleSchema.optional(),
      hidden: timelineEventHiddenSchema.optional(),
      involvedEntities: z
        .array(z.string())
        .optional()
        .describe("IDs of involved entities."),
      chainId: z
        .string()
        .optional()
        .describe("Link to a CausalChain (format: chain:N)."),
      known: z
        .boolean()
        .optional()
        .describe("Whether the player knows about this event."),
      unlocked: z
        .boolean()
        .optional()
        .describe("Whether true cause is revealed."),
    }),
  ]),
};

export const UPDATE_CAUSAL_CHAIN_TOOL: ZodToolDefinition = {
  name: "update_causal_chain",
  description: `Create, update, resolve, or trigger causal chains.
IMPORTANT: The AI (you) decides WHEN consequences occur based on story context.
- Use 'add' to create a new chain with potential future consequences
- Use 'trigger' to make a pending consequence happen NOW (narrate it in your response)
- Use 'resolve' when a chain's story arc is complete
- Use 'interrupt' when circumstances prevent the chain from continuing`,
  parameters: z.object({
    action: z
      .enum(["add", "update", "resolve", "interrupt", "trigger"])
      .describe(
        "The action. Use 'trigger' when YOU decide a pending consequence should happen NOW.",
      ),
    chainId: z
      .string()
      .describe(
        "Chain ID (format: chain:N, e.g., 'chain:1'). Required for all actions.",
      ),
    rootCause: z
      .object({
        eventId: z.string().describe("ID of the root cause event."),
        description: z.string().describe("Description of the root cause."),
      })
      .optional()
      .describe("Required for 'add' action."),
    status: causalChainStatusSchema
      .optional()
      .describe("Current status of the chain."),
    pendingConsequences: z
      .array(
        z.object({
          id: z.string().describe("Unique ID for tracking (e.g., 'conseq:1')."),
          description: z.string().describe("What could happen if triggered."),
          readyAfterTurn: z
            .number()
            .int()
            .describe(
              "The consequence CAN'T trigger UNTIL after this turn number. Use current turn + delay.",
            ),
          conditions: z
            .array(z.string())
            .optional()
            .describe(
              "Narrative conditions you'll check when deciding to trigger.",
            ),
          known: z
            .boolean()
            .optional()
            .describe(
              "Will the player know when this happens? Default false for hidden consequences.",
            ),
        }),
      )
      .optional()
      .describe(
        "Future consequences. YOU decide when to trigger them based on story.",
      ),
    triggerConsequenceId: z
      .string()
      .optional()
      .describe(
        "For 'trigger' action: the ID of the pending consequence to trigger NOW. You MUST narrate this in your response.",
      ),
  }),
};

export const UPDATE_FACTION_TOOL: ZodToolDefinition = {
  name: "update_faction",
  description: "Add, update, or remove factions and power groups.",
  parameters: z.discriminatedUnion("action", [
    // Add action - id is optional
    z.object({
      action: z.literal("add"),
      id: z
        .string()
        .optional()
        .describe(
          "Faction ID (format: fac:N). Optional for 'add' - will be auto-generated.",
        ),
      name: z.string().describe("Faction name. Required for 'add' action."),
      visible: z
        .object({
          agenda: z.string().optional().describe("Public agenda/reputation."),
          members: z
            .array(factionMemberSchema)
            .optional()
            .describe("Publicly known members."),
          influence: z
            .string()
            .optional()
            .describe("Perceived influence description."),
          relations: z
            .array(factionRelationSchema)
            .optional()
            .describe("Public alliances/rivalries."),
        })
        .optional()
        .describe("Publicly known information."),
      hidden: z
        .object({
          agenda: z.string().optional().describe("Secret agenda/corruption."),
          members: z
            .array(factionMemberSchema)
            .optional()
            .describe("Secret members/leaders."),
          influence: z
            .string()
            .optional()
            .describe("True influence description."),
          relations: z
            .array(factionRelationSchema)
            .optional()
            .describe("Secret alliances/rivalries."),
        })
        .optional()
        .describe("Secret information (GM knowledge)."),
      unlocked: z
        .boolean()
        .optional()
        .describe("Whether hidden agenda is revealed."),
    }),
    // Update action - id is required
    z.object({
      action: z.literal("update"),
      id: z
        .string()
        .describe("Faction ID (format: fac:N, e.g., 'fac:1'). Required."),
      name: z.string().optional().describe("Updated faction name."),
      visible: z
        .object({
          agenda: z.string().optional().describe("Public agenda/reputation."),
          members: z
            .array(factionMemberSchema)
            .optional()
            .describe("Publicly known members."),
          influence: z
            .string()
            .optional()
            .describe("Perceived influence description."),
          relations: z
            .array(factionRelationSchema)
            .optional()
            .describe("Public alliances/rivalries."),
        })
        .optional()
        .describe("Publicly known information."),
      hidden: z
        .object({
          agenda: z.string().optional().describe("Secret agenda/corruption."),
          members: z
            .array(factionMemberSchema)
            .optional()
            .describe("Secret members/leaders."),
          influence: z
            .string()
            .optional()
            .describe("True influence description."),
          relations: z
            .array(factionRelationSchema)
            .optional()
            .describe("Secret alliances/rivalries."),
        })
        .optional()
        .describe("Secret information (GM knowledge)."),
      unlocked: z
        .boolean()
        .optional()
        .describe("Whether hidden agenda is revealed."),
    }),
    // Remove action - id is required
    z.object({
      action: z.literal("remove"),
      id: z
        .string()
        .describe("Faction ID (format: fac:N, e.g., 'fac:1'). Required."),
    }),
  ]),
};

export const UPDATE_WORLD_INFO_TOOL: ZodToolDefinition = {
  name: "update_world_info",
  description: `Update world-level information visibility. Use this to reveal hidden world secrets, story outlines, and main plot twists to the player.
IMPORTANT: Only unlock world info when the player achieves significant story milestones:
- Discovers a major truth about the world
- Uncovers the main antagonist's true plan
- Reaches a pivotal story moment
- Achieves a quest that reveals world secrets`,
  parameters: z.object({
    unlockWorldSetting: z
      .boolean()
      .optional()
      .describe(
        "Set to true to reveal the hidden world setting information (worldSetting.hidden) to the player.",
      ),
    unlockMainGoal: z
      .boolean()
      .optional()
      .describe(
        "Set to true to reveal the hidden main goal information (mainGoal.hidden) - the true nature of the story's main objective.",
      ),
    reason: z
      .string()
      .describe(
        "Brief explanation of WHY this information is being revealed (for logging).",
      ),
  }),
};

export const UPDATE_CHARACTER_TOOL: ZodToolDefinition = {
  name: "update_character",
  description:
    "Update character profile, attributes, skills, conditions, or hidden traits.",
  parameters: z.object({
    profile: z
      .object({
        status: z
          .string()
          .optional()
          .describe("Current condition (e.g., 'Healthy', 'Injured')."),
        appearance: z
          .string()
          .optional()
          .describe("Physical appearance description."),
        profession: z
          .string()
          .optional()
          .describe("Character's profession/class."),
        background: z
          .string()
          .optional()
          .describe("Character's background story."),
        race: z.string().optional().describe("Character's race."),
        title: z.string().optional().describe("Character's title/role."),
      })
      .optional()
      .describe("Updates to core profile fields."),
    attributes: z
      .array(
        z.object({
          action: z.enum(["add", "update", "remove"]),
          name: z.string().describe("Attribute name (e.g., Health, Mana)."),
          value: z.number().int().optional().describe("New value."),
          maxValue: z.number().int().optional().describe("Maximum value."),
          color: attributeColorSchema.optional(),
        }),
      )
      .optional()
      .describe("Changes to numeric attributes."),
    skills: z
      .array(
        z.object({
          action: z.enum(["add", "update", "remove"]),
          id: z.string().optional().describe("Skill ID (format: skill:N)."),
          name: z.string().describe("Skill name."),
          level: z
            .string()
            .optional()
            .describe("Skill level (e.g., Novice, Master)."),
          visible: skillVisibleSchema.partial().optional(),
          hidden: skillHiddenSchema.partial().optional(),
          category: z.string().optional(),
          unlocked: z.boolean().optional(),
        }),
      )
      .optional()
      .describe("Changes to skills."),
    conditions: z
      .array(
        z.object({
          action: z.enum(["add", "update", "remove"]),
          id: z.string().optional().describe("Condition ID (format: cond:N)."),
          name: z.string().describe("Condition name."),
          type: conditionTypeSchema.optional(),
          visible: conditionVisibleSchema.partial().optional(),
          hidden: conditionHiddenSchema.partial().optional(),
          effects: z
            .object({
              visible: z.array(z.string()).optional(),
              hidden: z.array(z.string()).optional(),
            })
            .optional(),
          duration: z.number().int().optional().describe("Duration in turns."),
          unlocked: z.boolean().optional(),
        }),
      )
      .optional()
      .describe("Changes to conditions (buffs/debuffs)."),
    hiddenTraits: z
      .array(
        z.object({
          action: z.enum(["add", "update", "remove"]),
          id: z.string().optional().describe("Trait ID (format: trait:N)."),
          name: z.string().describe("Trait name."),
          description: z.string().optional().describe("Trait description."),
          effects: z.array(z.string()).optional(),
          triggerConditions: z.array(z.string()).optional(),
          unlocked: z
            .boolean()
            .optional()
            .describe("Whether the trait is revealed."),
        }),
      )
      .optional()
      .describe("Changes to hidden personality traits."),
  }),
};

export const UPDATE_GLOBAL_TOOL: ZodToolDefinition = {
  name: "update_global",
  description: "Update global game state properties like time and atmosphere.",
  parameters: z.object({
    time: z.string().optional().describe("Update the in-game time."),
    atmosphere: atmosphereSchema
      .optional()
      .describe(
        "Atmosphere settings with envTheme (visual) and ambience (audio).",
      ),
  }),
};

// ============================================================================
// RAG and Control Tools - 使用 Zod Schema 定义参数
// ============================================================================

export const RAG_SEARCH_TOOL: ZodToolDefinition = {
  name: "rag_search",
  description: `Perform a semantic search across the game world to retrieve relevant context. Use this when you need to recall information that might be relevant to the current situation but is not immediately in context. This searches through:
- Story history (past events and narratives)
- NPCs (visible AND hidden information)
- Locations (including undiscovered secrets)
- Items (including hidden properties)
- Knowledge/Lore entries
- Quest information
- Timeline events

The search returns both visible player knowledge and [AI_ONLY] hidden information to help maintain world consistency.

IMPORTANT: RAG may return results from:
1. **Different timeline forks** - Content from alternative story branches the player explored before
2. **Future events** - If the player forked from a later point to an earlier one, you may see "future" events

Use the filtering options to control search scope:
- \`currentForkOnly\`: Only search within the current timeline branch (excludes other forks)
- \`beforeCurrentTurn\`: Only search content from before the current turn (excludes "future" events)`,
  parameters: z.object({
    query: z
      .string()
      .describe(
        "Natural language search query. Be specific about what you're looking for. Examples: 'NPCs who know about the ancient prophecy', 'locations with hidden magical artifacts', 'events involving the fallen kingdom'",
      ),
    types: z
      .array(
        z.enum([
          "story",
          "npc",
          "location",
          "item",
          "knowledge",
          "quest",
          "event",
        ]),
      )
      .optional()
      .describe("Optional: Filter results to specific entity types."),
    topK: z
      .number()
      .optional()
      .describe("Maximum number of results to return. Default is 5."),
    currentForkOnly: z
      .boolean()
      .optional()
      .describe(
        "If true, only return results from the current timeline branch and its ancestors. Excludes content from other fork branches. Default is false (searches all forks).",
      ),
    beforeCurrentTurn: z
      .boolean()
      .optional()
      .describe(
        "If true, only return results from before the current turn number. Useful to exclude 'future' content when player forked from a later point. Default is false.",
      ),
  }),
};

export const FINISH_TURN_TOOL: ZodToolDefinition = {
  name: "finish_turn",
  description: `**RECOMMENDED**: End the current turn and generate the final narrative response.

**USAGE**:
- Call this tool ONLY after completing ALL necessary state queries and modifications.
- This tool MUST be the LAST tool call in your response. If you call it alongside other tools, the system will automatically reorder it to execute last.
- Alternatively, you can return a response matching the finish_turn schema directly without calling this tool, but using this tool is recommended for clarity.

**IMPORTANT**: Never return narrative or choices outside of this tool call.`,
  parameters: finishTurnSchema,
};

// ============================================================================
// 工具列表导出
// ============================================================================

export const COMPLETE_FORCE_UPDATE_TOOL: ZodToolDefinition = {
  name: "complete_force_update",
  description: `Complete the force update (sudo command) and return the narrative result.
Use this tool to finalize the changes made via other tools and provide a summary of what happened.
This tool does NOT accept choices or ending types, as force updates are direct interventions.`,
  parameters: forceUpdateSchema,
};

// ============================================================================
// 工具列表导出
// ============================================================================

export const TOOLS: ZodToolDefinition[] = [
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
  // RAG Tools
  RAG_SEARCH_TOOL,
  // Update Tools
  UPDATE_INVENTORY_TOOL,
  UPDATE_RELATIONSHIP_TOOL,
  UPDATE_LOCATION_TOOL,
  UPDATE_QUEST_TOOL,
  UPDATE_KNOWLEDGE_TOOL,
  UPDATE_TIMELINE_TOOL,
  UPDATE_CAUSAL_CHAIN_TOOL,
  UPDATE_FACTION_TOOL,
  UPDATE_WORLD_INFO_TOOL,
  UPDATE_CHARACTER_TOOL,
  UPDATE_GLOBAL_TOOL,
  // Turn Control
  FINISH_TURN_TOOL,
  COMPLETE_FORCE_UPDATE_TOOL,
];
