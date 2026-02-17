import { z } from "zod";
import { getToolSchemaHint } from "../../providers/utils";
import { vfsToolRegistry } from "../tools";
import type { VfsContentType, VfsFile, VfsFileMap } from "../types";
import { hashContent } from "../utils";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

const isJsonScalar = (
  value: unknown,
): value is string | number | boolean | null =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean" ||
  value === null;

const TOOL_SCHEMA_PART_MAX_LINES = 140;

const isRecordObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null;

const getSchemaDef = (schema: z.ZodTypeAny): JsonObject | null => {
  const candidate = (schema as { _def?: unknown })._def;
  return isRecordObject(candidate) ? candidate : null;
};

const getSchemaDefField = (schema: z.ZodTypeAny, field: string): unknown =>
  getSchemaDef(schema)?.[field];

const asZodType = (value: unknown): z.ZodTypeAny | null =>
  value instanceof z.ZodType ? (value as z.ZodTypeAny) : null;

const getSchemaKind = (schema: z.ZodTypeAny): string | undefined => {
  const defTypeName = getSchemaDefField(schema, "typeName");
  if (typeof defTypeName === "string" && defTypeName.length > 0) {
    return defTypeName;
  }
  const ctorName = isRecordObject(schema.constructor)
    ? schema.constructor.name
    : undefined;
  return typeof ctorName === "string" && ctorName.length > 0
    ? ctorName
    : undefined;
};

const createFile = (
  path: string,
  content: string,
  contentType: VfsContentType,
): VfsFile => ({
  path,
  content,
  contentType,
  hash: hashContent(content),
  size: content.length,
  updatedAt: 0,
});

const addText = (files: VfsFileMap, path: string, content: string): void => {
  files[path] = createFile(
    path,
    content,
    path.endsWith(".md") ? "text/markdown" : "text/plain",
  );
};

