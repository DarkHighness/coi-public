/**
 * ============================================================================
 * Tool Definitions (VFS-only runtime)
 * ============================================================================
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

const OPERATION_HINTS_BY_TOOL: Record<string, string> = {
  vfs_write: "write",
  vfs_move: "move",
  vfs_delete: "delete",
  vfs_commit_turn: "finish_commit",
  vfs_commit_summary: "finish_summary",
};

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
    const operationHint = OPERATION_HINTS_BY_TOOL[toolName];
    if (operationHint) {
      clauses.push(`declared operation=${operationHint}`);
    }
    clauses.push("resource-template operation contracts enforced");
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
    clauses.push(
      `immutable zones blocked: ${capability.immutableZones.join(", ")}`,
    );
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

const vfsPathSchema = z
  .string()
  .describe(
    "VFS path (supports canonical `shared/**` / `forks/{id}/**` and alias `current/**`; leading/trailing slashes are ok).",
  );

const vfsOptionalPathSchema = vfsPathSchema
  .nullish()
  .describe("Optional VFS path. Prefer omitting; null is treated as root.");

const vfsFilePathSchema = vfsPathSchema.min(1, "Path is required.");

const vfsContentTypeSchema = z.enum([
  "application/json",
  "application/jsonl",
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
  description:
    "List VFS entries. Supports plain listing, glob filtering via patterns, and optional ls -l style metadata.",
  parameters: z
    .object({
      path: vfsOptionalPathSchema.describe(
        "Optional base directory path. Omit for root.",
      ),
      patterns: z
        .array(z.string().min(1))
        .min(1)
        .nullish()
        .describe(
          'Optional glob patterns under path (e.g. ["current/world/**/*.json"]).',
        ),
      excludePatterns: z
        .array(z.string().min(1))
        .min(1)
        .nullish()
        .describe("Optional glob exclude patterns."),
      ignoreCase: z
        .boolean()
        .nullish()
        .describe("Optional case-insensitive glob matching. Prefer omitting."),
      limit: z
        .number()
        .int()
        .positive()
        .nullish()
        .describe("Optional max matches. Default: 200."),
      stat: z
        .boolean()
        .nullish()
        .describe(
          "When true, include compact ls -l style metadata (kind/size/lines/mimeType/category/updatedAt).",
        ),
      includeExpected: z
        .boolean()
        .nullish()
        .describe(
          "When true, include expected VFS layout entries (template/scaffold derived) even if files are not created yet.",
        ),
      includeAccess: z
        .boolean()
        .nullish()
        .describe(
          "When true, include path access metadata (permissionClass/allowedWriteOps/readability/updateTriggers) for layout entries.",
        ),
    })
    .strict(),
});

export const VFS_READ_TOOL = defineTool({
  name: "vfs_read",
  description: "Read VFS files by chars, lines, or JSON pointers.",
  parameters: z
    .object({
      mode: z
        .enum(["chars", "lines", "json"])
        .nullish()
        .describe("Read mode. Default: chars."),
      path: vfsFilePathSchema.describe("File path."),
      start: z
        .number()
        .int()
        .min(0)
        .nullish()
        .describe("Chars mode: optional start character index (0-based)."),
      offset: z
        .number()
        .int()
        .positive()
        .nullish()
        .describe(
          "Chars mode: optional number of characters to read from start.",
        ),
      maxChars: z
        .number()
        .int()
        .positive()
        .max(16_384)
        .nullish()
        .describe(
          "Chars/JSON mode: optional max characters (must be <= 16384 hard read cap).",
        ),
      startLine: z
        .number()
        .int()
        .positive()
        .nullish()
        .describe("Lines mode: optional 1-based start line."),
      endLine: z
        .number()
        .int()
        .positive()
        .nullish()
        .describe("Lines mode: optional 1-based end line (inclusive)."),
      lineCount: z
        .number()
        .int()
        .positive()
        .nullish()
        .describe("Lines mode: optional number of lines from startLine."),
      pointers: z
        .array(z.string())
        .min(1)
        .nullish()
        .describe(
          "JSON mode: JSON Pointer paths to extract (e.g. '/visible/name'). Use '' or '/' for root document.",
        ),
    })
    .strict(),
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
          "Paths to describe. Supports canonical (`shared/**`, `forks/{id}/**`) and alias (`current/**`, or logical shorthand).",
        ),
    })
    .strict(),
});

export const VFS_SEARCH_TOOL = defineTool({
  name: "vfs_search",
  description:
    "Search VFS files by text/regex/fuzzy (optionally semantic, when available).",
  parameters: z
    .object({
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
        .int()
        .positive()
        .nullish()
        .describe(
          "Max results. Default: 20. Prefer omitting; null is default.",
        ),
    })
    .strict(),
});

