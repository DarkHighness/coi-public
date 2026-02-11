import {
  AISettings,
  LogEntry,
  StoryOutline,
  PartialStoryOutline,
  StorySegment,
  GameState,
  TokenUsage,
  ProviderProtocol,
  ProviderInstance,
  UnifiedMessage,
  OutlineConversationState,
  ResolvedThemeConfig,
  ToolCallRecord,
  SavePresetProfile,
} from "../../../../types";
import type { VfsSession } from "../../../vfs/vfsSession";
import { writeOutlineProgress } from "../../../vfs/outline";

import { ToolCallResult, ZodToolDefinition } from "../../../providers/types";
import {
  isInvalidArgumentError,
  HistoryCorruptedError,
} from "../../contextCompressor";

import { OutlinePhase0 } from "../../../schemas";

import { getOutlineSystemInstruction } from "../../../prompts/index";

import { THEMES } from "../../../../utils/constants";

import {
  VFS_LS_TOOL,
  VFS_SCHEMA_TOOL,
  VFS_READ_TOOL,
  VFS_SEARCH_TOOL,
  VFS_COMMIT_OUTLINE_PHASE_TOOLS,
} from "../../../tools";
import { dispatchToolCallAsync } from "../../../tools/handlers";
import { normalizeVfsPath } from "../../../vfs/utils";
import { vfsElevationTokenManager } from "../../../vfs/core/elevation";
import {
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
} from "../../../schemas";

import {
  getProviderConfig,
  createLogEntry,
  createThemeConfig,
  IMAGE_BASED_THEME,
  resolveNarrativeStyle,
  resolveWorldDisposition,
  resolvePlayerMaliceProfile,
  resolveEffectivePresetProfile,
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

import { getPhasePrompt } from "./outlinePrompts";
import { mergeOutlinePhases } from "./outlineMerge";
import {
  composeSystemInstruction,
  getOutlineRuntimeFloor,
} from "../../../prompts/runtimeFloor";
import { validateGenderPreferencePhase2 } from "./genderValidation";

const OUTLINE_PHASE_SCHEMAS = [
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
] as const;

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
  onSaveCheckpoint?: (state: OutlineConversationState) => void | Promise<void>;
  settings: AISettings;
  /** VFS session (enables read-only VFS tools during outline generation). */
  vfsSession: VfsSession;
  /** When true (default), allow read-only VFS tools. */
  enableReadOnlyVfsTools?: boolean;
  /**
   * Optional allowlist of read-only VFS path prefixes for outline generation.
   * Paths are VFS-root relative (no leading slash), and should NOT include "current/".
   * Example: ["skills/theme/fantasy", "refs/atmosphere"].
   */
  readOnlyVfsAllowPrefixes?: string[];
  /** Unique ID for the save slot to isolate sessions */
  slotId?: string;
  /** Base64 encoded image data URL for image-based story start (triggers Phase 0) */
  seedImageBase64?: string;
  /** Optional protagonist feature/role selected by user */
  protagonistFeature?: string;
  /** Optional save-level preset profile selected at game start */
  presetProfile?: SavePresetProfile;
  /** Optional suffix to force a fresh session namespace (e.g. recovery retry). */
  sessionTag?: string;
  /** Real-time hook for current round tool calls */
  onToolCallsUpdate?: (calls: ToolCallRecord[]) => void;
}

const READ_ONLY_VFS_TOOL_DEFS: ZodToolDefinition[] = [
  VFS_LS_TOOL,
  VFS_SCHEMA_TOOL,
  VFS_READ_TOOL,
  VFS_SEARCH_TOOL,
];

const READ_ONLY_VFS_TOOL_NAMES = new Set(
  READ_ONLY_VFS_TOOL_DEFS.map((t) => t.name),
);

const OUTLINE_PHASE_READ_ROOTS = [
  "outline/phases",
  "shared/narrative/outline/phases",
];

const OUTLINE_SUBMIT_TOOL_DEFS = [...VFS_COMMIT_OUTLINE_PHASE_TOOLS];
const OUTLINE_SUBMIT_TOOL_NAMES = new Set(
  OUTLINE_SUBMIT_TOOL_DEFS.map((t) => t.name),
);

