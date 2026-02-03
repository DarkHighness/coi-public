import {
  AISettings,
  LogEntry,
  TokenUsage,
  ProviderProtocol,
  ProviderInstance,
  GameState,
  TurnContext,
  GameResponse,
} from "../../../../types";

import { isContextLengthError } from "../../contextCompressor";

import { UnifiedMessage } from "../../../messageTypes";

import { buildCoreSystemInstructionWithSkills } from "../../../prompts/skills";
import { registerAllSkills } from "../../../prompts/skills/definitions";

// Explicitly register skills to ensure they are available
registerAllSkills();

import {
  getProviderConfig,
  resolveThemeConfig,
  resolveNarrativeStyle,
  resolveWorldDisposition,
} from "../../utils";

import { sessionManager } from "../../sessionManager";
import type { VfsSession } from "../../../vfs/vfsSession";

// Import new modular context and tools
import {
  buildTurnMessages,
  setupSession,
  handleRetryDetection,
  createCheckpoint,
  appendToHistory,
} from "./context";

// Import refactored agentic loop
import { runAgenticLoopRefactored } from "./agenticLoop";

// ============================================================================
// Turn Context and Agentic Loop
// ============================================================================

export interface AgenticLoopResult {
  response: GameResponse;
  logs: LogEntry[];
  usage: TokenUsage;
  changedEntities: Array<{ id: string; type: string }>;
  _conversationHistory: UnifiedMessage[];
}

/**
 * 生成冒险回合
 */
