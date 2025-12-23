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
  ResolvedThemeConfig,
} from "../../../../types";

import { ToolCallResult, ZodToolDefinition } from "../../../providers/types";
import {
  isInvalidArgumentError,
  HistoryCorruptedError,
} from "../../contextCompressor";

import {
  OutlinePhase0,
  OutlinePhase1,
  OutlinePhase2,
  OutlinePhase3,
  OutlinePhase4,
  OutlinePhase5,
  OutlinePhase6,
  OutlinePhase7,
  OutlinePhase8,
  OutlinePhase9,
  OutlinePhase10,
  outlinePhase0Schema,
  outlinePhase1Schema,
  outlinePhase2Schema,
  outlinePhase3Schema,
  outlinePhase4Schema,
  outlinePhase5Schema,
  outlinePhase6Schema,
  outlinePhase7Schema,
  outlinePhase8Schema,
  outlinePhase9Schema,
  outlinePhase10Schema,
} from "../../../schemas";

import {
  getOutlineSystemInstruction,
  getOutlinePhase0Prompt,
  getOutlinePhase1Prompt,
  getOutlinePhase2Prompt,
  getOutlinePhase3Prompt,
  getOutlinePhase4Prompt,
  getOutlinePhase5Prompt,
  getOutlinePhase6Prompt,
  getOutlinePhase7Prompt,
  getOutlinePhase8Prompt,
  getOutlinePhase9Prompt,
  getOutlinePhase10Prompt,
} from "../../../prompts/index";

import { THEMES } from "../../../../utils/constants";

import {
  getProviderConfig,
  createLogEntry,
  createProviderConfig,
  extractJson,
  createThemeConfig,
  IMAGE_BASED_THEME,
} from "../../utils";

import {
  createUserMessage,
  createToolCallMessage,
  createToolResponseMessage,
} from "../../../messageTypes";

import { sessionManager } from "../../sessionManager";

import { buildCacheHint } from "../../provider/cacheHint";
import { callWithAgenticRetry } from "../retry";
import {
  BudgetState,
  createBudgetState,
  generateBudgetPrompt,
  checkBudgetExhaustion,
  incrementToolCalls,
  incrementRetries,
  incrementIterations,
  getBudgetSummary,
} from "../budgetUtils";

// @ts-ignore
import promptInjectionData from "@/prompt/prompt.toml";

// ============================================================================
// Tool Definitions for Outline Generation
// ============================================================================

