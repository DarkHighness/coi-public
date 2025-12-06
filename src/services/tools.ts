/**
 * ============================================================================
 * Tool Definitions - 分阶段工具定义
 * ============================================================================
 *
 * 工具按阶段组织：
 * 1. QUERY Stage: 查询工具 + RAG 搜索 + next_stage
 * 2. ADD Stage: 添加工具 + next_stage
 * 3. REMOVE Stage: 删除工具 + next_stage
 * 4. UPDATE Stage: 更新工具 + next_stage
 * 5. NARRATIVE Stage: finish_turn
 *
 * --- ID Format Documentation ---
 * All entities use standardized ID format: "{prefix}:{number}"
 * - Inventory Items: "inv:{N}"
 * - NPCs/Relationships: "npc:{N}"
 * - Locations: "loc:{N}"
 * - Quests: "quest:{N}"
 * - Knowledge Entries: "know:{N}"
 * - Factions: "fac:{N}"
 * - Timeline Events: "evt:{N}"
 * - Causal Chains: "chain:{N}"
 * - Character Skills: "skill:{N}"
 * - Character Conditions: "cond:{N}"
 * - Hidden Traits: "trait:{N}"
 *
 * --- Field Semantics ---
 *
 * ## QUERY: null/undefined = query all
 * ## ADD: null NOT allowed, undefined = use default
 * ## REMOVE: only id/name required
 * ## UPDATE: undefined = no change, null = delete field
 */

import { z, ZodObject, ZodRawShape } from "zod";
import type {
  ZodToolDefinition,
  TypedToolDefinition,
  InferToolParams,
} from "./providers/types";
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

// ============================================================================
// Type-Safe Tool Definition Helper
// ============================================================================

/**
 * Creates a type-safe tool definition that preserves full TypeScript type information.
 *
 * This helper function ensures that:
 * 1. The parameters schema type is fully preserved (not erased to ZodTypeAny)
 * 2. InferToolParams<T> can correctly infer the parameter type
 * 3. Tool handlers can be type-checked at compile time
 *
 * @example
 * const MY_TOOL = defineTool({
 *   name: "my_tool",
 *   description: "Does something",
 *   parameters: z.object({ name: z.string() }),
 * });
 *
 * type MyToolParams = InferToolParams<typeof MY_TOOL>; // { name: string }
 */
export function defineTool<TParams extends ZodObject<ZodRawShape>>(
  definition: TypedToolDefinition<TParams>,
): TypedToolDefinition<TParams> {
  return definition;
}

/**
 * Convert TypedToolDefinition to runtime-compatible ZodToolDefinition
 * Used when passing tools to provider APIs that expect ZodTypeAny
 */
export function toRuntimeTool(
  tool: TypedToolDefinition<ZodObject<ZodRawShape>>,
): ZodToolDefinition {
  return tool as ZodToolDefinition;
}

/**
 * Convert array of TypedToolDefinitions to runtime-compatible array
 */
export function toRuntimeTools(
  tools: TypedToolDefinition<ZodObject<ZodRawShape>>[],
): ZodToolDefinition[] {
  return tools as ZodToolDefinition[];
}

/**
 * Runtime type validation for tool parameters.
 * Uses Zod's safeParse to validate arguments at runtime.
 *
 * @param tool The tool definition containing the schema
 * @param args The arguments to validate
 * @returns Validated and typed arguments, or throws an error
 */
export function validateToolArgs<TParams extends ZodObject<ZodRawShape>>(
  tool: TypedToolDefinition<TParams>,
  args: Record<string, unknown>,
): z.infer<TParams> {
  const result = tool.parameters.safeParse(args);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    throw new Error(`Invalid arguments for tool "${tool.name}": ${errors}`);
  }
  return result.data;
}

/**
 * Runtime type validation with safe return (no throw).
 * Returns { success: true, data } or { success: false, error }.
 */
export function safeValidateToolArgs<TParams extends ZodObject<ZodRawShape>>(
  tool: TypedToolDefinition<TParams>,
  args: Record<string, unknown>,
): z.SafeParseReturnType<z.input<TParams>, z.infer<TParams>> {
  return tool.parameters.safeParse(args);
}

// ============================================================================
// ID Prefixes and Helpers
// ============================================================================

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

export const generateEntityId = (type: EntityType, num: number): string => {
  return `${ID_PREFIXES[type]}:${num}`;
};

export const parseEntityId = (
  id: string,
): { type: string; num: number } | null => {
  const match = id.match(/^([a-z]+):(\d+)$/);
  if (!match) return null;
  return { type: match[1], num: parseInt(match[2], 10) };
};

// ============================================================================
// Stage Types
// ============================================================================

export type AgentStage = "query" | "add" | "remove" | "update" | "narrative";

// ============================================================================
// QUERY TOOLS (Stage 1)
// ============================================================================

// -----------------------------------------------------------------------------
// Story Memory Query Tools - for AI self-inspection of story history
// -----------------------------------------------------------------------------

/**
 * Query story segments from the current fork history.
 * Use this when you need to recall specific past events, dialogues, or context.
 */
export const QUERY_STORY_TOOL = defineTool({
  name: "query_story",
  description: "Search story history. Supports regex, location/time filters, pagination.",
  parameters: z.object({
    keyword: z.string().optional().describe("Regex pattern. Case-insensitive."),
    location: z.string().optional().describe("Filter by location."),
    inGameTime: z.string().optional().describe("Filter by time (e.g., 'Day 3', 'night')."),
    turnRange: z
      .object({
        start: z.number().optional(),
        end: z.number().optional(),
      })
      .optional()
      .describe("Turn number range."),
    order: z.enum(["asc", "desc"]).optional().describe("Default: 'desc'."),
    limit: z.number().optional().describe("Max results. Default: 10."),
    page: z.number().optional().describe("Page number (1-indexed)."),
    includeContext: z.boolean().optional().describe("Include following player action."),
  }),
});

/**
 * Query current turn information.
 * Use this to understand where you are in the story timeline.
 */
export const QUERY_TURN_TOOL = defineTool({
  name: "query_turn",
  description: "Get current fork ID and turn number.",
  parameters: z.object({}),
});

/**
 * Query the current story summary.
 * Use this to get an overview of what has happened so far.
 */
export const QUERY_SUMMARY_TOOL = defineTool({
  name: "query_summary",
  description: "Search OLDER summaries (latest already in context). Use for events from much earlier.",
  parameters: z.object({
    keyword: z.string().optional().describe("Regex to match in summary text."),
    nodeRange: z
      .object({
        start: z.number().optional(),
        end: z.number().optional(),
      })
      .optional()
      .describe("Filter by node range."),
    limit: z.number().optional().describe("Max results. Default: 5."),
    order: z.enum(["asc", "desc"]).optional().describe("Default: 'desc'."),
  }),
});

/**
 * Query recent story context window.
 * Use this to get the most recent exchanges for immediate context.
 */
export const QUERY_RECENT_CONTEXT_TOOL = defineTool({
  name: "query_recent_context",
  description: "Get segments BEYOND current context window. Recent ~10 already in context.",
  parameters: z.object({
    count: z.number().optional().describe("Number of segments. Default: 10, Max: 20."),
  }),
});

// -----------------------------------------------------------------------------
// Game State Query Tools
// -----------------------------------------------------------------------------

