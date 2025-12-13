import {
  AISettings,
  LogEntry,
  StoryOutline,
  PartialStoryOutline,
  StorySummary,
  StorySegment,
  GameState,
  TokenUsage,
  ProviderProtocol,
  ProviderInstance,
  UnifiedMessage,
  OutlineConversationState,
} from "../../../../types";

import { ToolCallResult, ZodToolDefinition } from "../../../providers/types";
import {
  isInvalidArgumentError,
  HistoryCorruptedError,
} from "../../contextCompressor";

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
} from "../../../schemas";

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
} from "../../../prompts/index";

import { THEMES } from "../../../../utils/constants";

import {
  getProviderConfig,
  createLogEntry,
  createProviderConfig,
  extractJson,
} from "../../utils";

import {
  createUserMessage,
  createToolCallMessage,
  createToolResponseMessage,
} from "../../../messageTypes";

import { sessionManager } from "../../sessionManager";

import { detectModelCapabilitiesViaApi } from "../../provider/registry";
import { buildCacheHint } from "../../provider/cacheHint";

// @ts-ignore
import promptInjectionData from "@/prompt/prompt.toml";

// ============================================================================
// Error Detection Helpers
// ============================================================================

/**
 * 检测是否是 tool_choice 不支持的错误
 */
function isToolChoiceNotSupportedError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("Tool choice must be auto") ||
    msg.includes("tool_choice is not supported") ||
    msg.includes("'tool_choice' must be 'auto'") ||
    msg.includes("does not support required tool_choice")
  );
}

// ============================================================================
// Tool Definitions for Outline Generation
// ============================================================================

// Define tools for each phase
const OUTLINE_PHASE_TOOLS: ZodToolDefinition[] = [
  {
    name: "submit_phase1_world_foundation",
    description:
      "Submit Phase 1: World Foundation including title, premise, setting, and main goal",
    parameters: outlinePhase1Schema,
  },
  {
    name: "submit_phase2_character",
    description: "Submit Phase 2: Protagonist character details",
    parameters: outlinePhase2Schema,
  },
  {
    name: "submit_phase3_locations",
    description: "Submit Phase 3: Key locations in the story world",
    parameters: outlinePhase3Schema,
  },
  {
    name: "submit_phase4_factions",
    description: "Submit Phase 4: Factions and groups",
    parameters: outlinePhase4Schema,
  },
  {
    name: "submit_phase5_relationships",
    description: "Submit Phase 5: NPCs and relationships",
    parameters: outlinePhase5Schema,
  },
  {
    name: "submit_phase6_inventory",
    description: "Submit Phase 6: Initial inventory items",
    parameters: outlinePhase6Schema,
  },
  {
    name: "submit_phase7_quests",
    description: "Submit Phase 7: Available quests",
    parameters: outlinePhase7Schema,
  },
  {
    name: "submit_phase8_knowledge",
    description: "Submit Phase 8: Initial knowledge",
    parameters: outlinePhase8Schema,
  },
  {
    name: "submit_phase9_timeline",
    description: "Submit Phase 9: Timeline events and initial atmosphere",
    parameters: outlinePhase9Schema,
  },
];

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

/** Options for phased outline generation */
export interface PhasedOutlineOptions {
  onPhaseProgress?: (progress: OutlinePhaseProgress) => void;
  /** Resume from phase checkpoint */
  resumeFrom?: OutlineConversationState;
  /** Callback to save checkpoint after each phase */
  onSaveCheckpoint?: (state: OutlineConversationState) => void;
  settings: AISettings;
}

