import { ZodTypeAny } from "zod";
import { AIProviderError } from "./types";

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
