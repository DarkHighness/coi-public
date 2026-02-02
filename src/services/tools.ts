/**
 * ============================================================================
 * Tool Definitions - 分阶段工具定义
 * ============================================================================
 *
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
  npcVisibleSchema,
  npcHiddenSchema,
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
  overrideOutlineSchema,
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
  description:
    "Search story history. Supports regex, location/time filters, pagination.",
  parameters: z.object({
    keyword: z
      .string()
      .optional()
      .describe("Regex pattern (e.g., 'fire.*sword'). NO 'x or y' patterns."),
    location: z
      .string()
      .optional()
      .describe("Location regex. NO 'x or y' patterns."),
    inGameTime: z
      .string()
      .optional()
      .describe("Time regex (e.g., 'Day 3', 'night'). NO 'x or y' patterns."),
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
    includeContext: z
      .boolean()
      .optional()
      .describe("Include following player action."),
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
  description:
    "Search OLDER summaries (latest already in context). Use for events from much earlier.",
  parameters: z.object({
    keyword: z
      .string()
      .optional()
      .describe(
        "Regex pattern (e.g., 'battle.*dragon'). NO 'x or y' patterns.",
      ),
    nodeRange: z
      .object({
        start: z.number().optional(),
        end: z.number().optional(),
      })
      .optional()
      .describe("Filter by node range."),
    limit: z.number().optional().describe("Max results. Default: 5."),
    page: z.number().optional().describe("Page number. Default: 1."),
    order: z.enum(["asc", "desc"]).optional().describe("Default: 'desc'."),
  }),
});

/**
 * Query recent story context window.
 * Use this to get the most recent exchanges for immediate context.
 */
export const QUERY_RECENT_CONTEXT_TOOL = defineTool({
  name: "query_recent_context",
  description:
    "Get segments BEYOND current context window. Recent ~10 already in context.",
  parameters: z.object({
    count: z
      .number()
      .optional()
      .describe("Number of segments. Default: 10, Max: 20."),
    page: z.number().optional().describe("Page number (1-indexed)."),
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
      .describe("Name, ID, or regex. NO 'x or y' patterns. Omit to list all."),
    limit: z.number().optional().describe("Max results. Default: 20."),
    page: z.number().optional().describe("Page number (1-indexed)."),
  }),
});

export const QUERY_NPCS_TOOL = defineTool({
  name: "query_npcs",
  description: "Recall details about NPCs the player has met.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe("Name, ID, or regex. NO 'x or y' patterns. Omit to list all."),
    limit: z.number().optional().describe("Max results. Default: 20."),
    page: z.number().optional().describe("Page number (1-indexed)."),
  }),
});

export const QUERY_LOCATIONS_TOOL = defineTool({
  name: "query_locations",
  description: "Recall details about known locations.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe("Name, ID, or regex. NO 'x or y' patterns. Omit to list all."),
    limit: z.number().optional().describe("Max results. Default: 20."),
    page: z.number().optional().describe("Page number (1-indexed)."),
  }),
});

export const QUERY_QUESTS_TOOL = defineTool({
  name: "query_quests",
  description: "Query active and completed quests.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe("Title, ID, or regex. NO 'x or y' patterns. Omit to list all."),
    status: z
      .enum(["active", "completed", "failed", "all"])
      .nullish()
      .describe("Filter by status. Default: 'active'."),
    limit: z.number().optional().describe("Max results. Default: 20."),
    page: z.number().optional().describe("Page number (1-indexed)."),
  }),
});

export const QUERY_KNOWLEDGE_TOOL = defineTool({
  name: "query_knowledge",
  description: "Query accumulated knowledge/lore.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe("Title, ID, or regex. NO 'x or y' patterns. Omit to list all."),
    category: knowledgeCategorySchema.nullish().describe("Filter by category."),
    limit: z.number().optional().describe("Max results. Default: 20."),
    page: z.number().optional().describe("Page number (1-indexed)."),
  }),
});

export const QUERY_TIMELINE_TOOL = defineTool({
  name: "query_timeline",
  description: "Query world timeline and history.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe(
        "Regex, ID, or category. NO 'x or y' patterns. Omit for recent events.",
      ),
    limit: z.number().optional().describe("Max results. Default: 20."),
    page: z.number().optional().describe("Page number (1-indexed)."),
  }),
});

export const QUERY_CAUSAL_CHAIN_TOOL = defineTool({
  name: "query_causal_chain",
  description: "Query active causal chains.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe("Regex or ID. NO 'x or y' patterns. Omit to list all."),
    limit: z.number().optional().describe("Max results. Default: 20."),
    page: z.number().optional().describe("Page number (1-indexed)."),
  }),
});

export const QUERY_FACTIONS_TOOL = defineTool({
  name: "query_factions",
  description: "Query major factions and power groups.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe("Name, ID, or regex. NO 'x or y' patterns. Omit to list all."),
    limit: z.number().optional().describe("Max results. Default: 20."),
    page: z.number().optional().describe("Page number (1-indexed)."),
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

/**
 * Query available atmosphere enums.
 * Use this when you need to know the valid values for envTheme, ambience, or weather.
 */
export const QUERY_ATMOSPHERE_ENUMS_TOOL = defineTool({
  name: "query_atmosphere_enums",
  description:
    "Get available enums for atmosphere (envTheme, ambience, weather). Use this to see valid options before setting atmosphere.",
  parameters: z.object({
    categories: z
      .array(z.enum(["envTheme", "ambience", "weather"]))
      .optional()
      .describe("Enum categories to query. Omit to query all."),
  }),
});

/**
 * Query descriptions for specific atmosphere enums.
 * Use this to understand the visual or audio effect of specific options.
 */
export const QUERY_ATMOSPHERE_ENUM_DESCRIPTION_TOOL = defineTool({
  name: "query_atmosphere_enum_description",
  description:
    "Get detailed descriptions for specific atmosphere values to help choose the best aesthetic or audio match.",
  parameters: z.object({
    items: z
      .array(
        z.object({
          category: z.enum(["envTheme", "ambience", "weather"]),
          value: z.string().describe("The specific enum value to describe."),
        }),
      )
      .describe("List of items to query descriptions for."),
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
    limit: z.number().optional().describe("Max results. Default: 20."),
    page: z.number().optional().describe("Page number (1-indexed)."),
  }),
});

export const QUERY_CHARACTER_SKILLS_TOOL = defineTool({
  name: "query_character_skills",
  description: "Query character's skills.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe(
        "Skill name, ID, or regex. NO 'x or y' patterns. Omit to list all.",
      ),
    limit: z.number().optional().describe("Max results. Default: 20."),
    page: z.number().optional().describe("Page number (1-indexed)."),
  }),
});

export const QUERY_CHARACTER_CONDITIONS_TOOL = defineTool({
  name: "query_character_conditions",
  description: "Query character's conditions (buffs/debuffs).",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe(
        "Condition name, ID, or regex. NO 'x or y' patterns. Omit to list all.",
      ),
    limit: z.number().optional().describe("Max results. Default: 20."),
    page: z.number().optional().describe("Page number (1-indexed)."),
  }),
});

export const QUERY_CHARACTER_TRAITS_TOOL = defineTool({
  name: "query_character_traits",
  description: "Query character's hidden personality traits.",
  parameters: z.object({
    query: z
      .string()
      .nullish()
      .describe(
        "Trait name, ID, or regex. NO 'x or y' patterns. Omit to list all.",
      ),
    limit: z.number().optional().describe("Max results. Default: 20."),
    page: z.number().optional().describe("Page number (1-indexed)."),
  }),
});

