/**
 * ============================================================================
 * Session Context Manager
 * ============================================================================
 *
 * Manages session-based history for the agentic loop.
 * Handles initialization, hydration, retry detection, and checkpoints.
 */

import type { StorySegment, ProviderProtocol } from "@/types";
import type { UnifiedMessage } from "@/services/messageTypes";
import {
  createUserMessage,
  fromGeminiFormat,
  toGeminiFormat,
} from "@/services/messageTypes";
import { sessionManager, SessionConfig } from "@/services/ai/sessionManager";
import { buildCacheHint } from "@/services/ai/provider/cacheHint";
import {
  buildSessionStartupProfile,
  type SessionStartupMode,
} from "@/services/ai/agentic/startup";
import type { VfsSession } from "@/services/vfs/vfsSession";
import {
  ensureSessionHistoryPath,
  writeSessionHistoryJsonl,
} from "@/services/vfs/conversation";
import {
  checkpointVfsSession,
  rollbackVfsSessionToCheckpoint,
} from "@/services/vfs/runtimeCheckpoints";
import {
  getLoopCommandProtocolSkillPath,
  getLoopSkillBaselinePaths,
  type LoopSkillBaselineKey,
} from "@/services/prompts/skills/loopSkillBaseline";

// ============================================================================
// Types
// ============================================================================

export interface SessionSetupOptions {
  slotId: string;
  forkId: number;
  vfsSession: VfsSession;
  providerId: string;
  modelId: string;
  protocol: ProviderProtocol;
  systemInstruction: string;
  /** Initial context messages for new sessions */
  contextMessages: UnifiedMessage[];
  recentHistory?: StorySegment[];
  isInit?: boolean;
  /** Optional active command protocol skill path for cold-start hint */
  commandProtocolSkillPath?: string;
  /** Optional markdown handoff from latest summary for startup guidance */
  hotStartReferencesMarkdown?: string | null;
  /** Startup mode for shaping cold-start guidance */
  startupMode?: SessionStartupMode;
}

export interface SessionSetupResult {
  sessionId: string;
  sessionHistoryPath: string;
  parentSessionHistoryPath: string | null;
  sessionBindingKey: string;
  activeHistory: UnifiedMessage[];
}

