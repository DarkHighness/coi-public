import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import {
  zodToOpenAISchema,
  zodToGeminiCompatibleSchema,
  zodToClaudeCompatibleSchema,
  createOpenAITool,
  createGeminiCompatibleTool,
  createClaudeCompatibleTool,
  isGeminiModel,
  isClaudeModel,
} from "./zodCompiler";

// ============================================================================
// Test Schemas
// ============================================================================

const simpleObjectSchema = z.object({
  name: z.string().describe("The name"),
  age: z.number().int().describe("The age"),
  active: z.boolean().optional(),
});

const nestedObjectSchema = z.object({
  user: simpleObjectSchema,
  tags: z.array(z.string()),
});

const enumSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
});

const nullableSchema = z.object({
  description: z.string().nullable(),
});

// ============================================================================
// Schema Conversion Tests
// ============================================================================

describe("zodToOpenAISchema", () => {
  it("should convert a simple object schema", () => {
    const result = zodToOpenAISchema(simpleObjectSchema);
    expect(result.type).toBe("object");
    expect(result.properties).toBeDefined();
    expect(result.properties!.name).toMatchObject({ type: "string" });
    expect(result.properties!.age).toMatchObject({ type: "integer" });
    // OpenAI strict mode includes all fields in required array
    expect(result.required).toContain("name");
    expect(result.required).toContain("age");
  });

  it("should include additionalProperties: false for OpenAI strict mode", () => {
    const result = zodToOpenAISchema(simpleObjectSchema);
    expect(result.additionalProperties).toBe(false);
  });
});

describe("zodToGeminiCompatibleSchema", () => {
  it("should convert a simple object schema without additionalProperties", () => {
    const result = zodToGeminiCompatibleSchema(simpleObjectSchema);
    expect(result.type).toBe("object");
    expect(result.properties).toBeDefined();
    expect(result.additionalProperties).toBeUndefined();
  });

  it("should handle enums correctly", () => {
    const result = zodToGeminiCompatibleSchema(enumSchema);
    expect(result.properties!.status).toEqual({
      type: "string",
      enum: ["pending", "approved", "rejected"],
    });
  });

  it("should handle nullable types with nullable: true", () => {
    const result = zodToGeminiCompatibleSchema(nullableSchema);
    expect(result.properties!.description).toHaveProperty("nullable", true);
  });
});

describe("zodToClaudeCompatibleSchema", () => {
  it("should convert a simple object schema without additionalProperties", () => {
    const result = zodToClaudeCompatibleSchema(simpleObjectSchema);
    expect(result.type).toBe("object");
    expect(result.properties).toBeDefined();
    expect(result.additionalProperties).toBeUndefined();
  });

  it("should handle enums correctly", () => {
    const result = zodToClaudeCompatibleSchema(enumSchema);
    expect(result.properties!.status).toEqual({
      type: "string",
      enum: ["pending", "approved", "rejected"],
    });
  });

  it("should handle nullable types with nullable: true", () => {
    const result = zodToClaudeCompatibleSchema(nullableSchema);
    expect(result.properties!.description).toHaveProperty("nullable", true);
  });

  it("should be independent from Gemini schema (same output, different code path)", () => {
    // Both should produce the same output for simple cases
    const geminiResult = zodToGeminiCompatibleSchema(simpleObjectSchema);
    const claudeResult = zodToClaudeCompatibleSchema(simpleObjectSchema);

    // Structure should match (they're currently equivalent)
    expect(claudeResult.type).toBe(geminiResult.type);
    expect(Object.keys(claudeResult.properties!)).toEqual(
      Object.keys(geminiResult.properties!),
    );
  });
});

// ============================================================================
// Tool Creation Tests
// ============================================================================

describe("createOpenAITool", () => {
  it("should create a tool with strict: true", () => {
    const tool = createOpenAITool(
      "test_tool",
      "A test tool",
      simpleObjectSchema,
    );
    expect(tool.type).toBe("function");
    expect(tool.function.name).toBe("test_tool");
    expect(tool.function.description).toBe("A test tool");
    expect(tool.function.strict).toBe(true);
    expect(tool.function.parameters.additionalProperties).toBe(false);
  });
});

describe("createGeminiCompatibleTool", () => {
  it("should create a tool with strict: false", () => {
    const tool = createGeminiCompatibleTool(
      "test_tool",
      "A test tool",
      simpleObjectSchema,
    );
    expect(tool.function.strict).toBe(false);
    expect(tool.function.parameters.additionalProperties).toBeUndefined();
  });
});

describe("createClaudeCompatibleTool", () => {
  it("should create a tool with strict: false", () => {
    const tool = createClaudeCompatibleTool(
      "test_tool",
      "A test tool",
      simpleObjectSchema,
    );
    expect(tool.function.strict).toBe(false);
    expect(tool.function.parameters.additionalProperties).toBeUndefined();
  });

  it("should be different from OpenAI tool (no strict mode)", () => {
    const openaiTool = createOpenAITool("test", "test", simpleObjectSchema);
    const claudeTool = createClaudeCompatibleTool(
      "test",
      "test",
      simpleObjectSchema,
    );

    expect(openaiTool.function.strict).toBe(true);
    expect(claudeTool.function.strict).toBe(false);
  });
});

// ============================================================================
// Model Detection Tests
// ============================================================================

describe("isGeminiModel", () => {
  it("should detect Gemini models", () => {
    expect(isGeminiModel("gemini-1.5-pro")).toBe(true);
    expect(isGeminiModel("gemini-2.0-flash")).toBe(true);
    expect(isGeminiModel("google/gemini-pro")).toBe(true);
    expect(isGeminiModel("GEMINI-PRO")).toBe(true); // case insensitive
  });

  it("should not detect non-Gemini models", () => {
    expect(isGeminiModel("gpt-4")).toBe(false);
    expect(isGeminiModel("claude-3-opus")).toBe(false);
    expect(isGeminiModel("llama-70b")).toBe(false);
  });
});

describe("isClaudeModel", () => {
  it("should detect Claude models", () => {
    expect(isClaudeModel("claude-3-opus")).toBe(true);
    expect(isClaudeModel("claude-3.5-sonnet")).toBe(true);
    expect(isClaudeModel("anthropic/claude-3-haiku")).toBe(true);
    expect(isClaudeModel("CLAUDE-3-OPUS")).toBe(true); // case insensitive
  });

  it("should not detect non-Claude models", () => {
    expect(isClaudeModel("gpt-4")).toBe(false);
    expect(isClaudeModel("gemini-pro")).toBe(false);
    expect(isClaudeModel("llama-70b")).toBe(false);
  });
});

// ============================================================================
// Independence Verification
// ============================================================================

describe("Claude vs Gemini Independence", () => {
  it("should use separate processing functions (verified by error messages)", () => {
    // Create a mock schema that would trigger a warning
    const unionSchema = z.union([z.string(), z.number()]);

    // Both should handle it, but the warning messages should be different
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    zodToGeminiCompatibleSchema(unionSchema);
    zodToClaudeCompatibleSchema(unionSchema);

    // Both should have been called with different warning prefixes
    const calls = consoleSpy.mock.calls;
    expect(calls.some((call) => call[0].includes("Gemini"))).toBe(true);
    expect(calls.some((call) => call[0].includes("Claude"))).toBe(true);

    consoleSpy.mockRestore();
  });
});
