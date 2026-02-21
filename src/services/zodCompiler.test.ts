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
  zodToGeminiToolCompatibleSchema,
  zodToOpenRouterGeminiCompatibleSchema,
  createOpenRouterGeminiTool,
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

  it("should handle record types without warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const recordSchema = z.record(z.string());

    // In strict mode (default), record degrades to plain object with description
    const result = zodToOpenAISchema(recordSchema);

    expect(result.type).toBe("object");
    expect(result.description).toContain("key-value map");
    expect(result.additionalProperties).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();

    // In non-strict mode, additionalProperties is preserved
    const nonStrictResult = zodToOpenAISchema(recordSchema, false);
    expect(nonStrictResult.type).toBe("object");
    expect(nonStrictResult.additionalProperties).toMatchObject({
      type: "string",
    });

    warn.mockRestore();
  });

  it("should handle unknown types without warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const unknownSchema = z.unknown();

    const result = zodToOpenAISchema(unknownSchema);

    expect(result.type).toEqual([
      "string",
      "number",
      "boolean",
      "object",
      "array",
      "null",
    ]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
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

  it("should preserve primitive unions via anyOf", () => {
    const result = zodToGeminiCompatibleSchema(
      z.union([z.string(), z.number()]),
    );

    expect(result.anyOf).toEqual([{ type: "string" }, { type: "number" }]);
  });

  it("should dedupe duplicate union branches in anyOf", () => {
    const result = zodToGeminiCompatibleSchema(
      z.union([z.string(), z.string(), z.number()]),
    );

    expect(result.anyOf).toEqual([{ type: "string" }, { type: "number" }]);
  });

  it("should preserve mixed object and scalar unions via anyOf", () => {
    const result = zodToGeminiCompatibleSchema(
      z.union([
        z.object({ kind: z.literal("file"), path: z.string() }),
        z.string(),
      ]),
    );

    expect(result.anyOf?.[0]).toMatchObject({
      type: "object",
      properties: {
        kind: { type: "string", enum: ["file"] },
        path: { type: "string" },
      },
    });
    expect(result.anyOf?.[1]).toEqual({ type: "string" });
  });

  it("should keep nested union fields as anyOf", () => {
    const result = zodToGeminiCompatibleSchema(
      z.object({ payload: z.union([z.string(), z.number()]) }),
    );

    expect(result.properties?.payload?.anyOf).toEqual([
      { type: "string" },
      { type: "number" },
    ]);
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

  it("should preserve primitive unions via anyOf", () => {
    const result = zodToClaudeCompatibleSchema(
      z.union([z.string(), z.number()]),
    );

    expect(result.anyOf).toEqual([{ type: "string" }, { type: "number" }]);
  });

  it("should dedupe duplicate union branches in anyOf", () => {
    const result = zodToClaudeCompatibleSchema(
      z.union([z.string(), z.string(), z.number()]),
    );

    expect(result.anyOf).toEqual([{ type: "string" }, { type: "number" }]);
  });

  it("should preserve mixed object and scalar unions via anyOf", () => {
    const result = zodToClaudeCompatibleSchema(
      z.union([
        z.object({ kind: z.literal("file"), path: z.string() }),
        z.string(),
      ]),
    );

    expect(result.anyOf?.[0]).toMatchObject({
      type: "object",
      properties: {
        kind: { type: "string", enum: ["file"] },
        path: { type: "string" },
      },
    });
    expect(result.anyOf?.[1]).toEqual({ type: "string" });
  });

  it("should keep nested union fields as anyOf", () => {
    const result = zodToClaudeCompatibleSchema(
      z.object({ payload: z.union([z.string(), z.number()]) }),
    );

    expect(result.properties?.payload?.anyOf).toEqual([
      { type: "string" },
      { type: "number" },
    ]);
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
  it("should use separate processing functions producing different schemas", () => {
    // Claude and Gemini compatible compilers should produce structurally correct output independently
    const schema = z.object({
      name: z.string().describe("The name"),
      nullable_field: z.string().nullable(),
    });

    const geminiResult = zodToGeminiCompatibleSchema(schema);
    const claudeResult = zodToClaudeCompatibleSchema(schema);

    // Both should produce valid object schemas with the same structure
    expect(geminiResult.type).toBe("object");
    expect(claudeResult.type).toBe("object");
    expect(Object.keys(geminiResult.properties!).sort()).toEqual(
      Object.keys(claudeResult.properties!).sort(),
    );

    // Both should handle nullable with nullable: true (not type arrays)
    const geminiNullable = geminiResult.properties!.nullable_field as any;
    const claudeNullable = claudeResult.properties!.nullable_field as any;
    expect(geminiNullable.nullable).toBe(true);
    expect(claudeNullable.nullable).toBe(true);
  });
});

// ============================================================================
// zodToGeminiToolCompatibleSchema (sanitizer) Tests
// ============================================================================

describe("zodToGeminiToolCompatibleSchema (sanitizer)", () => {
  it("should remove additionalProperties from objects", () => {
    const schema = z.object({ name: z.string() });
    const result = zodToGeminiToolCompatibleSchema(schema);
    expect(result.additionalProperties).toBeUndefined();
  });

  it("should flatten anyOf into merged properties", () => {
    const schema = z.discriminatedUnion("type", [
      z.object({ type: z.literal("a"), value: z.string() }),
      z.object({ type: z.literal("b"), count: z.number() }),
    ]);
    const result = zodToGeminiToolCompatibleSchema(schema);
    // anyOf should be removed and properties merged
    expect(result.anyOf).toBeUndefined();
    expect(result.properties).toBeDefined();
    expect(result.properties!.type).toBeDefined();
  });

  it("should handle nullable type arrays correctly", () => {
    const schema = z.object({ name: z.string().nullable() });
    const result = zodToGeminiToolCompatibleSchema(schema);
    const nameProp = result.properties!.name as any;
    // Should have nullable: true, not a type array
    expect(nameProp.nullable).toBe(true);
    expect(nameProp.type).toBe("string");
  });

  it("should recursively sanitize nested objects", () => {
    const schema = z.object({
      nested: z.object({ value: z.string() }),
    });
    const result = zodToGeminiToolCompatibleSchema(schema);
    const nested = result.properties!.nested as any;
    expect(nested.additionalProperties).toBeUndefined();
  });

  it("should sanitize array items", () => {
    const schema = z.object({
      items: z.array(z.object({ name: z.string() })),
    });
    const result = zodToGeminiToolCompatibleSchema(schema);
    const items = result.properties!.items as any;
    expect(items.items.additionalProperties).toBeUndefined();
  });
});

// ============================================================================
// Merge functions via discriminated unions
// ============================================================================

describe("merge functions via discriminated unions", () => {
  it("should merge discriminated union variants in OpenAI schema", () => {
    const schema = z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("text"), content: z.string() }),
      z.object({
        kind: z.literal("image"),
        url: z.string(),
        width: z.number(),
      }),
    ]);
    const result = zodToOpenAISchema(schema);
    expect(result.type).toBe("object");
    expect(result.properties).toBeDefined();
    // All properties from all variants should be present
    expect(result.properties!.kind).toBeDefined();
    expect(result.properties!.content).toBeDefined();
    expect(result.properties!.url).toBeDefined();
    expect(result.properties!.width).toBeDefined();
  });

  it("should merge discriminated union variants in Gemini compat schema", () => {
    const schema = z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("text"), content: z.string() }),
      z.object({ kind: z.literal("image"), url: z.string() }),
    ]);
    const result = zodToGeminiCompatibleSchema(schema);
    expect(result.properties!.kind).toBeDefined();
    expect(result.properties!.content).toBeDefined();
    expect(result.properties!.url).toBeDefined();
    expect(result.additionalProperties).toBeUndefined();
  });

  it("should merge discriminated union variants in Claude compat schema", () => {
    const schema = z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("text"), content: z.string() }),
      z.object({ kind: z.literal("image"), url: z.string() }),
    ]);
    const result = zodToClaudeCompatibleSchema(schema);
    expect(result.properties!.kind).toBeDefined();
    expect(result.properties!.content).toBeDefined();
    expect(result.properties!.url).toBeDefined();
  });
});

