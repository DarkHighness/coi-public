import {
  AISettings,
  LogEntry,
  StoryOutline,
  PartialStoryOutline,
  StorySummary,
} from "../../types";

import {
  OutlinePhase1,
  OutlinePhase2,
  OutlinePhase3,
  OutlinePhase4,
  OutlinePhase5,
  outlinePhase1Schema,
  outlinePhase2Schema,
  outlinePhase3Schema,
  outlinePhase4Schema,
  outlinePhase5Schema,
  storySummarySchema,
} from "../schemas";

import {
  getOutlineSystemInstruction,
  getOutlinePhase1Prompt,
  getOutlinePhase2Prompt,
  getOutlinePhase3Prompt,
  getOutlinePhase4Prompt,
  getOutlinePhase5Prompt,
  getSummaryPrompt,
} from "../prompts/index";

import { THEMES, OUTLINE_PHASES } from "../../utils/constants";

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
    if (promptInjectionEnabled && promptInjectionData) {
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
        totalPhases: 5,
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
  } else if (partial.phase5) {
    startPhase = 6; // All done
  } else if (partial.phase4) {
    startPhase = 5;
  } else if (partial.phase3) {
    startPhase = 4;
  } else if (partial.phase2) {
    startPhase = 3;
  } else if (partial.phase1) {
    startPhase = 2;
  }

  // Phase 1: World Foundation
  if (startPhase <= 1) {
    reportProgress(1, "starting");

    const phase1Prompt = getOutlinePhase1Prompt(theme, language, customContext);
    conversationHistory.push({ role: "user", parts: [{ text: phase1Prompt }] });

    try {
      reportProgress(1, "generating");
      // NOTE: No onChunk to force non-streaming mode for reliable JSON schema enforcement
      const { result, log } = await generateContentUnified(
        instance.protocol,
        modelId,
        systemInstruction,
        conversationHistory,
        outlinePhase1Schema,
        { settings },
      );
      partial.phase1 = result as OutlinePhase1;
      // Use compact JSON (no spaces) for conversation history
      conversationHistory.push({
        role: "model",
        parts: [{ text: JSON.stringify(result) }],
      });
      if (log) logs.push(log);
      reportProgress(1, "completed");
      // Save conversation state for fault recovery (next phase = 2)
      saveConversationState(2);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      reportProgress(1, "error", error);
      throw e;
    }
  }

  // Phase 2: Protagonist Character
  if (startPhase <= 2) {
    reportProgress(2, "starting");

    const phase2Prompt = getOutlinePhase2Prompt();
    conversationHistory.push({ role: "user", parts: [{ text: phase2Prompt }] });

    try {
      reportProgress(2, "generating");
      // NOTE: No onChunk to force non-streaming mode for reliable JSON schema enforcement
      const { result, log } = await generateContentUnified(
        instance.protocol,
        modelId,
        systemInstruction,
        conversationHistory,
        outlinePhase2Schema,
        { settings },
      );
      partial.phase2 = result as OutlinePhase2;
      conversationHistory.push({
        role: "model",
        parts: [{ text: JSON.stringify(result) }],
      });
      if (log) logs.push(log);
      reportProgress(2, "completed");
      // Save conversation state for fault recovery (next phase = 3)
      saveConversationState(3);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      reportProgress(2, "error", error);
      throw e;
    }
  }

  // Phase 3: World Entities
  if (startPhase <= 3) {
    reportProgress(3, "starting");

    const phase3Prompt = getOutlinePhase3Prompt();
    conversationHistory.push({ role: "user", parts: [{ text: phase3Prompt }] });

    try {
      reportProgress(3, "generating");
      // NOTE: No onChunk to force non-streaming mode for reliable JSON schema enforcement
      const { result, log } = await generateContentUnified(
        instance.protocol,
        modelId,
        systemInstruction,
        conversationHistory,
        outlinePhase3Schema,
        { settings },
      );
      partial.phase3 = result as OutlinePhase3;
      conversationHistory.push({
        role: "model",
        parts: [{ text: JSON.stringify(result) }],
      });
      if (log) logs.push(log);
      reportProgress(3, "completed");
      // Save conversation state for fault recovery (next phase = 4)
      saveConversationState(4);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      reportProgress(3, "error", error);
      throw e;
    }
  }

  // Phase 4: Relationships & Inventory
  if (startPhase <= 4) {
    reportProgress(4, "starting");

    const phase4Prompt = getOutlinePhase4Prompt();
    conversationHistory.push({ role: "user", parts: [{ text: phase4Prompt }] });

    try {
      reportProgress(4, "generating");
      // NOTE: No onChunk to force non-streaming mode for reliable JSON schema enforcement
      const { result, log } = await generateContentUnified(
        instance.protocol,
        modelId,
        systemInstruction,
        conversationHistory,
        outlinePhase4Schema,
        { settings },
      );
      partial.phase4 = result as OutlinePhase4;
      conversationHistory.push({
        role: "model",
        parts: [{ text: JSON.stringify(result) }],
      });
      if (log) logs.push(log);
      reportProgress(4, "completed");
      // Save conversation state for fault recovery (next phase = 5)
      saveConversationState(5);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      reportProgress(4, "error", error);
      throw e;
    }
  }

  // Phase 5: Quests, Knowledge & Atmosphere
  if (startPhase <= 5) {
    reportProgress(5, "starting");

    const phase5Prompt = getOutlinePhase5Prompt();
    conversationHistory.push({ role: "user", parts: [{ text: phase5Prompt }] });

    try {
      reportProgress(5, "generating");
      // NOTE: No onChunk to force non-streaming mode for reliable JSON schema enforcement
      const { result, log } = await generateContentUnified(
        instance.protocol,
        modelId,
        systemInstruction,
        conversationHistory,
        outlinePhase5Schema,
        { settings },
      );
      partial.phase5 = result as OutlinePhase5;
      if (log) logs.push(log);
      reportProgress(5, "completed");
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      reportProgress(5, "error", error);
      throw e;
    }
  }

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
    !partial.phase5
  ) {
    throw new Error("Cannot merge incomplete outline phases");
  }

  // Cast phases to their expected types
  const p1 = partial.phase1 as OutlinePhase1;
  const p2 = partial.phase2 as OutlinePhase2;
  const p3 = partial.phase3 as OutlinePhase3;
  const p4 = partial.phase4 as OutlinePhase4;
  const p5 = partial.phase5 as OutlinePhase5;

  return {
    // Phase 1: World Foundation
    title: p1.title,
    initialTime: p1.initialTime,
    premise: p1.premise,
    worldSetting: p1.worldSetting as StoryOutline["worldSetting"],
    mainGoal: p1.mainGoal as StoryOutline["mainGoal"],

    // Phase 2: Character
    character: p2.character as StoryOutline["character"],

    // Phase 3: World Entities
    locations: p3.locations as StoryOutline["locations"],
    factions: p3.factions as StoryOutline["factions"],

    // Phase 4: Relationships & Inventory
    relationships: p4.relationships as StoryOutline["relationships"],
    inventory: p4.inventory as StoryOutline["inventory"],

    // Phase 5: Quests, Knowledge & Atmosphere
    quests: p5.quests as StoryOutline["quests"],
    knowledge: p5.knowledge as StoryOutline["knowledge"],
    timeline: p5.timeline as StoryOutline["timeline"],
    initialAtmosphere:
      p5.initialAtmosphere as StoryOutline["initialAtmosphere"],
  };
}

