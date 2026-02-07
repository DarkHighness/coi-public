import {
  ZodTypeAny,
  ZodError,
  ZodObject,
  ZodOptional,
  ZodAny,
  ZodUnknown,
  ZodLazy,
  ZodDefault,
  ZodEffects,
  ZodArray,
  ZodUnion,
  ZodEnum,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodNull,
  ZodLiteral,
  ZodNullable,
  ZodIntersection,
  ZodRecord,
  ZodDiscriminatedUnion,
} from "zod";
import { AIProviderError } from "./types";

/**
 * Zod Tool Definition simplified interface for utility use
 */
export interface ZodToolDefinition {
  name: string;
  description: string;
  parameters: ZodObject<any>;
}

/**
 * Schema Validation Error
 */
export class SchemaValidationError extends AIProviderError {
  constructor(provider: string, details?: string, cause?: unknown) {
    super(
      `Schema validation failed${details ? `: ${details}` : ""}`,
      provider,
      "SCHEMA_VALIDATION_ERROR",
      cause,
    );
    this.name = "SchemaValidationError";
  }
}

/**
 * Retry utility with exponential backoff
 *
 * @param fn Async function to retry
 * @param retries Maximum number of retries (default: 3)
 * @param delay Initial delay in ms (default: 1000)
 * @param provider Provider name for error reporting
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000,
  provider: string = "unknown",
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // If this was the last attempt, throw
      if (attempt === retries) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const backoff = delay * Math.pow(2, attempt);
      const jitter = Math.random() * 200;
      const waitTime = backoff + jitter;

      console.warn(
        `[${provider}] Attempt ${attempt + 1} failed. Retrying in ${Math.round(waitTime)}ms...`,
        error instanceof Error ? error.message : error,
      );

      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof AIProviderError) {
    // Don't retry on specific errors
    if (
      error.code === "SAFETY" ||
      error.code === "UNSUPPORTED" ||
      error.code === "QUOTA_EXHAUSTED" ||
      error.code === "MALFORMED_TOOL_CALL"
    ) {
      return false;
    }

    // error.code === "SCHEMA_VALIDATION_ERROR" // retry schema validation errors as they are likely non-deterministic
    return true;
  }

  // Retry on network errors or unknown errors
  return true;
}

/**
 * Validate data against Zod schema
 */
export function validateSchema(
  data: unknown,
  schema?: ZodTypeAny,
  provider: string = "unknown",
): unknown {
  if (!schema) {
    return data;
  }

  try {
    return schema.parse(data);
  } catch (error) {
    console.error(`[${provider}] Schema validation failed:`, error);
    // Create a detailed error message from Zod error
    let details = "Validation failed";
    if (error && typeof error === "object" && "issues" in error) {
      details = JSON.stringify((error as any).issues);
    }
    throw new SchemaValidationError(provider, details, error);
  }
}

/**
 * Clean JSON content from markdown code block wrappers
 *
 * Handles various formats:
 * - ```json\n{...}\n```
 * - ```JSON\n{...}\n```
 * - ```\n{...}\n```
 * - With or without trailing newlines
 * - Mixed line endings (\n, \r\n)
 *
 * @param content Raw content that may be wrapped in markdown code blocks
 * @returns Cleaned JSON string ready for parsing
 */