// RAG Search Tool
// DocumentType from rag/types.ts: "story" | "npc" | "location" | "item" | "knowledge" | "quest" | "event" | "outline"
export const RAG_SEARCH_TOOL = defineTool({
  name: "rag_search",
  description:
    "Semantic search for long-term memory retrieval. Use when re-encountering entities, checking lore/history, or verifying facts not in immediate context.",
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
// VFS TOOLS (Virtual File System)
// ============================================================================

const vfsPathSchema = z
  .string()
  .describe("VFS path (leading/trailing slashes are ok).");
const vfsOptionalPathSchema = vfsPathSchema
  .nullish()
  .describe("Optional VFS path (omit or null for root).");

const vfsFilePathSchema = vfsPathSchema.min(1, "Path is required.");

const vfsContentTypeSchema = z.enum(["application/json", "text/plain"]);

const vfsJsonPatchOpSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("add"),
      path: z.string().describe("JSON Pointer path."),
      value: z.unknown().describe("Value for add."),
      from: z.string().optional().describe("Ignored for add."),
    })
    .strict(),
  z
    .object({
      op: z.literal("replace"),
      path: z.string().describe("JSON Pointer path."),
      value: z.unknown().describe("Value for replace."),
      from: z.string().optional().describe("Ignored for replace."),
    })
    .strict(),
  z
    .object({
      op: z.literal("test"),
      path: z.string().describe("JSON Pointer path."),
      value: z.unknown().describe("Value for test."),
      from: z.string().optional().describe("Ignored for test."),
    })
    .strict(),
  z
    .object({
      op: z.literal("remove"),
      path: z.string().describe("JSON Pointer path."),
      from: z.string().optional().describe("Ignored for remove."),
    })
    .strict(),
  z
    .object({
      op: z.literal("move"),
      path: z.string().describe("Destination path."),
      from: z.string().describe("Source path."),
    })
    .strict(),
  z
    .object({
      op: z.literal("copy"),
      path: z.string().describe("Destination path."),
      from: z.string().describe("Source path."),
    })
    .strict(),
]);

export const VFS_LS_TOOL = defineTool({
  name: "vfs_ls",
  description: "List VFS entries at a path.",
  parameters: z.object({
    path: vfsOptionalPathSchema.describe("Directory path. Omit for root."),
  }),
});

export const VFS_READ_TOOL = defineTool({
  name: "vfs_read",
  description: "Read a VFS file.",
  parameters: z.object({
    path: vfsFilePathSchema.describe("File path."),
  }),
});

export const VFS_SEARCH_TOOL = defineTool({
  name: "vfs_search",
  description: "Search VFS files by text/regex (optionally semantic).",
  parameters: z.object({
    query: z.string().describe("Search query (text or regex)."),
    path: vfsOptionalPathSchema.describe("Root path to search within."),
    regex: z.boolean().optional().describe("Treat query as regex."),
    semantic: z.boolean().optional().describe("Enable semantic search if available."),
    limit: z.number().optional().describe("Max results. Default: 20."),
  }),
});

export const VFS_GREP_TOOL = defineTool({
  name: "vfs_grep",
  description: "Grep VFS files using a regex pattern.",
  parameters: z.object({
    pattern: z.string().describe("Regex pattern."),
    path: vfsOptionalPathSchema.describe("Root path to search within."),
    flags: z.string().optional().describe("Regex flags (e.g. 'i')."),
    limit: z.number().optional().describe("Max results. Default: 20."),
  }),
});

export const VFS_WRITE_TOOL = defineTool({
  name: "vfs_write",
  description: "Write one or more files to the VFS (atomic batch).",
  parameters: z.object({
    files: z
      .array(
        z.object({
          path: vfsFilePathSchema.describe("File path."),
          content: z.string().describe("File contents."),
          contentType: vfsContentTypeSchema.describe("Content type."),
        }),
      )
      .describe("Files to write."),
  }),
});

export const VFS_EDIT_TOOL = defineTool({
  name: "vfs_edit",
  description: "Apply JSON Patch edits to VFS files (atomic batch).",
  parameters: z.object({
    edits: z
      .array(
        z.object({
          path: vfsFilePathSchema.describe("JSON file path."),
          patch: z
            .array(vfsJsonPatchOpSchema)
            .describe("JSON Patch operations."),
        }),
      )
      .describe("Edits to apply."),
  }),
});

export const VFS_MERGE_TOOL = defineTool({
  name: "vfs_merge",
  description:
    "Merge JSON objects into VFS files (atomic batch). Arrays are replaced.",
  parameters: z.object({
    files: z
      .array(
        z.object({
          path: vfsFilePathSchema.describe("JSON file path."),
          content: z
            .record(z.any())
            .describe("JSON object to merge into the file."),
        }),
      )
      .describe("Files to merge."),
  }),
});

export const VFS_MOVE_TOOL = defineTool({
  name: "vfs_move",
  description: "Move or rename VFS paths (atomic batch).",
  parameters: z.object({
    moves: z
      .array(
        z.object({
          from: vfsFilePathSchema.describe("Source path."),
          to: vfsFilePathSchema.describe("Destination path."),
        }),
      )
      .describe("Move operations."),
  }),
});

export const VFS_DELETE_TOOL = defineTool({
  name: "vfs_delete",
  description: "Delete one or more VFS paths (atomic batch).",
  parameters: z.object({
    paths: z.array(vfsFilePathSchema).describe("Paths to delete."),
  }),
});

// ============================================================================
// NOTES TOOLS (Global Notes System)
// ============================================================================

/**
 * Query global notes by key(s). Returns up to 5 notes per request.
 * Use ONLY for cross-entity information with no suitable entity owner.
 */
export const QUERY_NOTES_TOOL = defineTool({
  name: "query_notes",
  description:
    "Query global notes by key(s). Max 5 results per query. Use ONLY for cross-entity information with no suitable entity owner.",
  parameters: z.object({
    keys: z
      .array(z.string())
      .describe("Note keys to query. Max 5 keys per request."),
    limit: z.number().optional().describe("Max results. Default: 5."),
    page: z.number().optional().describe("Page number (1-indexed)."),
  }),
});

/**
 * List all available note keys (for discovery).
 * Use to discover what notes exist before querying.
 */
export const LIST_NOTES_TOOL = defineTool({
  name: "list_notes",
  description:
    "List all global note keys. Use to discover what notes exist before querying.",
  parameters: z.object({
    search: z
      .string()
      .optional()
      .describe("Optional regex pattern to filter keys."),
    limit: z.number().optional().describe("Max results. Default: 20."),
    page: z.number().optional().describe("Page number (1-indexed)."),
  }),
});

/**
 * Update or create a global note.
 * For short notes: just provide full value (no diff)
 * For long notes (>500 chars): use diff mode to minimize tokens
 */
export const UPDATE_NOTES_TOOL = defineTool({
  name: "update_notes",
  description:
    "Create or update a global note. Short notes: provide full text. Long notes (>500 chars): use diff=true with git-style +/- lines.",
  parameters: z.object({
    key: z.string().describe("Note key."),
    value: z.string().describe("Note value (full text, or diff if diff=true)."),
    diff: z
      .boolean()
      .optional()
      .describe("If true, value is git-style diff (lines starting with +/-)"),
  }),
});

/**
 * Remove global note(s) by key.
 */
export const REMOVE_NOTES_TOOL = defineTool({
  name: "remove_notes",
  description: "Remove one or more global notes by key.",
  parameters: z.object({
    keys: z.array(z.string()).describe("Note keys to remove."),
  }),
});

// ============================================================================
// PLAYER PROFILE TOOLS (Cross-save + Per-save Psychology)
// ============================================================================

/**
 * Query player psychology profiles.
 * Returns both cross-save (meta-player) and per-save (this story) portraits.
 */