const toCurrentPath = (path: string): string => {
  const normalized = path.replace(/^current\//, "").replace(/^\/+/, "");
  return `current/${normalized}`;
};

const buildColdStartSkillHintMessage = (options?: {
  commandProtocolSkillPath?: string;
  hotStartReferencesMarkdown?: string | null;
  startupMode?: SessionStartupMode;
  sessionHistoryPath?: string;
  parentSessionHistoryPath?: string | null;
}): UnifiedMessage => {
  const startupBaselineKey: LoopSkillBaselineKey =
    options?.startupMode === "player-rate"
      ? "player-rate"
      : options?.startupMode === "sudo"
        ? "sudo"
        : options?.startupMode === "cleanup"
          ? "cleanup"
          : "turn";
  const baselineMandatoryPaths = getLoopSkillBaselinePaths(startupBaselineKey);
  const defaultCommandProtocolSkillPath =
    getLoopCommandProtocolSkillPath(startupBaselineKey);
  const commandProtocolSkillPath =
    options?.commandProtocolSkillPath ?? defaultCommandProtocolSkillPath;
  const mandatoryReadPaths = baselineMandatoryPaths.map((path) =>
    path === defaultCommandProtocolSkillPath ? commandProtocolSkillPath : path,
  );

  const startupProfile = buildSessionStartupProfile({
    mode: options?.startupMode ?? "turn",
    latestSummaryReferencesMarkdown: options?.hotStartReferencesMarkdown ?? "",
    mandatoryReadPaths,
    maxOptionalRefs: 3,
  });
  const mandatoryReadPathSet = new Set(mandatoryReadPaths);

  const recommendedSkillPaths = startupProfile.recommendedReadPaths.filter(
    (path) =>
      path.startsWith("current/skills/") &&
      path.endsWith("/SKILL.md") &&
      !mandatoryReadPathSet.has(path),
  );
  const recommendedAnchorPaths = startupProfile.recommendedReadPaths.filter(
    (path) => !recommendedSkillPaths.includes(path),
  );
  const currentSessionPath =
    typeof options?.sessionHistoryPath === "string" &&
    options.sessionHistoryPath.length > 0
      ? options.sessionHistoryPath
      : "current/session/<session_uid>.jsonl";
  const parentSessionPath =
    typeof options?.parentSessionHistoryPath === "string" &&
    options.parentSessionHistoryPath.length > 0
      ? options.parentSessionHistoryPath
      : null;

  const hotStartPriorityLines =
    recommendedSkillPaths.length > 0 || recommendedAnchorPaths.length > 0
      ? [
          "- Hot-start priority list from latest summary handoff:",
          ...recommendedSkillPaths.map((path) => `  - \`${path}\` (skill)`),
          ...recommendedAnchorPaths.map((path) => `  - \`${path}\` (anchor)`),
        ]
      : [
          "- No high-confidence handoff paths were parsed; use narrow fallback anchors.",
          `- Default fallback anchor: \`${currentSessionPath}\`.`,
        ];

  const diagnosticsLines =
    startupProfile.warnings.length > 0
      ? [
          "",
          "[SECTION: HOT_START_REFERENCE_DIAGNOSTICS]",
          ...startupProfile.warnings.map((warning) => `- ${warning}`),
        ]
      : [];

  return createUserMessage(
    [
      "[SYSTEM: COLD_START_SOFT_GUIDANCE]",
      "",
      "[SECTION: MANDATORY_SKILL_PREFLIGHT]",
      "Required runtime skills are auto-injected by the system at session start (and after explicit session invalidation/rebuild flows).",
      "Injected baseline skill paths:",
      ...mandatoryReadPaths.map((path) => `- \`${path}\``),
      "If you need additional sections beyond injected context, issue targeted read calls.",
      ...hotStartPriorityLines,
      ...diagnosticsLines,
      "",
      "[SECTION: SESSION_LINEAGE]",
      `Current session mirror: \`${currentSessionPath}\``,
      parentSessionPath
        ? `Parent session mirror: \`${parentSessionPath}\``
        : "Parent session mirror: (none)",
      parentSessionPath
        ? "If you need prior context, read the parent session in bounded line windows."
        : "If cross-session continuity is needed later, query summary anchors first.",
      "",
      "[SECTION: TARGETED_HISTORY_LOOKUP]",
      `If prior context is needed, query \`${currentSessionPath}\` with lines/search windows.`,
      parentSessionPath
        ? `For earlier history, query \`${parentSessionPath}\` with bounded line windows.`
        : "When no parent session exists, stay within current session anchors.",
      "Avoid full-file reads of `session.jsonl` in one shot.",
    ].join("\n"),
  );
};

const hasKnownUserMarker = (text: string): boolean =>
  text.startsWith("[PLAYER_ACTION]") ||
  text.startsWith("[SUDO]") ||
  text.startsWith("[Player Rate]");

type SessionMirrorState = {
  path: string;
  parentPath: string | null;
  currentPath: string;
  currentParentPath: string | null;
  bindToken: string;
};

const resolveSessionMirrorState = (
  sessionId: string,
  vfsSession: VfsSession,
  forkId?: number,
): SessionMirrorState => {
  if (typeof forkId === "number" && Number.isFinite(forkId) && forkId >= 0) {
    vfsSession.setActiveForkId(Math.floor(forkId));
  }
  const ensured = ensureSessionHistoryPath(vfsSession, sessionId, {
    operation: "finish_commit",
  });
  const currentPath = toCurrentPath(ensured.path);
  const currentParentPath = ensured.parentPath
    ? toCurrentPath(ensured.parentPath)
    : null;
  return {
    path: ensured.path,
    parentPath: ensured.parentPath,
    currentPath,
    currentParentPath,
    bindToken: currentPath,
  };
};

const syncSessionHistoryMirror = (
  sessionId: string,
  vfsSession: VfsSession,
  forkId?: number,
): SessionMirrorState => {
  const mirror = resolveSessionMirrorState(sessionId, vfsSession, forkId);
  const nativeHistory = sessionManager.getHistory(sessionId);
  writeSessionHistoryJsonl(vfsSession, nativeHistory, {
    sessionId,
    path: mirror.path,
    operation: "finish_commit",
  });
  return mirror;
};

// ============================================================================
// Session Setup
// ============================================================================

/**
 * Setup session for a turn, handling initialization and hydration
 */
export async function setupSession(
  options: SessionSetupOptions,
): Promise<SessionSetupResult> {
  const {
    slotId,
    forkId,
    vfsSession,
    providerId,
    modelId,
    protocol,
    systemInstruction,
    contextMessages,
    recentHistory,
    isInit,
    commandProtocolSkillPath,
    hotStartReferencesMarkdown,
    startupMode,
  } = options;

  // Create session config
  const sessionConfig: SessionConfig = {
    slotId,
    forkId,
    providerId,
    modelId,
    protocol,
  };

  // Get or create session
  const session = await sessionManager.getOrCreateSession(sessionConfig);

  // Clear history if this is initial turn of a new game
  if (isInit && !sessionManager.isEmpty(session.id)) {
    console.log(
      `[SessionContext] Initial turn in slot ${slotId} with existing history. Clearing...`,
    );
    sessionManager.setHistory(session.id, []);
  }

  // Set cache hint
  const cacheHint = buildCacheHint(
    protocol,
    systemInstruction,
    contextMessages,
  );
  sessionManager.setCacheHint(session.id, cacheHint);
  sessionManager.setSystemInstruction(session.id, systemInstruction);

  const mirrorState = resolveSessionMirrorState(session.id, vfsSession, forkId);

  // Initialize if empty
  const needsInit = sessionManager.isEmpty(session.id);
  if (needsInit) {
    const initialHistory = buildInitialHistory(
      contextMessages,
      recentHistory,
      protocol,
      {
        includeColdStartGuidance: true,
        commandProtocolSkillPath,
        hotStartReferencesMarkdown,
        startupMode,
        sessionHistoryPath: mirrorState.currentPath,
        parentSessionHistoryPath: mirrorState.currentParentPath,
      },
    );
    sessionManager.setHistory(session.id, initialHistory);
  }

  // Get active history
  const activeHistory = getActiveHistory(session.id, protocol);
  const synchronizedMirror = syncSessionHistoryMirror(
    session.id,
    vfsSession,
    forkId,
  );

  return {
    sessionId: session.id,
    sessionHistoryPath: synchronizedMirror.currentPath,
    parentSessionHistoryPath: synchronizedMirror.currentParentPath,
    sessionBindingKey: synchronizedMirror.bindToken,
    activeHistory,
  };
}

// ============================================================================
// History Management
// ============================================================================

/**
 * Build initial history from context messages and recent segments
 */
function buildInitialHistory(
  contextMessages: UnifiedMessage[],
  recentHistory: StorySegment[] | undefined,
  protocol: ProviderProtocol,
  options?: {
    includeColdStartGuidance?: boolean;
    commandProtocolSkillPath?: string;
    hotStartReferencesMarkdown?: string | null;
    startupMode?: SessionStartupMode;
    sessionHistoryPath?: string;
    parentSessionHistoryPath?: string | null;
  },
): unknown[] {
  let initialHistory: UnifiedMessage[] = [...contextMessages];

  if (options?.includeColdStartGuidance) {
    initialHistory = [
      ...initialHistory,
      buildColdStartSkillHintMessage({
        commandProtocolSkillPath: options.commandProtocolSkillPath,
        hotStartReferencesMarkdown: options.hotStartReferencesMarkdown,
        startupMode: options.startupMode,
        sessionHistoryPath: options.sessionHistoryPath,
        parentSessionHistoryPath: options.parentSessionHistoryPath,
      }),
    ];
  }

  if (recentHistory && recentHistory.length > 0) {
    console.log(`[SessionContext] Hydrating ${recentHistory.length} segments.`);
    const hydratedMessages =
      options?.startupMode === "turn"
        ? hydrateTurnSegmentsAsActionNarrationPairs(recentHistory)
        : hydrateSegments(recentHistory);
    initialHistory = [...initialHistory, ...hydratedMessages];
  }

  return protocol === "gemini"
    ? (toGeminiFormat(initialHistory) as unknown[])
    : (initialHistory as unknown[]);
}

const isNarrationRole = (
  role: StorySegment["role"],
): role is "model" | "system" => role === "model" || role === "system";

const isActionRole = (role: StorySegment["role"]): role is "user" | "command" =>
  role === "user" || role === "command";

const toHydratedActionText = (segment: StorySegment): string => {
  if (segment.role === "user") {
    return hasKnownUserMarker(segment.text)
      ? segment.text
      : `[PLAYER_ACTION] ${segment.text}`;
  }

  if (segment.role === "command") {
    return segment.text.startsWith("[SUDO]")
      ? segment.text
      : `[SUDO] ${segment.text}`;
  }

  return segment.text;
};

/**
 * Normalize turn history for new sessions into strict action+narration pairs:
 * ([PLAYER_ACTION] + assistant narrative) repeated.
 */
function hydrateTurnSegmentsAsActionNarrationPairs(
  segments: StorySegment[],
): UnifiedMessage[] {
  const pairedMessages: UnifiedMessage[] = [];

  let pendingAction: StorySegment | null = null;
  let narrationChunks: string[] = [];
  let droppedLeadingNarration = 0;
  let droppedDanglingActions = 0;

  const flushPair = () => {
    if (!pendingAction) return;

    if (narrationChunks.length === 0) {
      droppedDanglingActions += 1;
      pendingAction = null;
      return;
    }

    pairedMessages.push({
      role: "user",
      content: [{ type: "text", text: toHydratedActionText(pendingAction) }],
    });
    pairedMessages.push({
      role: "assistant",
      content: [{ type: "text", text: narrationChunks.join("\n\n") }],
    });

    pendingAction = null;
    narrationChunks = [];
  };

  for (const segment of segments) {
    if (isActionRole(segment.role)) {
      flushPair();
      pendingAction = segment;
      narrationChunks = [];
      continue;
    }

    if (isNarrationRole(segment.role)) {
      if (!pendingAction) {
        droppedLeadingNarration += 1;
        continue;
      }
      const text = segment.text.trim();
      if (text.length > 0) {
        narrationChunks.push(text);
      }
      continue;
    }
  }

  flushPair();

  if (droppedLeadingNarration > 0 || droppedDanglingActions > 0) {
    console.log(
      `[SessionContext] Turn hydration normalized history (dropped leading narration: ${droppedLeadingNarration}, dangling actions: ${droppedDanglingActions}).`,
    );
  }

  return pairedMessages;
}

/**
 * Convert story segments to unified messages
 */
function hydrateSegments(segments: StorySegment[]): UnifiedMessage[] {
  return segments.map((seg) => {
    let role: string = seg.role;

    if (role === "model" || role === "system") {
      role = "assistant";
    } else if (role === "command") {
      role = "user";
    }

    let prefix = "";
    if (seg.role === "user") {
      prefix = hasKnownUserMarker(seg.text) ? "" : "[PLAYER_ACTION] ";
    } else if (seg.role === "command") {
      prefix = seg.text.startsWith("[SUDO]") ? "" : "[SUDO] ";
    }

    return {
      role: role as "user" | "assistant" | "system",
      content: [{ type: "text" as const, text: `${prefix}${seg.text}` }],
    };
  });
}

/**
 * Get active history from session, sanitized
 */
function getActiveHistory(
  sessionId: string,
  protocol: ProviderProtocol,
): UnifiedMessage[] {
  const historyNative = sessionManager.getHistory(sessionId);

  let history: UnifiedMessage[] =
    protocol === "gemini"
      ? fromGeminiFormat(
          historyNative as Array<{
            role: string;
            parts: Array<{ text?: string }>;
          }>,
        )
      : (historyNative as UnifiedMessage[]);

  // Sanitize invalid roles
  history = history.map((msg) => {
    if ((msg.role as string) === "command") {
      return { ...msg, role: "user" };
    }
    return msg;
  });

  return history;
}

/**
 * Rollback to the latest stable turn anchor (checkpoint).
 * Returns refreshed history on success; otherwise null.
 */
export function rollbackToTurnAnchor(
  sessionId: string,
  protocol: ProviderProtocol,
  vfsSession: VfsSession,
): UnifiedMessage[] | null {
  sessionManager.rollbackToLastCheckpoint(sessionId);
  syncSessionHistoryMirror(sessionId, vfsSession);
  const rolledBack = rollbackVfsSessionToCheckpoint(sessionId, vfsSession);
  if (!rolledBack) {
    return null;
  }
  return getActiveHistory(sessionId, protocol);
}

/**
 * Detect and handle retry (regenerate) action
 */
export function handleRetryDetection(
  sessionId: string,
  activeHistory: UnifiedMessage[],
  userAction: string,
  protocol: ProviderProtocol,
  vfsSession: VfsSession,
): UnifiedMessage[] {
  if (activeHistory.length === 0) return activeHistory;

  // Find last user message
  let lastUserIndex = -1;
  for (let i = activeHistory.length - 1; i >= 0; i--) {
    if (activeHistory[i].role === "user") {
      lastUserIndex = i;
      break;
    }
  }

  if (lastUserIndex === -1) return activeHistory;

  const lastUserMsg = activeHistory[lastUserIndex];
  const lastUserText =
    lastUserMsg.content.find((p) => p.type === "text")?.text || "";

  const expectedMarkedAction = hasKnownUserMarker(userAction)
    ? userAction
    : `[PLAYER_ACTION] ${userAction}`;

  if (lastUserText === expectedMarkedAction) {
    console.log(
      `[SessionContext] Retry detected! Rolling back to last checkpoint.`,
    );
    const rolledBackHistory = rollbackToTurnAnchor(
      sessionId,
      protocol,
      vfsSession,
    );
    if (rolledBackHistory) {
      return rolledBackHistory;
    }
  }

  return activeHistory;
}

/**
 * Create checkpoint before new turn
 */
export function createCheckpoint(
  sessionId: string,
  vfsSession: VfsSession,
): void {
  sessionManager.checkpoint(sessionId);
  checkpointVfsSession(sessionId, vfsSession);
}

/**
 * Append new messages to session history
 */
export function appendToHistory(
  sessionId: string,
  newMessages: UnifiedMessage[],
  protocol: ProviderProtocol,
  vfsSession: VfsSession,
  forkId?: number,
): void {
  const messagesNative =
    protocol === "gemini"
      ? (toGeminiFormat(newMessages) as unknown[])
      : (newMessages as unknown[]);

  sessionManager.appendHistory(sessionId, messagesNative);
  syncSessionHistoryMirror(sessionId, vfsSession, forkId);
}
