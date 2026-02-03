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