export const QUERY_INVENTORY_TOOL = defineTool({
  name: "query_inventory",
  description:
    "Check what the player is carrying. Use this to verify items for an action.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe("Name, ID (inv:N), or keyword. Omit to list all."),
  }),
});

export const QUERY_RELATIONSHIPS_TOOL = defineTool({
  name: "query_relationships",
  description: "Recall details about NPCs the player has met.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe("Name, ID (npc:N), or keyword. Omit to list all."),
  }),
});

export const QUERY_LOCATIONS_TOOL = defineTool({
  name: "query_locations",
  description: "Recall details about known locations.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe("Name, ID (loc:N), or keyword. Omit to list all."),
  }),
});

export const QUERY_QUESTS_TOOL = defineTool({
  name: "query_quests",
  description: "Query active and completed quests.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe("Title, ID (quest:N), or keyword. Omit to list all."),
    status: z
      .enum(["active", "completed", "failed", "all"])
      .nullish()
      .describe("Filter by status. Default: 'active'."),
  }),
});

export const QUERY_KNOWLEDGE_TOOL = defineTool({
  name: "query_knowledge",
  description: "Query accumulated knowledge/lore.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe("Title, ID (know:N), or keyword. Omit to list all."),
    category: knowledgeCategorySchema.nullish().describe("Filter by category."),
  }),
});

export const QUERY_TIMELINE_TOOL = defineTool({
  name: "query_timeline",
  description: "Query world timeline and history.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe("Keyword, ID (evt:N), or category. Omit for recent events."),
  }),
});

export const QUERY_CAUSAL_CHAIN_TOOL = defineTool({
  name: "query_causal_chain",
  description: "Query active causal chains.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe("Keyword or ID (chain:N). Omit to list all."),
  }),
});

export const QUERY_FACTIONS_TOOL = defineTool({
  name: "query_factions",
  description: "Query major factions and power groups.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe("Name, ID (fac:N), or keyword. Omit to list all."),
  }),
});

export const QUERY_GLOBAL_TOOL = defineTool({
  name: "query_global",
  description: "Query global game state (time, theme, environment).",
  parameters: z.object({
    category: z
      .enum(["time", "theme", "environment", "all"])
      .nullish()
      .describe("Category. Default: 'all'."),
  }),
});

// Character Query Tools
export const QUERY_CHARACTER_PROFILE_TOOL = defineTool({
  name: "query_character_profile",
  description: "Query the player character's basic profile information.",
  parameters: z.object({}),
});

export const QUERY_CHARACTER_ATTRIBUTES_TOOL = defineTool({
  name: "query_character_attributes",
  description: "Query character's numeric attributes (Health, Mana, etc.).",
  parameters: z.object({
    name: z.string().nullish().describe("Attribute name. Omit to list all."),
  }),
});

export const QUERY_CHARACTER_SKILLS_TOOL = defineTool({
  name: "query_character_skills",
  description: "Query character's skills.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe("Skill name or ID (skill:N). Omit to list all."),
  }),
});

export const QUERY_CHARACTER_CONDITIONS_TOOL = defineTool({
  name: "query_character_conditions",
  description: "Query character's conditions (buffs/debuffs).",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe("Condition name or ID (cond:N). Omit to list all."),
  }),
});

export const QUERY_CHARACTER_TRAITS_TOOL = defineTool({
  name: "query_character_traits",
  description: "Query character's hidden personality traits.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe("Trait name or ID (trait:N). Omit to list all."),
  }),
});

// RAG Search Tool
// DocumentType from rag/types.ts: "story" | "npc" | "location" | "item" | "knowledge" | "quest" | "event" | "outline"
export const RAG_SEARCH_TOOL = defineTool({
  name: "rag_search",
  description: "Semantic search across all game entities (story/npcs/locations/etc). Returns visible + hidden info.",
  parameters: z.object({
    query: z.string().describe("Natural language query."),
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
          "outline",
        ]),
      )
      .optional()
      .describe("Filter by type."),
    topK: z.number().optional().describe("Max results. Default: 5."),
    currentForkOnly: z.boolean().optional().describe("Current fork only."),
    beforeCurrentTurn: z.boolean().optional().describe("Before current turn."),
  }),
});

// ============================================================================
// ADD TOOLS (Stage 2)
// ============================================================================

export const ADD_INVENTORY_TOOL = defineTool({
  name: "add_inventory",
  description: "Add inventory item.",
  parameters: z.object({
    id: z.string().optional().describe("Optional ID (inv:N)."),
    name: z.string().describe("Item name."),
    visible: inventoryItemVisibleSchema.partial().optional().describe("Visible props."),
    hidden: inventoryItemHiddenSchema.partial().optional().describe("Hidden props (AI/GM)."),
    lore: z.string().optional().describe("Lore."),
    icon: z.string().optional().describe("Emoji."),
  }),
});

export const ADD_RELATIONSHIP_TOOL = defineTool({
  name: "add_relationship",
  description: "Add NPC.",
  parameters: z.object({
    id: z.string().optional().describe("Optional ID (npc:N)."),
    name: z.string().describe("NPC name."),
    currentLocation: z.string().optional().describe("Location ID (loc:N)."),
    known: z.boolean().optional().describe("Player knows NPC? Default: true."),
    visible: relationshipVisibleSchema.partial().optional().describe("Visible props."),
    hidden: relationshipHiddenSchema.partial().optional().describe("Hidden props (AI/GM)."),
    notes: z.string().optional().describe("Notes."),
    icon: z.string().optional().describe("Emoji."),
  }),
});

export const ADD_LOCATION_TOOL = defineTool({
  name: "add_location",
  description: "Add location.",
  parameters: z.object({
    id: z.string().optional().describe("Optional ID (loc:N)."),
    name: z.string().describe("Location name."),
    visible: locationVisibleSchema.partial().optional().describe("Visible props."),
    hidden: locationHiddenSchema.partial().optional().describe("Hidden props (AI/GM)."),
    environment: z.string().optional().describe("Atmosphere."),
    isVisited: z.boolean().optional().describe("Visited? Default: false."),
    unlocked: z.boolean().optional().describe("Secrets unlocked? Default: false."),
    unlockReason: z.string().optional().describe("Unlock reason."),
    icon: z.string().optional().describe("Emoji."),
  }),
});

export const ADD_QUEST_TOOL = defineTool({
  name: "add_quest",
  description: "Add quest.",
  parameters: z.object({
    id: z.string().optional().describe("Optional ID (quest:N)."),
    title: z.string().describe("Quest title."),
    type: questTypeSchema.optional().describe("Quest type."),
    visible: questVisibleSchema.partial().optional().describe("Visible props."),
    hidden: questHiddenSchema.partial().optional().describe("Hidden props (AI/GM)."),
    icon: z.string().optional().describe("Emoji."),
  }),
});

export const ADD_KNOWLEDGE_TOOL = defineTool({
  name: "add_knowledge",
  description: "Add knowledge/lore.",
  parameters: z.object({
    id: z.string().optional().describe("Optional ID (know:N)."),
    title: z.string().describe("Title."),
    category: knowledgeCategorySchema.optional().describe("Category."),
    visible: knowledgeVisibleSchema.partial().optional().describe("Visible props."),
    hidden: knowledgeHiddenSchema.partial().optional().describe("Hidden props (AI/GM)."),
    discoveredAt: z.string().optional().describe("Discovered time."),
    relatedTo: z.array(z.string()).optional().describe("Related IDs."),
    icon: z.string().optional().describe("Emoji."),
  }),
});

