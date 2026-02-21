import type {
  GameState,
  StorySegment,
  UnifiedMessage,
  LogEntry,
  AISettings,
  TokenUsage,
} from "../../../../types";
import { sessionManager } from "../../sessionManager";
import { getProviderConfig, createLogEntry } from "../../utils";
import {
  createToolCallMessage,
  createToolResponseMessage,
} from "../../../messageTypes";
import { callWithAgenticRetry, createPromptTokenBudgetContext } from "../retry";
import {
  DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
  resolveModelContextWindowTokensWithLookup,
} from "../../../modelContextWindows";
import { NON_STORY_OUTLINE_MAX_OUTPUT_TOKENS } from "../../../tokenBudget";
import {
  buildVisualContextMessages,
  getVisualSystemInstruction,
} from "./visualContext";
import { visualTools } from "./visualToolHandler";
import type { ToolCallResult } from "../../../providers/types";

export interface VisualProgress {
  status: string;
  iteration: number;
  totalIterations: number;
}

export type VisualProgressCallback = (progress: VisualProgress) => void;

export interface VisualLoopInput {
  gameState: GameState;
  segment: StorySegment;
  settings: AISettings;
  target: "image_prompt" | "veo_script" | "both";
  language: string;
  onProgress?: VisualProgressCallback;
}

export interface VisualLoopResult {
  imagePrompt?: string;
  veoScript?: string;
  logs: LogEntry[];
  usage?: TokenUsage;
}

const isToolCallResult = (value: unknown): value is ToolCallResult => {
  if (!value || typeof value !== "object") return false;
  const call = value as JsonObject;
  return (
    typeof call.name === "string" &&
    (typeof call.id === "string" || typeof call.id === "undefined") &&
    typeof call.args === "object" &&
    call.args !== null
  );
};

export async function runVisualLoop(
  input: VisualLoopInput,
): Promise<VisualLoopResult> {
  const { gameState, segment, settings, target, language } = input;

  // Get provider info from settings
  // Use the configuration for the requested target
  const visualTarget = target === "veo_script" ? "video" : "image";
  const providerInfo = getProviderConfig(settings, visualTarget);

  if (!providerInfo) {
    throw new Error(
      `No provider config found for ${visualTarget}. Please check your model settings.`,
    );
  }

  const { instance, modelId } = providerInfo;
  const contextWindowTokens = (
    await resolveModelContextWindowTokensWithLookup({
      settings,
      providerId: instance.id,
      providerProtocol: instance.protocol,
      modelId,
      providerApiKey: instance.apiKey,
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    })
  ).value;

  const visualSession = await sessionManager.getOrCreateSession({
    slotId: `visual-${segment.id}`,
    forkId: gameState.forkId,
    providerId: instance.id,
    modelId,
    protocol: instance.protocol,
  });
  const provider = sessionManager.getProvider(visualSession.id, instance);

  const systemInstruction = getVisualSystemInstruction(language, target);
  let conversationHistory = buildVisualContextMessages(gameState, segment);
  const allLogs: LogEntry[] = [];
  let imagePrompt: string | undefined;
  let veoScript: string | undefined;
  const promptTokenBudgetContext = createPromptTokenBudgetContext();

  // Visual loop iterations
  const totalIterations = 3;
  for (let iteration = 0; iteration < totalIterations; iteration++) {
    if (input.onProgress) {
      input.onProgress({
        status:
          iteration === 0
            ? "visual.analyzingStoryContext"
            : "visual.refiningVisualDetails",
        iteration: iteration + 1,
        totalIterations,
      });
    }

    const { result, usage, raw } = await callWithAgenticRetry(
      provider,
      {
        modelId,
        systemInstruction,
        messages: [],
        tools: visualTools,
        toolChoice: "required",
        temperature: 1.0,
        tokenBudget: {
          providerManagedMaxTokens:
            settings.extra?.providerManagedMaxTokens ?? true,
          maxOutputTokensFallback: settings.extra?.maxOutputTokensFallback,
          contextWindowTokens,
          maxOutputTokensHardCap: NON_STORY_OUTLINE_MAX_OUTPUT_TOKENS,
        },
      },
      conversationHistory,
      { maxRetries: 3, promptTokenBudgetContext },
    );

    allLogs.push(
      createLogEntry({
        provider: instance.protocol,
        model: modelId,
        endpoint: `visual-iteration-${iteration + 1}`,
        response: raw,
        usage,
      }),
    );

    const functionCalls =
      result && typeof result === "object"
        ? (result as { functionCalls?: unknown }).functionCalls
        : undefined;
    const parsedCalls = Array.isArray(functionCalls)
      ? functionCalls.filter(isToolCallResult)
      : [];

    if (parsedCalls.length > 0) {
      conversationHistory.push(
        createToolCallMessage(
          parsedCalls.map((call) => ({
            id: call.id,
            name: call.name,
            arguments: call.args,
            thoughtSignature: call.thoughtSignature,
          })),
        ),
      );
      const toolResponses = [];
      let finished = false;

      for (const call of parsedCalls) {
        if (call.name === "submit_visual_result") {
          imagePrompt =
            typeof call.args.imagePrompt === "string"
              ? call.args.imagePrompt
              : undefined;
          veoScript =
            typeof call.args.veoScript === "string"
              ? call.args.veoScript
              : undefined;
          toolResponses.push({
            toolCallId: call.id,
            name: call.name,
            content: { success: true },
          });
          finished = true;
        } else {
          toolResponses.push({
            toolCallId: call.id,
            name: call.name,
            content: {
              success: false,
              error: `Unknown tool: ${call.name}`,
              code: "UNKNOWN_TOOL",
            },
          });
        }
      }

      conversationHistory.push(createToolResponseMessage(toolResponses));
      if (finished) break;
    }
  }

  return { imagePrompt, veoScript, logs: allLogs };
}
