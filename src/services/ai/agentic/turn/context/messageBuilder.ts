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
  buildRagContextBlock,
} from "./worldContext";

/**
 * Build initial context messages for the agentic loop.
 * Returns messages in order: static context -> RAG context -> dynamic context
 */
export function buildInitialContext(
  gameState: GameState,
  ragContext?: string,
): UnifiedMessage[] {
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

  // === 2. RAG Context (Semi-dynamic) ===
  const ragBlock = buildRagContextBlock(ragContext);
  if (ragBlock) {
    messages.push(createUserMessage(`[CONTEXT: Relevant Lore]\n${ragBlock}`));
    messages.push({
      role: "assistant",
      content: [{ type: "text", text: "[Lore context acknowledged.]" }],
    });
  }

  // === 3. Dynamic Context (God Mode, Current Situation) ===
  const godModeContext = buildGodModeContext(gameState);
  messages.push(
    createUserMessage(`[CONTEXT: Current Situation]\n${godModeContext}`),
  );
  messages.push({
    role: "assistant",
    content: [
      {
        type: "text",
        text: "[Current situation acknowledged. Awaiting player action.]",
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
  ragContext?: string,
): TurnMessagesResult {
  const contextMessages = buildInitialContext(gameState, ragContext);

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
