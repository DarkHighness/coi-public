/**
 * ============================================================================
 * Tool Definitions (VFS-only runtime)
 * ============================================================================
 *
 * The game loop has migrated to a VFS-backed state model. The agentic loop may
 * ONLY use `vfs_*` tools to inspect and modify state, and ends a turn by
 * writing `current/conversation/*` files (see prompts + buildResponseFromVfs).
 *
 * Legacy entity mutation tools were intentionally removed.
 */

import { z, ZodObject, ZodRawShape } from "zod";
import type {
  ZodToolDefinition,
  TypedToolDefinition,
  InferToolParams,
} from "./providers/types";

// ============================================================================
// Type-Safe Tool Definition Helper
// ============================================================================

export function defineTool<TParams extends ZodObject<ZodRawShape>>(
  definition: TypedToolDefinition<TParams>,
): TypedToolDefinition<TParams> {
  return definition;
}

export function toRuntimeTool(
  tool: TypedToolDefinition<ZodObject<ZodRawShape>>,
): ZodToolDefinition {
  return tool as ZodToolDefinition;
}

export function toRuntimeTools(
  tools: TypedToolDefinition<ZodObject<ZodRawShape>>[],
): ZodToolDefinition[] {
  return tools as ZodToolDefinition[];
}

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

// ============================================================================
// Entity IDs (shared helper; used by utilities and prompts)
// ============================================================================

export const ID_PREFIXES = {
  inventory: "inv",
  npc: "npc",
  location: "loc",
  quest: "quest",
  knowledge: "knowledge",
  faction: "faction",
  timeline: "timeline",
  skill: "skill",
  condition: "condition",
  hiddenTrait: "trait",
  attribute: "attr",
  causal_chain: "chain",
} as const;

export type EntityType = keyof typeof ID_PREFIXES;

export const generateEntityId = (type: EntityType, num: number): string => {
  return `${ID_PREFIXES[type]}:${num}`;
};

// ============================================================================
// VFS TOOLS (Virtual File System)
// ============================================================================

const vfsPathSchema = z
  .string()
  .describe("VFS path (leading/trailing slashes are ok).");

const vfsOptionalPathSchema = vfsPathSchema
  .nullish()
  .describe("Optional VFS path. Prefer omitting; null is treated as root.");

const vfsFilePathSchema = vfsPathSchema.min(1, "Path is required.");

const vfsContentTypeSchema = z.enum(["application/json", "text/plain"]);

const vfsJsonPatchOpSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("add"),
      path: z.string().describe("JSON Pointer path."),
      value: z.unknown().describe("Value for add."),
      from: z.string().nullish().describe("Ignored for add."),
    })
    .strict(),
  z
    .object({
      op: z.literal("replace"),
      path: z.string().describe("JSON Pointer path."),
      value: z.unknown().describe("Value for replace."),
      from: z.string().nullish().describe("Ignored for replace."),
    })
    .strict(),
  z
    .object({
      op: z.literal("test"),
      path: z.string().describe("JSON Pointer path."),
      value: z.unknown().describe("Value for test."),
      from: z.string().nullish().describe("Ignored for test."),
    })
    .strict(),
  z
    .object({
      op: z.literal("remove"),
      path: z.string().describe("JSON Pointer path."),
      from: z.string().nullish().describe("Ignored for remove."),
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

export const VFS_READ_MANY_TOOL = defineTool({
  name: "vfs_read_many",
  description: "Read multiple VFS files in a single call.",
  parameters: z.object({
    paths: z.array(vfsFilePathSchema).min(1).describe("File paths to read."),
    maxChars: z
      .number()
      .int()
      .positive()
      .nullish()
      .describe(
        "Optional max characters per file (truncate large files). Prefer omitting; null is treated as default (no truncation).",
      ),
  }),
});

export const VFS_SEARCH_TOOL = defineTool({
  name: "vfs_search",
  description:
    "Search VFS files by text/regex/fuzzy (optionally semantic, when available).",
  parameters: z.object({
    query: z.string().describe("Search query (text or regex)."),
    path: vfsOptionalPathSchema.describe("Root path to search within."),
    regex: z
      .boolean()
      .nullish()
      .describe("Treat query as regex. Prefer omitting; null is false."),
    fuzzy: z
      .boolean()
      .nullish()
      .describe(
        "Enable fuzzy matching (typos ok). Ignored when regex=true. Prefer omitting; null is false.",
      ),
    semantic: z
      .boolean()
      .nullish()
      .describe(
        "Enable semantic search if available. Prefer omitting; null is false.",
      ),
    limit: z
      .number()
      .nullish()
      .describe("Max results. Default: 20. Prefer omitting; null is default."),
  }),
});

export const VFS_GREP_TOOL = defineTool({
  name: "vfs_grep",
  description: "Grep VFS files using a regex pattern.",
  parameters: z.object({
    pattern: z.string().describe("Regex pattern."),
    path: vfsOptionalPathSchema.describe("Root path to search within."),
    flags: z
      .string()
      .nullish()
      .describe("Regex flags (e.g. 'i'). Prefer omitting; null is default."),
    limit: z
      .number()
      .nullish()
      .describe("Max results. Default: 20. Prefer omitting; null is default."),
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
      .min(1)
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
          patch: z.array(vfsJsonPatchOpSchema).describe("JSON Patch operations."),
        }),
      )
      .min(1)
      .describe("Edits to apply."),
  }),
});

const vfsTxOpSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("write"),
      path: vfsFilePathSchema.describe("File path."),
      content: z.string().describe("File contents."),
      contentType: vfsContentTypeSchema.describe("Content type."),
    })
    .strict(),
  z
    .object({
      op: z.literal("edit"),
      path: vfsFilePathSchema.describe("JSON file path."),
      patch: z.array(vfsJsonPatchOpSchema).describe("JSON Patch operations."),
    })
    .strict(),
  z
    .object({
      op: z.literal("merge"),
      path: vfsFilePathSchema.describe("JSON file path."),
      content: z.record(z.any()).describe("JSON object to merge."),
    })
    .strict(),
  z
    .object({
      op: z.literal("move"),
      from: vfsFilePathSchema.describe("Source path."),
      to: vfsFilePathSchema.describe("Destination path."),
    })
    .strict(),
  z
    .object({
      op: z.literal("delete"),
      path: vfsFilePathSchema.describe("Path to delete."),
    })
    .strict(),
  z
    .object({
      op: z.literal("commit_turn"),
      userAction: z.string().describe("The player's action text for this turn."),
      assistant: z
        .object({
          narrative: z
            .string()
            .describe(
              "The assistant narrative (Markdown text for the player).",
            ),
          choices: z
            .array(
              z
                .object({
                  text: z.string(),
                  consequence: z.string().nullish(),
                })
                .strict(),
            )
            .min(2)
            .max(4)
            .describe("2-4 player choices for the next step."),
          narrativeTone: z.string().nullish(),
          atmosphere: z.unknown().nullish(),
          ending: z.string().nullish(),
          forceEnd: z.boolean().nullish(),
        })
        .strict()
        .describe("Assistant payload stored in the turn file."),
      createdAt: z
        .number()
        .int()
        .nullish()
        .describe("Override createdAt timestamp (ms). Default: now."),
    })
    .strict(),
]);

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
      .min(1)
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
      .min(1)
      .describe("Move operations."),
  }),
});

export const VFS_DELETE_TOOL = defineTool({
  name: "vfs_delete",
  description: "Delete one or more VFS paths (atomic batch).",
  parameters: z.object({
    paths: z.array(vfsFilePathSchema).min(1).describe("Paths to delete."),
  }),
});

export const VFS_COMMIT_TURN_TOOL = defineTool({
  name: "vfs_commit_turn",
  description:
    "Fast path: append a new turn to the active fork and set it active (writes conversation index + turn file).",
  parameters: z.object({
    userAction: z
      .string()
      .describe(
        "The player's action text for this turn (stored in the turn file).",
      ),
    assistant: z
      .object({
        narrative: z
          .string()
          .describe("The assistant narrative (Markdown text for the player)."),
        choices: z
          .array(
            z
              .object({
                text: z.string(),
                consequence: z.string().nullish(),
              })
              .strict(),
          )
          .min(2)
          .max(4)
          .describe("2-4 player choices for the next step."),
        narrativeTone: z.string().nullish(),
        atmosphere: z.unknown().nullish(),
        ending: z.string().nullish(),
        forceEnd: z.boolean().nullish(),
      })
      .strict()
      .describe("Assistant payload stored in the turn file."),
    createdAt: z
      .number()
      .int()
      .nullish()
      .describe("Override createdAt timestamp (ms). Default: now."),
  }),
});

