import {
  AISettings,
  LogEntry,
  StoryOutline,
  PartialStoryOutline,
  StorySummary,
  StorySegment,
  GameState,
} from "../../types";

import {
  OutlinePhase1,
  OutlinePhase2,
  OutlinePhase3,
  OutlinePhase4,
  OutlinePhase5,
  OutlinePhase6,
  OutlinePhase7,
  OutlinePhase8,
  OutlinePhase9,
  outlinePhase1Schema,
  outlinePhase2Schema,
  outlinePhase3Schema,
  outlinePhase4Schema,
  outlinePhase5Schema,
  outlinePhase6Schema,
  outlinePhase7Schema,
  outlinePhase8Schema,
  outlinePhase9Schema,
} from "../schemas";

import {
  getOutlineSystemInstruction,
  getOutlinePhase1Prompt,
  getOutlinePhase2Prompt,
  getOutlinePhase3Prompt,
  getOutlinePhase4Prompt,
  getOutlinePhase5Prompt,
  getOutlinePhase6Prompt,
  getOutlinePhase7Prompt,
  getOutlinePhase8Prompt,
  getOutlinePhase9Prompt,
} from "../prompts/index";

import { THEMES } from "../../utils/constants";

import { GenerateContentResult, generateContentUnified } from "./core";

import { getProviderConfig, createLogEntry } from "./utils";

// @ts-ignore
import promptInjectionData from "@/prompt/prompt.toml";

// ============================================================================
// Phased Story Outline Generation
// ============================================================================

/** Progress callback for phased generation */
export interface OutlinePhaseProgress {
  phase: number;
  totalPhases: number;
  phaseName: string;
  status: "starting" | "generating" | "completed" | "error";
  partialOutline?: PartialStoryOutline;
  error?: string;
}

/** Conversation message format for outline generation */
export type OutlineConversationMessage = {
  role: "user" | "model";
  parts: { text: string }[];
};

/** Conversation state for resuming outline generation */
export interface OutlineConversationState {
  theme: string;
  language: string;
  customContext?: string;
  systemInstruction: string;
  messages: OutlineConversationMessage[];
  partial: PartialStoryOutline;
  currentPhase: number;
}

/** Options for phased outline generation */
export interface PhasedOutlineOptions {
  onPhaseProgress?: (progress: OutlinePhaseProgress) => void;
  onChunk?: (text: string) => void;
  /** Resume from saved conversation state */
  resumeFromConversation?: OutlineConversationState;
  /** Callback to save conversation state after each phase for fault recovery */
  onSaveConversation?: (state: OutlineConversationState) => void;
  /** 可选的设置对象，如果不提供则使用全局设置 */
  settings?: AISettings;
}

/**
 * Generate story outline in phases (multi-turn conversation)
 * This avoids "schema produces a constraint that has too many states" errors
 * by splitting the large schema into smaller per-phase schemas.
 *
 * Supports fault recovery by saving conversation state after each phase.
 * All JSON output is compact (no pretty printing) for efficiency.
 */
