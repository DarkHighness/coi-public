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
import type { VfsSession } from "../../../vfs/vfsSession";

import { ToolCallResult, ZodToolDefinition } from "../../../providers/types";
import {
  isInvalidArgumentError,
  HistoryCorruptedError,
} from "../../contextCompressor";

import { OutlinePhase0 } from "../../../schemas";

import { getOutlineSystemInstruction } from "../../../prompts/index";

import { THEMES } from "../../../../utils/constants";

import {
  getProviderConfig,
  createLogEntry,
  createThemeConfig,
  IMAGE_BASED_THEME,
  resolveNarrativeStyle,
  resolveWorldDisposition,
  resolvePlayerMaliceProfile,
  pickModelMatchedPrompt,
} from "../../utils";

import promptToml from "@/prompt/prompt.toml";

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

// Import extracted modules
import { OUTLINE_PHASE_TOOLS } from "./outlineTools";
import { getPhasePrompt } from "./outlinePrompts";
import { mergeOutlinePhases } from "./outlinePhaseHandler";

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
  /** Optional protagonist feature/role selected by user */
  protagonistFeature?: string;
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
  usage: TokenUsage;
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

  // Image-based flow can be:
  // - brand new start with seedImageBase64 (Phase 0)
  // - resume from a checkpoint that already contains Phase 0 or is currently at Phase 0
  const isImageBasedFlow = (() => {
    if (options?.seedImageBase64 && !theme) return true;
    const resume = options?.resumeFrom;
    if (!resume) return false;
    if (theme === IMAGE_BASED_THEME) return true;
    if (theme) return false;
    return resume.currentPhase === 0 || Boolean((resume.partial as any)?.phase0);
  })();

  // Get theme data (skip if image-based flow - Phase 0 will generate context)
  const themeConfig = isImageBasedFlow ? null : THEMES[theme] || THEMES["fantasy"];
  const isRestricted = themeConfig?.restricted || false;

  let themeDataWorldSetting: string | undefined;
  let themeDataBackgroundTemplate: string | undefined;
  let themeDataExample: string | undefined;
  let themeDataNarrativeStyle: string | undefined;

  // Only load theme data if not image-based flow
  if (!isImageBasedFlow) {
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
  const resolvedNarrativeStyle =
    resolveNarrativeStyle({
      themeStyle: themeDataNarrativeStyle,
      preset: settings.extra?.narrativeStylePreset,
      language,
      customContext,
    }) || themeDataNarrativeStyle;

  const worldDisposition = resolveWorldDisposition({
    preset: settings.extra?.worldDispositionPreset,
    language,
    customContext,
  });

  const playerMaliceProfile = resolvePlayerMaliceProfile({
    preset: settings.extra?.playerMalicePreset,
    intensity: settings.extra?.playerMaliceIntensity,
    language,
    customContext,
  });

  let systemInstruction = getOutlineSystemInstruction({
    language,
    isRestricted,
    narrativeStyle: resolvedNarrativeStyle,
    backgroundTemplate: themeDataBackgroundTemplate,
    example: themeDataExample,
    worldSetting: themeDataWorldSetting,
    worldDisposition,
    isNSFW: settings.extra?.nsfw,
    isDetailedDescription: settings.extra?.detailedDescription,
    genderPreference: settings.extra?.genderPreference,
    protagonistFeature: options.protagonistFeature,
    themeCategory: themeConfig?.categories?.[0],
    themeKey: theme,
    worldDispositionPreset: settings.extra?.worldDispositionPreset,
    playerMaliceProfile,
    playerMalicePreset: settings.extra?.playerMalicePreset,
    playerMaliceIntensity: settings.extra?.playerMaliceIntensity,
  });

  // System default model-specific injection (for consistent style across models).
  // Required order at the very front of systemInstruction: (1) user custom instruction, (2) system default injection, then base.
  const systemDefaultInjectionEnabled =
    settings.extra?.systemDefaultInjectionEnabled ?? true;
  const systemDefaultInjection = systemDefaultInjectionEnabled
    ? pickModelMatchedPrompt((promptToml as any)?.system_prompts, modelId)
    : undefined;

  // Optional user-provided prompt prefix (typically used for language/style preferences).
  const customInstructionRaw = settings.extra?.customInstruction;
  const customInstruction =
    typeof customInstructionRaw === "string" ? customInstructionRaw : "";
  const customInstructionEnabled =
    settings.extra?.customInstructionEnabled ??
    Boolean(customInstruction.trim());

  const prepends: string[] = [];
  if (customInstruction.trim() && customInstructionEnabled) {
    prepends.push(customInstruction.trim());
    console.warn(
      `[CustomInstruction] Prepended custom instruction (${customInstruction.length} chars)`,
    );
  }
  if (systemDefaultInjection) {
    prepends.push(systemDefaultInjection);
    console.warn(
      `[SystemDefaultInjection] Matched model ${modelId} (${systemDefaultInjection.length} chars)`,
    );
  }
  if (prepends.length > 0) {
    systemInstruction = `${prepends.join("\n\n")}\n\n${systemInstruction}`;
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
    const totalPhases = hasImage ? 10 : 9; // Phase 0 + 1-9 or just 1-9
    const phaseRange = hasImage ? "0-9" : "1-9";

    // Create the initial task instruction
    const taskText = `[OUTLINE GENERATION TASK]
Generate a story outline in ${totalPhases} phases (Phases ${phaseRange}). Each phase builds upon the previous ones.

Theme: ${theme}
Language: ${language}
${customContext ? `Custom Context: ${customContext}` : ""}
${options.protagonistFeature ? `User Selected Protagonist Role: ${options.protagonistFeature}` : ""}
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
      const totalPhases = isImageBasedFlow ? 11 : 10;
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

  // Save an initial checkpoint so "exit & re-enter" can resume even if Phase 1 fails
  // before completing and producing a checkpoint.
  if (!options.resumeFrom) {
    console.log(
      `[OutlineAgentic] Saving initial checkpoint at phase ${currentPhase}`,
    );
    saveCheckpoint(currentPhase);
  }

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

    // Accumulate usage
    if (resp.usage) {
      totalUsage.promptTokens += resp.usage.promptTokens || 0;
      totalUsage.completionTokens += resp.usage.completionTokens || 0;
      totalUsage.totalTokens += resp.usage.totalTokens || 0;
    }

    // Track tool call in budget
    incrementToolCalls(budgetState, 1);
    incrementIterations(budgetState);

    return { result: resp.result, log: logEntry, retries: resp.retries };
  };

  // Initialize budget tracking
  const budgetState: BudgetState = createBudgetState(settings, {
    loopType: "outline",
  });

  // Initialize total usage tracking
  let totalUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  // Agentic loop for each phase
  // Phase 0 is at index 0, Phase 1 at index 1, etc.
  while (currentPhase <= 9) {
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
      options.protagonistFeature,
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

          // Phase 2: Additional gender validation
          if (phaseNum === 2 && settings.extra?.genderPreference) {
            const genderPref = settings.extra.genderPreference;
            if (genderPref !== "none") {
              const phase2Data = validatedData as {
                character: { race?: string; title?: string };
              };
              const race = phase2Data.character?.race?.toLowerCase() || "";
              const title = phase2Data.character?.title?.toLowerCase() || "";

              // Check for gender keywords in the race field
              const maleKeywords = [
                "male",
                "男",
                "man",
                "boy",
                "他",
                "先生",
                "公子",
                "少爷",
                "王子",
                "皇子",
                "lord",
                "prince",
                "master",
                "king",
                "emperor",
                "duke",
                "sir",
                "gentleman",
              ];
              const femaleKeywords = [
                "female",
                "女",
                "woman",
                "girl",
                "她",
                "小姐",
                "夫人",
                "姑娘",
                "公主",
                "皇后",
                "lady",
                "princess",
                "queen",
                "empress",
                "duchess",
                "miss",
                "madam",
                "mistress",
              ];

              // Check race field
              const raceHasMale = maleKeywords.some((kw) => race.includes(kw));
              const raceHasFemale = femaleKeywords.some((kw) =>
                race.includes(kw),
              );

              // Check title field
              const titleHasMale = maleKeywords.some((kw) =>
                title.includes(kw),
              );
              const titleHasFemale = femaleKeywords.some((kw) =>
                title.includes(kw),
              );

              const expectedGender = genderPref;
              const raceGender = raceHasFemale
                ? "female"
                : raceHasMale
                  ? "male"
                  : null;
              const titleGender = titleHasFemale
                ? "female"
                : titleHasMale
                  ? "male"
                  : null;

              // Validate race field gender
              if (raceGender !== null && raceGender !== expectedGender) {
                console.warn(
                  `[OutlineAgentic] Race gender mismatch: expected ${expectedGender}, got ${raceGender} (race: "${phase2Data.character?.race}")`,
                );
                throw new Error(
                  `Phase 2: Gender mismatch in race - protagonist must be ${expectedGender === "male" ? "male (男性)" : "female (女性)"}, but race is "${phase2Data.character?.race}". Please regenerate with correct gender.`,
                );
              }

              // Validate title field gender (e.g., 小姐 vs 少爷)
              if (titleGender !== null && titleGender !== expectedGender) {
                console.warn(
                  `[OutlineAgentic] Title gender mismatch: expected ${expectedGender}, got ${titleGender} (title: "${phase2Data.character?.title}")`,
                );
                throw new Error(
                  `Phase 2: Gender mismatch in title - protagonist title "${phase2Data.character?.title}" conflicts with required gender ${expectedGender === "male" ? "male (男性)" : "female (女性)"}. Please regenerate with correct gender-appropriate title.`,
                );
              }

              // If neither race nor title indicates gender, warn but continue
              if (raceGender === null) {
                console.warn(
                  `[OutlineAgentic] Race field "${phase2Data.character?.race}" does not contain clear gender indicator, but continuing...`,
                );
              }

              console.log(
                `[OutlineAgentic] Gender validated: ${expectedGender} matches race "${phase2Data.character?.race}" and title "${phase2Data.character?.title}"`,
              );
            }
          }

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

  return { outline, logs, themeConfig: resolvedThemeConfig, usage: totalUsage };
};

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
  input: {
    vfsSession: VfsSession;
    slotId: string;
    forkId: number;
    baseSummaries: StorySummary[];
    baseIndex: number;
    nodeRange: { fromIndex: number; toIndex: number };
    language: string;
    settings: AISettings;
    pendingPlayerAction?: { segmentIdx: number; text: string } | null;
    mode?: import("../summary/summaryLoop").SummaryLoopMode;
  },
): Promise<{
  summary: StorySummary | null;
  logs: LogEntry[];
  error?: string;
}> => {
  const { runSummaryAgenticLoop } = await import("../summary/summary");

  try {
    const result = await runSummaryAgenticLoop({
      vfsSession: input.vfsSession,
      slotId: input.slotId,
      forkId: input.forkId,
      nodeRange: input.nodeRange,
      baseSummaries: input.baseSummaries,
      baseIndex: input.baseIndex,
      language: input.language,
      settings: input.settings,
      pendingPlayerAction: input.pendingPlayerAction,
    }, { mode: input.mode });

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

    const providerInfo = getProviderConfig(input.settings, "story");
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
