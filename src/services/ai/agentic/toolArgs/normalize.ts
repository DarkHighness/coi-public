import { jsonrepair } from "jsonrepair";
import type { ZodIssue, ZodSchema, ZodTypeAny } from "zod";
import {
  formatIssuePath,
  getValueAtPath,
  replaceValueAtPath,
  type ToolArgPathSegment,
} from "./pathAccess";
import { getToolArgPathMeta, getToolArgSchemaIndex } from "./schemaIndex";
import type {
  ToolArgCoercionRecord,
  ToolArgNormalizationMode,
  ToolArgNormalizationResult,
} from "./types";

const DEFAULT_NORMALIZATION_ROUNDS = 2;
const DEFAULT_MAX_STRUCTURED_STRING_CHARS = 80_000;
const MAX_COERCION_SUMMARY_LINES = 8;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const describeValueType = (value: unknown): string => {
  if (value === null) return "null";
  if (Array.isArray(value)) return `array(len=${value.length})`;
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    return `object(keys=${keys.length})`;
  }
  if (typeof value === "string") return `string(len=${value.length})`;
  return typeof value;
};

const isExpectedContainerType = (
  value: unknown,
  expected: "object" | "array",
) => (expected === "array" ? Array.isArray(value) : isPlainObject(value));

const parseExpectedType = (issue: ZodIssue): string | null => {
  if (issue.code !== "invalid_type") return null;
  const expected = (issue as { expected?: unknown }).expected;
  return typeof expected === "string" ? expected : null;
};

const parseIssueReceivedType = (issue: ZodIssue): string | null => {
  if (issue.code !== "invalid_type") return null;
  const received = (issue as { received?: unknown }).received;
  return typeof received === "string" ? received : null;
};

const toIssuePath = (issue: ZodIssue): ToolArgPathSegment[] =>
  issue.path.map((segment) =>
    typeof segment === "number" ? segment : String(segment),
  );

const normalizeEnumToken = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const matchEnumValue = (
  received: string,
  options: unknown[],
): string | null => {
  const stringOptions = options.filter(
    (option): option is string => typeof option === "string",
  );
  if (stringOptions.length === 0) return null;

  const exact = stringOptions.find(
    (option) => option.toLowerCase() === received.toLowerCase(),
  );
  if (exact) return exact;

  const normalizedReceived = normalizeEnumToken(received);
  const normalizedMatches = stringOptions.filter(
    (option) => normalizeEnumToken(option) === normalizedReceived,
  );
  if (normalizedMatches.length === 1) {
    return normalizedMatches[0];
  }
  return null;
};

const coerceBooleanString = (value: string): boolean | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
};

const INTEGER_PATTERN = /^[-+]?\d+$/;
const NUMBER_PATTERN = /^[-+]?(?:\d+\.?\d*|\.\d+)$/;

