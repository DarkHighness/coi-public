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

import { buildCoreSystemInstructionWithSkills } from "../../../prompts/skills";

import {
  getProviderConfig,
  resolveThemeConfig,
  resolveNarrativeStyle,
  resolveWorldDisposition,
  resolvePlayerMaliceProfile,
  resolveEffectivePresetProfile,
  resolveActivePresetSkillRequirements,
  resolveCulturePreferenceContext,
  type ActivePresetSkillRequirement,
  pickModelMatchedPrompt,
  type ModelPromptEntry,
} from "../../utils";

import { sessionManager } from "../../sessionManager";
import type { VfsSession } from "../../../vfs/vfsSession";

import promptToml from "@/prompt/prompt.toml";
import {
  getLatestSummaryReferencesMarkdown,
  type SessionStartupMode,
} from "@/services/ai/agentic/startup";

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
import { summarizeContext } from "../summary/summaryAdapter";

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

const isRecordObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null;

const readModelPromptEntries = (value: unknown): ModelPromptEntry[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const entries = value
    .map((entry) => {
      if (!isRecordObject(entry)) return null;
      const keywords = Array.isArray(entry.keywords)
        ? entry.keywords.filter((keyword): keyword is string => {
            return typeof keyword === "string";
          })
        : [];
      const prompt = typeof entry.prompt === "string" ? entry.prompt : "";
      return {
        keywords,
        prompt,
      } satisfies ModelPromptEntry;
    })
    .filter((entry): entry is ModelPromptEntry => entry !== null);
  return entries.length > 0 ? entries : undefined;
};

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
    context.tFunc as (key: string, options?: JsonObject) => string,
  );
  const resolvedThemeConfig = gameState.themeConfig;

  const narrativeStyleOverride =
    gameState.outline && typeof gameState.outline === "object"
      ? (gameState.outline as JsonObject).narrativeStyle
      : undefined;
  const baseNarrativeStyle =
    typeof narrativeStyleOverride === "string" && narrativeStyleOverride.trim()
      ? narrativeStyleOverride.trim()
      : resolvedThemeConfig?.narrativeStyle ||
        fallbackThemeConfig.narrativeStyle;

  const effectivePresetProfile = resolveEffectivePresetProfile({
    customContext: gameState.customContext,
    presetProfile: gameState.presetProfile,
    settings,
  });

  const effectiveNarrativeStylePreset =
    effectivePresetProfile.narrativeStylePreset.value;
  const effectiveWorldDispositionPreset =
    effectivePresetProfile.worldDispositionPreset.value;
  const effectivePlayerMalicePreset =
    effectivePresetProfile.playerMalicePreset.value;
  const effectivePlayerMaliceIntensity =
    effectivePresetProfile.playerMaliceIntensity.value;

  const narrativeStyle =
    resolveNarrativeStyle({
      themeStyle: baseNarrativeStyle,
      preset:
        effectiveNarrativeStylePreset === "theme"
          ? undefined
          : effectiveNarrativeStylePreset,
      language: context.language,
      customContext: gameState.customContext,
    }) || baseNarrativeStyle;

  const worldDisposition = resolveWorldDisposition({
    preset:
      effectiveWorldDispositionPreset === "theme"
        ? undefined
        : effectiveWorldDispositionPreset,
    language: context.language,
    customContext: gameState.customContext,
  });

  const playerMaliceProfile = resolvePlayerMaliceProfile({
    preset:
      effectivePlayerMalicePreset === "theme"
        ? undefined
        : effectivePlayerMalicePreset,
    intensity: effectivePlayerMaliceIntensity,
    language: context.language,
    customContext: gameState.customContext,
  });

  const backgroundTemplate =
    resolvedThemeConfig?.backgroundTemplate ||
    fallbackThemeConfig.backgroundTemplate;
  const example = resolvedThemeConfig?.example || fallbackThemeConfig.example;
  const worldSetting =
    resolvedThemeConfig?.worldSetting || fallbackThemeConfig.worldSetting;
  const isRestricted =
    resolvedThemeConfig?.isRestricted ?? fallbackThemeConfig.isRestricted;
  const culturePreferenceContext = resolveCulturePreferenceContext({
    preference: settings.extra?.culturePreference,
    themeKey: context.themeKey,
    worldSetting,
  });

  // Check if RAG is enabled
  const isRAGEnabled = settings.embedding?.enabled ?? false;
  const isSudoMode = context.userAction.startsWith("[SUDO]");
  const isCleanupMode = context.userAction.startsWith("[CLEANUP]");
  const isPlayerRateMode = context.userAction.startsWith("[Player Rate]");
  const finishToolName = isPlayerRateMode
    ? "vfs_finish_soul"
    : "vfs_finish_turn";

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
    worldDispositionPreset: effectiveWorldDispositionPreset,
    playerMaliceProfile,
    playerMalicePreset: effectivePlayerMalicePreset,
    playerMaliceIntensity: effectivePlayerMaliceIntensity,
    isNSFW: settings.extra?.nsfw,
    godMode: gameState.godMode,
    disablePlayerProfiling: settings.extra?.disablePlayerProfiling,
    protagonistName: gameState.character.name,
    protagonistRole: gameState.character.title,
    protagonistLocation:
      gameState.character.currentLocation || "Unknown Location",
    maxToolCalls: settings.extra?.maxToolCalls,
    finishToolName,
    themeKey: context.themeKey, // Theme-based atom specialization
    culturePreference: culturePreferenceContext.preference,
    culturePreferenceSource: culturePreferenceContext.source,
    cultureEffectiveCircle: culturePreferenceContext.effectiveCircle,
    cultureSkillPath: culturePreferenceContext.skillPath,
    cultureHubSkillPath: culturePreferenceContext.hubSkillPath,
    cultureNamingPolicy: culturePreferenceContext.namingPolicy,
  });

  console.log(
    `[Adventure] Built system instruction with skills. Length: ${baseSystemInstruction.length} chars`,
  );

  const runtimeFloor = getTurnRuntimeFloor();

  const systemDefaultInjectionEnabled =
    settings.extra?.systemDefaultInjectionEnabled ?? true;
  const systemPromptEntries =
    isRecordObject(promptToml) && "system_prompts" in promptToml
      ? readModelPromptEntries(promptToml.system_prompts)
      : undefined;
  const systemDefaultInjection = systemDefaultInjectionEnabled
    ? pickModelMatchedPrompt(systemPromptEntries, modelId)
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
  const retconAckPending =
    !isPlayerRateMode && customRulesAckState.pendingHash
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
    context.vfsSession,
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

  const commandProtocolSkillPath = isCleanupMode
    ? "current/skills/commands/runtime/cleanup/SKILL.md"
    : isSudoMode
      ? "current/skills/commands/runtime/sudo/SKILL.md"
      : isPlayerRateMode
        ? "current/skills/commands/runtime/player-rate/SKILL.md"
      : "current/skills/commands/runtime/turn/SKILL.md";
  const startupMode: SessionStartupMode = isCleanupMode
    ? "cleanup"
    : isSudoMode
      ? "sudo"
      : isPlayerRateMode
        ? "player-rate"
        : "turn";
  const latestHotStartReferencesMarkdown =
    getLatestSummaryReferencesMarkdown(gameState);

  // === SESSION-BASED HISTORY MANAGEMENT (Using new modular context) ===
  const sessionSetupOptions = {
    slotId: context.slotId,
    forkId: gameState.forkId ?? 0,
    vfsSession: context.vfsSession,
    providerId: instance.id,
    modelId,
    protocol: instance.protocol,
    systemInstruction,
    contextMessages,
    recentHistory: context.recentHistory,
    isInit: context.isInit,
    commandProtocolSkillPath,
    hotStartReferencesMarkdown: latestHotStartReferencesMarkdown,
    startupMode,
  };

  const { sessionId, activeHistory: initialHistory } =
    await setupSession(sessionSetupOptions);

  context.vfsSession.bindConversationSession(sessionId);

  // Handle retry detection ONLY for explicit retry requests.
  // Never infer retry from plain action text equality in normal turns.
  let activeHistory = initialHistory;
  if (context.isRetryGeneration === true) {
    activeHistory = handleRetryDetection(
      sessionId,
      initialHistory,
      context.userAction,
      instance.protocol,
      context.vfsSession,
    );
  }

  const requiredPresetSkillRequirements = resolveActivePresetSkillRequirements({
    settings,
    presetProfile: gameState.presetProfile,
    customContext: gameState.customContext,
    culturePreference: culturePreferenceContext.preference,
    themeKey: context.themeKey,
    worldSetting,
  });
  const requiredPresetSkillPaths = requiredPresetSkillRequirements.map(
    (entry) => entry.path,
  );

  const executeSingleAttempt = async (
    attemptSettings: AISettings = context.settings,
  ): Promise<AgenticLoopResult> => {
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
      attemptSettings,
      isSudoMode,
      isCleanupMode,
      sessionId,
      context.vfsSession,
      retconAckPending,
      context.onToolCallsUpdate,
      context.vfsMode,
      context.vfsElevationToken ?? null,
      context.vfsElevationIntent,
      context.vfsElevationScopeTemplateIds,
      requiredPresetSkillPaths,
      requiredPresetSkillRequirements,
      context.userAction,
    );

    const newMessages = result._conversationHistory.slice(activeHistory.length);
    console.log(
      `[Adventure] Appending ${newMessages.length} new messages to history.`,
    );
    appendToHistory(
      sessionId,
      newMessages,
      instance.protocol,
      context.vfsSession,
      gameState.forkId ?? 0,
    );
    activeHistory = result._conversationHistory;
    return result;
  };

  const executeWithRetryBoost = async (): Promise<AgenticLoopResult> => {
    const baseExtra = context.settings.extra || {};
    const baseToolCalls =
      typeof baseExtra.maxToolCalls === "number" ? baseExtra.maxToolCalls : 50;
    const baseRounds =
      typeof baseExtra.maxAgenticRounds === "number"
        ? baseExtra.maxAgenticRounds
        : 20;

    const boostedSettings: AISettings = {
      ...context.settings,
      extra: {
        ...baseExtra,
        maxToolCalls: Math.max(1, Math.ceil(baseToolCalls * 1.3)),
        maxAgenticRounds: Math.max(1, Math.ceil(baseRounds * 1.3)),
      },
    };

    return executeSingleAttempt(boostedSettings);
  };

  let autoCompactAttemptedForContextOverflow = false;
  const maybeAutoCompactOnContextOverflow = async (): Promise<void> => {
    if (autoCompactAttemptedForContextOverflow) {
      return;
    }
    autoCompactAttemptedForContextOverflow = true;

    const autoCompactEnabled = context.settings.extra?.autoCompactEnabled ?? true;
    if (!autoCompactEnabled) {
      return;
    }

    const committedLength = Array.isArray(gameState.currentFork)
      ? gameState.currentFork.length
      : 0;
    const baseIndexRaw =
      typeof gameState.lastSummarizedIndex === "number"
        ? gameState.lastSummarizedIndex
        : 0;
    const baseIndex = Math.max(0, Math.floor(baseIndexRaw));
    if (committedLength <= baseIndex) {
      return;
    }

    const nodeRange = {
      fromIndex: baseIndex,
      toIndex: committedLength - 1,
    };
    const pendingPlayerAction =
      !context.isInit &&
      typeof context.userAction === "string" &&
      context.userAction.trim().length > 0
        ? { segmentIdx: committedLength, text: context.userAction }
        : null;

    try {
      const sumResult = await summarizeContext({
        vfsSession: context.vfsSession,
        slotId: context.slotId,
        forkId: gameState.forkId ?? 0,
        baseSummaries: Array.isArray(gameState.summaries)
          ? gameState.summaries
          : [],
        baseIndex,
        nodeRange,
        language: context.language,
        settings: context.settings,
        pendingPlayerAction,
        mode: "auto",
      });

      if (sumResult.summary) {
        console.log(
          `[TurnRecovery] Auto compact/query summary on context pressure succeeded (range ${nodeRange.fromIndex}-${nodeRange.toIndex}).`,
        );
      } else if (sumResult.error) {
        console.warn(
          `[TurnRecovery] Auto compact/query summary on context pressure failed: ${sumResult.error}`,
        );
      }
    } catch (error) {
      console.warn(
        "[TurnRecovery] Auto compact/query summary on context pressure threw error.",
        error,
      );
    }
  };

  const resetSessionForRecovery = async (kind: TurnRecoveryKind) => {
    if (kind === "context") {
      await maybeAutoCompactOnContextOverflow();
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

  const turnRetryBoostMessage =
    context.tFunc("game.recovery.turnRetryBoostConfirm") ||
    "Turn was not committed. Retry once with temporary +30% tool/round budget?";

  const sessionRebuildMessage =
    context.tFunc("game.recovery.sessionRebuildConfirm") ||
    "Recovery still failed. Rebuild session context and retry?";

  try {
    const { result, recovery } = await executeTurnWithRecovery({
      execute: executeSingleAttempt,
      executeWithRetryBoost,
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
      confirmRecoveryAction: context.confirmRecoveryAction,
      autoApproveSessionRebuildKinds: ["context"],
      messages: {
        turnRetryBoost: turnRetryBoostMessage,
        sessionRebuild: sessionRebuildMessage,
      },
      onLog: (payload) => {
        console.log("[TurnRecovery]", {
          sessionId,
          forkId: gameState.forkId ?? 0,
          actionMode: isSudoMode
            ? "sudo"
            : isCleanupMode
              ? "cleanup"
              : "normal",
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
      await maybeAutoCompactOnContextOverflow();
      const contextError = new Error(
        `CONTEXT_LENGTH_EXCEEDED: ${error instanceof Error ? error.message : String(error)}`,
      ) as Error & {
        recovery?: TurnRecoveryTrace;
        recoveryKind?: TurnRecoveryKind;
      };
      contextError.recovery = recoveryTrace;
      contextError.recoveryKind = recoveryKind || "context";
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
  vfsElevationIntent?:
    | "outline_submit"
    | "sudo_command"
    | "god_turn"
    | "history_rewrite"
    | "editor_session",
  vfsElevationScopeTemplateIds?: string[] | "all_elevated",
  requiredPresetSkillPaths: string[] = [],
  requiredPresetSkillRequirements: ActivePresetSkillRequirement[] = [],
  currentUserAction?: string,
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
    vfsElevationIntent,
    vfsElevationScopeTemplateIds,
    requiredPresetSkillPaths,
    requiredPresetSkillRequirements,
    currentUserAction,
  });
};
