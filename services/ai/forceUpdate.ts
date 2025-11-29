import {
  AISettings,
  LogEntry,
  TokenUsage,
  ToolCallRecord,
  ProviderProtocol,
  ProviderInstance,
  GameState,
  TurnContext,
  UnifiedMessage,
  UnifiedToolCallResult,
  GameResponse,
} from "../../types";

import {
  ToolCallResult,
  MalformedToolCallError,
} from "../providers/types";

import { GameDatabase } from "../gameDatabase";
import { TOOLS } from "../tools";
import { forceUpdateSchema, ForceUpdateResponse } from "../schemas";
import { getForceUpdateSystemInstruction } from "../prompts/index";
import {
  buildLayeredContext,
  ContextBuilderOptions,
} from "../prompts/contextBuilder";

import {
  createUserMessage,
  createToolCallMessage,
  createToolResponseMessage,
} from "../messageTypes";

import {
  GenerateContentResult,
  generateContentUnifiedInternal,
} from "./core";

import {
  getProviderConfig,
  createProviderConfig,
  createLogEntry,
} from "./utils";

import { executeToolCall } from "./adventure";

// ============================================================================
// Force Update Logic
// ============================================================================

/**
 * 生成强制更新 (Force Update / Sudo)
 */
export const generateForceUpdate = async (
  prompt: string,
  inputState: GameState,
  context: TurnContext,
): Promise<GameResponse> => {
  if (!context.settings) {
    throw new Error("settings is required in context");
  }
  const settings = context.settings;
  const language = context.language || "en";

  // 1. 获取 Provider 配置
  const providerInfo = getProviderConfig(settings, "story");
  if (!providerInfo) {
    throw new Error("Story provider not configured");
  }
  const { instance, config, modelId } = providerInfo;

  // 2. 构建完整上下文
  const contextOptions: ContextBuilderOptions = {
    outline: null, // Force update might not need outline, or we can pass it if available in TurnContext? TurnContext doesn't have outline.
    gameState: inputState,
    recentHistory: context.recentHistory,
    summaries: [], // We don't have summaries in TurnContext? We might need to fetch them or just ignore for now.
    godMode: true, // Force update is effectively God Mode
    aliveEntities: inputState.aliveEntities,
  };

  // Use buildLayeredContext to get the full context string
  const layers = buildLayeredContext(contextOptions);
  const fullContext = `${layers.staticLayer}\n${layers.semiStaticLayer}\n${layers.dynamicLayer}`;

  // 3. 构建系统指令
  const systemInstruction = getForceUpdateSystemInstruction(language, prompt, fullContext);

  // 4. 准备初始消息
  // We don't need to pass currentStateSummary in the user message anymore because it's in the system instruction context
  const contextMessage = createUserMessage(
    JSON.stringify({
      task: "FORCE_UPDATE",
      command: prompt,
    }),
  );

  // 5. 运行 Force Update Loop
  return runForceUpdateLoop(
    instance.protocol,
    instance,
    modelId,
    systemInstruction,
    [contextMessage],
    inputState,
    settings,
  );
};

/**
 * Force Update Loop Implementation
 * Similar to Agentic Loop but specifically for force updates using complete_force_update tool
 */
