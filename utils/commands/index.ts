/**
 * Command System for ActionPanel
 * Supports /god, /unlock, /edit and other special commands
 */

import { GameState } from "../../types";

export interface CommandResult {
  handled: boolean;
  preventAction?: boolean; // If true, don't send to AI
  message?: string;
  action?: CommandAction;
}

export type CommandAction =
  | { type: "god_mode"; enable: boolean }
  | { type: "unlock_all" }
  | { type: "open_editor" }
  | { type: "open_rag" }
  | { type: "none" };

export interface CommandContext {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  t: (key: string) => string;
}

// Available commands
const COMMANDS: Record<string, CommandHandler> = {
  "/god": handleGodMode,
  "/unlock": handleUnlockAll,
  "/edit": handleOpenEditor,
  "/rag": handleOpenRAG,
  "/help": handleHelp,
};

type CommandHandler = (
  args: string[],
  context: CommandContext,
) => CommandResult;

/**
 * Parse and execute a command if the input starts with /
 */
export function parseCommand(
  input: string,
  context: CommandContext,
): CommandResult {
  const trimmed = input.trim();

  if (!trimmed.startsWith("/")) {
    return { handled: false };
  }

  const parts = trimmed.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  const handler = COMMANDS[command];
  if (!handler) {
    return {
      handled: true,
      preventAction: true,
      message: `Unknown command: ${command}. Type /help for available commands.`,
    };
  }

  return handler(args, context);
}

/**
 * /god - Toggle God Mode
 */
function handleGodMode(args: string[], context: CommandContext): CommandResult {
  const { gameState, t } = context;
  const currentGodMode = gameState.godMode ?? false;
  const newGodMode = !currentGodMode;

  // Require confirmation via alert
  const confirmMessage = newGodMode
    ? t("commands.godMode.confirmEnable") ||
      "⚠️ GOD MODE ⚠️\n\nThis will enable God Mode where:\n• All your actions succeed\n• All NPCs believe you unconditionally\n• You can change world rules and logic\n\nThis may significantly impact game balance.\n\nAre you sure you want to enable God Mode?"
    : t("commands.godMode.confirmDisable") ||
      "Disable God Mode and return to normal gameplay?";

  return {
    handled: true,
    preventAction: true,
    action: { type: "god_mode", enable: newGodMode },
    message: confirmMessage,
  };
}

/**
 * /unlock - Unlock all hidden information
 */
function handleUnlockAll(
  args: string[],
  context: CommandContext,
): CommandResult {
  const { t } = context;

  const confirmMessage =
    t("commands.unlock.confirm") ||
    "⚠️ UNLOCK ALL ⚠️\n\nThis will reveal ALL hidden information:\n• Item secrets and true nature\n• NPC true personalities and motives\n• Location hidden features\n• Quest true objectives\n• Knowledge hidden truths\n\nThis cannot be undone and may spoil the story.\n\nAre you sure?";

  return {
    handled: true,
    preventAction: true,
    action: { type: "unlock_all" },
    message: confirmMessage,
  };
}

/**
 * /edit - Open GameState Editor
 */
function handleOpenEditor(
  args: string[],
  context: CommandContext,
): CommandResult {
  return {
    handled: true,
    preventAction: true,
    action: { type: "open_editor" },
  };

}

/**
 * /rag - Open RAG Debugger
 */
function handleOpenRAG(
  args: string[],
  context: CommandContext,
): CommandResult {
  return {
    handled: true,
    preventAction: true,
    action: { type: "open_rag" },
  };
}

/**
 * /help - Show available commands
 */
function handleHelp(args: string[], context: CommandContext): CommandResult {
  const { t } = context;

  const helpText =
    t("commands.help") ||
    `Available Commands:
/god - Toggle God Mode (all actions succeed, NPCs obey)
/unlock - Reveal all hidden information
/edit - Open GameState editor
/rag - Open RAG Debugger
/help - Show this help message`;

  return {
    handled: true,
    preventAction: true,
    message: helpText,
  };
}

/**
 * Execute a confirmed command action
 */
export function executeCommandAction(
  action: CommandAction,
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
): void {
  switch (action.type) {
    case "god_mode":
      setGameState((prev) => ({
        ...prev,
        godMode: action.enable,
      }));
      break;

    case "unlock_all":
      setGameState((prev) => {
        // Deep clone and unlock everything
        const newState = { ...prev };

        // Unlock inventory items
        newState.inventory = prev.inventory.map((item) => ({
          ...item,
          unlocked: true,
          highlight: true,
        }));

        // Unlock relationships
        newState.relationships = prev.relationships.map((rel) => ({
          ...rel,
          unlocked: true,
          highlight: true,
        }));

        // Unlock locations
        newState.locations = prev.locations.map((loc) => ({
          ...loc,
          unlocked: true,
          highlight: true,
        }));

        // Unlock quests
        newState.quests = prev.quests.map((quest) => ({
          ...quest,
          unlocked: true,
          highlight: true,
        }));

        // Unlock knowledge
        newState.knowledge = prev.knowledge.map((k) => ({
          ...k,
          unlocked: true,
          highlight: true,
        }));

        // Unlock factions
        newState.factions = prev.factions.map((f) => ({
          ...f,
          unlocked: true,
          highlight: true,
        }));

        // Unlock character hidden traits
        if (newState.character?.hiddenTraits) {
          newState.character = {
            ...prev.character!,
            hiddenTraits: prev.character!.hiddenTraits?.map((t) => ({
              ...t,
              unlocked: true,
            })),
          };
        }

        // Mark unlock mode in state
        newState.unlockMode = true;

        return newState;
      });
      break;

    case "open_editor":
    case "open_rag":
      // This is handled by the UI component
      break;

    case "none":
      break;
  }
}