const TOOL_EXAMPLE_OVERRIDES: Record<string, JsonValue[]> = {
  vfs_ls: [
    { path: "current/world" },
    {
      path: "current/world",
      patterns: ["**/*.json"],
      includeAccess: true,
      limit: 50,
    },
  ],
  vfs_read_chars: [
    {
      path: "current/world/notes.md",
      start: 0,
      offset: 1024,
    },
  ],
  vfs_read_lines: [
    {
      path: "current/world/notes.md",
      startLine: 1,
      lineCount: 120,
    },
  ],
  vfs_read_json: [
    {
      path: "current/world/global.json",
      pointers: ["/time", "/theme", "/currentLocation"],
    },
  ],
  vfs_read_markdown: [
    {
      path: "current/world/soul.md",
      headings: ["Tool Usage Hints", "Guidance For AI"],
    },
    {
      path: "current/refs/tools/vfs_write_markdown/README.md",
      indices: ["1", "2"],
    },
  ],
  vfs_schema: [{ paths: ["current/world/global.json"] }],
  vfs_search: [
    { query: "dragon", path: "current/world", limit: 20 },
    { query: "dragn", path: "current/world", fuzzy: true },
  ],
  vfs_vm: [
    {
      scripts: [
        "state.keyword = 'gate'; const found = await vfs_search({ query: state.keyword, path: 'current/world', limit: 5 }); emit({ step: 'search', count: found.data?.results?.length ?? 0 });",
        "await vfs_write_file({ path: 'current/world/notes/vm-run.md', content: '# VM Run\\n\\n- keyword: ' + state.keyword, contentType: 'text/markdown' }); emit({ step: 'write', path: 'current/world/notes/vm-run.md' });",
      ],
      maxToolCalls: 8,
    },
    {
      scripts: [
        "const base = await vfs_read_json({ path: 'current/world/global.json', pointers: ['/turnNumber'] }); const turn = Number(base.data?.extracts?.[0]?.json ?? '0'); state.nextTurn = turn + 1; emit({ step: 'read', turn });",
        "await vfs_merge_json({ path: 'current/world/global.json', content: { turnNumber: state.nextTurn } }); emit({ step: 'write', turnNumber: state.nextTurn });",
        "await vfs_finish_turn({ assistant: { narrative: 'You confirm the timeline marker and seal the update.', choices: [{ text: 'Proceed with patrol route' }, { text: 'Review one more clue' }] } });",
      ],
      maxToolCalls: 12,
      maxScriptChars: 4000,
    },
    {
      scripts: [
        "emit({ phase: 'repair-start' }); await call('vfs_patch_json', { path: 'current/world/global.json', patch: [{ op: 'replace', path: '/missingField', value: 1 }] });",
      ],
      maxToolCalls: 2,
    },
  ],
  vfs_write_file: [
    {
      path: "current/world/notes.md",
      content: "# Session Notes\n\n- Entry",
      contentType: "text/markdown",
    },
  ],
  vfs_append_text: [
    {
      path: "current/world/notes.md",
      content: "- Follow-up",
      ensureNewline: true,
    },
  ],
  vfs_edit_lines: [
    {
      path: "current/world/notes.md",
      edits: [
        {
          kind: "insert_after",
          line: 1,
          content: "- New clue",
        },
      ],
    },
  ],
  vfs_write_markdown: [
    {
      path: "current/world/soul.md",
      action: "add_section",
      parent: { heading: "Tool Usage Hints" },
      section: {
        title: "Failure Memo 2026-02-16",
        level: 3,
        content:
          "- [INVALID_PARAMS] phase was sent as string. Fixed with integer literal.",
      },
    },
    {
      path: "current/world/soul.md",
      action: "replace_section",
      target: { heading: "Tool Usage Hints" },
      content:
        "- [INVALID_ACTION] skipped read-before-write. Fix: read target first, then write.\n- [INVALID_PARAMS] missing required field. Fix: re-check schema and retry once.",
    },
    {
      path: "current/world/soul.md",
      action: "delete_section",
      target: { index: "4.2" },
    },
  ],
  vfs_patch_json: [
    {
      path: "current/world/global.json",
      patch: [{ op: "replace", path: "/turnNumber", value: 2 }],
    },
  ],
  vfs_merge_json: [
    {
      path: "current/world/global.json",
      content: { turnNumber: 2 },
    },
  ],
  vfs_move: [
    {
      from: "current/world/tmp.md",
      to: "current/world/archive/tmp.md",
    },
  ],
  vfs_delete: [
    {
      path: "current/world/archive/old.tmp",
    },
  ],
  vfs_finish_turn: [
    {
      assistant: {
        narrative: "You brush moss aside and find fresh claw marks.",
        choices: [
          { text: "Follow the tracks" },
          { text: "Set up camp nearby" },
        ],
      },
    },
  ],
  vfs_finish_soul: [
    {
      currentSoul:
        "# Player Soul (This Save)\\n\\n## Tool Usage Hints\\n- [INVALID_PARAMS] Missing required field -> re-read tool docs and send schema-valid args.\\n\\n## Guidance For AI\\n- Keep prose tighter when player asks for concise style.\\n",
    },
    {
      globalSoul:
        "# Player Soul (Global)\\n\\n## Tool Usage Hints\\n- [INVALID_ACTION] Read-before-write failed -> always read target via vfs_read_markdown/vfs_read_chars/vfs_read_lines/vfs_read_json before edit.\\n\\n## Evidence Log\\n- turn fork-0/turn-12: downvote, preset=AI flavor too strong.\\n",
    },
    {
      currentSoul:
        "# Player Soul (This Save)\\n\\n## Guidance For AI\\n- Reduce ornamental metaphors.\\n",
      globalSoul:
        "# Player Soul (Global)\\n\\n## Style Preferences\\n- Prefer direct, concrete wording.\\n",
    },
  ],
  vfs_finish_summary: [
    {
      displayText: "The party reached the ruins and uncovered recent activity.",
      visible: {
        narrative:
          "The group entered old ruins and found signs of a recent struggle.",
        majorEvents: ["Reached ruins", "Found claw marks"],
        characterDevelopment: "The protagonist became more cautious.",
        worldState: "The ruins are now a confirmed conflict hotspot.",
      },
      hidden: {
        truthNarrative: "A hidden faction staged evidence to lure the party.",
        hiddenPlots: ["Faction bait operation"],
        npcActions: ["Scout moved evidence before arrival"],
        worldTruth: "The ambush route is prepared.",
        unrevealed: ["Faction leader identity"],
      },
    },
  ],
  vfs_finish_outline_phase_6: [
    {
      npcs: [
        {
          profile: {
            id: "char:npc_gatekeeper",
            kind: "npc",
            currentLocation: "loc:gate",
            knownBy: ["char:npc_gatekeeper", "char:player"],
            visible: {
              name: "Gatekeeper",
              description: "A watchful guard with a measured tone.",
            },
            relations: [],
          },
          skills: [],
          conditions: [],
          traits: [],
          inventory: [],
        },
      ],
      placeholders: [
        {
          path: "world/placeholders/ph:mysterious_informant.md",
          markdown:
            "# Placeholder Draft\\n\\n- id: ph:mysterious_informant\\n- label: [Mysterious Informant]\\n\\n## Notes\\nSeen near the old gate at dusk.",
        },
      ],
      playerPerceptions: [
        {
          id: "rel:player_to_gatekeeper",
          kind: "perception",
          to: {
            kind: "character",
            id: "char:npc_gatekeeper",
          },
          knownBy: ["char:player"],
          visible: {
            description:
              "The gatekeeper checks every response before speaking.",
            evidence: ["Hesitated before answering", "Keeps one hand on spear"],
          },
        },
      ],
    },
  ],
};

