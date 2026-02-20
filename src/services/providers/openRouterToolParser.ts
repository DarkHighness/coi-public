import type { JsonObject, ToolArguments } from "../../types";
import { MalformedToolCallError, type ToolCallResult } from "./types";

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
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawArgs);
    } catch (error) {
      throw new MalformedToolCallError("openrouter", toolName, error);
    }
    if (!isJsonObject(parsed)) {
      throw new MalformedToolCallError(
        "openrouter",
        `${toolName}: arguments must be a JSON object`,
      );
    }
    return parsed;
  }
  if (isJsonObject(rawArgs)) {
    return rawArgs;
  }
  throw new MalformedToolCallError(
    "openrouter",
    `${toolName}: invalid tool args type`,
  );
};

const readNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getRawToolCalls = (message: JsonObject | null | undefined): unknown[] => {
  if (!message) {
    return [];
  }
  const rawCalls =
    (message as { toolCalls?: unknown }).toolCalls ||
    (message as { tool_calls?: unknown }).tool_calls;
  return Array.isArray(rawCalls) ? rawCalls : [];
};

export const collectOpenRouterToolNameHints = (
  message: JsonObject | null | undefined,
): string[] => {
  const names = new Set<string>();
  for (const tc of getRawToolCalls(message)) {
    const call = tc as { function?: { name?: unknown }; name?: unknown };
    const functionName = readNonEmptyString(call.function?.name);
    const fallbackName = readNonEmptyString(call.name);
    const name = functionName || fallbackName;
    if (name) {
      names.add(name);
    }
  }
  return Array.from(names);
};

export const extractOpenRouterToolCalls = (
  message: JsonObject | null | undefined,
): ToolCallResult[] => {
  const rawCalls = getRawToolCalls(message);

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
