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

  while (attempt <= maxRetries) {
    const response = await provider.generateChat({
      ...request,
      messages: history as unknown[],
    });

    // Accumulate usage
    totalUsage.promptTokens += response.usage.promptTokens || 0;
    totalUsage.completionTokens += response.usage.completionTokens || 0;
    totalUsage.totalTokens += response.usage.totalTokens || 0;

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
        usage: totalUsage,
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
    if (onRetry) onRetry(errorMessage, attempt);

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
  }

  throw new Error("Maximum retries exceeded");
}