// ============================================================================
// Cross-compiler consistency tests
// ============================================================================

describe("cross-compiler consistency", () => {
  const testCases = [
    {
      name: "simple object",
      schema: z.object({ name: z.string(), age: z.number() }),
    },
    {
      name: "nested object",
      schema: z.object({ user: z.object({ name: z.string() }) }),
    },
    {
      name: "array of strings",
      schema: z.object({ tags: z.array(z.string()) }),
    },
    {
      name: "enum field",
      schema: z.object({ status: z.enum(["a", "b", "c"]) }),
    },
    {
      name: "optional field",
      schema: z.object({ name: z.string(), nick: z.string().optional() }),
    },
    {
      name: "nullable field",
      schema: z.object({ bio: z.string().nullable() }),
    },
    {
      name: "nullish field",
      schema: z.object({ bio: z.string().nullish() }),
    },
    {
      name: "default field",
      schema: z.object({ role: z.string().default("user") }),
    },
  ];

  for (const { name, schema } of testCases) {
    it(`should produce consistent property keys for: ${name}`, () => {
      const openai = zodToOpenAISchema(schema);
      const gemini = zodToGeminiCompatibleSchema(schema);
      const claude = zodToClaudeCompatibleSchema(schema);

      // All should be object type
      expect(openai.type).toBe("object");
      expect(gemini.type).toBe("object");
      expect(claude.type).toBe("object");

      // All should have the same property keys
      const openaiKeys = Object.keys(openai.properties || {}).sort();
      const geminiKeys = Object.keys(gemini.properties || {}).sort();
      const claudeKeys = Object.keys(claude.properties || {}).sort();

      expect(openaiKeys).toEqual(geminiKeys);
      expect(openaiKeys).toEqual(claudeKeys);
    });
  }

  it("should consistently handle descriptions", () => {
    const schema = z.object({ name: z.string().describe("The name") });
    const openai = zodToOpenAISchema(schema);
    const gemini = zodToGeminiCompatibleSchema(schema);
    const claude = zodToClaudeCompatibleSchema(schema);

    expect((openai.properties!.name as any).description).toBe("The name");
    expect((gemini.properties!.name as any).description).toBe("The name");
    expect((claude.properties!.name as any).description).toBe("The name");
  });
});

