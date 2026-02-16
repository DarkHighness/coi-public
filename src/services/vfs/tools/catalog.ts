import { z, type ZodTypeAny } from "zod";
import type { TypedToolDefinition } from "../../providers/types";
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
} from "../../schemas";
import type {
  AnyVfsCatalogEntry,
  VfsToolCapabilityV2,
  VfsToolCatalogEntry,
  VfsToolName,
} from "./types";

const IMMUTABLE_ZONES = [
  "shared/system/skills/**",
  "shared/system/refs/**",
  "skills/**",
  "refs/**",
];

const OPERATION_HINTS_BY_TOOL: Partial<Record<VfsToolName, string>> = {
  vfs_mutate: "write|json_patch|json_merge|move|delete",
  vfs_finish_turn: "finish_commit",
  vfs_finish_summary: "finish_summary",
};

const buildPermissionContract = (capability: VfsToolCapabilityV2): string => {
  const clauses: string[] = [];

  if (capability.readOnly) {
    clauses.push("read-only");
  } else {
    clauses.push(`writes ${capability.mayWriteClasses.join(", ")}`);
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
    clauses.push(`immutable zones blocked: ${capability.immutableZones.join(", ")}`);
  }

  return `Permission contract: ${clauses.join("; ")}.`;
};

const defineCatalogTool = <TParams extends ZodTypeAny>(
  entry: Omit<VfsToolCatalogEntry<TParams>, "description"> & {
    description: string;
  },
): VfsToolCatalogEntry<TParams> => {
  const opHint = OPERATION_HINTS_BY_TOOL[entry.name];
  const decoratedDescription = opHint
    ? `${entry.description} Declared operation=${opHint}. ${buildPermissionContract(entry.capability)}`
    : `${entry.description} ${buildPermissionContract(entry.capability)}`;

  return {
    ...entry,
    description: decoratedDescription,
  };
};

const vfsPathSchema = z
  .string()
  .describe(
    "VFS path (supports canonical `shared/**` / `forks/{id}/**` and alias `current/**`; leading/trailing slashes are ok).",
  );

const vfsOptionalPathSchema = vfsPathSchema
  .optional()
  .describe("Optional VFS path. Prefer omitting; root is used by default.");

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
      from: z.string().optional().describe("Ignored for add."),
    })
    .strict(),
  z
    .object({
      op: z.literal("replace"),
      path: z.string().describe("JSON Pointer path."),
      value: jsonValueSchema.describe("JSON value for replace."),
      from: z.string().optional().describe("Ignored for replace."),
    })
    .strict(),
  z
    .object({
      op: z.literal("test"),
      path: z.string().describe("JSON Pointer path."),
      value: jsonValueSchema.describe("JSON value for test."),
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

const vfsMutateOpSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("write_file"),
      path: vfsFilePathSchema.describe("File path."),
      content: z.string().describe("File contents."),
      contentType: vfsContentTypeSchema
        .optional()
        .describe(
          "Optional content type. Prefer omitting; system infers from existing file/path/template when possible.",
        ),
    })
    .strict(),
  z
    .object({
      op: z.literal("append_text"),
      path: vfsFilePathSchema.describe("File path (text/markdown)."),
      content: z.string().describe("Text to append."),
      expectedHash: z
        .string()
        .optional()
        .describe("Optional optimistic concurrency guard."),
      ensureNewline: z
        .boolean()
        .optional()
        .describe("If true, insert newline when needed. Default true."),
      maxTotalChars: z
        .number()
        .int()
        .positive()
        .optional()
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
        .optional()
        .describe("Create file if missing. Default true."),
      expectedHash: z
        .string()
        .optional()
        .describe("Optional optimistic concurrency guard."),
      maxTotalChars: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Optional total char cap after edits."),
    })
    .strict(),
  z
    .object({
      op: z.literal("patch_json"),
      path: vfsFilePathSchema.describe("JSON file path."),
      patch: z.array(vfsJsonPatchOpSchema).min(1).describe("JSON Patch operations."),
    })
    .strict(),
  z
    .object({
      op: z.literal("merge_json"),
      path: vfsFilePathSchema.describe("JSON file path."),
      content: z.record(jsonValueSchema).describe("JSON object to merge."),
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
]);

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