export const QUERY_PLAYER_PROFILE_TOOL = defineTool({
  name: "query_player_profile",
  description:
    "Query player psychology profiles. Returns cross-save (meta-player patterns) and per-save (this story's choices) portraits.",
  parameters: z.object({}),
});

/**
 * Update player psychology profile.
 * Call when player choice reveals character. Update frequently early on.
 */
export const UPDATE_PLAYER_PROFILE_TOOL = defineTool({
  name: "update_player_profile",
  description:
    "Update player psychology portrait. Use when player choice reveals character. Call frequently early on, refine as patterns emerge.",
  parameters: z.object({
    crossSave: z
      .string()
      .optional()
      .describe("Updated cross-save portrait (meta-player across all saves)."),
    perSave: z
      .string()
      .optional()
      .describe("Updated per-save portrait (player in THIS story)."),
  }),
});

// ============================================================================
// ADD TOOLS (Stage 2)
// ============================================================================

export const ADD_INVENTORY_TOOL = defineTool({
  name: "add_inventory",
  description: "Add inventory item.",
  parameters: z.object({
    id: z.string().describe("REQUIRED. Unique ID generated by AI."),
    name: z.string().describe("Item name."),
    visible: inventoryItemVisibleSchema
      .partial()
      .optional()
      .describe("Visible props."),
    hidden: inventoryItemHiddenSchema
      .partial()
      .optional()
      .describe("Hidden props (AI/GM)."),
    lore: z.string().optional().describe("Lore."),
    icon: z.string().optional().describe("Emoji."),
    notes: z.string().optional().describe("Notes."),
  }),
});

export const ADD_NPC_TOOL = defineTool({
  name: "add_npc",
  description:
    "Add NPC. PROTAGONIST-ONLY clarification: These tools are for NPCs, use character tools for the protagonist.",
  parameters: z.object({
    id: z.string().describe("REQUIRED. Unique ID generated by AI."),
    name: z.string().describe("NPC name."),
    currentLocation: z.string().optional().describe("Location ID."),
    known: z.boolean().optional().describe("Player knows NPC? Default: true."),
    visible: npcVisibleSchema.partial().optional().describe("Visible props."),
    hidden: npcHiddenSchema
      .partial()
      .optional()
      .describe("Hidden props (AI/GM)."),
    observation: z.string().optional().describe("Observation."),
    notes: z.string().optional().describe("Notes."),
    icon: z.string().optional().describe("Emoji."),
  }),
});

export const ADD_LOCATION_TOOL = defineTool({
  name: "add_location",
  description: "Add location.",
  parameters: z.object({
    id: z.string().describe("REQUIRED. Unique ID generated by AI."),
    name: z.string().describe("Location name."),
    visible: locationVisibleSchema
      .partial()
      .optional()
      .describe("Visible props."),
    hidden: locationHiddenSchema
      .partial()
      .optional()
      .describe("Hidden props (AI/GM)."),
    environment: z.string().optional().describe("Atmosphere."),
    isVisited: z.boolean().optional().describe("Visited? Default: false."),
    unlocked: z
      .boolean()
      .optional()
      .describe("Secrets unlocked? Default: false."),
    unlockReason: z.string().optional().describe("Unlock reason."),
    icon: z.string().optional().describe("Emoji."),
    notes: z.string().optional().describe("Notes."),
  }),
});

export const ADD_QUEST_TOOL = defineTool({
  name: "add_quest",
  description: "Add quest.",
  parameters: z.object({
    id: z.string().describe("REQUIRED. Unique ID generated by AI."),
    title: z.string().describe("Quest title."),
    type: questTypeSchema.optional().describe("Quest type."),
    visible: questVisibleSchema.partial().optional().describe("Visible props."),
    hidden: questHiddenSchema
      .partial()
      .optional()
      .describe("Hidden props (AI/GM)."),
    icon: z.string().optional().describe("Emoji."),
    notes: z.string().optional().describe("Notes."),
  }),
});

export const ADD_KNOWLEDGE_TOOL = defineTool({
  name: "add_knowledge",
  description: "Add knowledge/lore.",
  parameters: z.object({
    id: z.string().describe("REQUIRED. Unique ID generated by AI."),
    title: z.string().describe("Title."),
    category: knowledgeCategorySchema.optional().describe("Category."),
    visible: knowledgeVisibleSchema
      .partial()
      .optional()
      .describe("Visible props."),
    hidden: knowledgeHiddenSchema
      .partial()
      .optional()
      .describe("Hidden props (AI/GM)."),
    discoveredAt: z.string().optional().describe("Discovered time."),
    relatedTo: z.array(z.string()).optional().describe("Related IDs."),
    icon: z.string().optional().describe("Emoji."),
    notes: z.string().optional().describe("Notes."),
  }),
});

export const ADD_TIMELINE_TOOL = defineTool({
  name: "add_timeline",
  description: "Add timeline event.",
  parameters: z.object({
    id: z.string().describe("REQUIRED. Unique ID generated by AI."),
    name: z.string().describe("Short, memorable name for the event."),
    gameTime: z.string().optional().describe("Time."),
    category: timelineEventCategorySchema.optional().describe("Category."),
    visible: timelineEventVisibleSchema.optional().describe("Visible info."),
    hidden: timelineEventHiddenSchema
      .optional()
      .describe("Hidden info (AI/GM)."),
    involvedEntities: z.array(z.string()).optional().describe("Involved IDs."),
    chainId: z.string().optional().describe("CausalChain link ID."),
    known: z.boolean().optional().describe("Player knows? Default: true."),
    icon: z.string().optional().describe("Emoji."),
    notes: z.string().optional().describe("Notes."),
  }),
});

export const ADD_FACTION_TOOL = defineTool({
  name: "add_faction",
  description: "Add faction.",
  parameters: z.object({
    id: z.string().describe("REQUIRED. Unique ID generated by AI."),
    name: z.string().describe("Name."),
    visible: z
      .object({
        agenda: z.string().optional().describe("Agenda."),
        members: z.array(factionMemberSchema).optional().describe("Members."),
        influence: z.string().optional().describe("Influence."),
        relations: z
          .array(factionRelationSchema)
          .optional()
          .describe("Alliances."),
      })
      .optional()
      .describe("Public info."),
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
      .describe("Hidden info (AI/GM)."),
    icon: z.string().optional().describe("Emoji."),
    notes: z.string().optional().describe("Notes."),
  }),
});

export const ADD_CAUSAL_CHAIN_TOOL = defineTool({
  name: "add_causal_chain",
  description: "Create causal chain.",
  parameters: z.object({
    chainId: z.string().describe("Chain ID."),
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
          triggerCondition: z
            .string()
            .optional()
            .describe(
              "WHEN to trigger (e.g., 'when player is alone at night', 'during next combat'). AI judges when condition is met.",
            ),
          severity: z
            .string()
            .optional()
            .describe(
              "Urgency: 'imminent' (ASAP), 'delayed' (wait for drama), 'background' (no rush).",
            ),
          known: z.boolean().optional().describe("Known?"),
        }),
      )
      .optional()
      .describe(
        "Pending consequences. AI decides when to trigger based on story.",
      ),
  }),
});

// Character Add Tools
export const ADD_CHARACTER_ATTRIBUTE_TOOL = defineTool({
  name: "add_character_attribute",
  description:
    "Add numeric attribute to the PROTAGONIST. Character tools are for protagonist only; use npc tools for NPCs.",
  parameters: z.object({
    name: z.string().describe("Attribute name."),
    value: z.number().int().describe("Value."),
    maxValue: z.number().int().optional().describe("Max value."),
    color: attributeColorSchema.optional().describe("Color."),
  }),
});

