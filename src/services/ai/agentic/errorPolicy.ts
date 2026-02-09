import { AIProviderError } from "../../providers/types";
import {
  isContextLengthError,
  isInvalidArgumentError,
} from "../contextCompressor";

export type AgenticErrorKind =
  | "silent_retry"
  | "model_fixable"
  | "rebuild_required"
  | "terminal"
  | "unknown";

export interface AgenticErrorClassification {
  kind: AgenticErrorKind;
  rawMessage: string;
  providerCode?: string;
  isMalformedToolCall: boolean;
}

const SILENT_RETRY_PATTERN =
  /429|rate\s*limit|too many requests|timeout|timed out|network|econnreset|connection reset|socket hang up|ehostunreach|enotfound|temporarily unavailable|service unavailable|overloaded|502|503|504|gateway timeout|aborted/i;

const MALFORMED_TOOL_CALL_PATTERN =
  /malformed[_\s-]*(function|tool)\s*call|invalid[_\s-]*(function|tool)\s*call|tool call args|tool_call/i;

const MODEL_FIXABLE_PATTERN =
  /invalid[_\s-]*parameters?|schema validation|json parse|must be last|multiple finish|forced finish|no tool call/i;

const TERMINAL_PATTERN = /safety|quota|unsupported/i;

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error || "");

export function classifyAgenticError(
  error: unknown,
): AgenticErrorClassification {
  const rawMessage = toMessage(error);
  const providerCode =
    error instanceof AIProviderError && typeof error.code === "string"
      ? error.code
      : undefined;

  const isMalformedToolCall =
    providerCode === "MALFORMED_TOOL_CALL" ||
    MALFORMED_TOOL_CALL_PATTERN.test(rawMessage);

  if (providerCode === "MALFORMED_TOOL_CALL" || isMalformedToolCall) {
    return {
      kind: "model_fixable",
      rawMessage,
      providerCode,
      isMalformedToolCall: true,
    };
  }

  if (isContextLengthError(error) || isInvalidArgumentError(error)) {
    return {
      kind: "rebuild_required",
      rawMessage,
      providerCode,
      isMalformedToolCall,
    };
  }

  if (
    providerCode === "SAFETY" ||
    providerCode === "QUOTA_EXHAUSTED" ||
    providerCode === "UNSUPPORTED" ||
    TERMINAL_PATTERN.test(rawMessage)
  ) {
    return {
      kind: "terminal",
      rawMessage,
      providerCode,
      isMalformedToolCall,
    };
  }

  if (SILENT_RETRY_PATTERN.test(rawMessage)) {
    return {
      kind: "silent_retry",
      rawMessage,
      providerCode,
      isMalformedToolCall,
    };
  }

  if (MODEL_FIXABLE_PATTERN.test(rawMessage)) {
    return {
      kind: "model_fixable",
      rawMessage,
      providerCode,
      isMalformedToolCall,
    };
  }

  return {
    kind: "unknown",
    rawMessage,
    providerCode,
    isMalformedToolCall,
  };
}

const normalizeRawError = (message: string): string => {
  const normalized = message?.trim() || "Unknown provider error";
  return normalized.length > 500 ? `${normalized.slice(0, 500)}...` : normalized;
};

export function buildMalformedToolCallFeedback(options: {
  rawMessage: string;
  finishToolName?: string;
}): string {
  const raw = normalizeRawError(options.rawMessage);
  const finishRule = options.finishToolName
    ? ` If you call "${options.finishToolName}", it must be the LAST tool call.`
    : "";

  return (
    `[ERROR: MALFORMED_TOOL_CALL] Provider rejected the tool call payload.\n` +
    `Raw provider error: ${raw}\n` +
    `Please retry with valid JSON arguments that match the tool schema and required fields.${finishRule}`
  );
}
