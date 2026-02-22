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
  ZodTuple,
  ZodNativeEnum,
} from "zod";
import type { ZodTypeAny } from "zod";
import { Type } from "@google/genai";
import type { Schema } from "@google/genai";

// Guard against infinite recursion when expanding z.lazy() schemas
const _lazyExpansionStack = new WeakSet<ZodTypeAny>();

// Schema compilation caches: keyed by Zod schema identity (WeakMap).
// Tool schemas don't change during a session, so this avoids redundant
// recompilation on every API call (100+ compilations → <20 per session).
const _geminiSchemaCache = new WeakMap<ZodTypeAny, Schema>();
const _openAIStrictSchemaCache = new WeakMap<ZodTypeAny, OpenAISchema>();
const _geminiCompatSchemaCache = new WeakMap<ZodTypeAny, OpenAISchema>();
const _claudeCompatSchemaCache = new WeakMap<ZodTypeAny, OpenAISchema>();
const _geminiToolCompatSchemaCache = new WeakMap<ZodTypeAny, OpenAISchema>();

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
  // Index signature to satisfy JsonObject constraint
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

  const firstType = variants[0]?.type;
  const result: Schema = {
    anyOf: variants,
  };
  if (firstType) result.type = firstType;
  return result;
}

const _anyOfWarned = new Set<string>();