export const ADD_CHARACTER_SKILL_TOOL = defineTool({
  name: "add_character_skill",
  description:
    "Add skill to the PROTAGONIST. Character tools are for protagonist only; use npc tools for NPCs.",
  parameters: z.object({
    id: z.string().describe("REQUIRED. Unique ID generated by AI."),
    name: z.string().describe("Skill name."),
    level: z.string().optional().describe("Level."),
    visible: skillVisibleSchema.partial().optional().describe("Visible props."),
    hidden: skillHiddenSchema.partial().optional().describe("Hidden props."),
    category: z.string().optional().describe("Category."),
    icon: z.string().optional().describe("Emoji."),
    notes: z.string().optional().describe("Notes."),
  }),
});

export const ADD_CHARACTER_CONDITION_TOOL = defineTool({
  name: "add_character_condition",
  description:
    "Add condition (buff/debuff) to the PROTAGONIST. Character tools are for protagonist only; use npc tools for NPCs.",
  parameters: z.object({
    id: z.string().describe("REQUIRED. Unique ID generated by AI."),
    name: z.string().describe("Condition name."),
    type: conditionTypeSchema.optional().describe("Type."),
    visible: conditionVisibleSchema
      .partial()
      .optional()
      .describe("Visible props."),
    hidden: conditionHiddenSchema
      .partial()
      .optional()
      .describe("Hidden props."),
    effects: z
      .object({
        visible: z.array(z.string()).optional(),
        hidden: z.array(z.string()).optional(),
      })
      .optional()
      .describe("Effects."),

    icon: z.string().optional().describe("Emoji."),
  }),
});