/**
 * 总结上下文
 * @param previousSummary 之前的摘要
 * @param newTurns 新的回合内容
 * @param language 语言
 * @param settings 设置对象（必需）
 */
export const summarizeContext = async (
  previousSummary: StorySummary,
  newTurns: string,
  language: string,
  settings: AISettings,
): Promise<{ summary: StorySummary | null; log: LogEntry }> => {
  const providerInfo = getProviderConfig(settings, "story");
  if (!providerInfo) {
    throw new Error("Story provider not configured");
  }
  const { instance, modelId } = providerInfo;
  const prompt = getSummaryPrompt(previousSummary, newTurns, language);
  const sys =
    "You are a diligent chronicler summarizing events. Focus on facts and cause-and-effect, tracking changes in quests, relationships, inventory, character status, and locations. Output strictly valid JSON.";
  const contents = [{ role: "user", parts: [{ text: prompt }] }];

  try {
    const { result, log } = await generateContentUnified(
      instance.protocol,
      modelId,
      sys,
      contents,
      storySummarySchema,
      { settings },
    );
    return { summary: result as StorySummary, log: log! };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error("Summary failed", error);
    return {
      summary: null,
      log: createLogEntry(
        instance.protocol,
        modelId,
        "summary",
        { error: error.message },
        null,
      ),
    };
  }
};