function buildAnyOfSchema(
  options: ZodTypeAny[],
  compiler: (schema: ZodTypeAny) => OpenAISchema,
  label: string,
): OpenAISchema {
  const variants = dedupeSchemas(options.map((opt) => compiler(opt)));

  if (variants.length === 0) {
    return { type: "string" };
  }

  if (variants.length === 1) {
    return variants[0];
  }

  if (!_anyOfWarned.has(label)) {
    _anyOfWarned.add(label);
    console.warn(
      `${label} schema encountered generic union; converting to anyOf for better fidelity.`,
    );
  }

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
type GeminiSchemaWithLiteralEnum = Omit<Schema, "enum"> & {
  enum?: LiteralValue[];
};

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

const getLiteralValue = (schema: ZodLiteral<LiteralValue>): LiteralValue =>
  (schema as ZodLiteral<LiteralValue>)._def.value as LiteralValue;

const stripOptionalDefaultWrappers = (schema: ZodTypeAny): ZodTypeAny => {
  let current = schema;
  while (
    current instanceof ZodOptional ||
    current instanceof ZodDefault ||
    current._def.typeName === "ZodOptional" ||
    current._def.typeName === "ZodDefault"
  ) {
    current = (current as ZodOptional<ZodTypeAny> | ZodDefault<ZodTypeAny>)._def
      .innerType;
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
    (result as GeminiSchemaWithLiteralEnum).enum = values;
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
  const cached = _geminiSchemaCache.get(schema);
  if (cached) return cached;
  const result = processZodToGemini(schema);
  _geminiSchemaCache.set(schema, result);
  return result;
}

function processZodToGemini(schema: ZodTypeAny): Schema {
  const typeName = schema._def.typeName;

  // Handle effects (refinements, transforms, etc.)
  if (schema instanceof ZodEffects || typeName === "ZodEffects") {
    const result = processZodToGemini(
      (schema as ZodEffects<ZodTypeAny>)._def.schema,
    );
    if (schema.description && !result.description)
      result.description = schema.description;
    return result;
  }

  // Handle optional - Gemini doesn't have optional, we handle via required array
  if (schema instanceof ZodOptional || typeName === "ZodOptional") {
    const result = processZodToGemini(
      (schema as ZodOptional<ZodTypeAny>)._def.innerType,
    );
    if (schema.description && !result.description)
      result.description = schema.description;
    return result;
  }

  // Handle nullable
  if (schema instanceof ZodNullable || typeName === "ZodNullable") {
    const innerSchema = processZodToGemini(
      (schema as ZodNullable<ZodTypeAny>)._def.innerType,
    );
    const result: Schema = {
      ...innerSchema,
      nullable: true,
    };
    if (schema.description && !result.description)
      result.description = schema.description;
    return result;
  }

  // Handle default
  if (schema instanceof ZodDefault || typeName === "ZodDefault") {
    const result = processZodToGemini(
      (schema as ZodDefault<ZodTypeAny>)._def.innerType,
    );
    const defaultVal = (schema as ZodDefault<ZodTypeAny>)._def.defaultValue();
    if (defaultVal !== undefined) {
      (result as Record<string, unknown>).default = defaultVal;
    }
    if (schema.description && !result.description)
      result.description = schema.description;
    return result;
  }

  // Handle lazy
  if (schema instanceof ZodLazy || typeName === "ZodLazy") {
    if (!_lazyExpansionStack.has(schema)) {
      try {
        _lazyExpansionStack.add(schema);
        const innerSchema = (schema as ZodLazy<ZodTypeAny>)._def.getter();
        if (!(innerSchema instanceof ZodLazy)) {
          const result = processZodToGemini(innerSchema);
          _lazyExpansionStack.delete(schema);
          return result;
        }
        _lazyExpansionStack.delete(schema);
      } catch {
        _lazyExpansionStack.delete(schema);
      }
    }
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
    const value = getLiteralValue(schema as ZodLiteral<LiteralValue>);
    const result: Schema = {
      type: toGeminiLiteralType(value),
    };
    if (value !== null) {
      (result as GeminiSchemaWithLiteralEnum).enum = [value];
    }
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle enum
  if (schema instanceof ZodEnum || typeName === "ZodEnum") {
    const values = (schema as ZodEnum<[string, ...string[]]>)._def
      .values as string[];
    const result: Schema = {
      type: Type.STRING,
      enum: values,
    };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle union - Gemini doesn't support anyOf, merge if possible
  if (schema instanceof ZodUnion || typeName === "ZodUnion") {
    const options = (schema as ZodUnion<[ZodTypeAny, ...ZodTypeAny[]]>)._def
      .options;

    // Try to merge if all options are objects
    const allObjects = options.every(
      (opt) => opt instanceof ZodObject || opt._def.typeName === "ZodObject",
    );

    if (allObjects && options.length > 0) {
      const mergedProperties: Record<string, Schema> = {};
      const requiredByAll = new Set<string>();
      let first = true;

      for (const opt of options) {
        const shape = (opt as ZodObject<Record<string, ZodTypeAny>>).shape;
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
            mergedProperties[key] = processZodToGemini(value as ZodTypeAny);
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

      const result: Schema = {
        type: Type.OBJECT,
        properties: mergedProperties,
      };
      if (requiredByAll.size > 0) result.required = Array.from(requiredByAll);
      if (schema.description) result.description = schema.description;
      return result;
    }

    // Mixed types: create a string with description listing possible types
    if (options.length > 0) {
      const typeDescriptions = options.map((opt) => {
        const tn = opt._def.typeName as string;
        if (opt instanceof ZodLiteral)
          return `literal(${JSON.stringify(getLiteralValue(opt as ZodLiteral<LiteralValue>))})`;
        if (opt instanceof ZodString || tn === "ZodString") return "string";
        if (opt instanceof ZodNumber || tn === "ZodNumber") return "number";
        if (opt instanceof ZodBoolean || tn === "ZodBoolean") return "boolean";
        if (opt instanceof ZodNull || tn === "ZodNull") return "null";
        return tn.replace("Zod", "").toLowerCase();
      });
      return {
        type: Type.STRING,
        description:
          (schema.description || "Union type") +
          ` (possible types: ${typeDescriptions.join(", ")})`,
      };
    }
    return { type: Type.STRING };
  }

  // Handle discriminated union - convert to merged object with all possible properties
  if (
    schema instanceof ZodDiscriminatedUnion ||
    typeName === "ZodDiscriminatedUnion"
  ) {
    const discriminator = (
      schema as ZodDiscriminatedUnion<
        string,
        ZodObject<Record<string, ZodTypeAny>>[]
      >
    )._def.discriminator;
    const options = (
      schema as ZodDiscriminatedUnion<
        string,
        ZodObject<Record<string, ZodTypeAny>>[]
      >
    )._def.options as ZodObject<Record<string, ZodTypeAny>>[];

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
        const literalValue = getLiteralValue(
          discriminatorField as ZodLiteral<LiteralValue>,
        );
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
    const itemSchema = processZodToGemini(
      (schema as ZodArray<ZodTypeAny>)._def.type,
    );
    const result: Schema = {
      type: Type.ARRAY,
      items: itemSchema,
    };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle object
  if (schema instanceof ZodObject || typeName === "ZodObject") {
    const shape = (schema as ZodObject<Record<string, ZodTypeAny>>).shape;
    const properties: Record<string, Schema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = processZodToGemini(value as ZodTypeAny);

      // Check if field is required
      const fieldTypeName = (value as ZodTypeAny)._def.typeName;
      if (fieldTypeName !== "ZodOptional" && fieldTypeName !== "ZodDefault") {
        if (fieldTypeName === "ZodNullable") {
          const innerTypeName = (
            (value as ZodNullable<ZodTypeAny>)._def.innerType as ZodTypeAny
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
    const valueSchema = (schema as ZodRecord<ZodString, ZodTypeAny>)._def
      .valueType;
    const compiledValue = processZodToGemini(valueSchema);
    const typeHint = compiledValue.type || "STRING";
    const result: Schema = {
      type: Type.OBJECT,
      description:
        (schema.description || "") + ` (key-value map, values: ${typeHint})`,
    };
    return result;
  }

  // Handle intersection
  if (schema instanceof ZodIntersection || typeName === "ZodIntersection") {
    const left = processZodToGemini(
      (schema as ZodIntersection<ZodTypeAny, ZodTypeAny>)._def.left,
    );
    const right = processZodToGemini(
      (schema as ZodIntersection<ZodTypeAny, ZodTypeAny>)._def.right,
    );

    if (left.type === Type.OBJECT && right.type === Type.OBJECT) {
      const result: Schema = {
        type: Type.OBJECT,
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
    return { type: Type.STRING, nullable: true, description: "null value" };
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

  // Handle tuple
  if (schema instanceof ZodTuple || typeName === "ZodTuple") {
    return { type: Type.ARRAY, items: { type: Type.STRING } };
  }

  // Handle native enum
  if (schema instanceof ZodNativeEnum || typeName === "ZodNativeEnum") {
    const values = Object.values(
      (schema as ZodNativeEnum<any>)._def.values,
    ).filter((v) => typeof v === "string");
    if (values.length > 0)
      return { type: Type.STRING, enum: values as string[] };
    return { type: Type.STRING };
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
  if (strict) {
    const cached = _openAIStrictSchemaCache.get(schema);
    if (cached) return cached;
    const result = processZodToOpenAI(schema, true);
    _openAIStrictSchemaCache.set(schema, result);
    return result;
  }
  return processZodToOpenAI(schema, false);
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

function processZodToOpenAI(schema: ZodTypeAny, strict: boolean): OpenAISchema {
  const typeName = schema._def.typeName;

  // Handle effects
  if (schema instanceof ZodEffects || typeName === "ZodEffects") {
    const result = processZodToOpenAI(
      (schema as ZodEffects<ZodTypeAny>)._def.schema,
      strict,
    );
    if (schema.description && !result.description)
      result.description = schema.description;
    return result;
  }

  // Handle optional
  if (schema instanceof ZodOptional || typeName === "ZodOptional") {
    const result = processZodToOpenAI(
      (schema as ZodOptional<ZodTypeAny>)._def.innerType,
      strict,
    );
    if (schema.description && !result.description)
      result.description = schema.description;
    return result;
  }

  // Handle nullable
  if (schema instanceof ZodNullable || typeName === "ZodNullable") {
    const innerSchema = processZodToOpenAI(
      (schema as ZodNullable<ZodTypeAny>)._def.innerType,
      strict,
    );
    // Add null to type array
    if (Array.isArray(innerSchema.type)) {
      if (!innerSchema.type.includes("null")) {
        innerSchema.type.push("null");
      }
    } else {
      innerSchema.type = [innerSchema.type, "null"];
    }
    if (schema.description && !innerSchema.description)
      innerSchema.description = schema.description;
    return innerSchema;
  }

  // Handle default
  if (schema instanceof ZodDefault || typeName === "ZodDefault") {
    const result = processZodToOpenAI(
      (schema as ZodDefault<ZodTypeAny>)._def.innerType,
      strict,
    );
    const defaultVal = (schema as ZodDefault<ZodTypeAny>)._def.defaultValue();
    if (defaultVal !== undefined) {
      result.default = defaultVal;
    }
    if (schema.description && !result.description)
      result.description = schema.description;
    return result;
  }

  // Handle lazy
  if (schema instanceof ZodLazy || typeName === "ZodLazy") {
    if (!_lazyExpansionStack.has(schema)) {
      try {
        _lazyExpansionStack.add(schema);
        const innerSchema = (schema as ZodLazy<ZodTypeAny>)._def.getter();
        if (!(innerSchema instanceof ZodLazy)) {
          const result = processZodToOpenAI(innerSchema, strict);
          _lazyExpansionStack.delete(schema);
          return result;
        }
        _lazyExpansionStack.delete(schema);
      } catch {
        _lazyExpansionStack.delete(schema);
      }
    }
    return createOpenAIJsonValueSchema(schema.description || "Any JSON value");
  }

  // Handle string
  if (schema instanceof ZodString || typeName === "ZodString") {
    const result: OpenAISchema = { type: "string" };
    if (schema.description) result.description = schema.description;
    const checks = (schema as ZodString)._def.checks || [];
    for (const check of checks) {
      if (check.kind === "min")
        (result as Record<string, unknown>).minLength = check.value;
      else if (check.kind === "max")
        (result as Record<string, unknown>).maxLength = check.value;
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
    for (const check of checks) {
      if (check.kind === "min") {
        (result as Record<string, unknown>).minimum = check.value;
        if (check.inclusive === false)
          (result as Record<string, unknown>).exclusiveMinimum = true;
      } else if (check.kind === "max") {
        (result as Record<string, unknown>).maximum = check.value;
        if (check.inclusive === false)
          (result as Record<string, unknown>).exclusiveMaximum = true;
      }
    }
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
    const value = getLiteralValue(schema as ZodLiteral<LiteralValue>);
    const result: OpenAISchema = buildOpenAILiteralSchema(value);
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle enum
  if (schema instanceof ZodEnum || typeName === "ZodEnum") {
    const values = (schema as ZodEnum<[string, ...string[]]>)._def
      .values as string[];
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
    const discriminator = (
      schema as ZodDiscriminatedUnion<
        string,
        ZodObject<Record<string, ZodTypeAny>>[]
      >
    )._def.discriminator;
    const options = (
      schema as ZodDiscriminatedUnion<
        string,
        ZodObject<Record<string, ZodTypeAny>>[]
      >
    )._def.options as ZodObject<Record<string, ZodTypeAny>>[];

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
        const literalValue = getLiteralValue(
          discriminatorField as ZodLiteral<LiteralValue>,
        );
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
      (schema as ZodArray<ZodTypeAny>)._def.type,
      strict,
    );
    const result: OpenAISchema = {
      type: "array",
      items: itemSchema,
    };
    if (schema.description) result.description = schema.description;
    const minLen = (schema as ZodArray<ZodTypeAny>)._def.minLength;
    const maxLen = (schema as ZodArray<ZodTypeAny>)._def.maxLength;
    if (minLen != null)
      (result as Record<string, unknown>).minItems = minLen.value;
    if (maxLen != null)
      (result as Record<string, unknown>).maxItems = maxLen.value;
    return result;
  }

  // Handle object
  if (schema instanceof ZodObject || typeName === "ZodObject") {
    const shape = (schema as ZodObject<Record<string, ZodTypeAny>>).shape;
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
            (value as ZodNullable<ZodTypeAny>)._def.innerType as ZodTypeAny
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

      properties[key] = processZodToOpenAI(value as ZodTypeAny, strict);
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
    const valueSchema = (schema as ZodRecord<ZodString, ZodTypeAny>)._def
      .valueType;
    if (strict) {
      // OpenAI strict mode only allows additionalProperties: false
      // Degrade to a plain object with a descriptive hint
      const innerDesc = processZodToOpenAI(valueSchema, strict);
      const typeHint = innerDesc.type || "any";
      const result: OpenAISchema = {
        type: "object",
        description:
          (schema.description || "") + ` (key-value map, values: ${typeHint})`,
      };
      return result;
    }
    const result: OpenAISchema = {
      type: "object",
      additionalProperties: processZodToOpenAI(valueSchema, strict),
    };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle intersection
  if (schema instanceof ZodIntersection || typeName === "ZodIntersection") {
    const left = processZodToOpenAI(
      (schema as ZodIntersection<ZodTypeAny, ZodTypeAny>)._def.left,
      strict,
    );
    const right = processZodToOpenAI(
      (schema as ZodIntersection<ZodTypeAny, ZodTypeAny>)._def.right,
      strict,
    );

    if (left.type === "object" && right.type === "object") {
      const result: OpenAISchema = {
        type: "object",
        properties: { ...left.properties, ...right.properties },
        required: Array.from(
          new Set([...(left.required || []), ...(right.required || [])]),
        ),
      };
      if (strict) result.additionalProperties = false;
      if (schema.description) result.description = schema.description;
      return result;
    }
    return left;
  }

  // Handle null
  if (schema instanceof ZodNull || typeName === "ZodNull") {
    return { type: ["string", "null"], description: "null value" };
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

  // Handle tuple
  if (schema instanceof ZodTuple || typeName === "ZodTuple") {
    return { type: "array" };
  }

  // Handle native enum
  if (schema instanceof ZodNativeEnum || typeName === "ZodNativeEnum") {
    const values = Object.values(
      (schema as ZodNativeEnum<any>)._def.values,
    ).filter((v) => typeof v === "string");
    if (values.length > 0) return { type: "string", enum: values as string[] };
    return { type: "string" };
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
  const cached = _geminiCompatSchemaCache.get(schema);
  if (cached) return cached;
  const result = processZodToGeminiCompatible(schema);
  _geminiCompatSchemaCache.set(schema, result);
  return result;
}

function processZodToGeminiCompatible(schema: ZodTypeAny): OpenAISchema {
  const typeName = schema._def.typeName;

  // Handle effects
  if (schema instanceof ZodEffects || typeName === "ZodEffects") {
    const result = processZodToGeminiCompatible(
      (schema as ZodEffects<ZodTypeAny>)._def.schema,
    );
    if (schema.description && !result.description)
      result.description = schema.description;
    return result;
  }

  // Handle optional
  if (schema instanceof ZodOptional || typeName === "ZodOptional") {
    const result = processZodToGeminiCompatible(
      (schema as ZodOptional<ZodTypeAny>)._def.innerType,
    );
    if (schema.description && !result.description)
      result.description = schema.description;
    return result;
  }

  // Handle nullable
  if (schema instanceof ZodNullable || typeName === "ZodNullable") {
    const innerSchema = processZodToGeminiCompatible(
      (schema as ZodNullable<ZodTypeAny>)._def.innerType,
    );
    // Use nullable: true property
    // Make sure we don't duplicate or overwrite if it's already there
    // We create a new object to ensure we don't mutate shared references if any
    const result = { ...innerSchema, nullable: true };
    if (schema.description && !result.description)
      result.description = schema.description;
    return result;
  }

  // Handle default
  if (schema instanceof ZodDefault || typeName === "ZodDefault") {
    const result = processZodToGeminiCompatible(
      (schema as ZodDefault<ZodTypeAny>)._def.innerType,
    );
    const defaultVal = (schema as ZodDefault<ZodTypeAny>)._def.defaultValue();
    if (defaultVal !== undefined) {
      result.default = defaultVal;
    }
    if (schema.description && !result.description)
      result.description = schema.description;
    return result;
  }

  // Handle lazy
  if (schema instanceof ZodLazy || typeName === "ZodLazy") {
    if (!_lazyExpansionStack.has(schema)) {
      try {
        _lazyExpansionStack.add(schema);
        const innerSchema = (schema as ZodLazy<ZodTypeAny>)._def.getter();
        if (!(innerSchema instanceof ZodLazy)) {
          const result = processZodToGeminiCompatible(innerSchema);
          _lazyExpansionStack.delete(schema);
          return result;
        }
        _lazyExpansionStack.delete(schema);
      } catch {
        _lazyExpansionStack.delete(schema);
      }
    }
    return createOpenAIJsonValueSchema(schema.description || "Any JSON value");
  }

  // Handle string
  if (schema instanceof ZodString || typeName === "ZodString") {
    const result: OpenAISchema = { type: "string" };
    if (schema.description) result.description = schema.description;
    const checks = (schema as ZodString)._def.checks || [];
    for (const check of checks) {
      if (check.kind === "min")
        (result as Record<string, unknown>).minLength = check.value;
      else if (check.kind === "max")
        (result as Record<string, unknown>).maxLength = check.value;
    }
    return result;
  }

  // Handle number
  if (schema instanceof ZodNumber || typeName === "ZodNumber") {
    const checks = ((schema as ZodNumber)._def.checks || []) as Array<{
      kind?: string;
    }>;
    const isInt = checks.some((c) => c.kind === "int");
    const result: OpenAISchema = { type: isInt ? "integer" : "number" };
    if (schema.description) result.description = schema.description;
    for (const check of checks) {
      if (check.kind === "min") {
        (result as Record<string, unknown>).minimum = (
          check as Record<string, unknown>
        ).value;
        if ((check as Record<string, unknown>).inclusive === false)
          (result as Record<string, unknown>).exclusiveMinimum = true;
      } else if (check.kind === "max") {
        (result as Record<string, unknown>).maximum = (
          check as Record<string, unknown>
        ).value;
        if ((check as Record<string, unknown>).inclusive === false)
          (result as Record<string, unknown>).exclusiveMaximum = true;
      }
    }
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
    const value = getLiteralValue(schema as ZodLiteral<LiteralValue>);
    const result: OpenAISchema = buildOpenAILiteralSchema(value);
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle enum
  if (schema instanceof ZodEnum || typeName === "ZodEnum") {
    const values = (schema as ZodEnum<[string, ...string[]]>)._def
      .values as string[];
    const result: OpenAISchema = {
      type: "string",
      enum: values,
    };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle union - Gemini doesn't support generic unions well
  if (schema instanceof ZodUnion || typeName === "ZodUnion") {
    const options = (schema as ZodUnion<[ZodTypeAny, ...ZodTypeAny[]]>)._def
      .options;

    // Try to merge if all options are objects
    const allObjects = options.every(
      (opt) => opt instanceof ZodObject || opt._def.typeName === "ZodObject",
    );

    if (allObjects && options.length > 0) {
      const mergedProperties: Record<string, OpenAISchema> = {};
      const requiredByAll = new Set<string>();
      let first = true;

      for (const opt of options) {
        const shape = (opt as ZodObject<Record<string, ZodTypeAny>>).shape;
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
      (schema as ZodIntersection<ZodTypeAny, ZodTypeAny>)._def.left,
    );
    const right = processZodToGeminiCompatible(
      (schema as ZodIntersection<ZodTypeAny, ZodTypeAny>)._def.right,
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
    const discriminator = (
      schema as ZodDiscriminatedUnion<
        string,
        ZodObject<Record<string, ZodTypeAny>>[]
      >
    )._def.discriminator;
    const options = (
      schema as ZodDiscriminatedUnion<
        string,
        ZodObject<Record<string, ZodTypeAny>>[]
      >
    )._def.options as ZodObject<Record<string, ZodTypeAny>>[];

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
        const literalValue = getLiteralValue(
          discriminatorField as ZodLiteral<LiteralValue>,
        );
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
          stripOptionalDefaultWrappers(value as ZodTypeAny),
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
      (schema as ZodArray<ZodTypeAny>)._def.type,
    );
    const result: OpenAISchema = {
      type: "array",
      items: itemSchema,
    };
    if (schema.description) result.description = schema.description;
    const minLen = (schema as ZodArray<ZodTypeAny>)._def.minLength;
    const maxLen = (schema as ZodArray<ZodTypeAny>)._def.maxLength;
    if (minLen != null)
      (result as Record<string, unknown>).minItems = minLen.value;
    if (maxLen != null)
      (result as Record<string, unknown>).maxItems = maxLen.value;
    return result;
  }

  // Handle object
  if (schema instanceof ZodObject || typeName === "ZodObject") {
    const shape = (schema as ZodObject<Record<string, ZodTypeAny>>).shape;
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
        const innerType = (value as ZodNullable<ZodTypeAny>)._def.innerType;
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
    const valueSchema = (schema as ZodRecord<ZodString, ZodTypeAny>)._def
      .valueType;
    const result: OpenAISchema = {
      type: "object",
      additionalProperties: processZodToGeminiCompatible(valueSchema),
    };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle tuple
  if (schema instanceof ZodTuple || typeName === "ZodTuple") {
    return { type: "array" };
  }

  // Handle native enum
  if (schema instanceof ZodNativeEnum || typeName === "ZodNativeEnum") {
    const values = Object.values(
      (schema as ZodNativeEnum<any>)._def.values,
    ).filter((v) => typeof v === "string");
    if (values.length > 0) return { type: "string", enum: values as string[] };
    return { type: "string" };
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
  return createOpenAITool(name, description, parameters);
}

const GEMINI_OPENROUTER_TYPE_PRIORITY = [
  "object",
  "array",
  "string",
  "number",
  "integer",
  "boolean",
  "null",
] as const;

const pickGeminiOpenRouterType = (
  type: OpenAISchema["type"] | undefined,
): { type: string | undefined; addNullable: boolean } => {
  if (!type) return { type: undefined, addNullable: false };
  if (typeof type === "string") return { type, addNullable: false };
  // When collapsing type array, detect if "null" was present
  const hasNull = type.includes("null");
  // If the type array covers all JSON types (any value), drop type constraint
  const nonNull = type.filter((t) => t !== "null");
  if (nonNull.length >= 5) {
    return { type: undefined, addNullable: hasNull };
  }
  for (const candidate of GEMINI_OPENROUTER_TYPE_PRIORITY) {
    if (candidate !== "null" && type.includes(candidate))
      return { type: candidate, addNullable: hasNull };
  }
  return { type: type[0], addNullable: hasNull };
};

const sanitizeOpenRouterGeminiSchema = (schema: OpenAISchema): OpenAISchema => {
  const result: Partial<OpenAISchema> = {};

  const { type: normalizedType, addNullable } = pickGeminiOpenRouterType(
    schema.type,
  );
  if (normalizedType) {
    result.type = normalizedType;
  }
  if (addNullable) {
    (result as { nullable?: boolean }).nullable = true;
  }

  if (schema.description) {
    result.description = schema.description;
  }
  if (Array.isArray(schema.enum)) {
    result.enum = schema.enum;
  }
  if ((schema as { nullable?: boolean }).nullable === true) {
    (result as { nullable?: boolean }).nullable = true;
  }

  if (schema.items && typeof schema.items === "object") {
    const sanitizedItems = sanitizeOpenRouterGeminiSchema(schema.items);
    // Only include items if the sanitized result has meaningful content
    if (
      sanitizedItems.type ||
      sanitizedItems.properties ||
      sanitizedItems.enum
    ) {
      result.items = sanitizedItems;
      if (!result.type) {
        result.type = "array";
      }
    }
  }

  // Handle anyOf: flatten all variant properties into the result
  const anyOf = (schema as { anyOf?: OpenAISchema[] }).anyOf;
  if (Array.isArray(anyOf) && anyOf.length > 0) {
    const mergedProperties: Record<string, OpenAISchema> = {};
    const allRequired = new Set<string>();
    let allVariantsHaveRequired = true;
    let anyVariantHasProperties = false;

    for (const variant of anyOf) {
      const sanitizedVariant = sanitizeOpenRouterGeminiSchema(variant);
      if (sanitizedVariant.properties) {
        anyVariantHasProperties = true;
        for (const [key, value] of Object.entries(
          sanitizedVariant.properties,
        )) {
          if (!mergedProperties[key]) {
            mergedProperties[key] = value;
          }
        }
      }
      if (Array.isArray(sanitizedVariant.required)) {
        for (const key of sanitizedVariant.required) {
          allRequired.add(key);
        }
      } else {
        allVariantsHaveRequired = false;
      }
    }

    if (anyVariantHasProperties && Object.keys(mergedProperties).length > 0) {
      result.properties = {
        ...(result.properties || {}),
        ...mergedProperties,
      };
      if (!result.type || result.type === "string") {
        result.type = "object";
      }
      // Only mark keys as required if they are required in EVERY variant that
      // has a required array. Keys from some-but-not-all variants stay optional.
      if (allVariantsHaveRequired && allRequired.size > 0) {
        const variantsWithReq = anyOf.filter((v) => Array.isArray(v.required));
        const universallyRequired = [...allRequired].filter((key) =>
          variantsWithReq.every(
            (v) => Array.isArray(v.required) && v.required.includes(key),
          ),
        );
        const existingRequired = new Set(
          Array.isArray(result.required) ? result.required : [],
        );
        for (const key of universallyRequired) {
          if (Object.prototype.hasOwnProperty.call(result.properties, key)) {
            existingRequired.add(key);
          }
        }
        if (existingRequired.size > 0) {
          result.required = [...existingRequired];
        }
      }
    } else if (!anyVariantHasProperties) {
      // All variants are primitives (e.g. string|number|boolean|null).
      // Keep the first valid non-null type rather than deleting all type info.
      const primitiveTypes = anyOf
        .map((v) => v.type)
        .filter(
          (t): t is string =>
            typeof t === "string" && t !== "null" && t !== "object",
        );
      if (primitiveTypes.length > 0) {
        result.type = primitiveTypes[0];
      }
    }
  }

  const rawProperties = schema.properties;
  if (rawProperties && typeof rawProperties === "object") {
    const properties: Record<string, OpenAISchema> = {};

    for (const [key, value] of Object.entries(rawProperties)) {
      properties[key] = sanitizeOpenRouterGeminiSchema(value);
    }

    result.properties = { ...properties, ...(result.properties || {}) };
    if (!result.type) {
      result.type = "object";
    }

    const required = Array.isArray(schema.required)
      ? schema.required.filter(
          (key): key is string =>
            typeof key === "string" &&
            Object.prototype.hasOwnProperty.call(result.properties, key),
        )
      : [];
    if (required.length > 0) {
      // Merge with any required from anyOf
      const existingRequired = new Set(
        Array.isArray(result.required) ? result.required : [],
      );
      for (const key of required) {
        existingRequired.add(key);
      }
      result.required = [...existingRequired];
    }
  }

  return result as OpenAISchema;
};

/**
 * Compile Zod schema for Gemini-backed tool parameters on OpenAI-compatible channels.
 * This profile intentionally avoids `anyOf` to reduce provider-side conversion failures.
 */
export function zodToGeminiToolCompatibleSchema(
  schema: ZodTypeAny,
): OpenAISchema {
  const cached = _geminiToolCompatSchemaCache.get(schema);
  if (cached) return cached;
  const result = sanitizeOpenRouterGeminiSchema(
    zodToGeminiCompatibleSchema(schema),
  );
  _geminiToolCompatSchemaCache.set(schema, result);
  return result;
}

/**
 * Backward-compatible alias for existing OpenRouter callsites.
 */
export const zodToOpenRouterGeminiCompatibleSchema =
  zodToGeminiToolCompatibleSchema;

/**
 * Create OpenRouter tool schema tuned for Gemini-backed models.
 */
export function createOpenRouterGeminiTool(
  name: string,
  description: string,
  parameters: ZodTypeAny,
): OpenRouterToolDefinition {
  return {
    type: "function",
    function: {
      name,
      description,
      strict: false,
      parameters: zodToGeminiToolCompatibleSchema(parameters),
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
function processZodToClaudeCompatible(schema: ZodTypeAny): OpenAISchema {
  const typeName = schema._def.typeName;

  // Handle effects
  if (schema instanceof ZodEffects || typeName === "ZodEffects") {
    const result = processZodToClaudeCompatible(
      (schema as ZodEffects<ZodTypeAny>)._def.schema,
    );
    if (schema.description && !result.description)
      result.description = schema.description;
    return result;
  }

  // Handle optional
  if (schema instanceof ZodOptional || typeName === "ZodOptional") {
    const result = processZodToClaudeCompatible(
      (schema as ZodOptional<ZodTypeAny>)._def.innerType,
    );
    if (schema.description && !result.description)
      result.description = schema.description;
    return result;
  }

  // Handle nullable
  if (schema instanceof ZodNullable || typeName === "ZodNullable") {
    const innerSchema = processZodToClaudeCompatible(
      (schema as ZodNullable<ZodTypeAny>)._def.innerType,
    );
    // Use nullable: true property
    const result = { ...innerSchema, nullable: true };
    if (schema.description && !result.description)
      result.description = schema.description;
    return result;
  }

  // Handle default
  if (schema instanceof ZodDefault || typeName === "ZodDefault") {
    const result = processZodToClaudeCompatible(
      (schema as ZodDefault<ZodTypeAny>)._def.innerType,
    );
    const defaultVal = (schema as ZodDefault<ZodTypeAny>)._def.defaultValue();
    if (defaultVal !== undefined) {
      result.default = defaultVal;
    }
    if (schema.description && !result.description)
      result.description = schema.description;
    return result;
  }

  // Handle lazy
  if (schema instanceof ZodLazy || typeName === "ZodLazy") {
    if (!_lazyExpansionStack.has(schema)) {
      try {
        _lazyExpansionStack.add(schema);
        const innerSchema = (schema as ZodLazy<ZodTypeAny>)._def.getter();
        if (!(innerSchema instanceof ZodLazy)) {
          const result = processZodToClaudeCompatible(innerSchema);
          _lazyExpansionStack.delete(schema);
          return result;
        }
        _lazyExpansionStack.delete(schema);
      } catch {
        _lazyExpansionStack.delete(schema);
      }
    }
    return createOpenAIJsonValueSchema(schema.description || "Any JSON value");
  }

  // Handle string
  if (schema instanceof ZodString || typeName === "ZodString") {
    const result: OpenAISchema = { type: "string" };
    if (schema.description) result.description = schema.description;
    const checks = (schema as ZodString)._def.checks || [];
    for (const check of checks) {
      if (check.kind === "min")
        (result as Record<string, unknown>).minLength = check.value;
      else if (check.kind === "max")
        (result as Record<string, unknown>).maxLength = check.value;
    }
    return result;
  }

  // Handle number
  if (schema instanceof ZodNumber || typeName === "ZodNumber") {
    const checks = ((schema as ZodNumber)._def.checks || []) as Array<{
      kind?: string;
    }>;
    const isInt = checks.some((c) => c.kind === "int");
    const result: OpenAISchema = { type: isInt ? "integer" : "number" };
    if (schema.description) result.description = schema.description;
    for (const check of checks) {
      if (check.kind === "min") {
        (result as Record<string, unknown>).minimum = (
          check as Record<string, unknown>
        ).value;
        if ((check as Record<string, unknown>).inclusive === false)
          (result as Record<string, unknown>).exclusiveMinimum = true;
      } else if (check.kind === "max") {
        (result as Record<string, unknown>).maximum = (
          check as Record<string, unknown>
        ).value;
        if ((check as Record<string, unknown>).inclusive === false)
          (result as Record<string, unknown>).exclusiveMaximum = true;
      }
    }
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
    const value = getLiteralValue(schema as ZodLiteral<LiteralValue>);
    const result: OpenAISchema = buildOpenAILiteralSchema(value);
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle enum
  if (schema instanceof ZodEnum || typeName === "ZodEnum") {
    const values = (schema as ZodEnum<[string, ...string[]]>)._def
      .values as string[];
    const result: OpenAISchema = {
      type: "string",
      enum: values,
    };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle union - Claude doesn't support generic unions well
  if (schema instanceof ZodUnion || typeName === "ZodUnion") {
    const options = (schema as ZodUnion<[ZodTypeAny, ...ZodTypeAny[]]>)._def
      .options;

    // Try to merge if all options are objects
    const allObjects = options.every(
      (opt) => opt instanceof ZodObject || opt._def.typeName === "ZodObject",
    );

    if (allObjects && options.length > 0) {
      const mergedProperties: Record<string, OpenAISchema> = {};
      const requiredByAll = new Set<string>();
      let first = true;

      for (const opt of options) {
        const shape = (opt as ZodObject<Record<string, ZodTypeAny>>).shape;
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
      (schema as ZodIntersection<ZodTypeAny, ZodTypeAny>)._def.left,
    );
    const right = processZodToClaudeCompatible(
      (schema as ZodIntersection<ZodTypeAny, ZodTypeAny>)._def.right,
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
    const discriminator = (
      schema as ZodDiscriminatedUnion<
        string,
        ZodObject<Record<string, ZodTypeAny>>[]
      >
    )._def.discriminator;
    const options = (
      schema as ZodDiscriminatedUnion<
        string,
        ZodObject<Record<string, ZodTypeAny>>[]
      >
    )._def.options as ZodObject<Record<string, ZodTypeAny>>[];

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
        const literalValue = getLiteralValue(
          discriminatorField as ZodLiteral<LiteralValue>,
        );
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
          stripOptionalDefaultWrappers(value as ZodTypeAny),
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
      (schema as ZodArray<ZodTypeAny>)._def.type,
    );
    const result: OpenAISchema = {
      type: "array",
      items: itemSchema,
    };
    if (schema.description) result.description = schema.description;
    const minLen = (schema as ZodArray<ZodTypeAny>)._def.minLength;
    const maxLen = (schema as ZodArray<ZodTypeAny>)._def.maxLength;
    if (minLen != null)
      (result as Record<string, unknown>).minItems = minLen.value;
    if (maxLen != null)
      (result as Record<string, unknown>).maxItems = maxLen.value;
    return result;
  }

  // Handle object
  if (schema instanceof ZodObject || typeName === "ZodObject") {
    const shape = (schema as ZodObject<Record<string, ZodTypeAny>>).shape;
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
        const innerType = (value as ZodNullable<ZodTypeAny>)._def.innerType;
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
    const valueSchema = (schema as ZodRecord<ZodString, ZodTypeAny>)._def
      .valueType;
    const result: OpenAISchema = {
      type: "object",
      additionalProperties: processZodToClaudeCompatible(valueSchema),
    };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle tuple
  if (schema instanceof ZodTuple || typeName === "ZodTuple") {
    return { type: "array" };
  }

  // Handle native enum
  if (schema instanceof ZodNativeEnum || typeName === "ZodNativeEnum") {
    const values = Object.values(
      (schema as ZodNativeEnum<any>)._def.values,
    ).filter((v) => typeof v === "string");
    if (values.length > 0) return { type: "string", enum: values as string[] };
    return { type: "string" };
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
  const cached = _claudeCompatSchemaCache.get(schema);
  if (cached) return cached;
  const result = processZodToClaudeCompatible(schema);
  _claudeCompatSchemaCache.set(schema, result);
  return result;
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
  return createOpenRouterGeminiTool(name, description, parameters);
}

// ============================================================================
// Model Detection Helpers
// ============================================================================

/**
 * 检测模型 ID 是否为 Gemini 模型
 */
export function isGeminiModel(modelId: string): boolean {
  return /\bgemini\b/i.test(modelId);
}

/**
 * 检测模型 ID 是否为 Claude 模型
 */
export function isClaudeModel(modelId: string): boolean {
  return /\bclaude\b/i.test(modelId);
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
