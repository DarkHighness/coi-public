import type {
  GameState,
  StorySegment,
  LogEntry,
  AISettings,
  TokenUsage,
  JsonObject,
} from "../../../../types";
import type { VfsSession } from "../../../vfs/vfsSession";
import { sessionManager } from "../../sessionManager";
import {
  getProviderConfig,
  createLogEntry,
  type FunctionType,
} from "../../utils";
import {
  createToolCallMessage,
  createToolResponseMessage,
} from "../../../messageTypes";
import {
  dispatchToolCallAsync,
  type ToolContext,
} from "../../../tools/handlers";
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
import {
  getVisualSubmitToolName,
  getVisualToolsForTarget,
  type VisualLoopTarget,
  VISUAL_READ_ONLY_VFS_TOOL_NAMES,
} from "./visualToolHandler";
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
  vfsSession: VfsSession;
  recentHistory?: StorySegment[];
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
    typeof call.id === "string" &&
    typeof call.args === "object" &&
    call.args !== null
  );
};

const VISUAL_PROVIDER_ROUTE: Record<VisualLoopTarget, readonly FunctionType[]> =
  {
    image_prompt: ["story"],
    veo_script: ["script", "story"],
  };

const resolveVisualProviderConfig = (
  settings: AISettings,
  target: VisualLoopTarget,
) => {
  const candidateFunctions = VISUAL_PROVIDER_ROUTE[target];
  for (const func of candidateFunctions) {
    const config = getProviderConfig(settings, func);
    if (config) {
      return { config, func };
    }
  }
  return null;
};

const VISUAL_READ_ONLY_VFS_TOOL_NAME_SET = new Set<string>(
  VISUAL_READ_ONLY_VFS_TOOL_NAMES,
);

interface VisualLoopStageInput extends Omit<VisualLoopInput, "target"> {
  target: VisualLoopTarget;
}

const runVisualLoopStage = async (
  input: VisualLoopStageInput,
): Promise<VisualLoopResult> => {
  const { gameState, segment, settings, target, language, vfsSession } = input;

  // Visual prompt generation must run on story/script chat models with tool support.
  const providerSelection = resolveVisualProviderConfig(settings, target);

  if (!providerSelection) {
    const routeHint = VISUAL_PROVIDER_ROUTE[target].join(" -> ");
    throw new Error(
      `No provider config found for visual loop route (${routeHint}). Please check your model settings.`,
    );
  }

  const providerInfo = providerSelection.config;
  const { instance, modelId } = providerInfo;
  const recentHistory = input.recentHistory || [];
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
  let conversationHistory = buildVisualContextMessages(
    gameState,
    segment,
    recentHistory,
  );
  const stageTools = getVisualToolsForTarget(target);
  const submitToolName = getVisualSubmitToolName(target);
  const allLogs: LogEntry[] = [];
  let imagePrompt: string | undefined;
  let veoScript: string | undefined;
  let totalUsage: TokenUsage | undefined;
  const promptTokenBudgetContext = createPromptTokenBudgetContext();
  const toolContext: ToolContext = {
    gameState,
    settings,
    embeddingEnabled: Boolean(settings.embedding?.enabled),
    vfsSession,
    allowedToolNames: stageTools.map((tool) => tool.name),
    vfsActor: "ai",
    vfsMode: "normal",
  };

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
        tools: stageTools,
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
    totalUsage = mergeTokenUsage(totalUsage, usage);

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
        if (call.name === submitToolName) {
          if (target === "image_prompt") {
            const trimmedImagePrompt =
              typeof call.args.imagePrompt === "string"
                ? call.args.imagePrompt.trim()
                : "";
            imagePrompt =
              trimmedImagePrompt.length > 0 ? trimmedImagePrompt : undefined;
          } else {
            const trimmedVeoScript =
              typeof call.args.veoScript === "string"
                ? call.args.veoScript.trim()
                : "";
            veoScript =
              trimmedVeoScript.length > 0 ? trimmedVeoScript : undefined;
          }
          toolResponses.push({
            toolCallId: call.id,
            name: call.name,
            content: { success: true },
          });
          finished = true;
        } else {
          if (!VISUAL_READ_ONLY_VFS_TOOL_NAME_SET.has(call.name)) {
            toolResponses.push({
              toolCallId: call.id,
              name: call.name,
              content: {
                success: false,
                error: `[ERROR: UNKNOWN_TOOL] Visual loop only allows read-only VFS tools and ${submitToolName}.`,
                code: "UNKNOWN_TOOL",
              },
            });
            continue;
          }

          try {
            const payload = await dispatchToolCallAsync(
              call.name,
              call.args,
              toolContext,
            );
            toolResponses.push({
              toolCallId: call.id,
              name: call.name,
              content: payload,
            });
            allLogs.push(
              createLogEntry({
                provider: instance.protocol,
                model: modelId,
                endpoint: "visual-tool",
                toolName: call.name,
                toolInput: call.args,
                toolOutput: payload,
              }),
            );
          } catch (error) {
            toolResponses.push({
              toolCallId: call.id,
              name: call.name,
              content: {
                success: false,
                error:
                  error instanceof Error
                    ? error.message
                    : `Tool execution failed: ${String(error)}`,
                code: "VISUAL_TOOL_ERROR",
              },
            });
          }
        }
      }

      conversationHistory.push(createToolResponseMessage(toolResponses));
      if (finished) break;
    }
  }

  return { imagePrompt, veoScript, logs: allLogs, usage: totalUsage };
};

const mergeTokenUsage = (
  left: TokenUsage | undefined,
  right: TokenUsage | undefined,
): TokenUsage | undefined => {
  if (!left && !right) return undefined;
  const a = left || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  const b = right || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  return {
    promptTokens: (a.promptTokens || 0) + (b.promptTokens || 0),
    completionTokens: (a.completionTokens || 0) + (b.completionTokens || 0),
    totalTokens: (a.totalTokens || 0) + (b.totalTokens || 0),
    cacheRead: (a.cacheRead || 0) + (b.cacheRead || 0),
    cacheWrite: (a.cacheWrite || 0) + (b.cacheWrite || 0),
  };
};

export async function runVisualLoop(
  input: VisualLoopInput,
): Promise<VisualLoopResult> {
  if (input.target === "both") {
    const imageStage = await runVisualLoopStage({
      ...input,
      target: "image_prompt",
    });
    const veoStage = await runVisualLoopStage({
      ...input,
      target: "veo_script",
    });

    return {
      imagePrompt: imageStage.imagePrompt,
      veoScript: veoStage.veoScript,
      logs: [...imageStage.logs, ...veoStage.logs],
      usage: mergeTokenUsage(imageStage.usage, veoStage.usage),
    };
  }

  return runVisualLoopStage({
    ...input,
    target: input.target as VisualLoopTarget,
  });
}
