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
  OutlinePhaseId,
  OUTLINE_PHASE_SCHEMA_VERSION,
} from "../../../../types";
import type { VfsSession } from "../../../vfs/vfsSession";
import { writeOutlineProgress } from "../../../vfs/outline";
import {
  DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
  resolveModelContextWindowTokens,
} from "../../../modelContextWindows";
import { STORY_OUTLINE_MAX_OUTPUT_TOKENS } from "../../../tokenBudget";

import { ToolCallResult, ZodToolDefinition } from "../../../providers/types";
import {
  isInvalidArgumentError,
  HistoryCorruptedError,
} from "../../contextCompressor";

import type {
  OutlineImageSeed,
  OutlinePlayerActor,
  OutlineLocations,
  OutlineNpcsRelationships,
} from "../../../schemas";

import {
  getOutlineSystemInstruction,
  type OutlinePhaseSharedContext,
} from "../../../prompts/index";

import { THEMES } from "../../../../utils/constants";

import { vfsToolRegistry } from "../../../vfs/tools";
import { dispatchToolCallAsync } from "../../../tools/handlers";
import { normalizeVfsPath } from "../../../vfs/utils";
import { toJsonValue } from "../../../jsonValue";
import { vfsElevationTokenManager } from "../../../vfs/core/elevation";
import {
  WORKSPACE_MEMORY_DOC_ORDER,
  getWorkspaceMemoryLogicalPath,
  readWorkspaceMemoryDoc,
} from "../../../vfs/memoryTemplates";

import {
  getProviderConfig,
  createLogEntry,
  createThemeConfig,
  IMAGE_BASED_THEME,
  resolveNarrativeStyle,
  resolveWorldDisposition,
  resolvePlayerMaliceProfile,
  resolveEffectivePresetProfile,
  resolveCulturePreferenceContext,
  pickModelMatchedPrompt,
  type ModelPromptEntry,
} from "../../utils";

import promptToml from "@/prompt/prompt.toml";

import {
  createUserMessage,
  createToolCallMessage,
  createToolResponseMessage,
} from "../../../messageTypes";

import { sessionManager } from "../../sessionManager";

import { buildCacheHint } from "../../provider/cacheHint";
import { callWithAgenticRetry, createPromptTokenBudgetContext } from "../retry";
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
import { getOutlineDefaultReadOnlyAllowPrefixes } from "./readOnlyRoots";
import {
  composeSystemInstruction,
  getOutlineRuntimeFloor,
} from "../../../prompts/runtimeFloor";
import { validateGenderPreferencePhase3 } from "./genderValidation";
import { resolveOutlineToolNameAlias } from "./toolNameAlias";
import {
  validateNpcLocationsExist,
  validatePlayerCurrentLocationInLocations,
} from "./outlineCrossPhaseValidation";
import {
  getActiveOutlinePhases,
  getAllOutlinePhaseDefinitions,
  getOutlinePhaseArtifactCurrentPath,
  getOutlinePhaseArtifactSharedPath,
  type ActiveOutlinePhaseDefinition,
} from "./phaseRegistry";

// ============================================================================
// Phased Story Outline Generation
// ============================================================================

/** Progress callback for phased generation */
export interface OutlinePhaseProgress {
  phase: number;
  phaseId: OutlinePhaseId;
  phaseOrder: number;
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
  /**
   * Optional session namespace selector.
   * - "new": reuse the outline-new namespace (typically for retrying the same failed run)
   * - "resume": use the dedicated resume namespace
   * Defaults to "resume" when `resumeFrom` is provided, otherwise "new".
   */
  sessionNamespace?: "new" | "resume";
  /** Real-time hook for current round tool calls */
  onToolCallsUpdate?: (calls: ToolCallRecord[]) => void;
}

const READ_ONLY_VFS_TOOL_DEFS: ZodToolDefinition[] = [
  vfsToolRegistry.getDefinition("vfs_ls"),
  vfsToolRegistry.getDefinition("vfs_schema"),
  vfsToolRegistry.getDefinition("vfs_read_chars"),
  vfsToolRegistry.getDefinition("vfs_read_lines"),
  vfsToolRegistry.getDefinition("vfs_read_json"),
  vfsToolRegistry.getDefinition("vfs_read_markdown"),
  vfsToolRegistry.getDefinition("vfs_search"),
];

const READ_ONLY_VFS_TOOL_NAMES = new Set(
  READ_ONLY_VFS_TOOL_DEFS.map((t) => t.name),
);

const OUTLINE_SUBMIT_TOOL_NAMES: Set<string> = new Set(
  getAllOutlinePhaseDefinitions().map((phase) => phase.submitToolName),
);