export function cleanJsonContent(content: string): string {
  if (!content) return content;

  let cleaned = content.trim();

  // Remove the think block <think></think>
  cleaned = cleaned.replace(/<think>.*?<\/think>/s, "");

  // Remove leading markdown code block with optional language specifier
  // Matches: ```json, ```JSON, ```, etc. followed by optional whitespace/newline
  cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\r?\n?/, "");

  // Remove trailing markdown code block
  // Matches: ``` at the end, optionally preceded by newline
  cleaned = cleaned.replace(/\r?\n?```\s*$/, "");

  return cleaned.trim();
}

/**
 * Format Zod validation errors into a human-readable string for the AI
 */
export function formatZodError(error: ZodError): string {
  const issues = error.errors
    .map(
      (e) => `  <issue>
    <path>${e.path.join(".") || "(root)"}</path>
    <message>${e.message}</message>
  </issue>`,
    )
    .join("\n");
  return `<validation_errors>\n${issues}\n</validation_errors>`;
}

/**
 * Internal fields that should not be exposed to AI
 */
const INTERNAL_FIELDS = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "modifiedAt",
  "lastAccess",
]);

const VFS_INTERNAL_FIELDS = new Set(["createdAt", "updatedAt", "modifiedAt", "lastAccess"]);

function unwrapHintSchema(schema: ZodTypeAny): {
  schema: ZodTypeAny;
  isOptional: boolean;
} {
  let current: ZodTypeAny = schema;
  let isOptional = false;

  while (true) {
    if (current instanceof ZodOptional) {
      isOptional = true;
      current = current._def.innerType;
      continue;
    }
    if (current instanceof ZodNullable) {
      current = current._def.innerType;
      continue;
    }
    if (current instanceof ZodDefault) {
      isOptional = true;
      current = current._def.innerType;
      continue;
    }
    if (current instanceof ZodEffects) {
      current = current._def.schema;
      continue;
    }
    break;
  }

  return { schema: current, isOptional };
}

function getGenericTypeHintVfs(schema: ZodTypeAny, indent: string = ""): string {
  schema = unwrapHintSchema(schema).schema;

  if (schema instanceof ZodString) return "string";
  if (schema instanceof ZodNumber) return "number";
  if (schema instanceof ZodBoolean) return "boolean";
  if (schema instanceof ZodLazy) return "JsonValue";
  if (schema instanceof ZodAny || schema instanceof ZodUnknown)
    return "JsonValue";
  if (schema instanceof ZodNull) return "null";
  if (schema instanceof ZodLiteral) {
    const value = schema._def.value;
    return typeof value === "string" ? `"${value}"` : String(value);
  }
  if (schema instanceof ZodDiscriminatedUnion) {
    const options = (schema as ZodDiscriminatedUnion<any, any>)._def
      .options as ZodObject<any>[];
    return options
      .map((opt) => getVfsSchemaHint(opt, indent + "  "))
      .join(" | ");
  }
  if (schema instanceof ZodEnum) {
    return (schema as ZodEnum<any>)._def.values
      .map((v) => `"${v}"`)
      .join(" | ");
  }
  if (schema instanceof ZodArray) {
    const inner = schema._def.type;
    if (inner instanceof ZodObject) {
      return `Array<${getVfsSchemaHint(inner, indent + "  ")}>`;
    }
    return `Array<${getGenericTypeHintVfs(inner, indent)}>`;
  }
  if (schema instanceof ZodObject) {
    return getVfsSchemaHint(schema, indent);
  }
  if (schema instanceof ZodUnion) {
    return (schema as ZodUnion<any>)._def.options
      .map((opt: ZodTypeAny) => getGenericTypeHintVfs(opt, indent))
      .join(" | ");
  }
  if (schema instanceof ZodIntersection) {
    return `${getGenericTypeHintVfs(schema._def.left, indent)} & ${getGenericTypeHintVfs(
      schema._def.right,
      indent,
    )}`;
  }
  if (schema instanceof ZodRecord) {
    const valueSchema = (schema as any)?._def?.valueType;
    const valueHint = valueSchema
      ? getGenericTypeHintVfs(valueSchema as ZodTypeAny, indent)
      : "JsonValue";
    return `Record<string, ${valueHint}>`;
  }

  return "any";
}

/**
 * Variant of getToolSchemaHint for VFS JSON schemas (keeps entity ids visible).
 */
export function getVfsSchemaHint(
  schema: ZodTypeAny,
  indent: string = "",
): string {
  if (schema instanceof ZodObject) {
    const shape = schema.shape;
    const lines = Object.entries(shape)
      .filter(([key, value]) => {
        if (VFS_INTERNAL_FIELDS.has(key)) return false;

        const fieldSchema = value as ZodTypeAny;
        const description = fieldSchema.description;
        if (description && description.includes("INVISIBLE")) return false;

        return true;
      })
      .map(([key, value]) => {
        let fieldSchema = value as ZodTypeAny;
        const unwrapped = unwrapHintSchema(fieldSchema);
        let isOptional = unwrapped.isOptional;
        let description = fieldSchema.description;

        let innerSchema = unwrapped.schema;

        if (!description) description = innerSchema.description;

        let typeStr = "";
        if (innerSchema instanceof ZodObject) {
          typeStr = getVfsSchemaHint(innerSchema, indent + "  ");
        } else if (
          innerSchema instanceof ZodArray &&
          innerSchema._def.type instanceof ZodObject
        ) {
          typeStr = `Array<${getVfsSchemaHint(
            innerSchema._def.type,
            indent + "  ",
          )}>`;
        } else if (innerSchema instanceof ZodArray) {
          typeStr = getGenericTypeHintVfs(innerSchema, indent);
        } else {
          typeStr = getGenericTypeHintVfs(innerSchema, indent);
        }

        const descComment = description ? ` // ${description}` : "";
        return `${indent}  ${key}${isOptional ? "?" : ""}: ${typeStr};${descComment}`;
      });

    return `{\n${lines.join("\n")}\n${indent}}`;
  }

  return getGenericTypeHintVfs(schema, indent);
}