export const ADD_TIMELINE_TOOL = defineTool({
  name: "add_timeline",
  description: "Add timeline event.",
  parameters: z.object({
    id: z.string().optional().describe("Optional ID (evt:N)."),
    gameTime: z.string().optional().describe("Time."),
    category: timelineEventCategorySchema.optional().describe("Category."),
    visible: timelineEventVisibleSchema.optional().describe("Visible info."),
    hidden: timelineEventHiddenSchema.optional().describe("Hidden info (AI/GM)."),
    involvedEntities: z.array(z.string()).optional().describe("Involved IDs."),
    chainId: z.string().optional().describe("CausalChain link (chain:N)."),
    known: z.boolean().optional().describe("Player knows? Default: true."),
    icon: z.string().optional().describe("Emoji."),
  }),
});

export const ADD_FACTION_TOOL = defineTool({
  name: "add_faction",
  description: "Add faction.",
  parameters: z.object({
    id: z.string().optional().describe("Optional ID (fac:N)."),
    name: z.string().describe("Name."),
    visible: z
      .object({
        agenda: z.string().optional().describe("Agenda."),
        members: z.array(factionMemberSchema).optional().describe("Members."),
        influence: z.string().optional().describe("Influence."),
        relations: z.array(factionRelationSchema).optional().describe("Alliances."),
      })
      .optional()
      .describe("Public info."),
    hidden: z
      .object({
        agenda: z.string().optional().describe("Secret agenda."),
        members: z.array(factionMemberSchema).optional().describe("Secret members."),
        influence: z.string().optional().describe("True influence."),
        relations: z.array(factionRelationSchema).optional().describe("Secret alliances."),
      })
      .optional()
      .describe("Hidden info (AI/GM)."),
    icon: z.string().optional().describe("Emoji."),
  }),
});

export const ADD_CAUSAL_CHAIN_TOOL = defineTool({
  name: "add_causal_chain",
  description: "Create causal chain.",
  parameters: z.object({
    chainId: z.string().describe("Chain ID (chain:N)."),
    rootCause: z
      .object({
        eventId: z.string().describe("Event ID."),
        description: z.string().describe("Description."),
      })
      .describe("Root cause."),
    status: causalChainStatusSchema.optional().describe("Status."),
    pendingConsequences: z
      .array(
        z.object({
          id: z.string().describe("Consequence ID."),
          description: z.string().describe("What could happen."),
          readyAfterTurn: z.number().int().describe("Trigger turn."),
          conditions: z.array(z.string()).optional().describe("Conditions."),
          known: z.boolean().optional().describe("Known?"),
        }),
      )
      .optional()
      .describe("Consequences."),
  }),
});

// Character Add Tools
export const ADD_CHARACTER_ATTRIBUTE_TOOL = defineTool({
  name: "add_character_attribute",
  description: "Add numeric attribute.",
  parameters: z.object({
    name: z.string().describe("Attribute name."),
    value: z.number().int().describe("Value."),
    maxValue: z.number().int().optional().describe("Max value."),
    color: attributeColorSchema.optional().describe("Color."),
  }),
});

export const ADD_CHARACTER_SKILL_TOOL = defineTool({
  name: "add_character_skill",
  description: "Add skill.",
  parameters: z.object({
    id: z.string().optional().describe("Optional ID (skill:N)."),
    name: z.string().describe("Skill name."),
    level: z.string().optional().describe("Level."),
    visible: skillVisibleSchema.partial().optional().describe("Visible props."),
    hidden: skillHiddenSchema.partial().optional().describe("Hidden props."),
    category: z.string().optional().describe("Category."),
    icon: z.string().optional().describe("Emoji."),
  }),
});

export const ADD_CHARACTER_CONDITION_TOOL = defineTool({
  name: "add_character_condition",
  description: "Add condition (buff/debuff).",
  parameters: z.object({
    id: z.string().optional().describe("Optional ID (cond:N)."),
    name: z.string().describe("Condition name."),
    type: conditionTypeSchema.optional().describe("Type."),
    visible: conditionVisibleSchema.partial().optional().describe("Visible props."),
    hidden: conditionHiddenSchema.partial().optional().describe("Hidden props."),
    effects: z
      .object({
        visible: z.array(z.string()).optional(),
        hidden: z.array(z.string()).optional(),
      })
      .optional()
      .describe("Effects."),
    duration: z.number().int().optional().describe("Duration (turns)."),
    icon: z.string().optional().describe("Emoji."),
  }),
});

export const ADD_CHARACTER_TRAIT_TOOL = defineTool({
  name: "add_character_trait",
  description: "Add hidden trait.",
  parameters: z.object({
    id: z.string().optional().describe("Optional ID (trait:N)."),
    name: z.string().describe("Trait name."),
    description: z.string().optional().describe("Description."),
    effects: z.array(z.string()).optional().describe("Effects."),
    triggerConditions: z.array(z.string()).optional().describe("Trigger conditions."),
  }),
});

// ============================================================================
// REMOVE TOOLS (Stage 3)
// ============================================================================

export const REMOVE_INVENTORY_TOOL = defineTool({
  name: "remove_inventory",
  description: "Remove inventory item.",
  parameters: z.object({
    id: z.string().describe("ID (inv:N)."),
  }),
});

export const REMOVE_RELATIONSHIP_TOOL = defineTool({
  name: "remove_relationship",
  description: "Remove NPC.",
  parameters: z.object({
    id: z.string().describe("ID (npc:N)."),
  }),
});

export const REMOVE_LOCATION_TOOL = defineTool({
  name: "remove_location",
  description: "Remove location.",
  parameters: z.object({
    id: z.string().describe("ID (loc:N)."),
  }),
});

export const REMOVE_QUEST_TOOL = defineTool({
  name: "remove_quest",
  description: "Remove quest.",
  parameters: z.object({
    id: z.string().describe("ID (quest:N)."),
  }),
});

export const REMOVE_FACTION_TOOL = defineTool({
  name: "remove_faction",
  description: "Remove faction.",
  parameters: z.object({
    id: z.string().describe("ID (fac:N)."),
  }),
});

export const REMOVE_CHARACTER_ATTRIBUTE_TOOL = defineTool({
  name: "remove_character_attribute",
  description: "Remove attribute.",
  parameters: z.object({
    name: z.string().describe("Name."),
  }),
});

export const REMOVE_CHARACTER_SKILL_TOOL = defineTool({
  name: "remove_character_skill",
  description: "Remove skill.",
  parameters: z.object({
    id: z.string().optional().describe("ID (skill:N)."),
    name: z.string().optional().describe("Name."),
  }),
});

export const REMOVE_CHARACTER_CONDITION_TOOL = defineTool({
  name: "remove_character_condition",
  description: "Remove condition.",
  parameters: z.object({
    id: z.string().optional().describe("ID (cond:N)."),
    name: z.string().optional().describe("Name."),
  }),
});

export const REMOVE_CHARACTER_TRAIT_TOOL = defineTool({
  name: "remove_character_trait",
  description: "Remove hidden trait.",
  parameters: z.object({
    id: z.string().optional().describe("ID (trait:N)."),
    name: z.string().optional().describe("Name."),
  }),
});

