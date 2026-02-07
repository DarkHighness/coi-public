import {
  AISettings,
  LogEntry,
  TokenUsage,
  ProviderProtocol,
  ProviderInstance,
  GameState,
  TurnContext,
  GameResponse,
  ToolCallRecord,
  CustomRulesAckPendingReason,
  TurnRecoveryKind,
  TurnRecoveryTrace,
} from "../../../../types";

import { isContextLengthError } from "../../contextCompressor";

import { UnifiedMessage } from "../../../messageTypes";

import {
  buildCoreSystemInstructionWithSkills,
} from "../../../prompts/skills";

import {
  getProviderConfig,
  resolveThemeConfig,
  resolveNarrativeStyle,
  resolveWorldDisposition,
  resolvePlayerMaliceProfile,
  pickModelMatchedPrompt,
} from "../../utils";

import { sessionManager } from "../../sessionManager";
import type { VfsSession } from "../../../vfs/vfsSession";

import promptToml from "@/prompt/prompt.toml";

// Import new modular context and tools
import {
  buildTurnMessages,
  setupSession,
  handleRetryDetection,
  rollbackToTurnAnchor,
  createCheckpoint,
  appendToHistory,
} from "./context";

// Import refactored agentic loop
import { runAgenticLoopRefactored } from "./agenticLoop";
import {
  composeSystemInstruction,
  getTurnRuntimeFloor,
} from "../../../prompts/runtimeFloor";
import { syncCustomRulesAckState } from "../../../customRulesAckState";

import {
  executeTurnWithRecovery,
  getRecoveryKind,
  getRecoveryTrace,
} from "./turnRecoveryRunner";


// ============================================================================
// Turn Context and Agentic Loop
// ============================================================================

export interface AgenticLoopResult {
  response: GameResponse;
  logs: LogEntry[];
  usage: TokenUsage;
  changedEntities: Array<{ id: string; type: string }>;
  _conversationHistory: UnifiedMessage[];
  recovery?: TurnRecoveryTrace;
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