const outlinePhaseEntries = [
  { phase: 0 as const, schema: outlinePhase0Schema },
  { phase: 1 as const, schema: outlinePhase1Schema },
  { phase: 2 as const, schema: outlinePhase2Schema },
  { phase: 3 as const, schema: outlinePhase3Schema },
  { phase: 4 as const, schema: outlinePhase4Schema },
  { phase: 5 as const, schema: outlinePhase5Schema },
  { phase: 6 as const, schema: outlinePhase6Schema },
  { phase: 7 as const, schema: outlinePhase7Schema },
  { phase: 8 as const, schema: outlinePhase8Schema },
  { phase: 9 as const, schema: outlinePhase9Schema },
] as const;

const outlineFinishSchema = z
  .discriminatedUnion(
    "phase",
    outlinePhaseEntries.map((entry) =>
      z
        .object({
          phase: z.literal(entry.phase),
          data: entry.schema.describe(
            `Outline phase ${entry.phase} payload JSON object.`,
          ),
        })
        .strict(),
    ) as [
      z.ZodObject<any>,
      z.ZodObject<any>,
      ...z.ZodObject<any>[],
    ],
  )
  .describe("Outline phase discriminator + phase-specific payload.");

const CAPABILITY_READ_ALL: VfsToolCapabilityV2 = {
  summary: "Read-only inspection tool.",
  readOnly: true,
  mayWriteClasses: [],
  needsElevationFor: [],
  immutableZones: IMMUTABLE_ZONES,
  toolsets: ["turn", "playerRate", "cleanup", "summary", "outline"],
};

const TOOLSET_NONE = {
  turn: null,
  playerRate: null,
  cleanup: null,
  summary: null,
  outline: null,
} as const;

const ordered = (
  input: Partial<Record<"turn" | "playerRate" | "cleanup" | "summary" | "outline", number | null>>,
): Record<"turn" | "playerRate" | "cleanup" | "summary" | "outline", number | null> => ({
  ...TOOLSET_NONE,
  ...input,
});