/**
 * Generate a simplified, JSON-like schema representation for the AI
 */
export function getToolSchemaHint(
  schema: ZodTypeAny,
  indent: string = "",
): string {
  if (schema instanceof ZodObject) {
    const shape = schema.shape;
    const lines = Object.entries(shape)
      .filter(([key, value]) => {
        // Filter out internal system fields
        if (INTERNAL_FIELDS.has(key)) return false;

        // Filter out fields marked as INVISIBLE
        const fieldSchema = value as ZodTypeAny;
        const description = fieldSchema.description;
        if (description && description.includes("INVISIBLE")) return false;

        return true;
      })
      .map(([key, value]) => {
        let fieldSchema = value as ZodTypeAny;
        const unwrapped = unwrapHintSchema(fieldSchema);
        let isOptional = unwrapped.isOptional;
        let description = fieldSchema.description;

        // Unwrap wrappers for type handling
        let innerSchema = unwrapped.schema;

        // Use innerSchema for description if main schema has none
        if (!description) description = innerSchema.description;

        let typeStr = "";
        if (innerSchema instanceof ZodObject) {
          typeStr = getToolSchemaHint(innerSchema, indent + "  ");
        } else if (
          innerSchema instanceof ZodArray &&
          innerSchema._def.type instanceof ZodObject
        ) {
          typeStr = `Array<${getToolSchemaHint(
            innerSchema._def.type,
            indent + "  ",
          )}>`;
        } else if (innerSchema instanceof ZodArray) {
          typeStr = getGenericTypeHint(innerSchema, indent);
        } else {
          typeStr = getGenericTypeHint(innerSchema, indent);
        }

        const descComment = description ? ` // ${description}` : "";
        return `${indent}  ${key}${isOptional ? "?" : ""}: ${typeStr};${descComment}`;
      });

    return `{\n${lines.join("\n")}\n${indent}}`;
  }

  return getGenericTypeHint(schema, indent);
}

/**
 * Internal helper for type hints
 */
function getGenericTypeHint(schema: ZodTypeAny, indent: string = ""): string {
  schema = unwrapHintSchema(schema).schema;

  if (schema instanceof ZodString) return "string";
  if (schema instanceof ZodNumber) return "number";
  if (schema instanceof ZodBoolean) return "boolean";
  if (schema instanceof ZodLazy) return "JsonValue";
  if (schema instanceof ZodAny || schema instanceof ZodUnknown)
    return "JsonValue";
  if (schema instanceof ZodNull) return "null";
  if (schema instanceof ZodLiteral) {
    const value = schema._def.value;
    return typeof value === "string" ? `"${value}"` : String(value);
  }
  if (schema instanceof ZodDiscriminatedUnion) {
    const options = (schema as ZodDiscriminatedUnion<any, any>)._def
      .options as ZodObject<any>[];
    return options
      .map((opt) => getToolSchemaHint(opt, indent + "  "))
      .join(" | ");
  }
  if (schema instanceof ZodEnum) {
    return (schema as ZodEnum<any>)._def.values
      .map((v) => `"${v}"`)
      .join(" | ");
  }
  if (schema instanceof ZodArray) {
    const inner = schema._def.type;
    if (inner instanceof ZodObject) {
      return `Array<${getToolSchemaHint(inner, indent + "  ")}>`;
    }
    return `Array<${getGenericTypeHint(inner, indent)}>`;
  }
  if (schema instanceof ZodObject) {
    return getToolSchemaHint(schema, indent);
  }
  if (schema instanceof ZodUnion) {
    return (schema as ZodUnion<any>)._def.options
      .map((opt: ZodTypeAny) => getGenericTypeHint(opt, indent))
      .join(" | ");
  }
  if (schema instanceof ZodIntersection) {
    return `${getGenericTypeHint(schema._def.left, indent)} & ${getGenericTypeHint(
      schema._def.right,
      indent,
    )}`;
  }
  if (schema instanceof ZodRecord) {
    const valueSchema = (schema as any)?._def?.valueType;
    const valueHint = valueSchema
      ? getGenericTypeHint(valueSchema as ZodTypeAny, indent)
      : "JsonValue";
    return `Record<string, ${valueHint}>`;
  }

  return "any";
}

/**
 * Get full tool information including name, description, and schema hint
 */
export function getToolInfo(tool: ZodToolDefinition): string {
  return `<tool_info>
  <name>${tool.name}</name>
  <description>${tool.description}</description>
  <parameters>
${getToolSchemaHint(tool.parameters)}
  </parameters>
</tool_info>`;
}
