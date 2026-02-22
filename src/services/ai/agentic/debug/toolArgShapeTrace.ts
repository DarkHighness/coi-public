import type { ZodIssue } from "zod";
import type { ToolArgCoercionRecord } from "../toolArgs/types";

export type ToolArgShapeTraceStage =
  | "provider_args"
  | "normalized_args"
  | "validation_failure";

export interface ToolArgShapeTraceInput {
  enabled: boolean;
  stage: ToolArgShapeTraceStage;
  toolName: string;
  attempt: number;
  args: unknown;
  issues?: ZodIssue[];
  coercions?: ToolArgCoercionRecord[];
}

const formatIssuePath = (path: readonly (string | number)[]): string =>
  path.length > 0 ? path.map((segment) => String(segment)).join(".") : "(root)";

const describeShape = (value: unknown): string => {
  if (value === null) return "null";
  if (Array.isArray(value)) return `array(len=${value.length})`;
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    return `object(keys=${keys.length})`;
  }
  if (typeof value === "string") return `string(len=${value.length})`;
  return typeof value;
};

const previewValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    return value.length > 180 ? `${value.slice(0, 180)}…` : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 2);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(
      0,
      5,
    );
    return Object.fromEntries(entries);
  }
  return value;
};

const summarizeIssues = (issues: ZodIssue[] | undefined): string[] => {
  if (!issues || issues.length === 0) return [];
  return issues.slice(0, 8).map((issue) => {
    const expected =
      issue.code === "invalid_type"
        ? (issue as { expected?: unknown }).expected
        : undefined;
    const received =
      issue.code === "invalid_type"
        ? (issue as { received?: unknown }).received
        : undefined;
    const typeHint =
      expected || received
        ? ` expected=${String(expected)} received=${String(received)}`
        : "";
    return `${formatIssuePath(issue.path)} [${issue.code}]${typeHint}`;
  });
};

const summarizeCoercions = (
  coercions: ToolArgCoercionRecord[] | undefined,
): string[] => {
  if (!coercions || coercions.length === 0) return [];
  return coercions.slice(0, 8).map((record) => {
    const outcome = record.success
      ? "ok"
      : `failed${record.note ? `: ${record.note}` : ""}`;
    return `${record.path} ${record.action} -> ${outcome}`;
  });
};

export const traceToolArgShape = (input: ToolArgShapeTraceInput): void => {
  if (!input.enabled) return;

  const payload = {
    stage: input.stage,
    tool: input.toolName,
    attempt: input.attempt,
    shape: describeShape(input.args),
    preview: previewValue(input.args),
    issues: summarizeIssues(input.issues),
    coercions: summarizeCoercions(input.coercions),
  };

  console.info("[ToolArgTrace]", payload);
};