// ============================================================================
// UPDATE TOOLS (Stage 4)
// ============================================================================

export const UPDATE_INVENTORY_TOOL = defineTool({
  name: "update_inventory",
  description: "Update inventory. Omit to keep, null to delete.",
  parameters: z.object({
    id: z.string().describe("ID (inv:N)."),
    name: z.string().nullish().describe("New name."),
    visible: inventoryItemVisibleSchema.partial().nullish().describe("Visible props."),
    hidden: inventoryItemHiddenSchema.partial().nullish().describe("Hidden props."),
    lore: z.string().nullish().describe("Lore."),
    icon: z.string().nullish().describe("Emoji."),
  }),
});

export const UPDATE_RELATIONSHIP_TOOL = defineTool({
  name: "update_relationship",
  description: "Update NPC. Omit to keep, null to delete.",
  parameters: z.object({
    id: z.string().describe("ID (npc:N)."),
    name: z.string().nullish().describe("New name."),
    currentLocation: z.string().nullish().describe("Location ID."),
    known: z.boolean().nullish().describe("Known?"),
    visible: relationshipVisibleSchema.partial().nullish().describe("Visible props."),
    hidden: relationshipHiddenSchema.partial().nullish().describe("Hidden props."),
    notes: z.string().nullish().describe("Notes."),
    icon: z.string().nullish().describe("Emoji."),
  }),
});

export const UPDATE_LOCATION_TOOL = defineTool({
  name: "update_location",
  description: "Update location. Omit to keep, null to delete.",
  parameters: z.object({
    id: z.string().describe("ID (loc:N)."),
    name: z.string().nullish().describe("New name."),
    visible: locationVisibleSchema.partial().nullish().describe("Visible props."),
    hidden: locationHiddenSchema.partial().nullish().describe("Hidden props."),
    environment: z.string().nullish().describe("Atmosphere."),
    isVisited: z.boolean().nullish().describe("Visited?"),
    icon: z.string().nullish().describe("Emoji."),
  }),
});

export const UPDATE_QUEST_TOOL = defineTool({
  name: "update_quest",
  description: "Update quest. Omit to keep, null to delete.",
  parameters: z.object({
    id: z.string().describe("ID (quest:N)."),
    title: z.string().nullish().describe("New title."),
    type: questTypeSchema.nullish().describe("Type."),
    visible: questVisibleSchema.partial().nullish().describe("Visible props."),
    hidden: questHiddenSchema.partial().nullish().describe("Hidden props."),
    icon: z.string().nullish().describe("Emoji."),
  }),
});

export const COMPLETE_QUEST_TOOL = defineTool({
  name: "complete_quest",
  description: "Complete quest.",
  parameters: z.object({
    id: z.string().describe("ID (quest:N)."),
  }),
});

export const FAIL_QUEST_TOOL = defineTool({
  name: "fail_quest",
  description: "Fail quest.",
  parameters: z.object({
    id: z.string().describe("ID (quest:N)."),
  }),
});

export const UPDATE_KNOWLEDGE_TOOL = defineTool({
  name: "update_knowledge",
  description: "Update knowledge. Omit to keep, null to delete.",
  parameters: z.object({
    id: z.string().describe("ID (know:N)."),
    title: z.string().nullish().describe("New title."),
    category: knowledgeCategorySchema.nullish().describe("Category."),
    visible: knowledgeVisibleSchema.partial().nullish().describe("Visible props."),
    hidden: knowledgeHiddenSchema.partial().nullish().describe("Hidden props."),
    discoveredAt: z.string().nullish().describe("Time."),
    relatedTo: z.array(z.string()).nullish().describe("Related IDs."),
    icon: z.string().nullish().describe("Emoji."),
  }),
});

export const UPDATE_TIMELINE_TOOL = defineTool({
  name: "update_timeline",
  description: "Update timeline event. Omit to keep, null to delete.",
  parameters: z.object({
    id: z.string().describe("ID (evt:N)."),
    gameTime: z.string().nullish().describe("Time."),
    category: timelineEventCategorySchema.nullish().describe("Category."),
    visible: timelineEventVisibleSchema.nullish().describe("Visible info."),
    hidden: timelineEventHiddenSchema.nullish().describe("Hidden info."),
    involvedEntities: z.array(z.string()).nullish().describe("Involved IDs."),
    chainId: z.string().nullish().describe("CausalChain link."),
    known: z.boolean().nullish().describe("Known?"),
    icon: z.string().nullish().describe("Emoji."),
  }),
});

export const UPDATE_FACTION_TOOL = defineTool({
  name: "update_faction",
  description: "Update faction. Omit to keep, null to delete.",
  parameters: z.object({
    id: z.string().describe("ID (fac:N)."),
    name: z.string().nullish().describe("New name."),
    visible: z
      .object({
        agenda: z.string().nullish().describe("Agenda."),
        members: z.array(factionMemberSchema).nullish().describe("Members."),
        influence: z.string().nullish().describe("Influence."),
        relations: z.array(factionRelationSchema).nullish().describe("Relations."),
      })
      .nullish()
      .describe("Public info."),
    hidden: z
      .object({
        agenda: z.string().nullish().describe("Secret agenda."),
        members: z.array(factionMemberSchema).nullish().describe("Secret members."),
        influence: z.string().nullish().describe("True influence."),
        relations: z.array(factionRelationSchema).nullish().describe("Secret relations."),
      })
      .nullish()
      .describe("Hidden info."),
    icon: z.string().nullish().describe("Emoji."),
  }),
});

export const UPDATE_CAUSAL_CHAIN_TOOL = defineTool({
  name: "update_causal_chain",
  description: "Update causal chain. Omit to keep, null to delete.",
  parameters: z.object({
    chainId: z.string().describe("ID (chain:N)."),
    status: causalChainStatusSchema.nullish().describe("Status."),
    pendingConsequences: z
      .array(
        z.object({
          id: z.string().describe("Consequence ID."),
          description: z.string().describe("What could happen."),
          readyAfterTurn: z.number().int().describe("Trigger turn."),
          conditions: z.array(z.string()).optional().describe("Conditions."),
          known: z.boolean().optional().describe("Known?"),
        }),
      )
      .nullish()
      .describe("Consequences."),
  }),
});

export const TRIGGER_CAUSAL_CHAIN_TOOL = defineTool({
  name: "trigger_causal_chain",
  description: "Trigger consequence NOW. Narrate result.",
  parameters: z.object({
    chainId: z.string().describe("Chain ID (chain:N)."),
    consequenceId: z.string().describe("Consequence ID."),
  }),
});

export const RESOLVE_CAUSAL_CHAIN_TOOL = defineTool({
  name: "resolve_causal_chain",
  description: "Resolve causal chain (arc complete).",
  parameters: z.object({
    chainId: z.string().describe("ID (chain:N)."),
  }),
});

export const INTERRUPT_CAUSAL_CHAIN_TOOL = defineTool({
  name: "interrupt_causal_chain",
  description: "Interrupt causal chain.",
  parameters: z.object({
    chainId: z.string().describe("ID (chain:N)."),
  }),
});

export const UPDATE_WORLD_INFO_TOOL = defineTool({
  name: "update_world_info",
  description: "Reveal world secrets (major milestones only).",
  parameters: z.object({
    unlockWorldSetting: z.boolean().optional().describe("Reveal setting info."),
    unlockMainGoal: z.boolean().optional().describe("Reveal main goal."),
    reason: z.string().describe("Why?"),
  }),
});