// ============================================================================
// .nullish() handling across compilers
// ============================================================================

describe(".nullish() handling across compilers", () => {
  it("should preserve description through .nullish().describe()", () => {
    const schema = z.object({
      bio: z.string().nullish().describe("A biography"),
    });

    const openai = zodToOpenAISchema(schema);
    const gemini = zodToGeminiCompatibleSchema(schema);
    const claude = zodToClaudeCompatibleSchema(schema);

    expect((openai.properties!.bio as any).description).toBe("A biography");
    expect((gemini.properties!.bio as any).description).toBe("A biography");
    expect((claude.properties!.bio as any).description).toBe("A biography");
  });

  it("should handle nullish nullable semantics in OpenAI (type array)", () => {
    const schema = z.object({ value: z.string().nullish() });
    const result = zodToOpenAISchema(schema);
    const valueProp = result.properties!.value as any;
    // OpenAI uses type array for nullable
    expect(valueProp.type).toContain("null");
    expect(valueProp.type).toContain("string");
  });

  it("should handle nullish nullable semantics in Gemini compat (nullable: true)", () => {
    const schema = z.object({ value: z.string().nullish() });
    const result = zodToGeminiCompatibleSchema(schema);
    const valueProp = result.properties!.value as any;
    expect(valueProp.nullable).toBe(true);
    expect(valueProp.type).toBe("string");
  });

  it("should handle nullish nullable semantics in Claude compat (nullable: true)", () => {
    const schema = z.object({ value: z.string().nullish() });
    const result = zodToClaudeCompatibleSchema(schema);
    const valueProp = result.properties!.value as any;
    expect(valueProp.nullable).toBe(true);
    expect(valueProp.type).toBe("string");
  });

  it("should handle complex nullish fields", () => {
    const schema = z.object({
      metadata: z.record(z.string()).nullish().describe("Optional metadata"),
    });

    const openai = zodToOpenAISchema(schema);
    const gemini = zodToGeminiCompatibleSchema(schema);
    const claude = zodToClaudeCompatibleSchema(schema);

    // All should have the description
    expect((openai.properties!.metadata as any).description).toBeDefined();
    expect((gemini.properties!.metadata as any).description).toBeDefined();
    expect((claude.properties!.metadata as any).description).toBeDefined();
  });
});