export const VFS_TX_TOOL = defineTool({
  name: "vfs_tx",
  description:
    "Apply a mixed batch of VFS operations atomically. Use this to reduce tool calls. If present, commit_turn MUST appear at most once and MUST be the last op.",
  parameters: z.object({
    ops: z.array(vfsTxOpSchema).min(1).describe("Ordered operations."),
  }),
});

export const ALL_DEFINED_TOOLS: ZodToolDefinition[] = [
  VFS_LS_TOOL,
  VFS_READ_TOOL,
  VFS_READ_MANY_TOOL,
  VFS_SEARCH_TOOL,
  VFS_GREP_TOOL,
  VFS_WRITE_TOOL,
  VFS_EDIT_TOOL,
  VFS_MERGE_TOOL,
  VFS_MOVE_TOOL,
  VFS_DELETE_TOOL,
  VFS_COMMIT_TURN_TOOL,
  VFS_TX_TOOL,
];

// Legacy export name kept for compatibility (internal-only).
export const TOOLS = ALL_DEFINED_TOOLS;

// ============================================================================
// SUMMARY TOOLS
// ============================================================================

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

export const FINISH_SUMMARY_TOOL = defineTool({
  name: "finish_summary",
  description: `Complete the summarization with the final summary object.

You MUST provide:
- displayText: 2-3 sentence summary for UI (visible layer only, story language)
- visible: What the PROTAGONIST knows/experienced
- hidden: GM-only truth the protagonist does NOT know`,
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
      characterDevelopment: z.string().describe("How the protagonist changed"),
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

export function getSummaryTools(): ZodToolDefinition[] {
  return [
    SUMMARY_QUERY_SEGMENTS_TOOL,
    SUMMARY_QUERY_STATE_TOOL,
    FINISH_SUMMARY_TOOL,
  ];
}

// ============================================================================
// TOOL PARAMETER TYPE MAP (for getTypedArgs casting)
// ============================================================================

export type VfsLsParams = InferToolParams<typeof VFS_LS_TOOL>;
export type VfsReadParams = InferToolParams<typeof VFS_READ_TOOL>;
export type VfsReadManyParams = InferToolParams<typeof VFS_READ_MANY_TOOL>;
export type VfsSearchParams = InferToolParams<typeof VFS_SEARCH_TOOL>;
export type VfsGrepParams = InferToolParams<typeof VFS_GREP_TOOL>;
export type VfsWriteParams = InferToolParams<typeof VFS_WRITE_TOOL>;
export type VfsEditParams = InferToolParams<typeof VFS_EDIT_TOOL>;
export type VfsMergeParams = InferToolParams<typeof VFS_MERGE_TOOL>;
export type VfsMoveParams = InferToolParams<typeof VFS_MOVE_TOOL>;
export type VfsDeleteParams = InferToolParams<typeof VFS_DELETE_TOOL>;
export type VfsCommitTurnParams = InferToolParams<typeof VFS_COMMIT_TURN_TOOL>;
export type VfsTxParams = InferToolParams<typeof VFS_TX_TOOL>;

export type SummaryQuerySegmentsParams = InferToolParams<
  typeof SUMMARY_QUERY_SEGMENTS_TOOL
>;
export type SummaryQueryStateParams = InferToolParams<
  typeof SUMMARY_QUERY_STATE_TOOL
>;
export type FinishSummaryParams = InferToolParams<typeof FINISH_SUMMARY_TOOL>;

export interface ToolParamsMap {
  vfs_ls: VfsLsParams;
  vfs_read: VfsReadParams;
  vfs_read_many: VfsReadManyParams;
  vfs_search: VfsSearchParams;
  vfs_grep: VfsGrepParams;
  vfs_write: VfsWriteParams;
  vfs_edit: VfsEditParams;
  vfs_merge: VfsMergeParams;
  vfs_move: VfsMoveParams;
  vfs_delete: VfsDeleteParams;
  vfs_commit_turn: VfsCommitTurnParams;
  vfs_tx: VfsTxParams;

  summary_query_segments: SummaryQuerySegmentsParams;
  summary_query_state: SummaryQueryStateParams;
  finish_summary: FinishSummaryParams;
}

export type ToolName = keyof ToolParamsMap;

export function getTypedArgs<T extends ToolName>(
  _name: T,
  args: Record<string, unknown>,
): ToolParamsMap[T] {
  return args as ToolParamsMap[T];
}