const getOutlineSubmitToolByPhaseId = (
  phaseId: OutlinePhaseId,
): ZodToolDefinition => vfsToolRegistry.getOutlineSubmitTool(phaseId);

const stripOutlineCurrentPrefix = (path?: string): string => {
  const normalized = normalizeVfsPath(path ?? "");
  if (!normalized) return "";
  if (normalized === "current") return "";
  if (normalized.startsWith("current/"))
    return normalized.slice("current/".length);
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
    return (
      normalized === normalizedPrefix ||
      normalized.startsWith(`${normalizedPrefix}/`)
    );
  });
};

const OUTLINE_RESUME_ANCHOR_MARKER = "[OUTLINE RESUME ANCHOR]";

const buildWorkspaceMemoryMessages = (
  vfsSession: VfsSession,
): UnifiedMessage[] =>
  WORKSPACE_MEMORY_DOC_ORDER.map((doc) => {
    const path = getWorkspaceMemoryLogicalPath(doc);
    const content = readWorkspaceMemoryDoc(vfsSession, doc);
    return createUserMessage(`<file path="${path}">\n${content}\n</file>`);
  });

const getWorkspaceMemoryMessageMarkers = (): string[] =>
  WORKSPACE_MEMORY_DOC_ORDER.map(
    (doc) => `<file path="${getWorkspaceMemoryLogicalPath(doc)}">`,
  );

const isRecordObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null;

const getPartialPhase = (
  partial: PartialStoryOutline,
  phaseId: OutlinePhaseId,
): object | undefined => partial[phaseId];

const setPartialPhase = (
  partial: PartialStoryOutline,
  phaseId: OutlinePhaseId,
  value: object,
): void => {
  partial[phaseId] = value;
};

const getStringArg = (args: JsonObject, key: string): string => {
  const value = args[key];
  return typeof value === "string" ? value : "";
};

const getArrayArg = (args: JsonObject, key: string): unknown[] | null => {
  const value = args[key];
  return Array.isArray(value) ? value : null;
};

const readModelPromptEntries = (
  value: unknown,
): ModelPromptEntry[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const parsed = value
    .map((entry) => {
      if (!isRecordObject(entry)) return null;
      const keywords = Array.isArray(entry.keywords)
        ? entry.keywords.filter((k): k is string => typeof k === "string")
        : [];
      const prompt = typeof entry.prompt === "string" ? entry.prompt : "";
      return {
        keywords,
        prompt,
      } satisfies ModelPromptEntry;
    })
    .filter((entry): entry is ModelPromptEntry => entry !== null);
  return parsed.length > 0 ? parsed : undefined;
};

const extractFunctionCalls = (result: unknown): ToolCallResult[] => {
  if (!isRecordObject(result)) return [];
  const functionCalls = result.functionCalls;
  if (!Array.isArray(functionCalls)) return [];
  return functionCalls.filter((call): call is ToolCallResult => {
    if (!isRecordObject(call)) return false;
    if (typeof call.name !== "string") return false;
    if (typeof call.id !== "string" && typeof call.id !== "undefined")
      return false;
    if (!isRecordObject(call.args)) return false;
    if (
      typeof call.thoughtSignature !== "undefined" &&
      typeof call.thoughtSignature !== "string"
    ) {
      return false;
    }
    return true;
  });
};

const isToolSuccessResult = (value: unknown): value is { success: true } =>
  isRecordObject(value) && value.success === true;

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

const getOutlinePhaseArtifactPaths = (phaseId: OutlinePhaseId) => ({
  currentPath: getOutlinePhaseArtifactCurrentPath(phaseId),
  sharedPath: getOutlinePhaseArtifactSharedPath(phaseId),
});

const formatOutlinePhaseArtifactChecklist = (
  phases: ActiveOutlinePhaseDefinition[],
): string => {
  if (phases.length === 0) return "- none";
  return phases
    .map((phase) => {
      const { currentPath, sharedPath } = getOutlinePhaseArtifactPaths(
        phase.id,
      );
      return `- Phase ${phase.phaseOrder} (${phase.id}): \`${currentPath}\` (fallback: \`${sharedPath}\`)`;
    })
    .join("\n");
};

