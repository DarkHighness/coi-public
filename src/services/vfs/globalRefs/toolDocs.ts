import { z } from "zod";
import { ALL_DEFINED_TOOLS } from "../../tools";
import { getToolSchemaHint } from "../../providers/utils";
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
  vfs_read: [
    {
      path: "current/world/global.json",
      mode: "json",
      pointers: ["/time", "/theme", "/currentLocation"],
    },
    {
      path: "current/world/notes.md",
      mode: "chars",
      start: 0,
      offset: 1024,
    },
  ],
  vfs_schema: [{ paths: ["current/world/global.json"] }],
  vfs_search: [
    { query: "dragon", path: "current/world", limit: 20 },
    { query: "dragn", path: "current/world", fuzzy: true },
  ],
  vfs_write: [
    {
      ops: [
        {
          op: "write_file",
          path: "current/world/notes.md",
          content: "# Session Notes\n\n- Entry",
          contentType: "text/markdown",
        },
      ],
    },
    {
      ops: [
        {
          op: "append_text",
          path: "current/world/notes.md",
          content: "- Follow-up",
          ensureNewline: true,
        },
        {
          op: "merge_json",
          path: "current/world/global.json",
          content: { turnNumber: 2 },
        },
      ],
    },
  ],
  vfs_move: [
    {
      moves: [
        {
          from: "current/world/tmp.md",
          to: "current/world/archive/tmp.md",
        },
      ],
    },
  ],
  vfs_delete: [{ paths: ["current/world/tmp.md"] }],
  vfs_commit_turn: [
    {
      userAction: "Inspect the ruined gate",
      assistant: {
        narrative: "You brush moss aside and find fresh claw marks.",
        choices: [
          { text: "Follow the tracks", consequence: null },
          { text: "Set up camp nearby", consequence: null },
        ],
      },
    },
  ],
  vfs_commit_soul: [
    {
      currentSoul:
        "# Player Soul (This Save)\\n\\n## Guidance For AI\\n- Keep prose tighter when player asks for concise style.\\n",
    },
    {
      globalSoul:
        "# Player Soul (Global)\\n\\n## Evidence Log\\n- turn fork-0/turn-12: downvote, preset=AI flavor too strong.\\n",
    },
    {
      currentSoul:
        "# Player Soul (This Save)\\n\\n## Guidance For AI\\n- Reduce ornamental metaphors.\\n",
      globalSoul:
        "# Player Soul (Global)\\n\\n## Style Preferences\\n- Prefer direct, concrete wording.\\n",
    },
  ],
  vfs_commit_summary: [
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
  schema: z.ZodObject<any>,
): JsonValue[] => {
  if (toolName.startsWith("vfs_commit_outline_phase_")) {
    return [{ data: "<See SCHEMA section for phase payload fields>" }];
  }
  const override = TOOL_EXAMPLE_OVERRIDES[toolName];
  if (override && override.length > 0) {
    return override;
  }
  return [buildExampleFromObject(schema)];
};

const buildToolDocMarkdown = (
  toolName: string,
  description: string,
  schema: z.ZodObject<any>,
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
    "generatedFrom: ALL_DEFINED_TOOLS",
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
  const toolLines = ALL_DEFINED_TOOLS.map(
    (tool) => `- \`${tool.name}\` -> \`refs/tools/${tool.name}.md\``,
  );
  return [
    "# Tool Docs Reference (VFS)",
    "",
    "Generated from `ALL_DEFINED_TOOLS`.",
    "",
    "## Usage",
    '- List docs: `vfs_ls({ path: "current/refs/tools" })`',
    '- Read one doc: `vfs_read({ path: "current/refs/tools/vfs_read.md" })`',
    '- Search docs: `vfs_search({ path: "current/refs/tools", query: "commit" })`',
    "",
    "## Contents",
    ...toolLines,
    "",
    "Each tool document includes `INTRO`, `SCHEMA`, and `EXAMPLES`.",
    "",
  ].join("\n");
};

const buildToolsIndex = (): string => {
  const entries = ALL_DEFINED_TOOLS.map((tool) => ({
    name: tool.name,
    path: `current/refs/tools/${tool.name}.md`,
    description: tool.description,
  }));
  return JSON.stringify(
    {
      generatedFrom: "ALL_DEFINED_TOOLS",
      count: entries.length,
      tools: entries,
    },
    null,
    2,
  );
};

export const buildGlobalVfsToolDocs = (): VfsFileMap => {
  const files: VfsFileMap = {};

  addText(files, "refs/tools/README.md", buildToolsReadme());
  addText(files, "refs/tools/index.json", buildToolsIndex());

  for (const tool of ALL_DEFINED_TOOLS) {
    const doc = buildToolDocMarkdown(
      tool.name,
      tool.description,
      tool.parameters,
    );
    addText(files, `refs/tools/${tool.name}.md`, doc);
  }

  return files;
};
