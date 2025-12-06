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
  description: `Search through story history in the current fork. Use this tool when:
- You need to recall what happened earlier in the story
- You're unsure about past events, character interactions, or decisions
- You need to verify consistency with previous narrative
- You want to find specific scenes, dialogues, or descriptions

Returns story segments (narrative text from model or command results) with context.
Supports regex patterns for flexible matching.`,
  parameters: z.object({
    keyword: z
      .string()
      .optional()
      .describe(
        "Search keyword or regex pattern to match in story text. Case-insensitive. Example: 'sword|weapon' or 'dragon.*cave'",
      ),
    location: z
      .string()
      .optional()
      .describe(
        "Filter by location name/regex. Matches against currentLocation field.",
      ),
    inGameTime: z
      .string()
      .optional()
      .describe(
        "Filter by in-game time keyword/regex (e.g., 'Day 3', 'night', 'morning'). Matches against time field.",
      ),
    turnRange: z
      .object({
        start: z.number().optional().describe("Start turn number (inclusive)"),
        end: z.number().optional().describe("End turn number (inclusive)"),
      })
      .optional()
      .describe("Filter by turn number range"),
    order: z
      .enum(["asc", "desc"])
      .optional()
      .describe("Sort order by turn number. Default: 'desc' (newest first)"),
    limit: z
      .number()
      .optional()
      .describe("Maximum number of results to return. Default: 10"),
    page: z
      .number()
      .optional()
      .describe("Page number for pagination (1-indexed). Default: 1"),
    includeContext: z
      .boolean()
      .optional()
      .describe(
        "Include the player action that followed each story segment. Default: true",
      ),
  }),
});

/**
 * Query current turn information.
 * Use this to understand where you are in the story timeline.
 */
export const QUERY_TURN_TOOL = defineTool({
  name: "query_turn",
  description: `Get current fork ID and turn number. Use this to:
- Understand your position in the story timeline
- Know which branch of the story you're in
- Track narrative progress`,
  parameters: z.object({}),
});

/**
 * Query the current story summary.
 * Use this to get an overview of what has happened so far.
 */
export const QUERY_SUMMARY_TOOL = defineTool({
  name: "query_summary",
  description: `Search through OLDER story summaries.

**IMPORTANT**: The LATEST summary is ALREADY in your context (see <story_summary> section). Do NOT query recent summaries - you already have them!

Use this ONLY when:
- You need to recall events from MUCH EARLIER in the story (not recent events)
- You want to trace the evolution of a plot thread across OLD summaries
- You are specifically searching for historical context by keyword

Returns matching summaries with both visible and hidden layers.`,
  parameters: z.object({
    keyword: z
      .string()
      .optional()
      .describe(
        "Search keyword or regex to match in summary text. Searches both visible and hidden layers.",
      ),
    nodeRange: z
      .object({
        start: z.number().optional().describe("Start node index (inclusive)"),
        end: z.number().optional().describe("End node index (inclusive)"),
      })
      .optional()
      .describe("Filter by the node range the summary covers"),
    limit: z
      .number()
      .optional()
      .describe("Maximum number of summaries to return. Default: 5"),
    order: z
      .enum(["asc", "desc"])
      .optional()
      .describe("Sort order. Default: 'desc' (newest first)"),
  }),
});

/**
 * Query recent story context window.
 * Use this to get the most recent exchanges for immediate context.
 */