  const playerMaliceProfile = resolvePlayerMaliceProfile({
    preset: settings.extra?.playerMalicePreset,
    intensity: settings.extra?.playerMaliceIntensity,
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
  const baseSystemInstruction = buildCoreSystemInstructionWithSkills({
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
    playerMaliceProfile,
    playerMalicePreset: settings.extra?.playerMalicePreset,
    playerMaliceIntensity: settings.extra?.playerMaliceIntensity,
    isNSFW: settings.extra?.nsfw,
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
    `[Adventure] Built system instruction with skills. Length: ${baseSystemInstruction.length} chars`,
  );

  const runtimeFloor = getTurnRuntimeFloor();

  const systemDefaultInjectionEnabled =
    settings.extra?.systemDefaultInjectionEnabled ?? true;
  const systemDefaultInjection = systemDefaultInjectionEnabled
    ? pickModelMatchedPrompt((promptToml as any)?.system_prompts, modelId)
    : undefined;

  const customInstructionRaw = settings.extra?.customInstruction;
  const customInstruction =
    typeof customInstructionRaw === "string" ? customInstructionRaw : "";
  const customInstructionEnabled =
    settings.extra?.customInstructionEnabled ??
    Boolean(customInstruction.trim());
  const effectiveCustomInstruction =
    customInstructionEnabled && customInstruction.trim()
      ? customInstruction.trim()
      : undefined;

  if (effectiveCustomInstruction) {
    console.warn(
      `[CustomInstruction] Prepended custom instruction (${effectiveCustomInstruction.length} chars)`,
    );
  }
  if (systemDefaultInjection) {
    console.warn(
      `[SystemDefaultInjection] Matched model ${modelId} (${systemDefaultInjection.length} chars)`,
    );
  }

  const systemInstruction = composeSystemInstruction({
    runtimeFloor,
    systemDefaultInjection,
    customInstruction: effectiveCustomInstruction,
    baseSystemInstruction,
  });

  const customRulesAckState = syncCustomRulesAckState(context.vfsSession);
  const retconAckPending = customRulesAckState.pendingHash
    ? {
        hash: customRulesAckState.pendingHash,
        reason: customRulesAckState.pendingReason,
      }
    : undefined;

  if (retconAckPending) {
    console.warn(
      `[CustomRulesAck] Turn requires retcon ack hash=${retconAckPending.hash} reason=${retconAckPending.reason ?? "customRules"}`,
    );
  }

  // Get RAG context from parameter
  const ragContext: string | undefined = context.ragContext;

  // Build messages using new modular builder
  const { contextMessages, userMessage, godModeContext } = buildTurnMessages(
    gameState,
    context.userAction,
  );

  // Log active custom rules and NSFW mode
  const enabledRules = (gameState.customRules || []).filter((r) => r.enabled);
  const nsfwEnabled = settings.extra?.nsfw || false;
  if (enabledRules.length > 0) {
    console.log(
      `[CustomRules] Active ${enabledRules.length} rules:`,
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
  const sessionSetupOptions = {
    slotId: context.slotId,
    forkId: gameState.forkId ?? 0,
    providerId: instance.id,
    modelId,
    protocol: instance.protocol,
    systemInstruction,
    contextMessages,
    recentHistory: context.recentHistory,
    isInit: context.isInit,
  };

  const { sessionId, activeHistory: initialHistory } = await setupSession(
    sessionSetupOptions,
  );

  context.vfsSession.bindConversationSession(sessionId);

  // Handle retry detection
  let activeHistory = handleRetryDetection(
    sessionId,
    initialHistory,
    context.userAction,
    instance.protocol,
    context.vfsSession,
  );

  // Detect SUDO mode
  const isSudoMode = context.userAction.startsWith("[SUDO]");
  const isCleanupMode = context.userAction.startsWith("[CLEANUP]");

  const executeSingleAttempt = async (): Promise<AgenticLoopResult> => {
    createCheckpoint(sessionId, context.vfsSession);

    const fullContext = [...activeHistory, userMessage];
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
      isCleanupMode,
      sessionId,
      context.vfsSession,
      retconAckPending,
      context.onToolCallsUpdate,
      context.vfsMode,
      context.vfsElevationToken ?? null,
    );

    const newMessages = result._conversationHistory.slice(activeHistory.length);
    console.log(
      `[Adventure] Appending ${newMessages.length} new messages to history.`,
    );
    appendToHistory(sessionId, newMessages, instance.protocol);

    activeHistory = result._conversationHistory;
    return result;
  };

  const resetSessionForRecovery = async (kind: TurnRecoveryKind) => {
    if (kind === "context") {
      await sessionManager.onContextOverflow(sessionId);
      context.vfsSession.beginReadEpoch("context_overflow");
    } else {
      await sessionManager.invalidate(sessionId, "manual_clear");
      context.vfsSession.beginReadEpoch("manual_invalidate");
    }

    const refreshedSession = await setupSession({
      ...sessionSetupOptions,
      isInit: false,
    });
    context.vfsSession.bindConversationSession(refreshedSession.sessionId);
    activeHistory = refreshedSession.activeHistory;
  };

  try {
    const { result, recovery } = await executeTurnWithRecovery({
      execute: executeSingleAttempt,
      rollbackToAnchor: () => {
        const rolledBackHistory = rollbackToTurnAnchor(
          sessionId,
          instance.protocol,
          context.vfsSession,
        );
        if (!rolledBackHistory) return false;
        activeHistory = rolledBackHistory;
        return true;
      },
      resetSession: resetSessionForRecovery,
      onLog: (payload) => {
        console.log("[TurnRecovery]", {
          sessionId,
          forkId: gameState.forkId ?? 0,
          actionMode: isSudoMode ? "sudo" : isCleanupMode ? "cleanup" : "normal",
          ...payload,
        });
      },
    });

    return {
      ...result,
      recovery,
    };
  } catch (error: unknown) {
    const recoveryKind = getRecoveryKind(error);
    const recoveryTrace = getRecoveryTrace(error);

    if (recoveryKind === "context" || isContextLengthError(error)) {
      await sessionManager.onContextOverflow(sessionId);
      context.vfsSession.beginReadEpoch("context_overflow");
      const contextError = new Error(
        `CONTEXT_LENGTH_EXCEEDED: ${error instanceof Error ? error.message : String(error)}`,
      );
      (contextError as any).recovery = recoveryTrace;
      (contextError as any).recoveryKind = recoveryKind || "context";
      throw contextError;
    }

    throw error;
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
  isCleanupMode: boolean = false,
  _sessionId: string,
  vfsSession: VfsSession,
  retconAckPending?: {
    hash: string;
    reason?: CustomRulesAckPendingReason;
  },
  onToolCallsUpdate?: (calls: ToolCallRecord[]) => void,
  vfsMode?: "normal" | "god" | "sudo",
  vfsElevationToken?: string | null,
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
    isCleanupMode,
    sessionId: _sessionId,
    vfsSession,
    retconAckPending,
    onToolCallsUpdate,
    vfsMode,
    vfsElevationToken: vfsElevationToken ?? null,
  });
};
