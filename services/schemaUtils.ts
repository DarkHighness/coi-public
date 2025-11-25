import { Schema, Type } from "@google/genai";

export type JsonSchemaType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array"
  | "null";

export interface JsonSchema {
  type?: JsonSchemaType | JsonSchemaType[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: string[];
  nullable?: boolean;
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  additionalProperties?: boolean;
}

/**
 * Converts a Standard JSON Schema to Google GenAI Schema.
 * Throws error if schema contains unsupported features.
 */
export function convertJsonSchemaToGemini(schema: JsonSchema): Schema {
  if (!schema) return {} as Schema;

  if (schema.allOf || schema.anyOf || schema.oneOf) {
    throw new Error(
      "Gemini Schema conversion does not support allOf/anyOf/oneOf. Please flatten your schema.",
    );
  }

  const geminiSchema: Schema = {};

  if (schema.type) {
    if (Array.isArray(schema.type)) {
      // If it's ["string", "null"], we can handle it via nullable.
      // Otherwise, throw error.
      const types = schema.type;
      if (types.length === 2 && types.includes("null")) {
        geminiSchema.nullable = true;
        const actualType = types.find((t) => t !== "null");
        if (!actualType)
          throw new Error("Invalid type array: " + JSON.stringify(types));
        mapTypeToGemini(actualType, geminiSchema);
      } else {
        throw new Error(
          `Gemini Schema conversion does not support multiple types: ${JSON.stringify(types)}`,
        );
      }
    } else {
      mapTypeToGemini(schema.type, geminiSchema);
    }
  }

  if (schema.description) {
    geminiSchema.description = schema.description;
  }

  if (schema.enum) {
    geminiSchema.enum = schema.enum;
  }

  if (schema.properties) {
    geminiSchema.properties = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      geminiSchema.properties[key] = convertJsonSchemaToGemini(value);
    }
  }

  if (schema.items) {
    geminiSchema.items = convertJsonSchemaToGemini(schema.items);
  }

  if (schema.required) {
    geminiSchema.required = schema.required;
  }

  if (schema.nullable) {
    geminiSchema.nullable = true;
  }

  return geminiSchema;
}

function mapTypeToGemini(type: JsonSchemaType, geminiSchema: Schema) {
  switch (type) {
    case "string":
      geminiSchema.type = Type.STRING;
      break;
    case "number":
      geminiSchema.type = Type.NUMBER;
      break;
    case "integer":
      geminiSchema.type = Type.INTEGER;
      break;
    case "boolean":
      geminiSchema.type = Type.BOOLEAN;
      break;
    case "object":
      geminiSchema.type = Type.OBJECT;
      break;
    case "array":
      geminiSchema.type = Type.ARRAY;
      break;
    case "null":
      // handled via nullable usually, but if explicit type null...
      throw new Error(
        "Gemini does not support explicit 'null' type. Use nullable property.",
      );
    default:
      throw new Error(`Unsupported JSON Schema type for Gemini: ${type}`);
  }
}

/**
 * Converts a Standard JSON Schema to OpenAI Strict Schema Object.
 * Throws error if schema contains unsupported features.
 */
export const convertJsonSchemaToOpenAIObject = (
  s: JsonSchema,
  strict: boolean = true,
): any => {
  if (s.allOf || s.anyOf || s.oneOf) {
    throw new Error(
      "OpenAI Strict Schema conversion does not support allOf/anyOf/oneOf.",
    );
  }

  let type = s.type;

  // Handle array of types (e.g. ["string", "null"])
  if (Array.isArray(type)) {
    // OpenAI strict mode generally wants a single type.
    // If it's nullable, we might need to handle it, but strict mode is... strict.
    // For now, let's enforce single type to be safe, or throw.
    throw new Error(
      `OpenAI Strict Schema requires a single type, found: ${JSON.stringify(type)}`,
    );
  }

  if (!type) {
    // Fallback for object without type (common in some schemas)
    if (s.properties) {
      type = "object";
    } else {
      throw new Error("OpenAI Strict Schema requires a defined type.");
    }
  }

  if (type === "object") {
    const properties: Record<string, any> = {};
    const required: string[] = strict ? [] : s.required || [];

    if (s.properties) {
      for (const [key, value] of Object.entries(s.properties)) {
        properties[key] = convertJsonSchemaToOpenAIObject(value, strict);
        if (strict) {
          required.push(key); // Strict mode requires all properties to be required
        }
      }
    }

    const result: any = {
      type: "object",
      properties,
      required,
      description: s.description,
    };

    if (strict) {
      result.additionalProperties = false;
    }

    return result;
  }

  if (type === "array") {
    if (!s.items) {
      throw new Error(
        "OpenAI Strict Schema array requires 'items' definition.",
      );
    }
    return {
      type: "array",
      items: convertJsonSchemaToOpenAIObject(s.items, strict),
      description: s.description,
    };
  }

  // Primitive types
  const result: any = {
    type,
    description: s.description,
  };

  if (s.enum) {
    result.enum = s.enum;
  }

  return result;
};

/**
 * Converts a Standard JSON Schema to OpenAI Strict Schema Response Format.
 */
export const convertJsonSchemaToOpenAI = (schema: JsonSchema): any => {
  return {
    name: "response",
    strict: true,
    schema: convertJsonSchemaToOpenAIObject(schema),
  };
};