export const UPDATE_GLOBAL_TOOL = defineTool({
  name: "update_global",
  description: "Update global state.",
  parameters: z.object({
    time: z.string().nullish().describe("Time."),
    atmosphere: atmosphereSchema.nullish().describe("Atmosphere."),
  }),
});

// Character Update Tools
export const UPDATE_CHARACTER_PROFILE_TOOL = defineTool({
  name: "update_character_profile",
  description: "Update character profile. Omit to keep, null to clear.",
  parameters: z.object({
    name: z.string().nullish().describe("Name."),
    title: z.string().nullish().describe("Title/Class."),
    currentLocation: z.string().nullish().describe("Location."),
    status: z.string().nullish().describe("Status."),
    appearance: z.string().nullish().describe("Appearance."),
    age: z.string().nullish().describe("Age."),
    profession: z.string().nullish().describe("Profession."),
    background: z.string().nullish().describe("Background."),
    race: z.string().nullish().describe("Race."),
  }),
});

export const UPDATE_CHARACTER_ATTRIBUTE_TOOL = defineTool({
  name: "update_character_attribute",
  description: "Update attribute. Omit to keep, null to remove.",
  parameters: z.object({
    name: z.string().describe("Name."),
    value: z.number().int().nullish().describe("New value."),
    maxValue: z.number().int().nullish().describe("Max value."),
    color: attributeColorSchema.nullish().describe("Color."),
  }),
});

export const UPDATE_CHARACTER_SKILL_TOOL = defineTool({
  name: "update_character_skill",
  description: "Update skill. Omit to keep, null to remove.",
  parameters: z.object({
    id: z.string().optional().describe("ID (skill:N)."),
    name: z.string().optional().describe("Name."),
    level: z.string().nullish().describe("Level."),
    visible: skillVisibleSchema.partial().nullish().describe("Visible props."),
    hidden: skillHiddenSchema.partial().nullish().describe("Hidden props."),
    category: z.string().nullish().describe("Category."),
    icon: z.string().nullish().describe("Emoji."),
  }),
});

export const UPDATE_CHARACTER_CONDITION_TOOL = defineTool({
  name: "update_character_condition",
  description: "Update condition. Omit to keep, null to remove.",
  parameters: z.object({
    id: z.string().optional().describe("ID (cond:N)."),
    name: z.string().optional().describe("Name."),
    type: conditionTypeSchema.nullish().describe("Type."),
    visible: conditionVisibleSchema.partial().nullish().describe("Visible props."),
    hidden: conditionHiddenSchema.partial().nullish().describe("Hidden props."),
    effects: z
      .object({
        visible: z.array(z.string()).nullish(),
        hidden: z.array(z.string()).nullish(),
      })
      .nullish()
      .describe("Effects."),
    duration: z.number().int().nullish().describe("Duration."),
    icon: z.string().nullish().describe("Emoji."),
  }),
});

export const UPDATE_CHARACTER_TRAIT_TOOL = defineTool({
  name: "update_character_trait",
  description: "Update hidden trait. Omit to keep, null to remove.",
  parameters: z.object({
    id: z.string().optional().describe("ID (trait:N)."),
    name: z.string().optional().describe("Name."),
    description: z.string().nullish().describe("Description."),
    effects: z.array(z.string()).nullish().describe("Effects."),
    triggerConditions: z.array(z.string()).nullish().describe("Trigger conditions."),
  }),
});

// ============================================================================
// UNLOCK TOOL (Stage 4 - Update)
// ============================================================================

/**
 * Entity category enum for unlock tool
 */
export const unlockEntityCategorySchema = z.enum([
  "inventory",
  "relationship",
  "location",
  "quest",
  "knowledge",
  "timeline",
  "faction",
  "skill",
  "condition",
  "trait",
]);

export const UNLOCK_ENTITY_TOOL = defineTool({
  name: "unlock_entity",
  description: "Unlock entity hidden info. Requires PROOF and COMPLETE revelation.",
  parameters: z.object({
    category: unlockEntityCategorySchema.describe("Category."),
    id: z.string().optional().describe("ID (inv:N)."),
    name: z.string().optional().describe("Name."),
    reason: z.string().describe("Justification describing evidence."),
  }),
});

// ============================================================================
// CONTROL TOOLS
// ============================================================================

// Stage schema for next_stage tool parameter validation
export const agentStageSchema = z.enum([
  "query",
  "add",
  "remove",
  "update",
  "narrative",
]);

export const NEXT_STAGE_TOOL = defineTool({
  name: "next_stage",
  description: "Proceed to next or specific stage.",
  parameters: z.object({
    target: agentStageSchema.optional().describe("Target stage."),
  }),
});

export const FINISH_TURN_TOOL = defineTool({
  name: "finish_turn",
  description: "End turn and narrate. NO INTERNAL IDs.",
  parameters: finishTurnSchema,
});

export const COMPLETE_FORCE_UPDATE_TOOL = defineTool({
  name: "complete_force_update",
  description: "Complete sudo force update.",
  parameters: forceUpdateSchema,
});

// ============================================================================
// SUMMARY AGENTIC LOOP TOOLS
// ============================================================================

/**
 * Summary Stage Type
 */
export type SummaryStage = "query" | "finish";

/**
 * Query segments from the conversation being summarized.
 * Use this to examine specific parts of the story in detail.
 */
export const SUMMARY_QUERY_SEGMENTS_TOOL = defineTool({
  name: "summary_query_segments",
  description: `Query specific segments from the story being summarized.

Use this when you need MORE DETAIL about:
- A specific turn or range of turns
- What exactly happened in a scene
- Exact dialogue or descriptions
- Specific NPC interactions

You already have the previous summary and current turn info. Use this to fill in gaps.`,
  parameters: z.object({
    turnRange: z
      .object({
        start: z.number().describe("Start turn number (inclusive)"),
        end: z.number().describe("End turn number (inclusive)"),
      })
      .optional()
      .describe(
        "Get segments in this turn range. If omitted, returns all segments being summarized.",
      ),
    keyword: z
      .string()
      .optional()
      .describe("Filter by keyword/regex in segment text"),
  }),
});

/**
 * Query the current game state (inventory, relationships, etc.)
 * Use this when the summary needs to reference entity states.
 */
export const SUMMARY_QUERY_STATE_TOOL = defineTool({
  name: "summary_query_state",
  description: `Query current game state entities.

Use this when you need to know:
- Current inventory items and their descriptions
- NPC relationship statuses
- Known locations
- Active/completed quests
- Character attributes/skills

This helps you accurately describe state changes in the summary.`,
  parameters: z.object({
    entities: z
      .array(
        z.enum([
          "inventory",
          "relationships",
          "locations",
          "quests",
          "knowledge",
          "character",
        ]),
      )
      .describe("Which entity types to query"),
  }),
});

/**
 * Finish the summary with the final result.
 */
