import { describe, expect, it, vi } from "vitest";
import { vfsToolRegistry } from "../../vfs/tools";
import {
  zodToGemini,
  zodToOpenAISchema,
  zodToGeminiCompatibleSchema,
  zodToClaudeCompatibleSchema,
} from "../../zodCompiler";
import { getToolSchemaHint } from "../utils";

const serialize = (value: unknown): string => JSON.stringify(value);

const forbiddenOutputPattern =
  /"type"\s*:\s*"any"|"type"\s*:\s*"unknown"|Record<string,\s*any>|Array<\s*any\s*>|Array<\s*unknown\s*>/i;

const ALL_DEFINED_TOOLS = vfsToolRegistry.getDefinitions();

describe("provider schema guardrails", () => {
  it("keeps OpenAI/Gemini/Claude compatible tool schemas free of any/unknown textual types", () => {
    const offenders: Array<{
      provider: string;
      tool: string;
      output: string;
    }> = [];

    for (const tool of ALL_DEFINED_TOOLS) {
      const outputs = [
        {
          provider: "openai",
          schema: zodToOpenAISchema(tool.parameters, true),
        },
        {
          provider: "gemini-compatible",
          schema: zodToGeminiCompatibleSchema(tool.parameters),
        },
        {
          provider: "claude-compatible",
          schema: zodToClaudeCompatibleSchema(tool.parameters),
        },
      ];

      for (const output of outputs) {
        const text = serialize(output.schema);
        if (forbiddenOutputPattern.test(text)) {
          offenders.push({
            provider: output.provider,
            tool: tool.name,
            output: text,
          });
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("does not emit 'Unknown Zod type' warnings when compiling tool schemas", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      for (const tool of ALL_DEFINED_TOOLS) {
        zodToGemini(tool.parameters);
        zodToOpenAISchema(tool.parameters, true);
        zodToGeminiCompatibleSchema(tool.parameters);
        zodToClaudeCompatibleSchema(tool.parameters);
      }

      const unknownTypeWarnings = warnSpy.mock.calls.filter((call) => {
        const message = String(call[0] ?? "");
        return message.includes("Unknown Zod type");
      });

      expect(unknownTypeWarnings).toEqual([]);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("keeps vfs_finish_summary schema and schemaHint free of runtime-only fields", () => {
    const tool = ALL_DEFINED_TOOLS.find(
      (item) => item.name === "vfs_finish_summary",
    );
    expect(tool).toBeDefined();
    if (!tool) return;

    const openaiSchema = serialize(zodToOpenAISchema(tool.parameters, true));
    const geminiSchema = serialize(
      zodToGeminiCompatibleSchema(tool.parameters),
    );
    const claudeSchema = serialize(
      zodToClaudeCompatibleSchema(tool.parameters),
    );
    const hint = getToolSchemaHint(tool.parameters, "", {
      toolName: tool.name,
    });
    for (const text of [openaiSchema, geminiSchema, claudeSchema, hint]) {
      expect(text).not.toContain("nodeRange");
      expect(text).not.toContain("lastSummarizedIndex");
    }

    for (const text of [openaiSchema, geminiSchema, claudeSchema, hint]) {
      expect(text).not.toContain("createdAt");
      expect(text).not.toContain('"id"');
    }
  });

  it("keeps vfs_finish_turn schema and schemaHint free of runtime-only fields", () => {
    const tool = ALL_DEFINED_TOOLS.find(
      (item) => item.name === "vfs_finish_turn",
    );
    expect(tool).toBeDefined();
    if (!tool) return;

    const openaiSchema = serialize(zodToOpenAISchema(tool.parameters, true));
    const geminiSchema = serialize(
      zodToGeminiCompatibleSchema(tool.parameters),
    );
    const claudeSchema = serialize(
      zodToClaudeCompatibleSchema(tool.parameters),
    );
    const hint = getToolSchemaHint(tool.parameters, "", {
      toolName: tool.name,
    });

    for (const text of [openaiSchema, geminiSchema, claudeSchema, hint]) {
      expect(text).not.toContain("userAction");
      expect(text).not.toContain("retconAck.hash");
      expect(text).not.toContain('"hash"');
    }
  });
});