const unwrapSchema = (
  schema: z.ZodTypeAny,
): { schema: z.ZodTypeAny; optional: boolean } => {
  let current = schema;
  let optional = false;

  while (true) {
    const kind = getSchemaKind(current);
    if (kind === "ZodOptional" || kind === "ZodDefault") {
      optional = true;
      const innerType = asZodType(getSchemaDefField(current, "innerType"));
      if (!innerType) break;
      current = innerType;
      continue;
    }
    if (kind === "ZodNullable") {
      const innerType = asZodType(getSchemaDefField(current, "innerType"));
      if (!innerType) break;
      current = innerType;
      continue;
    }
    if (kind === "ZodEffects") {
      const effectSchema = asZodType(getSchemaDefField(current, "schema"));
      if (!effectSchema) break;
      current = effectSchema;
      continue;
    }
    break;
  }

  return { schema: current, optional };
};

const sampleValueForSchema = (
  schema: z.ZodTypeAny,
  depth: number = 0,
): JsonValue => {
  const { schema: inner } = unwrapSchema(schema);
  const kind = getSchemaKind(inner);

  if (kind === "ZodString") return "<string>";
  if (kind === "ZodNumber") return 0;
  if (kind === "ZodBoolean") return false;
  if (kind === "ZodNull") return null;
  if (kind === "ZodLiteral") {
    const value = getSchemaDefField(inner, "value");
    return isJsonScalar(value) ? value : "<literal>";
  }
  if (kind === "ZodEnum") {
    const values = getSchemaDefField(inner, "values");
    if (Array.isArray(values) && values.length > 0) {
      const first = values[0];
      if (
        typeof first === "string" ||
        typeof first === "number" ||
        typeof first === "boolean" ||
        first === null
      ) {
        return first;
      }
    }
    return "<enum>";
  }
  if (depth > 8) {
    if (kind === "ZodObject" || kind === "ZodRecord") {
      return {};
    }
    if (kind === "ZodArray") {
      return [];
    }
    return "<value>";
  }
  if (kind === "ZodArray") {
    const def = getSchemaDef(inner);
    const minLengthCandidate =
      def && isRecordObject(def.minLength)
        ? def.minLength.value
        : def?.minLength;
    const minLengthRaw =
      typeof minLengthCandidate === "number" ? minLengthCandidate : 1;
    const minLength =
      typeof minLengthRaw === "number" && Number.isFinite(minLengthRaw)
        ? Math.max(1, Math.floor(minLengthRaw))
        : 1;
    const arrayItemSchema = asZodType(def?.type);
    const item = arrayItemSchema
      ? sampleValueForSchema(arrayItemSchema, depth + 1)
      : "<value>";
    return Array.from({ length: minLength }, () => item);
  }
  if (kind === "ZodObject") {
    return inner instanceof z.ZodObject
      ? buildExampleFromObject(inner as z.ZodObject<z.ZodRawShape>, depth + 1)
      : {};
  }
  if (kind === "ZodDiscriminatedUnion") {
    const options = getSchemaDefField(inner, "options");
    const first =
      Array.isArray(options) &&
      options.find((option): option is z.ZodObject<z.ZodRawShape> => {
        return option instanceof z.ZodObject;
      });
    return first
      ? buildExampleFromObject(first, depth + 1)
      : { value: "<union>" };
  }
  if (kind === "ZodUnion") {
    const options = getSchemaDefField(inner, "options");
    const parsedOptions = Array.isArray(options)
      ? options
          .map((option) => asZodType(option))
          .filter((option): option is z.ZodTypeAny => option !== null)
      : [];
    return parsedOptions.length > 0
      ? sampleValueForSchema(parsedOptions[0], depth + 1)
      : "<union>";
  }
  if (kind === "ZodRecord") {
    const valueSchema = asZodType(getSchemaDefField(inner, "valueType"));
    return {
      "<key>": valueSchema
        ? sampleValueForSchema(valueSchema, depth + 1)
        : "<value>",
    };
  }
  if (kind === "ZodLazy") {
    return "<json>";
  }

  return "<value>";
};