const runForceUpdateLoop = async (
  protocol: ProviderProtocol,
  instance: ProviderInstance,
  modelId: string,
  systemInstruction: string,
  initialContents: UnifiedMessage[],
  inputState: GameState,
  settings: AISettings,
): Promise<GameResponse> => {
  let conversationHistory: UnifiedMessage[] = [...initialContents];
  let turnCount = 0;
  const maxTurns = 5; // Shorter limit for force updates

  // Use the GameState directly as the database initial state
  const db = new GameDatabase({
    ...inputState,
    knowledge: inputState.knowledge || [],
    factions: inputState.factions || [],
    timeline: inputState.timeline || [],
    causalChains: inputState.causalChains || [],
    time: inputState.time || "Unknown",
  });

  // Accumulated actions for UI feedback (Toasts)
  const accumulatedResponse: GameResponse = {
    narrative: "",
    choices: [], // Force update has no choices
    inventoryActions: [],
    relationshipActions: [],
    locationActions: [],
    questActions: [],
    knowledgeActions: [],
    factionActions: [],
    characterUpdates: undefined,
    timelineEvents: [],
  };

  const changedEntities: Map<string, string> = new Map();

  let totalUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  // Check if RAG is enabled
  const isRAGEnabled = settings.embedding?.enabled ?? false;

  // Prepare tools for the provider
  const toolConfig = TOOLS.filter((t) => {
    // Hide RAG tools if embedding is disabled
    if (!isRAGEnabled && t.name === "rag_search") {
      return false;
    }
    // Hide finish_turn tool in force update loop
    if (t.name === "finish_turn") {
      return false;
    }
    return true;
  }).map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));

  while (turnCount < maxTurns) {
    console.log(`[Force Update Loop] Turn ${turnCount + 1}/${maxTurns}`);

    let result: GenerateContentResult["result"];
    let usage: TokenUsage;
    let raw: unknown;

    // Retry logic
    const maxRetries = 2;
    let retryCount = 0;
    let lastError: Error | null = null;

    // Provider-specific schema handling
    // IMPORTANT: Gemini 2.5 (non-Pro) CANNOT use schema+tools simultaneously
    // - When tools are provided: Gemini ignores the schema (see geminiProvider.ts line 466)
    // - Other providers (OpenAI, Claude, OpenRouter) CAN use both together
    // Solution: For Gemini, never use schema (rely on complete_force_update tool instead)
    //           For others, always use schema (for structured output guarantee)

    const isGeminiProvider = protocol === "gemini";

    // Keep tools available (including complete_force_update) in ALL rounds
    const effectiveToolConfig = toolConfig;

    // Schema behavior:
    // - Gemini: NEVER use schema (conflicts with tools), rely on complete_force_update tool
    // - Others: ALWAYS use schema for structured output guarantee
    const effectiveSchema = isGeminiProvider ? undefined : forceUpdateSchema;

    while (retryCount <= maxRetries) {
      try {
        const config = createProviderConfig(instance);
        const resultData = await generateContentUnifiedInternal(
          protocol,
          config,
          modelId,
          systemInstruction,
          conversationHistory,
          effectiveSchema,
          { tools: effectiveToolConfig },
        );

        result = resultData.result;
        usage = resultData.usage;
        raw = resultData.raw;
        break;
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        lastError = error;
        if (
          error.message.includes("function call format error") ||
          error.message.includes("MALFORMED_FUNCTION_CALL")
        ) {
          retryCount++;
          if (retryCount <= maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            continue;
          }
        }
        throw error;
      }
    }

    if (retryCount > maxRetries && lastError) {
      throw lastError;
    }

    if (usage!) {
      totalUsage.promptTokens += usage!.promptTokens || 0;
      totalUsage.completionTokens += usage!.completionTokens || 0;
      totalUsage.totalTokens += usage!.totalTokens || 0;
    }

    // Handle Tool Calls
    const functionCalls = (result! as { functionCalls?: ToolCallResult[] })
      .functionCalls;

    if (result && functionCalls && functionCalls.length > 0) {
      let toolCalls: UnifiedToolCallResult[] = functionCalls;

      // Ensure complete_force_update is last
      const completeIndex = toolCalls.findIndex(
        (tc) => tc.name === "complete_force_update",
      );
      if (completeIndex !== -1 && completeIndex !== toolCalls.length - 1) {
        const completeCall = toolCalls[completeIndex];
        toolCalls = [
          ...toolCalls.slice(0, completeIndex),
          ...toolCalls.slice(completeIndex + 1),
          completeCall,
        ];
      }

      conversationHistory.push(
        createToolCallMessage(
          toolCalls.map((fc) => ({
            id: fc.id,
            name: fc.name,
            arguments: fc.args,
          })),
        ),
      );

      const toolResponses: Array<{
        toolCallId: string;
        name: string;
        content: unknown;
      }> = [];

      for (const call of toolCalls) {
        const { id: callId, name, args } = call;
        console.log(`[Force Update Loop] Tool Call [${callId}]: ${name}`, args);

        let output: unknown = { success: false, error: "Unknown tool" };

        output = executeToolCall(
          name,
          args,
          db,
          accumulatedResponse,
          changedEntities,
        );

        if (name === "complete_force_update") {
          // Process complete_force_update response
          const updateData = args as ForceUpdateResponse;
          accumulatedResponse.narrative = updateData.narrative;
          // stateUpdates are for logging, we don't need to put them in accumulatedResponse directly
          // unless we want to show them. For now, narrative is enough.

          // Attach final state
          (accumulatedResponse as GameResponse & { finalState: unknown }).finalState =
            db.getState();

          return accumulatedResponse;
        }

        toolResponses.push({
          toolCallId: callId,
          name: name,
          content: output,
        });
      }

      conversationHistory.push(createToolResponseMessage(toolResponses));
      turnCount++;
    } else {
      // No tool calls - check for direct schema response
      try {
        const updateData = forceUpdateSchema.parse(result);
        accumulatedResponse.narrative = updateData.narrative;
        (accumulatedResponse as GameResponse & { finalState: unknown }).finalState =
          db.getState();
        return accumulatedResponse;
      } catch (validationError) {
        console.error(
          `[Force Update Loop] Response does not match forceUpdateSchema:`,
          validationError,
        );
        // Fallback
        if (result && (result as GameResponse).narrative) {
           accumulatedResponse.narrative = (result as GameResponse).narrative;
           (accumulatedResponse as GameResponse & { finalState: unknown }).finalState =
            db.getState();
           return accumulatedResponse;
        }
         // Last resort
        accumulatedResponse.narrative = typeof result === "string" ? result : JSON.stringify(result);
        (accumulatedResponse as GameResponse & { finalState: unknown }).finalState =
            db.getState();
        return accumulatedResponse;
      }
    }
  }

  console.warn(`[Force Update Loop] Max turns reached without completion`);
  (accumulatedResponse as GameResponse & { finalState: unknown }).finalState =
    db.getState();
  return accumulatedResponse;
};
