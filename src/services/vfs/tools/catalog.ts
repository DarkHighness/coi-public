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
  vfs_end_turn: "finish_end",
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
    clauses.push(
      `immutable zones blocked: ${capability.immutableZones.join(", ")}`,
    );
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

const VFS_VM_DEFAULT_MAX_SCRIPT_CHARS = 16000;
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
  .length(1, "Provide exactly one script.")
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
  input: Partial<
    Record<
      "turn" | "playerRate" | "cleanup" | "summary" | "outline",
      number | null
    >
  >,
): Record<
  "turn" | "playerRate" | "cleanup" | "summary" | "outline",
  number | null
> => ({
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
      "List VFS directory entries. Returns metadata (chars, lines) per entry. Supports glob patterns for filtering and suggests read strategies for large files.",
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
      "Show the expected JSON schema for one or more VFS paths. Use before writing to avoid invalid keys or missing fields.",
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
    description:
      "Read file content by character range (start offset + length).",
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
            "Optional max characters. Effective payload is still bounded by dynamic read token budget (default 10% of current model context window, configurable in Settings, script-aware token estimation).",
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
    description:
      "Read file content by line range (1-based startLine + endLine or lineCount).",
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
    description:
      "Read JSON file values by JSON Pointer paths (e.g. '/visible/name', '' for root).",
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
      "Read markdown sections by heading name (exact match) or hierarchical index (e.g. '1', '1.2', '2.3.1').",
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
      "Search VFS file contents by text, regex, or fuzzy matching (optionally semantic, when available).",
    parameters: z
      .object({
        query: z.string().describe("Search query (text or regex)."),
        path: vfsOptionalPathSchema.describe("Root path to search within."),
        regex: z.boolean().optional().describe("Treat query as regex."),
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
      "Execute one sandboxed JavaScript script that must define `async main(ctx)`. The vm result is `main` return value; only `console.log` output is surfaced as bounded logs.",
    parameters: z
      .object({
        scripts: vfsVmScriptsSchema.describe(
          "Exactly one JavaScript script (not JSON/pseudo calls). Script must declare `async function main(ctx)` and return the final output from `main`. Inside `main`, use `ctx.call(name,args)` or `ctx.vfs_*` helper wrappers (for example `await ctx.vfs_read_chars({...})`); do NOT use `VFS.read(...)`/`VFS.*`. Outside `vfs_vm`, call `vfs_*` tools directly as top-level tool calls; `ctx.*` is only available inside `main(ctx)`. Runtime caps are system-injected: max 32 inner tool calls (bounded by current loop budget), script length max 16000 chars. Forbidden tokens: import/eval/Function/globalThis/window plus VFS namespace access. Top-level tool output returns `{ result, logs, vmMeta }`.",
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
      toolsets: ["turn", "cleanup"],
    },
    toolsetOrder: ordered({
      turn: 49,
      cleanup: 49,
    }),
  }),
  defineCatalogTool({
    name: "vfs_write_file",
    description: "Create or overwrite a single file with the given content.",
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
      toolsets: ["turn", "playerRate", "cleanup"],
      summary: "Create or overwrite one file.",
    },
    toolsetOrder: ordered({
      turn: 50,
      playerRate: 50,
      cleanup: 50,
    }),
  }),
  defineCatalogTool({
    name: "vfs_append_text",
    description: "Append text to the end of an existing text or markdown file.",
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
    description:
      "Apply line-based insert/replace edits to a text or markdown file.",
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
      toolsets: ["turn", "playerRate", "cleanup"],
      summary: "Apply line-based text edits.",
    },
    toolsetOrder: ordered({
      turn: 52,
      playerRate: 52,
      cleanup: 52,
    }),
  }),
  defineCatalogTool({
    name: "vfs_write_markdown",
    description:
      "Add, replace, or delete markdown sections by heading name or hierarchical index selector.",
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
      toolsets: ["turn", "playerRate", "cleanup"],
      summary: "Mutate markdown sections by selector.",
    },
    toolsetOrder: ordered({
      turn: 52.5,
      playerRate: 52.5,
      cleanup: 52.5,
    }),
  }),
  defineCatalogTool({
    name: "vfs_patch_json",
    description:
      "Apply RFC 6902 JSON Patch operations (add/replace/remove/move/copy/test) to a JSON file.",
    parameters: z
      .object({
        path: vfsFilePathSchema.describe("JSON file path."),
        patch: z
          .array(vfsJsonPatchOpSchema)
          .min(1)
          .describe("JSON Patch operations."),
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
    description:
      "Deep-merge a JSON object into an existing JSON file (arrays are replaced, not appended; deletions require vfs_patch_json).",
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
    description: "Move or rename a single file to a new path.",
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
    description: "Delete a single file at the given path.",
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
      "Commit a new conversation turn: append to the active fork and set it active. Writes conversation index and turn file. MUST be the LAST tool call.",
    parameters: z
      .object({
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
            summary: z
              .string()
              .min(1)
              .describe("Short in-world retcon acknowledgement summary."),
          })
          .strict()
          .optional()
          .describe(
            "Required when a prompt retcon acknowledgement is pending for this save. Runtime injects the pending hash.",
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
    name: "vfs_end_turn",
    description:
      "End Player Rate feedback loop (no args). MUST be the LAST tool call in [Player Rate] loops.",
    parameters: z.object({}).strict(),
    handlerKey: "end_turn",
    capability: {
      summary: "Finish Player Rate loop without committing conversation turn.",
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
      "Commit a story summary: append a StorySummary record and update summary state. MUST be the LAST tool call in summary loops.",
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
      description: `Commit outline phase ${entry.phase} payload. Validates and writes to shared/narrative/outline/phases/phase${entry.phase}.json. MUST be the LAST tool call for this phase.`,
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
  const searchTool = VFS_TOOL_CATALOG.find(
    (item) => item.name === "vfs_search",
  );
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