const buildExampleFromObject = (
  schema: z.ZodObject<z.ZodRawShape>,
  depth: number = 0,
): Record<string, JsonValue> => {
  const shape = schema.shape;
  const output: Record<string, JsonValue> = {};

  for (const [key, field] of Object.entries(shape)) {
    const { optional } = unwrapSchema(field as z.ZodTypeAny);
    if (optional && depth > 1) {
      continue;
    }
    output[key] = sampleValueForSchema(field as z.ZodTypeAny, depth + 1);
  }

  return output;
};

const buildExamplesForTool = (
  toolName: string,
  schema: z.ZodTypeAny,
): JsonValue[] => {
  const override = TOOL_EXAMPLE_OVERRIDES[toolName];
  if (override && override.length > 0) {
    return override;
  }
  if (schema instanceof z.ZodObject) {
    return [buildExampleFromObject(schema)];
  }
  return [sampleValueForSchema(schema)];
};

const splitSchemaHintIntoParts = (schemaHint: string): string[] => {
  const lines = schemaHint.split("\n");
  if (lines.length <= TOOL_SCHEMA_PART_MAX_LINES) {
    return [schemaHint];
  }

  const parts: string[] = [];
  for (let i = 0; i < lines.length; i += TOOL_SCHEMA_PART_MAX_LINES) {
    parts.push(lines.slice(i, i + TOOL_SCHEMA_PART_MAX_LINES).join("\n"));
  }
  return parts;
};

const buildToolsReadme = (): string =>
  [
    "# Tool Docs Reference (VFS)",
    "",
    "Generated from `vfsToolRegistry.getDefinitions()`.",
    "",
    "## Usage",
    '- List tools: `vfs_ls({ path: "current/refs/tools" })`',
    '- Read tool index: `vfs_read_json({ path: "current/refs/tools/index.json" })`',
    '- Read one tool overview (markdown section): `vfs_read_markdown({ path: "current/refs/tools/vfs_read_markdown/README.md", headings: ["INTRO"] })`',
    '- Read one tool examples (bounded lines): `vfs_read_lines({ path: "current/refs/tools/vfs_read_markdown/EXAMPLES.md", startLine: 1, lineCount: 120 })`',
    '- Read schema index: `vfs_read_json({ path: "current/refs/tool-schemas/index.json" })`',
    '- Read schema summary (markdown section): `vfs_read_markdown({ path: "current/refs/tool-schemas/vfs_read_markdown/README.md", headings: ["Parts"] })`',
    '- Read a schema part: `vfs_read_lines({ path: "current/refs/tool-schemas/vfs_finish_outline_phase_6/PART-01.md", startLine: 1, lineCount: 120 })`',
    "",
    "## Layout",
    "- `current/refs/tools/{toolName}/README.md` -> concise tool overview",
    "- `current/refs/tools/{toolName}/EXAMPLES.md` -> worked examples",
    "- `current/refs/tool-schemas/{toolName}/README.md` -> schema summary + parts map",
    "- `current/refs/tool-schemas/{toolName}/PART-xx.md` -> split schema chunks",
    "",
    "This split keeps each file small to avoid oversized reads and repeated line-window tuning.",
    "",
  ].join("\n");

type ToolIndexEntry = {
  name: string;
  description: string;
  overviewPath: string;
  examplesPath: string;
  schemaSummaryPath: string;
  schemaPartPaths: string[];
};

const buildToolsIndex = (entries: ToolIndexEntry[]): string =>
  JSON.stringify(
    {
      generatedFrom: "vfsToolRegistry",
      count: entries.length,
      tools: entries,
    },
    null,
    2,
  );

const buildSchemaIndex = (entries: ToolIndexEntry[]): string =>
  JSON.stringify(
    {
      generatedFrom: "vfsToolRegistry",
      count: entries.length,
      schemas: entries.map((entry) => ({
        name: entry.name,
        summaryPath: entry.schemaSummaryPath,
        partPaths: entry.schemaPartPaths,
      })),
    },
    null,
    2,
  );

const buildToolOverviewMarkdown = (params: {
  toolName: string;
  description: string;
  examplesPath: string;
  schemaSummaryPath: string;
}): string =>
  [
    "---",
    `tool: ${params.toolName}`,
    "kind: tool-overview",
    "generatedFrom: vfsToolRegistry",
    "---",
    "",
    `# ${params.toolName}`,
    "",
    "## INTRO",
    params.description,
    "",
    "## WHERE TO READ NEXT",
    `- Examples: \`${params.examplesPath}\``,
    `- Schema summary: \`${params.schemaSummaryPath}\``,
    "",
    "This overview intentionally omits full schema blocks to keep reads compact.",
    "",
  ].join("\n");

