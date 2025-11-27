/**
 * ============================================================================
 * Zod Schema Compiler - 直接编译到各 Provider 格式
 * ============================================================================
 *
 * 将 Zod schema 直接编译到:
 * - Google Gemini Schema 格式
 * - OpenAI Strict Schema 格式
 * - OpenRouter (兼容 OpenAI) 格式
 *
 * 无需中间 JSON Schema 层
 */

import {
  z,
  ZodTypeAny,
  ZodObject,
  ZodArray,
  ZodEnum,
  ZodOptional,
  ZodNullable,
  ZodDefault,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodLiteral,
  ZodUnion,
  ZodEffects,
  ZodDiscriminatedUnion,
} from "zod";
import { Schema, Type } from "@google/genai";

// ============================================================================
// OpenAI Schema Types
// ============================================================================

export interface OpenAISchema {
  type: string | string[];
  description?: string;
  properties?: Record<string, OpenAISchema>;
  required?: string[];
  items?: OpenAISchema;
  enum?: string[];
  additionalProperties?: boolean;
  // Index signature to satisfy Record<string, unknown> constraint
  [key: string]: unknown;
}

export interface OpenAIResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: OpenAISchema;
  };
}

// ============================================================================
// Zod to Gemini Compiler
// ============================================================================

/**
 * 将 Zod Schema 直接编译为 Google Gemini Schema 格式
 */
export function zodToGemini(schema: ZodTypeAny): Schema {
  return processZodToGemini(schema);
}