export const generateAdventureTurn = async (
  gameState: GameState,
  context: TurnContext,
): Promise<AgenticLoopResult> => {
  if (!context.settings) {
    throw new Error("settings is required in context");
  }
  const settings = context.settings;
  const providerInfo = getProviderConfig(settings, "story");
  if (!providerInfo) {
    throw new Error("Story provider not configured");
  }
  const { instance, modelId } = providerInfo;
  const fallbackThemeConfig = resolveThemeConfig(
    context.themeKey,
    context.language,
    context.tFunc as (key: string, options?: Record<string, unknown>) => string,
  );
  const resolvedThemeConfig = gameState.themeConfig;

  const narrativeStyleOverride = (gameState.outline as any)?.narrativeStyle;
  const baseNarrativeStyle =
    typeof narrativeStyleOverride === "string" &&
    narrativeStyleOverride.trim()
      ? narrativeStyleOverride.trim()
      : resolvedThemeConfig?.narrativeStyle || fallbackThemeConfig.narrativeStyle;

  const narrativeStyle =
    resolveNarrativeStyle({
      themeStyle: baseNarrativeStyle,
      preset: settings.extra?.narrativeStylePreset,
      language: context.language,
      customContext: gameState.customContext,
    }) || baseNarrativeStyle;

  const worldDisposition = resolveWorldDisposition({
    preset: settings.extra?.worldDispositionPreset,
    language: context.language,
    customContext: gameState.customContext,
  });

  const backgroundTemplate =
    resolvedThemeConfig?.backgroundTemplate || fallbackThemeConfig.backgroundTemplate;
  const example = resolvedThemeConfig?.example || fallbackThemeConfig.example;
  const worldSetting =
    resolvedThemeConfig?.worldSetting || fallbackThemeConfig.worldSetting;
  const isRestricted =
    resolvedThemeConfig?.isRestricted ?? fallbackThemeConfig.isRestricted;

  // Check if RAG is enabled
  const isRAGEnabled = settings.embedding?.enabled ?? false;

  // ===== Build system instruction using Skills System =====
  let systemInstruction = buildCoreSystemInstructionWithSkills({
    language: context.language,
    themeStyle: narrativeStyle,
    isRestricted,
    isDetailedDescription: settings.extra?.detailedDescription,
    ragEnabled: isRAGEnabled,
    gameState,
    backgroundTemplate,
    example,
    worldSetting,
    worldDisposition,
    worldDispositionPreset: settings.extra?.worldDispositionPreset,
    customRules: gameState.customRules,
    isNSFW: settings.extra?.nsfw,
    isLiteMode: settings.extra?.liteMode,
    godMode: gameState.godMode,
    crossSaveProfile: settings.playerProfile,
    perSaveProfile: gameState.playerProfile,
    disablePlayerProfiling: settings.extra?.disablePlayerProfiling,
    protagonistName: gameState.character.name,
    protagonistRole: gameState.character.title,
    protagonistLocation:
      gameState.character.currentLocation || "Unknown Location",
    maxToolCalls: settings.extra?.maxToolCalls,
    themeKey: context.themeKey, // Theme-based atom specialization
  });

  console.log(
    `[Adventure] Built system instruction with skills. Length: ${systemInstruction.length} chars`,
  );

  // Optional user-provided prompt prefix (typically used for language/style preferences).
  const customInstructionRaw = settings.extra?.customInstruction;
  const customInstruction =
    typeof customInstructionRaw === "string" ? customInstructionRaw : "";
  const customInstructionEnabled =
    settings.extra?.customInstructionEnabled ??
    Boolean(customInstruction.trim());

  if (customInstruction.trim() && customInstructionEnabled) {
    systemInstruction = `${customInstruction}\n\n${systemInstruction}`;
    console.warn(
      `[CustomInstruction] Prepended custom instruction (${customInstruction.length} chars)`,
    );
  }

  // Get RAG context from parameter
  const ragContext: string | undefined = context.ragContext;

  // Build messages using new modular builder
  const { contextMessages, userMessage, godModeContext } = buildTurnMessages(
    gameState,
    context.userAction,
  );

  // Log injected rules and NSFW mode
  const enabledRules = (gameState.customRules || []).filter((r) => r.enabled);
  const nsfwEnabled = settings.extra?.nsfw || false;
  if (enabledRules.length > 0) {
    console.log(
      `[CustomRules] Injected ${enabledRules.length} rules:`,
      enabledRules.map((r) => `[${r.category}] ${r.title}`),
    );
  }
  if (nsfwEnabled) {
    console.warn(`[NSFW] NSFW mode is ENABLED`);
  }

  const generationDetails: LogEntry["generationDetails"] = {
    dynamicContext: godModeContext,
    ragContext,
    systemPrompt: systemInstruction,
    userPrompt: context.userAction,
    injectedRules: enabledRules.map((r) => `[${r.category}] ${r.title}`),
    nsfwEnabled,
  };

  // === SESSION-BASED HISTORY MANAGEMENT (Using new modular context) ===
  const { sessionId, activeHistory: initialHistory } = await setupSession({
    slotId: context.slotId,
    forkId: gameState.forkId ?? 0,
    providerId: instance.id,
    modelId,
    protocol: instance.protocol,
    systemInstruction,
    contextMessages,
    recentHistory: context.recentHistory,
    isInit: context.isInit,
  });

  // Handle retry detection
  const activeHistory = handleRetryDetection(
    sessionId,
    initialHistory,
    context.userAction,
    instance.protocol,
    context.vfsSession,
  );

  // Create checkpoint before new turn
  createCheckpoint(sessionId, context.vfsSession);

  // Construct request context
  const fullContext = [...activeHistory, userMessage];

  // Detect SUDO mode
  const isSudoMode = context.userAction.startsWith("[SUDO]");

  // Run agentic loop
  try {
    const result = await runAgenticLoop(
      instance.protocol,
      instance,
      modelId,
      systemInstruction,
      fullContext,
      gameState,
      generationDetails,
      context.settings,
      isSudoMode,
      sessionId,
      context.vfsSession,
    );

    // Append new messages to session history
    const newMessages = result._conversationHistory.slice(activeHistory.length);
    console.log(
      `[Adventure] Appending ${newMessages.length} new messages to history.`,
    );
    appendToHistory(sessionId, newMessages, instance.protocol);

    return result;
  } catch (e: any) {
    if (isContextLengthError(e)) {
      await sessionManager.onContextOverflow(sessionId);
      throw new Error("CONTEXT_LENGTH_EXCEEDED: " + e.message);
    }
    throw e;
  }
};

/**
 * Agentic Loop with Dynamic Tool Loading (Search-based)
 *
 * Delegates to the refactored modular implementation in agenticLoop.ts.
 */
export const runAgenticLoop = async (
  protocol: ProviderProtocol,
  instance: ProviderInstance,
  modelId: string,
  systemInstruction: string,
  initialContents: UnifiedMessage[],
  inputState: GameState,
  generationDetails: LogEntry["generationDetails"] | undefined,
  settings: AISettings,
  isSudoMode: boolean = false,
  _sessionId?: string,
  vfsSession?: VfsSession,
): Promise<AgenticLoopResult> => {
  // Delegate to refactored agentic loop
  return runAgenticLoopRefactored({
    protocol,
    instance,
    modelId,
    systemInstruction,
    initialContents,
    gameState: inputState,
    generationDetails,
    settings,
    isSudoMode,
    sessionId: _sessionId,
    vfsSession,
  });
};