const buildToolExamplesMarkdown = (
  toolName: string,
  examples: JsonValue[],
): string => {
  const exampleBlocks = examples
    .map((example, index) =>
      [
        `## Example ${index + 1}`,
        "```json",
        JSON.stringify(example, null, 2),
        "```",
      ].join("\n"),
    )
    .join("\n\n");

  return [
    "---",
    `tool: ${toolName}`,
    "kind: tool-examples",
    "generatedFrom: vfsToolRegistry",
    "---",
    "",
    `# ${toolName} Examples`,
    "",
    exampleBlocks,
    "",
  ].join("\n");
};

const buildToolSchemaSummaryMarkdown = (params: {
  toolName: string;
  partPaths: string[];
}): string =>
  [
    "---",
    `tool: ${params.toolName}`,
    "kind: tool-schema-summary",
    "generatedFrom: vfsToolRegistry",
    "---",
    "",
    `# ${params.toolName} Schema`,
    "",
    "Schema is split into multiple part files to keep each read small.",
    "",
    "## Parts",
    ...params.partPaths.map((path) => `- \`${path}\``),
    "",
  ].join("\n");

const buildToolSchemaPartMarkdown = (params: {
  toolName: string;
  part: string;
  index: number;
  total: number;
}): string =>
  [
    "---",
    `tool: ${params.toolName}`,
    "kind: tool-schema-part",
    `part: ${params.index + 1}`,
    `totalParts: ${params.total}`,
    "generatedFrom: vfsToolRegistry",
    "---",
    "",
    `# ${params.toolName} Schema Part ${params.index + 1}/${params.total}`,
    "",
    "```ts",
    params.part,
    "```",
    "",
  ].join("\n");

export const buildGlobalVfsToolDocs = (): VfsFileMap => {
  const files: VfsFileMap = {};
  const allTools = vfsToolRegistry.getDefinitions();

  const indexEntries: ToolIndexEntry[] = [];

  addText(files, "refs/tools/README.md", buildToolsReadme());

  for (const tool of allTools) {
    const toolName = tool.name;
    const overviewPath = `current/refs/tools/${toolName}/README.md`;
    const examplesPath = `current/refs/tools/${toolName}/EXAMPLES.md`;
    const schemaSummaryPath = `current/refs/tool-schemas/${toolName}/README.md`;

    const schemaHint = getToolSchemaHint(tool.parameters, "", { toolName });
    const schemaParts = splitSchemaHintIntoParts(schemaHint);
    const schemaPartPaths = schemaParts.map(
      (_part, index) =>
        `current/refs/tool-schemas/${toolName}/PART-${String(index + 1).padStart(2, "0")}.md`,
    );

    indexEntries.push({
      name: toolName,
      description: tool.description,
      overviewPath,
      examplesPath,
      schemaSummaryPath,
      schemaPartPaths,
    });

    addText(
      files,
      `refs/tools/${toolName}/README.md`,
      buildToolOverviewMarkdown({
        toolName,
        description: tool.description,
        examplesPath,
        schemaSummaryPath,
      }),
    );
    addText(
      files,
      `refs/tools/${toolName}/EXAMPLES.md`,
      buildToolExamplesMarkdown(
        toolName,
        buildExamplesForTool(toolName, tool.parameters),
      ),
    );
    addText(
      files,
      `refs/tool-schemas/${toolName}/README.md`,
      buildToolSchemaSummaryMarkdown({
        toolName,
        partPaths: schemaPartPaths,
      }),
    );
    for (let i = 0; i < schemaParts.length; i += 1) {
      addText(
        files,
        `refs/tool-schemas/${toolName}/PART-${String(i + 1).padStart(2, "0")}.md`,
        buildToolSchemaPartMarkdown({
          toolName,
          part: schemaParts[i],
          index: i,
          total: schemaParts.length,
        }),
      );
    }
  }

  addText(files, "refs/tools/index.json", buildToolsIndex(indexEntries));
  addText(
    files,
    "refs/tool-schemas/README.md",
    [
      "# Tool Schemas Reference (VFS)",
      "",
      "Use this folder for schema-only reads. Tool overview/examples live under `refs/tools/**`.",
      "",
      '- Read schema index: `vfs_read_json({ path: "current/refs/tool-schemas/index.json" })`',
      "",
    ].join("\n"),
  );
  addText(
    files,
    "refs/tool-schemas/index.json",
    buildSchemaIndex(indexEntries),
  );

  return files;
};
