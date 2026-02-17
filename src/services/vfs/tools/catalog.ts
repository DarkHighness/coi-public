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
  vfs_write_file: "write",
  vfs_append_text: "write",
  vfs_edit_lines: "write",
  vfs_patch_json: "json_patch",
  vfs_merge_json: "json_merge",
  vfs_move: "move",
  vfs_delete: "delete",
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

const VFS_VM_DEFAULT_MAX_TOOL_CALLS = 16;
const VFS_VM_MAX_TOOL_CALLS_CAP = 64;
const VFS_VM_DEFAULT_MAX_SCRIPT_CHARS = 4000;
const VFS_VM_TOTAL_SCRIPT_CHARS_CAP = 16000;

const vfsVmScriptsSchema = z
  .array(
    z
      .string()
      .min(1, "Script must not be empty.")
      .max(
        VFS_VM_DEFAULT_MAX_SCRIPT_CHARS,
        `Each script must be <= ${VFS_VM_DEFAULT_MAX_SCRIPT_CHARS} chars.`,
      ),
  )
  .min(1, "Provide at least one script.")
  .superRefine((scripts, issueCtx) => {
    const totalChars = scripts.reduce((sum, script) => sum + script.length, 0);
    if (totalChars > VFS_VM_TOTAL_SCRIPT_CHARS_CAP) {
      issueCtx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total scripts length must be <= ${VFS_VM_TOTAL_SCRIPT_CHARS_CAP} chars.`,
      });
    }
  });

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

const vfsLineEditSchema = z.discriminatedUnion("kind", [
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
]);

const markdownSelectorSchema = z
  .object({
    heading: z
      .string()
      .min(1)
      .optional()
      .describe("Markdown heading text (exact match after trim)."),
    index: z
      .string()
      .min(1)
      .optional()
      .describe("Markdown section index such as `1`, `1.2`, `2.3.1`."),
  })
  .strict();

const markdownSectionInputSchema = z
  .object({
    title: z.string().min(1).describe("Section heading title."),
    level: z
      .number()
      .int()
      .min(1)
      .max(6)
      .optional()
      .describe("Markdown heading level (1..6). Optional for add_section."),
    content: z
      .string()
      .optional()
      .describe("Section body text without heading line."),
  })
  .strict();

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

const CAPABILITY_READ_ALL: VfsToolCapabilityV2 = {
  summary: "Read-only inspection tool.",
  readOnly: true,
  mayWriteClasses: [],
  needsElevationFor: [],
  immutableZones: IMMUTABLE_ZONES,
  toolsets: ["turn", "playerRate", "cleanup", "summary", "outline"],
};

const CAPABILITY_WRITE_MUTATION: VfsToolCapabilityV2 = {
  summary: "Write/edit mutable world resources in default/elevated zones.",
  readOnly: false,
  mayWriteClasses: ["default_editable", "elevated_editable"],
  needsElevationFor: ["elevated_editable"],
  immutableZones: IMMUTABLE_ZONES,
  toolsets: ["turn", "cleanup"],
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

const OUTLINE_PHASE_TOOLS = [
  {
    phase: 0 as const,
    name: "vfs_finish_outline_phase_0" as const,
    handlerKey: "finish_outline_phase_0" as const,
    schema: outlinePhase0Schema,
  },
  {
    phase: 1 as const,
    name: "vfs_finish_outline_phase_1" as const,
    handlerKey: "finish_outline_phase_1" as const,
    schema: outlinePhase1Schema,
  },
  {
    phase: 2 as const,
    name: "vfs_finish_outline_phase_2" as const,
    handlerKey: "finish_outline_phase_2" as const,
    schema: outlinePhase2Schema,
  },
  {
    phase: 3 as const,
    name: "vfs_finish_outline_phase_3" as const,
    handlerKey: "finish_outline_phase_3" as const,
    schema: outlinePhase3Schema,
  },
  {
    phase: 4 as const,
    name: "vfs_finish_outline_phase_4" as const,
    handlerKey: "finish_outline_phase_4" as const,
    schema: outlinePhase4Schema,
  },
  {
    phase: 5 as const,
    name: "vfs_finish_outline_phase_5" as const,
    handlerKey: "finish_outline_phase_5" as const,
    schema: outlinePhase5Schema,
  },
  {
    phase: 6 as const,
    name: "vfs_finish_outline_phase_6" as const,
    handlerKey: "finish_outline_phase_6" as const,
    schema: outlinePhase6Schema,
  },
  {
    phase: 7 as const,
    name: "vfs_finish_outline_phase_7" as const,
    handlerKey: "finish_outline_phase_7" as const,
    schema: outlinePhase7Schema,
  },
  {
    phase: 8 as const,
    name: "vfs_finish_outline_phase_8" as const,
    handlerKey: "finish_outline_phase_8" as const,
    schema: outlinePhase8Schema,
  },
  {
    phase: 9 as const,
    name: "vfs_finish_outline_phase_9" as const,
    handlerKey: "finish_outline_phase_9" as const,
    schema: outlinePhase9Schema,
  },
] as const;

export const VFS_TOOL_CATALOG: AnyVfsCatalogEntry[] = [
  defineCatalogTool({
    name: "vfs_ls",
    description:
      "List VFS entries. Supports plain listing, glob filtering via patterns, always returns stats (including chars/lines), and includes read-strategy hints for likely-over-limit files.",
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
            "Deprecated no-op for backward prompt examples. vfs_ls always returns stats metadata.",
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
        "List VFS entries (plain list or glob pattern matching) with stats metadata and read hints.",
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
    name: "vfs_read_chars",
    description: "Read VFS file content by a character window.",
    parameters: z
      .object({
        path: vfsFilePathSchema.describe("File path."),
        start: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Optional start character index (0-based)."),
        offset: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Optional number of characters to read from start."),
        maxChars: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            "Optional max characters. Effective payload is still bounded by dynamic read token budget (1% of current model context window, script-aware token estimation).",
          ),
      })
      .strict(),
    handlerKey: "read_chars",
    capability: {
      ...CAPABILITY_READ_ALL,
      summary: "Read one file by characters.",
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
    name: "vfs_read_lines",
    description: "Read VFS file content by line range.",
    parameters: z
      .object({
        path: vfsFilePathSchema.describe("File path."),
        startLine: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Optional 1-based start line."),
        endLine: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Optional 1-based end line (inclusive)."),
        lineCount: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Optional number of lines from startLine."),
      })
      .strict(),
    handlerKey: "read_lines",
    capability: {
      ...CAPABILITY_READ_ALL,
      summary: "Read one file by lines.",
    },
    toolsetOrder: ordered({
      turn: 31,
      playerRate: 31,
      cleanup: 31,
      summary: 31,
      outline: 31,
    }),
  }),
  defineCatalogTool({
    name: "vfs_read_json",
    description: "Read JSON file values by JSON pointers.",
    parameters: z
      .object({
        path: vfsFilePathSchema.describe("JSON file path."),
        pointers: z
          .array(z.string())
          .min(1)
          .describe(
            "JSON Pointer paths to extract (e.g. '/visible/name'). Use '' or '/' for root document.",
          ),
        maxChars: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            "Optional max chars per pointer payload. Effective payload is still bounded by dynamic read token budget.",
          ),
      })
      .strict(),
    handlerKey: "read_json",
    capability: {
      ...CAPABILITY_READ_ALL,
      summary: "Read JSON subpaths by pointers.",
    },
    toolsetOrder: ordered({
      turn: 32,
      playerRate: 32,
      cleanup: 32,
      summary: 32,
      outline: 32,
    }),
  }),
  defineCatalogTool({
    name: "vfs_read_markdown",
    description:
      "Read markdown file content by section selectors (heading or hierarchical index).",
    parameters: z
      .object({
        path: vfsFilePathSchema.describe("Markdown file path."),
        headings: z
          .array(z.string().min(1))
          .min(1)
          .optional()
          .describe("Optional heading selectors (exact match after trim)."),
        indices: z
          .array(z.string().min(1))
          .min(1)
          .optional()
          .describe("Optional hierarchical section indices (`1`, `1.2`, ...)."),
        maxChars: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            "Optional max chars per selected section. Effective payload is still bounded by dynamic read token budget.",
          ),
      })
      .strict(),
    handlerKey: "read_markdown",
    capability: {
      ...CAPABILITY_READ_ALL,
      summary: "Read markdown by section selectors.",
    },
    toolsetOrder: ordered({
      turn: 33,
      playerRate: 33,
      cleanup: 33,
      summary: 33,
      outline: 33,
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
    name: "vfs_vm",
    description:
      "Run sequential JavaScript snippets in a restricted VM sandbox and orchestrate allowed VFS tool calls.",
    parameters: z
      .object({
        scripts: vfsVmScriptsSchema.describe(
          "JavaScript snippets only (not JSON/pseudo calls), executed in order with shared state + emit + allowlisted vfs_* helpers. Forbidden tokens: import/eval/Function/globalThis/window.",
        ),
        maxToolCalls: z
          .number()
          .int()
          .positive()
          .max(VFS_VM_MAX_TOOL_CALLS_CAP)
          .optional()
          .describe(
            `Optional inner tool call cap. Default ${VFS_VM_DEFAULT_MAX_TOOL_CALLS}, hard cap ${VFS_VM_MAX_TOOL_CALLS_CAP}.`,
          ),
        maxScriptChars: z
          .number()
          .int()
          .positive()
          .max(VFS_VM_DEFAULT_MAX_SCRIPT_CHARS)
          .optional()
          .describe(
            `Optional per-script char cap. Default ${VFS_VM_DEFAULT_MAX_SCRIPT_CHARS}. Total scripts cap is ${VFS_VM_TOTAL_SCRIPT_CHARS_CAP} chars.`,
          ),
      })
      .strict(),
    handlerKey: "vm",
    capability: {
      summary:
        "Execute scripted multi-step VFS orchestration with runtime allowlist + finish ordering gate.",
      readOnly: false,
      mayWriteClasses: [
        "default_editable",
        "elevated_editable",
        "finish_guarded",
      ],
      needsElevationFor: ["elevated_editable"],
      immutableZones: IMMUTABLE_ZONES,
      toolsets: ["turn", "playerRate", "cleanup"],
    },
    toolsetOrder: ordered({
      turn: 49,
      playerRate: 49,
      cleanup: 49,
    }),
  }),
  defineCatalogTool({
    name: "vfs_write_file",
    description: "Create or overwrite a file.",
    parameters: z
      .object({
        path: vfsFilePathSchema.describe("File path."),
        content: z.string().describe("File contents."),
        contentType: vfsContentTypeSchema
          .optional()
          .describe(
            "Optional content type. Prefer omitting; system infers from existing file/path/template when possible.",
          ),
      })
      .strict(),
    handlerKey: "write_file",
    capability: {
      ...CAPABILITY_WRITE_MUTATION,
      summary: "Create or overwrite one file.",
    },
    toolsetOrder: ordered({
      turn: 50,
      cleanup: 50,
    }),
  }),
  defineCatalogTool({
    name: "vfs_append_text",
    description: "Append text to an existing text/markdown file.",
    parameters: z
      .object({
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
    handlerKey: "append_text",
    capability: {
      ...CAPABILITY_WRITE_MUTATION,
      summary: "Append text to one file.",
    },
    toolsetOrder: ordered({
      turn: 51,
      cleanup: 51,
    }),
  }),
  defineCatalogTool({
    name: "vfs_edit_lines",
    description: "Apply line-based edits to a text/markdown file.",
    parameters: z
      .object({
        path: vfsFilePathSchema.describe("File path (text/markdown)."),
        edits: z.array(vfsLineEditSchema).min(1),
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
    handlerKey: "edit_lines",
    capability: {
      ...CAPABILITY_WRITE_MUTATION,
      summary: "Apply line-based text edits.",
    },
    toolsetOrder: ordered({
      turn: 52,
      cleanup: 52,
    }),
  }),
  defineCatalogTool({
    name: "vfs_write_markdown",
    description:
      "Add/replace/delete markdown sections using heading/index selectors.",
    parameters: z
      .object({
        path: vfsFilePathSchema.describe("Markdown file path."),
        action: z.enum(["add_section", "replace_section", "delete_section"]),
        target: markdownSelectorSchema
          .optional()
          .describe("Target selector for replace_section/delete_section."),
        parent: markdownSelectorSchema
          .optional()
          .describe(
            "Optional parent selector for add_section insertion anchor. If parent is missing/unmatched, append at end.",
          ),
        section: markdownSectionInputSchema
          .optional()
          .describe("Section payload for add_section."),
        content: z
          .string()
          .optional()
          .describe("Replacement section body for replace_section."),
        expectedHash: z
          .string()
          .optional()
          .describe("Optional optimistic concurrency guard."),
      })
      .strict(),
    handlerKey: "write_markdown",
    capability: {
      ...CAPABILITY_WRITE_MUTATION,
      summary: "Mutate markdown sections by selector.",
    },
    toolsetOrder: ordered({
      turn: 52.5,
      cleanup: 52.5,
    }),
  }),
  defineCatalogTool({
    name: "vfs_patch_json",
    description: "Apply RFC 6902 JSON patch operations to one JSON file.",
    parameters: z
      .object({
        path: vfsFilePathSchema.describe("JSON file path."),
        patch: z.array(vfsJsonPatchOpSchema).min(1).describe("JSON Patch operations."),
      })
      .strict(),
    handlerKey: "patch_json",
    capability: {
      ...CAPABILITY_WRITE_MUTATION,
      summary: "Patch one JSON file (RFC 6902).",
    },
    toolsetOrder: ordered({
      turn: 53,
      cleanup: 53,
    }),
  }),
  defineCatalogTool({
    name: "vfs_merge_json",
    description: "Deep-merge one JSON object into an existing JSON file.",
    parameters: z
      .object({
        path: vfsFilePathSchema.describe("JSON file path."),
        content: z.record(jsonValueSchema).describe("JSON object to merge."),
      })
      .strict(),
    handlerKey: "merge_json",
    capability: {
      ...CAPABILITY_WRITE_MUTATION,
      summary: "Deep-merge JSON into one file.",
    },
    toolsetOrder: ordered({
      turn: 54,
      cleanup: 54,
    }),
  }),
  defineCatalogTool({
    name: "vfs_move",
    description: "Move or rename a file path.",
    parameters: z
      .object({
        from: vfsFilePathSchema.describe("Source path."),
        to: vfsFilePathSchema.describe("Destination path."),
      })
      .strict(),
    handlerKey: "move",
    capability: {
      ...CAPABILITY_WRITE_MUTATION,
      summary: "Move/rename one file.",
    },
    toolsetOrder: ordered({
      turn: 55,
      cleanup: 55,
    }),
  }),
  defineCatalogTool({
    name: "vfs_delete",
    description: "Delete one file path.",
    parameters: z
      .object({
        path: vfsFilePathSchema.describe("Path to delete."),
      })
      .strict(),
    handlerKey: "delete",
    capability: {
      ...CAPABILITY_WRITE_MUTATION,
      summary: "Delete one file.",
    },
    toolsetOrder: ordered({
      turn: 56,
      cleanup: 56,
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
  ...OUTLINE_PHASE_TOOLS.map((entry) =>
    defineCatalogTool({
      name: entry.name,
      description:
        `Commit outline phase ${entry.phase} payload and write to shared/narrative/outline/phases/phase${entry.phase}.json.`,
      parameters: entry.schema.describe(
        `Outline phase ${entry.phase} payload JSON object.`,
      ),
      handlerKey: entry.handlerKey,
      capability: {
        summary: `Validate and write outline phase ${entry.phase}.`,
        readOnly: false,
        mayWriteClasses: ["elevated_editable"],
        needsElevationFor: ["elevated_editable"],
        immutableZones: IMMUTABLE_ZONES,
        toolsets: ["outline"],
        isFinishTool: true,
      },
      toolsetOrder: ordered({
        outline: 90 + entry.phase,
      }),
    }),
  ),
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
    description: searchTool.description.replace(
      "(optionally semantic, when available)",
      "",
    ),
    parameters: parametersNoSemantic,
  } satisfies TypedToolDefinition<ZodTypeAny>;
})();