function processZodToGemini(schema: ZodTypeAny): Schema {
  const typeName = schema._def.typeName;

  // Handle effects (refinements, transforms, etc.)
  if (schema instanceof ZodEffects || typeName === "ZodEffects") {
    return processZodToGemini((schema as ZodEffects<any>)._def.schema);
  }

  // Handle optional - Gemini doesn't have optional, we handle via required array
  if (schema instanceof ZodOptional || typeName === "ZodOptional") {
    return processZodToGemini((schema as ZodOptional<any>)._def.innerType);
  }

  // Handle nullable
  if (schema instanceof ZodNullable || typeName === "ZodNullable") {
    const innerSchema = processZodToGemini(
      (schema as ZodNullable<any>)._def.innerType,
    );
    return { ...innerSchema, nullable: true };
  }

  // Handle default
  if (schema instanceof ZodDefault || typeName === "ZodDefault") {
    return processZodToGemini((schema as ZodDefault<any>)._def.innerType);
  }

  // Handle string
  if (schema instanceof ZodString || typeName === "ZodString") {
    const result: Schema = { type: Type.STRING };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle number
  if (schema instanceof ZodNumber || typeName === "ZodNumber") {
    const checks = (schema as ZodNumber)._def.checks || [];
    const isInt = checks.some((c) => c.kind === "int");
    const result: Schema = { type: isInt ? Type.INTEGER : Type.NUMBER };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle boolean
  if (schema instanceof ZodBoolean || typeName === "ZodBoolean") {
    const result: Schema = { type: Type.BOOLEAN };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle literal (convert to enum)
  if (schema instanceof ZodLiteral || typeName === "ZodLiteral") {
    const value = (schema as ZodLiteral<any>)._def.value;
    const result: Schema = {
      type: Type.STRING,
      enum: [String(value)],
    };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle enum
  if (schema instanceof ZodEnum || typeName === "ZodEnum") {
    const values = (schema as ZodEnum<any>)._def.values as string[];
    const result: Schema = {
      type: Type.STRING,
      enum: values,
    };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle union - Gemini doesn't support union, throw error
  if (schema instanceof ZodUnion || typeName === "ZodUnion") {
    throw new Error(
      "Gemini Schema does not support union types. Please flatten your schema.",
    );
  }

  // Handle discriminated union - convert to merged object with all possible properties
  if (
    schema instanceof ZodDiscriminatedUnion ||
    typeName === "ZodDiscriminatedUnion"
  ) {
    const discriminator = (schema as ZodDiscriminatedUnion<any, any>)._def
      .discriminator;
    const options = (schema as ZodDiscriminatedUnion<any, any>)._def
      .options as ZodObject<any>[];

    // Collect all possible properties from all variants
    const allProperties: Record<string, Schema> = {};
    const discriminatorValues: string[] = [];
    const requiredByAll = new Set<string>();
    let firstVariant = true;

    for (const option of options) {
      const shape = option.shape;

      // Get discriminator value
      const discriminatorField = shape[discriminator];
      if (
        discriminatorField instanceof ZodLiteral ||
        discriminatorField?._def?.typeName === "ZodLiteral"
      ) {
        discriminatorValues.push(
          String((discriminatorField as ZodLiteral<any>)._def.value),
        );
      }

      // Collect properties
      const currentRequired = new Set<string>();
      for (const [key, value] of Object.entries(shape)) {
        if (key === discriminator) continue; // Handle discriminator separately

        const fieldTypeName = (value as ZodTypeAny)._def.typeName;
        const isRequired =
          fieldTypeName !== "ZodOptional" && fieldTypeName !== "ZodDefault";

        if (isRequired) currentRequired.add(key);

        if (!allProperties[key]) {
          allProperties[key] = processZodToGemini(value as ZodTypeAny);
        }
      }

      if (firstVariant) {
        currentRequired.forEach((k) => requiredByAll.add(k));
        firstVariant = false;
      } else {
        // Only keep fields that are required in ALL variants
        for (const k of requiredByAll) {
          if (!currentRequired.has(k)) {
            requiredByAll.delete(k);
          }
        }
      }
    }

    // Add discriminator field as enum
    allProperties[discriminator] = {
      type: Type.STRING,
      enum: discriminatorValues,
      description: `Discriminator field. Allowed values: ${discriminatorValues.join(", ")}`,
    };

    // Build required array - only discriminator is always required
    const required = [discriminator, ...Array.from(requiredByAll)];

    const result: Schema = {
      type: Type.OBJECT,
      properties: allProperties,
      required,
    };

    if (schema.description) result.description = schema.description;

    return result;
  }

  // Handle array
  if (schema instanceof ZodArray || typeName === "ZodArray") {
    const itemSchema = processZodToGemini((schema as ZodArray<any>)._def.type);
    const result: Schema = {
      type: Type.ARRAY,
      items: itemSchema,
    };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle object
  if (schema instanceof ZodObject || typeName === "ZodObject") {
    const shape = (schema as ZodObject<any>).shape;
    const properties: Record<string, Schema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = processZodToGemini(value as ZodTypeAny);

      // Check if field is required
      const fieldTypeName = (value as ZodTypeAny)._def.typeName;
      if (fieldTypeName !== "ZodOptional" && fieldTypeName !== "ZodDefault") {
        if (fieldTypeName === "ZodNullable") {
          const innerTypeName = (
            (value as ZodNullable<any>)._def.innerType as ZodTypeAny
          )._def.typeName;
          if (
            innerTypeName !== "ZodOptional" &&
            innerTypeName !== "ZodDefault"
          ) {
            required.push(key);
          }
        } else {
          required.push(key);
        }
      }
    }

    const result: Schema = {
      type: Type.OBJECT,
      properties,
    };

    if (required.length > 0) {
      result.required = required;
    }

    if (schema.description) result.description = schema.description;

    return result;
  }

  // Fallback
  console.warn(`Unknown Zod type for Gemini: ${typeName}`);
  return { type: Type.STRING };
}

// ============================================================================
// Zod to OpenAI Compiler
// ============================================================================

/**
 * 将 Zod Schema 直接编译为 OpenAI Strict Schema 对象
 */
export function zodToOpenAISchema(
  schema: ZodTypeAny,
  strict: boolean = true,
): OpenAISchema {
  return processZodToOpenAI(schema, strict);
}

/**
 * 将 Zod Schema 编译为 OpenAI Response Format (json_schema)
 */
export function zodToOpenAIResponseFormat(
  schema: ZodTypeAny,
  name: string = "response",
): OpenAIResponseFormat {
  return {
    type: "json_schema",
    json_schema: {
      name,
      strict: true,
      schema: zodToOpenAISchema(schema, true),
    },
  };
}

function processZodToOpenAI(
  schema: ZodTypeAny,
  strict: boolean,
  isOptionalField: boolean = false,
): OpenAISchema {
  const typeName = schema._def.typeName;

  // Handle effects
  if (schema instanceof ZodEffects || typeName === "ZodEffects") {
    return processZodToOpenAI(
      (schema as ZodEffects<any>)._def.schema,
      strict,
      isOptionalField,
    );
  }

  // Handle optional
  if (schema instanceof ZodOptional || typeName === "ZodOptional") {
    return processZodToOpenAI(
      (schema as ZodOptional<any>)._def.innerType,
      strict,
      true,
    );
  }

  // Handle nullable
  if (schema instanceof ZodNullable || typeName === "ZodNullable") {
    const innerSchema = processZodToOpenAI(
      (schema as ZodNullable<any>)._def.innerType,
      strict,
      isOptionalField,
    );
    // Add null to type array
    if (Array.isArray(innerSchema.type)) {
      if (!innerSchema.type.includes("null")) {
        innerSchema.type.push("null");
      }
    } else {
      innerSchema.type = [innerSchema.type, "null"];
    }
    return innerSchema;
  }

  // Handle default
  if (schema instanceof ZodDefault || typeName === "ZodDefault") {
    return processZodToOpenAI(
      (schema as ZodDefault<any>)._def.innerType,
      strict,
      true,
    );
  }

  // Handle string
  if (schema instanceof ZodString || typeName === "ZodString") {
    const result: OpenAISchema = { type: "string" };
    if (schema.description) result.description = schema.description;
    if (strict && isOptionalField) {
      result.type = ["string", "null"];
    }
    return result;
  }

  // Handle number
  if (schema instanceof ZodNumber || typeName === "ZodNumber") {
    const checks = (schema as ZodNumber)._def.checks || [];
    const isInt = checks.some((c) => c.kind === "int");
    const baseType = isInt ? "integer" : "number";
    const result: OpenAISchema = { type: baseType };
    if (schema.description) result.description = schema.description;
    if (strict && isOptionalField) {
      result.type = [baseType, "null"];
    }
    return result;
  }

  // Handle boolean
  if (schema instanceof ZodBoolean || typeName === "ZodBoolean") {
    const result: OpenAISchema = { type: "boolean" };
    if (schema.description) result.description = schema.description;
    if (strict && isOptionalField) {
      result.type = ["boolean", "null"];
    }
    return result;
  }

  // Handle literal
  if (schema instanceof ZodLiteral || typeName === "ZodLiteral") {
    const value = (schema as ZodLiteral<any>)._def.value;
    const result: OpenAISchema = {
      type: "string",
      enum: [String(value)],
    };
    if (schema.description) result.description = schema.description;
    if (strict && isOptionalField) {
      result.type = ["string", "null"];
    }
    return result;
  }

  // Handle enum
  if (schema instanceof ZodEnum || typeName === "ZodEnum") {
    const values = (schema as ZodEnum<any>)._def.values as string[];
    const result: OpenAISchema = {
      type: "string",
      enum: values,
    };
    if (schema.description) result.description = schema.description;
    if (strict && isOptionalField) {
      result.type = ["string", "null"];
    }
    return result;
  }

  // Handle union - OpenAI doesn't support anyOf in strict mode
  if (schema instanceof ZodUnion || typeName === "ZodUnion") {
    throw new Error(
      "OpenAI Strict Schema does not support union types. Please flatten your schema.",
    );
  }

  // Handle discriminated union - convert to merged object with all possible properties
  if (
    schema instanceof ZodDiscriminatedUnion ||
    typeName === "ZodDiscriminatedUnion"
  ) {
    const discriminator = (schema as ZodDiscriminatedUnion<any, any>)._def
      .discriminator;
    const options = (schema as ZodDiscriminatedUnion<any, any>)._def
      .options as ZodObject<any>[];

    // Collect all possible properties from all variants
    const allProperties: Record<string, OpenAISchema> = {};
    const discriminatorValues: string[] = [];
    const allKeys = new Set<string>();
    const requiredInAllVariants = new Set<string>();
    let firstVariant = true;

    for (const option of options) {
      const shape = option.shape;

      // Get discriminator value
      const discriminatorField = shape[discriminator];
      if (
        discriminatorField instanceof ZodLiteral ||
        discriminatorField?._def?.typeName === "ZodLiteral"
      ) {
        discriminatorValues.push(
          String((discriminatorField as ZodLiteral<any>)._def.value),
        );
      }

      // Collect properties
      const currentRequired = new Set<string>();
      for (const [key, value] of Object.entries(shape)) {
        if (key === discriminator) continue; // Handle discriminator separately

        allKeys.add(key);
        const fieldTypeName = (value as ZodTypeAny)._def.typeName;
        const isRequired =
          fieldTypeName !== "ZodOptional" && fieldTypeName !== "ZodDefault";

        if (isRequired) currentRequired.add(key);

        if (!allProperties[key]) {
          // Process as optional since not all variants may have it
          allProperties[key] = processZodToOpenAI(
            value as ZodTypeAny,
            strict,
            true,
          );
        }
      }

      if (firstVariant) {
        currentRequired.forEach((k) => requiredInAllVariants.add(k));
        firstVariant = false;
      } else {
        // Only keep fields that are required in ALL variants
        for (const k of requiredInAllVariants) {
          if (!currentRequired.has(k)) {
            requiredInAllVariants.delete(k);
          }
        }
      }
    }

    // Add discriminator field as enum
    allProperties[discriminator] = {
      type: "string",
      enum: discriminatorValues,
      description: `Discriminator field. Allowed values: ${discriminatorValues.join(", ")}`,
    };
    allKeys.add(discriminator);

    // In strict mode, all keys are required (with nullable types for optional fields)
    const result: OpenAISchema = {
      type: "object",
      properties: allProperties,
      required: strict
        ? Array.from(allKeys)
        : [discriminator, ...Array.from(requiredInAllVariants)],
      additionalProperties: false,
    };

    if (schema.description) result.description = schema.description;

    if (strict && isOptionalField) {
      result.type = ["object", "null"];
    }

    return result;
  }

  // Handle array
  if (schema instanceof ZodArray || typeName === "ZodArray") {
    const itemSchema = processZodToOpenAI(
      (schema as ZodArray<any>)._def.type,
      strict,
      false,
    );
    const result: OpenAISchema = {
      type: "array",
      items: itemSchema,
    };
    if (schema.description) result.description = schema.description;
    if (strict && isOptionalField) {
      result.type = ["array", "null"];
    }
    return result;
  }

  // Handle object
  if (schema instanceof ZodObject || typeName === "ZodObject") {
    const shape = (schema as ZodObject<any>).shape;
    const properties: Record<string, OpenAISchema> = {};
    const originalRequired: string[] = [];
    const allKeys: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      allKeys.push(key);

      // Check if originally required
      const fieldTypeName = (value as ZodTypeAny)._def.typeName;
      const isFieldOptional =
        fieldTypeName === "ZodOptional" || fieldTypeName === "ZodDefault";

      if (!isFieldOptional) {
        if (fieldTypeName === "ZodNullable") {
          const innerTypeName = (
            (value as ZodNullable<any>)._def.innerType as ZodTypeAny
          )._def.typeName;
          if (
            innerTypeName !== "ZodOptional" &&
            innerTypeName !== "ZodDefault"
          ) {
            originalRequired.push(key);
          }
        } else {
          originalRequired.push(key);
        }
      }

      // Process field - pass isOptionalField based on strict mode
      const isOptional = strict && !originalRequired.includes(key);
      properties[key] = processZodToOpenAI(
        value as ZodTypeAny,
        strict,
        isOptional,
      );
    }

    const result: OpenAISchema = {
      type: "object",
      properties,
      // In strict mode, all keys are required (optional ones become nullable)
      required: strict ? allKeys : originalRequired,
      additionalProperties: false,
    };

    if (schema.description) result.description = schema.description;

    if (strict && isOptionalField) {
      result.type = ["object", "null"];
    }

    return result;
  }

  // Fallback
  console.warn(`Unknown Zod type for OpenAI: ${typeName}`);
  return { type: "string" };
}

// ============================================================================
// Zod to OpenRouter Compiler (使用 OpenAI 格式)
// ============================================================================

/**
 * 将 Zod Schema 编译为 OpenRouter 格式 (与 OpenAI 相同)
 */
export const zodToOpenRouter = zodToOpenAIResponseFormat;

/**
 * 将 Zod Schema 编译为 OpenRouter Schema 对象
 */
export const zodToOpenRouterSchema = zodToOpenAISchema;

// ============================================================================
// Tool Definition Compiler
// ============================================================================

export interface GeminiToolDefinition {
  name: string;
  description: string;
  parameters: Schema;
}

export interface OpenAIToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: OpenAISchema;
  };
}

/**
 * 从 Zod Schema 创建 Gemini 工具定义
 */
export function createGeminiTool(
  name: string,
  description: string,
  parameters: ZodTypeAny,
): GeminiToolDefinition {
  return {
    name,
    description,
    parameters: zodToGemini(parameters),
  };
}

/**
 * 从 Zod Schema 创建 OpenAI 工具定义
 */
export function createOpenAITool(
  name: string,
  description: string,
  parameters: ZodTypeAny,
): OpenAIToolDefinition {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters: zodToOpenAISchema(parameters, true),
    },
  };
}

// ============================================================================
// Batch Compilation Helpers
// ============================================================================

/**
 * 批量编译工具定义到 Gemini 格式
 */
export function compileToolsForGemini(
  tools: Array<{ name: string; description: string; parameters: ZodTypeAny }>,
): GeminiToolDefinition[] {
  return tools.map((t) =>
    createGeminiTool(t.name, t.description, t.parameters),
  );
}

/**
 * 批量编译工具定义到 OpenAI 格式
 */
export function compileToolsForOpenAI(
  tools: Array<{ name: string; description: string; parameters: ZodTypeAny }>,
): OpenAIToolDefinition[] {
  return tools.map((t) =>
    createOpenAITool(t.name, t.description, t.parameters),
  );
}
