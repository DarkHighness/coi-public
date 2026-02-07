import { ZodSchema } from "zod";
import { UnifiedMessage, TokenUsage } from "../../../types";
import {
  ProviderBase,
  ChatGenerateRequest,
  ChatGenerateResponse,
} from "../provider/interfaces";
import {
  createUserMessage,
  createAssistantMessage,
  createToolCallMessage,
  createToolResponseMessage,
} from "../../messageTypes";
import { ToolCallResult } from "../../providers/types";
import { extractJson } from "../utils";
import { formatZodError, getToolInfo } from "../../providers/utils";

export interface RetryOptions {
  maxRetries?: number;
  requiredToolName?: string;
  schema?: ZodSchema; // Root schema for direct output or forced tool
  onRetry?: (error: string, attempt: number) => void;
}

export interface RetryResult extends ChatGenerateResponse {
  retries: number;
}

const toNonNegativeInt = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
};

const estimateTokensFromChars = (charCount: number): number => {
  if (!Number.isFinite(charCount) || charCount <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(charCount / 4));
};

const stringifyForEstimation = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value ?? "");
  }
};

const estimatePromptTokens = (
  request: ChatGenerateRequest,
  history: UnifiedMessage[],
): number => {
  let chars = request.systemInstruction.length;

  for (const message of history) {
    chars += message.role.length;
    for (const part of message.content) {
      if (part.type === "text") {
        chars += part.text.length;
      } else if (part.type === "tool_use") {
        chars += part.toolUse.name.length;
        chars += stringifyForEstimation(part.toolUse.args).length;
      } else if (part.type === "tool_result") {
        chars += part.toolResult.id.length;
        chars += stringifyForEstimation(part.toolResult.content).length;
      } else {
        chars += stringifyForEstimation(part).length;
      }
    }
  }

  if (Array.isArray(request.tools)) {
    for (const tool of request.tools) {
      chars += tool.name.length;
      chars += tool.description.length;
      chars += stringifyForEstimation(tool.parameters).length;
    }
  }

  const base = estimateTokensFromChars(chars);
  const perMessageOverhead = history.length * 8;
  return Math.max(1, base + perMessageOverhead);
};

const estimateCompletionTokens = (
  result: ChatGenerateResponse["result"],
): number => {
  if (typeof result === "string") {
    return estimateTokensFromChars(result.length);
  }
  if (!result || typeof result !== "object") {
    return 0;
  }

  const payload = result as Record<string, unknown>;
  const snippets: string[] = [];

  if (typeof payload.content === "string") {
    snippets.push(payload.content);
  }
  if (typeof payload.text === "string") {
    snippets.push(payload.text);
  }
  if (typeof payload.narrative === "string") {
    snippets.push(payload.narrative);
  }

  if (Array.isArray((payload as { functionCalls?: unknown[] }).functionCalls)) {
    snippets.push(stringifyForEstimation((payload as { functionCalls?: unknown[] }).functionCalls));
  }

  if (snippets.length === 0) {
    snippets.push(stringifyForEstimation(payload));
  }

  const totalChars = snippets.reduce((acc, item) => acc + item.length, 0);
  return estimateTokensFromChars(totalChars);
};

const normalizeUsageForAccounting = (
  usage: TokenUsage,
  request: ChatGenerateRequest,
  history: UnifiedMessage[],
  result: ChatGenerateResponse["result"],
): TokenUsage => {
  const normalized: TokenUsage = {
    promptTokens: toNonNegativeInt(usage.promptTokens),
    completionTokens: toNonNegativeInt(usage.completionTokens),
    totalTokens: toNonNegativeInt(usage.totalTokens),
    ...(typeof usage.cacheRead === "number"
      ? { cacheRead: toNonNegativeInt(usage.cacheRead) }
      : {}),
    ...(typeof usage.cacheWrite === "number"
      ? { cacheWrite: toNonNegativeInt(usage.cacheWrite) }
      : {}),
    ...(typeof usage.reported === "boolean" ? { reported: usage.reported } : {}),
  };

  const hasPositiveSignal =
    normalized.promptTokens > 0 ||
    normalized.completionTokens > 0 ||
    normalized.totalTokens > 0;
  const shouldTreatAsReported =
    normalized.reported === true ||
    (typeof normalized.reported !== "boolean" && hasPositiveSignal);

  if (shouldTreatAsReported) {
    if (normalized.totalTokens <= 0) {
      normalized.totalTokens =
        normalized.promptTokens + normalized.completionTokens;
    }
    return normalized;
  }

  let estimated = false;

  if (normalized.promptTokens <= 0) {
    normalized.promptTokens = estimatePromptTokens(request, history);
    estimated = true;
  }

  if (normalized.completionTokens <= 0) {
    const completionEstimate = estimateCompletionTokens(result);
    if (completionEstimate > 0) {
      normalized.completionTokens = completionEstimate;
      estimated = true;
    }
  }

  const estimatedTotal =
    normalized.promptTokens + normalized.completionTokens;
  if (normalized.totalTokens < estimatedTotal) {
    normalized.totalTokens = estimatedTotal;
    estimated = true;
  }

  normalized.reported = false;

  if (estimated) {
    console.warn("[AgenticRetry] Provider usage incomplete, applied token estimation", {
      promptTokens: normalized.promptTokens,
      completionTokens: normalized.completionTokens,
      totalTokens: normalized.totalTokens,
    });
  }

  return normalized;
};