/**
 * Generate story outline using agentic loop with phase tools
 * Each phase is a separate tool that the AI calls to submit that phase's data.
 * All phases share the same conversation history for KV cache optimization.
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

  // Use "lore" model config for outline generation
  const providerInfo = getProviderConfig(settings, "lore");
  if (!providerInfo) {
    throw new Error("Lore provider not configured");
  }
  const { instance, modelId } = providerInfo;
  const logs: LogEntry[] = [];

  // Get theme data
  const themeConfig = THEMES[theme] || THEMES["fantasy"];
  const isRestricted = themeConfig?.restricted || false;

  let themeDataWorldSetting: string | undefined;
  let themeDataBackgroundTemplate: string | undefined;
  let themeDataExample: string | undefined;
  let themeDataNarrativeStyle: string | undefined;

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

  // Build system instruction
  let systemInstruction = getOutlineSystemInstruction(
    language,
    isRestricted,
    themeDataNarrativeStyle,
    themeDataBackgroundTemplate,
    themeDataExample,
    themeDataWorldSetting,
  );

  // Inject custom prompts if needed
  const promptInjectionEnabled = settings.extra?.promptInjectionEnabled;
  const customPromptInjection = settings.extra?.customPromptInjection?.trim();

  if (customPromptInjection) {
    systemInstruction = `${customPromptInjection}\n\n${systemInstruction}`;
    console.warn(
      `[OutlineAgentic] Injecting custom prompt (${customPromptInjection.length} chars)`,
    );
  } else if (promptInjectionEnabled && promptInjectionData) {
    const loweredModelId = modelId.toLowerCase();
    const matchedPrompt = promptInjectionData.prompts.find((p) =>
      p.keywords.some((k) => loweredModelId.includes(k.toLowerCase())),
    );
    if (matchedPrompt) {
      systemInstruction = `${matchedPrompt.prompt}\n\n${systemInstruction}`;
      console.warn(`[OutlineAgentic] Injecting prompt for model ${modelId}`);
    }
  }

  // Initialize or restore from checkpoint
  let conversationHistory: UnifiedMessage[];
  let partial: PartialStoryOutline;
  let currentPhase: number;

  if (options.resumeFrom) {
    // Resume from checkpoint
    conversationHistory = [...options.resumeFrom.conversationHistory];
    partial = { ...options.resumeFrom.partial };
    currentPhase = options.resumeFrom.currentPhase;
    console.log(`[OutlineAgentic] Resuming from phase ${currentPhase}`);
  } else {
    // Start fresh
    conversationHistory = [];
    partial = {};
    currentPhase = 1;

    // Add initial task instruction
    conversationHistory.push(
      createUserMessage(`[OUTLINE GENERATION TASK]
Generate a story outline in 9 phases. Each phase builds upon the previous ones.

Theme: ${theme}
Language: ${language}
${customContext ? `Custom Context: ${customContext}` : ""}

**PROCESS:**
- You will receive one phase instruction at a time
- For each phase, you MUST call the provided tool to submit your data
- **CRITICAL**: You must invoke the tool function directly. Do NOT return the schema as a JSON text block.
- After submitting, wait for the next phase instruction
`),
    );
  }

  // Helper to save checkpoint
  const saveCheckpoint = (phase: number) => {
    if (options.onSaveCheckpoint) {
      options.onSaveCheckpoint({
        theme,
        language,
        customContext,
        conversationHistory: [...conversationHistory],
        partial: { ...partial },
        currentPhase: phase,
        modelId, // Track which model was used
        providerId: instance.id, // Track which provider was used
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

  // Create a session for outline generation (for capability tracking)
  // Use a special forkId=-1 to indicate outline phase
  const outlineSession = await sessionManager.getOrCreateSession({
    slotId: options.resumeFrom ? "outline-resume" : "outline-new",
    forkId: -1,
    providerId: instance.id,
    modelId,
    protocol: instance.protocol,
  });

  // Cache hint (provider-specific) - based on the initial prefix messages
  // Outline 的静态前缀包括初始 system prompt 与首批 user 指令。
  const initialPrefix = conversationHistory.slice(0, 2);
  const cacheHint = buildCacheHint(
    instance.protocol,
    systemInstruction,
    initialPrefix,
  );
  sessionManager.setCacheHint(outlineSession.id, cacheHint);

  // Helper to make API call with retry on tool choice error
  const callWithToolChoiceFallback = async (
    phaseTool: ZodToolDefinition,
    phaseNum: number,
  ) => {
    const provider = sessionManager.getProvider(outlineSession.id, instance);
    const effectiveToolChoice = sessionManager.getEffectiveToolChoice(
      outlineSession.id,
      "required",
    );

    try {
      const { result, usage, raw } = await provider.generateChat({
        modelId,
        systemInstruction,
        messages: conversationHistory as unknown[],
        tools: [
          {
            name: phaseTool.name,
            description: phaseTool.description,
            parameters: phaseTool.parameters,
          },
        ],
        toolChoice: effectiveToolChoice,
        thinkingLevel: settings.story?.thinkingLevel,
        mediaResolution: settings.story?.mediaResolution,
        temperature: settings.story?.temperature,
        topP: settings.story?.topP,
        topK: settings.story?.topK,
        minP: settings.story?.minP,
      });

      return {
        result,
        usage,
        raw,
        log: createLogEntry(
          instance.protocol,
          modelId,
          `outline-phase${phaseNum}`,
          { tool: phaseTool.name },
          raw,
          usage,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        ),
      };
    } catch (e) {
      // Check if this is a tool_choice not supported error
      if (
        isToolChoiceNotSupportedError(e) &&
        effectiveToolChoice === "required"
      ) {
        console.warn(
          `[OutlineAgentic] Tool choice 'required' not supported, falling back to 'auto'`,
        );
        // Update session capability
        sessionManager.setModelCapability(
          outlineSession.id,
          "supportsRequiredToolChoice",
          false,
        );
        // Retry with auto
        const { result, usage, raw } = await provider.generateChat({
          modelId,
          systemInstruction,
          messages: conversationHistory as unknown[],
          tools: [
            {
              name: phaseTool.name,
              description: phaseTool.description,
              parameters: phaseTool.parameters,
            },
          ],
          toolChoice: "auto",
          thinkingLevel: settings.story?.thinkingLevel,
          mediaResolution: settings.story?.mediaResolution,
          temperature: settings.story?.temperature,
          topP: settings.story?.topP,
          topK: settings.story?.topK,
          minP: settings.story?.minP,
        });

        return {
          result,
          usage,
          raw,
          log: createLogEntry(
            instance.protocol,
            modelId,
            `outline-phase${phaseNum}`,
            { tool: phaseTool.name, toolChoice: "auto" },
            raw,
            usage,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          ),
        };
      }
      throw e;
    }
  };

  // Agentic loop for each phase
  while (currentPhase <= 9) {
    const phaseNum = currentPhase;
    const phaseTool = OUTLINE_PHASE_TOOLS[phaseNum - 1];

    console.log(`[OutlineAgentic] Starting Phase ${phaseNum}`);
    reportProgress(phaseNum, "starting");

    // Add phase-specific prompt
    let phasePrompt = getPhasePrompt(
      phaseNum,
      theme,
      language,
      customContext,
    );
    if (phasePrompt) {
      // Dynamically append tool usage emphasis
      phasePrompt += `\n\nUse tool \`${phaseTool.name}\` to submit.`;
      conversationHistory.push(createUserMessage(phasePrompt));
    }

    try {
      reportProgress(phaseNum, "generating");

      // Call AI with tool choice fallback support
      const resultData = await callWithToolChoiceFallback(phaseTool, phaseNum);

      const { result, log } = resultData;
      if (log) logs.push(log);

      // Check if we got the expected tool call
      if (
        result &&
        typeof result === "object" &&
        "functionCalls" in result &&
        Array.isArray(result.functionCalls)
      ) {
        const toolCalls = result.functionCalls as ToolCallResult[];
        // Get text content if present (some models return text with tool calls)
        const textContent = (result as { content?: string }).content;

        let finalToolCalls = toolCalls;

        // Fallback: If no tool calls but text content exists, try to extract JSON
        if (finalToolCalls.length === 0 && textContent) {
           const potentialJson = extractJson(textContent);
           if (potentialJson) {
             const parseResult = phaseTool.parameters.safeParse(potentialJson);
             if (parseResult.success) {
               console.log(`[OutlineAgentic] FALLBACK: Detected valid JSON for phase ${phaseNum}`);
               finalToolCalls = [{
                 id: `fallback_${Date.now()}`,
                 name: phaseTool.name,
                 args: parseResult.data,
               }];
             }
           }
        }

        if (finalToolCalls.length === 0) {
          throw new Error(`Phase ${phaseNum}: No tool call received`);
        }

        const toolCall = finalToolCalls[0];
        if (toolCall.name !== phaseTool.name) {
          throw new Error(
            `Phase ${phaseNum}: Expected ${phaseTool.name}, got ${toolCall.name}`,
          );
        }

        // Validate the tool call arguments against the schema
        try {
          const validatedData = phaseTool.parameters.parse(toolCall.args);
          // Store validated phase data
          const phaseKey = `phase${phaseNum}` as keyof PartialStoryOutline;
          (partial as any)[phaseKey] = validatedData;
        } catch (validationError) {
          const errorMsg =
            validationError instanceof Error
              ? validationError.message
              : String(validationError);
          console.error(
            `[OutlineAgentic] Phase ${phaseNum} schema validation failed:`,
            errorMsg,
          );
          throw new Error(
            `Phase ${phaseNum}: Schema validation failed - ${errorMsg}`,
          );
        }

        console.log(`[OutlineAgentic] Phase ${phaseNum} completed`);
        reportProgress(phaseNum, "completed");

        // Add assistant message with tool call (and text content if present)
        conversationHistory.push(
          createToolCallMessage(
            [
              {
                id: toolCall.id,
                name: toolCall.name,
                arguments: toolCall.args,
              },
            ],
            textContent,
          ),
        );

        // Add tool response
        conversationHistory.push(
          createToolResponseMessage([
            {
              toolCallId: toolCall.id,
              name: toolCall.name,
              content: `Phase ${phaseNum} submitted successfully.${phaseNum < 9 ? ` Ready for phase ${phaseNum + 1}.` : " All phases complete!"}`,
            },
          ]),
        );

        // Move to next phase and save checkpoint
        currentPhase++;
        saveCheckpoint(currentPhase);
      } else {
        throw new Error(`Phase ${phaseNum}: No function calls in response`);
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      console.error(`[OutlineAgentic] Phase ${phaseNum} failed:`, error);
      reportProgress(phaseNum, "error", error);

      // Check for invalid argument error (likely corrupted conversation history)
      if (isInvalidArgumentError(e)) {
        console.warn(
          `[OutlineAgentic] Invalid argument error detected (likely corrupted history). Triggering rebuild...`,
        );
        throw new HistoryCorruptedError(e);
      }

      throw e;
    }
  }

  // Merge all phases into complete outline
  console.log("[OutlineAgentic] All phases completed, merging outline");
  const outline = mergeOutlinePhases(partial);

  return { outline, logs };
};

/**
 * Get the prompt for a specific phase
 */
function getPhasePrompt(
  phase: number,
  theme: string,
  language: string,
  customContext?: string,
): string | null {
  switch (phase) {
    case 1:
      return getOutlinePhase1Prompt(theme, language, customContext);
    case 2:
      return getOutlinePhase2Prompt();
    case 3:
      return getOutlinePhase3Prompt();
    case 4:
      return getOutlinePhase4Prompt();
    case 5:
      return getOutlinePhase5Prompt();
    case 6:
      return getOutlinePhase6Prompt();
    case 7:
      return getOutlinePhase7Prompt();
    case 8:
      return getOutlinePhase8Prompt();
    case 9:
      return getOutlinePhase9Prompt();
    default:
      return null;
  }
}

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
    // Validate that items is actually an array
    if (!items || !Array.isArray(items) || items.length === 0) {
      if (items && !Array.isArray(items)) {
        console.error(
          `[OutlineMerge] Expected array for ${prefix}, got:`,
          typeof items,
          items,
        );
      }
      return [];
    }
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
  const { runSummaryAgenticLoop } = await import("../summary/summary");

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