// Define tools for each phase (Phase 0 is conditional, only for image-based generation)
const OUTLINE_PHASE_TOOLS: ZodToolDefinition[] = [
  {
    name: "submit_phase0_image_interpretation",
    description:
      "Submit Phase 0: Image interpretation with visual elements and suggested world context",
    parameters: outlinePhase0Schema,
  },
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
  {
    name: "submit_phase10_opening_narrative",
    description: "Submit Phase 10: Opening narrative that starts the story",
    parameters: outlinePhase10Schema,
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
  /** Unique ID for the save slot to isolate sessions */
  slotId?: string;
  /** Base64 encoded image data URL for image-based story start (triggers Phase 0) */
  seedImageBase64?: string;
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
): Promise<{
  outline: StoryOutline;
  logs: LogEntry[];
  themeConfig: ResolvedThemeConfig;
}> => {
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

  // Check if this is an image-based start (no theme selected)
  const isImageBasedStart = !!options?.seedImageBase64 && !theme;

  // Get theme data (skip if image-based start - Phase 0 will generate context)
  const themeConfig = isImageBasedStart
    ? null
    : THEMES[theme] || THEMES["fantasy"];
  const isRestricted = themeConfig?.restricted || false;

  let themeDataWorldSetting: string | undefined;
  let themeDataBackgroundTemplate: string | undefined;
  let themeDataExample: string | undefined;
  let themeDataNarrativeStyle: string | undefined;

  // Only load theme data if not image-based start
  if (!isImageBasedStart) {
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
  }

  // Build system instruction
  let systemInstruction = getOutlineSystemInstruction(
    language,
    isRestricted,
    themeDataNarrativeStyle,
    themeDataBackgroundTemplate,
    themeDataExample,
    themeDataWorldSetting,
    settings.extra?.liteMode,
    settings.extra?.nsfw,
    settings.extra?.detailedDescription,
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

    // If seedImage provided, start at Phase 0 (image interpretation)
    // Otherwise start at Phase 1 (normal flow)
    const hasImage = !!options.seedImageBase64;
    currentPhase = hasImage ? 0 : 1;

    // Build initial task message
    const totalPhases = hasImage ? 11 : 10; // Phase 0 + 1-10 or just 1-10
    const phaseRange = hasImage ? "0-10" : "1-10";

    // Create the initial task instruction
    const taskText = `[OUTLINE GENERATION TASK]
Generate a story outline in ${totalPhases} phases (Phases ${phaseRange}). Each phase builds upon the previous ones.

Theme: ${theme}
Language: ${language}
${customContext ? `Custom Context: ${customContext}` : ""}
${hasImage ? `\n**An image has been provided by the user.** This image should inspire the story world and atmosphere. Start with Phase 0 to analyze the image.` : ""}

**PROCESS:**
- You will receive one phase instruction at a time
- For each phase, you MUST call the provided tool to submit your data
- **CRITICAL**: You must invoke the tool function directly. Do NOT return the schema as a JSON text block.
- After submitting, wait for the next phase instruction
`;

    // If we have an image, create a message with both image and text
    if (hasImage && options.seedImageBase64) {
      // Parse the data URL to extract mimeType and base64 data
      // Format: data:image/jpeg;base64,/9j/4AAQ...
      const dataUrlMatch = options.seedImageBase64.match(
        /^data:([^;]+);base64,(.+)$/,
      );
      if (dataUrlMatch) {
        const mimeType = dataUrlMatch[1];
        const base64Data = dataUrlMatch[2];
        conversationHistory.push({
          role: "user",
          content: [
            { type: "image" as const, mimeType, data: base64Data },
            { type: "text" as const, text: taskText },
          ],
        });
      } else {
        // Fallback: assume it's just base64 without data URL prefix
        console.warn(
          "[OutlineAgentic] seedImageBase64 is not a data URL, assuming JPEG",
        );
        conversationHistory.push({
          role: "user",
          content: [
            {
              type: "image" as const,
              mimeType: "image/jpeg",
              data: options.seedImageBase64,
            },
            { type: "text" as const, text: taskText },
          ],
        });
      }
    } else {
      conversationHistory.push(createUserMessage(taskText));
    }
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
      const hasImage = !!options.seedImageBase64;
      const totalPhases = hasImage ? 11 : 10;
      options.onPhaseProgress({
        phase,
        totalPhases,
        phaseName: `initializing.outline.phase.${phase}.name`,
        status,
        partialOutline: partial,
        error,
      });
    }
  };

  // Determine session ID with slotId for isolation if provided
  const baseSessionId = options.resumeFrom ? "outline-resume" : "outline-new";
  const outlineSessionId = options.slotId
    ? `${baseSessionId}-${options.slotId}`
    : baseSessionId;

  // If starting fresh, explicitly invalidate the "outline-new" session to clear any previous game's outline history
  if (!options.resumeFrom) {
    console.log(
      `[OutlineAgentic] Starting fresh: invalidating old "${outlineSessionId}" session if exists`,
    );
    // Note: We use manual_clear reason. Invalidation clears in-memory and storage history.
    try {
      // We first try to get the existing session to check if it's current
      const existing = sessionManager.getCurrentSession();
      if (existing && existing.id === outlineSessionId) {
        await sessionManager.invalidate(outlineSessionId, "manual_clear");
      } else {
        // Even if not current, we want to make sure the storage is clean for this ID
        // The sessionManager.getOrCreateSession below will handle loading/creating,
        // but to be absolutely sure no old messages bleed in, we can delete it from storage.
        // However, invalidate(id) only works if it's the current session in the current manager implementation.
        // So we just ensure that when we create it, we start with empty history if it's new.
        // Actually, sessionManager internally should handle ID changes.
        // BUT "outline-new" is a STATIC ID. If we don't clear it, it loads old data.
      }
    } catch (e) {
      console.warn(
        `[OutlineAgentic] Failed to invalidate old outline session:`,
        e,
      );
    }
  }

  // Create a session for outline generation (for capability tracking)
  // Use a special forkId=-1 to indicate outline phase
  const outlineSession = await sessionManager.getOrCreateSession({
    slotId: outlineSessionId,
    forkId: -1,
    providerId: instance.id,
    modelId,
    protocol: instance.protocol,
  });

  // If it's a new session but for some reason still has history (e.g. static ID reuse), clear it
  if (!options.resumeFrom && !sessionManager.isEmpty(outlineSession.id)) {
    console.log(
      `[OutlineAgentic] Static ID "outline-new" has stale history, clearing...`,
    );
    sessionManager.setHistory(outlineSession.id, []);
  }

  // Cache hint (provider-specific) - based on the initial prefix messages
  // Outline 的静态前缀包括初始 system prompt 与首批 user 指令。
  const initialPrefix = conversationHistory.slice(0, 2);
  const cacheHint = buildCacheHint(
    instance.protocol,
    systemInstruction,
    initialPrefix,
  );
  sessionManager.setCacheHint(outlineSession.id, cacheHint);

  // Helper to make API call with retry
  const callAIWithRetry = async (
    phaseTool: ZodToolDefinition,
    phaseNum: number,
  ) => {
    const provider = sessionManager.getProvider(outlineSession.id, instance);
    const effectiveToolChoice = sessionManager.getEffectiveToolChoice(
      outlineSession.id,
      "required",
      settings.extra?.forceAutoToolChoice,
    );

    const resp = await callWithAgenticRetry(
      provider,
      {
        modelId,
        systemInstruction,
        messages: [], // Will be overwritten by callWithAgenticRetry
        tools: [
          {
            name: phaseTool.name,
            description: phaseTool.description,
            parameters: phaseTool.parameters,
          },
        ],
        toolChoice: effectiveToolChoice,
        mediaResolution: settings.story?.mediaResolution,
        temperature: settings.story?.temperature,
        topP: settings.story?.topP,
        topK: settings.story?.topK,
        minP: settings.story?.minP,
        thinkingEffort: settings.story?.thinkingEffort,
      },
      conversationHistory,
      {
        maxRetries: budgetState.retriesMax,
        requiredToolName: phaseTool.name,
        schema: phaseTool.parameters,
        onRetry: (err, count) => {
          console.warn(
            `[OutlineAgentic] Retry ${count}/${budgetState.retriesMax} due to: ${err}`,
          );
          // 1. Increment retries in budget state
          incrementRetries(budgetState);

          // 2. Generate updated budget prompt
          const retryBudgetPrompt = generateBudgetPrompt(budgetState);

          // 3. Inject into history so the model sees it BEFORE the next attempt
          conversationHistory.push(
            createUserMessage(`[SYSTEM: BUDGET UPDATE]\n${retryBudgetPrompt}`),
          );
        },
      },
    );

    const logEntry = createLogEntry({
      provider: instance.protocol,
      model: modelId,
      endpoint: `outline-phase${phaseNum}`,
      phase: phaseNum,
      toolName: phaseTool.name,
      response: resp.raw,
      usage: resp.usage,
      request: { retries: resp.retries },
    });

    // Track tool call in budget
    incrementToolCalls(budgetState, 1);
    incrementIterations(budgetState);

    return { result: resp.result, log: logEntry, retries: resp.retries };
  };

  // Initialize budget tracking
  const budgetState: BudgetState = createBudgetState(settings);

  // Agentic loop for each phase
  // Phase 0 is at index 0, Phase 1 at index 1, etc.
  while (currentPhase <= 10) {
    // Check budget exhaustion
    const budgetCheck = checkBudgetExhaustion(budgetState);
    if (budgetCheck.exhausted) {
      console.warn(`[OutlineAgentic] ${budgetCheck.message}`);
      throw new Error(budgetCheck.message);
    }

    const phaseNum = currentPhase;
    // Tool index: Phase 0 -> index 0, Phase 1 -> index 1, etc.
    const phaseTool = OUTLINE_PHASE_TOOLS[phaseNum];

    console.log(
      `[OutlineAgentic] Starting Phase ${phaseNum}. Budget: ${getBudgetSummary(budgetState)}`,
    );
    reportProgress(phaseNum, "starting");

    // Inject budget status into conversation
    const budgetPrompt = generateBudgetPrompt(budgetState);
    conversationHistory.push(
      createUserMessage(`[SYSTEM: BUDGET STATUS]\n${budgetPrompt}`),
    );

    // Add phase-specific prompt
    let phasePrompt = getPhasePrompt(
      phaseNum,
      theme,
      language,
      customContext,
      !!options.seedImageBase64,
    );
    if (phasePrompt) {
      // Dynamically append tool usage emphasis
      phasePrompt += `\n\nUse tool \`${phaseTool.name}\` to submit.`;
      conversationHistory.push(createUserMessage(phasePrompt));
    }

    try {
      reportProgress(phaseNum, "generating");

      const { result, log } = await callAIWithRetry(phaseTool, phaseNum);

      if (log) logs.push(log);

      // Check if we got the expected tool call
      if (
        result &&
        typeof result === "object" &&
        "functionCalls" in result &&
        Array.isArray(result.functionCalls) &&
        result.functionCalls.length > 0
      ) {
        const toolCalls = result.functionCalls as ToolCallResult[];

        // Ensure all tool calls have IDs (OpenAI requirement)
        for (const tc of toolCalls) {
          if (!tc.id) {
            tc.id = `call_${Math.random().toString(36).slice(2, 11)}`;
          }
        }

        const textContent = (result as { content?: string }).content;

        const toolCall = toolCalls[0];
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
                thoughtSignature: toolCall.thoughtSignature, // Include for Gemini 3 models
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
              content: `Phase ${phaseNum} submitted successfully.${phaseNum < 10 ? ` Ready for phase ${phaseNum + 1}.` : " All phases complete!"}`,
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

  // Build themeConfig for storage in GameState
  // For imageBased: use Phase 0 generated data; for normal themes: use i18n
  let resolvedThemeConfig: ResolvedThemeConfig;
  const isImageStart = !theme || theme === IMAGE_BASED_THEME;
  const phase0Data = partial.phase0 as OutlinePhase0 | undefined;

  if (isImageStart && phase0Data && tFunc) {
    // imageBased: use Phase 0 generated context
    resolvedThemeConfig = {
      name: tFunc("imageBased.name", { defaultValue: "Image Based" }),
      narrativeStyle: phase0Data.narrativeStyle || "",
      worldSetting: phase0Data.worldSetting || "",
      backgroundTemplate: phase0Data.backgroundTemplate || "", // Use Phase 0 generated template
      example: "", // imageBased doesn't have preset examples
      isRestricted: false,
    };
  } else if (tFunc) {
    // Normal themes: resolve from i18n at generation time
    resolvedThemeConfig = createThemeConfig(theme, tFunc);
  } else {
    // Fallback (shouldn't happen)
    resolvedThemeConfig = {
      name: theme || "Unknown",
      narrativeStyle: "",
      worldSetting: "",
      backgroundTemplate: "",
      example: "",
      isRestricted: false,
    };
  }

  return { outline, logs, themeConfig: resolvedThemeConfig };
};

/**
 * Get the prompt for a specific phase
 */
function getPhasePrompt(
  phase: number,
  theme: string,
  language: string,
  customContext?: string,
  hasImageContext?: boolean,
): string | null {
  switch (phase) {
    case 0:
      return getOutlinePhase0Prompt(language);
    case 1:
      return getOutlinePhase1Prompt(
        theme,
        language,
        customContext,
        hasImageContext,
      );
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
    case 10:
      return getOutlinePhase10Prompt(hasImageContext);
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
    !partial.phase9 ||
    !partial.phase10
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
  const p10 = partial.phase10 as OutlinePhase10;

  // Helper to ensure all entities have IDs and set unlocked: false
  const prepareEntities = <T extends { id?: string; unlocked?: boolean }>(
    items: T[] | undefined | null,
    prefix: string,
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
        ? prepareEntities(p2.character.skills, "skill")
        : undefined,
      conditions: p2.character.conditions
        ? prepareEntities(p2.character.conditions, "cond")
        : undefined,
      hiddenTraits: p2.character.hiddenTraits
        ? prepareEntities(p2.character.hiddenTraits, "trait")
        : undefined,
    } as StoryOutline["character"],

    // Phase 3: Locations
    locations: prepareEntities(
      p3.locations as StoryOutline["locations"],
      "loc",
    ) as StoryOutline["locations"],

    // Phase 4: Factions
    factions: prepareEntities(
      p4.factions as StoryOutline["factions"],
      "fac",
    ) as StoryOutline["factions"],

    // Phase 5: NPCs
    npcs: prepareEntities(
      p5.npcs as StoryOutline["npcs"],
      "npc",
    ) as StoryOutline["npcs"],

    // Phase 6: Inventory
    inventory: prepareEntities(
      p6.inventory as StoryOutline["inventory"],
      "inv",
    ) as StoryOutline["inventory"],

    // Phase 7: Quests
    quests: prepareEntities(
      p7.quests as StoryOutline["quests"],
      "quest",
    ) as StoryOutline["quests"],

    // Phase 8: Knowledge
    knowledge: prepareEntities(
      p8.knowledge as StoryOutline["knowledge"],
      "know",
    ) as StoryOutline["knowledge"],

    timeline: prepareEntities(
      p9.timeline as StoryOutline["timeline"],
      "evt",
    ) as StoryOutline["timeline"],
    initialAtmosphere:
      p9.initialAtmosphere as StoryOutline["initialAtmosphere"],

    // Phase 10: Opening Narrative
    openingNarrative: p10.openingNarrative as StoryOutline["openingNarrative"],
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
        createLogEntry({
          provider: providerInfo?.instance.protocol || "openai",
          model: providerInfo?.modelId || "unknown",
          endpoint: "summary-error",
          stage: "error",
          request: { error: error.message },
        }),
      ],
      error: error.message,
    };
  }
};