export const FINISH_SUMMARY_TOOL = defineTool({
  name: "finish_summary",
  description: `Complete the summarization with the final summary object.

You MUST provide:
- displayText: 2-3 sentence summary for UI (visible layer only, story language)
- visible: What the PROTAGONIST knows/experienced
- hidden: GM-only truth the protagonist does NOT know

Preserve the visible/hidden separation carefully:
- Player events, discoveries, actions → visible
- Behind-the-scenes NPC actions, hidden plots, unrevealed secrets → hidden`,
  parameters: z.object({
    displayText: z
      .string()
      .describe(
        "Concise 2-3 sentence summary for UI display. MUST be in story language.",
      ),
    visible: z.object({
      narrative: z
        .string()
        .describe("What happened from the protagonist's perspective"),
      majorEvents: z
        .array(z.string())
        .describe("Key events the protagonist witnessed/participated in"),
      characterDevelopment: z
        .string()
        .describe("How the protagonist changed/grew"),
      worldState: z
        .string()
        .describe("How the world changed from protagonist's view"),
    }),
    hidden: z.object({
      truthNarrative: z.string().describe("What ACTUALLY happened (GM truth)"),
      hiddenPlots: z
        .array(z.string())
        .describe("Plot threads player doesn't know about"),
      npcActions: z.array(z.string()).describe("What NPCs did off-screen"),
      worldTruth: z.string().describe("Real state of the world"),
      unrevealed: z
        .array(z.string())
        .describe("Secrets not yet revealed to player"),
    }),
    timeRange: z
      .object({
        from: z.string().describe("Start time in story"),
        to: z.string().describe("End time in story"),
      })
      .optional(),
  }),
});

/**
 * Summary tools grouped by stage
 */
export const SUMMARY_QUERY_TOOLS: ZodToolDefinition[] = [
  SUMMARY_QUERY_SEGMENTS_TOOL,
  SUMMARY_QUERY_STATE_TOOL,
];

export const SUMMARY_FINISH_TOOLS: ZodToolDefinition[] = [FINISH_SUMMARY_TOOL];

/**
 * Get tools for summary stage
 */
export function getSummaryToolsForStage(
  stage: SummaryStage,
): ZodToolDefinition[] {
  switch (stage) {
    case "query":
      // Query stage can also finish early
      return [...SUMMARY_QUERY_TOOLS, FINISH_SUMMARY_TOOL];
    case "finish":
      return SUMMARY_FINISH_TOOLS;
    default:
      return [];
  }
}

/**
 * Summary stage order
 */
export const SUMMARY_STAGE_ORDER: SummaryStage[] = ["query", "finish"];

/**
 * Get next summary stage
 */
export function getNextSummaryStage(
  currentStage: SummaryStage,
): SummaryStage | null {
  const currentIndex = SUMMARY_STAGE_ORDER.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex === SUMMARY_STAGE_ORDER.length - 1) {
    return null;
  }
  return SUMMARY_STAGE_ORDER[currentIndex + 1];
}

// ============================================================================
// TOOL GROUPS BY STAGE
// ============================================================================

export const QUERY_TOOLS: ZodToolDefinition[] = [
  // Story Memory Tools (use these first when uncertain about history)
  QUERY_STORY_TOOL,
  QUERY_TURN_TOOL,
  QUERY_SUMMARY_TOOL,
  QUERY_RECENT_CONTEXT_TOOL,
  // Game State Tools
  QUERY_INVENTORY_TOOL,
  QUERY_RELATIONSHIPS_TOOL,
  QUERY_LOCATIONS_TOOL,
  QUERY_QUESTS_TOOL,
  QUERY_KNOWLEDGE_TOOL,
  QUERY_TIMELINE_TOOL,
  QUERY_CAUSAL_CHAIN_TOOL,
  QUERY_FACTIONS_TOOL,
  QUERY_GLOBAL_TOOL,
  QUERY_CHARACTER_PROFILE_TOOL,
  QUERY_CHARACTER_ATTRIBUTES_TOOL,
  QUERY_CHARACTER_SKILLS_TOOL,
  QUERY_CHARACTER_CONDITIONS_TOOL,
  QUERY_CHARACTER_TRAITS_TOOL,
  RAG_SEARCH_TOOL,
];

export const ADD_TOOLS: ZodToolDefinition[] = [
  ADD_INVENTORY_TOOL,
  ADD_RELATIONSHIP_TOOL,
  ADD_LOCATION_TOOL,
  ADD_QUEST_TOOL,
  ADD_KNOWLEDGE_TOOL,
  ADD_TIMELINE_TOOL,
  ADD_FACTION_TOOL,
  ADD_CAUSAL_CHAIN_TOOL,
  ADD_CHARACTER_ATTRIBUTE_TOOL,
  ADD_CHARACTER_SKILL_TOOL,
  ADD_CHARACTER_CONDITION_TOOL,
  ADD_CHARACTER_TRAIT_TOOL,
];

export const REMOVE_TOOLS: ZodToolDefinition[] = [
  REMOVE_INVENTORY_TOOL,
  REMOVE_RELATIONSHIP_TOOL,
  REMOVE_LOCATION_TOOL,
  REMOVE_QUEST_TOOL,
  REMOVE_FACTION_TOOL,
  REMOVE_CHARACTER_ATTRIBUTE_TOOL,
  REMOVE_CHARACTER_SKILL_TOOL,
  REMOVE_CHARACTER_CONDITION_TOOL,
  REMOVE_CHARACTER_TRAIT_TOOL,
];

export const UPDATE_TOOLS: ZodToolDefinition[] = [
  UPDATE_INVENTORY_TOOL,
  UPDATE_RELATIONSHIP_TOOL,
  UPDATE_LOCATION_TOOL,
  UPDATE_QUEST_TOOL,
  COMPLETE_QUEST_TOOL,
  FAIL_QUEST_TOOL,
  UPDATE_KNOWLEDGE_TOOL,
  UPDATE_TIMELINE_TOOL,
  UPDATE_FACTION_TOOL,
  UPDATE_CAUSAL_CHAIN_TOOL,
  TRIGGER_CAUSAL_CHAIN_TOOL,
  RESOLVE_CAUSAL_CHAIN_TOOL,
  INTERRUPT_CAUSAL_CHAIN_TOOL,
  UPDATE_WORLD_INFO_TOOL,
  UPDATE_GLOBAL_TOOL,
  UPDATE_CHARACTER_PROFILE_TOOL,
  UPDATE_CHARACTER_ATTRIBUTE_TOOL,
  UPDATE_CHARACTER_SKILL_TOOL,
  UPDATE_CHARACTER_CONDITION_TOOL,
  UPDATE_CHARACTER_TRAIT_TOOL,
];

export const NARRATIVE_TOOLS: ZodToolDefinition[] = [FINISH_TURN_TOOL];

export const CONTROL_TOOLS: ZodToolDefinition[] = [NEXT_STAGE_TOOL];

/**
 * Get tools available for a specific stage
 * All stages now include FINISH_TURN_TOOL for early completion
 */
export function getToolsForStage(
  stage: AgentStage,
  includeRAG: boolean = true,
): ZodToolDefinition[] {
  // finish_turn is available in ALL stages for early completion
  const commonTools = [NEXT_STAGE_TOOL, FINISH_TURN_TOOL];

  switch (stage) {
    case "query":
      const queryTools = includeRAG
        ? QUERY_TOOLS
        : QUERY_TOOLS.filter((t) => t.name !== "rag_search");
      return [...queryTools, ...commonTools];
    case "add":
      return [...ADD_TOOLS, ...commonTools];
    case "remove":
      return [...REMOVE_TOOLS, ...commonTools];
    case "update":
      return [...UPDATE_TOOLS, ...commonTools];
    case "narrative":
      // narrative stage: only finish_turn (no next_stage needed)
      return NARRATIVE_TOOLS;
    default:
      return [];
  }
}