export const ADD_CHARACTER_TRAIT_TOOL = defineTool({
  name: "add_character_trait",
  description:
    "Add hidden trait to the PROTAGONIST. Character tools are for protagonist only; use npc tools for NPCs.",
  parameters: z.object({
    id: z.string().describe("REQUIRED. Unique ID generated by AI."),
    name: z.string().describe("Trait name."),
    description: z.string().optional().describe("Description."),
    effects: z.array(z.string()).optional().describe("Effects."),
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
  description: "Remove inventory item.",
  parameters: z.object({
    id: z.string().describe("ID."),
  }),
});

export const REMOVE_NPC_TOOL = defineTool({
  name: "remove_npc",
  description: "Remove NPC.",
  parameters: z.object({
    id: z.string().describe("ID."),
  }),
});

export const REMOVE_LOCATION_TOOL = defineTool({
  name: "remove_location",
  description: "Remove location.",
  parameters: z.object({
    id: z.string().describe("ID."),
  }),
});

export const REMOVE_QUEST_TOOL = defineTool({
  name: "remove_quest",
  description: "Remove quest.",
  parameters: z.object({
    id: z.string().describe("ID."),
  }),
});

export const REMOVE_KNOWLEDGE_TOOL = defineTool({
  name: "remove_knowledge",
  description: "Remove knowledge.",
  parameters: z.object({
    id: z.string().describe("ID."),
  }),
});

export const REMOVE_TIMELINE_TOOL = defineTool({
  name: "remove_timeline",
  description: "Remove timeline event.",
  parameters: z.object({
    id: z.string().describe("ID."),
  }),
});

export const REMOVE_FACTION_TOOL = defineTool({
  name: "remove_faction",
  description: "Remove faction.",
  parameters: z.object({
    id: z.string().describe("ID."),
  }),
});

export const REMOVE_CAUSAL_CHAIN_TOOL = defineTool({
  name: "remove_causal_chain",
  description: "Remove causal chain.",
  parameters: z.object({
    chainId: z.string().describe("ID."),
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
    id: z.string().optional().describe("ID."),
    name: z.string().optional().describe("Name."),
  }),
});

export const REMOVE_CHARACTER_CONDITION_TOOL = defineTool({
  name: "remove_character_condition",
  description: "Remove condition.",
  parameters: z.object({
    id: z.string().optional().describe("ID."),
    name: z.string().optional().describe("Name."),
  }),
});

export const REMOVE_CHARACTER_TRAIT_TOOL = defineTool({
  name: "remove_character_trait",
  description: "Remove hidden trait.",
  parameters: z.object({
    id: z.string().optional().describe("ID."),
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
    id: z.string().describe("ID."),
    name: z.string().nullish().describe("New name."),
    visible: inventoryItemVisibleSchema
      .partial()
      .nullish()
      .describe("Visible props."),
    hidden: inventoryItemHiddenSchema
      .partial()
      .nullish()
      .describe("Hidden props."),
    lore: z.string().nullish().describe("Lore."),
    icon: z.string().nullish().describe("Emoji."),
    notes: z.string().nullish().describe("Notes."),
  }),
});

export const UPDATE_NPC_TOOL = defineTool({
  name: "update_npc",
  description:
    "Update NPC. Omit to keep, null to delete. PROTAGONIST-ONLY clarification: These tools are for NPCs, use character tools for the protagonist.",
  parameters: z.object({
    id: z.string().describe("ID."),
    name: z.string().nullish().describe("New name."),
    currentLocation: z.string().nullish().describe("Location ID."),
    known: z.boolean().nullish().describe("Known?"),
    visible: npcVisibleSchema.partial().nullish().describe("Visible props."),
    hidden: npcHiddenSchema.partial().nullish().describe("Hidden props."),
    notes: z.string().nullish().describe("Notes."),
    observation: z.string().nullish().describe("Observation."),
    icon: z.string().nullish().describe("Emoji."),
  }),
});

export const UPDATE_LOCATION_TOOL = defineTool({
  name: "update_location",
  description: "Update location. Omit to keep, null to delete.",
  parameters: z.object({
    id: z.string().describe("ID."),
    name: z.string().nullish().describe("New name."),
    visible: locationVisibleSchema
      .partial()
      .nullish()
      .describe("Visible props."),
    hidden: locationHiddenSchema.partial().nullish().describe("Hidden props."),
    environment: z.string().nullish().describe("Atmosphere."),
    isVisited: z.boolean().nullish().describe("Visited?"),
    icon: z.string().nullish().describe("Emoji."),
    notes: z.string().nullish().describe("Notes."),
  }),
});

export const UPDATE_QUEST_TOOL = defineTool({
  name: "update_quest",
  description: "Update quest. Omit to keep, null to delete.",
  parameters: z.object({
    id: z.string().describe("ID."),
    title: z.string().nullish().describe("New title."),
    type: questTypeSchema.nullish().describe("Type."),
    visible: questVisibleSchema.partial().nullish().describe("Visible props."),
    hidden: questHiddenSchema.partial().nullish().describe("Hidden props."),
    icon: z.string().nullish().describe("Emoji."),
    notes: z.string().nullish().describe("Notes."),
  }),
});

export const COMPLETE_QUEST_TOOL = defineTool({
  name: "complete_quest",
  description: "Complete quest.",
  parameters: z.object({
    id: z.string().describe("ID."),
  }),
});

export const FAIL_QUEST_TOOL = defineTool({
  name: "fail_quest",
  description: "Fail quest.",
  parameters: z.object({
    id: z.string().describe("ID."),
  }),
});

export const UPDATE_KNOWLEDGE_TOOL = defineTool({
  name: "update_knowledge",
  description: "Update knowledge. Omit to keep, null to delete.",
  parameters: z.object({
    id: z.string().describe("ID."),
    title: z.string().nullish().describe("New title."),
    category: knowledgeCategorySchema.nullish().describe("Category."),
    visible: knowledgeVisibleSchema
      .partial()
      .nullish()
      .describe("Visible props."),
    hidden: knowledgeHiddenSchema.partial().nullish().describe("Hidden props."),
    discoveredAt: z.string().nullish().describe("Time."),
    relatedTo: z.array(z.string()).nullish().describe("Related IDs."),
    icon: z.string().nullish().describe("Emoji."),
    notes: z.string().nullish().describe("Notes."),
  }),
});

export const UPDATE_TIMELINE_TOOL = defineTool({
  name: "update_timeline",
  description: "Update timeline event. Omit to keep, null to delete.",
  parameters: z.object({
    id: z.string().describe("ID."),
    name: z.string().nullish().describe("New name."),
    gameTime: z.string().nullish().describe("Time."),
    category: timelineEventCategorySchema.nullish().describe("Category."),
    visible: timelineEventVisibleSchema.nullish().describe("Visible info."),
    hidden: timelineEventHiddenSchema.nullish().describe("Hidden info."),
    involvedEntities: z.array(z.string()).nullish().describe("Involved IDs."),
    chainId: z.string().nullish().describe("CausalChain link."),
    known: z.boolean().nullish().describe("Known?"),
    icon: z.string().nullish().describe("Emoji."),
    notes: z.string().nullish().describe("Notes."),
  }),
});

export const UPDATE_FACTION_TOOL = defineTool({
  name: "update_faction",
  description: "Update faction. Omit to keep, null to delete.",
  parameters: z.object({
    id: z.string().describe("ID."),
    name: z.string().nullish().describe("New name."),
    visible: z
      .object({
        agenda: z.string().nullish().describe("Agenda."),
        members: z.array(factionMemberSchema).nullish().describe("Members."),
        influence: z.string().nullish().describe("Influence."),
        relations: z
          .array(factionRelationSchema)
          .nullish()
          .describe("Relations."),
      })
      .nullish()
      .describe("Public info."),
    hidden: z
      .object({
        agenda: z.string().nullish().describe("Secret agenda."),
        members: z
          .array(factionMemberSchema)
          .nullish()
          .describe("Secret members."),
        influence: z.string().nullish().describe("True influence."),
        internalConflict: z.string().nullish().describe("Schisms/rivalries."),
        relations: z
          .array(factionRelationSchema)
          .nullish()
          .describe("Secret relations."),
      })
      .nullish()
      .describe("Hidden info."),
    icon: z.string().nullish().describe("Emoji."),
    notes: z.string().nullish().describe("Notes."),
  }),
});

export const UPDATE_CAUSAL_CHAIN_TOOL = defineTool({
  name: "update_causal_chain",
  description: "Update causal chain. Omit to keep, null to delete.",
  parameters: z.object({
    chainId: z.string().describe("ID."),
    status: causalChainStatusSchema.nullish().describe("Status."),
    pendingConsequences: z
      .array(
        z.object({
          id: z.string().describe("Consequence ID."),
          description: z.string().describe("What could happen."),
          triggerCondition: z
            .string()
            .optional()
            .describe(
              "WHEN to trigger (e.g., 'when player is alone at night', 'during next combat'). AI judges when condition is met.",
            ),
          severity: z
            .string()
            .optional()
            .describe(
              "Urgency: 'imminent' (ASAP), 'delayed' (wait for drama), 'background' (no rush).",
            ),
          known: z.boolean().optional().describe("Known?"),
        }),
      )
      .nullish()
      .describe(
        "Pending consequences. AI decides when to trigger based on story.",
      ),
  }),
});

export const TRIGGER_CAUSAL_CHAIN_TOOL = defineTool({
  name: "trigger_causal_chain",
  description: "Trigger consequence NOW. Narrate result.",
  parameters: z.object({
    chainId: z.string().describe("Chain ID."),
    consequenceId: z.string().describe("Consequence ID."),
  }),
});

export const RESOLVE_CAUSAL_CHAIN_TOOL = defineTool({
  name: "resolve_causal_chain",
  description: "Resolve causal chain (arc complete).",
  parameters: z.object({
    chainId: z.string().describe("ID."),
  }),
});

export const INTERRUPT_CAUSAL_CHAIN_TOOL = defineTool({
  name: "interrupt_causal_chain",
  description: "Interrupt causal chain.",
  parameters: z.object({
    chainId: z.string().describe("ID."),
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
  description:
    "Update the PROTAGONIST's profile. For NPC updates, use update_npc instead. Omit to keep, null to clear.",
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
    psychology: z
      .object({
        coreTrauma: z.string().nullish(),
        copingMechanism: z.string().nullish(),
        internalContradiction: z.string().nullish(),
      })
      .nullish(),
  }),
});

export const UPDATE_CHARACTER_ATTRIBUTE_TOOL = defineTool({
  name: "update_character_attribute",
  description:
    "Update the PROTAGONIST's attribute. Character tools are for protagonist only; use npc tools for NPCs. Omit to keep, null to remove.",
  parameters: z.object({
    name: z.string().describe("Name."),
    value: z.number().int().nullish().describe("New value."),
    maxValue: z.number().int().nullish().describe("Max value."),
    color: attributeColorSchema.nullish().describe("Color."),
  }),
});

export const UPDATE_CHARACTER_SKILL_TOOL = defineTool({
  name: "update_character_skill",
  description:
    "Update the PROTAGONIST's skill. Character tools are for protagonist only; use npc tools for NPCs. Omit to keep, null to remove.",
  parameters: z.object({
    id: z.string().optional().describe("ID."),
    name: z.string().optional().describe("Name."),
    level: z.string().nullish().describe("Level."),
    visible: skillVisibleSchema.partial().nullish().describe("Visible props."),
    hidden: skillHiddenSchema.partial().nullish().describe("Hidden props."),
    category: z.string().nullish().describe("Category."),
    icon: z.string().nullish().describe("Emoji."),
    notes: z.string().nullish().describe("Notes."),
  }),
});

export const UPDATE_CHARACTER_CONDITION_TOOL = defineTool({
  name: "update_character_condition",
  description:
    "Update the PROTAGONIST's condition. Character tools are for protagonist only; use npc tools for NPCs. Omit to keep, null to remove.",
  parameters: z.object({
    id: z.string().optional().describe("ID."),
    name: z.string().optional().describe("Name."),
    type: conditionTypeSchema.nullish().describe("Type."),
    visible: conditionVisibleSchema
      .partial()
      .nullish()
      .describe("Visible props."),
    hidden: conditionHiddenSchema.partial().nullish().describe("Hidden props."),
    effects: z
      .object({
        visible: z.array(z.string()).nullish(),
        hidden: z.array(z.string()).nullish(),
      })
      .nullish()
      .describe("Effects."),
    icon: z.string().nullish().describe("Emoji."),
    notes: z.string().nullish().describe("Notes."),
  }),
});

export const UPDATE_CHARACTER_TRAIT_TOOL = defineTool({
  name: "update_character_trait",
  description:
    "Update the PROTAGONIST's hidden trait. Character tools are for protagonist only; use npc tools for NPCs. Omit to keep, null to remove.",
  parameters: z.object({
    id: z.string().optional().describe("ID."),
    name: z.string().optional().describe("Name."),
    description: z.string().nullish().describe("Description."),
    effects: z.array(z.string()).nullish().describe("Effects."),
    triggerConditions: z
      .array(z.string())
      .nullish()
      .describe("Trigger conditions."),
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
  "npc",
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
  description:
    "Unlock entity hidden info. Requires PROOF and COMPLETE revelation.",
  parameters: z.object({
    category: unlockEntityCategorySchema.describe("Category."),
    id: z.string().optional().describe("ID."),
    name: z.string().optional().describe("Name."),
    reason: z.string().describe("Justification describing evidence."),
  }),
});

// ============================================================================
// CONTROL TOOLS
// ============================================================================

// ============================================================================
// SEARCH TOOL (Dynamic Tool Loading)
// ============================================================================

export type ToolOperation =
  | "add"
  | "update"
  | "remove"
  | "query"
  | "narrative"
  | "unlock"
  | "trigger"
  | "resolve"
  | "interrupt"
  | "complete"
  | "fail";

export const searchToolSchema = z.object({
  queries: z
    .array(
      z.object({
        operation: z
          .enum([
            "add",
            "update",
            "remove",
            "query",
            "unlock",
            "list",
            "trigger",
            "resolve",
            "interrupt",
            "complete",
            "fail",
          ])
          .describe("Action type."),
        entity: z
          .enum([
            "inventory",
            "npc",
            "location",
            "quest",
            "knowledge",
            "timeline",
            "faction",
            "causal_chain",
            "skill",
            "condition",
            "trait",
            "attribute",
            "profile",
            "global",
            "world", // Alias for global
            "story",
            "turn",
            "rag",
            "notes", // Global notes
            "atmosphere", // Atmosphere enums
            "character", // Aggregate: profile + attribute + skill + condition + trait
            "player_profile", // Player psychology profiling
          ])
          .describe("Entity type to search for."),
      }),
    )
    .describe("List of tool types to search for."),
});

export const SEARCH_TOOL = defineTool({
  name: "search_tool",
  description:
    "System Tool: Dynamically load specific toolsets (e.g., inventory tools, quest tools) if they are not currently available. Use this when you want to perform an action but lack the specific tool.",
  parameters: searchToolSchema,
});

export type SearchToolParams = InferToolParams<typeof SEARCH_TOOL>;

// ============================================================================
// ACTIVATE SKILL TOOL (Dynamic Skill Loading)
// ============================================================================

/**
 * Activate additional skill modules to enhance AI capabilities.
 * Skills provide specialized knowledge and rules for specific scenarios.
 */
export const activateSkillSchema = z.object({
  skillIds: z
    .array(z.string())
    .describe(
      "Skill IDs to activate. Check skill_manifest for available skills and their whenToLoad hints.",
    ),
});

export const ACTIVATE_SKILL_TOOL = defineTool({
  name: "activate_skill",
  description:
    "Load additional skill modules to enhance your capabilities. Use this when you need specialized rules for combat, NPC psychology, mystery, etc. Check the skill_manifest section for available skills and when to load them.",
  parameters: activateSkillSchema,
});

export type ActivateSkillToolParams = InferToolParams<
  typeof ACTIVATE_SKILL_TOOL
>;

// ============================================================================
// CONTROL TOOLS
// ============================================================================

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

export const OVERRIDE_OUTLINE_TOOL = defineTool({
  name: "override_outline",
  description:
    "Override outline fields during force update (SUDO MODE ONLY). Modify worldSetting or narrativeStyle to permanently change the game's world or writing style.",
  parameters: overrideOutlineSchema,
});

export type OverrideOutlineToolParams = InferToolParams<
  typeof OVERRIDE_OUTLINE_TOOL
>;

// ============================================================================
// SUMMARY AGENTIC LOOP TOOLS (Preserved)
// ============================================================================

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
 * Query the current game state (inventory, npcs, etc.)
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
          "npcs",
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
 * Load additional query tools during summary generation.
 * Use this when you need to query specific game state entities.
 */
export const SUMMARY_LOAD_QUERY_TOOL = defineTool({
  name: "summary_load_query",
  description: `Load additional query tools to examine game state.

Use this to request access to specific entity query tools:
- inventory: Query player's items
- npcs: Query NPC npcs
- locations: Query known locations
- quests: Query quest status
- knowledge: Query player knowledge
- factions: Query faction info
- timeline: Query timeline events
- character: Query character profile/attributes/skills/conditions/traits

Once loaded, the tools will be available in subsequent turns.`,
  parameters: z.object({
    entities: z
      .array(
        z.enum([
          "inventory",
          "npcs",
          "locations",
          "quests",
          "knowledge",
          "factions",
          "timeline",
          "character",
        ]),
      )
      .describe("Which entity types to load query tools for"),
  }),
});

/**
 * Activate/Load specific skills for the current session.
 * Use this when you need specialized knowledge or capabilities not currently loaded.
 */

/**
 * Find query tools for given entity types
 */
export function findQueryToolsForEntities(
  entities: string[],
): ZodToolDefinition[] {
  const tools: ZodToolDefinition[] = [];
  for (const entity of entities) {
    const key = `query:${entity}`;
    if (TOOL_MAP[key]) {
      for (const tool of TOOL_MAP[key]) {
        if (!tools.some((t) => t.name === tool.name)) {
          tools.push(tool);
        }
      }
    }
  }
  return tools;
}

/**
 * Summary tools grouped by stage
 */
/**
 * Get all summary tools (stage-less design)
 * Summary can only use query/list tools + finish_summary
 */
export function getSummaryTools(): ZodToolDefinition[] {
  return [
    SUMMARY_QUERY_SEGMENTS_TOOL,
    SUMMARY_QUERY_STATE_TOOL,
    FINISH_SUMMARY_TOOL,
  ];
}

// ============================================================================
// TOOL GROUPS & MAPPING
// ============================================================================

// Grouping for search mapping
export const TOOL_MAP: Record<string, ZodToolDefinition[]> = {
  // Inventory
  "add:inventory": [ADD_INVENTORY_TOOL],
  "update:inventory": [UPDATE_INVENTORY_TOOL],
  "remove:inventory": [REMOVE_INVENTORY_TOOL],
  "query:inventory": [QUERY_INVENTORY_TOOL],
  "unlock:inventory": [UNLOCK_ENTITY_TOOL], // Unlock is often generic but let's map it

  // NPC
  "add:npc": [ADD_NPC_TOOL],
  "update:npc": [UPDATE_NPC_TOOL],
  "remove:npc": [REMOVE_NPC_TOOL],
  "query:npc": [QUERY_NPCS_TOOL],
  "unlock:npc": [UNLOCK_ENTITY_TOOL],

  // Location
  "add:location": [ADD_LOCATION_TOOL],
  "update:location": [UPDATE_LOCATION_TOOL],
  "remove:location": [REMOVE_LOCATION_TOOL],
  "query:location": [QUERY_LOCATIONS_TOOL],
  "unlock:location": [UNLOCK_ENTITY_TOOL],

  // Quest
  "add:quest": [ADD_QUEST_TOOL],
  "update:quest": [UPDATE_QUEST_TOOL, COMPLETE_QUEST_TOOL, FAIL_QUEST_TOOL],
  "complete:quest": [COMPLETE_QUEST_TOOL],
  "fail:quest": [FAIL_QUEST_TOOL],
  "remove:quest": [REMOVE_QUEST_TOOL],
  "query:quest": [QUERY_QUESTS_TOOL],
  "unlock:quest": [UNLOCK_ENTITY_TOOL],

  // Knowledge
  "add:knowledge": [ADD_KNOWLEDGE_TOOL],
  "update:knowledge": [UPDATE_KNOWLEDGE_TOOL],
  "remove:knowledge": [REMOVE_KNOWLEDGE_TOOL],
  "query:knowledge": [QUERY_KNOWLEDGE_TOOL],
  "unlock:knowledge": [UNLOCK_ENTITY_TOOL],

  // Timeline
  "add:timeline": [ADD_TIMELINE_TOOL],
  "update:timeline": [UPDATE_TIMELINE_TOOL],
  "remove:timeline": [REMOVE_TIMELINE_TOOL],
  "query:timeline": [QUERY_TIMELINE_TOOL],
  "unlock:timeline": [UNLOCK_ENTITY_TOOL],

  // Faction
  "add:faction": [ADD_FACTION_TOOL],
  "update:faction": [UPDATE_FACTION_TOOL],
  "remove:faction": [REMOVE_FACTION_TOOL],
  "query:faction": [QUERY_FACTIONS_TOOL],
  "unlock:faction": [UNLOCK_ENTITY_TOOL],

  // Causal Chain
  "add:causal_chain": [ADD_CAUSAL_CHAIN_TOOL],
  "update:causal_chain": [
    UPDATE_CAUSAL_CHAIN_TOOL,
    TRIGGER_CAUSAL_CHAIN_TOOL,
    RESOLVE_CAUSAL_CHAIN_TOOL,
    INTERRUPT_CAUSAL_CHAIN_TOOL,
  ],
  "trigger:causal_chain": [TRIGGER_CAUSAL_CHAIN_TOOL],
  "resolve:causal_chain": [RESOLVE_CAUSAL_CHAIN_TOOL],
  "interrupt:causal_chain": [INTERRUPT_CAUSAL_CHAIN_TOOL],
  "remove:causal_chain": [REMOVE_CAUSAL_CHAIN_TOOL],
  "query:causal_chain": [QUERY_CAUSAL_CHAIN_TOOL],

  // Character Attributes
  "add:attribute": [ADD_CHARACTER_ATTRIBUTE_TOOL],
  "update:attribute": [UPDATE_CHARACTER_ATTRIBUTE_TOOL],
  "remove:attribute": [REMOVE_CHARACTER_ATTRIBUTE_TOOL],
  "query:attribute": [QUERY_CHARACTER_ATTRIBUTES_TOOL],

  // Character Skills
  "add:skill": [ADD_CHARACTER_SKILL_TOOL],
  "update:skill": [UPDATE_CHARACTER_SKILL_TOOL],
  "remove:skill": [REMOVE_CHARACTER_SKILL_TOOL],
  "query:skill": [QUERY_CHARACTER_SKILLS_TOOL],
  "unlock:skill": [UNLOCK_ENTITY_TOOL],

  // Character Conditions
  "add:condition": [ADD_CHARACTER_CONDITION_TOOL],
  "update:condition": [UPDATE_CHARACTER_CONDITION_TOOL],
  "remove:condition": [REMOVE_CHARACTER_CONDITION_TOOL],
  "query:condition": [QUERY_CHARACTER_CONDITIONS_TOOL],
  "unlock:condition": [UNLOCK_ENTITY_TOOL],

  // Character Traits
  "add:trait": [ADD_CHARACTER_TRAIT_TOOL],
  "update:trait": [UPDATE_CHARACTER_TRAIT_TOOL],
  "remove:trait": [REMOVE_CHARACTER_TRAIT_TOOL],
  "query:trait": [QUERY_CHARACTER_TRAITS_TOOL],
  "unlock:trait": [UNLOCK_ENTITY_TOOL],

  // Character Profile
  "update:profile": [UPDATE_CHARACTER_PROFILE_TOOL],
  "query:profile": [QUERY_CHARACTER_PROFILE_TOOL],

  // Global / World
  "update:world": [UPDATE_WORLD_INFO_TOOL, UPDATE_GLOBAL_TOOL],
  "query:global": [QUERY_GLOBAL_TOOL],

  // General Query
  "query:story": [
    QUERY_STORY_TOOL,
    QUERY_TURN_TOOL,
    QUERY_SUMMARY_TOOL,
    QUERY_RECENT_CONTEXT_TOOL,
  ],
  "query:rag": [RAG_SEARCH_TOOL],
  "query:atmosphere": [
    QUERY_ATMOSPHERE_ENUMS_TOOL,
    QUERY_ATMOSPHERE_ENUM_DESCRIPTION_TOOL,
  ],

  // Notes (Global)
  "query:notes": [QUERY_NOTES_TOOL],
  "list:notes": [LIST_NOTES_TOOL],
  "update:notes": [UPDATE_NOTES_TOOL],
  "remove:notes": [REMOVE_NOTES_TOOL],

  // Player Profile (Cross-save + Per-save Psychology)
  "query:player_profile": [QUERY_PLAYER_PROFILE_TOOL],
  "update:player_profile": [UPDATE_PLAYER_PROFILE_TOOL],
};

/**
 * Generic List Tool.
 * Use this to get a paginated list of entity ID and Names.
 * Efficient for discovering what exists without loading full details.
 */
export const LIST_TOOL = defineTool({
  name: "list",
  description: "List entity IDs and names with pagination.",
  parameters: z.object({
    type: z
      .enum([
        "inventory",
        "npc",
        "location",
        "quest",
        "knowledge",
        "faction",
        "timeline",
        "causal_chain",
        "global",
        "attribute",
        "profile",
        "skill",
        "condition",
        "trait",
        "notes",
      ])
      .describe("Entity type to list."),
    page: z
      .number()
      .optional()
      .describe("Page number (1-indexed). Default: 1."),
    limit: z.number().optional().describe("Items per page. Default: 10."),
    search: z.string().optional().describe("Optional name filter."),
  }),
});

// Also export a flat list if needed, or helper

export const ALL_DEFINED_TOOLS: ZodToolDefinition[] = [
  VFS_LS_TOOL,
  VFS_READ_TOOL,
  VFS_SEARCH_TOOL,
  VFS_GREP_TOOL,
  VFS_WRITE_TOOL,
  VFS_EDIT_TOOL,
  VFS_MERGE_TOOL,
  VFS_MOVE_TOOL,
  VFS_DELETE_TOOL,
];

// Helper to find tools
export function findTools(
  operation: string,
  entity: string,
): ZodToolDefinition[] {
  const key = `${operation}:${entity}`;
  if (TOOL_MAP[key]) {
    return TOOL_MAP[key];
  }
  // Fuzzy / Aggregate Logic

  // 1. Character Aggregate
  // "character" -> profile, attributes, skills, conditions, traits
  if (entity === "character") {
    const subEntities = ["profile", "attribute", "skill", "condition", "trait"];
    let tools: ZodToolDefinition[] = [];
    for (const sub of subEntities) {
      const specificKey = `${operation}:${sub}`;
      if (TOOL_MAP[specificKey]) {
        tools = tools.concat(TOOL_MAP[specificKey]);
      }
    }
    // Also check for direct matches if any (rare for character)
    if (tools.length > 0) return tools;
  }

  // 2. World / Global Aggregate
  if (entity === "world" || entity === "global") {
    const subEntities = ["global", "world"]; // "world" for update:world which maps to [UPDATE_WORLD_INFO, UPDATE_GLOBAL]
    let tools: ZodToolDefinition[] = [];

    // Attempt direct mapping first for aliases
    if (TOOL_MAP[`${operation}:world`])
      tools = tools.concat(TOOL_MAP[`${operation}:world`]);
    if (TOOL_MAP[`${operation}:global`])
      tools = tools.concat(TOOL_MAP[`${operation}:global`]);

    if (tools.length > 0) return tools;
  }

  // 3. Story / Turn
  if (entity === "story" && operation === "query") {
    return [QUERY_STORY_TOOL, QUERY_SUMMARY_TOOL];
  }
  if (entity === "turn" && operation === "query") {
    return [QUERY_TURN_TOOL, QUERY_RECENT_CONTEXT_TOOL];
  }

  // 4. Notes
  if (entity === "notes") {
    const notesKey = `${operation}:notes`;
    if (TOOL_MAP[notesKey]) return TOOL_MAP[notesKey];
  }

  // 5. Atmosphere
  if (entity === "atmosphere" && operation === "query") {
    return TOOL_MAP["query:atmosphere"] || [];
  }

  // 6. Player Profile
  if (entity === "player_profile") {
    const profileKey = `${operation}:player_profile`;
    if (TOOL_MAP[profileKey]) return TOOL_MAP[profileKey];
  }

  // 7. List Tool Fallback
  if (operation === "list") {
    return [LIST_TOOL];
  }

  // 5. Query All Fallback (Legacy preserved, but Matrix Logic is better)
  if (operation === "query" && entity === "all") {
    // Return all query tools
    let tools: ZodToolDefinition[] = [];
    for (const key in TOOL_MAP) {
      if (key.startsWith("query:")) {
        tools = tools.concat(TOOL_MAP[key]);
      }
    }
    return tools;
  }

  // 6. Matrix Search / Fallback Logic
  // If operation is "all" (e.g. search_tool with operation="all", entity="inventory") -> return add, update, remove, query for inventory
  if (operation === "all") {
    let tools: ZodToolDefinition[] = [];
    const suffix = `:${entity}`;
    for (const key in TOOL_MAP) {
      if (key.endsWith(suffix)) {
        tools = tools.concat(TOOL_MAP[key]);
      }
    }
    // If we found tools, return them
    if (tools.length > 0) return tools;
  }

  // If entity is "all" (e.g. search_tool with operation="query", entity="all") -> return all query tools
  // (Covered partially above, but generic here)
  if (entity === "all") {
    let tools: ZodToolDefinition[] = [];
    const prefix = `${operation}:`;
    for (const key in TOOL_MAP) {
      if (key.startsWith(prefix)) {
        tools = tools.concat(TOOL_MAP[key]);
      }
    }
    if (tools.length > 0) return tools;
  }

  return [];
}

// Legacy export for backwards compatibility (though mostly unused now)
export const TOOLS = ALL_DEFINED_TOOLS;

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

export type AddNPCParams = InferToolParams<typeof ADD_NPC_TOOL>;
export type UpdateNPCParams = InferToolParams<typeof UPDATE_NPC_TOOL>;
export type RemoveNPCParams = InferToolParams<typeof REMOVE_NPC_TOOL>;

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
export type RemoveKnowledgeParams = InferToolParams<
  typeof REMOVE_KNOWLEDGE_TOOL
>;

export type AddTimelineParams = InferToolParams<typeof ADD_TIMELINE_TOOL>;
export type UpdateTimelineParams = InferToolParams<typeof UPDATE_TIMELINE_TOOL>;
export type RemoveTimelineParams = InferToolParams<typeof REMOVE_TIMELINE_TOOL>;

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
export type RemoveCausalChainParams = InferToolParams<
  typeof REMOVE_CAUSAL_CHAIN_TOOL
>;

// Global and World Info Types
export type UpdateGlobalParams = InferToolParams<typeof UPDATE_GLOBAL_TOOL>;
export type UpdateWorldInfoParams = InferToolParams<
  typeof UPDATE_WORLD_INFO_TOOL
>;

// Query Types
export type QueryInventoryParams = InferToolParams<typeof QUERY_INVENTORY_TOOL>;
export type QueryNPCParams = InferToolParams<typeof QUERY_NPCS_TOOL>;
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
export type VfsLsParams = InferToolParams<typeof VFS_LS_TOOL>;
export type VfsReadParams = InferToolParams<typeof VFS_READ_TOOL>;
export type VfsSearchParams = InferToolParams<typeof VFS_SEARCH_TOOL>;
export type VfsGrepParams = InferToolParams<typeof VFS_GREP_TOOL>;
export type VfsWriteParams = InferToolParams<typeof VFS_WRITE_TOOL>;
export type VfsEditParams = InferToolParams<typeof VFS_EDIT_TOOL>;
export type VfsMergeParams = InferToolParams<typeof VFS_MERGE_TOOL>;
export type VfsMoveParams = InferToolParams<typeof VFS_MOVE_TOOL>;
export type VfsDeleteParams = InferToolParams<typeof VFS_DELETE_TOOL>;

// Story Memory Query Types
export type QueryStoryParams = InferToolParams<typeof QUERY_STORY_TOOL>;
export type QueryTurnParams = InferToolParams<typeof QUERY_TURN_TOOL>;
export type QuerySummaryParams = InferToolParams<typeof QUERY_SUMMARY_TOOL>;
export type QueryRecentContextParams = InferToolParams<
  typeof QUERY_RECENT_CONTEXT_TOOL
>;
export type QueryAtmosphereEnumsParams = InferToolParams<
  typeof QUERY_ATMOSPHERE_ENUMS_TOOL
>;
export type QueryAtmosphereEnumDescriptionParams = InferToolParams<
  typeof QUERY_ATMOSPHERE_ENUM_DESCRIPTION_TOOL
>;

// Notes Types
export type QueryNotesParams = InferToolParams<typeof QUERY_NOTES_TOOL>;
export type ListNotesParams = InferToolParams<typeof LIST_NOTES_TOOL>;
export type UpdateNotesParams = InferToolParams<typeof UPDATE_NOTES_TOOL>;
export type RemoveNotesParams = InferToolParams<typeof REMOVE_NOTES_TOOL>;

// Player Profile Types
export type QueryPlayerProfileParams = InferToolParams<
  typeof QUERY_PLAYER_PROFILE_TOOL
>;
export type UpdatePlayerProfileParams = InferToolParams<
  typeof UPDATE_PLAYER_PROFILE_TOOL
>;

// Unlock Tool Types
export type UnlockEntityParams = InferToolParams<typeof UNLOCK_ENTITY_TOOL>;

// Finish Turn and Force Update Types
export type FinishTurnParams = z.infer<typeof finishTurnSchema>;
export type ForceUpdateParams = z.infer<typeof forceUpdateSchema>;

export type ListToolParams = InferToolParams<typeof LIST_TOOL>;

// ============================================================================
// TOOL PARAMETER TYPE MAP
// Maps tool names to their parameter types for type-safe tool handling
// ============================================================================

export interface ToolParamsMap {
  // Search tool
  search_tool: SearchToolParams;

  // List tool
  list: ListToolParams;

  // Story Memory Query tools
  query_story: QueryStoryParams;
  query_turn: QueryTurnParams;
  query_summary: QuerySummaryParams;
  query_recent_context: QueryRecentContextParams;
  query_atmosphere_enums: QueryAtmosphereEnumsParams;
  query_atmosphere_enum_description: QueryAtmosphereEnumDescriptionParams;

  // Query tools
  query_inventory: QueryInventoryParams;
  query_npc: QueryNPCParams;
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
  vfs_ls: VfsLsParams;
  vfs_read: VfsReadParams;
  vfs_search: VfsSearchParams;
  vfs_grep: VfsGrepParams;
  vfs_write: VfsWriteParams;
  vfs_edit: VfsEditParams;
  vfs_merge: VfsMergeParams;
  vfs_move: VfsMoveParams;
  vfs_delete: VfsDeleteParams;

  // Add tools
  add_inventory: AddInventoryParams;
  add_npc: AddNPCParams;
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
  remove_npc: RemoveNPCParams;
  remove_location: RemoveLocationParams;
  remove_quest: RemoveQuestParams;
  remove_faction: RemoveFactionParams;
  remove_character_attribute: RemoveCharacterAttributeParams;
  remove_character_skill: RemoveCharacterSkillParams;
  remove_character_condition: RemoveCharacterConditionParams;
  remove_character_trait: RemoveCharacterTraitParams;
  remove_knowledge: RemoveKnowledgeParams;
  remove_timeline: RemoveTimelineParams;
  remove_causal_chain: RemoveCausalChainParams;

  // Update tools
  update_inventory: UpdateInventoryParams;
  update_npc: UpdateNPCParams;
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
  unlock_entity: UnlockEntityParams;

  // Control tools
  finish_turn: FinishTurnParams;
  complete_force_update: ForceUpdateParams;
  override_outline: OverrideOutlineToolParams;

  // Notes tools
  query_notes: QueryNotesParams;
  list_notes: ListNotesParams;
  update_notes: UpdateNotesParams;
  remove_notes: RemoveNotesParams;

  // Player Profile tools
  query_player_profile: QueryPlayerProfileParams;
  update_player_profile: UpdatePlayerProfileParams;
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
