/**
 * ============================================================================
 * Message Builder
 * ============================================================================
 */

import type { GameState } from "@/types";
import type { UnifiedMessage } from "@/services/messageTypes";
import { createUserMessage } from "@/services/messageTypes";
import type { VfsSession } from "@/services/vfs/vfsSession";
import type { TurnMessagesResult } from "./types";
import {
  buildWorldFoundation,
  buildProtagonist,
  buildGodModeContext,
} from "./worldContext";

function buildLatestSummaryContext(gameState: GameState): string {
  const summaries = (gameState as any).summaries as
    | Array<{
        id?: number | null;
        createdAt?: number | null;
        displayText?: string;
        visible?: {
          narrative?: string;
          majorEvents?: string[];
          characterDevelopment?: string;
          worldState?: string;
        };
        hidden?: {
          truthNarrative?: string;
          hiddenPlots?: string[];
          npcActions?: string[];
          worldTruth?: string;
          unrevealed?: string[];
        };
        nodeRange?: { fromIndex: number; toIndex: number };
        nextSessionReferencesMarkdown?: string | null;
      }>
    | undefined;

  if (!summaries || summaries.length === 0) return "";
  const latest = summaries[summaries.length - 1];
  if (!latest) return "";

  const lastSummarizedIndex =
    typeof (gameState as any).lastSummarizedIndex === "number"
      ? ((gameState as any).lastSummarizedIndex as number)
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
  const summaries = (gameState as any).summaries as
    | Array<{ nextSessionReferencesMarkdown?: string | null }>
    | undefined;
  if (!Array.isArray(summaries) || summaries.length === 0) {
    return "";
  }
  const latest = summaries[summaries.length - 1];
  const markdown = latest?.nextSessionReferencesMarkdown;
  if (typeof markdown !== "string" || markdown.trim().length === 0) {
    return "";
  }
  return markdown.trim();
}

export function buildInitialContext(
  gameState: GameState,
  vfsSession: VfsSession,
): UnifiedMessage[] {
  const messages: UnifiedMessage[] = [];

  const worldFoundation = buildWorldFoundation(vfsSession);
  const protagonist = buildProtagonist(vfsSession);

  const staticContext = [worldFoundation, protagonist]
    .filter(Boolean)
    .join("\n");

  if (staticContext) {
    messages.push(
      createUserMessage(`[CONTEXT: World Foundation]\n${staticContext}`),
    );
    messages.push({
      role: "assistant",
      content: [{ type: "text", text: "[World foundation acknowledged.]" }],
    });
  }

  const latestSummary = buildLatestSummaryContext(gameState);
  if (latestSummary) {
    messages.push(
      createUserMessage(`[CONTEXT: Story Summary]\n${latestSummary}`),
    );
    messages.push({
      role: "assistant",
      content: [{ type: "text", text: "[Story summary acknowledged.]" }],
    });
  }

  const hotStartReferences = buildHotStartReferencesContext(gameState);
  if (hotStartReferences) {
    messages.push(
      createUserMessage(
        `[CONTEXT: Hot Start References]\n${hotStartReferences}`,
      ),
    );
    messages.push({
      role: "assistant",
      content: [{ type: "text", text: "[Hot-start references acknowledged.]" }],
    });
  }

  if (gameState.godMode) {
    const godModeContext = buildGodModeContext(vfsSession);
    messages.push(createUserMessage(`[CONTEXT: God Mode]\n${godModeContext}`));
  }

  messages.push({
    role: "assistant",
    content: [
      {
        type: "text",
        text: "[Awaiting player action.]",
      },
    ],
  });

  return messages;
}

export function buildTurnMessages(
  gameState: GameState,
  userAction: string,
  vfsSession: VfsSession,
): TurnMessagesResult {
  const contextMessages = buildInitialContext(gameState, vfsSession);

  const markedAction = userAction.startsWith("[SUDO]")
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