/**
 * Executes an AI chat generation with agentic retry logic.
 *
 * It handles:
 * 1. Missing tool calls when required.
 * 2. Automatic JSON extraction from text if native tool calls are missing.
 * 3. Schema validation failures with feedback.
 * 4. History pruning on final failure.
 */
export async function callWithAgenticRetry(
  provider: ProviderBase,
  request: ChatGenerateRequest,
  history: UnifiedMessage[],
  options: RetryOptions = {},
): Promise<RetryResult> {
  const {
    maxRetries = 3,
    requiredToolName,
    schema: rootSchema,
    onRetry,
  } = options;

  let attempt = 0;
  const initialHistoryLength = history.length;
  let totalUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
  let sawExplicitUnknownUsage = false;

  while (attempt <= maxRetries) {
    const response = await provider.generateChat({
      ...request,
      messages: history as unknown[],
    });

    const normalizedUsage = normalizeUsageForAccounting(
      response.usage,
      request,
      history,
      response.result,
    );

    // Accumulate usage
    totalUsage.promptTokens += normalizedUsage.promptTokens || 0;
    totalUsage.completionTokens += normalizedUsage.completionTokens || 0;
    totalUsage.totalTokens += normalizedUsage.totalTokens || 0;
    if (normalizedUsage.reported === true) {
      totalUsage.reported = true;
    } else if (normalizedUsage.reported === false) {
      sawExplicitUnknownUsage = true;
    }

    let result = response.result;
    let functionCalls =
      (result as { functionCalls?: ToolCallResult[] }).functionCalls || [];

    // Ensure every tool call has an ID (OpenAI requires matching IDs for responses)
    for (const fc of functionCalls) {
      if (!fc.id) {
        fc.id = `call_${Math.random().toString(36).slice(2, 11)}`;
      }
    }
    const textContent = (result as { content?: string }).content || "";

    // Extract reasoning/thinking content from providers
    // OpenAI o1/o3 and OpenRouter use _reasoning, Claude uses _thinking
    const reasoningContent =
      (result as { _reasoning?: string })._reasoning ||
      (result as { _thinking?: string })._thinking ||
      "";

    // --- 0. Silent Retry for Empty Responses ---
    // If AI returns completely empty (no content AND no tool calls), just retry silently
    // without adding any messages to history - this is likely a transient API issue
    if (!textContent && functionCalls.length === 0) {
      attempt++;
      console.warn(
        `[AgenticRetry] Empty response (no content, no tool calls). Silent retry ${attempt}/${maxRetries}`,
      );
      if (attempt > maxRetries) {
        throw new Error(
          "[ERROR: EMPTY_RESPONSE] AI returned no content and no tool calls after all retries.",
        );
      }
      continue; // Skip to next iteration without modifying history
    }

    let errorMessage: string | null = null;

    // --- 1. Automatic JSON Fallback ---
    // If no native tool calls, try to extract from text
    if (
      functionCalls.length === 0 &&
      textContent &&
      typeof textContent === "string"
    ) {
      const potentialJson = extractJson(textContent) as any;
      if (potentialJson) {
        // Find which tool this JSON might belong to
        let matchedToolName: string | null = null;
        let matchedArgs: any = null;

        // Pattern A: Virtual tool call object { name, args } or { name, arguments }
        if (
          potentialJson.name &&
          (potentialJson.args || potentialJson.arguments)
        ) {
          const toolName = potentialJson.name;
          const args = potentialJson.args || potentialJson.arguments;
          const toolDef = request.tools?.find((t) => t.name === toolName);
          if (toolDef && toolDef.parameters.safeParse(args).success) {
            matchedToolName = toolName;
            matchedArgs = args;
          }
        }

        // Pattern B: Raw arguments matching a specific tool
        if (!matchedToolName) {
          if (requiredToolName) {
            const schema =
              rootSchema ||
              request.tools?.find((t) => t.name === requiredToolName)
                ?.parameters;
            if (schema && schema.safeParse(potentialJson).success) {
              matchedToolName = requiredToolName;
              matchedArgs = potentialJson;
            }
          } else if (request.tools && request.tools.length > 0) {
            // Try to match against any available tool
            for (const tool of request.tools) {
              if (tool.parameters.safeParse(potentialJson).success) {
                matchedToolName = tool.name;
                matchedArgs = potentialJson;
                break;
              }
            }
          }
        }

        if (matchedToolName) {
          console.log(
            `[AgenticRetry] FALLBACK: Successfully extracted JSON for tool "${matchedToolName}"`,
          );
          functionCalls = [
            {
              id: `fallback_${Date.now()}`,
              name: matchedToolName,
              args: matchedArgs,
            },
          ];
          // Update result to include virtual function calls for downstream logic
          (result as any).functionCalls = functionCalls;
        }
      }
    }

    // --- 2. Required Tool Validation ---
    if (requiredToolName) {
      const hasCorrectTool = functionCalls.some(
        (fc) => fc.name === requiredToolName,
      );
      if (!hasCorrectTool) {
        errorMessage = `[ERROR: NO_TOOL_CALL] You provided a narrative response but failed to invoke the mandatory tool "${requiredToolName}". To proceed, you MUST call this tool with appropriate parameters. Bare text responses are prohibited at this stage.`;
      }
    } else if (
      request.toolChoice === "required" &&
      functionCalls.length === 0
    ) {
      errorMessage = `[ERROR: NO_TOOL_CALL] You provided a narrative response but failed to use any tools. In this agentic phase, at least one tool call is MANDATORY to proceed. Please invoke an appropriate tool from the available list. Bare text responses are prohibited.`;
    }

    // --- 3. Schema validation for each tool call ---
    if (!errorMessage && functionCalls.length > 0) {
      for (const toolCall of functionCalls) {
        const toolDef = request.tools?.find((t) => t.name === toolCall.name);
        const schema =
          toolDef?.parameters ||
          (toolCall.name === requiredToolName ? rootSchema : null);

        if (schema) {
          const validationResult = schema.safeParse(toolCall.args);
          if (!validationResult.success) {
            console.warn(`[ToolValidation] ${toolCall.name} invalid args`, {
              args: toolCall.args,
              issues: validationResult.error.issues,
            });
            const toolHint = toolDef
              ? `\n\nSchema Hint:\n${getToolInfo(toolDef as any)}`
              : "";
            errorMessage = `[ERROR: INVALID_PARAMETERS] The arguments you provided to "${toolCall.name}" were invalid.\n\nErrors:\n${formatZodError(validationResult.error)}${toolHint}\n\nPlease review the schema requirements and call "${toolCall.name}" again with corrected parameters.`;
            break;
          }
        }
      }
    }

    if (!errorMessage) {
      // Success!
      return {
        ...response,
        usage:
          totalUsage.reported === true
            ? totalUsage
            : sawExplicitUnknownUsage
              ? { ...totalUsage, reported: false }
              : totalUsage,
        retries: attempt,
      };
    }

    // --- 4. Failure - preparing for retry ---
    attempt++;
    if (attempt > maxRetries) {
      console.warn(
        `[AgenticRetry] Max retries (${maxRetries}) reached. Pruning history.`,
      );
      history.splice(initialHistoryLength);
      throw new Error(errorMessage);
    }

    console.warn(`[AgenticRetry] Attempt ${attempt} failed: ${errorMessage}`);

    // Add failure output to history for model feedback
    if (functionCalls.length > 0) {
      // 1. Add the assistant message with the tool calls (including reasoning if present)
      history.push(
        createToolCallMessage(
          functionCalls.map((fc) => ({
            id: fc.id,
            name: fc.name,
            arguments: fc.args,
            thoughtSignature: fc.thoughtSignature,
          })),
          textContent,
          reasoningContent, // Preserve reasoning/thinking content
        ),
      );

      // 2. Add the tool response message (role: 'tool') for each call ID (OpenAI requirement)
      history.push(
        createToolResponseMessage(
          functionCalls.map((fc) => ({
            toolCallId: fc.id,
            name: fc.name,
            content: { success: false, error: errorMessage },
          })),
        ),
      );
    } else {
      // If no tool calls were attempted, add the AI's response (or placeholder) before error
      // CRITICAL: Must always add assistant message to maintain proper role alternation
      // (assistant -> user -> assistant -> user, never user -> user)
      history.push(
        createAssistantMessage(
          textContent ||
            "[No response generated - validation failed before tool call]",
        ),
      );
      history.push(createUserMessage(errorMessage));
    }

    // Execute onRetry callback AFTER error messages are in history
    // This allows the callback to inject new prompts (e.g. Budget Status) that appear AFTER the error
    if (onRetry) onRetry(errorMessage, attempt);
  }

  throw new Error("Maximum retries exceeded");
}
