import { ZodSchema } from "zod";
import {
  UnifiedMessage,
  TokenUsage
} from "../../../types";
import {
  ProviderBase,
  ChatGenerateRequest,
  ChatGenerateResponse
} from "../provider/interfaces";
import {
  createUserMessage,
  createToolCallMessage
} from "../../messageTypes";
import { ToolCallResult } from "../../providers/types";
import { extractJson } from "../utils";

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
  options: RetryOptions = {}
): Promise<RetryResult> {
  const {
    maxRetries = 3,
    requiredToolName,
    schema: rootSchema,
    onRetry
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
    let functionCalls = (result as { functionCalls?: ToolCallResult[] }).functionCalls || [];
    const textContent = (result as { content?: string }).content || "";

    let errorMessage: string | null = null;

    // --- 1. Automatic JSON Fallback ---
    // If no native tool calls, try to extract from text
    if (functionCalls.length === 0 && textContent && typeof textContent === "string") {
      const potentialJson = extractJson(textContent) as any;
      if (potentialJson) {
        // Find which tool this JSON might belong to
        let matchedToolName: string | null = null;
        let matchedArgs: any = null;

        // Pattern A: Virtual tool call object { name, args } or { name, arguments }
        if (potentialJson.name && (potentialJson.args || potentialJson.arguments)) {
          const toolName = potentialJson.name;
          const args = potentialJson.args || potentialJson.arguments;
          const toolDef = request.tools?.find(t => t.name === toolName);
          if (toolDef && toolDef.parameters.safeParse(args).success) {
            matchedToolName = toolName;
            matchedArgs = args;
          }
        }

        // Pattern B: Raw arguments matching a specific tool
        if (!matchedToolName) {
          if (requiredToolName) {
            const schema = rootSchema || request.tools?.find(t => t.name === requiredToolName)?.parameters;
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
          console.log(`[AgenticRetry] FALLBACK: Successfully extracted JSON for tool "${matchedToolName}"`);
          functionCalls = [{
            id: `fallback_${Date.now()}`,
            name: matchedToolName,
            args: matchedArgs,
          }];
          // Update result to include virtual function calls for downstream logic
          (result as any).functionCalls = functionCalls;
        }
      }
    }

    // --- 2. Required Tool Validation ---
    if (requiredToolName) {
      const hasCorrectTool = functionCalls.some(fc => fc.name === requiredToolName);
      if (!hasCorrectTool) {
        errorMessage = `[ERROR: NO_TOOL_CALL] You provided a narrative response but failed to invoke the mandatory tool "${requiredToolName}". To proceed, you MUST call this tool with appropriate parameters. Bare text responses are prohibited at this stage.`;
      }
    } else if (request.toolChoice === "required" && functionCalls.length === 0) {
      errorMessage = `[ERROR: NO_TOOL_CALL] You provided a narrative response but failed to use any tools. In this agentic phase, at least one tool call is MANDATORY to proceed. Please invoke an appropriate tool from the available list. Bare text responses are prohibited.`;
    }

    // --- 3. Schema validation for each tool call ---
    if (!errorMessage && functionCalls.length > 0) {
      for (const toolCall of functionCalls) {
        const toolDef = request.tools?.find(t => t.name === toolCall.name);
        const schema = toolDef?.parameters || (toolCall.name === requiredToolName ? rootSchema : null);

        if (schema) {
          try {
            schema.parse(toolCall.args);
          } catch (e: any) {
            const zodErrors = e.errors?.map((err: any) => `- ${err.path.join(".")}: ${err.message}`).join("\n") || e.message;
            errorMessage = `[ERROR: INVALID_PARAMETERS] The arguments you provided to "${toolCall.name}" were invalid.\nValidation Errors:\n${zodErrors}\nPlease review the schema requirements and call "${toolCall.name}" again with corrected parameters.`;
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
      console.warn(`[AgenticRetry] Max retries (${maxRetries}) reached. Pruning history.`);
      history.splice(initialHistoryLength);
      throw new Error(errorMessage);
    }

    console.warn(`[AgenticRetry] Attempt ${attempt} failed: ${errorMessage}`);
    if (onRetry) onRetry(errorMessage, attempt);

    // Add failure output to history for model feedback
    history.push(createToolCallMessage(
      functionCalls.map(fc => ({
        id: fc.id,
        name: fc.name,
        arguments: fc.args,
      })),
      textContent
    ));
    history.push(createUserMessage(errorMessage));
  }

  throw new Error("Maximum retries exceeded");
}