const getOutlineSubmitToolByPhase = (phase: number): ZodToolDefinition => {
  const tool = OUTLINE_SUBMIT_TOOL_DEFS[phase];
  if (!tool) {
    throw new Error(`Outline phase commit tool is missing for phase ${phase}`);
  }
  return tool;
};

const submitToolNameByPhase = (phase: number): string =>
  getOutlineSubmitToolByPhase(phase).name;

const stripOutlineCurrentPrefix = (path?: string): string => {
  const normalized = normalizeVfsPath(path ?? "");
  if (!normalized) return "";
  if (normalized === "current") return "";
  if (normalized.startsWith("current/")) return normalized.slice("current/".length);
  return normalized;
};

const isAllowedOutlineReadOnlyPath = (
  path: string,
  allowPrefixes: string[],
): boolean => {
  const normalized = stripOutlineCurrentPrefix(path);
  if (!normalized) return false;
  return allowPrefixes.some((prefix) => {
    const normalizedPrefix = normalizeVfsPath(prefix);
    if (!normalizedPrefix) return false;
    return normalized === normalizedPrefix || normalized.startsWith(`${normalizedPrefix}/`);
  });
};

const getOutlineDefaultReadOnlyAllowPrefixes = (
  theme: string,
  isImageBasedFlow: boolean,
): string[] => {
  // Keep defaults simple and not overly strict:
  // - `skills/**` is a built-in read-only library intended to improve generation quality.
  // - `refs/**` is a read-only reference pack(s) seeded into VFS (e.g. atmosphere).
  const prefixes: string[] = ["skills", "refs", ...OUTLINE_PHASE_READ_ROOTS];

  // Theme skills are optional and only useful when we have a stable theme key.
  if (!isImageBasedFlow && theme && theme !== IMAGE_BASED_THEME) {
    prefixes.push(`skills/theme/${theme}`);
  }

  return prefixes;
};

const OUTLINE_RESUME_ANCHOR_MARKER = "[OUTLINE RESUME ANCHOR]";

const safeJsonStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value ?? "");
  }
};

const truncateText = (value: string, maxChars: number): string => {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}…`;
};

const getOutlinePhaseArtifactPaths = (phaseNum: number) => ({
  currentPath: `current/outline/phases/phase${phaseNum}.json`,
  sharedPath: `shared/narrative/outline/phases/phase${phaseNum}.json`,
});

const formatOutlinePhaseArtifactChecklist = (phaseNumbers: number[]): string => {
  if (phaseNumbers.length === 0) return "- none";
  return phaseNumbers
    .map((phaseNum) => {
      const { currentPath, sharedPath } = getOutlinePhaseArtifactPaths(phaseNum);
      return `- Phase ${phaseNum}: ${currentPath} (fallback: ${sharedPath})`;
    })
    .join("\n");
};

const buildOutlineResumeAnchor = (
  currentPhase: number,
  partial: PartialStoryOutline,
): string => {
  const safeCurrentPhase = Math.max(0, Math.min(9, Math.floor(currentPhase)));
  const currentSubmitTool = `vfs_commit_outline_phase_${safeCurrentPhase}`;

  const completedPhaseNumbers = Array.from({ length: 10 }, (_, idx) => idx).filter(
    (phaseNum) =>
      phaseNum < safeCurrentPhase &&
      (partial as any)?.[`phase${phaseNum}`] !== undefined,
  );

  const missingCompletedPhases = Array.from(
    { length: safeCurrentPhase },
    (_, idx) => idx,
  ).filter(
    (phaseNum) => (partial as any)?.[`phase${phaseNum}`] === undefined,
  );

  const remainingPhases = Array.from(
    { length: Math.max(0, 10 - safeCurrentPhase) },
    (_, idx) => safeCurrentPhase + idx,
  );

  const completedPhasePreview = completedPhaseNumbers
    .map((phaseNum) => {
      const raw = safeJsonStringify((partial as any)?.[`phase${phaseNum}`]);
      return `<phase_${phaseNum}>${truncateText(raw, 1400)}</phase_${phaseNum}>`;
    })
    .join("\n");

  return `${OUTLINE_RESUME_ANCHOR_MARKER}
