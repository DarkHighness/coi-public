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
import {
  AgenticErrorKind,
  buildMalformedToolCallFeedback,
  classifyAgenticError,
} from "./errorPolicy";
import type { ZodError } from "zod";

export interface RetryOptions {
  maxRetries?: number;
  requiredToolName?: string;
  finishToolName?: string;
  schema?: ZodSchema; // Root schema for direct output or forced tool
  onRetry?: (
    error: string,
    attempt: number,
    metadata?: {
      silent?: boolean;
      classification?: AgenticErrorKind;
    },
  ) => void;
}

export interface RetryResult extends ChatGenerateResponse {
  retries: number;
}

const MAX_VALIDATION_ISSUES_IN_ERROR = 4;

const toRecord = (value: unknown): JsonObject | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;

const normalizeFinishTurnArgsForValidation = (
  args: JsonObject,
): JsonObject => {
  const normalized: JsonObject = { ...args };

  if ("userAction" in normalized) {
    delete normalized.userAction;
  }

  const retconAck = toRecord(normalized.retconAck);
  if (retconAck) {
    const nextRetconAck = { ...retconAck };
    if ("hash" in nextRetconAck) {
      delete nextRetconAck.hash;
    }
    if (Object.keys(nextRetconAck).length === 0) {
      delete normalized.retconAck;
    } else {
      normalized.retconAck = nextRetconAck;
    }
  }

  return normalized;
};

const normalizeToolArgsForValidation = (
  toolName: string,
  args: JsonObject,
): JsonObject => {
  if (toolName === "vfs_finish_turn") {
    return normalizeFinishTurnArgsForValidation(args);
  }
  return args;
};

const summarizeZodIssues = (
  error: ZodError,
  maxIssues: number = MAX_VALIDATION_ISSUES_IN_ERROR,
): string => {
  const issues = error.issues || [];
  const lines = issues
    .slice(0, maxIssues)
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `- ${path}: ${issue.message}`;
    });

  if (issues.length > maxIssues) {
    lines.push(`- ...and ${issues.length - maxIssues} more issue(s)`);
  }

  return lines.join("\n");
};

const buildDiscriminatorTypeHint = (error: ZodError): string | null => {
  for (const issue of error.issues) {
    if (issue.code !== "invalid_union_discriminator") continue;
    const path = issue.path.length > 0 ? issue.path.join(".") : "";
    if (path !== "phase") continue;
    const options = Array.isArray((issue as { options?: unknown }).options)
      ? ((issue as { options?: unknown[] }).options ?? [])
      : [];
    if (options.length === 0) continue;
    if (options.every((value) => typeof value === "number")) {
      return 'Hint: phase must be integer literal, e.g. `phase: 1` (not `"1"`). If your previous call used `"phase":"1"`, resend with `"phase":1` and keep `data` unchanged.';
    }
  }
  return null;
};

const buildToolDocBoundedReadHint = (params: {
  toolDocRef: string;
  toolExamplesRef: string;
  toolSchemaRef: string;
}): string =>
  `Use \`vfs_read_chars({ path: "${params.toolDocRef}" })\` + \`vfs_read_chars({ path: "${params.toolExamplesRef}" })\` + \`vfs_read_chars({ path: "${params.toolSchemaRef}" })\` before retrying; if schema summary points to PART files, read only needed PART-xx.md.`;

const buildInvalidParametersMessage = (params: {
  toolName: string;
  validationError: ZodError;
  toolDocRef: string;
  toolExamplesRef: string;
  toolSchemaRef: string;
  includeReadHint: boolean;
  repeatedGuidance: boolean;
}): string => {
  const {
    toolName,
    validationError,
    toolDocRef,
    toolExamplesRef,
    toolSchemaRef,
    includeReadHint,
    repeatedGuidance,
  } = params;
  const issueSummary = summarizeZodIssues(validationError);
  const hints: string[] = [
    `Tool docs: \`${toolDocRef}\` + \`${toolExamplesRef}\``,
    `Schema docs: \`${toolSchemaRef}\``,
    "Docs index: `current/refs/tools/README.md`",
    "Schema index: `current/refs/tool-schemas/index.json`",
  ];
  const discriminatorTypeHint = buildDiscriminatorTypeHint(validationError);
  if (discriminatorTypeHint) {
    hints.push(discriminatorTypeHint);
  }
  if (includeReadHint) {
    hints.push(
      buildToolDocBoundedReadHint({
        toolDocRef,
        toolExamplesRef,
        toolSchemaRef,
      }),
    );
  }
  if (repeatedGuidance) {
    hints.push("Schema guidance was already provided earlier in this retry chain.");
  }

  return (
    `[ERROR: INVALID_PARAMETERS] The arguments you provided to "${toolName}" were invalid.\n` +
    `Top issues:\n${issueSummary}\n` +
    `${hints.join("\n")}`
  );
};

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