export const VFS_TOOL_CATALOG: AnyVfsCatalogEntry[] = [
  defineCatalogTool({
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
          .optional()
          .describe(
            'Optional glob patterns under path (e.g. ["current/world/**/*.json"]).',
          ),
        excludePatterns: z
          .array(z.string().min(1))
          .min(1)
          .optional()
          .describe("Optional glob exclude patterns."),
        ignoreCase: z
          .boolean()
          .optional()
          .describe("Optional case-insensitive glob matching."),
        limit: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Optional max matches. Default: 200."),
        stat: z
          .boolean()
          .optional()
          .describe(
            "When true, include compact ls -l style metadata (kind/size/lines/mimeType/category/updatedAt).",
          ),
        includeExpected: z
          .boolean()
          .optional()
          .describe(
            "When true, include expected VFS layout entries even if files are not created yet.",
          ),
        includeAccess: z
          .boolean()
          .optional()
          .describe(
            "When true, include path access metadata for layout entries.",
          ),
      })
      .strict(),
    handlerKey: "inspect_ls",
    capability: {
      ...CAPABILITY_READ_ALL,
      summary:
        "List VFS entries (plain list, glob pattern matching, optional stat metadata).",
    },
    toolsetOrder: ordered({
      turn: 10,
      playerRate: 10,
      cleanup: 10,
      summary: 10,
      outline: 10,
    }),
  }),
  defineCatalogTool({
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
    handlerKey: "inspect_schema",
    capability: {
      ...CAPABILITY_READ_ALL,
      summary: "Inspect JSON schema hints for paths.",
    },
    toolsetOrder: ordered({
      turn: 20,
      playerRate: 20,
      cleanup: 20,
      summary: 20,
      outline: 20,
    }),
  }),
  defineCatalogTool({
    name: "vfs_read",
    description: "Read VFS files by chars, lines, or JSON pointers.",
    parameters: z
      .object({
        mode: z
          .enum(["chars", "lines", "json"])
          .optional()
          .describe("Read mode. Default: chars."),
        path: vfsFilePathSchema.describe("File path."),
        start: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Chars mode: optional start character index (0-based)."),
        offset: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            "Chars mode: optional number of characters to read from start.",
          ),
        maxChars: z
          .number()
          .int()
          .positive()
          .max(16_384)
          .optional()
          .describe(
            "Chars/JSON mode: optional max characters (must be <= 16384 hard read cap).",
          ),
        startLine: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Lines mode: optional 1-based start line."),
        endLine: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Lines mode: optional 1-based end line (inclusive)."),
        lineCount: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Lines mode: optional number of lines from startLine."),
        pointers: z
          .array(z.string())
          .min(1)
          .optional()
          .describe(
            "JSON mode: JSON Pointer paths to extract (e.g. '/visible/name'). Use '' or '/' for root document.",
          ),
      })
      .strict(),
    handlerKey: "inspect_read",
    capability: {
      ...CAPABILITY_READ_ALL,
      summary: "Read one file by chars, lines, or JSON pointers.",
    },
    toolsetOrder: ordered({
      turn: 30,
      playerRate: 30,
      cleanup: 30,
      summary: 30,
      outline: 30,
    }),
  }),
  defineCatalogTool({
    name: "vfs_search",
    description:
      "Search VFS files by text/regex/fuzzy (optionally semantic, when available).",
    parameters: z
      .object({
        query: z.string().describe("Search query (text or regex)."),
        path: vfsOptionalPathSchema.describe("Root path to search within."),
        regex: z
          .boolean()
          .optional()
          .describe("Treat query as regex."),
        fuzzy: z
          .boolean()
          .optional()
          .describe("Enable fuzzy matching (ignored when regex=true)."),
        semantic: z
          .boolean()
          .optional()
          .describe("Enable semantic search if available."),
        limit: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Max results. Default: 20."),
      })
      .strict(),
    handlerKey: "inspect_search",
    capability: {
      ...CAPABILITY_READ_ALL,
      summary: "Search content (text/fuzzy/regex/semantic).",
    },
    toolsetOrder: ordered({
      turn: 40,
      playerRate: 40,
      cleanup: 40,
      summary: 40,
      outline: 40,
    }),
  }),
  defineCatalogTool({
    name: "vfs_mutate",
    description:
      "Apply mutable VFS operations atomically by ordered ops (write/update/move/delete).",
    parameters: z
      .object({
        ops: z.array(vfsMutateOpSchema).min(1).describe("Ordered mutation operations."),
      })
      .strict(),
    handlerKey: "mutate",
    capability: {
      summary:
        "Apply mutable operations (write_file/append_text/edit_lines/patch_json/merge_json/move/delete).",
      readOnly: false,
      mayWriteClasses: ["default_editable", "elevated_editable"],
      needsElevationFor: ["elevated_editable"],
      immutableZones: IMMUTABLE_ZONES,
      toolsets: ["turn", "cleanup"],
    },
    toolsetOrder: ordered({
      turn: 50,
      cleanup: 50,
    }),
  }),
  defineCatalogTool({
    name: "vfs_finish_turn",
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
              .describe("The assistant narrative (Markdown text for the player)."),
            choices: z
              .array(
                z
                  .object({
                    text: z.string(),
                    consequence: z.string().optional(),
                  })
                  .strict(),
              )
              .min(2)
              .max(4)
              .describe("2-4 player choices for the next step."),
            narrativeTone: z.string().optional(),
            atmosphere: atmosphereSchema.optional(),
            ending: z.string().optional(),
            forceEnd: z.boolean().optional(),
          })
          .strict()
          .describe("Assistant payload stored in the turn file."),
        retconAck: z
          .object({
            hash: z
              .string()
              .describe("Pending prompt injection hash to acknowledge."),
            summary: z
              .string()
              .optional()
              .describe("Short in-world retcon acknowledgement summary."),
          })
          .strict()
          .optional()
          .describe(
            "Required when a prompt retcon acknowledgement is pending for this save.",
          ),
      })
      .strict(),
    handlerKey: "finish_turn",
    capability: {
      summary: "Commit a conversation turn via finish protocol.",
      readOnly: false,
      mayWriteClasses: ["finish_guarded", "default_editable"],
      needsElevationFor: [],
      immutableZones: IMMUTABLE_ZONES,
      toolsets: ["turn", "cleanup"],
      isFinishTool: true,
    },
    toolsetOrder: ordered({
      turn: 90,
      cleanup: 90,
    }),
  }),
  defineCatalogTool({
    name: "vfs_finish_soul",
    description:
      "Finish a Player Rate feedback loop by updating soul markdown docs (current save and/or global mirror).",
    parameters: z
      .object({
        currentSoul: z
          .string()
          .optional()
          .describe(
            "Optional markdown content for current save soul (`current/world/soul.md`).",
          ),
        globalSoul: z
          .string()
          .optional()
          .describe(
            "Optional markdown content for global soul mirror (`current/world/global/soul.md`).",
          ),
      })
      .strict(),
    handlerKey: "finish_soul",
    capability: {
      summary:
        "Commit soul markdown updates for current save and/or global mirror.",
      readOnly: false,
      mayWriteClasses: ["default_editable"],
      needsElevationFor: [],
      immutableZones: IMMUTABLE_ZONES,
      toolsets: ["playerRate"],
      isFinishTool: true,
    },
    toolsetOrder: ordered({
      playerRate: 90,
    }),
  }),
  defineCatalogTool({
    name: "vfs_finish_summary",
    description:
      "Finish the summary loop by appending a StorySummary and updating forks/{activeFork}/story/summary/state.json.",
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
          .optional(),
        nextSessionReferencesMarkdown: z
          .string()
          .optional()
          .describe(
            "Optional free-form markdown handoff for next-session hot-start.",
          ),
      })
      .strict(),
    handlerKey: "finish_summary",
    capability: {
      summary: "Append summary state via finish protocol.",
      readOnly: false,
      mayWriteClasses: ["finish_guarded"],
      needsElevationFor: [],
      immutableZones: IMMUTABLE_ZONES,
      toolsets: ["summary"],
      isFinishTool: true,
    },
    toolsetOrder: ordered({
      summary: 90,
    }),
  }),
  defineCatalogTool({
    name: "vfs_finish_outline",
    description:
      "Commit an outline phase payload by phase index (0-9), validate it, and write to shared/narrative/outline/phases/.",
    parameters: outlineFinishSchema,
    handlerKey: "finish_outline",
    capability: {
      summary: "Validate and write one outline phase payload.",
      readOnly: false,
      mayWriteClasses: ["elevated_editable"],
      needsElevationFor: ["elevated_editable"],
      immutableZones: IMMUTABLE_ZONES,
      toolsets: ["outline"],
      isFinishTool: true,
    },
    toolsetOrder: ordered({
      outline: 90,
    }),
  }),
];

export const VFS_SEARCH_TOOL_NO_SEMANTIC = (() => {
  const searchTool = VFS_TOOL_CATALOG.find((item) => item.name === "vfs_search");
  if (!searchTool) {
    throw new Error("vfs_search is not registered in VFS_TOOL_CATALOG");
  }

  const parametersNoSemantic =
    searchTool.parameters instanceof z.ZodObject
      ? searchTool.parameters.omit({ semantic: true })
      : searchTool.parameters;

  return {
    name: searchTool.name,
    description: searchTool.description.replace("(optionally semantic, when available)", ""),
    parameters: parametersNoSemantic,
  } satisfies TypedToolDefinition<ZodTypeAny>;
})();