/**
 * Stage order for sequential progression
 */
export const STAGE_ORDER: AgentStage[] = [
  "query",
  "add",
  "remove",
  "update",
  "narrative",
];

/**
 * Get the next stage in the flow
 */
export function getNextStage(currentStage: AgentStage): AgentStage | null {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex === STAGE_ORDER.length - 1) {
    return null;
  }
  return STAGE_ORDER[currentIndex + 1];
}

/**
 * Check if a stage transition is valid
 * Allow any forward or backward transition
 */
export function isValidStageTransition(
  from: AgentStage,
  to: AgentStage,
): boolean {
  return from !== to; // Can transition to any different stage
}

/**
 * Parse and validate a stage string
 */
export function parseStage(
  stage: string | undefined | null,
): AgentStage | null {
  if (!stage) return null;
  if (STAGE_ORDER.includes(stage as AgentStage)) {
    return stage as AgentStage;
  }
  return null;
}

// Legacy export for backwards compatibility
export const TOOLS: ZodToolDefinition[] = [
  ...QUERY_TOOLS,
  ...ADD_TOOLS,
  ...REMOVE_TOOLS,
  ...UPDATE_TOOLS,
  ...NARRATIVE_TOOLS,
  ...CONTROL_TOOLS,
  COMPLETE_FORCE_UPDATE_TOOL,
];

// ============================================================================
// TYPE INFERENCE FROM ZOD SCHEMAS
// ============================================================================

// Using InferToolParams for cleaner type extraction
// These types are now correctly inferred from the tool definitions
// thanks to the generic TypedToolDefinition

// Character Attribute Types
export type AddCharacterAttributeParams = InferToolParams<
  typeof ADD_CHARACTER_ATTRIBUTE_TOOL
>;
export type UpdateCharacterAttributeParams = InferToolParams<
  typeof UPDATE_CHARACTER_ATTRIBUTE_TOOL
>;
export type RemoveCharacterAttributeParams = InferToolParams<
  typeof REMOVE_CHARACTER_ATTRIBUTE_TOOL
>;

// Character Skill Types
export type AddCharacterSkillParams = InferToolParams<
  typeof ADD_CHARACTER_SKILL_TOOL
>;
export type UpdateCharacterSkillParams = InferToolParams<
  typeof UPDATE_CHARACTER_SKILL_TOOL
>;
export type RemoveCharacterSkillParams = InferToolParams<
  typeof REMOVE_CHARACTER_SKILL_TOOL
>;

// Character Condition Types
export type AddCharacterConditionParams = InferToolParams<
  typeof ADD_CHARACTER_CONDITION_TOOL
>;
export type UpdateCharacterConditionParams = InferToolParams<
  typeof UPDATE_CHARACTER_CONDITION_TOOL
>;
export type RemoveCharacterConditionParams = InferToolParams<
  typeof REMOVE_CHARACTER_CONDITION_TOOL
>;

// Character Trait Types
export type AddCharacterTraitParams = InferToolParams<
  typeof ADD_CHARACTER_TRAIT_TOOL
>;
export type UpdateCharacterTraitParams = InferToolParams<
  typeof UPDATE_CHARACTER_TRAIT_TOOL
>;
export type RemoveCharacterTraitParams = InferToolParams<
  typeof REMOVE_CHARACTER_TRAIT_TOOL
>;

// Character Profile Type
export type UpdateCharacterProfileParams = InferToolParams<
  typeof UPDATE_CHARACTER_PROFILE_TOOL
>;

// Query Character Types
export type QueryCharacterProfileParams = InferToolParams<
  typeof QUERY_CHARACTER_PROFILE_TOOL
>;
export type QueryCharacterAttributesParams = InferToolParams<
  typeof QUERY_CHARACTER_ATTRIBUTES_TOOL
>;
export type QueryCharacterSkillsParams = InferToolParams<
  typeof QUERY_CHARACTER_SKILLS_TOOL
>;
export type QueryCharacterConditionsParams = InferToolParams<
  typeof QUERY_CHARACTER_CONDITIONS_TOOL
>;
export type QueryCharacterTraitsParams = InferToolParams<
  typeof QUERY_CHARACTER_TRAITS_TOOL
>;

// Entity Types (Inventory, NPC, Location, Quest, etc.)
export type AddInventoryParams = InferToolParams<typeof ADD_INVENTORY_TOOL>;
export type UpdateInventoryParams = InferToolParams<
  typeof UPDATE_INVENTORY_TOOL
>;
export type RemoveInventoryParams = InferToolParams<
  typeof REMOVE_INVENTORY_TOOL
>;

export type AddRelationshipParams = InferToolParams<
  typeof ADD_RELATIONSHIP_TOOL
>;
export type UpdateRelationshipParams = InferToolParams<
  typeof UPDATE_RELATIONSHIP_TOOL
>;
export type RemoveRelationshipParams = InferToolParams<
  typeof REMOVE_RELATIONSHIP_TOOL
>;

export type AddLocationParams = InferToolParams<typeof ADD_LOCATION_TOOL>;
export type UpdateLocationParams = InferToolParams<typeof UPDATE_LOCATION_TOOL>;
export type RemoveLocationParams = InferToolParams<typeof REMOVE_LOCATION_TOOL>;

export type AddQuestParams = InferToolParams<typeof ADD_QUEST_TOOL>;
export type UpdateQuestParams = InferToolParams<typeof UPDATE_QUEST_TOOL>;
export type RemoveQuestParams = InferToolParams<typeof REMOVE_QUEST_TOOL>;
export type CompleteQuestParams = InferToolParams<typeof COMPLETE_QUEST_TOOL>;
export type FailQuestParams = InferToolParams<typeof FAIL_QUEST_TOOL>;

export type AddKnowledgeParams = InferToolParams<typeof ADD_KNOWLEDGE_TOOL>;
export type UpdateKnowledgeParams = InferToolParams<
  typeof UPDATE_KNOWLEDGE_TOOL
>;

export type AddTimelineParams = InferToolParams<typeof ADD_TIMELINE_TOOL>;
export type UpdateTimelineParams = InferToolParams<typeof UPDATE_TIMELINE_TOOL>;

export type AddFactionParams = InferToolParams<typeof ADD_FACTION_TOOL>;
export type UpdateFactionParams = InferToolParams<typeof UPDATE_FACTION_TOOL>;
export type RemoveFactionParams = InferToolParams<typeof REMOVE_FACTION_TOOL>;

export type AddCausalChainParams = InferToolParams<
  typeof ADD_CAUSAL_CHAIN_TOOL
>;
export type UpdateCausalChainParams = InferToolParams<
  typeof UPDATE_CAUSAL_CHAIN_TOOL
>;
export type TriggerCausalChainParams = InferToolParams<
  typeof TRIGGER_CAUSAL_CHAIN_TOOL
>;
export type ResolveCausalChainParams = InferToolParams<
  typeof RESOLVE_CAUSAL_CHAIN_TOOL
>;
export type InterruptCausalChainParams = InferToolParams<
  typeof INTERRUPT_CAUSAL_CHAIN_TOOL
>;