export const estimatePromptTokens = (
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

  const payload = result as JsonObject;
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
    snippets.push(
      stringifyForEstimation(
        (payload as { functionCalls?: unknown[] }).functionCalls,
      ),
    );
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
    ...(typeof usage.reported === "boolean"
      ? { reported: usage.reported }
      : {}),
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

  const estimatedTotal = normalized.promptTokens + normalized.completionTokens;
  if (normalized.totalTokens < estimatedTotal) {
    normalized.totalTokens = estimatedTotal;
    estimated = true;
  }

  normalized.reported = false;

  if (estimated) {
    console.warn(
      "[AgenticRetry] Provider usage incomplete, applied token estimation",
      {
        promptTokens: normalized.promptTokens,
        completionTokens: normalized.completionTokens,
        totalTokens: normalized.totalTokens,
      },
    );
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
    finishToolName,
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
  const schemaGuidanceShownByTool = new Set<string>();

  while (attempt <= maxRetries) {
    let response: ChatGenerateResponse;
    try {
      response = await provider.generateChat({
        ...request,
        messages: history as unknown[],
      });
    } catch (providerError) {
      const classified = classifyAgenticError(providerError);
      const isRetryable =
        classified.kind === "silent_retry" ||
        classified.kind === "model_fixable";

      if (!isRetryable || attempt >= maxRetries) {
        const fallback =
          providerError instanceof Error
            ? providerError
            : new Error(String(providerError));

        if (classified.kind === "unknown") {
          throw new Error(
            `[ERROR: UNKNOWN_PROVIDER_ERROR] Provider returned an unexpected, non-retryable error. ` +
              `Raw provider details: ${classified.rawMessage || fallback.message}. ` +
              "Confirm provider health (credentials, rate limits, network) before retrying; escalate if it persists.",
          );
        }

        throw fallback;
      }

      attempt++;

      if (classified.kind === "silent_retry") {
        console.warn(
          `[AgenticRetry] Silent retry ${attempt}/${maxRetries}: ${classified.rawMessage}`,
        );
        if (onRetry) {
          onRetry(classified.rawMessage, attempt, {
            silent: true,
            classification: classified.kind,
          });
        }
        continue;
      }

      const feedback = classified.isMalformedToolCall
        ? buildMalformedToolCallFeedback({
            rawMessage: classified.rawMessage,
            finishToolName,
          })
        : `[ERROR: PROVIDER_CALL_FAILED] Provider rejected this tool call. ` +
          `Raw provider details: ${classified.rawMessage}. ` +
          "Validate the tool payload (JSON vs. schema) and provider status before retrying once the underlying issue is fixed.";

      history.push(
        createAssistantMessage(
          "[No response generated - provider rejected this attempt]",
        ),
      );
      history.push(createUserMessage(feedback));

      if (onRetry) {
        onRetry(feedback, attempt, {
          silent: false,
          classification: classified.kind,
        });
      }
      continue;
    }

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
    const invalidToolCallErrors = new Map<
      string,
      {
        name: string;
        error: string;
      }
    >();

    // --- 1. Automatic JSON Fallback ---
    // If no native tool calls, try to extract from text
    if (
      functionCalls.length === 0 &&
      textContent &&
      typeof textContent === "string"
    ) {
      const potentialJson = extractJson(textContent);
      if (potentialJson) {
        // Find which tool this JSON might belong to
        let matchedToolName: string | null = null;
        let matchedArgs: JsonObject | null = null;
        const potentialRecord = toRecord(potentialJson);

        // Pattern A: Virtual tool call object { name, args } or { name, arguments }
        if (
          potentialRecord &&
          typeof potentialRecord.name === "string" &&
          (potentialRecord.args || potentialRecord.arguments)
        ) {
          const toolName = potentialRecord.name;
          const argsRecord = toRecord(
            potentialRecord.args ?? potentialRecord.arguments,
          );
          const toolDef = request.tools?.find((t) => t.name === toolName);
          const normalizedArgsRecord = argsRecord
            ? normalizeToolArgsForValidation(toolName, argsRecord)
            : argsRecord;
          if (
            toolDef &&
            normalizedArgsRecord &&
            toolDef.parameters.safeParse(normalizedArgsRecord).success
          ) {
            matchedToolName = toolName;
            matchedArgs = normalizedArgsRecord;
          }
        }

        // Pattern B: Raw arguments matching a specific tool
        if (!matchedToolName && potentialRecord) {
          if (requiredToolName) {
            const schema =
              rootSchema ||
              request.tools?.find((t) => t.name === requiredToolName)
                ?.parameters;
            const normalizedPotential = normalizeToolArgsForValidation(
              requiredToolName,
              potentialRecord,
            );
            if (schema && schema.safeParse(normalizedPotential).success) {
              matchedToolName = requiredToolName;
              matchedArgs = normalizedPotential;
            }
          } else if (request.tools && request.tools.length > 0) {
            // Try to match against any available tool
            for (const tool of request.tools) {
              const normalizedPotential = normalizeToolArgsForValidation(
                tool.name,
                potentialRecord,
              );
              if (tool.parameters.safeParse(normalizedPotential).success) {
                matchedToolName = tool.name;
                matchedArgs = normalizedPotential;
                break;
              }
            }
          }
        }

        if (matchedToolName && matchedArgs) {
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
          if (result && typeof result === "object") {
            (result as JsonObject).functionCalls = functionCalls;
          } else {
            result = { functionCalls };
          }
        }
      }
    }

    // --- 2. Required Tool Validation ---
    if (requiredToolName) {
      const hasCorrectTool = functionCalls.some(
        (fc) => fc.name === requiredToolName,
      );
      if (!hasCorrectTool) {
        errorMessage = `[ERROR: NO_TOOL_CALL] Mandatory tool "${requiredToolName}" was not called. Call it with valid arguments; plain-text response is not allowed in this step.`;
      }
    } else if (
      request.toolChoice === "required" &&
      functionCalls.length === 0
    ) {
      errorMessage = `[ERROR: NO_TOOL_CALL] No tool was called. At least one tool call is required in this step; plain-text response is not allowed.`;
    }

    // --- 3. Schema validation for each tool call ---
    if (!errorMessage && functionCalls.length > 0) {
      for (const toolCall of functionCalls) {
        const toolDef = request.tools?.find((t) => t.name === toolCall.name);
        const schema =
          toolDef?.parameters ||
          (toolCall.name === requiredToolName ? rootSchema : null);

        if (schema) {
          const normalizedArgs = normalizeToolArgsForValidation(
            toolCall.name,
            toolCall.args,
          );
          const primaryValidation = schema.safeParse(normalizedArgs);
          const validationResult =
            !primaryValidation.success && normalizedArgs !== toolCall.args
              ? schema.safeParse(toolCall.args)
              : primaryValidation;

          if (validationResult.success) {
            if (
              primaryValidation.success &&
              normalizedArgs !== toolCall.args
            ) {
              toolCall.args = normalizedArgs;
            }
            continue;
          }

          if (!validationResult.success) {
            console.warn(`[ToolValidation] ${toolCall.name} invalid args`, {
              args: toolCall.args,
              issues: validationResult.error.issues,
            });
            const toolDocRef = `current/refs/tools/${toolCall.name}/README.md`;
            const toolExamplesRef = `current/refs/tools/${toolCall.name}/EXAMPLES.md`;
            const toolSchemaRef = `current/refs/tool-schemas/${toolCall.name}/README.md`;
            const wasGuidanceShown = schemaGuidanceShownByTool.has(
              toolCall.name,
            );

            if (toolDef && !wasGuidanceShown) {
              schemaGuidanceShownByTool.add(toolCall.name);
            }

            const validationErrorMessage = buildInvalidParametersMessage({
              toolName: toolCall.name,
              validationError: validationResult.error,
              toolDocRef,
              toolExamplesRef,
              toolSchemaRef,
              includeReadHint: Boolean(toolDef && !wasGuidanceShown),
              repeatedGuidance: Boolean(toolDef && wasGuidanceShown),
            });
            invalidToolCallErrors.set(toolCall.id, {
              name: toolCall.name,
              error: validationErrorMessage,
            });
          }
        }
      }
    }

    if (!errorMessage && invalidToolCallErrors.size > 0) {
      if (invalidToolCallErrors.size < functionCalls.length) {
        console.warn(
          `[ToolValidation] ${invalidToolCallErrors.size}/${functionCalls.length} tool calls have invalid args; allowing partial execution for valid calls.`,
        );
      } else {
        // All calls are invalid: keep retry behavior but preserve per-tool error mapping.
        errorMessage = Array.from(invalidToolCallErrors.values())[0]?.error || null;
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
          functionCalls.map((fc) => {
            if (invalidToolCallErrors.size === 0) {
                return {
                  toolCallId: fc.id,
                  name: fc.name,
                  content: {
                    success: false,
                    code: "EXECUTION_ERROR",
                    error: errorMessage,
                  },
                };
              }

            const invalidDetail = invalidToolCallErrors.get(fc.id);
            if (invalidDetail) {
              return {
                toolCallId: fc.id,
                name: fc.name,
                content: {
                  success: false,
                  code: "INVALID_PARAMETERS",
                  error: invalidDetail.error,
                },
              };
            }

            const firstInvalid =
              Array.from(invalidToolCallErrors.values())[0] ?? null;
            return {
              toolCallId: fc.id,
              name: fc.name,
              content: {
                success: false,
                code: "BATCH_REJECTED",
                error:
                  `[ERROR: BATCH_REJECTED] This tool call was not executed because ` +
                  `"${firstInvalid?.name || "another call"}" had invalid parameters in the same batch. ` +
                  `Fix that call first, then re-issue "${fc.name}".`,
              },
            };
          }),
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
    if (onRetry) {
      onRetry(errorMessage, attempt, {
        silent: false,
        classification: "model_fixable",
      });
    }
  }

  throw new Error("Maximum retries exceeded");
}
