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
  ZodObject,
  ZodArray,
  ZodEnum,
  ZodOptional,
  ZodNullable,
  ZodDefault,
  ZodLazy,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodLiteral,
  ZodUnion,
  ZodIntersection,
  ZodEffects,
  ZodDiscriminatedUnion,
  ZodNull,
  ZodAny,
  ZodRecord,
  ZodUnknown,
} from "zod";
import type { ZodTypeAny } from "zod";
import { Type } from "@google/genai";
import type { Schema } from "@google/genai";

// ============================================================================
// OpenAI Schema Types
// ============================================================================

export interface OpenAISchema {
  type: string | string[];
  description?: string;
  properties?: Record<string, OpenAISchema>;
  required?: string[];
  items?: OpenAISchema;
  enum?: Array<string | number | boolean | null>;
  additionalProperties?: boolean | OpenAISchema;
  anyOf?: OpenAISchema[];
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

const OPENAI_JSON_VALUE_TYPES = [
  "string",
  "number",
  "boolean",
  "object",
  "array",
  "null",
] as const;

function createOpenAIJsonValueSchema(description?: string): OpenAISchema {
  const result: OpenAISchema = {
    type: [...OPENAI_JSON_VALUE_TYPES],
  };
  if (description) result.description = description;
  return result;
}

function dedupeSchemas(schemas: OpenAISchema[]): OpenAISchema[] {
  const seen = new Set<string>();
  const deduped: OpenAISchema[] = [];

  for (const schema of schemas) {
    const key = JSON.stringify(schema);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(schema);
  }

  return deduped;
}

const expandOpenAIAnyOf = (schema: OpenAISchema): OpenAISchema[] =>
  Array.isArray(schema.anyOf) && schema.anyOf.length > 0
    ? schema.anyOf
    : [schema];

function mergeOpenAISchemas(
  existing: OpenAISchema,
  incoming: OpenAISchema,
): OpenAISchema {
  const variants = dedupeSchemas([
    ...expandOpenAIAnyOf(existing),
    ...expandOpenAIAnyOf(incoming),
  ]);
  if (variants.length === 1) return variants[0];

  const uniqueTypes = Array.from(
    new Set(
      variants.flatMap((variant) => {
        const variantType = variant.type;
        return Array.isArray(variantType) ? variantType : [variantType];
      }),
    ),
  );

  return {
    type: uniqueTypes.length === 1 ? uniqueTypes[0] : uniqueTypes,
    anyOf: variants,
  };
}

function dedupeGeminiSchemas(schemas: Schema[]): Schema[] {
  const seen = new Set<string>();
  const deduped: Schema[] = [];

  for (const schema of schemas) {
    const key = JSON.stringify(schema);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(schema);
  }

  return deduped;
}

const expandGeminiAnyOf = (schema: Schema): Schema[] =>
  Array.isArray(schema.anyOf) && schema.anyOf.length > 0
    ? (schema.anyOf as Schema[])
    : [schema];

function mergeGeminiSchemas(existing: Schema, incoming: Schema): Schema {
  const variants = dedupeGeminiSchemas([
    ...expandGeminiAnyOf(existing),
    ...expandGeminiAnyOf(incoming),
  ]);
  if (variants.length === 1) return variants[0];
  return {
    anyOf: variants,
  };
}

function buildAnyOfSchema(
  options: ZodTypeAny[],
  compiler: (schema: ZodTypeAny, isOptionalField?: boolean) => OpenAISchema,
  label: string,
): OpenAISchema {
  const variants = dedupeSchemas(options.map((opt) => compiler(opt, false)));

  if (variants.length === 0) {
    return { type: "string" };
  }

  if (variants.length === 1) {
    return variants[0];
  }

  console.warn(
    `${label} schema encountered generic union; converting to anyOf for better fidelity.`,
  );

  return {
    type: "object",
    anyOf: variants,
  };
}

function createGeminiJsonValueSchema(description?: string): Schema {
  const result: Schema = {
    anyOf: [
      { type: Type.STRING },
      { type: Type.NUMBER },
      { type: Type.BOOLEAN },
      { type: Type.OBJECT },
      { type: Type.ARRAY },
      { type: Type.NULL },
    ],
  };
  if (description) result.description = description;
  return result;
}

type LiteralValue = string | number | boolean | null;

const isLiteralValue = (value: unknown): value is LiteralValue =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean" ||
  value === null;

const toOpenAILiteralType = (value: LiteralValue): string => {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "number";
  }
  return "boolean";
};

