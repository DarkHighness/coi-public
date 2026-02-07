/**
 * Tool Execution Result Types
 *
 * This is the shared result envelope returned by tool handlers.
 * Keep it small and generic so tool handlers (including VFS) don't depend on
 * legacy domain-specific modules.
 */

export interface ToolCallSuccess<T = unknown> {
  success: true;
  data: T;
  message: string;
}

export interface ToolCallError {
  success: false;
  error: string;
  code:
    | "NOT_FOUND"
    | "ALREADY_EXISTS"
    | "INVALID_ACTION"
    | "INVALID_DATA"
    | "ELEVATION_REQUIRED"
    | "IMMUTABLE_READONLY"
    | "FINISH_GUARD_REQUIRED"
    | "EDITOR_CONFIRM_REQUIRED"
    | "UNKNOWN";
}

export type ToolCallResult<T = unknown> = ToolCallSuccess<T> | ToolCallError;

export const createSuccess = <T>(data: T, message: string): ToolCallSuccess<T> => ({
  success: true,
  data,
  message,
});

export const createError = (
  error: string,
  code: ToolCallError["code"] = "UNKNOWN",
): ToolCallError => ({
  success: false,
  error,
  code,
});

