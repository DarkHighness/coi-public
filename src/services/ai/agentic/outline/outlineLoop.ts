/**
 * Outline Loop - Refactored Main Loop
 *
 * Modular implementation of the outline agentic loop.
 */

import type {
  AISettings,
  LogEntry,
  StoryOutline,
  ResolvedThemeConfig,
  UnifiedMessage,
} from "../../../../types";
import type { ToolCallResult } from "../../../providers/types";

import { sessionManager } from "../../sessionManager";
import { getProviderConfig, createLogEntry } from "../../utils";
import {
  createUserMessage,
  createToolCallMessage,
  createToolResponseMessage,
} from "../../../messageTypes";
import { callWithAgenticRetry } from "../retry";
import {
  checkBudgetExhaustion,
  generateBudgetPrompt,
  incrementToolCalls,
  incrementRetries,
  incrementIterations,
  getBudgetSummary,
} from "../budgetUtils";
import { getOutlineSystemInstruction } from "../../../prompts/index";

import { OUTLINE_PHASE_TOOLS } from "./outlineTools";
import { getPhasePrompt } from "./outlinePrompts";
import {
  createOutlineLoopState,
  accumulateOutlineUsage,
  OutlineResumeState,
} from "./outlineInitializer";
import { processPhaseResult, mergeOutlinePhases } from "./outlinePhaseHandler";

// ============================================================================
// Types
// ============================================================================

export interface OutlineLoopOptions {
  theme: string;
  language: string;
  settings: AISettings;
  customContext?: string;
  seedImageBase64?: string;
  resumeFrom?: OutlineResumeState;
  onProgress?: (phase: number, status: string) => void;
}

export interface OutlineLoopResult {
  outline: StoryOutline;
  logs: LogEntry[];
  themeConfig: ResolvedThemeConfig;
}

// ============================================================================
// Main Loop
// ============================================================================

export async function runOutlineLoopRefactored(
  options: OutlineLoopOptions,
): Promise<OutlineLoopResult> {
  const {
    theme,
    language,
    settings,
    customContext,
    seedImageBase64,
    resumeFrom,
    onProgress,
  } = options;

  // Get provider
  const providerInfo = getProviderConfig(settings, "lore");
  if (!providerInfo) throw new Error("Lore provider not configured");
  const { instance, modelId } = providerInfo;

  // Create session
  const outlineSession = await sessionManager.getOrCreateSession({
    slotId: "outline",
    forkId: -1,
    providerId: instance.id,
    modelId,
    protocol: instance.protocol,
  });
  const provider = sessionManager.getProvider(outlineSession.id, instance);

  // Initialize state
  const loopState = createOutlineLoopState(
    settings,
    theme,
    language,
    customContext,
    seedImageBase64,
    resumeFrom,
  );

  const systemInstruction = getOutlineSystemInstruction(language);
  const allLogs: LogEntry[] = [];
  const hasImage = !!seedImageBase64;

  // Main phase loop
  while (loopState.currentPhase <= 9) {
    const budgetCheck = checkBudgetExhaustion(loopState.budgetState);
    if (budgetCheck.exhausted) {
      throw new Error(budgetCheck.message);
    }

    const phaseNum = loopState.currentPhase;
    const phaseTool = OUTLINE_PHASE_TOOLS[phaseNum];

    console.log(
      `[OutlineLoop] Phase ${phaseNum}. Budget: ${getBudgetSummary(loopState.budgetState)}`,
    );
    onProgress?.(phaseNum, "starting");

    // Inject budget and phase prompt
    loopState.conversationHistory.push(
      createUserMessage(
        `[SYSTEM: BUDGET STATUS]\n${generateBudgetPrompt(loopState.budgetState)}`,
      ),
    );

    const phasePrompt = getPhasePrompt(
      phaseNum,
      theme,
      language,
      customContext,
      hasImage,
    );
    if (phasePrompt) {
      loopState.conversationHistory.push(createUserMessage(phasePrompt));
    }

    // Call AI
    onProgress?.(phaseNum, "generating");

    const { result, usage, log } = await callPhaseAI({
      provider,
      modelId,
      systemInstruction,
      conversationHistory: loopState.conversationHistory,
      phaseTool,
      settings,
      loopState,
      instance,
      phaseNum,
    });

    allLogs.push(log);
    accumulateOutlineUsage(loopState, usage);
    incrementToolCalls(loopState.budgetState, 1);
    incrementIterations(loopState.budgetState);

    // Process result
    processPhaseResult(phaseNum, result, loopState);
    onProgress?.(phaseNum, "completed");

    loopState.currentPhase++;
  }

  // Merge phases into final outline
  const outline = mergeOutlinePhases(loopState.partial);

  // Create a basic theme config (full resolution happens in outline.ts with tFunc)
  const themeConfig: ResolvedThemeConfig = {
    name: theme || "Unknown",
    narrativeStyle: "",
    worldSetting: "",
    backgroundTemplate: "",
    example: "",
    isRestricted: false,
  };

  return { outline, logs: allLogs, themeConfig };
}

// ============================================================================
// AI Call Helper
// ============================================================================

async function callPhaseAI(params: {
  provider: any;
  modelId: string;
  systemInstruction: string;
  conversationHistory: UnifiedMessage[];
  phaseTool: any;
  settings: AISettings;
  loopState: any;
  instance: any;
  phaseNum: number;
}) {
  const {
    provider,
    modelId,
    systemInstruction,
    conversationHistory,
    phaseTool,
    settings,
    loopState,
    instance,
    phaseNum,
  } = params;

  const resp = await callWithAgenticRetry(
    provider,
    {
      modelId,
      systemInstruction,
      messages: [],
      tools: [
        {
          name: phaseTool.name,
          description: phaseTool.description,
          parameters: phaseTool.parameters,
        },
      ],
      toolChoice: "required",
      temperature: settings.story?.temperature,
    },
    conversationHistory,
    {
      maxRetries: loopState.budgetState.retriesMax,
      requiredToolName: phaseTool.name,
      schema: phaseTool.parameters,
      onRetry: (err, count) => {
        incrementRetries(loopState.budgetState);
        conversationHistory.push(
          createUserMessage(
            `[SYSTEM: BUDGET UPDATE]\n${generateBudgetPrompt(loopState.budgetState)}`,
          ),
        );
      },
    },
  );

  const log = createLogEntry({
    provider: instance.protocol,
    model: modelId,
    endpoint: `outline-phase${phaseNum}`,
    phase: phaseNum,
    toolName: phaseTool.name,
    response: resp.raw,
    usage: resp.usage,
  });

  return { result: resp.result, usage: resp.usage, log };
}