export const VFS_SEARCH_TOOL_NO_SEMANTIC = defineTool({
  name: "vfs_search",
  description: "Search VFS files by text/regex/fuzzy.",
  parameters: VFS_SEARCH_TOOL.parameters.omit({ semantic: true }),
});

export function getVfsSearchToolDefinition(
  ragEnabled: boolean,
): ZodToolDefinition {
  return ragEnabled ? VFS_SEARCH_TOOL : VFS_SEARCH_TOOL_NO_SEMANTIC;
}

const vfsWriteOpSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("write_file"),
      path: vfsFilePathSchema.describe("File path."),
      content: z.string().describe("File contents."),
      contentType: vfsContentTypeSchema.describe("Content type."),
    })
    .strict(),
  z
    .object({
      op: z.literal("append_text"),
      path: vfsFilePathSchema.describe("File path (text/markdown)."),
      content: z.string().describe("Text to append."),
      expectedHash: z
        .string()
        .nullish()
        .describe("Optional optimistic concurrency guard."),
      ensureNewline: z
        .boolean()
        .nullish()
        .describe(
          "If true, insert newline when needed. Prefer omitting; default true.",
        ),
      maxTotalChars: z
        .number()
        .int()
        .positive()
        .nullish()
        .describe("Optional total char cap after append."),
    })
    .strict(),
  z
    .object({
      op: z.literal("edit_lines"),
      path: vfsFilePathSchema.describe("File path (text/markdown)."),
      edits: z
        .array(
          z.discriminatedUnion("kind", [
            z
              .object({
                kind: z.literal("insert_before"),
                line: z.number().int().positive(),
                content: z.string(),
              })
              .strict(),
            z
              .object({
                kind: z.literal("insert_after"),
                line: z.number().int().positive(),
                content: z.string(),
              })
              .strict(),
            z
              .object({
                kind: z.literal("replace_range"),
                startLine: z.number().int().positive(),
                endLine: z.number().int().positive(),
                content: z.string(),
              })
              .strict(),
          ]),
        )
        .min(1),
      createIfMissing: z
        .boolean()
        .nullish()
        .describe("Create file if missing. Prefer omitting; default true."),
      expectedHash: z
        .string()
        .nullish()
        .describe("Optional optimistic concurrency guard."),
      maxTotalChars: z
        .number()
        .int()
        .positive()
        .nullish()
        .describe("Optional total char cap after edits."),
    })
    .strict(),
  z
    .object({
      op: z.literal("patch_json"),
      path: vfsFilePathSchema.describe("JSON file path."),
      patch: z
        .array(vfsJsonPatchOpSchema)
        .min(1)
        .describe("JSON Patch operations."),
    })
    .strict(),
  z
    .object({
      op: z.literal("merge_json"),
      path: vfsFilePathSchema.describe("JSON file path."),
      content: z.record(jsonValueSchema).describe("JSON object to merge."),
    })
    .strict(),
]);

export const VFS_WRITE_TOOL = defineTool({
  name: "vfs_write",
  description: "Apply write/update operations to VFS files (atomic batch).",
  parameters: z
    .object({
      ops: z
        .array(vfsWriteOpSchema)
        .min(1)
        .describe("Ordered write operations."),
    })
    .strict(),
});

export const VFS_MOVE_TOOL = defineTool({
  name: "vfs_move",
  description: "Move or rename VFS paths (atomic batch).",
  parameters: z
    .object({
      moves: z
        .array(
          z
            .object({
              from: vfsFilePathSchema.describe("Source path."),
              to: vfsFilePathSchema.describe("Destination path."),
            })
            .strict(),
        )
        .min(1)
        .describe("Move operations."),
    })
    .strict(),
});

export const VFS_DELETE_TOOL = defineTool({
  name: "vfs_delete",
  description: "Delete one or more VFS paths (atomic batch).",
  parameters: z
    .object({
      paths: z.array(vfsFilePathSchema).min(1).describe("Paths to delete."),
    })
    .strict(),
});

export const VFS_COMMIT_TURN_TOOL = defineTool({
  name: "vfs_commit_turn",
  description:
    "Append a new turn to the active fork and set it active (writes conversation index + turn file).",
  parameters: z
    .object({
      userAction: z
        .string()
        .describe(
          "The player's action text for this turn (stored in the turn file).",
        ),
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
      meta: z
        .object({
          playerRate: z
            .object({
              vote: z.enum(["up", "down"]),
              preset: z.string().nullish(),
              comment: z.string().nullish(),
              createdAt: z.number().finite(),
              processedAt: z.number().finite().nullish(),
            })
            .strict()
            .nullish(),
        })
        .strict()
        .nullish()
        .describe("Optional turn metadata (e.g. player rating payload)."),
      retconAck: z
        .object({
          hash: z
            .string()
            .describe("Pending prompt injection hash to acknowledge."),
          summary: z
            .string()
            .describe("Short in-world retcon acknowledgement summary."),
        })
        .strict()
        .nullish()
        .describe(
          "Required when a prompt retcon acknowledgement is pending for this save.",
        ),
    })
    .strict(),
});

