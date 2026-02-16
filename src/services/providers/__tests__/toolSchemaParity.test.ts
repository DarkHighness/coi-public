import { describe, expect, it } from "vitest";
import { Type } from "@google/genai";
import { VFS_TOOL_CATALOG } from "../../vfs/tools/catalog";
import type { OpenAISchema } from "../../zodCompiler";
import {
  zodToClaudeCompatibleSchema,
  zodToGemini,
  zodToGeminiCompatibleSchema,
  zodToOpenAISchema,
} from "../../zodCompiler";

type OpenAISchemaLike = OpenAISchema;

const getToolByName = (name: string) => {
  const tool = VFS_TOOL_CATALOG.find((entry) => entry.name === name);
  expect(tool).toBeDefined();
  return tool!;
};

const matchesType = (value: unknown, type: string): boolean => {
  if (type === "null") return value === null;
  if (type === "string") return typeof value === "string";
  if (type === "integer") return typeof value === "number" && Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "boolean") return typeof value === "boolean";
  if (type === "array") return Array.isArray(value);
  if (type === "object") {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  return true;
};

const validateAgainstOpenAISchema = (
  schema: OpenAISchemaLike,
  value: unknown,
): boolean => {
  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    return schema.anyOf.some((option) =>
      validateAgainstOpenAISchema(option, value),
    );
  }

  if ((schema as any).nullable === true && value === null) {
    return true;
  }

  if (Array.isArray(schema.enum)) {
    const isEnumMatch = schema.enum.some((candidate) => Object.is(candidate, value));
    if (!isEnumMatch) return false;
  }

  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    const typeMatched = allowed.some((type) => matchesType(value, type));
    if (!typeMatched) return false;
  }

  if (value === null || value === undefined) {
    return true;
  }

  if (Array.isArray(value)) {
    if (!schema.items) return true;
    return value.every((item) => validateAgainstOpenAISchema(schema.items!, item));
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const properties = schema.properties ?? {};
    const required = schema.required ?? [];

    for (const key of required) {
      if (!(key in objectValue)) return false;
    }

    for (const [key, fieldValue] of Object.entries(objectValue)) {
      const fieldSchema = properties[key];
      if (!fieldSchema) {
        if (schema.additionalProperties === false) return false;
        if (
          schema.additionalProperties &&
          typeof schema.additionalProperties === "object"
        ) {
          if (!validateAgainstOpenAISchema(schema.additionalProperties, fieldValue)) {
            return false;
          }
        }
        continue;
      }
      if (!validateAgainstOpenAISchema(fieldSchema, fieldValue)) return false;
    }
  }

  return true;
};

describe("tool schema parity guardrails", () => {
  it("keeps outline phase tools as direct-object schemas across compiled schemas", () => {
    const outlineTool = getToolByName("vfs_finish_outline_phase_1");

    const openaiSchema = zodToOpenAISchema(outlineTool.parameters, true);
    const geminiCompatSchema = zodToGeminiCompatibleSchema(outlineTool.parameters);
    const claudeCompatSchema = zodToClaudeCompatibleSchema(outlineTool.parameters);
    const geminiSchema = zodToGemini(outlineTool.parameters) as any;

    expect(openaiSchema.properties?.phase).toBeUndefined();
    expect(openaiSchema.properties?.data).toBeUndefined();
    expect(openaiSchema.properties?.storyPlanMarkdown).toBeDefined();
    expect((openaiSchema.properties?.storyPlanMarkdown as any)?.type).toBe(
      "string",
    );

    expect(geminiCompatSchema.properties?.phase).toBeUndefined();
    expect(geminiCompatSchema.properties?.data).toBeUndefined();
    expect(geminiCompatSchema.properties?.storyPlanMarkdown).toBeDefined();

    expect(claudeCompatSchema.properties?.phase).toBeUndefined();
    expect(claudeCompatSchema.properties?.data).toBeUndefined();
    expect(claudeCompatSchema.properties?.storyPlanMarkdown).toBeDefined();

    expect(geminiSchema?.properties?.phase).toBeUndefined();
    expect(geminiSchema?.properties?.data).toBeUndefined();
    expect(geminiSchema?.properties?.storyPlanMarkdown?.type).toBe(Type.STRING);
  });

  it("keeps pass/fail parity with zod for targeted outline + mutate payloads", () => {
    const outlineTool = getToolByName("vfs_finish_outline_phase_1");
    const mutateTool = getToolByName("vfs_append_text");

    const outlineValid = {
      storyPlanMarkdown: "# Plan",
      planningMetadata: {
        structureVersion: "v2",
        branchStrategy: "guided",
        endingFlexibility: "high",
        recoveryPolicy: {
          allowNaturalRecovery: true,
          allowOutlineRevision: true,
          forbidDeusExMachina: true,
        },
      },
    };

    const outlineInvalidSchema = {
      ...outlineValid,
      planningMetadata: {
        ...outlineValid.planningMetadata,
        structureVersion: "v3",
      },
    };

    const mutateValid = {
      path: "current/world/notes.md",
      content: "- learning",
    };

    const mutateInvalidNullOptional = {
      path: "current/world/notes.md",
      content: "- learning",
      expectedHash: null,
    };

    const compilers = [
      {
        name: "openai",
        compile: (schema: any) => zodToOpenAISchema(schema, true),
      },
      {
        name: "gemini-compatible",
        compile: (schema: any) => zodToGeminiCompatibleSchema(schema),
      },
      {
        name: "claude-compatible",
        compile: (schema: any) => zodToClaudeCompatibleSchema(schema),
      },
    ];

    const cases = [
      { tool: outlineTool, payload: outlineValid },
      { tool: outlineTool, payload: outlineInvalidSchema },
      { tool: mutateTool, payload: mutateValid },
      { tool: mutateTool, payload: mutateInvalidNullOptional },
    ];

    for (const compiler of compilers) {
      for (const item of cases) {
        const zodAccepted = item.tool.parameters.safeParse(item.payload).success;
        const compiledAccepted = validateAgainstOpenAISchema(
          compiler.compile(item.tool.parameters),
          item.payload,
        );
        expect(compiledAccepted, `${compiler.name}:${item.tool.name}`).toBe(
          zodAccepted,
        );
      }
    }
  });
});