export const generateStoryOutlinePhased = async (
  theme: string,
  language: string,
  customContext?: string,
  tFunc?: (key: string, options?: Record<string, unknown>) => string,
  options?: PhasedOutlineOptions,
): Promise<{ outline: StoryOutline; logs: LogEntry[] }> => {
  if (!options?.settings) {
    throw new Error("settings is required in options");
  }
  const settings = options.settings;
  // Use "lore" model config for outline generation (typically more capable model)
  const providerInfo = getProviderConfig(settings, "lore");
  if (!providerInfo) {
    throw new Error("Lore provider not configured");
  }
  const { instance, config, modelId } = providerInfo;
  const logs: LogEntry[] = [];

  // Initialize from resume state or fresh
  let partial: PartialStoryOutline = {};
  let conversationHistory: OutlineConversationMessage[] = [];
  let systemInstruction: string;

  // Get theme data for Phase 1
  let themeDataWorldSetting: string | undefined;
  let themeDataBackgroundTemplate: string | undefined;
  let themeDataExample: string | undefined;
  let themeDataNarrativeStyle: string | undefined;
  let isRestricted = false;

  if (tFunc) {
    themeDataWorldSetting = tFunc(`${theme}.worldSetting`, { ns: "themes" });
    themeDataBackgroundTemplate =
      tFunc(`${theme}.backgroundTemplate`, { ns: "themes" }) ||
      tFunc(`fantasy.backgroundTemplate`, { ns: "themes" });
    themeDataExample = tFunc(`${theme}.example`, { ns: "themes" });
    themeDataNarrativeStyle = tFunc(`${theme}.narrativeStyle`, {
      ns: "themes",
    });
  } else {
    const themeData = THEMES[theme] || THEMES["fantasy"];
    themeDataBackgroundTemplate = themeData.backgroundTemplate;
    themeDataExample = themeData.example;
  }

  const themeConfig = THEMES[theme] || THEMES["fantasy"];
  isRestricted = themeConfig?.restricted || false;

  // Resume from saved conversation state if available
  if (options?.resumeFromConversation) {
    const resumeState = options.resumeFromConversation;
    partial = resumeState.partial;
    conversationHistory = [...resumeState.messages];
    systemInstruction = resumeState.systemInstruction;
    console.log(
      `[OutlinePhased] Resuming from phase ${resumeState.currentPhase}`,
    );
  } else {
    // Build fresh system instruction
    systemInstruction = getOutlineSystemInstruction(
      language,
      isRestricted,
      themeDataNarrativeStyle,
      themeDataBackgroundTemplate,
      themeDataExample,
      themeDataWorldSetting,
    );

    // Inject prompt injections from config
    const promptInjectionEnabled = settings.extra?.promptInjectionEnabled;
    const customPromptInjection = settings.extra?.customPromptInjection?.trim();

    // Custom prompt injection takes priority over model-based injection
    if (customPromptInjection) {
      systemInstruction = `${customPromptInjection}\n\n${systemInstruction}`;
      console.warn(
        `[PromptInjection] Injecting custom prompt (${customPromptInjection.length} chars)`,
      );
    } else if (promptInjectionEnabled && promptInjectionData) {
      const loweredModelId = modelId.toLowerCase();
      console.log(
        `[PromptInjection] Checking for prompts to inject for model ${modelId}`,
      );
      const matchedPrompt = promptInjectionData.prompts.find((p) =>
        p.keywords.some((k) => loweredModelId.includes(k.toLowerCase())),
      );
      if (matchedPrompt) {
        systemInstruction = `${matchedPrompt.prompt}\n\n${systemInstruction}`;
        console.warn(
          `[PromptInjection] Injecting outline prompt for model ${modelId} (matched keywords: ${matchedPrompt.keywords.join(", ")})`,
        );
      }
    }
  }

  // Helper to save conversation state
  const saveConversationState = (currentPhase: number) => {
    if (options?.onSaveConversation) {
      options.onSaveConversation({
        theme,
        language,
        customContext,
        systemInstruction,
        messages: conversationHistory,
        partial,
        currentPhase,
      });
    }
  };

  // Helper to report progress
  const reportProgress = (
    phase: number,
    status: OutlinePhaseProgress["status"],
    error?: string,
  ) => {
    if (options?.onPhaseProgress) {
      options.onPhaseProgress({
        phase,
        totalPhases: 9,
        phaseName: `initializing.outline.phase.${phase}.name`,
        status,
        partialOutline: partial,
        error,
      });
    }
  };

  // Determine starting phase based on resume data (from saved conversation)
  let startPhase = 1;
  if (options?.resumeFromConversation) {
    startPhase = options.resumeFromConversation.currentPhase;
  } else if (partial.phase9) {
    startPhase = 10; // All done
  } else if (partial.phase8) {
    startPhase = 9;
  } else if (partial.phase7) {
    startPhase = 8;
  } else if (partial.phase6) {
    startPhase = 7;
  } else if (partial.phase5) {
    startPhase = 6;
  } else if (partial.phase4) {
    startPhase = 5;
  } else if (partial.phase3) {
    startPhase = 4;
  } else if (partial.phase2) {
    startPhase = 3;
  } else if (partial.phase1) {
    startPhase = 2;
  }

  // Helper to execute a single phase
  const executePhase = async <T>(
    phaseNum: number,
    prompt: string,
    schema: any, // Using any for Zod schema to avoid complex type issues
    field: keyof PartialStoryOutline,
  ) => {
    if (startPhase > phaseNum) return;

    reportProgress(phaseNum, "starting");
    conversationHistory.push({ role: "user", parts: [{ text: prompt }] });

    try {
      reportProgress(phaseNum, "generating");
      const { result, log } = await generateContentUnified(
        instance.protocol,
        modelId,
        systemInstruction,
        conversationHistory,
        schema,
        { settings, logEndpoint: `outline-phase${phaseNum}` },
      );

      // Update partial outline
      (partial as any)[field] = result;

      // Add to conversation history
      conversationHistory.push({
        role: "model",
        parts: [{ text: JSON.stringify(result) }],
      });

      if (log) logs.push(log);
      reportProgress(phaseNum, "completed");

      // Save state for next phase (phaseNum + 1)
      saveConversationState(phaseNum + 1);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      reportProgress(phaseNum, "error", error);
      throw e;
    }
  };

  // Get flatten flag from settings
  const flatten = settings.extra?.flattenSchema;

  // Phase 1: World Foundation
  await executePhase(
    1,
    getOutlinePhase1Prompt(theme, language, customContext, flatten),
    outlinePhase1Schema,
    "phase1",
  );

  // Phase 2: Protagonist Character
  await executePhase(
    2,
    getOutlinePhase2Prompt(flatten),
    outlinePhase2Schema,
    "phase2",
  );

  // Phase 3: Locations
  await executePhase(
    3,
    getOutlinePhase3Prompt(flatten),
    outlinePhase3Schema,
    "phase3",
  );

  // Phase 4: Factions
  await executePhase(
    4,
    getOutlinePhase4Prompt(flatten),
    outlinePhase4Schema,
    "phase4",
  );

  // Phase 5: Relationships (NPCs)
  await executePhase(
    5,
    getOutlinePhase5Prompt(flatten),
    outlinePhase5Schema,
    "phase5",
  );

  // Phase 6: Inventory
  await executePhase(
    6,
    getOutlinePhase6Prompt(flatten),
    outlinePhase6Schema,
    "phase6",
  );

  // Phase 7: Quests
  await executePhase(
    7,
    getOutlinePhase7Prompt(flatten),
    outlinePhase7Schema,
    "phase7",
  );

  // Phase 8: Knowledge
  await executePhase(
    8,
    getOutlinePhase8Prompt(flatten),
    outlinePhase8Schema,
    "phase8",
  );

  // Phase 9: Timeline & Atmosphere
  await executePhase(
    9,
    getOutlinePhase9Prompt(flatten),
    outlinePhase9Schema,
    "phase9",
  );

  // Merge all phases into complete StoryOutline
  const outline = mergeOutlinePhases(partial);

  return { outline, logs };
};