// Global and World Info Types
export type UpdateGlobalParams = InferToolParams<typeof UPDATE_GLOBAL_TOOL>;
export type UpdateWorldInfoParams = InferToolParams<
  typeof UPDATE_WORLD_INFO_TOOL
>;

// Query Types
export type QueryInventoryParams = InferToolParams<typeof QUERY_INVENTORY_TOOL>;
export type QueryRelationshipsParams = InferToolParams<
  typeof QUERY_RELATIONSHIPS_TOOL
>;
export type QueryLocationsParams = InferToolParams<typeof QUERY_LOCATIONS_TOOL>;
export type QueryQuestsParams = InferToolParams<typeof QUERY_QUESTS_TOOL>;
export type QueryKnowledgeParams = InferToolParams<typeof QUERY_KNOWLEDGE_TOOL>;
export type QueryTimelineParams = InferToolParams<typeof QUERY_TIMELINE_TOOL>;
export type QueryCausalChainParams = InferToolParams<
  typeof QUERY_CAUSAL_CHAIN_TOOL
>;
export type QueryFactionsParams = InferToolParams<typeof QUERY_FACTIONS_TOOL>;
export type QueryGlobalParams = InferToolParams<typeof QUERY_GLOBAL_TOOL>;
export type RagSearchParams = InferToolParams<typeof RAG_SEARCH_TOOL>;

// Story Memory Query Types
export type QueryStoryParams = InferToolParams<typeof QUERY_STORY_TOOL>;
export type QueryTurnParams = InferToolParams<typeof QUERY_TURN_TOOL>;
export type QuerySummaryParams = InferToolParams<typeof QUERY_SUMMARY_TOOL>;
export type QueryRecentContextParams = InferToolParams<
  typeof QUERY_RECENT_CONTEXT_TOOL
>;

// Control Types
export type NextStageParams = InferToolParams<typeof NEXT_STAGE_TOOL>;

// Finish Turn and Force Update Types
export type FinishTurnParams = z.infer<typeof finishTurnSchema>;
export type ForceUpdateParams = z.infer<typeof forceUpdateSchema>;

// ============================================================================
// TOOL PARAMETER TYPE MAP
// Maps tool names to their parameter types for type-safe tool handling
// ============================================================================

export interface ToolParamsMap {
  // Story Memory Query tools
  query_story: QueryStoryParams;
  query_turn: QueryTurnParams;
  query_summary: QuerySummaryParams;
  query_recent_context: QueryRecentContextParams;

  // Query tools
  query_inventory: QueryInventoryParams;
  query_relationships: QueryRelationshipsParams;
  query_locations: QueryLocationsParams;
  query_quests: QueryQuestsParams;
  query_knowledge: QueryKnowledgeParams;
  query_timeline: QueryTimelineParams;
  query_causal_chain: QueryCausalChainParams;
  query_factions: QueryFactionsParams;
  query_global: QueryGlobalParams;
  query_character_profile: QueryCharacterProfileParams;
  query_character_attributes: QueryCharacterAttributesParams;
  query_character_skills: QueryCharacterSkillsParams;
  query_character_conditions: QueryCharacterConditionsParams;
  query_character_traits: QueryCharacterTraitsParams;
  rag_search: RagSearchParams;

  // Add tools
  add_inventory: AddInventoryParams;
  add_relationship: AddRelationshipParams;
  add_location: AddLocationParams;
  add_quest: AddQuestParams;
  add_knowledge: AddKnowledgeParams;
  add_timeline: AddTimelineParams;
  add_faction: AddFactionParams;
  add_causal_chain: AddCausalChainParams;
  add_character_attribute: AddCharacterAttributeParams;
  add_character_skill: AddCharacterSkillParams;
  add_character_condition: AddCharacterConditionParams;
  add_character_trait: AddCharacterTraitParams;

  // Remove tools
  remove_inventory: RemoveInventoryParams;
  remove_relationship: RemoveRelationshipParams;
  remove_location: RemoveLocationParams;
  remove_quest: RemoveQuestParams;
  remove_faction: RemoveFactionParams;
  remove_character_attribute: RemoveCharacterAttributeParams;
  remove_character_skill: RemoveCharacterSkillParams;
  remove_character_condition: RemoveCharacterConditionParams;
  remove_character_trait: RemoveCharacterTraitParams;

  // Update tools
  update_inventory: UpdateInventoryParams;
  update_relationship: UpdateRelationshipParams;
  update_location: UpdateLocationParams;
  update_quest: UpdateQuestParams;
  complete_quest: CompleteQuestParams;
  fail_quest: FailQuestParams;
  update_knowledge: UpdateKnowledgeParams;
  update_timeline: UpdateTimelineParams;
  update_faction: UpdateFactionParams;
  update_causal_chain: UpdateCausalChainParams;
  trigger_causal_chain: TriggerCausalChainParams;
  resolve_causal_chain: ResolveCausalChainParams;
  interrupt_causal_chain: InterruptCausalChainParams;
  update_world_info: UpdateWorldInfoParams;
  update_global: UpdateGlobalParams;
  update_character_profile: UpdateCharacterProfileParams;
  update_character_attribute: UpdateCharacterAttributeParams;
  update_character_skill: UpdateCharacterSkillParams;
  update_character_condition: UpdateCharacterConditionParams;
  update_character_trait: UpdateCharacterTraitParams;

  // Control tools
  next_stage: NextStageParams;
  finish_turn: FinishTurnParams;
}

export type ToolName = keyof ToolParamsMap;

/**
 * Type-safe helper to get tool parameters
 */
export function getTypedArgs<T extends ToolName>(
  _name: T,
  args: Record<string, unknown>,
): ToolParamsMap[T] {
  return args as ToolParamsMap[T];
}

// ============================================================================
// CHARACTER TOOL PAYLOAD TYPES (for GameDatabase.modify)
// ============================================================================

/**
 * Payload type for character attribute operations
 * Used by GameDatabase.modify("character", action, payload)
 */
export interface CharacterAttributePayload {
  attributes: Array<
    | ({ action: "add" } & AddCharacterAttributeParams)
    | ({ action: "update" } & UpdateCharacterAttributeParams)
    | ({ action: "remove" } & RemoveCharacterAttributeParams)
  >;
}

/**
 * Payload type for character skill operations
 */
export interface CharacterSkillPayload {
  skills: Array<
    | ({ action: "add" } & AddCharacterSkillParams)
    | ({ action: "update" } & UpdateCharacterSkillParams)
    | ({ action: "remove" } & RemoveCharacterSkillParams)
  >;
}

/**
 * Payload type for character condition operations
 */
export interface CharacterConditionPayload {
  conditions: Array<
    | ({ action: "add" } & AddCharacterConditionParams)
    | ({ action: "update" } & UpdateCharacterConditionParams)
    | ({ action: "remove" } & RemoveCharacterConditionParams)
  >;
}

/**
 * Payload type for character trait operations
 */
export interface CharacterTraitPayload {
  hiddenTraits: Array<
    | ({ action: "add" } & AddCharacterTraitParams)
    | ({ action: "update" } & UpdateCharacterTraitParams)
    | ({ action: "remove" } & RemoveCharacterTraitParams)
  >;
}

/**
 * Payload type for character profile operations
 */
export interface CharacterProfilePayload {
  profile: UpdateCharacterProfileParams;
}