const buildOutlineResumeAnchor = (
  activePhases: ActiveOutlinePhaseDefinition[],
  currentPhaseId: OutlinePhaseId,
  partial: PartialStoryOutline,
): string => {
  if (activePhases.length === 0) {
    return `${OUTLINE_RESUME_ANCHOR_MARKER}
You are RESUMING an interrupted outline generation session.
No active phases are available in the current flow.`;
  }

  const activePhaseIndex = activePhases.findIndex(
    (p) => p.id === currentPhaseId,
  );
  const safeCurrentPhaseIndex = activePhaseIndex >= 0 ? activePhaseIndex : 0;
  const currentPhase = activePhases[safeCurrentPhaseIndex];
  const currentSubmitTool = currentPhase.submitToolName;
  const currentArtifactPaths = getOutlinePhaseArtifactPaths(currentPhase.id);

  const completedPhases = activePhases
    .slice(0, safeCurrentPhaseIndex)
    .filter((phase) => getPartialPhase(partial, phase.id) !== undefined);

  const missingCompletedPhases = activePhases
    .slice(0, safeCurrentPhaseIndex)
    .filter((phase) => getPartialPhase(partial, phase.id) === undefined);

  const remainingPhases = activePhases.slice(safeCurrentPhaseIndex);

  const completedPhasePreview = completedPhases
    .map((phase) => {
      const raw = safeJsonStringify(getPartialPhase(partial, phase.id));
      return `<phase_${phase.id}>${truncateText(raw, 1400)}</phase_${phase.id}>`;
    })
    .join("\n");

  return `${OUTLINE_RESUME_ANCHOR_MARKER}
You are RESUMING an interrupted outline generation session.

Current phase: ${currentPhase.phaseOrder} (${currentPhase.id})
Current submit tool: ${currentSubmitTool}
Current submit payload shape: \`{ ...${currentPhase.id} schema fields... }\`
Completed phases: ${completedPhases.length > 0 ? completedPhases.map((phase) => `${phase.phaseOrder}:${phase.id}`).join(", ") : "none"}
Missing completed artifacts (should re-read/repair before submit): ${
    missingCompletedPhases.length > 0
      ? missingCompletedPhases
          .map((phase) => `${phase.phaseOrder}:${phase.id}`)
          .join(", ")
      : "none"
  }
Remaining phases (including current): ${remainingPhases
    .map((phase) => `${phase.phaseOrder}:${phase.id}`)
    .join(", ")}

Authoritative progress checkpoint:
- \`current/outline/progress.json\`

Phase artifact lookup (completed):
${formatOutlinePhaseArtifactChecklist(completedPhases)}

Current-phase artifact targets:
- \`${currentArtifactPaths.currentPath}\`
- \`${currentArtifactPaths.sharedPath}\`

Read order (recommended):
1) Read \`current/outline/progress.json\` to confirm resume checkpoint.
2) Read completed phase files listed above to rebuild continuity.
3) If a file is missing under \`current/\`, read the \`shared/\` fallback path.
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
  const root =
    wildcardIndex === -1 ? normalized : normalized.slice(0, wildcardIndex);
  return normalizeVfsPath(root);
};

const validateOutlineReadOnlyVfsArgs = (
  toolName: string,
  args: JsonObject,
  allowPrefixes: string[],
): string | null => {
  const reject = (detail: string) =>
    `Blocked read-only VFS access in outline generation: ${detail}. Allowed roots: ${allowPrefixes
      .map((p) => `\`current/${normalizeVfsPath(p)}\``)
      .join(", ")}`;

  if (toolName === "vfs_ls") {
    const path = getStringArg(args, "path");
    const patterns = getArrayArg(args, "patterns");
    if (!path && (!patterns || patterns.length === 0)) {
      return reject(
        "vfs_ls requires path or patterns (root listing is disabled)",
      );
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
        if (!root)
          return reject(`vfs_ls pattern="${pattern}" has no static root`);
        if (!isAllowedOutlineReadOnlyPath(root, allowPrefixes)) {
          return reject(`vfs_ls pattern="${pattern}" (root="${root}")`);
        }
      }
    }

    const excludePatterns = getArrayArg(args, "excludePatterns");
    if (excludePatterns) {
      for (const pattern of excludePatterns) {
        if (typeof pattern !== "string") {
          return reject("vfs_ls excludePatterns[] must be strings");
        }
        const root = extractGlobRoot(pattern);
        if (!root)
          return reject(
            `vfs_ls excludePattern="${pattern}" has no static root`,
          );
        if (!isAllowedOutlineReadOnlyPath(root, allowPrefixes)) {
          return reject(`vfs_ls excludePattern="${pattern}" (root="${root}")`);
        }
      }
    }
    return null;
  }

  if (toolName === "vfs_schema") {
    const paths = getArrayArg(args, "paths") ?? [];
    if (paths.length === 0) return reject("vfs_schema requires paths[]");
    const bad = paths.find(
      (p: unknown) =>
        typeof p !== "string" ||
        !isAllowedOutlineReadOnlyPath(p, allowPrefixes),
    );
    if (bad) {
      return reject(`vfs_schema includes disallowed path="${String(bad)}"`);
    }
    return null;
  }

  if (
    toolName === "vfs_read_chars" ||
    toolName === "vfs_read_lines" ||
    toolName === "vfs_read_json" ||
    toolName === "vfs_read_markdown"
  ) {
    const path = getStringArg(args, "path");
    if (!path) return reject(`${toolName} requires a path`);
    if (!isAllowedOutlineReadOnlyPath(path, allowPrefixes)) {
      return reject(`${toolName} path="${path}"`);
    }
    return null;
  }

  if (toolName === "vfs_search") {
    const path = getStringArg(args, "path");
    if (!path)
      return reject(`${toolName} requires a path (root search disabled)`);
    if (!isAllowedOutlineReadOnlyPath(path, allowPrefixes)) {
      return reject(`${toolName} path="${path}"`);
    }
    return null;
  }

  // Default: conservative deny.
  return reject(`tool "${toolName}" is not allowed in outline read-only mode`);
};

const formatOutlineSubmitValidationError = (error: unknown): string => {
  if (!isRecordObject(error)) return String(error);
  const issues = error.issues;
  if (!Array.isArray(issues)) {
    return String(error.message ?? error);
  }
  return issues
    .slice(0, 8)
    .map((issue) => {
      const issueRecord = isRecordObject(issue) ? issue : null;
      const path =
        issueRecord && Array.isArray(issueRecord.path)
          ? issueRecord.path
              .map((segment) =>
                typeof segment === "string" || typeof segment === "number"
                  ? String(segment)
                  : "",
              )
              .filter(Boolean)
              .join(".")
          : "";
      const message =
        issueRecord && typeof issueRecord.message === "string"
          ? issueRecord.message
          : "Invalid";
      return path ? `${path}: ${message}` : message;
    })
    .join("; ");
};

const userMessageContainsText = (
  message: UnifiedMessage,
  text: string,
): boolean => {
  if (message.role !== "user") return false;
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content.includes(text);
  if (!Array.isArray(content)) return false;
  return content.some(
    (part) =>
      part?.type === "text" &&
      typeof part?.text === "string" &&
      part.text.includes(text),
  );
};

const isWorkspaceMemoryMessage = (
  message: UnifiedMessage,
  markers: string[],
): boolean =>
  message.role === "user" &&
  markers.some((marker) => userMessageContainsText(message, marker));

const ensureWorkspaceMemoryMessagePrefix = (
  history: UnifiedMessage[],
  vfsSession: VfsSession,
): UnifiedMessage[] => {
  const markers = getWorkspaceMemoryMessageMarkers();
  const hasAllMarkers = markers.every((marker) =>
    history.some((message) => userMessageContainsText(message, marker)),
  );
  if (hasAllMarkers) {
    return history;
  }

  const withoutLegacyMemoryMessages = history.filter(
    (message) => !isWorkspaceMemoryMessage(message, markers),
  );
  return [
    ...buildWorkspaceMemoryMessages(vfsSession),
    ...withoutLegacyMemoryMessages,
  ];
};

const hasRecentPhasePromptMarker = (
  history: UnifiedMessage[],
  phaseOrder: number,
  lookback: number,
): boolean => {
  const marker = `[PHASE ${phaseOrder} `;
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
  tFunc?: (key: string, options?: JsonObject) => string,
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
  const contextWindowTokens = resolveModelContextWindowTokens({
    settings,
    providerId: instance.id,
    providerProtocol: instance.protocol,
    modelId,
    fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
  }).value;
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
    return (
      resume.currentPhaseId === "image_seed" ||
      Boolean(resume.partial.image_seed)
    );
  })();
  const activePhases = getActiveOutlinePhases({
    hasImageContext: isImageBasedFlow,
  });

  const readOnlyVfsAllowPrefixes =
    options.readOnlyVfsAllowPrefixes ??
    getOutlineDefaultReadOnlyAllowPrefixes(theme, isImageBasedFlow);

  // Get theme data (skip if image-based flow - Phase 0 will generate context)
  const themeConfig = isImageBasedFlow
    ? null
    : THEMES[theme] || THEMES["fantasy"];
  const isRestricted = themeConfig?.restricted || false;

  let themeDataWorldSetting = "";
  let themeDataBackgroundTemplate = "";
  let themeDataExample = "";
  let themeDataNarrativeStyle = "";

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
      themeDataBackgroundTemplate = themeData.backgroundTemplate ?? "";
      themeDataExample = themeData.example ?? "";
      themeDataWorldSetting = themeData.worldSetting ?? "";
      themeDataNarrativeStyle = themeData.narrativeStyle ?? "";
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
  const culturePreferenceContext = resolveCulturePreferenceContext({
    preference: settings.extra?.culturePreference,
    themeKey: theme,
    worldSetting: themeDataWorldSetting,
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
    culturePreference: culturePreferenceContext.preference,
    culturePreferenceSource: culturePreferenceContext.source,
    cultureEffectiveCircle: culturePreferenceContext.effectiveCircle,
    cultureSkillPath: culturePreferenceContext.skillPath,
    cultureHubSkillPath: culturePreferenceContext.hubSkillPath,
    cultureNamingPolicy: culturePreferenceContext.namingPolicy,
  });

  const outlinePhaseSharedContext: OutlinePhaseSharedContext = {
    language,
    theme,
    customContext,
    hasImageContext: isImageBasedFlow,
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
    culturePreference: culturePreferenceContext.preference,
    culturePreferenceSource: culturePreferenceContext.source,
    cultureEffectiveCircle: culturePreferenceContext.effectiveCircle,
    cultureSkillPath: culturePreferenceContext.skillPath,
    cultureHubSkillPath: culturePreferenceContext.hubSkillPath,
    cultureNamingPolicy: culturePreferenceContext.namingPolicy,
  };

  const runtimeFloor = getOutlineRuntimeFloor();

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

  // Initialize or restore from checkpoint
  let conversationHistory: UnifiedMessage[];
  let partial: PartialStoryOutline;
  let currentPhaseId: OutlinePhaseId;
  let currentPhaseIndex: number;
  let liveToolCalls: ToolCallRecord[] = [];

  if (options.resumeFrom) {
    // Resume from checkpoint
    conversationHistory = [...options.resumeFrom.conversationHistory];
    const resumeConversationHistoryIsEmpty =
      options.resumeFrom.conversationHistory.length === 0;
    conversationHistory = ensureWorkspaceMemoryMessagePrefix(
      conversationHistory,
      vfsSession,
    );
    partial = { ...options.resumeFrom.partial };
    const resolvedPhaseIndex = activePhases.findIndex(
      (phase) => phase.id === options.resumeFrom!.currentPhaseId,
    );
    currentPhaseIndex = resolvedPhaseIndex >= 0 ? resolvedPhaseIndex : 0;
    currentPhaseId =
      activePhases[currentPhaseIndex]?.id ??
      activePhases[0]?.id ??
      "master_plan";
    liveToolCalls = [...(options.resumeFrom.liveToolCalls || [])];
    console.log(
      `[OutlineAgentic] Resuming from phase ${currentPhaseIndex + 1} (${currentPhaseId})`,
    );

    const hasResumeAnchor = conversationHistory.some((msg) =>
      userMessageContainsText(msg, OUTLINE_RESUME_ANCHOR_MARKER),
    );
    if (!hasResumeAnchor && resumeConversationHistoryIsEmpty) {
      conversationHistory.push(
        createUserMessage(
          buildOutlineResumeAnchor(activePhases, currentPhaseId, partial),
        ),
      );
    }

    options.onToolCallsUpdate?.(liveToolCalls);
  } else {
    // Start fresh
    conversationHistory = ensureWorkspaceMemoryMessagePrefix([], vfsSession);
    partial = {};
    liveToolCalls = [];
    options.onToolCallsUpdate?.([]);

    currentPhaseIndex = 0;
    currentPhaseId = activePhases[0]?.id ?? "master_plan";

    // Build initial task message
    const totalPhases = activePhases.length;
    const phaseSequence = activePhases.map((phase) => phase.id).join(" -> ");

    const allowedRootsForPrompt = readOnlyVfsAllowPrefixes
      .map((p) => `  - \`current/${normalizeVfsPath(p)}\``)
      .join("\n");

    const vfsReadOnlyHint = readOnlyVfsEnabled
      ? `- OPTIONAL: You may use read-only VFS tools (e.g. \`vfs_ls\`, \`vfs_read_lines\`, \`vfs_read_json\`, \`vfs_read_markdown\`) to inspect reference files.\n- Allowed roots:\n${allowedRootsForPrompt}\n- Do NOT combine the current phase submit tool with other tools in the same message. Use separate rounds: read first, then submit.\n`
      : "";

    // Create the initial task instruction
    const taskText = `[OUTLINE GENERATION TASK]
Generate a story outline in ${totalPhases} phases. Each phase builds upon the previous ones.
Phase sequence: ${phaseSequence}

Theme: ${theme}
Language: ${language}
${customContext ? `Custom Context: ${customContext}` : ""}
${options.protagonistFeature ? `User Selected Protagonist Role: ${options.protagonistFeature}` : ""}
${isImageBasedFlow ? `\n**An image has been provided by the user.** This image should inspire the story world and atmosphere. Start with image_seed analysis.` : ""}

**PROCESS:**
- You will receive one phase instruction at a time
- For each phase, you MUST call the provided tool to submit your data
${vfsReadOnlyHint}- **CRITICAL**: You must invoke the tool function directly. Use the exact tool name shown by the system with no namespace prefix (for example, never use \`default_api:\`, \`functions.\`, or \`tool:\` prefixes). Do NOT return the schema as a JSON text block.
- After submitting, wait for the next phase instruction
`;

    // If we have an image, create a message with both image and text
    if (isImageBasedFlow && options.seedImageBase64) {
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
  const saveCheckpoint = async (phaseId: OutlinePhaseId) => {
    const checkpoint: OutlineConversationState = {
      phaseSchemaVersion: OUTLINE_PHASE_SCHEMA_VERSION,
      theme,
      language,
      customContext,
      conversationHistory: [...conversationHistory],
      partial: { ...partial },
      currentPhaseId: phaseId,
      modelId, // Track which model was used
      providerId: instance.id, // Track which provider was used
      liveToolCalls: [...liveToolCalls],
    };

    try {
      writeOutlineProgress(vfsSession, checkpoint);
    } catch (e) {
      console.warn(
        "[OutlineAgentic] Failed to write outline progress to VFS",
        e,
      );
    }

    if (options.onSaveCheckpoint) {
      try {
        await options.onSaveCheckpoint({ ...checkpoint });
      } catch (e) {
        console.warn(
          "[OutlineAgentic] Failed to persist outline checkpoint",
          e,
        );
      }
    }
  };

  // Helper to report progress
  const reportProgress = (
    phase: ActiveOutlinePhaseDefinition,
    status: OutlinePhaseProgress["status"],
    error?: string,
  ) => {
    if (options?.onPhaseProgress) {
      options.onPhaseProgress({
        phase: phase.phaseOrder,
        phaseId: phase.id,
        phaseOrder: phase.phaseOrder,
        totalPhases: phase.totalPhases,
        phaseName: phase.progressNameKey,
        status,
        partialOutline: partial,
        error,
      });
    }
  };

  // Determine session ID with slotId for isolation if provided
  const sessionNamespace =
    options.sessionNamespace ??
    (options.resumeFrom ? ("resume" as const) : ("new" as const));
  const baseSessionId =
    sessionNamespace === "resume" ? "outline-resume" : "outline-new";
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
      `[OutlineAgentic] Saving initial checkpoint at phase ${currentPhaseIndex + 1} (${currentPhaseId})`,
    );
    await saveCheckpoint(currentPhaseId);
  }

  // Helper to make API call with retry
  const promptTokenBudgetContext = createPromptTokenBudgetContext();
  const callAIWithRetry = async (
    phase: ActiveOutlinePhaseDefinition,
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
        tokenBudget: {
          providerManagedMaxTokens:
            settings.extra?.providerManagedMaxTokens ?? true,
          maxOutputTokensFallback: settings.extra?.maxOutputTokensFallback,
          contextWindowTokens,
          maxOutputTokensHardCap: STORY_OUTLINE_MAX_OUTPUT_TOKENS,
        },
        thinkingEffort: settings.story?.thinkingEffort,
      },
      conversationHistory,
      {
        maxRetries: opts?.maxRetries ?? budgetState.retriesMax,
        requiredToolName: opts?.requiredToolName,
        finishToolName: phase.submitToolName,
        promptTokenBudgetContext,
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
      endpoint: `${phase.endpointKey}${endpointSuffix}`,
      phase: phase.phaseOrder,
      toolName:
        opts?.requiredToolName ?? tools[tools.length - 1]?.name ?? "unknown",
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
  while (currentPhaseIndex < activePhases.length) {
    const phase = activePhases[currentPhaseIndex];
    currentPhaseId = phase.id;
    const phaseSchema = phase.schema;
    const submitTool = getOutlineSubmitToolByPhaseId(phase.id);

    console.log(
      `[OutlineAgentic] Starting Phase ${phase.phaseOrder}/${phase.totalPhases} (${phase.id}). Budget: ${getBudgetSummary(
        budgetState,
      )}`,
    );
    reportProgress(phase, "starting");

    // Add phase-specific prompt
    let phasePrompt = getPhasePrompt(
      phase.id,
      phase.phaseOrder,
      phase.totalPhases,
      submitTool.name,
      outlinePhaseSharedContext,
    );
    if (phasePrompt) {
      // Resume/recovery runs can carry stale prompts from older phases.
      // Re-anchor the active phase prompt so the model keeps the correct submit tool.
      const hasRecentMarker = hasRecentPhasePromptMarker(
        conversationHistory,
        phase.phaseOrder,
        12,
      );
      const shouldInjectPrompt =
        Boolean(options.resumeFrom) || !hasRecentMarker;
      if (shouldInjectPrompt) {
        conversationHistory.push(createUserMessage(phasePrompt));
      }
    }

    try {
      reportProgress(phase, "generating");

      let phaseSubmitted = false;
      if (budgetState.retriesUsed !== 0) {
        budgetState.retriesUsed = 0;
      }

      while (!phaseSubmitted) {
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

        const { result, log } = await callAIWithRetry(phase, activeTools, {
          requiredToolName: mustFinishNow ? submitTool.name : undefined,
          endpointSuffix: `iter-${budgetState.loopIterationsUsed + 1}`,
          maxRetries: Math.max(
            0,
            budgetState.retriesMax - budgetState.retriesUsed,
          ),
        });

        if (log) logs.push(log);

        const toolCalls = extractFunctionCalls(result);

        const textContent = (result as { content?: string }).content;

        if (!toolCalls || toolCalls.length === 0) {
          throw new Error(`Phase ${phase.id}: No function calls in response`);
        }

        // Ensure all tool calls have IDs (OpenAI requirement)
        for (const tc of toolCalls) {
          if (!tc.id) {
            tc.id = `call_${Math.random().toString(36).slice(2, 11)}`;
          }
        }

        liveToolCalls = toolCalls.map((tc) => ({
          name: tc.name,
          input: (tc.args || {}) as JsonObject,
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

        const allowedToolNames = activeTools.map((tool) => tool.name);
        const normalizedToolCalls = toolCalls.map((tc) => ({
          call: tc,
          normalizedName: resolveOutlineToolNameAlias(
            tc.name,
            allowedToolNames,
          ),
        }));
        const submitCalls = normalizedToolCalls.filter(
          ({ normalizedName }) => normalizedName === submitTool.name,
        );

        if (submitCalls.length > 1) {
          for (const { call: tc } of submitCalls) {
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

        for (const { call: tc, normalizedName } of normalizedToolCalls) {
          if (
            OUTLINE_SUBMIT_TOOL_NAMES.has(normalizedName) &&
            normalizedName !== submitTool.name
          ) {
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

          if (normalizedName === submitTool.name) {
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

            const validatedDataParsed = phaseSchema.safeParse(tc.args);
            if (!validatedDataParsed.success) {
              toolResponses.push({
                toolCallId: tc.id!,
                name: tc.name,
                content: {
                  success: false,
                  error: `${submitTool.name}: invalid arguments: ${formatOutlineSubmitValidationError(validatedDataParsed.error)}`,
                  code: "INVALID_DATA",
                },
              });
              continue;
            }

            const validatedData = validatedDataParsed.data;

            // player_actor: Additional protagonist gender validation
            if (
              phase.id === "player_actor" &&
              settings.extra?.genderPreference
            ) {
              const genderPref = settings.extra.genderPreference;
              if (
                genderPref === "male" ||
                genderPref === "female" ||
                genderPref === "pan_gender"
              ) {
                const genderError = validateGenderPreferencePhase3(
                  validatedData,
                  genderPref,
                );
                if (genderError) {
                  toolResponses.push({
                    toolCallId: tc.id!,
                    name: tc.name,
                    content: {
                      success: false,
                      error: genderError,
                      code: "INVALID_DATA",
                    },
                  });
                  continue;
                }
              }
            }

            // locations / npcs_relationships: cross-phase location reference validation
            if (phase.id === "locations") {
              const priorPhase3 = partial.player_actor as
                | OutlinePlayerActor
                | undefined;
              if (!priorPhase3?.player) {
                toolResponses.push({
                  toolCallId: tc.id!,
                  name: tc.name,
                  content: {
                    success: false,
                    error:
                      "locations phase requires player_actor data, but prior phase data is missing. Retry submission after player_actor is completed.",
                    code: "INVALID_DATA",
                  },
                });
                continue;
              }

              const cross = validatePlayerCurrentLocationInLocations(
                priorPhase3.player,
                (validatedData as OutlineLocations).locations,
              );
              if (!cross.ok) {
                toolResponses.push({
                  toolCallId: tc.id!,
                  name: tc.name,
                  content: {
                    success: false,
                    error: `locations: ${cross.error}`,
                    code: "INVALID_DATA",
                  },
                });
                continue;
              }
            }

            if (phase.id === "npcs_relationships") {
              const priorPhase4 = partial.locations as
                | OutlineLocations
                | undefined;
              if (!priorPhase4?.locations) {
                toolResponses.push({
                  toolCallId: tc.id!,
                  name: tc.name,
                  content: {
                    success: false,
                    error:
                      "npcs_relationships phase requires locations data, but prior phase data is missing. Retry submission after locations is completed.",
                    code: "INVALID_DATA",
                  },
                });
                continue;
              }

              const cross = validateNpcLocationsExist(
                priorPhase4.locations,
                (validatedData as OutlineNpcsRelationships).npcs,
              );
              if (!cross.ok) {
                toolResponses.push({
                  toolCallId: tc.id!,
                  name: tc.name,
                  content: {
                    success: false,
                    error: `npcs_relationships: ${cross.error}`,
                    code: "INVALID_DATA",
                  },
                });
                continue;
              }
            }

            const output = await dispatchToolCallAsync(
              normalizedName,
              tc.args,
              {
                vfsSession,
                settings,
                vfsActor: "ai",
                vfsMode: "sudo",
                vfsElevationIntent: "outline_submit",
                vfsElevationScopeTemplateIds: [
                  "template.narrative.outline.phases",
                ],
                vfsElevationToken:
                  vfsElevationTokenManager.issueAiElevationToken({
                    intent: "outline_submit",
                    scopeTemplateIds: ["template.narrative.outline.phases"],
                  }),
              },
            );

            if (isToolSuccessResult(output)) {
              setPartialPhase(partial, phase.id, validatedData);
              phaseSubmitted = true;
            }
            toolResponses.push({
              toolCallId: tc.id!,
              name: tc.name,
              content: output,
            });
            continue;
          }

          if (
            readOnlyVfsEnabled &&
            READ_ONLY_VFS_TOOL_NAMES.has(normalizedName)
          ) {
            const violation = validateOutlineReadOnlyVfsArgs(
              normalizedName,
              tc.args,
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
            const output = await dispatchToolCallAsync(
              normalizedName,
              tc.args,
              {
                vfsSession,
                settings,
                vfsActor: "ai",
                vfsMode: "normal",
              },
            );
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
                `Unknown or disallowed tool in outline generation: ${tc.name}` +
                (normalizedName !== tc.name
                  ? ` (normalized to "${normalizedName}")`
                  : "") +
                `. ` +
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
          output: toJsonValue(
            responseMapById.get(toolCalls[index]?.id || "") ?? call.output,
          ),
        }));
        options.onToolCallsUpdate?.([...liveToolCalls]);

        // Persist progress for breakpoint-resume (mid-phase tool rounds).
        await saveCheckpoint(phase.id);
      }

      console.log(
        `[OutlineAgentic] Phase ${phase.phaseOrder} (${phase.id}) completed`,
      );
      liveToolCalls = [];
      options.onToolCallsUpdate?.([]);
      reportProgress(phase, "completed");

      // Move to next phase and save checkpoint
      const nextPhase = activePhases[currentPhaseIndex + 1];
      currentPhaseIndex += 1;
      if (nextPhase) {
        currentPhaseId = nextPhase.id;
        await saveCheckpoint(currentPhaseId);
      } else {
        await saveCheckpoint(phase.id);
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      console.error(`[OutlineAgentic] Phase ${phase.id} failed:`, error);
      liveToolCalls = [];
      options.onToolCallsUpdate?.([]);
      reportProgress(phase, "error", error);

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
  const phase3 = partial.player_actor as OutlinePlayerActor | undefined;
  const phase4 = partial.locations as OutlineLocations | undefined;
  const phase6 = partial.npcs_relationships as
    | OutlineNpcsRelationships
    | undefined;

  if (phase3?.player && phase4?.locations) {
    const cross = validatePlayerCurrentLocationInLocations(
      phase3.player,
      phase4.locations,
    );
    if (!cross.ok) {
      throw new Error(
        `[OutlineAgentic] Cross-phase invariant failed before merge: ${cross.error}`,
      );
    }
  }

  if (phase4?.locations && phase6?.npcs) {
    const cross = validateNpcLocationsExist(phase4.locations, phase6.npcs);
    if (!cross.ok) {
      throw new Error(
        `[OutlineAgentic] Cross-phase invariant failed before merge: ${cross.error}`,
      );
    }
  }

  const outline = mergeOutlinePhases(partial);

  // Build themeConfig for storage in GameState
  // For imageBased: use Phase 0 generated data; for normal themes: use i18n
  let resolvedThemeConfig: ResolvedThemeConfig;
  const isImageStart = !theme || theme === IMAGE_BASED_THEME;
  const phase0Data = partial.image_seed as OutlineImageSeed | undefined;

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
