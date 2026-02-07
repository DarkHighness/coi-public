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
import {
  atmosphereSchema,
  outlinePhase0Schema,
  outlinePhase1Schema,
  outlinePhase2Schema,
  outlinePhase3Schema,
  outlinePhase4Schema,
  outlinePhase5Schema,
  outlinePhase6Schema,
  outlinePhase7Schema,
  outlinePhase8Schema,
  outlinePhase9Schema,
} from "./schemas";
import { vfsToolCapabilityRegistry } from "./vfs/core/toolCapabilityRegistry";

// ============================================================================
// Type-Safe Tool Definition Helper
// ============================================================================

const buildVfsToolPermissionContract = (toolName: string): string | null => {
  const capability = vfsToolCapabilityRegistry.get(toolName);
  if (!capability) {
    return null;
  }

  const clauses: string[] = [];

  if (capability.readOnly) {
    clauses.push("read-only");
  } else {
    clauses.push(`writes ${capability.mayWriteClasses.join(", ")}`);
  }

  if (capability.needsElevationFor.includes("elevated_editable")) {
    clauses.push(
      "elevated_editable requires one-time user-confirmed token in /god or /sudo",
    );
  }

  if (capability.isFinishTool) {
    clauses.push("finish protocol tool");
  } else if (capability.mayWriteClasses.includes("finish_guarded")) {
    clauses.push("finish_guarded writable only via commit/finish protocol");
  }

  if (capability.immutableZones.length > 0) {
    clauses.push(`immutable zones blocked: ${capability.immutableZones.join(", ")}`);
  }

  return `Permission contract: ${clauses.join("; ")}.`;
};

export function defineTool<TParams extends ZodObject<ZodRawShape>>(
  definition: TypedToolDefinition<TParams>,
): TypedToolDefinition<TParams> {
  if (!definition.name.startsWith("vfs_")) {
    return definition;
  }

  const contract = buildVfsToolPermissionContract(definition.name);
  if (!contract) {
    return definition;
  }

  return {
    ...definition,
    description: `${definition.description} ${contract}`,
  };
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

const vfsContentTypeSchema = z.enum([
  "application/json",
  "text/plain",
  "text/markdown",
]);

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

const vfsJsonPatchOpSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("add"),
      path: z.string().describe("JSON Pointer path."),
      value: jsonValueSchema.describe("JSON value for add."),
      from: z.string().nullish().describe("Ignored for add."),
    })
    .strict(),
  z
    .object({
      op: z.literal("replace"),
      path: z.string().describe("JSON Pointer path."),
      value: jsonValueSchema.describe("JSON value for replace."),
      from: z.string().nullish().describe("Ignored for replace."),
    })
    .strict(),
  z
    .object({
      op: z.literal("test"),
      path: z.string().describe("JSON Pointer path."),
      value: jsonValueSchema.describe("JSON value for test."),
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
    start: z
      .number()
      .int()
      .min(0)
      .nullish()
      .describe(
        "Optional start character index (0-based). Prefer omitting; null is default.",
      ),
    offset: z
      .number()
      .int()
      .positive()
      .nullish()
      .describe(
        "Optional number of characters to read starting at start. Prefer omitting; null is default.",
      ),
    maxChars: z
      .number()
      .int()
      .positive()
      .nullish()
      .describe(
        "Optional max characters (truncate large files). Prefer omitting; null is treated as default (no truncation).",
      ),
  }),
});

export const VFS_SCHEMA_TOOL = defineTool({
  name: "vfs_schema",
  description:
    "Describe the expected JSON schema for a VFS path (Zod-based). Helps avoid invalid keys and missing fields.",
  parameters: z
    .object({
      paths: z
        .array(vfsPathSchema)
        .min(1)
        .describe(
          "Paths to describe. Prefer paths under current/; if omitted, current/ is assumed.",
        ),
    })
    .strict(),
});

export const VFS_STAT_TOOL = defineTool({
  name: "vfs_stat",
  description:
    "Get VFS metadata for one or more paths (files or directories). Returns no file content.",
  parameters: z
    .object({
      paths: z
        .array(vfsPathSchema)
        .min(1)
        .describe(
          "Paths to stat. Prefer paths under current/; if omitted, current/ is assumed.",
        ),
    })
    .strict(),
});