export const QUERY_RECENT_CONTEXT_TOOL = defineTool({
  name: "query_recent_context",
  description: `Get story segments BEYOND what's in your current context window.

**IMPORTANT**: Recent segments are ALREADY in your context (see <recent_narrative> section). Do NOT query the last ~10 segments - you already have them!

Use this ONLY when:
- You need segments from EARLIER in the story that aren't in <recent_narrative>
- You want to review specific dialogue from 20+ turns ago
- You need to find a specific earlier event by scanning more history

Returns segments (each segment = one node, either player action or narrative response).`,
  parameters: z.object({
    count: z
      .number()
      .optional()
      .describe("Number of recent segments to retrieve. Default: 10, Max: 40"),
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
  description: `Semantic search across the game world. Searches story history, NPCs, locations, items, knowledge, quests, and timeline.

Returns both visible player knowledge and [AI_ONLY] hidden information.

IMPORTANT: Results may include content from different timeline forks or "future" events. Use filters to control scope.`,
  parameters: z.object({
    query: z.string().describe("Natural language search query. Be specific."),
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
      .describe("Filter by entity types. Matches DocumentType enum."),
    topK: z.number().optional().describe("Max results. Default: 5."),
    currentForkOnly: z
      .boolean()
      .optional()
      .describe("Only search current timeline branch."),
    beforeCurrentTurn: z
      .boolean()
      .optional()
      .describe("Only search content before current turn."),
  }),
});

// ============================================================================
// ADD TOOLS (Stage 2)
// ============================================================================

export const ADD_INVENTORY_TOOL = defineTool({
  name: "add_inventory",
  description: "Add a new item to the player's inventory.",
  parameters: z.object({
    id: z
      .string()
      .optional()
      .describe("Item ID (inv:N). Auto-generated if omitted."),
    name: z.string().describe("Item name. REQUIRED."),
    visible: inventoryItemVisibleSchema
      .partial()
      .optional()
      .describe("Visible properties (description, notes)."),
    hidden: inventoryItemHiddenSchema
      .partial()
      .optional()
      .describe("Hidden properties (truth, secrets). AI/GM only."),
    lore: z.string().optional().describe("Brief lore/history."),
    icon: z.string().optional().describe("Emoji icon."),
  }),
});

export const ADD_RELATIONSHIP_TOOL = defineTool({
  name: "add_relationship",
  description: "Add a new NPC to the game world.",
  parameters: z.object({
    id: z
      .string()
      .optional()
      .describe("NPC ID (npc:N). Auto-generated if omitted."),
    name: z.string().describe("NPC name. REQUIRED."),
    currentLocation: z
      .string()
      .optional()
      .describe("NPC's location ID (loc:N)."),
    known: z
      .boolean()
      .optional()
      .describe("Player knows this NPC? Default: true."),
    visible: relationshipVisibleSchema
      .partial()
      .optional()
      .describe("Visible properties (role, status, impression)."),
    hidden: relationshipHiddenSchema
      .partial()
      .optional()
      .describe("Hidden properties. AI/GM only."),
    notes: z.string().optional().describe("NPC's observations of player."),
    icon: z.string().optional().describe("Emoji icon."),
  }),
});

export const ADD_LOCATION_TOOL = defineTool({
  name: "add_location",
  description: "Add a new location to the world map.",
  parameters: z.object({
    id: z
      .string()
      .optional()
      .describe("Location ID (loc:N). Auto-generated if omitted."),
    name: z.string().describe("Location name. REQUIRED."),
    visible: locationVisibleSchema
      .partial()
      .optional()
      .describe("Visible properties (description, connections)."),
    hidden: locationHiddenSchema
      .partial()
      .optional()
      .describe("Hidden properties (secrets). AI/GM only."),
    environment: z
      .string()
      .optional()
      .describe("Atmosphere description in target language."),
    isVisited: z
      .boolean()
      .optional()
      .describe("Has been visited? Default: false."),
    unlocked: z
      .boolean()
      .optional()
      .describe("Secrets discovered? Default: false."),
    unlockReason: z
      .string()
      .optional()
      .describe(
        "When setting unlocked=true, provide a concise justification/evidence string.",
      ),
    icon: z.string().optional().describe("Emoji icon."),
  }),
});

export const ADD_QUEST_TOOL = defineTool({
  name: "add_quest",
  description: "Add a new quest.",
  parameters: z.object({
    id: z
      .string()
      .optional()
      .describe("Quest ID (quest:N). Auto-generated if omitted."),
    title: z.string().describe("Quest title. REQUIRED."),
    type: questTypeSchema
      .optional()
      .describe("Quest type (main, side, hidden)."),
    visible: questVisibleSchema
      .partial()
      .optional()
      .describe("Visible properties (description, objectives, rewards)."),
    hidden: questHiddenSchema
      .partial()
      .optional()
      .describe("Hidden properties. AI/GM only."),
    icon: z.string().optional().describe("Emoji icon."),
  }),
});

export const ADD_KNOWLEDGE_TOOL = defineTool({
  name: "add_knowledge",
  description: "Add a new knowledge/lore entry.",
  parameters: z.object({
    id: z
      .string()
      .optional()
      .describe("Knowledge ID (know:N). Auto-generated if omitted."),
    title: z.string().describe("Title. REQUIRED."),
    category: knowledgeCategorySchema.optional().describe("Category."),
    visible: knowledgeVisibleSchema
      .partial()
      .optional()
      .describe("What the player knows."),
    hidden: knowledgeHiddenSchema
      .partial()
      .optional()
      .describe("The full truth. AI/GM only."),
    discoveredAt: z
      .string()
      .optional()
      .describe("When discovered (game time)."),
    relatedTo: z.array(z.string()).optional().describe("Related entity IDs."),
    icon: z.string().optional().describe("Emoji icon."),
  }),
});

export const ADD_TIMELINE_TOOL = defineTool({
  name: "add_timeline",
  description: "Add a new timeline event.",
  parameters: z.object({
    id: z
      .string()
      .optional()
      .describe("Event ID (evt:N). Auto-generated if omitted."),
    gameTime: z.string().optional().describe("When the event happened."),
    category: timelineEventCategorySchema
      .optional()
      .describe("Event category."),
    visible: timelineEventVisibleSchema
      .optional()
      .describe("What the player knows."),
    hidden: timelineEventHiddenSchema
      .optional()
      .describe("True cause/secrets. AI/GM only."),
    involvedEntities: z
      .array(z.string())
      .optional()
      .describe("Involved entity IDs."),
    chainId: z.string().optional().describe("Link to CausalChain (chain:N)."),
    known: z
      .boolean()
      .optional()
      .describe("Player knows about this? Default: true."),
    icon: z.string().optional().describe("Emoji icon."),
  }),
});

export const ADD_FACTION_TOOL = defineTool({
  name: "add_faction",
  description: "Add a new faction/power group.",
  parameters: z.object({
    id: z
      .string()
      .optional()
      .describe("Faction ID (fac:N). Auto-generated if omitted."),
    name: z.string().describe("Faction name. REQUIRED."),
    visible: z
      .object({
        agenda: z.string().optional().describe("Public agenda."),
        members: z
          .array(factionMemberSchema)
          .optional()
          .describe("Public members."),
        influence: z.string().optional().describe("Perceived influence."),
        relations: z
          .array(factionRelationSchema)
          .optional()
          .describe("Public alliances."),
      })
      .optional()
      .describe("Public information."),
    hidden: z
      .object({
        agenda: z.string().optional().describe("Secret agenda."),
        members: z
          .array(factionMemberSchema)
          .optional()
          .describe("Secret members."),
        influence: z.string().optional().describe("True influence."),
        relations: z
          .array(factionRelationSchema)
          .optional()
          .describe("Secret alliances."),
      })
      .optional()
      .describe("Secret information. AI/GM only."),
    icon: z.string().optional().describe("Emoji icon."),
  }),
});

export const ADD_CAUSAL_CHAIN_TOOL = defineTool({
  name: "add_causal_chain",
  description: "Create a new causal chain with potential future consequences.",
  parameters: z.object({
    chainId: z.string().describe("Chain ID (chain:N). REQUIRED."),
    rootCause: z
      .object({
        eventId: z.string().describe("ID of root cause event."),
        description: z.string().describe("Description of root cause."),
      })
      .describe("The initiating event. REQUIRED."),
    status: causalChainStatusSchema.optional().describe("Chain status."),
    pendingConsequences: z
      .array(
        z.object({
          id: z.string().describe("Consequence ID (conseq:N)."),
          description: z.string().describe("What could happen."),
          readyAfterTurn: z
            .number()
            .int()
            .describe("Can trigger after this turn."),
          conditions: z
            .array(z.string())
            .optional()
            .describe("Trigger conditions."),
          known: z
            .boolean()
            .optional()
            .describe("Player will know? Default: false."),
        }),
      )
      .optional()
      .describe("Future consequences."),
  }),
});

// Character Add Tools
export const ADD_CHARACTER_ATTRIBUTE_TOOL = defineTool({
  name: "add_character_attribute",
  description: "Add a new numeric attribute to the character.",
  parameters: z.object({
    name: z.string().describe("Attribute name (e.g., Health, Mana). REQUIRED."),
    value: z.number().int().describe("Current value. REQUIRED."),
    maxValue: z.number().int().optional().describe("Maximum value."),
    color: attributeColorSchema.optional().describe("Display color."),
  }),
});

export const ADD_CHARACTER_SKILL_TOOL = defineTool({
  name: "add_character_skill",
  description: "Add a new skill to the character.",
  parameters: z.object({
    id: z
      .string()
      .optional()
      .describe("Skill ID (skill:N). Auto-generated if omitted."),
    name: z.string().describe("Skill name. REQUIRED."),
    level: z
      .string()
      .optional()
      .describe("Skill level (e.g., Novice, Master)."),
    visible: skillVisibleSchema
      .partial()
      .optional()
      .describe("Visible properties."),
    hidden: skillHiddenSchema
      .partial()
      .optional()
      .describe("Hidden properties."),
    category: z.string().optional().describe("Skill category."),
    icon: z.string().optional().describe("Emoji icon."),
  }),
});

export const ADD_CHARACTER_CONDITION_TOOL = defineTool({
  name: "add_character_condition",
  description: "Add a new condition (buff/debuff) to the character.",
  parameters: z.object({
    id: z
      .string()
      .optional()
      .describe("Condition ID (cond:N). Auto-generated if omitted."),
    name: z.string().describe("Condition name. REQUIRED."),
    type: conditionTypeSchema.optional().describe("Condition type."),
    visible: conditionVisibleSchema
      .partial()
      .optional()
      .describe("Visible properties."),
    hidden: conditionHiddenSchema
      .partial()
      .optional()
      .describe("Hidden properties."),
    effects: z
      .object({
        visible: z.array(z.string()).optional(),
        hidden: z.array(z.string()).optional(),
      })
      .optional()
      .describe("Condition effects."),
    duration: z.number().int().optional().describe("Duration in turns."),
    icon: z.string().optional().describe("Emoji icon."),
  }),
});

export const ADD_CHARACTER_TRAIT_TOOL = defineTool({
  name: "add_character_trait",
  description: "Add a new hidden personality trait to the character.",
  parameters: z.object({
    id: z
      .string()
      .optional()
      .describe("Trait ID (trait:N). Auto-generated if omitted."),
    name: z.string().describe("Trait name. REQUIRED."),
    description: z.string().optional().describe("Trait description."),
    effects: z.array(z.string()).optional().describe("Trait effects."),
    triggerConditions: z
      .array(z.string())
      .optional()
      .describe("Trigger conditions."),
  }),
});

// ============================================================================
// REMOVE TOOLS (Stage 3)
// ============================================================================

export const REMOVE_INVENTORY_TOOL = defineTool({
  name: "remove_inventory",
  description: "Remove an item from the player's inventory.",
  parameters: z.object({
    id: z.string().describe("Item ID (inv:N). REQUIRED."),
  }),
});

export const REMOVE_RELATIONSHIP_TOOL = defineTool({
  name: "remove_relationship",
  description: "Remove an NPC from the game world.",
  parameters: z.object({
    id: z.string().describe("NPC ID (npc:N). REQUIRED."),
  }),
});

export const REMOVE_LOCATION_TOOL = defineTool({
  name: "remove_location",
  description: "Remove a location from the world map.",
  parameters: z.object({
    id: z.string().describe("Location ID (loc:N). REQUIRED."),
  }),
});

export const REMOVE_QUEST_TOOL = defineTool({
  name: "remove_quest",
  description: "Remove a quest.",
  parameters: z.object({
    id: z.string().describe("Quest ID (quest:N). REQUIRED."),
  }),
});

export const REMOVE_FACTION_TOOL = defineTool({
  name: "remove_faction",
  description: "Remove a faction.",
  parameters: z.object({
    id: z.string().describe("Faction ID (fac:N). REQUIRED."),
  }),
});

export const REMOVE_CHARACTER_ATTRIBUTE_TOOL = defineTool({
  name: "remove_character_attribute",
  description: "Remove an attribute from the character.",
  parameters: z.object({
    name: z.string().describe("Attribute name. REQUIRED."),
  }),
});

export const REMOVE_CHARACTER_SKILL_TOOL = defineTool({
  name: "remove_character_skill",
  description: "Remove a skill. REQUIRED: id OR name (at least one).",
  parameters: z.object({
    id: z.string().optional().describe("Skill ID (skill:N)."),
    name: z.string().optional().describe("Skill name."),
  }),
});

export const REMOVE_CHARACTER_CONDITION_TOOL = defineTool({
  name: "remove_character_condition",
  description: "Remove a condition. REQUIRED: id OR name (at least one).",
  parameters: z.object({
    id: z.string().optional().describe("Condition ID (cond:N)."),
    name: z.string().optional().describe("Condition name."),
  }),
});

export const REMOVE_CHARACTER_TRAIT_TOOL = defineTool({
  name: "remove_character_trait",
  description: "Remove a hidden trait. REQUIRED: id OR name (at least one).",
  parameters: z.object({
    id: z.string().optional().describe("Trait ID (trait:N)."),
    name: z
      .string()
      .optional()
      .describe("Trait name. Either id or name required."),
  }),
});

// ============================================================================
// UPDATE TOOLS (Stage 4)
// ============================================================================

export const UPDATE_INVENTORY_TOOL = defineTool({
  name: "update_inventory",
  description:
    "Update an existing inventory item. Omit fields to keep unchanged, set to null to delete.",
  parameters: z.object({
    id: z.string().describe("Item ID (inv:N). REQUIRED."),
    name: z.string().nullish().describe("Updated name."),
    visible: inventoryItemVisibleSchema
      .partial()
      .nullish()
      .describe("Visible properties. Null fields are deleted."),
    hidden: inventoryItemHiddenSchema
      .partial()
      .nullish()
      .describe("Hidden properties. Null fields are deleted."),
    lore: z.string().nullish().describe("Lore. Null to remove."),
    icon: z.string().nullish().describe("Icon. Null to remove."),
  }),
});

export const UPDATE_RELATIONSHIP_TOOL = defineTool({
  name: "update_relationship",
  description:
    "Update an existing NPC. Omit fields to keep unchanged, set to null to delete.",
  parameters: z.object({
    id: z.string().describe("NPC ID (npc:N). REQUIRED."),
    name: z.string().nullish().describe("Updated name."),
    currentLocation: z
      .string()
      .nullish()
      .describe("Location ID. Null to clear."),
    known: z.boolean().nullish().describe("Player knows this NPC?"),
    visible: relationshipVisibleSchema
      .partial()
      .nullish()
      .describe("Visible properties. Null fields are deleted."),
    hidden: relationshipHiddenSchema
      .partial()
      .nullish()
      .describe("Hidden properties. Null fields are deleted."),
    notes: z.string().nullish().describe("Notes. Null to clear."),
    icon: z.string().nullish().describe("Icon. Null to remove."),
  }),
});

export const UPDATE_LOCATION_TOOL = defineTool({
  name: "update_location",
  description:
    "Update an existing location. Omit fields to keep unchanged, set to null to delete.",
  parameters: z.object({
    id: z.string().describe("Location ID (loc:N). REQUIRED."),
    name: z.string().nullish().describe("Updated name."),
    visible: locationVisibleSchema
      .partial()
      .nullish()
      .describe("Visible properties. Null fields are deleted."),
    hidden: locationHiddenSchema
      .partial()
      .nullish()
      .describe("Hidden properties. Null fields are deleted."),
    environment: z.string().nullish().describe("Environment. Null to remove."),
    isVisited: z.boolean().nullish().describe("Has been visited?"),
    icon: z.string().nullish().describe("Icon. Null to remove."),
  }),
});

export const UPDATE_QUEST_TOOL = defineTool({
  name: "update_quest",
  description:
    "Update an existing quest. Omit fields to keep unchanged, set to null to delete.",
  parameters: z.object({
    id: z.string().describe("Quest ID (quest:N). REQUIRED."),
    title: z.string().nullish().describe("Updated title."),
    type: questTypeSchema.nullish().describe("Quest type."),
    visible: questVisibleSchema
      .partial()
      .nullish()
      .describe("Visible properties. Null fields are deleted."),
    hidden: questHiddenSchema
      .partial()
      .nullish()
      .describe("Hidden properties. Null fields are deleted."),
    icon: z.string().nullish().describe("Icon. Null to remove."),
  }),
});

export const COMPLETE_QUEST_TOOL = defineTool({
  name: "complete_quest",
  description: "Mark a quest as completed.",
  parameters: z.object({
    id: z.string().describe("Quest ID (quest:N). REQUIRED."),
  }),
});

export const FAIL_QUEST_TOOL = defineTool({
  name: "fail_quest",
  description: "Mark a quest as failed.",
  parameters: z.object({
    id: z.string().describe("Quest ID (quest:N). REQUIRED."),
  }),
});

export const UPDATE_KNOWLEDGE_TOOL = defineTool({
  name: "update_knowledge",
  description:
    "Update an existing knowledge entry. Omit fields to keep unchanged, set to null to delete.",
  parameters: z.object({
    id: z.string().describe("Knowledge ID (know:N). REQUIRED."),
    title: z.string().nullish().describe("Updated title."),
    category: knowledgeCategorySchema.nullish().describe("Category."),
    visible: knowledgeVisibleSchema
      .partial()
      .nullish()
      .describe("Visible properties. Null fields are deleted."),
    hidden: knowledgeHiddenSchema
      .partial()
      .nullish()
      .describe("Hidden properties. Null fields are deleted."),
    discoveredAt: z
      .string()
      .nullish()
      .describe("When discovered. Null to clear."),
    relatedTo: z
      .array(z.string())
      .nullish()
      .describe("Related IDs. Null to clear."),
    icon: z.string().nullish().describe("Icon. Null to remove."),
  }),
});

export const UPDATE_TIMELINE_TOOL = defineTool({
  name: "update_timeline",
  description:
    "Update an existing timeline event. Omit fields to keep unchanged, set to null to delete.",
  parameters: z.object({
    id: z.string().describe("Event ID (evt:N). REQUIRED."),
    gameTime: z.string().nullish().describe("When it happened. Null to clear."),
    category: timelineEventCategorySchema.nullish().describe("Category."),
    visible: timelineEventVisibleSchema
      .nullish()
      .describe("Visible info. Null to clear."),
    hidden: timelineEventHiddenSchema
      .nullish()
      .describe("Hidden info. Null to clear."),
    involvedEntities: z
      .array(z.string())
      .nullish()
      .describe("Involved IDs. Null to clear."),
    chainId: z.string().nullish().describe("CausalChain link. Null to unlink."),
    known: z.boolean().nullish().describe("Player knows?"),
    icon: z.string().nullish().describe("Icon. Null to remove."),
  }),
});

export const UPDATE_FACTION_TOOL = defineTool({
  name: "update_faction",
  description:
    "Update an existing faction. Omit fields to keep unchanged, set to null to delete.",
  parameters: z.object({
    id: z.string().describe("Faction ID (fac:N). REQUIRED."),
    name: z.string().nullish().describe("Updated name."),
    visible: z
      .object({
        agenda: z.string().nullish().describe("Public agenda. Null to clear."),
        members: z
          .array(factionMemberSchema)
          .nullish()
          .describe("Public members. Null to clear."),
        influence: z
          .string()
          .nullish()
          .describe("Perceived influence. Null to clear."),
        relations: z
          .array(factionRelationSchema)
          .nullish()
          .describe("Public relations. Null to clear."),
      })
      .nullish()
      .describe("Public information. Null to clear all."),
    hidden: z
      .object({
        agenda: z.string().nullish().describe("Secret agenda. Null to clear."),
        members: z
          .array(factionMemberSchema)
          .nullish()
          .describe("Secret members. Null to clear."),
        influence: z
          .string()
          .nullish()
          .describe("True influence. Null to clear."),
        relations: z
          .array(factionRelationSchema)
          .nullish()
          .describe("Secret relations. Null to clear."),
      })
      .nullish()
      .describe("Secret information. Null to clear all."),
    icon: z.string().nullish().describe("Icon. Null to remove."),
  }),
});

export const UPDATE_CAUSAL_CHAIN_TOOL = defineTool({
  name: "update_causal_chain",
  description:
    "Update a causal chain. Omit fields to keep unchanged, set to null to delete.",
  parameters: z.object({
    chainId: z.string().describe("Chain ID (chain:N). REQUIRED."),
    status: causalChainStatusSchema.nullish().describe("Chain status."),
    pendingConsequences: z
      .array(
        z.object({
          id: z.string().describe("Consequence ID."),
          description: z.string().describe("What could happen."),
          readyAfterTurn: z
            .number()
            .int()
            .describe("Can trigger after this turn."),
          conditions: z
            .array(z.string())
            .optional()
            .describe("Trigger conditions."),
          known: z.boolean().optional().describe("Player will know?"),
        }),
      )
      .nullish()
      .describe("Pending consequences. Null to clear all."),
  }),
});

export const TRIGGER_CAUSAL_CHAIN_TOOL = defineTool({
  name: "trigger_causal_chain",
  description:
    "Trigger a pending consequence NOW. You MUST narrate this in your response.",
  parameters: z.object({
    chainId: z.string().describe("Chain ID (chain:N). REQUIRED."),
    consequenceId: z.string().describe("Consequence ID to trigger. REQUIRED."),
  }),
});

export const RESOLVE_CAUSAL_CHAIN_TOOL = defineTool({
  name: "resolve_causal_chain",
  description: "Mark a causal chain as resolved (story arc complete).",
  parameters: z.object({
    chainId: z.string().describe("Chain ID (chain:N). REQUIRED."),
  }),
});

export const INTERRUPT_CAUSAL_CHAIN_TOOL = defineTool({
  name: "interrupt_causal_chain",
  description: "Interrupt a causal chain (circumstances prevent continuation).",
  parameters: z.object({
    chainId: z.string().describe("Chain ID (chain:N). REQUIRED."),
  }),
});

export const UPDATE_WORLD_INFO_TOOL = defineTool({
  name: "update_world_info",
  description:
    "Reveal hidden world secrets to the player. Only use at significant story milestones.",
  parameters: z.object({
    unlockWorldSetting: z
      .boolean()
      .optional()
      .describe("Reveal hidden world setting information."),
    unlockMainGoal: z
      .boolean()
      .optional()
      .describe("Reveal the true nature of the main objective."),
    reason: z.string().describe("WHY this is being revealed. REQUIRED."),
  }),
});

export const UPDATE_GLOBAL_TOOL = defineTool({
  name: "update_global",
  description: "Update global game state (time, atmosphere).",
  parameters: z.object({
    time: z.string().nullish().describe("In-game time. Null to clear."),
    atmosphere: atmosphereSchema
      .nullish()
      .describe("Atmosphere settings. Null to reset to default."),
  }),
});

// Character Update Tools
export const UPDATE_CHARACTER_PROFILE_TOOL = defineTool({
  name: "update_character_profile",
  description:
    "Update character's basic profile. Omit fields to keep unchanged, set to null to clear.",
  parameters: z.object({
    name: z.string().nullish().describe("Character name. Null to clear."),
    title: z.string().nullish().describe("Title/role/class. Null to clear."),
    currentLocation: z
      .string()
      .nullish()
      .describe("Current location. Null to clear."),
    status: z
      .string()
      .nullish()
      .describe("Condition (Healthy, Injured). Null to clear."),
    appearance: z
      .string()
      .nullish()
      .describe("Physical appearance. Null to clear."),
    age: z.string().nullish().describe("Age. Null to clear."),
    profession: z
      .string()
      .nullish()
      .describe("Profession/occupation. Null to clear."),
    background: z
      .string()
      .nullish()
      .describe("Background story. Null to clear."),
    race: z.string().nullish().describe("Race (Human, Elf). Null to clear."),
  }),
});

export const UPDATE_CHARACTER_ATTRIBUTE_TOOL = defineTool({
  name: "update_character_attribute",
  description:
    "Update a character attribute. Omit fields to keep unchanged, set to null to remove.",
  parameters: z.object({
    name: z.string().describe("Attribute name. REQUIRED."),
    value: z.number().int().nullish().describe("New value. Null to remove."),
    maxValue: z.number().int().nullish().describe("Max value. Null to remove."),
    color: attributeColorSchema
      .nullish()
      .describe("Display color. Null to remove."),
  }),
});

export const UPDATE_CHARACTER_SKILL_TOOL = defineTool({
  name: "update_character_skill",
  description:
    "Update a character skill. Omit fields to keep unchanged, set to null to remove.",
  parameters: z.object({
    id: z.string().optional().describe("Skill ID (skill:N)."),
    name: z
      .string()
      .optional()
      .describe("Skill name. Either id or name required."),
    level: z.string().nullish().describe("Skill level. Null to remove."),
    visible: skillVisibleSchema
      .partial()
      .nullish()
      .describe("Visible properties. Null to clear."),
    hidden: skillHiddenSchema
      .partial()
      .nullish()
      .describe("Hidden properties. Null to clear."),
    category: z.string().nullish().describe("Category. Null to remove."),
    icon: z.string().nullish().describe("Icon. Null to remove."),
  }),
});

export const UPDATE_CHARACTER_CONDITION_TOOL = defineTool({
  name: "update_character_condition",
  description:
    "Update a character condition. Omit fields to keep unchanged, set to null to remove.",
  parameters: z.object({
    id: z.string().optional().describe("Condition ID (cond:N)."),
    name: z
      .string()
      .optional()
      .describe("Condition name. Either id or name required."),
    type: conditionTypeSchema
      .nullish()
      .describe("Condition type. Null to remove."),
    visible: conditionVisibleSchema
      .partial()
      .nullish()
      .describe("Visible properties. Null to clear."),
    hidden: conditionHiddenSchema
      .partial()
      .nullish()
      .describe("Hidden properties. Null to clear."),
    effects: z
      .object({
        visible: z.array(z.string()).nullish(),
        hidden: z.array(z.string()).nullish(),
      })
      .nullish()
      .describe("Effects. Null to clear."),
    duration: z
      .number()
      .int()
      .nullish()
      .describe("Duration in turns. Null to remove."),
    icon: z.string().nullish().describe("Icon. Null to remove."),
  }),
});

export const UPDATE_CHARACTER_TRAIT_TOOL = defineTool({
  name: "update_character_trait",
  description:
    "Update a character hidden trait. Omit fields to keep unchanged, set to null to remove.",
  parameters: z.object({
    id: z.string().optional().describe("Trait ID (trait:N)."),
    name: z
      .string()
      .optional()
      .describe("Trait name. Either id or name required."),
    description: z.string().nullish().describe("Description. Null to remove."),
    effects: z.array(z.string()).nullish().describe("Effects. Null to clear."),
    triggerConditions: z
      .array(z.string())
      .nullish()
      .describe("Trigger conditions. Null to clear."),
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
  description: `Unlock hidden information for an entity. Use this tool when the player has DEFINITIVELY discovered a hidden truth through concrete actions or revelations.

STRICT REQUIREMENTS:
1. Player must have obtained DEFINITIVE PROOF (not just suspicion or hints)
2. The revelation must be COMPLETE (not partial)
3. The player character must LOGICALLY know this now
4. Provide a clear justification in the 'reason' field

Examples of valid unlock scenarios:
- Found a signed confession letter → unlock NPC's hidden motives
- NPC explicitly confessed during interrogation → unlock NPC's secrets
- Triggered and observed a trap mechanism → unlock location's hidden dangers
- Completed investigation quest → unlock quest's true objectives

DO NOT unlock just because:
- Player suspects something (suspicion ≠ proof)
- It would be dramatic (drama ≠ discovery)
- The AI knows the truth (GM knowledge ≠ player discovery)`,
  parameters: z.object({
    category: unlockEntityCategorySchema.describe(
      "Entity category to unlock. REQUIRED.",
    ),
    id: z
      .string()
      .optional()
      .describe(
        "Entity ID (e.g., inv:1, npc:2, loc:3). Either id or name required.",
      ),
    name: z
      .string()
      .optional()
      .describe("Entity name. Either id or name required."),
    reason: z
      .string()
      .describe(
        "REQUIRED. Concise justification describing the exact evidence the player obtained.",
      ),
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
  description: `Proceed to the next stage or jump to a specific stage.

Stages: QUERY -> ADD -> REMOVE -> UPDATE -> NARRATIVE

You can:
1. Call without target to advance to the next stage
2. Specify a target stage to jump directly (forward jumps recommended)
3. Skip stages you don't need

Alternatively, you can call finish_turn at ANY stage to complete the turn immediately.`,
  parameters: z.object({
    target: agentStageSchema
      .optional()
      .describe(
        "Target stage to jump to. If omitted, advances to next stage in sequence.",
      ),
  }),
});

export const FINISH_TURN_TOOL = defineTool({
  name: "finish_turn",
  description: `End the turn and generate the final narrative response. Only available in NARRATIVE stage.

**⚠️ CRITICAL - NO GAME IDs IN OUTPUT**:
NEVER include internal game IDs in narrative, choices, or imagePrompt!
- ❌ FORBIDDEN: "inv:1", "npc:2", "loc:3", etc.
- ✅ CORRECT: Use actual NAMES like "Iron Sword", "Elder Marcus"`,
  parameters: finishTurnSchema,
});

export const COMPLETE_FORCE_UPDATE_TOOL = defineTool({
  name: "complete_force_update",
  description:
    "Complete a force update (sudo command). For direct interventions only.",
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
