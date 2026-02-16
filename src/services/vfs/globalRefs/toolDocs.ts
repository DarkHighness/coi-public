import { z } from "zod";
import { getToolSchemaHint } from "../../providers/utils";
import { vfsToolRegistry } from "../tools";
import type { VfsFile, VfsFileMap, VfsContentType } from "../types";
import { hashContent } from "../utils";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

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
    { path: "current/world", stat: true },
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
  vfs_schema: [{ paths: ["current/world/global.json"] }],
  vfs_search: [
    { query: "dragon", path: "current/world", limit: 20 },
    { query: "dragn", path: "current/world", fuzzy: true },
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
      userAction: "Inspect the ruined gate",
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
        "# Player Soul (This Save)\\n\\n## Tool Usage Hints\\n- [INVALID_PARAMS] Missing required field -> re-read tool doc and send schema-valid args.\\n\\n## Guidance For AI\\n- Keep prose tighter when player asks for concise style.\\n",
    },
    {
      globalSoul:
        "# Player Soul (Global)\\n\\n## Tool Usage Hints\\n- [INVALID_ACTION] Read-before-write failed -> always read target via vfs_read_chars/vfs_read_lines/vfs_read_json before edit.\\n\\n## Evidence Log\\n- turn fork-0/turn-12: downvote, preset=AI flavor too strong.\\n",
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
  vfs_finish_outline_phase_0: ["<See SCHEMA section for phase-0 payload fields>"],
};

const unwrapSchema = (
  schema: z.ZodTypeAny,
): { schema: z.ZodTypeAny; optional: boolean } => {
  let current = schema;
  let optional = false;

  while (true) {
    if (current instanceof z.ZodOptional || current instanceof z.ZodDefault) {
      optional = true;
      current = current._def.innerType;
      continue;
    }
    if (current instanceof z.ZodNullable) {
      current = current._def.innerType;
      continue;
    }
    if (current instanceof z.ZodEffects) {
      current = current._def.schema;
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
  if (depth > 4) return "<value>";

  if (inner instanceof z.ZodString) return "<string>";
  if (inner instanceof z.ZodNumber) return 0;
  if (inner instanceof z.ZodBoolean) return false;
  if (inner instanceof z.ZodNull) return null;
  if (inner instanceof z.ZodLiteral) return inner._def.value as JsonValue;
  if (inner instanceof z.ZodEnum) {
    return (inner._def.values[0] ?? "<enum>") as JsonValue;
  }
  if (inner instanceof z.ZodArray) {
    return [sampleValueForSchema(inner._def.type, depth + 1)];
  }
  if (inner instanceof z.ZodObject) {
    return buildExampleFromObject(inner, depth + 1);
  }
  if (inner instanceof z.ZodDiscriminatedUnion) {
    const first = (inner._def.options as z.ZodObject<any>[])[0];
    return first
      ? buildExampleFromObject(first, depth + 1)
      : { value: "<union>" };
  }
  if (inner instanceof z.ZodUnion) {
    const options = inner._def.options as z.ZodTypeAny[];
    return options.length > 0
      ? sampleValueForSchema(options[0], depth + 1)
      : "<union>";
  }
  if (inner instanceof z.ZodRecord) {
    const valueSchema = (inner as any)?._def?.valueType as
      | z.ZodTypeAny
      | undefined;
    return {
      "<key>": valueSchema
        ? sampleValueForSchema(valueSchema, depth + 1)
        : "<value>",
    };
  }
  if (inner instanceof z.ZodLazy) {
    return "<json>";
  }

  return "<value>";
};

const buildExampleFromObject = (
  schema: z.ZodObject<any>,
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

const buildToolDocMarkdown = (
  toolName: string,
  description: string,
  schema: z.ZodTypeAny,
): string => {
  const schemaHint = getToolSchemaHint(schema, "", { toolName });
  const examples = buildExamplesForTool(toolName, schema);
  const exampleBlocks = examples
    .map((example, index) => {
      return [
        `### Example ${index + 1}`,
        "```json",
        JSON.stringify(example, null, 2),
        "```",
      ].join("\n");
    })
    .join("\n\n");

  return [
    "---",
    `tool: ${toolName}`,
    "generatedFrom: vfsToolRegistry",
    "---",
    "",
    `# ${toolName}`,
    "",
    "## INTRO",
    description,
    "",
    "## SCHEMA",
    "```ts",
    schemaHint,
    "```",
    "",
    "## EXAMPLES",
    exampleBlocks,
    "",
  ].join("\n");
};

const buildToolsReadme = (): string => {
  return [
    "# Tool Docs Reference (VFS)",
    "",
    "Generated from `vfsToolRegistry.getDefinitions()`.",
    "",
    "## Usage",
    '- List docs: `vfs_ls({ path: "current/refs/tools" })`',
    '- Read index: `vfs_read_json({ path: "current/refs/tools/index.json" })`',
    '- Read one doc (bounded): `vfs_read_lines({ path: "current/refs/tools/vfs_read_lines.md", startLine: 1, lineCount: 200 })`',
    '- Search docs: `vfs_search({ path: "current/refs/tools", query: "commit" })`',
    "",
    "Keep this README lightweight. Full content lives in one-tool-per-file docs:",
    "- `current/refs/tools/<tool>.md`",
    "- `current/refs/tools/index.json`",
    "",
  ].join("\n");
};

const buildToolsIndex = (): string => {
  const allTools = vfsToolRegistry.getDefinitions();
  const entries = allTools.map((tool) => ({
    name: tool.name,
    path: `current/refs/tools/${tool.name}.md`,
    description: tool.description,
  }));
  return JSON.stringify(
    {
      generatedFrom: "vfsToolRegistry",
      count: entries.length,
      tools: entries,
    },
    null,
    2,
  );
};

export const buildGlobalVfsToolDocs = (): VfsFileMap => {
  const files: VfsFileMap = {};
  const allTools = vfsToolRegistry.getDefinitions();

  addText(files, "refs/tools/README.md", buildToolsReadme());
  addText(files, "refs/tools/index.json", buildToolsIndex());

  for (const tool of allTools) {
    const doc = buildToolDocMarkdown(
      tool.name,
      tool.description,
      tool.parameters,
    );
    addText(files, `refs/tools/${tool.name}.md`, doc);
  }

  return files;
};