export const VFS_GLOB_TOOL = defineTool({
  name: "vfs_glob",
  description:
    "Find VFS files matching glob pattern(s) (supports **, *, ?). Prefer current/ prefix; if omitted, current/ is assumed.",
  parameters: z
    .object({
      patterns: z
        .array(z.string().min(1))
        .min(1)
        .describe(
          'Glob patterns (e.g. "current/world/**/*.json" or "world/**/*.json").',
        ),
      excludePatterns: z
        .array(z.string().min(1))
        .min(1)
        .nullish()
        .describe(
          'Optional exclude patterns (e.g. "world/**/tmp-*.json"). Prefer omitting; null is default.',
        ),
      ignoreCase: z
        .boolean()
        .nullish()
        .describe(
          "Optional case-insensitive matching. Prefer omitting; null is false.",
        ),
      returnMeta: z
        .boolean()
        .nullish()
        .describe(
          "When true, include per-file metadata (contentType/size/hash/updatedAt/totalChars) in the result. Prefer omitting; null is false.",
        ),
      metaFields: z
        .array(
          z.enum(["contentType", "size", "hash", "updatedAt", "totalChars"]),
        )
        .min(1)
        .nullish()
        .describe(
          "Optional subset of metadata fields to include when returnMeta is enabled. If provided, returnMeta is implied. Prefer omitting; null is default (all fields).",
        ),
      limit: z
        .number()
        .int()
        .positive()
        .nullish()
        .describe("Optional max matches. Default: 200. Prefer omitting; null is default."),
    })
    .strict(),
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

export const VFS_READ_JSON_TOOL = defineTool({
  name: "vfs_read_json",
  description:
    "Read one or more JSON Pointer subpaths from a JSON VFS file (compact JSON, optionally truncated).",
  parameters: z.object({
    path: vfsFilePathSchema.describe("JSON file path."),
    pointers: z
      .array(z.string())
      .min(1)
      .describe(
        "JSON Pointer paths to extract (e.g. '/visible/name'). Use '' or '/' for the root document.",
      ),
    maxChars: z
      .number()
      .int()
      .positive()
      .nullish()
      .describe(
        "Optional max characters per extracted value (after JSON.stringify). Default: 4000. Prefer omitting; null is default.",
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

export const VFS_APPEND_TOOL = defineTool({
  name: "vfs_append",
  description:
    "Append text to one or more VFS text files (atomic batch). Designed for markdown notes without needing a full rewrite.",
  parameters: z
    .object({
      appends: z
        .array(
          z
            .object({
              path: vfsFilePathSchema.describe("File path (text/markdown)."),
              content: z.string().describe("Text to append."),
              expectedHash: z
                .string()
                .nullish()
                .describe(
                  "Optional optimistic concurrency guard. If provided and the file exists, the append will fail unless the existing file hash matches this value (use vfs_read first to get it). Prefer omitting; null is disabled.",
                ),
              ensureNewline: z
                .boolean()
                .nullish()
                .describe(
                  "If true, insert a newline between existing content and appended content when needed. Prefer omitting; null uses default true.",
                ),
              maxTotalChars: z
                .number()
                .int()
                .positive()
                .nullish()
                .describe(
                  "Optional max characters allowed after append. Prefer omitting; null uses default (no cap).",
                ),
            })
            .strict(),
        )
        .min(1)
        .describe("Append operations."),
    })
    .strict(),
});

const vfsTextOccurrenceSchema = z.enum(["first", "last"]);
const vfsIfNotFoundSchema = z.enum(["error", "append"]);

const vfsTextEditOpSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("insert_after"),
      marker: z.string().describe("Marker text (literal or regex)."),
      markerIsRegex: z
        .boolean()
        .nullish()
        .describe("Treat marker as regex. Prefer omitting; null is false."),
      markerFlags: z
        .string()
        .nullish()
        .describe("Regex flags (e.g. 'i'). Only used when markerIsRegex=true."),
      occurrence: vfsTextOccurrenceSchema
        .nullish()
        .describe("Which match to use. Prefer omitting; null is first."),
      content: z.string().describe("Text to insert."),
      ifNotFound: vfsIfNotFoundSchema
        .nullish()
        .describe(
          "Behavior when marker is missing. Prefer omitting; null is error.",
        ),
    })
    .strict(),
  z
    .object({
      op: z.literal("insert_before"),
      marker: z.string().describe("Marker text (literal or regex)."),
      markerIsRegex: z
        .boolean()
        .nullish()
        .describe("Treat marker as regex. Prefer omitting; null is false."),
      markerFlags: z
        .string()
        .nullish()
        .describe("Regex flags (e.g. 'i'). Only used when markerIsRegex=true."),
      occurrence: vfsTextOccurrenceSchema
        .nullish()
        .describe("Which match to use. Prefer omitting; null is first."),
      content: z.string().describe("Text to insert."),
      ifNotFound: vfsIfNotFoundSchema
        .nullish()
        .describe(
          "Behavior when marker is missing. Prefer omitting; null is error.",
        ),
    })
    .strict(),
  z
    .object({
      op: z.literal("replace_between"),
      start: z.string().describe("Start marker text (literal or regex)."),
      startIsRegex: z
        .boolean()
        .nullish()
        .describe("Treat start marker as regex. Prefer omitting; null is false."),
      startFlags: z
        .string()
        .nullish()
        .describe("Regex flags for start marker."),
      end: z.string().describe("End marker text (literal or regex)."),
      endIsRegex: z
        .boolean()
        .nullish()
        .describe("Treat end marker as regex. Prefer omitting; null is false."),
      endFlags: z.string().nullish().describe("Regex flags for end marker."),
      occurrence: vfsTextOccurrenceSchema
        .nullish()
        .describe("Which start marker match to use. Prefer omitting; null is first."),
      content: z.string().describe("Replacement text for the region between markers."),
      ifNotFound: vfsIfNotFoundSchema
        .nullish()
        .describe(
          "Behavior when markers are missing. Prefer omitting; null is error.",
        ),
    })
    .strict(),
  z
    .object({
      op: z.literal("replace"),
      from: z.string().describe("Literal substring to replace."),
      to: z.string().describe("Replacement string."),
      count: z
        .number()
        .int()
        .positive()
        .nullish()
        .describe("Max replacements. Prefer omitting; null is 1."),
    })
    .strict(),
  z
    .object({
      op: z.literal("regex_replace"),
      pattern: z.string().describe("Regex pattern."),
      flags: z
        .string()
        .nullish()
        .describe("Regex flags (e.g. 'i'). Prefer omitting; null is default."),
      replacement: z.string().describe("Replacement string."),
      count: z
        .number()
        .int()
        .positive()
        .nullish()
        .describe("Max replacements. Prefer omitting; null is 1."),
    })
    .strict(),
  z
    .object({
      op: z.literal("insert_lines_before"),
      line: z
        .number()
        .int()
        .positive()
        .describe("1-based line number to insert before (1 inserts at top)."),
      content: z.string().describe("Lines to insert (may contain newlines)."),
    })
    .strict(),
  z
    .object({
      op: z.literal("insert_lines_after"),
      line: z
        .number()
        .int()
        .positive()
        .describe("1-based line number to insert after (N inserts after line N)."),
      content: z.string().describe("Lines to insert (may contain newlines)."),
    })
    .strict(),
  z
    .object({
      op: z.literal("replace_lines"),
      startLine: z.number().int().positive().describe("1-based start line (inclusive)."),
      endLine: z.number().int().positive().describe("1-based end line (inclusive)."),
      content: z.string().describe("Replacement lines (may contain newlines)."),
    })
    .strict(),
]);

export const VFS_TEXT_EDIT_TOOL = defineTool({
  name: "vfs_text_edit",
  description:
    "Edit one or more VFS text files using marker/regex/line-based operations (atomic batch). Intended for notes.md updates without manual full rewrites.",
  parameters: z
    .object({
      files: z
        .array(
          z
            .object({
              path: vfsFilePathSchema.describe("File path (text/markdown)."),
              createIfMissing: z
                .boolean()
                .nullish()
                .describe(
                  "Create the file if it does not exist. Prefer omitting; null is true.",
                ),
              expectedHash: z
                .string()
                .nullish()
                .describe(
                  "Optional optimistic concurrency guard. If provided and the file exists, edits will fail unless the existing file hash matches this value (use vfs_read first to get it). Prefer omitting; null is disabled.",
                ),
              maxTotalChars: z
                .number()
                .int()
                .positive()
                .nullish()
                .describe(
                  "Optional max characters allowed after edits. Prefer omitting; null uses default (no cap).",
                ),
              ops: z
                .array(vfsTextEditOpSchema)
                .min(1)
                .describe("Text edit operations applied sequentially."),
            })
            .strict(),
        )
        .min(1)
        .describe("Files to edit."),
    })
    .strict(),
});

export const VFS_TEXT_PATCH_TOOL = defineTool({
  name: "vfs_text_patch",
  description:
    "Replace full text file contents using base->next guard (atomic batch). For existing files, base must exactly match current content.",
  parameters: z
    .object({
      files: z
        .array(
          z
            .object({
              path: vfsFilePathSchema.describe(
                "File path (text/plain or text/markdown).",
              ),
              base: z
                .string()
                .describe(
                  "Expected current content. Existing files must match exactly; new files require empty base.",
                ),
              next: z.string().describe("New full text content."),
              createIfMissing: z
                .boolean()
                .nullish()
                .describe(
                  "Create file if missing. Prefer omitting; null is false.",
                ),
              expectedHash: z
                .string()
                .nullish()
                .describe(
                  "Optional optimistic concurrency guard. If provided and file exists, current hash must match.",
                ),
              maxTotalChars: z
                .number()
                .int()
                .positive()
                .nullish()
                .describe(
                  "Optional max characters allowed after patch. Prefer omitting; null uses default (no cap).",
                ),
            })
            .strict(),
        )
        .min(1)
        .describe("Files to patch."),
    })
    .strict(),
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
      content: z
        .record(jsonValueSchema)
        .describe("JSON object to merge."),
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
          atmosphere: atmosphereSchema.nullish(),
          ending: z.string().nullish(),
          forceEnd: z.boolean().nullish(),
        })
        .strict()
        .describe("Assistant payload stored in the turn file."),
      retconAck: z
        .object({
          hash: z.string().describe("Pending prompt injection hash to acknowledge."),
          summary: z
            .string()
            .describe("Short in-world retcon acknowledgement summary."),
        })
        .strict()
        .nullish()
        .describe(
          "Required when a prompt retcon acknowledgement is pending for this save.",
        ),
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
            .record(jsonValueSchema)
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
        atmosphere: atmosphereSchema.nullish(),
        ending: z.string().nullish(),
        forceEnd: z.boolean().nullish(),
      })
      .strict()
      .describe("Assistant payload stored in the turn file."),
    retconAck: z
      .object({
        hash: z.string().describe("Pending prompt injection hash to acknowledge."),
        summary: z
          .string()
          .describe("Short in-world retcon acknowledgement summary."),
      })
      .strict()
      .nullish()
      .describe(
        "Required when a prompt retcon acknowledgement is pending for this save.",
      ),
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

// ============================================================================
// VFS SHORTCUT TOOLS (loop-scoped allowlist)
// ============================================================================

export const VFS_CATALOG_CATEGORY_SCHEMA = z.enum([
  "inventory",
  "location_items",
  "npcs",
  "locations",
  "location_views",
  "quests",
  "quest_views",
  "knowledge",
  "knowledge_views",
  "factions",
  "faction_views",
  "timeline",
  "timeline_views",
  "causal_chains",
  "causal_chain_views",
  "world_info",
  "character_profile",
  "character_skills",
  "character_conditions",
  "character_traits",
  "summary",
]);

export type VfsCatalogCategory = z.infer<typeof VFS_CATALOG_CATEGORY_SCHEMA>;

export const VFS_LS_ENTRIES_TOOL = defineTool({
  name: "vfs_ls_entries",
  description:
    "List a compact catalog of important game files by category (read-only). Intended for Cleanup + Summary loops.",
  parameters: z
    .object({
      categories: z
        .array(VFS_CATALOG_CATEGORY_SCHEMA)
        .min(1)
        .describe("Categories to list."),
      limitPerCategory: z
        .number()
        .int()
        .positive()
        .nullish()
        .describe(
          "Optional max entries per category. Prefer omitting; null means no limit.",
        ),
    })
    .strict(),
});

export const VFS_SUGGEST_DUPLICATES_TOOL = defineTool({
  name: "vfs_suggest_duplicates",
  description:
    "Suggest candidate duplicate groups within a category (read-only). Intended for Cleanup loop. Output must not reveal hidden NPC trueNames.",
  parameters: z
    .object({
      category: VFS_CATALOG_CATEGORY_SCHEMA.describe("Category to analyze."),
      threshold: z
        .number()
        .min(0)
        .max(1)
        .nullish()
        .describe(
          "Fuse.js threshold (lower is stricter). Prefer omitting; null uses default.",
        ),
      limitGroups: z
        .number()
        .int()
        .positive()
        .nullish()
        .describe("Optional max groups returned. Prefer omitting; null is default."),
      maxCandidatesPerGroup: z
        .number()
        .int()
        .positive()
        .nullish()
        .describe(
          "Optional max candidates returned per group. Prefer omitting; null is default.",
        ),
    })
    .strict(),
});

const summaryVisibleToolSchema = z
  .object({
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
  })
  .strict();

const summaryHiddenToolSchema = z
  .object({
    truthNarrative: z.string().describe("What ACTUALLY happened (GM truth)"),
    hiddenPlots: z
      .array(z.string())
      .describe("Plot threads player doesn't know about"),
    npcActions: z.array(z.string()).describe("What NPCs did off-screen"),
    worldTruth: z.string().describe("Real state of the world"),
    unrevealed: z
      .array(z.string())
      .describe("Secrets not yet revealed to player"),
  })
  .strict();

export const VFS_FINISH_SUMMARY_TOOL = defineTool({
  name: "vfs_finish_summary",
  description:
    "Finish the summary loop by appending a StorySummary and updating current/summary/state.json. This tool MUST be your LAST tool call.",
  parameters: z
    .object({
      id: z
        .number()
        .int()
        .nullish()
        .describe("Optional summary id. Ignored; the system will generate one."),
      displayText: z
        .string()
        .describe(
          "Concise 2-3 sentence summary for UI display. MUST be in story language.",
        ),
      visible: summaryVisibleToolSchema,
      hidden: summaryHiddenToolSchema,
      timeRange: z
        .object({
          from: z.string().describe("Start time in story"),
          to: z.string().describe("End time in story"),
        })
        .nullish(),
      nodeRange: z
        .object({
          fromIndex: z.number().int(),
          toIndex: z.number().int(),
        })
        .describe("Node range covered by this summary."),
      lastSummarizedIndex: z
        .number()
        .int()
        .describe("MUST equal nodeRange.toIndex + 1."),
    })
    .strict(),
});

const buildOutlineSubmitTool = <TSchema extends ZodObject<ZodRawShape>>(
  phase: number,
  schema: TSchema,
) =>
  defineTool({
    name: `vfs_submit_outline_phase_${phase}`,
    description: `Submit outline phase ${phase} payload. Validates and writes to current/outline/phases/phase${phase}.json (VFS).`,
    parameters: z
      .object({
        data: schema.describe(`Outline phase ${phase} payload JSON object.`),
      })
      .strict(),
  });

export const VFS_SUBMIT_OUTLINE_PHASE_0_TOOL = buildOutlineSubmitTool(
  0,
  outlinePhase0Schema,
);
export const VFS_SUBMIT_OUTLINE_PHASE_1_TOOL = buildOutlineSubmitTool(
  1,
  outlinePhase1Schema,
);
export const VFS_SUBMIT_OUTLINE_PHASE_2_TOOL = buildOutlineSubmitTool(
  2,
  outlinePhase2Schema,
);
export const VFS_SUBMIT_OUTLINE_PHASE_3_TOOL = buildOutlineSubmitTool(
  3,
  outlinePhase3Schema,
);
export const VFS_SUBMIT_OUTLINE_PHASE_4_TOOL = buildOutlineSubmitTool(
  4,
  outlinePhase4Schema,
);
export const VFS_SUBMIT_OUTLINE_PHASE_5_TOOL = buildOutlineSubmitTool(
  5,
  outlinePhase5Schema,
);
export const VFS_SUBMIT_OUTLINE_PHASE_6_TOOL = buildOutlineSubmitTool(
  6,
  outlinePhase6Schema,
);
export const VFS_SUBMIT_OUTLINE_PHASE_7_TOOL = buildOutlineSubmitTool(
  7,
  outlinePhase7Schema,
);
export const VFS_SUBMIT_OUTLINE_PHASE_8_TOOL = buildOutlineSubmitTool(
  8,
  outlinePhase8Schema,
);
export const VFS_SUBMIT_OUTLINE_PHASE_9_TOOL = buildOutlineSubmitTool(
  9,
  outlinePhase9Schema,
);

export const VFS_SUBMIT_OUTLINE_PHASE_TOOLS = [
  VFS_SUBMIT_OUTLINE_PHASE_0_TOOL,
  VFS_SUBMIT_OUTLINE_PHASE_1_TOOL,
  VFS_SUBMIT_OUTLINE_PHASE_2_TOOL,
  VFS_SUBMIT_OUTLINE_PHASE_3_TOOL,
  VFS_SUBMIT_OUTLINE_PHASE_4_TOOL,
  VFS_SUBMIT_OUTLINE_PHASE_5_TOOL,
  VFS_SUBMIT_OUTLINE_PHASE_6_TOOL,
  VFS_SUBMIT_OUTLINE_PHASE_7_TOOL,
  VFS_SUBMIT_OUTLINE_PHASE_8_TOOL,
  VFS_SUBMIT_OUTLINE_PHASE_9_TOOL,
] as const;

export const ALL_DEFINED_TOOLS: ZodToolDefinition[] = [
  VFS_LS_TOOL,
  VFS_READ_TOOL,
  VFS_SCHEMA_TOOL,
  VFS_STAT_TOOL,
  VFS_GLOB_TOOL,
  VFS_READ_MANY_TOOL,
  VFS_READ_JSON_TOOL,
  VFS_SEARCH_TOOL,
  VFS_GREP_TOOL,
  VFS_LS_ENTRIES_TOOL,
  VFS_SUGGEST_DUPLICATES_TOOL,
  VFS_WRITE_TOOL,
  VFS_APPEND_TOOL,
  VFS_TEXT_EDIT_TOOL,
  VFS_TEXT_PATCH_TOOL,
  VFS_EDIT_TOOL,
  VFS_MERGE_TOOL,
  VFS_MOVE_TOOL,
  VFS_DELETE_TOOL,
  VFS_COMMIT_TURN_TOOL,
  VFS_TX_TOOL,
  VFS_FINISH_SUMMARY_TOOL,
  ...VFS_SUBMIT_OUTLINE_PHASE_TOOLS,
];

// Legacy export name kept for compatibility (internal-only).
export const TOOLS = ALL_DEFINED_TOOLS;

// ============================================================================
// TOOL PARAMETER TYPE MAP (for getTypedArgs casting)
// ============================================================================

export type VfsLsParams = InferToolParams<typeof VFS_LS_TOOL>;
export type VfsReadParams = InferToolParams<typeof VFS_READ_TOOL>;
export type VfsSchemaParams = InferToolParams<typeof VFS_SCHEMA_TOOL>;
export type VfsStatParams = InferToolParams<typeof VFS_STAT_TOOL>;
export type VfsGlobParams = InferToolParams<typeof VFS_GLOB_TOOL>;
export type VfsReadManyParams = InferToolParams<typeof VFS_READ_MANY_TOOL>;
export type VfsReadJsonParams = InferToolParams<typeof VFS_READ_JSON_TOOL>;
export type VfsSearchParams = InferToolParams<typeof VFS_SEARCH_TOOL>;
export type VfsGrepParams = InferToolParams<typeof VFS_GREP_TOOL>;
export type VfsWriteParams = InferToolParams<typeof VFS_WRITE_TOOL>;
export type VfsAppendParams = InferToolParams<typeof VFS_APPEND_TOOL>;
export type VfsTextEditParams = InferToolParams<typeof VFS_TEXT_EDIT_TOOL>;
export type VfsTextPatchParams = InferToolParams<typeof VFS_TEXT_PATCH_TOOL>;
export type VfsEditParams = InferToolParams<typeof VFS_EDIT_TOOL>;
export type VfsMergeParams = InferToolParams<typeof VFS_MERGE_TOOL>;
export type VfsMoveParams = InferToolParams<typeof VFS_MOVE_TOOL>;
export type VfsDeleteParams = InferToolParams<typeof VFS_DELETE_TOOL>;
export type VfsCommitTurnParams = InferToolParams<typeof VFS_COMMIT_TURN_TOOL>;
export type VfsTxParams = InferToolParams<typeof VFS_TX_TOOL>;
export type VfsLsEntriesParams = InferToolParams<typeof VFS_LS_ENTRIES_TOOL>;
export type VfsSuggestDuplicatesParams = InferToolParams<
  typeof VFS_SUGGEST_DUPLICATES_TOOL
>;
export type VfsFinishSummaryParams = InferToolParams<
  typeof VFS_FINISH_SUMMARY_TOOL
>;
export type VfsSubmitOutlinePhase0Params = InferToolParams<
  typeof VFS_SUBMIT_OUTLINE_PHASE_0_TOOL
>;
export type VfsSubmitOutlinePhase1Params = InferToolParams<
  typeof VFS_SUBMIT_OUTLINE_PHASE_1_TOOL
>;
export type VfsSubmitOutlinePhase2Params = InferToolParams<
  typeof VFS_SUBMIT_OUTLINE_PHASE_2_TOOL
>;
export type VfsSubmitOutlinePhase3Params = InferToolParams<
  typeof VFS_SUBMIT_OUTLINE_PHASE_3_TOOL
>;
export type VfsSubmitOutlinePhase4Params = InferToolParams<
  typeof VFS_SUBMIT_OUTLINE_PHASE_4_TOOL
>;
export type VfsSubmitOutlinePhase5Params = InferToolParams<
  typeof VFS_SUBMIT_OUTLINE_PHASE_5_TOOL
>;
export type VfsSubmitOutlinePhase6Params = InferToolParams<
  typeof VFS_SUBMIT_OUTLINE_PHASE_6_TOOL
>;
export type VfsSubmitOutlinePhase7Params = InferToolParams<
  typeof VFS_SUBMIT_OUTLINE_PHASE_7_TOOL
>;
export type VfsSubmitOutlinePhase8Params = InferToolParams<
  typeof VFS_SUBMIT_OUTLINE_PHASE_8_TOOL
>;
export type VfsSubmitOutlinePhase9Params = InferToolParams<
  typeof VFS_SUBMIT_OUTLINE_PHASE_9_TOOL
>;

export interface ToolParamsMap {
  vfs_ls: VfsLsParams;
  vfs_read: VfsReadParams;
  vfs_schema: VfsSchemaParams;
  vfs_stat: VfsStatParams;
  vfs_glob: VfsGlobParams;
  vfs_read_many: VfsReadManyParams;
  vfs_read_json: VfsReadJsonParams;
  vfs_search: VfsSearchParams;
  vfs_grep: VfsGrepParams;
  vfs_ls_entries: VfsLsEntriesParams;
  vfs_suggest_duplicates: VfsSuggestDuplicatesParams;
  vfs_write: VfsWriteParams;
  vfs_append: VfsAppendParams;
  vfs_text_edit: VfsTextEditParams;
  vfs_text_patch: VfsTextPatchParams;
  vfs_edit: VfsEditParams;
  vfs_merge: VfsMergeParams;
  vfs_move: VfsMoveParams;
  vfs_delete: VfsDeleteParams;
  vfs_commit_turn: VfsCommitTurnParams;
  vfs_tx: VfsTxParams;
  vfs_finish_summary: VfsFinishSummaryParams;
  vfs_submit_outline_phase_0: VfsSubmitOutlinePhase0Params;
  vfs_submit_outline_phase_1: VfsSubmitOutlinePhase1Params;
  vfs_submit_outline_phase_2: VfsSubmitOutlinePhase2Params;
  vfs_submit_outline_phase_3: VfsSubmitOutlinePhase3Params;
  vfs_submit_outline_phase_4: VfsSubmitOutlinePhase4Params;
  vfs_submit_outline_phase_5: VfsSubmitOutlinePhase5Params;
  vfs_submit_outline_phase_6: VfsSubmitOutlinePhase6Params;
  vfs_submit_outline_phase_7: VfsSubmitOutlinePhase7Params;
  vfs_submit_outline_phase_8: VfsSubmitOutlinePhase8Params;
  vfs_submit_outline_phase_9: VfsSubmitOutlinePhase9Params;
}

export type ToolName = keyof ToolParamsMap;

export function getTypedArgs<T extends ToolName>(
  _name: T,
  args: Record<string, unknown>,
): ToolParamsMap[T] {
  return args as ToolParamsMap[T];
}