export const VFS_COMMIT_SOUL_TOOL = defineTool({
  name: "vfs_commit_soul",
  description:
    "Finish a Player Rate feedback loop by updating soul markdown docs (current save and/or global mirror).",
  parameters: z
    .object({
      currentSoul: z
        .string()
        .nullish()
        .describe(
          "Optional markdown content for current save soul (`current/world/soul.md`).",
        ),
      globalSoul: z
        .string()
        .nullish()
        .describe(
          "Optional markdown content for global soul mirror (`current/world/global/soul.md`).",
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

export const VFS_COMMIT_SUMMARY_TOOL = defineTool({
  name: "vfs_commit_summary",
  description:
    "Finish the summary loop by appending a StorySummary and updating forks/{activeFork}/story/summary/state.json. Runtime injects nodeRange/lastSummarizedIndex/id/createdAt.",
  parameters: z
    .object({
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
      nextSessionReferencesMarkdown: z
        .string()
        .nullish()
        .describe(
          "Optional markdown note listing key files/skills to revisit in the next session hot-start context.",
        ),
    })
    .strict(),
});

const buildOutlineCommitTool = <TSchema extends ZodObject<ZodRawShape>>(
  phase: number,
  schema: TSchema,
) =>
  defineTool({
    name: `vfs_commit_outline_phase_${phase}`,
    description: `Commit outline phase ${phase} payload. Validates and writes to shared/narrative/outline/phases/phase${phase}.json (alias: current/outline/phases/phase${phase}.json).`,
    parameters: z
      .object({
        data: schema.describe(`Outline phase ${phase} payload JSON object.`),
      })
      .strict(),
  });

export const VFS_COMMIT_OUTLINE_PHASE_0_TOOL = buildOutlineCommitTool(
  0,
  outlinePhase0Schema,
);
export const VFS_COMMIT_OUTLINE_PHASE_1_TOOL = buildOutlineCommitTool(
  1,
  outlinePhase1Schema,
);
export const VFS_COMMIT_OUTLINE_PHASE_2_TOOL = buildOutlineCommitTool(
  2,
  outlinePhase2Schema,
);
export const VFS_COMMIT_OUTLINE_PHASE_3_TOOL = buildOutlineCommitTool(
  3,
  outlinePhase3Schema,
);
export const VFS_COMMIT_OUTLINE_PHASE_4_TOOL = buildOutlineCommitTool(
  4,
  outlinePhase4Schema,
);
export const VFS_COMMIT_OUTLINE_PHASE_5_TOOL = buildOutlineCommitTool(
  5,
  outlinePhase5Schema,
);
export const VFS_COMMIT_OUTLINE_PHASE_6_TOOL = buildOutlineCommitTool(
  6,
  outlinePhase6Schema,
);
export const VFS_COMMIT_OUTLINE_PHASE_7_TOOL = buildOutlineCommitTool(
  7,
  outlinePhase7Schema,
);
export const VFS_COMMIT_OUTLINE_PHASE_8_TOOL = buildOutlineCommitTool(
  8,
  outlinePhase8Schema,
);
export const VFS_COMMIT_OUTLINE_PHASE_9_TOOL = buildOutlineCommitTool(
  9,
  outlinePhase9Schema,
);

export const VFS_COMMIT_OUTLINE_PHASE_TOOLS = [
  VFS_COMMIT_OUTLINE_PHASE_0_TOOL,
  VFS_COMMIT_OUTLINE_PHASE_1_TOOL,
  VFS_COMMIT_OUTLINE_PHASE_2_TOOL,
  VFS_COMMIT_OUTLINE_PHASE_3_TOOL,
  VFS_COMMIT_OUTLINE_PHASE_4_TOOL,
  VFS_COMMIT_OUTLINE_PHASE_5_TOOL,
  VFS_COMMIT_OUTLINE_PHASE_6_TOOL,
  VFS_COMMIT_OUTLINE_PHASE_7_TOOL,
  VFS_COMMIT_OUTLINE_PHASE_8_TOOL,
  VFS_COMMIT_OUTLINE_PHASE_9_TOOL,
] as const;

export const ALL_DEFINED_TOOLS: ZodToolDefinition[] = [
  VFS_LS_TOOL,
  VFS_SCHEMA_TOOL,
  VFS_READ_TOOL,
  VFS_SEARCH_TOOL,
  VFS_WRITE_TOOL,
  VFS_MOVE_TOOL,
  VFS_DELETE_TOOL,
  VFS_COMMIT_TURN_TOOL,
  VFS_COMMIT_SOUL_TOOL,
  VFS_COMMIT_SUMMARY_TOOL,
  ...VFS_COMMIT_OUTLINE_PHASE_TOOLS,
];

export const TOOLS = ALL_DEFINED_TOOLS;

export type VfsLsParams = InferToolParams<typeof VFS_LS_TOOL>;
export type VfsSchemaParams = InferToolParams<typeof VFS_SCHEMA_TOOL>;
export type VfsReadParams = InferToolParams<typeof VFS_READ_TOOL>;
export type VfsSearchParams = InferToolParams<typeof VFS_SEARCH_TOOL>;
export type VfsWriteParams = InferToolParams<typeof VFS_WRITE_TOOL>;
export type VfsMoveParams = InferToolParams<typeof VFS_MOVE_TOOL>;
export type VfsDeleteParams = InferToolParams<typeof VFS_DELETE_TOOL>;
export type VfsCommitTurnParams = InferToolParams<typeof VFS_COMMIT_TURN_TOOL>;
export type VfsCommitSoulParams = InferToolParams<typeof VFS_COMMIT_SOUL_TOOL>;
export type VfsCommitSummaryParams = InferToolParams<
  typeof VFS_COMMIT_SUMMARY_TOOL
>;
export type VfsCommitOutlinePhase0Params = InferToolParams<
  typeof VFS_COMMIT_OUTLINE_PHASE_0_TOOL
>;
export type VfsCommitOutlinePhase1Params = InferToolParams<
  typeof VFS_COMMIT_OUTLINE_PHASE_1_TOOL
>;
export type VfsCommitOutlinePhase2Params = InferToolParams<
  typeof VFS_COMMIT_OUTLINE_PHASE_2_TOOL
>;
export type VfsCommitOutlinePhase3Params = InferToolParams<
  typeof VFS_COMMIT_OUTLINE_PHASE_3_TOOL
>;
export type VfsCommitOutlinePhase4Params = InferToolParams<
  typeof VFS_COMMIT_OUTLINE_PHASE_4_TOOL
>;
export type VfsCommitOutlinePhase5Params = InferToolParams<
  typeof VFS_COMMIT_OUTLINE_PHASE_5_TOOL
>;
export type VfsCommitOutlinePhase6Params = InferToolParams<
  typeof VFS_COMMIT_OUTLINE_PHASE_6_TOOL
>;
export type VfsCommitOutlinePhase7Params = InferToolParams<
  typeof VFS_COMMIT_OUTLINE_PHASE_7_TOOL
>;
export type VfsCommitOutlinePhase8Params = InferToolParams<
  typeof VFS_COMMIT_OUTLINE_PHASE_8_TOOL
>;
export type VfsCommitOutlinePhase9Params = InferToolParams<
  typeof VFS_COMMIT_OUTLINE_PHASE_9_TOOL
>;

export interface ToolParamsMap {
  vfs_ls: VfsLsParams;
  vfs_schema: VfsSchemaParams;
  vfs_read: VfsReadParams;
  vfs_search: VfsSearchParams;
  vfs_write: VfsWriteParams;
  vfs_move: VfsMoveParams;
  vfs_delete: VfsDeleteParams;
  vfs_commit_turn: VfsCommitTurnParams;
  vfs_commit_soul: VfsCommitSoulParams;
  vfs_commit_summary: VfsCommitSummaryParams;
  vfs_commit_outline_phase_0: VfsCommitOutlinePhase0Params;
  vfs_commit_outline_phase_1: VfsCommitOutlinePhase1Params;
  vfs_commit_outline_phase_2: VfsCommitOutlinePhase2Params;
  vfs_commit_outline_phase_3: VfsCommitOutlinePhase3Params;
  vfs_commit_outline_phase_4: VfsCommitOutlinePhase4Params;
  vfs_commit_outline_phase_5: VfsCommitOutlinePhase5Params;
  vfs_commit_outline_phase_6: VfsCommitOutlinePhase6Params;
  vfs_commit_outline_phase_7: VfsCommitOutlinePhase7Params;
  vfs_commit_outline_phase_8: VfsCommitOutlinePhase8Params;
  vfs_commit_outline_phase_9: VfsCommitOutlinePhase9Params;
}

export type ToolName = keyof ToolParamsMap;

export function getTypedArgs<T extends ToolName>(
  _name: T,
  args: Record<string, unknown>,
): ToolParamsMap[T] {
  return args as ToolParamsMap[T];
}