// ============================================================================
// zodToGeminiToolCompatibleSchema tests
// ============================================================================

describe("zodToGeminiToolCompatibleSchema", () => {
  it("should produce valid schema for simple object", () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const result = zodToGeminiToolCompatibleSchema(schema);
    expect(result.type).toBe("object");
    expect(result.properties).toBeDefined();
    expect(result.additionalProperties).toBeUndefined();
  });

  it("should be aliased by zodToOpenRouterGeminiCompatibleSchema", () => {
    const schema = z.object({ name: z.string() });
    const a = zodToGeminiToolCompatibleSchema(schema);
    const b = zodToOpenRouterGeminiCompatibleSchema(schema);
    expect(a).toEqual(b);
  });

  it("should create tool with strict: false", () => {
    const tool = createOpenRouterGeminiTool(
      "test",
      "A test tool",
      z.object({ x: z.string() }),
    );
    expect(tool.function.strict).toBe(false);
    expect(tool.function.parameters.additionalProperties).toBeUndefined();
  });

  it("should handle constraints propagation", () => {
    const schema = z.object({
      count: z.number().min(1).max(100),
      name: z.string().min(1).max(50),
      items: z.array(z.string()).min(1).max(10),
    });
    const result = zodToGeminiToolCompatibleSchema(schema);
    // Constraints should be present in the sanitized output
    expect(result.properties).toBeDefined();
  });
});

// ============================================================================
// Default values emission
// ============================================================================

describe("default values emission", () => {
  it("should emit default values in OpenAI schema", () => {
    const schema = z.object({
      role: z.string().default("user"),
      count: z.number().default(10),
      active: z.boolean().default(true),
    });
    const result = zodToOpenAISchema(schema);
    expect((result.properties!.role as any).default).toBe("user");
    expect((result.properties!.count as any).default).toBe(10);
    expect((result.properties!.active as any).default).toBe(true);
  });

  it("should emit default values in Gemini compat schema", () => {
    const schema = z.object({ role: z.string().default("admin") });
    const result = zodToGeminiCompatibleSchema(schema);
    expect((result.properties!.role as any).default).toBe("admin");
  });

  it("should emit default values in Claude compat schema", () => {
    const schema = z.object({ role: z.string().default("admin") });
    const result = zodToClaudeCompatibleSchema(schema);
    expect((result.properties!.role as any).default).toBe("admin");
  });
});

// ============================================================================
// Constraints propagation
// ============================================================================

describe("constraints propagation", () => {
  it("should propagate number min/max in OpenAI schema", () => {
    const schema = z.object({ value: z.number().min(-100).max(100) });
    const result = zodToOpenAISchema(schema);
    const valueProp = result.properties!.value as any;
    expect(valueProp.minimum).toBe(-100);
    expect(valueProp.maximum).toBe(100);
  });

  it("should propagate string minLength/maxLength in OpenAI schema", () => {
    const schema = z.object({ name: z.string().min(1).max(50) });
    const result = zodToOpenAISchema(schema);
    const nameProp = result.properties!.name as any;
    expect(nameProp.minLength).toBe(1);
    expect(nameProp.maxLength).toBe(50);
  });

  it("should propagate array minItems/maxItems in OpenAI schema", () => {
    const schema = z.object({ items: z.array(z.string()).min(1).max(5) });
    const result = zodToOpenAISchema(schema);
    const itemsProp = result.properties!.items as any;
    expect(itemsProp.minItems).toBe(1);
    expect(itemsProp.maxItems).toBe(5);
  });

  it("should propagate constraints in Gemini compat schema", () => {
    const schema = z.object({
      value: z.number().min(0).max(10),
      name: z.string().min(1),
    });
    const result = zodToGeminiCompatibleSchema(schema);
    expect((result.properties!.value as any).minimum).toBe(0);
    expect((result.properties!.value as any).maximum).toBe(10);
    expect((result.properties!.name as any).minLength).toBe(1);
  });

  it("should propagate constraints in Claude compat schema", () => {
    const schema = z.object({
      value: z.number().min(0).max(10),
    });
    const result = zodToClaudeCompatibleSchema(schema);
    expect((result.properties!.value as any).minimum).toBe(0);
    expect((result.properties!.value as any).maximum).toBe(10);
  });
});
