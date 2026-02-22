/**
 * ============================================================================
 * Message Builder
 * ============================================================================
 */

import type { GameState } from "@/types";
import type { UnifiedMessage } from "@/services/messageTypes";
import { createUserMessage } from "@/services/messageTypes";
import type { VfsSession } from "@/services/vfs/vfsSession";
import {
  WORKSPACE_MEMORY_DOC_ORDER,
  getWorkspaceMemoryLogicalPath,
  readWorkspaceMemoryDoc,
} from "@/services/vfs/memoryTemplates";
import { getLatestSummaryReferencesMarkdown } from "@/services/ai/agentic/startup";
import type { TurnMessagesResult } from "./types";
import {
  buildWorldFoundation,
  buildProtagonist,
  buildGodModeContext,
} from "./worldContext";

const hasKnownUserMarker = (text: string): boolean =>
  text.startsWith("[PLAYER_ACTION]") ||
  text.startsWith("[SUDO]") ||
  text.startsWith("[Player Rate]");

const buildWorkspaceMemoryFileBlock = (
  vfsSession: VfsSession,
  doc: (typeof WORKSPACE_MEMORY_DOC_ORDER)[number],
): string => {
  const path = getWorkspaceMemoryLogicalPath(doc);
  const content = readWorkspaceMemoryDoc(vfsSession, doc);
  return `<file path="${path}">\n${content}\n</file>`;
};

const buildDelimitedSection = (name: string, body: string): string =>
  [`[SECTION BEGIN: ${name}]`, body.trim(), `[SECTION END: ${name}]`].join(
    "\n",
  );

function buildLatestSummaryContext(gameState: GameState): string {
  const summaries = gameState.summaries;
  if (!summaries || summaries.length === 0) return "";
  const latest = summaries[summaries.length - 1];
  if (!latest) return "";

  const lastSummarizedIndex =
    typeof gameState.lastSummarizedIndex === "number"
      ? gameState.lastSummarizedIndex
      : null;

  const escape = (value: unknown): string =>
    typeof value === "string"
      ? value.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim()
      : "";

  const json = (value: unknown): string => {
    try {
      return JSON.stringify(value ?? null);
    } catch {
      return "null";
    }
  };

  return `<latest_summary>
  <id>${escape(String(latest.id ?? ""))}</id>
  <created_at>${escape(String(latest.createdAt ?? ""))}</created_at>
  <display_text>${escape(latest.displayText)}</display_text>
  <visible>
    <narrative>${escape(latest.visible?.narrative)}</narrative>
    <major_events>${escape(json(latest.visible?.majorEvents ?? []))}</major_events>
    <character_development>${escape(latest.visible?.characterDevelopment)}</character_development>
    <world_state>${escape(latest.visible?.worldState)}</world_state>
  </visible>
  <hidden>
    <truth_narrative>${escape(latest.hidden?.truthNarrative)}</truth_narrative>
    <hidden_plots>${escape(json(latest.hidden?.hiddenPlots ?? []))}</hidden_plots>
    <npc_actions>${escape(json(latest.hidden?.npcActions ?? []))}</npc_actions>
    <world_truth>${escape(latest.hidden?.worldTruth)}</world_truth>
    <unrevealed>${escape(json(latest.hidden?.unrevealed ?? []))}</unrevealed>
  </hidden>
  <node_range>${escape(json(latest.nodeRange ?? null))}</node_range>
  <last_summarized_index>${escape(String(lastSummarizedIndex ?? ""))}</last_summarized_index>
</latest_summary>`;
}

function buildHotStartReferencesContext(gameState: GameState): string {
  return getLatestSummaryReferencesMarkdown(gameState) ?? "";
}

export function buildInitialContext(
  gameState: GameState,
  vfsSession: VfsSession,
): UnifiedMessage[] {
  const sections: string[] = [];
  const memoryBlocks = WORKSPACE_MEMORY_DOC_ORDER.map((doc) =>
    buildWorkspaceMemoryFileBlock(vfsSession, doc),
  );
  if (memoryBlocks.length > 0) {
    sections.push(
      buildDelimitedSection(
        "WORKSPACE_MEMORY_FILES",
        memoryBlocks.join("\n\n"),
      ),
    );
  }

  // Mark injected workspace files as "seen" so read-before-write gates
  // don't require redundant vfs_read_* calls for files already in context.
  vfsSession.noteToolSeenMany(
    WORKSPACE_MEMORY_DOC_ORDER.map((doc) => getWorkspaceMemoryLogicalPath(doc)),
  );

  const worldFoundation = buildWorldFoundation(vfsSession);
  const protagonist = buildProtagonist(vfsSession);

  const staticContext = [worldFoundation, protagonist]
    .filter(Boolean)
    .join("\n");

  if (staticContext) {
    sections.push(
      buildDelimitedSection(
        "WORLD_FOUNDATION",
        ["[CONTEXT: World Foundation]", staticContext].join("\n"),
      ),
    );
  }

  const latestSummary = buildLatestSummaryContext(gameState);
  if (latestSummary) {
    sections.push(
      buildDelimitedSection(
        "STORY_SUMMARY",
        `[CONTEXT: Story Summary]\n${latestSummary}`,
      ),
    );
  }

  const hotStartReferences = buildHotStartReferencesContext(gameState);
  if (hotStartReferences) {
    sections.push(
      buildDelimitedSection(
        "HOT_START_REFERENCES",
        `[CONTEXT: Hot Start References]\n${hotStartReferences}`,
      ),
    );
  }

  if (gameState.godMode) {
    const godModeContext = buildGodModeContext(vfsSession);
    sections.push(
      buildDelimitedSection(
        "GOD_MODE",
        `[CONTEXT: God Mode]\n${godModeContext}`,
      ),
    );
  }

  sections.push(
    buildDelimitedSection("TURN_HANDSHAKE", "[Awaiting player action.]"),
  );

  return [
    createUserMessage(
      [
        "[SYSTEM BUNDLE BEGIN: SESSION_INITIAL_CONTEXT]",
        ...sections,
        "[SYSTEM BUNDLE END: SESSION_INITIAL_CONTEXT]",
      ].join("\n\n"),
    ),
  ];
}

export function buildTurnMessages(
  gameState: GameState,
  userAction: string,
  vfsSession: VfsSession,
): TurnMessagesResult {
  const contextMessages = buildInitialContext(gameState, vfsSession);

  const markedAction = hasKnownUserMarker(userAction)
    ? userAction
    : `[PLAYER_ACTION] ${userAction}`;

  const userMessage = createUserMessage(markedAction);

  const godModeContext = gameState.godMode
    ? `<god_mode>GOD MODE ACTIVE</god_mode>`
    : "";

  return {
    contextMessages,
    userMessage,
    godModeContext,
  };
}