const toGeminiLiteralType = (value: LiteralValue): Type => {
  if (value === null) return Type.NULL;
  if (typeof value === "string") return Type.STRING;
  if (typeof value === "number") {
    return Number.isInteger(value) ? Type.INTEGER : Type.NUMBER;
  }
  return Type.BOOLEAN;
};

const getLiteralValue = (schema: ZodLiteral<any>): LiteralValue =>
  (schema as ZodLiteral<any>)._def.value as LiteralValue;

const stripOptionalDefaultWrappers = (schema: ZodTypeAny): ZodTypeAny => {
  let current = schema;
  while (
    current instanceof ZodOptional ||
    current instanceof ZodDefault ||
    current._def.typeName === "ZodOptional" ||
    current._def.typeName === "ZodDefault"
  ) {
    current = (current as ZodOptional<any> | ZodDefault<any>)._def.innerType;
  }
  return current;
};

const buildOpenAILiteralSchema = (value: LiteralValue): OpenAISchema => {
  const type = toOpenAILiteralType(value);
  if (value === null) {
    return { type };
  }
  return {
    type,
    enum: [value],
  };
};

const buildOpenAIDiscriminatorSchema = (
  values: LiteralValue[],
  description: string,
): OpenAISchema => {
  if (values.length === 0) {
    return { type: "string", description };
  }

  const uniqueTypes = Array.from(new Set(values.map(toOpenAILiteralType)));
  const type: OpenAISchema["type"] =
    uniqueTypes.length === 1 ? uniqueTypes[0] : uniqueTypes;

  return {
    type,
    enum: values,
    description,
  };
};

