/**
 * ============================================================================
 * Message Builder
 * ============================================================================
 *
 * Builds UnifiedMessage arrays for the agentic loop.
 * Simplified for history-based session management.
 */

import type { GameState } from "@/types";
import type { UnifiedMessage } from "@/services/messageTypes";
import { createUserMessage } from "@/services/messageTypes";
import type { TurnMessagesResult } from "./types";
import {
  buildWorldFoundation,
  buildProtagonist,
  buildGodModeContext,
} from "./worldContext";
import {
  renderEntityContext,
  type EntityEntry,
  type NpcEntry,
} from "../../../../prompts/atoms/renderers";

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

/**
 * Build entity entries from game state for context injection
 */
function buildEntityEntries(gameState: GameState): {
  npcs: NpcEntry[];
  items: EntityEntry[];
  locations: EntityEntry[];
  quests: EntityEntry[];
  knowledge: EntityEntry[];
  factions: EntityEntry[];
  timeline: EntityEntry[];
  conditions: EntityEntry[];
} {
  return {
    // NPCs with dual-name support (visible.name + hidden.trueName)
    npcs: gameState.npcs.map((n) => ({
      id: n.id,
      name: n.visible.name,
      trueName: n.hidden?.trueName, // Include hidden true name if exists
    })),
    items: gameState.inventory.map((i) => ({
      id: i.id,
      name: i.name,
    })),
    locations: gameState.locations.map((l) => ({
      id: l.id,
      name: l.name, // Location has name at root level
    })),
    quests: gameState.quests.map((q) => ({
      id: q.id,
      name: q.title, // Quest has title at root level
    })),
    knowledge: gameState.knowledge.map((k) => ({
      id: k.id,
      name: k.title, // Knowledge has title at root level
    })),
    factions: gameState.factions.map((f) => ({
      id: f.id,
      name: f.name, // Faction has name at root level
    })),
    timeline: gameState.timeline.map((t) => ({
      id: t.id,
      name: t.name, // Timeline now has name field
    })),
    conditions:
      gameState.character.conditions?.map((c) => ({
        id: c.id,
        name: c.name,
      })) || [],
  };
}

/**
 * Build initial context messages for the agentic loop.
 * Returns messages in order: static context -> entity context -> dynamic context
 */
export function buildInitialContext(gameState: GameState): UnifiedMessage[] {
  const messages: UnifiedMessage[] = [];

  // === 1. World Foundation (Static) ===
  const worldFoundation = buildWorldFoundation(gameState);
  const protagonist = buildProtagonist(gameState);

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

  // === 2. Entity Context (Current Entities List) ===
  const entityEntries = buildEntityEntries(gameState);
  const hasEntities =
    entityEntries.npcs.length > 0 ||
    entityEntries.items.length > 0 ||
    entityEntries.locations.length > 0 ||
    entityEntries.quests.length > 0 ||
    entityEntries.knowledge.length > 0 ||
    entityEntries.factions.length > 0;

  if (hasEntities) {
    const entityContextMessage = renderEntityContext(entityEntries);
    messages.push(
      createUserMessage(`[CONTEXT: Current Entities]\n${entityContextMessage}`),
    );
    messages.push({
      role: "assistant",
      content: [{ type: "text", text: "[Entity context acknowledged.]" }],
    });
  }

  // === Summary Context (Latest) ===
  // After a summary/compaction, the story session is reset. The latest summary becomes
  // the primary narrative memory injected into the new session prefix.
  const latestSummary = buildLatestSummaryContext(gameState);
  if (latestSummary) {
    messages.push(createUserMessage(`[CONTEXT: Story Summary]\n${latestSummary}`));
    messages.push({
      role: "assistant",
      content: [{ type: "text", text: "[Story summary acknowledged.]" }],
    });
  }

  // === 3. Dynamic Context (God Mode) ===
  if (gameState.godMode) {
    const godModeContext = buildGodModeContext(gameState);
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

/**
 * Build turn messages for the agentic loop.
 * Simplified: returns context messages and user message separately.
 */
export function buildTurnMessages(
  gameState: GameState,
  userAction: string,
): TurnMessagesResult {
  const contextMessages = buildInitialContext(gameState);

  // Wrap user action with marker
  const markedAction = userAction.startsWith("[SUDO]")
    ? userAction
    : `[PLAYER_ACTION] ${userAction}`;

  const userMessage = createUserMessage(markedAction);

  // God mode context for logging
  const godModeContext = gameState.godMode
    ? `<god_mode>GOD MODE ACTIVE</god_mode>`
    : "";

  return {
    contextMessages,
    userMessage,
    godModeContext,
  };
}
