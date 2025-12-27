import type {
  GameState,
  StorySegment,
  UnifiedMessage,
  LogEntry,
  AISettings,
} from "../../../../types";
import { sessionManager } from "../../sessionManager";
import { getProviderConfig, createLogEntry } from "../../utils";
import {
  createToolCallMessage,
  createToolResponseMessage,
} from "../../../messageTypes";
import { callWithAgenticRetry } from "../retry";
import {
  buildVisualContextMessages,
  getVisualSystemInstruction,
} from "./visualContext";
import { visualTools } from "./visualToolHandler";
import { GameDatabase } from "../../../gameDatabase";
import { dispatchToolCallAsync } from "../../../tools/toolHandlerRegistry";

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
  usage?: any;
}

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
        temperature: 0.7,
      },
      conversationHistory,
      { maxRetries: 3 },
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

    const functionCalls = (result as any).functionCalls;
    if (functionCalls) {
      conversationHistory.push(createToolCallMessage(functionCalls));
      const toolResponses = [];
      let finished = false;

      for (const call of functionCalls) {
        if (call.name === "submit_visual_result") {
          imagePrompt = call.args.imagePrompt as string | undefined;
          veoScript = call.args.veoScript as string | undefined;
          toolResponses.push({
            toolCallId: call.id,
            name: call.name,
            content: { success: true },
          });
          finished = true;
        } else {
          // Generic tool execution
          const context = {
            db: new GameDatabase(gameState),
            gameState,
            settings: (gameState as any)._settings || {},
          };
          const output = await dispatchToolCallAsync(
            call.name,
            call.args,
            context as any,
          );
          toolResponses.push({
            toolCallId: call.id,
            name: call.name,
            content: output,
          });
        }
      }

      conversationHistory.push(createToolResponseMessage(toolResponses));
      if (finished) break;
    }
  }

  return { imagePrompt, veoScript, logs: allLogs };
}
