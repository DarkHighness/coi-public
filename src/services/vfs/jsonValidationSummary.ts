import { z } from "zod";

const MAX_ISSUES = 3;
const MAX_DIRECT_SUBFIELDS = 8;
const MAX_ISSUE_MESSAGE_CHARS = 180;

export interface JsonValidationIssueSummary {
  pointer: string;
  message: string;
  directSubfields: string[];
}

const escapeJsonPointerToken = (token: string): string =>
  token.replace(/~/g, "~0").replace(/\//g, "~1");

const toJsonPointer = (path: Array<string | number>): string => {
  if (path.length === 0) {
    return "/";
  }
  return `/${path.map((segment) => escapeJsonPointerToken(String(segment))).join("/")}`;
};

const truncateMessage = (message: string): string => {
  const trimmed = message.trim();
  if (trimmed.length <= MAX_ISSUE_MESSAGE_CHARS) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_ISSUE_MESSAGE_CHARS)}...`;
};

const getValueAtPath = (
  root: unknown,
  path: Array<string | number>,
): unknown => {
  let current: unknown = root;
  for (const segment of path) {
    if (Array.isArray(current)) {
      if (typeof segment !== "number") {
        return undefined;
      }
      current = current[segment];
      continue;
    }

    if (!current || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[String(segment)];
  }
  return current;
};

const collectDirectSubfields = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    const size = Math.min(value.length, MAX_DIRECT_SUBFIELDS);
    return Array.from({ length: size }, (_, index) => String(index));
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  return Object.keys(value as Record<string, unknown>).slice(
    0,
    MAX_DIRECT_SUBFIELDS,
  );
};

export const summarizeJsonValidationError = (
  error: unknown,
  document: unknown,
): JsonValidationIssueSummary[] | null => {
  if (!(error instanceof z.ZodError)) {
    return null;
  }

  return error.issues.slice(0, MAX_ISSUES).map((issue) => {
    const path = issue.path.map((segment) =>
      typeof segment === "number" ? segment : String(segment),
    );
    const pointer = toJsonPointer(path);

    const targetValue = getValueAtPath(document, path);
    let directSubfields = collectDirectSubfields(targetValue);
    if (directSubfields.length === 0 && path.length > 0) {
      directSubfields = collectDirectSubfields(
        getValueAtPath(document, path.slice(0, -1)),
      );
    }

    return {
      pointer,
      message: truncateMessage(issue.message),
      directSubfields,
    };
  });
};

export const formatJsonValidationSummary = (
  summaries: JsonValidationIssueSummary[],
): string =>
  summaries
    .map((summary) => {
      if (summary.directSubfields.length > 0) {
        return `${summary.pointer}: ${summary.message}; directSubfields=[${summary.directSubfields.join(", ")}]`;
      }
      return `${summary.pointer}: ${summary.message}`;
    })
    .join(" | ");