const coerceNumberString = (
  value: string,
  expectInteger: boolean,
): number | null => {
  const trimmed = value.trim();
  if (expectInteger) {
    if (!INTEGER_PATTERN.test(trimmed)) return null;
  } else if (!NUMBER_PATTERN.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  if (expectInteger && !Number.isInteger(parsed)) return null;
  return parsed;
};

const shouldTryJsonRepair = (raw: string): boolean => /^[\s]*[\[{]/.test(raw);

interface AttemptOutcome {
  nextArgs: unknown;
  record: ToolArgCoercionRecord | null;
  applied: boolean;
}

interface AttemptContext {
  currentArgs: unknown;
  issue: ZodIssue;
  maxStructuredStringChars: number;
}

const attemptIssueRepair = (
  context: AttemptContext,
  schema: ZodSchema,
): AttemptOutcome => {
  const issue = context.issue;
  const issuePath = toIssuePath(issue);
  const pathLabel = formatIssuePath(issuePath);
  const valueAtPath = getValueAtPath(context.currentArgs, issuePath);
  if (!valueAtPath.found) {
    return { nextArgs: context.currentArgs, record: null, applied: false };
  }

  const currentValue = valueAtPath.value;
  const beforeType = describeValueType(currentValue);
  const schemaMeta = getToolArgPathMeta(
    getToolArgSchemaIndex(schema as unknown as ZodTypeAny),
    issuePath,
  );

  if (issue.code === "invalid_type") {
    const expectedType = parseExpectedType(issue);
    const receivedType = parseIssueReceivedType(issue);

    if (
      (expectedType === "object" || expectedType === "array") &&
      typeof currentValue === "string" &&
      receivedType === "string"
    ) {
      if (schemaMeta?.stringStructuredUnion) {
        return {
          nextArgs: context.currentArgs,
          record: {
            path: pathLabel,
            issueCode: issue.code,
            action: `parse_json_string_to_${expectedType}`,
            success: false,
            beforeType,
            note: "skipped: path allows both string and structured values (ambiguous union)",
          },
          applied: false,
        };
      }

      if (currentValue.length > context.maxStructuredStringChars) {
        return {
          nextArgs: context.currentArgs,
          record: {
            path: pathLabel,
            issueCode: issue.code,
            action: `parse_json_string_to_${expectedType}`,
            success: false,
            beforeType,
            note: `skipped: string too long (${currentValue.length} chars)`,
          },
          applied: false,
        };
      }

      let parsed: unknown;
      let parsedAvailable = false;
      let parseFailureNote: string | null = null;
      let action = `parse_json_string_to_${expectedType}`;

      try {
        parsed = JSON.parse(currentValue);
        parsedAvailable = true;
      } catch (parseError) {
        if (!shouldTryJsonRepair(currentValue)) {
          parseFailureNote = `JSON.parse failed: ${
            parseError instanceof Error
              ? parseError.message
              : String(parseError)
          }`;
        } else {
          try {
            parsed = JSON.parse(jsonrepair(currentValue));
            parsedAvailable = true;
            action = `jsonrepair_parse_to_${expectedType}`;
          } catch (repairError) {
            parseFailureNote = `jsonrepair failed: ${
              repairError instanceof Error
                ? repairError.message
                : String(repairError)
            }`;
            action = `jsonrepair_parse_to_${expectedType}`;
          }
        }
      }

      if (parsedAvailable && isExpectedContainerType(parsed, expectedType)) {
        const replaced = replaceValueAtPath(
          context.currentArgs,
          issuePath,
          parsed,
        );
        if (!replaced.applied) {
          return {
            nextArgs: context.currentArgs,
            record: {
              path: pathLabel,
              issueCode: issue.code,
              action,
              success: false,
              beforeType,
              note: "path replacement failed",
            },
            applied: false,
          };
        }

        return {
          nextArgs: replaced.root,
          record: {
            path: pathLabel,
            issueCode: issue.code,
            action,
            success: true,
            beforeType,
            afterType: describeValueType(parsed),
          },
          applied: true,
        };
      }

      if (expectedType === "array") {
        const minItems = schemaMeta?.minItems ?? 0;
        const arrayItemMayBeComplex =
          schemaMeta?.arrayItemMayBeComplex !== false;
        if (minItems <= 1 && !arrayItemMayBeComplex) {
          const wrapped = [currentValue];
          const replaced = replaceValueAtPath(
            context.currentArgs,
            issuePath,
            wrapped,
          );
          if (replaced.applied) {
            return {
              nextArgs: replaced.root,
              record: {
                path: pathLabel,
                issueCode: issue.code,
                action: "wrap_scalar_in_array",
                success: true,
                beforeType,
                afterType: describeValueType(wrapped),
                note: parseFailureNote || undefined,
              },
              applied: true,
            };
          }
        }
      }

      const fallbackNote =
        parseFailureNote ||
        (parsedAvailable
          ? `parsed result is ${describeValueType(parsed)}, expected ${expectedType}`
          : "failed to coerce string into structured value");
      return {
        nextArgs: context.currentArgs,
        record: {
          path: pathLabel,
          issueCode: issue.code,
          action,
          success: false,
          beforeType,
          note: fallbackNote,
        },
        applied: false,
      };
    }

    if (
      (expectedType === "integer" ||
        expectedType === "number" ||
        expectedType === "boolean") &&
      receivedType === "string" &&
      typeof currentValue === "string"
    ) {
      let coerced: unknown = null;
      if (expectedType === "boolean") {
        coerced = coerceBooleanString(currentValue);
      } else {
        const expectInteger =
          expectedType === "integer" ||
          schemaMeta?.expectedTypes.has("integer");
        coerced = coerceNumberString(currentValue, Boolean(expectInteger));
      }

      if (coerced === null) {
        return {
          nextArgs: context.currentArgs,
          record: {
            path: pathLabel,
            issueCode: issue.code,
            action: `coerce_string_to_${expectedType}`,
            success: false,
            beforeType,
            note: "input string is outside supported coercion range",
          },
          applied: false,
        };
      }

      const replaced = replaceValueAtPath(
        context.currentArgs,
        issuePath,
        coerced,
      );
      if (!replaced.applied) {
        return {
          nextArgs: context.currentArgs,
          record: {
            path: pathLabel,
            issueCode: issue.code,
            action: `coerce_string_to_${expectedType}`,
            success: false,
            beforeType,
            note: "path replacement failed",
          },
          applied: false,
        };
      }

      return {
        nextArgs: replaced.root,
        record: {
          path: pathLabel,
          issueCode: issue.code,
          action: `coerce_string_to_${expectedType}`,
          success: true,
          beforeType,
          afterType: describeValueType(coerced),
        },
        applied: true,
      };
    }

    if (expectedType === "array" && !Array.isArray(currentValue)) {
      const minItems = schemaMeta?.minItems ?? 0;
      const arrayItemMayBeComplex = schemaMeta?.arrayItemMayBeComplex !== false;
      if (minItems > 1 || arrayItemMayBeComplex) {
        return {
          nextArgs: context.currentArgs,
          record: {
            path: pathLabel,
            issueCode: issue.code,
            action: "wrap_scalar_in_array",
            success: false,
            beforeType,
            note:
              minItems > 1
                ? `skipped: minItems=${minItems} requires semantic completion`
                : "skipped: array item type is complex/ambiguous",
          },
          applied: false,
        };
      }

      const wrapped = [currentValue];
      const replaced = replaceValueAtPath(
        context.currentArgs,
        issuePath,
        wrapped,
      );
      if (!replaced.applied) {
        return {
          nextArgs: context.currentArgs,
          record: {
            path: pathLabel,
            issueCode: issue.code,
            action: "wrap_scalar_in_array",
            success: false,
            beforeType,
            note: "path replacement failed",
          },
          applied: false,
        };
      }

      return {
        nextArgs: replaced.root,
        record: {
          path: pathLabel,
          issueCode: issue.code,
          action: "wrap_scalar_in_array",
          success: true,
          beforeType,
          afterType: describeValueType(wrapped),
        },
        applied: true,
      };
    }
  }

  if (issue.code === "invalid_enum_value" && typeof currentValue === "string") {
    const options = Array.isArray((issue as { options?: unknown }).options)
      ? (((issue as { options?: unknown[] }).options as unknown[]) ?? [])
      : [];
    const matched = matchEnumValue(currentValue, options);
    if (!matched || matched === currentValue) {
      return {
        nextArgs: context.currentArgs,
        record: {
          path: pathLabel,
          issueCode: issue.code,
          action: "normalize_enum_string",
          success: false,
          beforeType,
          note: matched
            ? "already normalized"
            : "no safe enum normalization match",
        },
        applied: false,
      };
    }

    const replaced = replaceValueAtPath(
      context.currentArgs,
      issuePath,
      matched,
    );
    if (!replaced.applied) {
      return {
        nextArgs: context.currentArgs,
        record: {
          path: pathLabel,
          issueCode: issue.code,
          action: "normalize_enum_string",
          success: false,
          beforeType,
          note: "path replacement failed",
        },
        applied: false,
      };
    }

    return {
      nextArgs: replaced.root,
      record: {
        path: pathLabel,
        issueCode: issue.code,
        action: "normalize_enum_string",
        success: true,
        beforeType,
        afterType: describeValueType(matched),
      },
      applied: true,
    };
  }

  return { nextArgs: context.currentArgs, record: null, applied: false };
};

interface NormalizeToolArgsInput {
  schema: ZodSchema;
  args: unknown;
  mode?: ToolArgNormalizationMode;
  maxRounds?: number;
  maxStructuredStringChars?: number;
}

export const normalizeToolArgs = (
  input: NormalizeToolArgsInput,
): ToolArgNormalizationResult => {
  const mode = input.mode ?? "safe";
  if (mode === "off") {
    return {
      args: input.args,
      coercions: [],
      changed: false,
      rounds: 0,
    };
  }

  const maxRounds = Math.max(
    1,
    input.maxRounds ?? DEFAULT_NORMALIZATION_ROUNDS,
  );
  const maxStructuredStringChars = Math.max(
    256,
    input.maxStructuredStringChars ?? DEFAULT_MAX_STRUCTURED_STRING_CHARS,
  );

  // Warm schema cache once per normalization call.
  getToolArgSchemaIndex(input.schema as unknown as ZodTypeAny);

  let currentArgs = input.args;
  let changed = false;
  const coercions: ToolArgCoercionRecord[] = [];
  let rounds = 0;
  let validationResult = input.schema.safeParse(currentArgs);

  if (validationResult.success) {
    return {
      args: currentArgs,
      coercions,
      changed,
      rounds,
    };
  }

  for (let round = 1; round <= maxRounds; round += 1) {
    rounds = round;
    const issues = validationResult.error.issues;
    let appliedInRound = false;

    for (const issue of issues) {
      const attempt = attemptIssueRepair(
        {
          currentArgs,
          issue,
          maxStructuredStringChars,
        },
        input.schema,
      );

      if (attempt.record) {
        coercions.push(attempt.record);
      }

      if (!attempt.applied) {
        continue;
      }

      appliedInRound = true;
      changed = true;
      currentArgs = attempt.nextArgs;
      validationResult = input.schema.safeParse(currentArgs);
      if (validationResult.success) {
        return {
          args: currentArgs,
          coercions,
          changed,
          rounds,
        };
      }
    }

    if (!appliedInRound) {
      break;
    }

    validationResult = input.schema.safeParse(currentArgs);
    if (validationResult.success) {
      return {
        args: currentArgs,
        coercions,
        changed,
        rounds,
      };
    }
  }

  return {
    args: currentArgs,
    coercions,
    changed,
    rounds,
  };
};

export const formatToolArgCoercionSummary = (
  coercions: ToolArgCoercionRecord[],
): string => {
  if (coercions.length === 0) {
    return "";
  }

  const lines = coercions.slice(0, MAX_COERCION_SUMMARY_LINES).map((record) => {
    const outcome = record.success
      ? `ok (${record.beforeType} -> ${record.afterType || "unknown"})`
      : `failed (${record.beforeType})${record.note ? `: ${record.note}` : ""}`;
    return `- ${record.path}: ${record.action} -> ${outcome}`;
  });

  if (coercions.length > MAX_COERCION_SUMMARY_LINES) {
    lines.push(
      `- ...and ${coercions.length - MAX_COERCION_SUMMARY_LINES} more normalization attempt(s)`,
    );
  }

  return lines.join("\n");
};
