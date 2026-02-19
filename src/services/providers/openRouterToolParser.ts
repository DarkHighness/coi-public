import type { JsonObject, ToolArguments } from "../../types";
import type { ToolCallResult } from "./types";

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseToolArguments = (
  rawArgs: unknown,
  toolName: string,
): ToolArguments => {
  if (rawArgs === undefined) {
    return {};
  }
  if (typeof rawArgs === "string") {
    const parsed = JSON.parse(rawArgs);
    if (!isJsonObject(parsed)) {
      throw new Error(
        `[OpenRouter] Tool args must be a JSON object for ${toolName}`,
      );
    }
    return parsed;
  }
  if (isJsonObject(rawArgs)) {
    return rawArgs;
  }
  throw new Error(`[OpenRouter] Invalid tool args type for ${toolName}`);
};

const readNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const extractOpenRouterToolCalls = (
  message: JsonObject | null | undefined,
): ToolCallResult[] => {
  const rawCalls =
    (message as { toolCalls?: unknown }).toolCalls ||
    (message as { tool_calls?: unknown }).tool_calls;

  if (!Array.isArray(rawCalls)) {
    return [];
  }

  const parsedCalls: ToolCallResult[] = [];

  for (const tc of rawCalls) {
    const call = tc as {
      id?: string;
      function?: {
        name?: unknown;
        arguments?: unknown;
        thought_signature?: string;
      };
      name?: unknown;
      arguments?: unknown;
      extra_content?: { google?: { thought_signature?: string } };
    };

    const fn = call.function || {};
    const functionName = readNonEmptyString(fn.name);
    const fallbackName = readNonEmptyString(call.name);
    const name = functionName || fallbackName;

    // Skip non-function entries (for example url_citation) instead of emitting blank tool calls.
    if (!name) {
      continue;
    }

    const hasFunctionArguments =
      typeof call.function === "object" &&
      call.function !== null &&
      Object.prototype.hasOwnProperty.call(call.function, "arguments");
    const rawArgs = hasFunctionArguments ? fn.arguments : call.arguments;
    const args = parseToolArguments(rawArgs, name);

    parsedCalls.push({
      id: call.id,
      name,
      args,
      thoughtSignature:
        call.extra_content?.google?.thought_signature || fn.thought_signature,
    });
  }

  return parsedCalls;
};
