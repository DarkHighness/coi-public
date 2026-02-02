import type { ToolCallResult } from "./types";

export const extractOpenRouterToolCalls = (
  message: Record<string, unknown> | null | undefined,
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
    let args: Record<string, unknown> = {};

    if (typeof rawArgs === "string") {
      args = JSON.parse(rawArgs) as Record<string, unknown>;
    } else if (rawArgs && typeof rawArgs === "object") {
      args = rawArgs as Record<string, unknown>;
    }

    return {
      id: call.id,
      name: fn.name || call.name || "",
      args,
      thoughtSignature:
        call.extra_content?.google?.thought_signature ||
        fn.thought_signature,
    };
  });
};
