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
import type { VfsSession } from "@/services/vfs/vfsSession";
import { writeSessionHistoryJsonl } from "@/services/vfs/conversation";
import {
  checkpointVfsSession,
  rollbackVfsSessionToCheckpoint,
} from "@/services/vfs/runtimeCheckpoints";

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
}

export interface SessionSetupResult {
  sessionId: string;
  activeHistory: UnifiedMessage[];
}

const buildColdStartSkillHintMessage = (): UnifiedMessage =>
  createUserMessage(
    [
      "[SYSTEM: COLD_START_SOFT_GUIDANCE]",
      "Hard gate (enforced): before first non-read tool call this turn, read:",
      "- `current/skills/commands/runtime/SKILL.md`",
      "- `current/skills/commands/runtime/turn/SKILL.md`",
      "Optional deepening when needed:",
      "- `current/skills/core/protocols/SKILL.md`",
      "- `current/skills/craft/writing/SKILL.md`",
      "- `current/skills/index.json` (discover relevant skills first)",
      "If prior context is needed, query `current/conversation/session.jsonl` with lines/search windows.",
      "Avoid full-file reads of `session.jsonl` in one shot.",
    ].join("\n"),
  );

const syncSessionHistoryMirror = (
  sessionId: string,
  vfsSession: VfsSession,
  forkId?: number,
): void => {
  if (typeof forkId === "number" && Number.isFinite(forkId) && forkId >= 0) {
    vfsSession.setActiveForkId(Math.floor(forkId));
  }
  const nativeHistory = sessionManager.getHistory(sessionId);
  writeSessionHistoryJsonl(vfsSession, nativeHistory, {
    operation: "finish_commit",
  });
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

  // Initialize if empty
  const needsInit = sessionManager.isEmpty(session.id);
  if (needsInit) {
    const initialHistory = buildInitialHistory(
      contextMessages,
      recentHistory,
      protocol,
      { includeColdStartGuidance: true },
    );
    sessionManager.setHistory(session.id, initialHistory);
  }

  // Get active history
  const activeHistory = getActiveHistory(session.id, protocol);
  syncSessionHistoryMirror(session.id, vfsSession, forkId);

  return {
    sessionId: session.id,
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
  options?: { includeColdStartGuidance?: boolean },
): unknown[] {
  let initialHistory: UnifiedMessage[] = [...contextMessages];

  if (options?.includeColdStartGuidance) {
    initialHistory = [...initialHistory, buildColdStartSkillHintMessage()];
  }

  if (recentHistory && recentHistory.length > 0) {
    console.log(`[SessionContext] Hydrating ${recentHistory.length} segments.`);
    const hydratedMessages = hydrateSegments(recentHistory);
    initialHistory = [...initialHistory, ...hydratedMessages];
  }

  return protocol === "gemini"
    ? (toGeminiFormat(initialHistory) as unknown[])
    : (initialHistory as unknown[]);
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
      prefix = seg.text.startsWith("[PLAYER_ACTION]") ? "" : "[PLAYER_ACTION] ";
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

  const expectedMarkedAction = userAction.startsWith("[SUDO]")
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