You are RESUMING an interrupted outline generation session.

Current phase: ${safeCurrentPhase}
Current submit tool: ${currentSubmitTool}
Completed phases: ${completedPhaseNumbers.length > 0 ? completedPhaseNumbers.join(", ") : "none"}
Missing completed artifacts (should re-read/repair before submit): ${
    missingCompletedPhases.length > 0
      ? missingCompletedPhases.join(", ")
      : "none"
  }
Remaining phases (including current): ${remainingPhases.join(", ")}

Authoritative progress checkpoint:
- current/outline/progress.json

Phase artifact lookup (completed):
${formatOutlinePhaseArtifactChecklist(completedPhaseNumbers)}

Current-phase artifact targets:
- ${getOutlinePhaseArtifactPaths(safeCurrentPhase).currentPath}
- ${getOutlinePhaseArtifactPaths(safeCurrentPhase).sharedPath}

Read order (recommended):
1) Read current/outline/progress.json to confirm resume checkpoint.
2) Read completed phase files listed above to rebuild continuity.
3) If a file is missing under current/, read the shared/ fallback path.
4) Then call ONLY ${currentSubmitTool} for this phase.

Rules:
- Continue from the CURRENT phase only. Do NOT regenerate completed phases.
- Do NOT call submit tools for other phases.
- Keep story continuity consistent with completed phase artifacts.
- If details are missing, read phase artifacts first via read-only VFS tools, then submit.
- Outline generation is pre-fork global setup; do NOT use conversation fork turn files as source of truth.