const buildGeminiDiscriminatorSchema = (
  values: LiteralValue[],
  description: string,
): Schema => {
  if (values.length === 0) {
    return { type: Type.STRING, description };
  }

  const uniqueTypes = Array.from(new Set(values.map(toGeminiLiteralType)));
  const type: Type = uniqueTypes.length === 1 ? uniqueTypes[0] : Type.STRING;
  const result: Schema = { type, description };
  if (uniqueTypes.length === 1) {
    (result as any).enum = values;
  }
  return result;
};

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
    // Create a clean copy to avoid polluting with extra properties
    const result: Schema = {
      type: innerSchema.type,
      nullable: true,
    };
    if (innerSchema.description) result.description = innerSchema.description;
    if (innerSchema.properties) result.properties = innerSchema.properties;
    if (innerSchema.required) result.required = innerSchema.required;
    if (innerSchema.items) result.items = innerSchema.items;
    if (innerSchema.enum) result.enum = innerSchema.enum;
    return result;
  }

  // Handle default
  if (schema instanceof ZodDefault || typeName === "ZodDefault") {
    return processZodToGemini((schema as ZodDefault<any>)._def.innerType);
  }

  // Handle lazy
  if (schema instanceof ZodLazy || typeName === "ZodLazy") {
    return createGeminiJsonValueSchema(schema.description || "Any JSON value");
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

  // Handle literal
  if (schema instanceof ZodLiteral || typeName === "ZodLiteral") {
    const value = getLiteralValue(schema as ZodLiteral<any>);
    const result: Schema = {
      type: toGeminiLiteralType(value),
    };
    if (value !== null) {
      (result as any).enum = [value];
    }
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
    const discriminatorValues: LiteralValue[] = [];
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
        const literalValue = getLiteralValue(discriminatorField as ZodLiteral<any>);
        if (isLiteralValue(literalValue)) {
          discriminatorValues.push(literalValue);
        }
      }

      // Collect properties
      const currentRequired = new Set<string>();
      for (const [key, value] of Object.entries(shape)) {
        if (key === discriminator) continue; // Handle discriminator separately

        const fieldTypeName = (value as ZodTypeAny)._def.typeName;
        const isRequired =
          fieldTypeName !== "ZodOptional" && fieldTypeName !== "ZodDefault";

        if (isRequired) currentRequired.add(key);

        // Process the schema for this property
        const processedSchema = processZodToGemini(value as ZodTypeAny);

        // Store first occurrence, otherwise merge schema variants.
        if (!allProperties[key]) {
          allProperties[key] = processedSchema;
        } else {
          allProperties[key] = mergeGeminiSchemas(
            allProperties[key],
            processedSchema,
          );
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
    allProperties[discriminator] = buildGeminiDiscriminatorSchema(
      discriminatorValues,
      `Discriminator field. Allowed values: ${discriminatorValues.join(", ")}`,
    );

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

  // Handle record
  if (schema instanceof ZodRecord || typeName === "ZodRecord") {
    const result: Schema = { type: Type.OBJECT };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle any/unknown
  if (
    schema instanceof ZodAny ||
    typeName === "ZodAny" ||
    schema instanceof ZodUnknown ||
    typeName === "ZodUnknown"
  ) {
    return createGeminiJsonValueSchema(schema.description || "Any value");
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

  // Handle lazy
  if (schema instanceof ZodLazy || typeName === "ZodLazy") {
    return createOpenAIJsonValueSchema(schema.description || "Any JSON value");
  }

  // Handle string
  if (schema instanceof ZodString || typeName === "ZodString") {
    const result: OpenAISchema = { type: "string" };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle number
  if (schema instanceof ZodNumber || typeName === "ZodNumber") {
    const checks = (schema as ZodNumber)._def.checks || [];
    const isInt = checks.some((c) => c.kind === "int");
    const baseType = isInt ? "integer" : "number";
    const result: OpenAISchema = { type: baseType };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle boolean
  if (schema instanceof ZodBoolean || typeName === "ZodBoolean") {
    const result: OpenAISchema = { type: "boolean" };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle literal
  if (schema instanceof ZodLiteral || typeName === "ZodLiteral") {
    const value = getLiteralValue(schema as ZodLiteral<any>);
    const result: OpenAISchema = buildOpenAILiteralSchema(value);
    if (schema.description) result.description = schema.description;
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
    const discriminatorValues: LiteralValue[] = [];
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
        const literalValue = getLiteralValue(discriminatorField as ZodLiteral<any>);
        if (isLiteralValue(literalValue)) {
          discriminatorValues.push(literalValue);
        }
      }

      // Collect properties
      const currentRequired = new Set<string>();
      for (const [key, value] of Object.entries(shape)) {
        if (key === discriminator) continue; // Handle discriminator separately

        const fieldTypeName = (value as ZodTypeAny)._def.typeName;
        const isRequired =
          fieldTypeName !== "ZodOptional" && fieldTypeName !== "ZodDefault";

        if (isRequired) currentRequired.add(key);

        const compiledFieldSchema = processZodToOpenAI(
          stripOptionalDefaultWrappers(value as ZodTypeAny),
          strict,
          false,
        );

        if (!allProperties[key]) {
          allProperties[key] = compiledFieldSchema;
        } else {
          allProperties[key] = mergeOpenAISchemas(
            allProperties[key],
            compiledFieldSchema,
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
    allProperties[discriminator] = buildOpenAIDiscriminatorSchema(
      discriminatorValues,
      `Discriminator field. Allowed values: ${discriminatorValues.join(", ")}`,
    );

    // Keep required fields aligned with discriminated union semantics.
    const result: OpenAISchema = {
      type: "object",
      properties: allProperties,
      required: [discriminator, ...Array.from(requiredInAllVariants)],
      additionalProperties: false,
    };

    if (schema.description) result.description = schema.description;

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
    return result;
  }

  // Handle object
  if (schema instanceof ZodObject || typeName === "ZodObject") {
    const shape = (schema as ZodObject<any>).shape;
    const properties: Record<string, OpenAISchema> = {};
    const originalRequired: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
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

      properties[key] = processZodToOpenAI(value as ZodTypeAny, strict, false);
    }

    const result: OpenAISchema = {
      type: "object",
      properties,
      required: originalRequired,
      additionalProperties: false,
    };

    if (schema.description) result.description = schema.description;

    return result;
  }

  // Handle record
  if (schema instanceof ZodRecord || typeName === "ZodRecord") {
    const valueSchema = (schema as ZodRecord<any>)._def.valueType;
    const result: OpenAISchema = {
      type: "object",
      additionalProperties: processZodToOpenAI(valueSchema, strict, false),
    };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle any/unknown
  if (
    schema instanceof ZodAny ||
    typeName === "ZodAny" ||
    schema instanceof ZodUnknown ||
    typeName === "ZodUnknown"
  ) {
    return createOpenAIJsonValueSchema(schema.description || "Any value");
  }

  // Fallback
  console.warn(`Unknown Zod type for OpenAI: ${typeName}`);
  return { type: "string" };
}

// ============================================================================
// Zod to OpenRouter Compiler (使用 OpenAI 格式)
// ============================================================================

// ============================================================================
// Zod to Gemini Compatible Compiler (for OpenAI Channel)
// ============================================================================

/**
 * 将 Zod Schema 编译为 Gemini 兼容的 JSON Schema (用于 OpenAI 渠道)
 * - 使用标准 JSON Schema 小写类型 (type: "string")
 * - 移除不支持的字段 (additionalProperties)
 * - 使用 nullable: true 代替 union type null
 */
export function zodToGeminiCompatibleSchema(schema: ZodTypeAny): OpenAISchema {
  return processZodToGeminiCompatible(schema);
}

function processZodToGeminiCompatible(
  schema: ZodTypeAny,
  isOptionalField: boolean = false,
): OpenAISchema {
  const typeName = schema._def.typeName;

  // Handle effects
  if (schema instanceof ZodEffects || typeName === "ZodEffects") {
    return processZodToGeminiCompatible(
      (schema as ZodEffects<any>)._def.schema,
      isOptionalField,
    );
  }

  // Handle optional
  if (schema instanceof ZodOptional || typeName === "ZodOptional") {
    return processZodToGeminiCompatible(
      (schema as ZodOptional<any>)._def.innerType,
      true,
    );
  }

  // Handle nullable
  if (schema instanceof ZodNullable || typeName === "ZodNullable") {
    const innerSchema = processZodToGeminiCompatible(
      (schema as ZodNullable<any>)._def.innerType,
      isOptionalField,
    );
    // Use nullable: true property
    // Make sure we don't duplicate or overwrite if it's already there
    // We create a new object to ensure we don't mutate shared references if any
    const result = { ...innerSchema, nullable: true };
    return result;
  }

  // Handle default
  if (schema instanceof ZodDefault || typeName === "ZodDefault") {
    return processZodToGeminiCompatible(
      (schema as ZodDefault<any>)._def.innerType,
      true,
    );
  }

  // Handle lazy
  if (schema instanceof ZodLazy || typeName === "ZodLazy") {
    return createOpenAIJsonValueSchema(schema.description || "Any JSON value");
  }

  // Handle string
  if (schema instanceof ZodString || typeName === "ZodString") {
    const result: OpenAISchema = { type: "string" };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle number
  if (schema instanceof ZodNumber || typeName === "ZodNumber") {
    const checks = (schema as ZodNumber)._def.checks || [];
    const isInt = checks.some((c: any) => c.kind === "int");
    const result: OpenAISchema = { type: isInt ? "integer" : "number" };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle boolean
  if (schema instanceof ZodBoolean || typeName === "ZodBoolean") {
    const result: OpenAISchema = { type: "boolean" };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle literal
  if (schema instanceof ZodLiteral || typeName === "ZodLiteral") {
    const value = getLiteralValue(schema as ZodLiteral<any>);
    const result: OpenAISchema = buildOpenAILiteralSchema(value);
    if (schema.description) result.description = schema.description;
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
    return result;
  }

  // Handle union - Gemini doesn't support generic unions well
  if (schema instanceof ZodUnion || typeName === "ZodUnion") {
    const options = (schema as ZodUnion<any>)._def.options;

    // Try to merge if all options are objects
    const allObjects = options.every(
      (opt: any) =>
        opt instanceof ZodObject || opt._def.typeName === "ZodObject",
    );

    if (allObjects && options.length > 0) {
      const mergedProperties: Record<string, OpenAISchema> = {};
      const requiredByAll = new Set<string>();
      let first = true;

      for (const opt of options) {
        const shape = (opt as ZodObject<any>).shape;
        const currentRequired = new Set<string>();

        for (const [key, value] of Object.entries(shape)) {
          const fieldTypeName = (value as ZodTypeAny)._def.typeName;
          if (
            fieldTypeName !== "ZodOptional" &&
            fieldTypeName !== "ZodDefault"
          ) {
            currentRequired.add(key);
          }

          if (!mergedProperties[key]) {
            mergedProperties[key] = processZodToGeminiCompatible(
              value as ZodTypeAny,
            );
          }
        }

        if (first) {
          currentRequired.forEach((k) => requiredByAll.add(k));
          first = false;
        } else {
          for (const k of requiredByAll) {
            if (!currentRequired.has(k)) requiredByAll.delete(k);
          }
        }
      }

      const result: OpenAISchema = {
        type: "object",
        properties: mergedProperties,
      };
      if (requiredByAll.size > 0) result.required = Array.from(requiredByAll);
      if (schema.description) result.description = schema.description;
      return result;
    }

    if (options.length > 0) {
      return buildAnyOfSchema(
        options,
        processZodToGeminiCompatible,
        "Gemini Compatible",
      );
    }
    return { type: "string" };
  }

  // Handle intersection
  if (schema instanceof ZodIntersection || typeName === "ZodIntersection") {
    const left = processZodToGeminiCompatible(
      (schema as ZodIntersection<any, any>)._def.left,
    );
    const right = processZodToGeminiCompatible(
      (schema as ZodIntersection<any, any>)._def.right,
    );

    if (left.type === "object" && right.type === "object") {
      const result: OpenAISchema = {
        type: "object",
        properties: { ...left.properties, ...right.properties },
        required: Array.from(
          new Set([...(left.required || []), ...(right.required || [])]),
        ),
      };
      if (schema.description) result.description = schema.description;
      return result;
    }
    return left; // Fallback to left side if not objects
  }

  // Handle null
  if (schema instanceof ZodNull || typeName === "ZodNull") {
    return { type: "string", nullable: true, description: "null" };
  }

  // Handle any/unknown
  if (
    schema instanceof ZodAny ||
    typeName === "ZodAny" ||
    schema instanceof ZodUnknown ||
    typeName === "ZodUnknown"
  ) {
    return createOpenAIJsonValueSchema(schema.description || "Any value");
  }

  // Handle discriminated union - Merge strategies similar to Native Gemini
  if (
    schema instanceof ZodDiscriminatedUnion ||
    typeName === "ZodDiscriminatedUnion"
  ) {
    const discriminator = (schema as ZodDiscriminatedUnion<any, any>)._def
      .discriminator;
    const options = (schema as ZodDiscriminatedUnion<any, any>)._def
      .options as ZodObject<any>[];

    const allProperties: Record<string, OpenAISchema> = {};
    const discriminatorValues: LiteralValue[] = [];
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
        const literalValue = getLiteralValue(discriminatorField as ZodLiteral<any>);
        if (isLiteralValue(literalValue)) {
          discriminatorValues.push(literalValue);
        }
      }

      // Collect properties
      const currentRequired = new Set<string>();
      for (const [key, value] of Object.entries(shape)) {
        if (key === discriminator) continue;

        const fieldTypeName = (value as ZodTypeAny)._def.typeName;
        const isRequired =
          fieldTypeName !== "ZodOptional" && fieldTypeName !== "ZodDefault";
        if (isRequired) currentRequired.add(key);

        const compiledFieldSchema = processZodToGeminiCompatible(
          value as ZodTypeAny,
        );
        if (!allProperties[key]) {
          allProperties[key] = compiledFieldSchema;
        } else {
          allProperties[key] = mergeOpenAISchemas(
            allProperties[key],
            compiledFieldSchema,
          );
        }
      }

      if (firstVariant) {
        currentRequired.forEach((k) => requiredByAll.add(k));
        firstVariant = false;
      } else {
        // Intersect required fields
        for (const k of requiredByAll) {
          if (!currentRequired.has(k)) {
            requiredByAll.delete(k);
          }
        }
      }
    }

    // Add discriminator
    allProperties[discriminator] = buildOpenAIDiscriminatorSchema(
      discriminatorValues,
      `Discriminator: ${discriminatorValues.join(", ")}`,
    );

    const required = [discriminator, ...Array.from(requiredByAll)];

    const result: OpenAISchema = {
      type: "object",
      properties: allProperties,
      required,
      // NO additionalProperties: false
    };

    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle array
  if (schema instanceof ZodArray || typeName === "ZodArray") {
    const itemSchema = processZodToGeminiCompatible(
      (schema as ZodArray<any>)._def.type,
    );
    const result: OpenAISchema = {
      type: "array",
      items: itemSchema,
    };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle object
  if (schema instanceof ZodObject || typeName === "ZodObject") {
    const shape = (schema as ZodObject<any>).shape;
    const properties: Record<string, OpenAISchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = processZodToGeminiCompatible(value as ZodTypeAny);

      const fieldTypeName = (value as ZodTypeAny)._def.typeName;
      const isFieldOptional =
        fieldTypeName === "ZodOptional" || fieldTypeName === "ZodDefault";

      // Check for nullable wrapped optional
      let isNullable = fieldTypeName === "ZodNullable";
      if (isNullable) {
        const innerType = (value as ZodNullable<any>)._def.innerType;
        const innerTypeName = innerType._def.typeName;
        if (innerTypeName === "ZodOptional" || innerTypeName === "ZodDefault") {
          // It's optional if it's explicitly optional/default, even if nullable
        } else {
          // If it's just nullable (e.g. string | null), it is technically REQUIRED to be present (as null)
          // UNLESS we want to relax it. Gemini usually prefers relaxed.
          // Let's stick to: if it's not Optional/Default, it's required.
          required.push(key);
        }
      } else if (!isFieldOptional) {
        required.push(key);
      }
    }

    const result: OpenAISchema = {
      type: "object",
      properties,
      // NO additionalProperties: false
    };

    if (required.length > 0) {
      result.required = required;
    }

    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle record
  if (schema instanceof ZodRecord || typeName === "ZodRecord") {
    const valueSchema = (schema as ZodRecord<any>)._def.valueType;
    const result: OpenAISchema = {
      type: "object",
      additionalProperties: processZodToGeminiCompatible(valueSchema, false),
    };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Fallback
  console.warn(`Unknown Zod type for Gemini Compatible: ${typeName}`);
  return { type: "string" };
}

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
    strict: boolean;
    parameters: OpenAISchema;
  };
}

export interface OpenRouterToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    strict: boolean;
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
 * 从 Zod Schema 创建 OpenAI 工具定义 (Flattened, Strict)
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
      strict: true,
      parameters: zodToOpenAISchema(parameters, true),
    },
  };
}

/**
 * 从 Zod Schema 创建 OpenRouter 工具定义 (Nested, Standard)
 */
export function createOpenRouterTool(
  name: string,
  description: string,
  parameters: ZodTypeAny,
): OpenRouterToolDefinition {
  return {
    type: "function",
    function: {
      name,
      description,
      strict: true,
      parameters: zodToOpenAISchema(parameters, true),
    },
  };
}

// ============================================================================
// Zod to Claude Compatible Compiler (for OpenAI Channel)
// ============================================================================

/**
 * 独立的 Claude 兼容 Schema 处理器
 * 与 Gemini 处理器逻辑相似但完全独立维护，便于未来差异化
 */
function processZodToClaudeCompatible(
  schema: ZodTypeAny,
  isOptionalField: boolean = false,
): OpenAISchema {
  const typeName = schema._def.typeName;

  // Handle effects
  if (schema instanceof ZodEffects || typeName === "ZodEffects") {
    return processZodToClaudeCompatible(
      (schema as ZodEffects<any>)._def.schema,
      isOptionalField,
    );
  }

  // Handle optional
  if (schema instanceof ZodOptional || typeName === "ZodOptional") {
    return processZodToClaudeCompatible(
      (schema as ZodOptional<any>)._def.innerType,
      true,
    );
  }

  // Handle nullable
  if (schema instanceof ZodNullable || typeName === "ZodNullable") {
    const innerSchema = processZodToClaudeCompatible(
      (schema as ZodNullable<any>)._def.innerType,
      isOptionalField,
    );
    // Use nullable: true property
    const result = { ...innerSchema, nullable: true };
    return result;
  }

  // Handle default
  if (schema instanceof ZodDefault || typeName === "ZodDefault") {
    return processZodToClaudeCompatible(
      (schema as ZodDefault<any>)._def.innerType,
      true,
    );
  }

  // Handle lazy
  if (schema instanceof ZodLazy || typeName === "ZodLazy") {
    return createOpenAIJsonValueSchema(schema.description || "Any JSON value");
  }

  // Handle string
  if (schema instanceof ZodString || typeName === "ZodString") {
    const result: OpenAISchema = { type: "string" };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle number
  if (schema instanceof ZodNumber || typeName === "ZodNumber") {
    const checks = (schema as ZodNumber)._def.checks || [];
    const isInt = checks.some((c: any) => c.kind === "int");
    const result: OpenAISchema = { type: isInt ? "integer" : "number" };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle boolean
  if (schema instanceof ZodBoolean || typeName === "ZodBoolean") {
    const result: OpenAISchema = { type: "boolean" };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle literal
  if (schema instanceof ZodLiteral || typeName === "ZodLiteral") {
    const value = getLiteralValue(schema as ZodLiteral<any>);
    const result: OpenAISchema = buildOpenAILiteralSchema(value);
    if (schema.description) result.description = schema.description;
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
    return result;
  }

  // Handle union - Claude doesn't support generic unions well
  if (schema instanceof ZodUnion || typeName === "ZodUnion") {
    const options = (schema as ZodUnion<any>)._def.options;

    // Try to merge if all options are objects
    const allObjects = options.every(
      (opt: any) =>
        opt instanceof ZodObject || opt._def.typeName === "ZodObject",
    );

    if (allObjects && options.length > 0) {
      const mergedProperties: Record<string, OpenAISchema> = {};
      const requiredByAll = new Set<string>();
      let first = true;

      for (const opt of options) {
        const shape = (opt as ZodObject<any>).shape;
        const currentRequired = new Set<string>();

        for (const [key, value] of Object.entries(shape)) {
          const fieldTypeName = (value as ZodTypeAny)._def.typeName;
          if (
            fieldTypeName !== "ZodOptional" &&
            fieldTypeName !== "ZodDefault"
          ) {
            currentRequired.add(key);
          }

          if (!mergedProperties[key]) {
            mergedProperties[key] = processZodToClaudeCompatible(
              value as ZodTypeAny,
            );
          }
        }

        if (first) {
          currentRequired.forEach((k) => requiredByAll.add(k));
          first = false;
        } else {
          for (const k of requiredByAll) {
            if (!currentRequired.has(k)) requiredByAll.delete(k);
          }
        }
      }

      const result: OpenAISchema = {
        type: "object",
        properties: mergedProperties,
      };
      if (requiredByAll.size > 0) result.required = Array.from(requiredByAll);
      if (schema.description) result.description = schema.description;
      return result;
    }

    if (options.length > 0) {
      return buildAnyOfSchema(
        options,
        processZodToClaudeCompatible,
        "Claude Compatible",
      );
    }
    return { type: "string" };
  }

  // Handle intersection
  if (schema instanceof ZodIntersection || typeName === "ZodIntersection") {
    const left = processZodToClaudeCompatible(
      (schema as ZodIntersection<any, any>)._def.left,
    );
    const right = processZodToClaudeCompatible(
      (schema as ZodIntersection<any, any>)._def.right,
    );

    if (left.type === "object" && right.type === "object") {
      const result: OpenAISchema = {
        type: "object",
        properties: { ...left.properties, ...right.properties },
        required: Array.from(
          new Set([...(left.required || []), ...(right.required || [])]),
        ),
      };
      if (schema.description) result.description = schema.description;
      return result;
    }
    return left;
  }

  // Handle null
  if (schema instanceof ZodNull || typeName === "ZodNull") {
    return { type: "string", nullable: true, description: "null" };
  }

  // Handle any/unknown
  if (
    schema instanceof ZodAny ||
    typeName === "ZodAny" ||
    schema instanceof ZodUnknown ||
    typeName === "ZodUnknown"
  ) {
    return createOpenAIJsonValueSchema(schema.description || "Any value");
  }

  // Handle discriminated union - Merge strategies
  if (
    schema instanceof ZodDiscriminatedUnion ||
    typeName === "ZodDiscriminatedUnion"
  ) {
    const discriminator = (schema as ZodDiscriminatedUnion<any, any>)._def
      .discriminator;
    const options = (schema as ZodDiscriminatedUnion<any, any>)._def
      .options as ZodObject<any>[];

    const allProperties: Record<string, OpenAISchema> = {};
    const discriminatorValues: LiteralValue[] = [];
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
        const literalValue = getLiteralValue(discriminatorField as ZodLiteral<any>);
        if (isLiteralValue(literalValue)) {
          discriminatorValues.push(literalValue);
        }
      }

      // Collect properties
      const currentRequired = new Set<string>();
      for (const [key, value] of Object.entries(shape)) {
        if (key === discriminator) continue;

        const fieldTypeName = (value as ZodTypeAny)._def.typeName;
        const isRequired =
          fieldTypeName !== "ZodOptional" && fieldTypeName !== "ZodDefault";
        if (isRequired) currentRequired.add(key);

        const compiledFieldSchema = processZodToClaudeCompatible(
          value as ZodTypeAny,
        );
        if (!allProperties[key]) {
          allProperties[key] = compiledFieldSchema;
        } else {
          allProperties[key] = mergeOpenAISchemas(
            allProperties[key],
            compiledFieldSchema,
          );
        }
      }

      if (firstVariant) {
        currentRequired.forEach((k) => requiredByAll.add(k));
        firstVariant = false;
      } else {
        // Intersect required fields
        for (const k of requiredByAll) {
          if (!currentRequired.has(k)) {
            requiredByAll.delete(k);
          }
        }
      }
    }

    // Add discriminator
    allProperties[discriminator] = buildOpenAIDiscriminatorSchema(
      discriminatorValues,
      `Discriminator: ${discriminatorValues.join(", ")}`,
    );

    const required = [discriminator, ...Array.from(requiredByAll)];

    const result: OpenAISchema = {
      type: "object",
      properties: allProperties,
      required,
      // NO additionalProperties: false
    };

    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle array
  if (schema instanceof ZodArray || typeName === "ZodArray") {
    const itemSchema = processZodToClaudeCompatible(
      (schema as ZodArray<any>)._def.type,
    );
    const result: OpenAISchema = {
      type: "array",
      items: itemSchema,
    };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle object
  if (schema instanceof ZodObject || typeName === "ZodObject") {
    const shape = (schema as ZodObject<any>).shape;
    const properties: Record<string, OpenAISchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = processZodToClaudeCompatible(value as ZodTypeAny);

      const fieldTypeName = (value as ZodTypeAny)._def.typeName;
      const isFieldOptional =
        fieldTypeName === "ZodOptional" || fieldTypeName === "ZodDefault";

      // Check for nullable wrapped optional
      let isNullable = fieldTypeName === "ZodNullable";
      if (isNullable) {
        const innerType = (value as ZodNullable<any>)._def.innerType;
        const innerTypeName = innerType._def.typeName;
        if (innerTypeName === "ZodOptional" || innerTypeName === "ZodDefault") {
          // It's optional if it's explicitly optional/default
        } else {
          required.push(key);
        }
      } else if (!isFieldOptional) {
        required.push(key);
      }
    }

    const result: OpenAISchema = {
      type: "object",
      properties,
      // NO additionalProperties: false
    };

    if (required.length > 0) {
      result.required = required;
    }

    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle record
  if (schema instanceof ZodRecord || typeName === "ZodRecord") {
    const valueSchema = (schema as ZodRecord<any>)._def.valueType;
    const result: OpenAISchema = {
      type: "object",
      additionalProperties: processZodToClaudeCompatible(valueSchema, false),
    };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Fallback
  console.warn(`Unknown Zod type for Claude Compatible: ${typeName}`);
  return { type: "string" };
}

/**
 * 将 Zod Schema 编译为 Claude 兼容的 JSON Schema (用于 OpenAI Connection)
 * 使用独立的 Claude 处理器，与 Gemini 处理器完全分离
 */
export function zodToClaudeCompatibleSchema(schema: ZodTypeAny): OpenAISchema {
  return processZodToClaudeCompatible(schema);
}

/**
 * 从 Zod Schema 创建 Claude 兼容工具定义 (用于 OpenAI Connection)
 */
export function createClaudeCompatibleTool(
  name: string,
  description: string,
  parameters: ZodTypeAny,
): OpenAIToolDefinition {
  return {
    type: "function",
    function: {
      name,
      description,
      strict: false, // Claude via proxy doesn't use OpenAI Strict Mode
      parameters: zodToClaudeCompatibleSchema(parameters),
    },
  };
}

/**
 * 从 Zod Schema 创建 Gemini 兼容工具定义 (用于 OpenAI Connection)
 */
export function createGeminiCompatibleTool(
  name: string,
  description: string,
  parameters: ZodTypeAny,
): OpenAIToolDefinition {
  return {
    type: "function",
    function: {
      name,
      description,
      strict: false, // Gemini almost never claims strict support in this channel
      parameters: zodToGeminiCompatibleSchema(parameters),
    },
  };
}

// ============================================================================
// Model Detection Helpers
// ============================================================================

/**
 * 检测模型 ID 是否为 Gemini 模型
 */
export function isGeminiModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return (
    lower.includes("gemini") ||
    lower.includes("google/") ||
    lower.includes("vertex/") ||
    lower.startsWith("google-") ||
    lower.includes("palm-") ||
    // Catch common patterns in proxies like OpenRouter
    (lower.includes("flash") &&
      (lower.includes("1.5") || lower.includes("2.0"))) ||
    (lower.includes("pro") && (lower.includes("1.5") || lower.includes("1.0")))
  );
}

/**
 * 检测模型 ID 是否为 Claude 模型
 */
export function isClaudeModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return (
    lower.includes("claude") ||
    lower.includes("anthropic/") ||
    lower.startsWith("anthropic-") ||
    lower.includes("sonnet") ||
    lower.includes("opus") ||
    lower.includes("haiku")
  );
}

// ============================================================================
// Batch Compilation Helpers
// ============================================================================

/**
 * Tool definition input type for compiler functions.
 * Accepts both TypedToolDefinition and ZodToolDefinition.
 */
type ToolDefinitionInput = {
  name: string;
  description: string;
  parameters: ZodTypeAny;
};

/**
 * 批量编译工具定义到 OpenAI 格式
 */
export function compileToolsForOpenAI(
  tools: ToolDefinitionInput[],
): OpenAIToolDefinition[] {
  return tools.map((t) =>
    createOpenAITool(t.name, t.description, t.parameters),
  );
}