/**
 * Merge partial outline phases into a complete StoryOutline
 * Uses type assertions because PartialStoryOutline uses generic object type for persistence
 */
function mergeOutlinePhases(partial: PartialStoryOutline): StoryOutline {
  if (
    !partial.phase1 ||
    !partial.phase2 ||
    !partial.phase3 ||
    !partial.phase4 ||
    !partial.phase5 ||
    !partial.phase6 ||
    !partial.phase7 ||
    !partial.phase8 ||
    !partial.phase9
  ) {
    throw new Error("Cannot merge incomplete outline phases");
  }

  // Cast phases to their expected types
  const p1 = partial.phase1 as OutlinePhase1;
  const p2 = partial.phase2 as OutlinePhase2;
  const p3 = partial.phase3 as OutlinePhase3;
  const p4 = partial.phase4 as OutlinePhase4;
  const p5 = partial.phase5 as OutlinePhase5;
  const p6 = partial.phase6 as OutlinePhase6;
  const p7 = partial.phase7 as OutlinePhase7;
  const p8 = partial.phase8 as OutlinePhase8;
  const p9 = partial.phase9 as OutlinePhase9;

  // Track maximum IDs assigned to update nextIds
  const maxIds: Record<string, number> = {
    item: 0,
    npc: 0,
    location: 0,
    knowledge: 0,
    quest: 0,
    faction: 0,
    timeline: 0,
    skill: 0,
    condition: 0,
    hiddenTrait: 0,
  };

  // Helper to ensure all entities have IDs and set unlocked: false
  // Also tracks the maximum ID number used for each type
  const prepareEntities = <T extends { id?: string; unlocked?: boolean }>(
    items: T[] | undefined | null,
    prefix: string,
    nextIdKey: keyof typeof maxIds,
  ): T[] => {
    if (!items || items.length === 0) return [];
    let counter = 1;
    const result = items.map((item) => {
      const hasId = !!item.id;
      let idNumber: number;

      if (hasId) {
        // Extract number from existing ID (e.g., "loc:5" -> 5)
        const match = item.id!.match(/:(\d+)$/);
        idNumber = match ? parseInt(match[1], 10) : counter;
      } else {
        idNumber = counter;
      }

      const newId = hasId ? item.id : `${prefix}:${idNumber}`;
      if (!hasId) {
        console.warn(
          `[OutlineMerge] Auto-assigning ID ${newId} to entity without ID`,
        );
      }

      // Track maximum ID for this type
      if (idNumber > maxIds[nextIdKey]) {
        maxIds[nextIdKey] = idNumber;
      }

      counter = idNumber + 1;
      return { ...item, id: newId, unlocked: false };
    });

    return result;
  };

  // Build outline with all entities properly prepared
  const outline: StoryOutline = {
    // Phase 1: World Foundation
    title: p1.title,
    initialTime: p1.initialTime,
    premise: p1.premise,
    worldSetting: p1.worldSetting as StoryOutline["worldSetting"],
    mainGoal: p1.mainGoal as StoryOutline["mainGoal"],

    // Phase 2: Character (with skills, conditions, hiddenTraits)
    character: {
      ...p2.character,
      skills: p2.character.skills
        ? prepareEntities(p2.character.skills, "skill", "skill")
        : undefined,
      conditions: p2.character.conditions
        ? prepareEntities(p2.character.conditions, "cond", "condition")
        : undefined,
      hiddenTraits: p2.character.hiddenTraits
        ? prepareEntities(p2.character.hiddenTraits, "trait", "hiddenTrait")
        : undefined,
    } as StoryOutline["character"],

    // Phase 3: Locations
    locations: prepareEntities(
      p3.locations as StoryOutline["locations"],
      "loc",
      "location",
    ) as StoryOutline["locations"],

    // Phase 4: Factions
    factions: prepareEntities(
      p4.factions as StoryOutline["factions"],
      "fac",
      "faction",
    ) as StoryOutline["factions"],

    // Phase 5: Relationships
    relationships: prepareEntities(
      p5.relationships as StoryOutline["relationships"],
      "npc",
      "npc",
    ) as StoryOutline["relationships"],

    // Phase 6: Inventory
    inventory: prepareEntities(
      p6.inventory as StoryOutline["inventory"],
      "inv",
      "item",
    ) as StoryOutline["inventory"],

    // Phase 7: Quests
    quests: prepareEntities(
      p7.quests as StoryOutline["quests"],
      "quest",
      "quest",
    ) as StoryOutline["quests"],

    // Phase 8: Knowledge
    knowledge: prepareEntities(
      p8.knowledge as StoryOutline["knowledge"],
      "know",
      "knowledge",
    ) as StoryOutline["knowledge"],

    // Phase 9: Timeline & Atmosphere
    timeline: prepareEntities(
      p9.timeline as StoryOutline["timeline"],
      "evt",
      "timeline",
    ) as StoryOutline["timeline"],
    initialAtmosphere:
      p9.initialAtmosphere as StoryOutline["initialAtmosphere"],
  };

  // Update nextIds to be one more than the maximum used ID for each type
  // This will be set in GameState when the outline is applied
  (outline as any).__nextIds = {
    item: maxIds.item + 1,
    npc: maxIds.npc + 1,
    location: maxIds.location + 1,
    knowledge: maxIds.knowledge + 1,
    quest: maxIds.quest + 1,
    faction: maxIds.faction + 1,
    timeline: maxIds.timeline + 1,
    causalChain: 1, // Not set in outline
    skill: maxIds.skill + 1,
    condition: maxIds.condition + 1,
    hiddenTrait: maxIds.hiddenTrait + 1,
  };

  return outline;
}