Completed phase snapshots (may be truncated; use VFS reads for full details):
${completedPhasePreview || "<none/>"}`;
};

const extractGlobRoot = (pattern: string): string => {
  const normalized = stripOutlineCurrentPrefix(pattern);
  if (!normalized) return "";
  // Take the static prefix before any wildcard.
  const wildcardIndex = normalized.search(/[*?]/);
  const root = wildcardIndex === -1 ? normalized : normalized.slice(0, wildcardIndex);
  return normalizeVfsPath(root);
};

const validateOutlineReadOnlyVfsArgs = (
  toolName: string,
  args: Record<string, unknown>,
  allowPrefixes: string[],
): string | null => {
  const reject = (detail: string) =>
    `Blocked read-only VFS access in outline generation: ${detail}. Allowed roots: ${allowPrefixes.map((p) => `"${normalizeVfsPath(p)}"`).join(", ")}`;

  if (toolName === "vfs_ls") {
    const path = typeof (args as any)?.path === "string" ? (args as any).path : "";
    const patterns = Array.isArray((args as any)?.patterns)
      ? (args as any).patterns
      : null;
    if (!path && (!patterns || patterns.length === 0)) {
      return reject("vfs_ls requires path or patterns (root listing is disabled)");
    }

    if (path && !isAllowedOutlineReadOnlyPath(path, allowPrefixes)) {
      return reject(`vfs_ls path="${path}"`);
    }

    if (patterns) {
      for (const pattern of patterns) {
        if (typeof pattern !== "string") {
          return reject("vfs_ls patterns[] must be strings");
        }
        const root = extractGlobRoot(pattern);
        if (!root) return reject(`vfs_ls pattern="${pattern}" has no static root`);
        if (!isAllowedOutlineReadOnlyPath(root, allowPrefixes)) {
          return reject(`vfs_ls pattern="${pattern}" (root="${root}")`);
        }
      }
    }

    const excludePatterns = Array.isArray((args as any)?.excludePatterns)
      ? (args as any).excludePatterns
      : null;
    if (excludePatterns) {
      for (const pattern of excludePatterns) {
        if (typeof pattern !== "string") {
          return reject("vfs_ls excludePatterns[] must be strings");
        }
        const root = extractGlobRoot(pattern);
        if (!root) return reject(`vfs_ls excludePattern="${pattern}" has no static root`);
        if (!isAllowedOutlineReadOnlyPath(root, allowPrefixes)) {
          return reject(`vfs_ls excludePattern="${pattern}" (root="${root}")`);
        }
      }
    }
    return null;
  }

  if (toolName === "vfs_schema") {
    const paths = Array.isArray((args as any)?.paths) ? (args as any).paths : [];
    if (paths.length === 0) return reject("vfs_schema requires paths[]");
    const bad = paths.find(
      (p: unknown) => typeof p !== "string" || !isAllowedOutlineReadOnlyPath(p, allowPrefixes),
    );
    if (bad) {
      return reject(`vfs_schema includes disallowed path="${String(bad)}"`);
    }
    return null;
  }

  if (toolName === "vfs_read") {
    const path = typeof (args as any)?.path === "string" ? (args as any).path : "";
    if (!path) return reject("vfs_read requires a path");
    if (!isAllowedOutlineReadOnlyPath(path, allowPrefixes)) {
      return reject(`vfs_read path="${path}"`);
    }
    return null;
  }

  if (toolName === "vfs_search") {
    const path = typeof (args as any)?.path === "string" ? (args as any).path : "";
    if (!path) return reject(`${toolName} requires a path (root search disabled)`);
    if (!isAllowedOutlineReadOnlyPath(path, allowPrefixes)) {
      return reject(`${toolName} path="${path}"`);
    }
    return null;
  }

  // Default: conservative deny.
  return reject(`tool "${toolName}" is not allowed in outline read-only mode`);
};

const formatOutlineSubmitValidationError = (error: unknown): string => {
  const err = error as any;
  const issues = err?.issues;
  if (!Array.isArray(issues)) {
    return String(err?.message ?? error);
  }
  return issues
    .slice(0, 8)
    .map((issue: any) => {
      const path = Array.isArray(issue?.path) ? issue.path.join(".") : "";
      const message =
        typeof issue?.message === "string" ? issue.message : "Invalid";
      return path ? `${path}: ${message}` : message;
    })
    .join("; ");
};

const userMessageContainsText = (
  message: UnifiedMessage,
  text: string,
): boolean => {
  if (message.role !== "user") return false;
  const content = (message as any).content;
  if (typeof content === "string") return content.includes(text);
  if (!Array.isArray(content)) return false;
  return content.some(
    (part) =>
      part?.type === "text" &&
      typeof part?.text === "string" &&
      part.text.includes(text),
  );
};

const hasRecentPhasePromptMarker = (
  history: UnifiedMessage[],
  phase: number,
  lookback: number,
): boolean => {
  const marker = `[PHASE ${phase} `;
  const window = lookback > 0 ? history.slice(-lookback) : history;
  return window.some((message) => userMessageContainsText(message, marker));
};

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
  if (!options) {
    throw new Error("options is required");
  }
  const { settings, vfsSession } = options;
  const readOnlyVfsEnabled = Boolean(options.enableReadOnlyVfsTools ?? true);

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

  const readOnlyVfsAllowPrefixes =
    options.readOnlyVfsAllowPrefixes ??
    getOutlineDefaultReadOnlyAllowPrefixes(theme, isImageBasedFlow);

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
  const effectivePresetProfile = resolveEffectivePresetProfile({
    customContext,
    presetProfile: options.presetProfile,
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

  const resolvedNarrativeStyle =
    resolveNarrativeStyle({
      themeStyle: themeDataNarrativeStyle,
      preset:
        effectiveNarrativeStylePreset === "theme"
          ? undefined
          : effectiveNarrativeStylePreset,
      language,
      customContext,
    }) || themeDataNarrativeStyle;

  const worldDisposition = resolveWorldDisposition({
    preset:
      effectiveWorldDispositionPreset === "theme"
        ? undefined
        : effectiveWorldDispositionPreset,
    language,
    customContext,
  });

  const playerMaliceProfile = resolvePlayerMaliceProfile({
    preset:
      effectivePlayerMalicePreset === "theme"
        ? undefined
        : effectivePlayerMalicePreset,
    intensity: effectivePlayerMaliceIntensity,
    language,
    customContext,
  });

  const baseSystemInstruction = getOutlineSystemInstruction({
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
    worldDispositionPreset: effectiveWorldDispositionPreset,
    playerMaliceProfile,
    playerMalicePreset: effectivePlayerMalicePreset,
    playerMaliceIntensity: effectivePlayerMaliceIntensity,
    vfsReadOnly: readOnlyVfsEnabled
      ? { enabled: true, allowedRoots: readOnlyVfsAllowPrefixes }
      : undefined,
  });

  const runtimeFloor = getOutlineRuntimeFloor();

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

  // Initialize or restore from checkpoint
  let conversationHistory: UnifiedMessage[];
  let partial: PartialStoryOutline;
  let currentPhase: number;
  let liveToolCalls: ToolCallRecord[] = [];

  if (options.resumeFrom) {
    // Resume from checkpoint
    conversationHistory = [...options.resumeFrom.conversationHistory];
    partial = { ...options.resumeFrom.partial };
    currentPhase = options.resumeFrom.currentPhase;
    liveToolCalls = [...(options.resumeFrom.liveToolCalls || [])];
    console.log(`[OutlineAgentic] Resuming from phase ${currentPhase}`);

    const hasResumeAnchor = conversationHistory.some((msg) =>
      userMessageContainsText(msg, OUTLINE_RESUME_ANCHOR_MARKER),
    );
    if (!hasResumeAnchor) {
      conversationHistory.push(
        createUserMessage(buildOutlineResumeAnchor(currentPhase, partial)),
      );
    }

    options.onToolCallsUpdate?.(liveToolCalls);
  } else {
    // Start fresh
    conversationHistory = [];
    partial = {};
    liveToolCalls = [];
    options.onToolCallsUpdate?.([]);

    // If seedImage provided, start at Phase 0 (image interpretation)
    // Otherwise start at Phase 1 (normal flow)
    const hasImage = !!options.seedImageBase64;
    currentPhase = hasImage ? 0 : 1;

    // Build initial task message
    const totalPhases = hasImage ? 10 : 9; // Phase 0 + 1-9 or just 1-9
    const phaseRange = hasImage ? "0-9" : "1-9";

    const allowedRootsForPrompt = readOnlyVfsAllowPrefixes
      .map((p) => `  - current/${normalizeVfsPath(p)}`)
      .join("\n");

    const vfsReadOnlyHint = readOnlyVfsEnabled
      ? `- OPTIONAL: You may use read-only VFS tools (e.g. \`vfs_ls\`, \`vfs_read\`) to inspect reference files.\n- Allowed roots:\n${allowedRootsForPrompt}\n- Do NOT combine the current phase submit tool with other tools in the same message. Use separate rounds: read first, then submit.\n`
      : "";

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
${vfsReadOnlyHint}- **CRITICAL**: You must invoke the tool function directly. Do NOT return the schema as a JSON text block.
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
  const saveCheckpoint = async (phase: number) => {
    const checkpoint: OutlineConversationState = {
      theme,
      language,
      customContext,
      conversationHistory: [...conversationHistory],
      partial: { ...partial },
      currentPhase: phase,
      modelId, // Track which model was used
      providerId: instance.id, // Track which provider was used
      liveToolCalls: [...liveToolCalls],
    };

    try {
      writeOutlineProgress(vfsSession, checkpoint);
    } catch (e) {
      console.warn("[OutlineAgentic] Failed to write outline progress to VFS", e);
    }

    if (options.onSaveCheckpoint) {
      try {
        await options.onSaveCheckpoint({ ...checkpoint });
      } catch (e) {
        console.warn("[OutlineAgentic] Failed to persist outline checkpoint", e);
      }
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
  const normalizedSessionTag = options.sessionTag
    ? options.sessionTag.replace(/[^a-zA-Z0-9_-]/g, "-")
    : "";
  const taggedBaseSessionId = normalizedSessionTag
    ? `${baseSessionId}-${normalizedSessionTag}`
    : baseSessionId;
  const outlineSessionId = options.slotId
    ? `${taggedBaseSessionId}-${options.slotId}`
    : taggedBaseSessionId;

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
    await saveCheckpoint(currentPhase);
  }

  // Helper to make API call with retry
  const callAIWithRetry = async (
    phaseNum: number,
    tools: ZodToolDefinition[],
    opts?: {
      requiredToolName?: string;
      endpointSuffix?: string;
      maxRetries?: number;
    },
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
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        })),
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
        maxRetries: opts?.maxRetries ?? budgetState.retriesMax,
        requiredToolName: opts?.requiredToolName,
        finishToolName: submitToolNameByPhase(phaseNum),
        onRetry: (err, count, meta) => {
          console.warn(
            `[OutlineAgentic] Retry ${count}/${opts?.maxRetries ?? budgetState.retriesMax} due to: ${err}`,
          );
          // 1. Increment retries in budget state
          if (!meta?.silent) {
            incrementRetries(budgetState);
          }

          // 2. Generate updated budget prompt
          const retryBudgetPrompt = generateBudgetPrompt(budgetState);

          // 3. Inject into history so the model sees it BEFORE the next attempt
          conversationHistory.push(
            createUserMessage(`[SYSTEM: BUDGET UPDATE]\n${retryBudgetPrompt}`),
          );
        },
      },
    );

    const endpointSuffix = opts?.endpointSuffix
      ? `-${opts.endpointSuffix}`
      : "";

    const logEntry = createLogEntry({
      provider: instance.protocol,
      model: modelId,
      endpoint: `outline-phase${phaseNum}${endpointSuffix}`,
      phase: phaseNum,
      toolName: opts?.requiredToolName ?? tools[tools.length - 1]?.name ?? "unknown",
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
    const phaseNum = currentPhase;
    const phaseSchema = OUTLINE_PHASE_SCHEMAS[phaseNum];
    const submitTool = getOutlineSubmitToolByPhase(phaseNum);

    console.log(
      `[OutlineAgentic] Starting Phase ${phaseNum}. Budget: ${getBudgetSummary(budgetState)}`,
    );
    reportProgress(phaseNum, "starting");

    // Add phase-specific prompt
    let phasePrompt = getPhasePrompt(
      phaseNum,
      theme,
      language,
      submitTool.name,
      customContext,
      !!options.seedImageBase64,
      options.protagonistFeature,
    );
    if (phasePrompt) {
      // Resume/recovery runs can carry stale prompts from older phases.
      // Re-anchor the active phase prompt so the model keeps the correct submit tool.
      const hasRecentMarker = hasRecentPhasePromptMarker(
        conversationHistory,
        phaseNum,
        12,
      );
      const shouldInjectPrompt = Boolean(options.resumeFrom) || !hasRecentMarker;
      if (shouldInjectPrompt) {
        conversationHistory.push(createUserMessage(phasePrompt));
      }
    }

    try {
      reportProgress(phaseNum, "generating");

      let phaseSubmitted = false;

      while (!phaseSubmitted) {
        if (budgetState.retriesUsed !== 0) {
          budgetState.retriesUsed = 0;
        }

        const budgetCheck = checkBudgetExhaustion(budgetState);
        if (budgetCheck.exhausted) {
          console.warn(`[OutlineAgentic] ${budgetCheck.message}`);
          throw new Error(budgetCheck.message);
        }

        const toolCallsRemaining =
          budgetState.toolCallsMax - budgetState.toolCallsUsed;
        const iterationsRemaining =
          budgetState.loopIterationsMax - budgetState.loopIterationsUsed;
        const mustFinishNow =
          toolCallsRemaining <= 2 || iterationsRemaining <= 2;

        const activeTools: ZodToolDefinition[] = mustFinishNow
          ? [submitTool]
          : readOnlyVfsEnabled
            ? [...READ_ONLY_VFS_TOOL_DEFS, submitTool]
            : [submitTool];

        // Inject budget status for this iteration
        conversationHistory.push(
          createUserMessage(
            `[SYSTEM: BUDGET STATUS]\n${generateBudgetPrompt(budgetState, submitTool.name)}`,
          ),
        );

        const { result, log } = await callAIWithRetry(phaseNum, activeTools, {
          requiredToolName: mustFinishNow ? submitTool.name : undefined,
          endpointSuffix: `iter-${budgetState.loopIterationsUsed + 1}`,
          maxRetries: Math.max(
            0,
            budgetState.retriesMax - budgetState.retriesUsed,
          ),
        });

        if (log) logs.push(log);

        const toolCalls =
          result &&
          typeof result === "object" &&
          "functionCalls" in result &&
          Array.isArray((result as any).functionCalls)
            ? ((result as any).functionCalls as ToolCallResult[])
            : [];

        const textContent = (result as { content?: string }).content;

        if (!toolCalls || toolCalls.length === 0) {
          throw new Error(`Phase ${phaseNum}: No function calls in response`);
        }

        // Ensure all tool calls have IDs (OpenAI requirement)
        for (const tc of toolCalls) {
          if (!tc.id) {
            tc.id = `call_${Math.random().toString(36).slice(2, 11)}`;
          }
        }

        liveToolCalls = toolCalls.map((tc) => ({
          name: tc.name,
          input: (tc.args || {}) as Record<string, unknown>,
          output: null,
          timestamp: Date.now(),
        }));
        options.onToolCallsUpdate?.([...liveToolCalls]);

        // Budget accounting
        incrementToolCalls(budgetState, toolCalls.length);
        incrementIterations(budgetState);

        // Record assistant tool calls (and any text content)
        conversationHistory.push(
          createToolCallMessage(
            toolCalls.map((tc) => ({
              id: tc.id,
              name: tc.name,
              arguments: tc.args,
              thoughtSignature: tc.thoughtSignature, // Include for Gemini 3 models
            })),
            textContent,
          ),
        );

        const toolResponses: Array<{
          toolCallId: string;
          name: string;
          content: unknown;
        }> = [];

        const submitCalls = toolCalls.filter((tc) => tc.name === submitTool.name);
        const allowedToolNames = activeTools.map((tool) => tool.name);

        if (submitCalls.length > 1) {
          for (const tc of submitCalls) {
            toolResponses.push({
              toolCallId: tc.id!,
              name: tc.name,
              content: {
                success: false,
                error: `[ERROR: MULTIPLE_SUBMITS] Call "${submitTool.name}" at most once per round.`,
                code: "INVALID_ACTION",
              },
            });
          }
        }

        for (const tc of toolCalls) {
          if (OUTLINE_SUBMIT_TOOL_NAMES.has(tc.name) && tc.name !== submitTool.name) {
            toolResponses.push({
              toolCallId: tc.id!,
              name: tc.name,
              content: {
                success: false,
                error:
                  `[ERROR: DISALLOWED_SUBMIT_TOOL] This round only allows "${submitTool.name}" as the submit tool. ` +
                  `Allowed tools: ${allowedToolNames.join(", ")}`,
                code: "INVALID_ACTION",
              },
            });
            continue;
          }

          if (tc.name === submitTool.name) {
            if (toolCalls.length !== 1) {
              toolResponses.push({
                toolCallId: tc.id!,
                name: tc.name,
                content: {
                  success: false,
                  error:
                    `[ERROR: SUBMIT_MUST_BE_ALONE] Do not combine "${submitTool.name}" with other tools in the same message. ` +
                    `Use read-only VFS tools in earlier rounds, then call "${submitTool.name}" alone to submit this phase.`,
                  code: "INVALID_ACTION",
                },
              });
              continue;
            }

            const submitArgsParsed = submitTool.parameters.safeParse(tc.args);
            if (!submitArgsParsed.success) {
              toolResponses.push({
                toolCallId: tc.id!,
                name: tc.name,
                content: {
                  success: false,
                  error:
                    `${submitTool.name}: invalid arguments: ${formatOutlineSubmitValidationError(submitArgsParsed.error)}`,
                  code: "INVALID_DATA",
                },
              });
              continue;
            }

            const submitArgs = submitArgsParsed.data;

            const validatedDataParsed = phaseSchema.safeParse(submitArgs.data);
            if (!validatedDataParsed.success) {
              toolResponses.push({
                toolCallId: tc.id!,
                name: tc.name,
                content: {
                  success: false,
                  error: `Phase ${phaseNum}: schema validation failed: ${formatOutlineSubmitValidationError(validatedDataParsed.error)}`,
                  code: "INVALID_DATA",
                },
              });
              continue;
            }

            const validatedData = validatedDataParsed.data;

            // Phase 2: Additional gender validation
            if (phaseNum === 2 && settings.extra?.genderPreference) {
              const genderPref = settings.extra.genderPreference;
              if (genderPref === "male" || genderPref === "female") {
                const genderError = validateGenderPreferencePhase2(
                  validatedData,
                  genderPref,
                );
                if (genderError) {
                  toolResponses.push({
                    toolCallId: tc.id!,
                    name: tc.name,
                    content: { success: false, error: genderError, code: "INVALID_DATA" },
                  });
                  continue;
                }
              }
            }

            const output = await dispatchToolCallAsync(tc.name, tc.args, {
              vfsSession,
              settings,
              gameState: { forkId: -1, turnNumber: 0 } as any,
              vfsActor: "ai",
              vfsMode: "sudo",
              vfsElevationIntent: "outline_submit",
              vfsElevationScopeTemplateIds: [
                "template.narrative.outline.phases",
              ],
              vfsElevationToken: vfsElevationTokenManager.issueAiElevationToken({
                intent: "outline_submit",
                scopeTemplateIds: ["template.narrative.outline.phases"],
              }),
            });

            if ((output as any)?.success === true) {
              const phaseKey = `phase${phaseNum}` as keyof PartialStoryOutline;
              (partial as any)[phaseKey] = validatedData;
              phaseSubmitted = true;
            }
            toolResponses.push({
              toolCallId: tc.id!,
              name: tc.name,
              content: output,
            });
            continue;
          }

          if (readOnlyVfsEnabled && READ_ONLY_VFS_TOOL_NAMES.has(tc.name)) {
            const violation = validateOutlineReadOnlyVfsArgs(
              tc.name,
              tc.args as any,
              readOnlyVfsAllowPrefixes,
            );
            if (violation) {
              toolResponses.push({
                toolCallId: tc.id!,
                name: tc.name,
                content: {
                  success: false,
                  error: violation,
                  code: "INVALID_ACTION",
                },
              });
              continue;
            }
            const output = await dispatchToolCallAsync(tc.name, tc.args, {
              vfsSession,
              settings,
              gameState: { forkId: -1, turnNumber: 0 } as any,
              vfsActor: "ai",
              vfsMode: "normal",
            });
            toolResponses.push({
              toolCallId: tc.id!,
              name: tc.name,
              content: output,
            });
            continue;
          }

          toolResponses.push({
            toolCallId: tc.id!,
            name: tc.name,
            content: {
              success: false,
              error:
                `Unknown or disallowed tool in outline generation: ${tc.name}. ` +
                `Allowed tools this round: ${allowedToolNames.join(", ")}`,
              code: "UNKNOWN_TOOL",
            },
          });
        }

        conversationHistory.push(createToolResponseMessage(toolResponses));

        const responseMapById = new Map(
          toolResponses.map((tr) => [tr.toolCallId, tr.content]),
        );
        liveToolCalls = liveToolCalls.map((call, index) => ({
          ...call,
          output:
            responseMapById.get(toolCalls[index]?.id || "") ?? call.output,
        }));
        options.onToolCallsUpdate?.([...liveToolCalls]);

        // Persist progress for breakpoint-resume (mid-phase tool rounds).
        await saveCheckpoint(phaseNum);
      }

      console.log(`[OutlineAgentic] Phase ${phaseNum} completed`);
      liveToolCalls = [];
      options.onToolCallsUpdate?.([]);
      reportProgress(phaseNum, "completed");

      // Move to next phase and save checkpoint
      currentPhase++;
      await saveCheckpoint(currentPhase);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      console.error(`[OutlineAgentic] Phase ${phaseNum} failed:`, error);
      liveToolCalls = [];
      options.onToolCallsUpdate?.([]);
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


export { summarizeContext } from "../summary/summaryAdapter";
