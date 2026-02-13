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

export type ToolErrorCategory =
  | "validation"
  | "policy"
  | "permission"
  | "not_found"
  | "conflict"
  | "execution"
  | "unknown";

export interface ToolErrorIssue {
  path?: string;
  code?: string;
  message: string;
  expected?: unknown;
  received?: unknown;
}

export interface ToolErrorBatch {
  index?: number;
  total?: number;
  operation?: string;
  path?: string;
}

export interface ToolErrorDetails {
  category?: ToolErrorCategory;
  tool?: string;
  issues?: ToolErrorIssue[];
  recovery?: string[];
  refs?: string[];
  batch?: ToolErrorBatch;
}

export interface ToolCallError {
  success: false;
  error: string;
  code:
    | "INVALID_PARAMS"
    | "NOT_FOUND"
    | "ALREADY_EXISTS"
    | "INVALID_ACTION"
    | "INVALID_DATA"
    | "ELEVATION_REQUIRED"
    | "IMMUTABLE_READONLY"
    | "FINISH_GUARD_REQUIRED"
    | "EDITOR_CONFIRM_REQUIRED"
    | "RAG_DISABLED"
    | "UNKNOWN";
  details?: ToolErrorDetails;
}

export type ToolCallResult<T = unknown> = ToolCallSuccess<T> | ToolCallError;

export const createSuccess = <T>(
  data: T,
  message: string,
): ToolCallSuccess<T> => ({
  success: true,
  data,
  message,
});

const uniqueStrings = (items: Array<string | undefined>): string[] => {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const item of items) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    next.push(trimmed);
  }
  return next;
};

const dedupeIssues = (
  issues: Array<ToolErrorIssue | undefined>,
): ToolErrorIssue[] => {
  const seen = new Set<string>();
  const next: ToolErrorIssue[] = [];
  for (const issue of issues) {
    if (!issue || typeof issue.message !== "string" || !issue.message.trim()) {
      continue;
    }
    const key = JSON.stringify({
      path: issue.path ?? "",
      code: issue.code ?? "",
      message: issue.message,
      expected: issue.expected,
      received: issue.received,
    });
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(issue);
  }
  return next;
};

export const inferErrorCategoryFromCode = (
  code: ToolCallError["code"],
): ToolErrorCategory => {
  if (code === "NOT_FOUND") return "not_found";
  if (code === "ALREADY_EXISTS") return "conflict";
  if (code === "INVALID_ACTION") return "policy";
  if (code === "INVALID_DATA" || code === "INVALID_PARAMS") return "validation";
  if (
    code === "ELEVATION_REQUIRED" ||
    code === "IMMUTABLE_READONLY" ||
    code === "FINISH_GUARD_REQUIRED" ||
    code === "EDITOR_CONFIRM_REQUIRED"
  ) {
    return "permission";
  }
  if (code === "RAG_DISABLED") return "policy";
  if (code === "UNKNOWN") return "unknown";
  return "execution";
};

const normalizeDetails = (
  details: ToolErrorDetails,
): ToolErrorDetails | undefined => {
  const normalized: ToolErrorDetails = {};

  if (details.category) normalized.category = details.category;
  if (details.tool) normalized.tool = details.tool;
  if (Array.isArray(details.issues) && details.issues.length > 0) {
    const issues = dedupeIssues(details.issues);
    if (issues.length > 0) normalized.issues = issues;
  }
  if (Array.isArray(details.recovery) && details.recovery.length > 0) {
    const recovery = uniqueStrings(details.recovery);
    if (recovery.length > 0) normalized.recovery = recovery;
  }
  if (Array.isArray(details.refs) && details.refs.length > 0) {
    const refs = uniqueStrings(details.refs);
    if (refs.length > 0) normalized.refs = refs;
  }
  if (details.batch) {
    const batch: ToolErrorBatch = {};
    if (typeof details.batch.index === "number")
      batch.index = details.batch.index;
    if (typeof details.batch.total === "number")
      batch.total = details.batch.total;
    if (
      typeof details.batch.operation === "string" &&
      details.batch.operation.length > 0
    ) {
      batch.operation = details.batch.operation;
    }
    if (
      typeof details.batch.path === "string" &&
      details.batch.path.length > 0
    ) {
      batch.path = details.batch.path;
    }
    if (Object.keys(batch).length > 0) normalized.batch = batch;
  }

  if (Object.keys(normalized).length === 0) {
    return undefined;
  }
  return normalized;
};

export const createError = (
  error: string,
  code: ToolCallError["code"] = "UNKNOWN",
  details?: ToolErrorDetails,
): ToolCallError => {
  const normalized = details
    ? normalizeDetails({
        ...details,
        category: details.category ?? inferErrorCategoryFromCode(code),
      })
    : undefined;

  return {
    success: false,
    error,
    code,
    ...(normalized ? { details: normalized } : {}),
  };
};

export const mergeToolErrorDetails = (
  error: ToolCallError,
  details?: ToolErrorDetails,
): ToolCallError => {
  if (!details) {
    return error;
  }

  const merged = normalizeDetails({
    ...error.details,
    ...details,
    category:
      details.category ??
      error.details?.category ??
      inferErrorCategoryFromCode(error.code),
    tool: details.tool ?? error.details?.tool,
    issues: [...(error.details?.issues ?? []), ...(details.issues ?? [])],
    recovery: [...(error.details?.recovery ?? []), ...(details.recovery ?? [])],
    refs: [...(error.details?.refs ?? []), ...(details.refs ?? [])],
    batch: details.batch ?? error.details?.batch,
  });

  if (!merged) {
    return error;
  }

  return {
    ...error,
    details: merged,
  };
};