/**
 * 总结上下文 (Agentic Loop 版本)
 *
 * 采用 agentic loop 模式：
 * - 初始只传递上一轮摘要和本轮对话概要
 * - AI 自主决定需要查询什么信息
 * - 两个阶段：query（查询）和 finish（完成）
 *
 * @param previousSummary 之前的摘要
 * @param segmentsToSummarize 需要总结的片段
 * @param nodeRange 节点范围
 * @param language 语言
 * @param settings 设置对象（必需）
 * @param gameState 完整游戏状态（用于查询）
 */
export const summarizeContext = async (
  previousSummary: StorySummary | null,
  segmentsToSummarize: StorySegment[],
  nodeRange: { fromIndex: number; toIndex: number },
  language: string,
  settings: AISettings,
  gameState: GameState,
): Promise<{
  summary: StorySummary | null;
  logs: LogEntry[];
  error?: string;
}> => {
  const { runSummaryAgenticLoop } = await import("./summary");

  try {
    const result = await runSummaryAgenticLoop({
      previousSummary,
      segmentsToSummarize,
      gameState,
      nodeRange,
      language,
      settings,
    });

    // Check for null summary (failure)
    if (!result.summary) {
      return {
        summary: null,
        logs: result.logs,
        error: "Summary generation failed",
      };
    }

    return {
      summary: result.summary,
      logs: result.logs,
    };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error("Summary agentic loop failed", error);

    const providerInfo = getProviderConfig(settings, "story");
    return {
      summary: null,
      logs: [
        createLogEntry(
          providerInfo?.instance.protocol || "openai",
          providerInfo?.modelId || "unknown",
          "summary-error",
          { error: error.message },
          null,
        ),
      ],
      error: error.message,
    };
  }
};
