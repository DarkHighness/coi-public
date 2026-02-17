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

export const extractOpenRouterToolCalls = (
  message: JsonObject | null | undefined,
): ToolCallResult[] => {
  const rawCalls =
    (message as { toolCalls?: unknown }).toolCalls ||
    (message as { tool_calls?: unknown }).tool_calls;

  if (!Array.isArray(rawCalls)) {
    return [];
  }

  return rawCalls.map((tc) => {
    const call = tc as {
      id?: string;
      function?: {
        name?: string;
        arguments?: unknown;
        thought_signature?: string;
      };
      name?: string;
      arguments?: unknown;
      extra_content?: { google?: { thought_signature?: string } };
    };

    const fn = call.function || {};
    const rawArgs = fn.arguments ?? call.arguments;
    const args = parseToolArguments(rawArgs, fn.name || call.name || "unknown");

    return {
      id: call.id,
      name: fn.name || call.name || "",
      args,
      thoughtSignature:
        call.extra_content?.google?.thought_signature || fn.thought_signature,
    };
  });
};
