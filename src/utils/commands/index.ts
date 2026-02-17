/**
 * Command System for ActionPanel
 * Supports /god, /unlock, /edit and other special commands
 */

import { GameState } from "../../types";
import type { RuntimeActions } from "../../runtime/state";

export interface CommandResult {
  handled: boolean;
  preventAction?: boolean; // If true, don't send to AI
  message?: string;
  action?: CommandAction;
}

export type CommandAction =
  | { type: "god_mode"; enable: boolean }
  | { type: "unlock_mode"; mode: "on" | "off" | "toggle"; enable: boolean }
  | { type: "open_editor" }
  | { type: "open_viewer" }
  | { type: "force_update"; prompt: string }
  | { type: "none" };

export interface CommandContext {
  gameState: GameState;
  runtimeActions: Pick<RuntimeActions, "toggleGodMode" | "setUnlockMode">;
  t: (key: string, values?: Record<string, string>) => string;
}

export interface CommandDefinition {
  cmd: string;
  desc: string;
}

type CommandHandler = (
  args: string[],
  context: CommandContext,
) => CommandResult;

interface InternalCommandDefinition extends CommandDefinition {
  handler: CommandHandler;
}

const COMMAND_DEFINITION_ENTRIES: InternalCommandDefinition[] = [
  { cmd: "/god", desc: "Toggle God Mode", handler: handleGodMode },
  { cmd: "/unlock", desc: "Toggle Unlock Mode", handler: handleUnlockMode },
  { cmd: "/edit", desc: "Edit State", handler: handleOpenEditor },
  { cmd: "/view", desc: "View State", handler: handleOpenViewer },
  { cmd: "/sudo", desc: "Force Update", handler: handleForceUpdate },
  { cmd: "/help", desc: "Show Help", handler: handleHelp },
];

export const COMMAND_DEFINITIONS: CommandDefinition[] =
  COMMAND_DEFINITION_ENTRIES.map(({ cmd, desc }) => ({ cmd, desc }));

const COMMANDS: Record<string, CommandHandler> = Object.fromEntries(
  COMMAND_DEFINITION_ENTRIES.map(({ cmd, handler }) => [cmd, handler]),
);

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
  void args;
  const { gameState, t } = context;
  const currentGodMode = gameState.godMode ?? false;
  const newGodMode = !currentGodMode;

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
 * /unlock - Toggle unlock mode (on|off|toggle)
 */
function handleUnlockMode(
  args: string[],
  context: CommandContext,
): CommandResult {
  const { t, gameState } = context;

  const isUnlockModeArg = (value: string): value is "on" | "off" | "toggle" =>
    value === "on" || value === "off" || value === "toggle";

  const modeArg = (args[0] || "toggle").toLowerCase();
  if (!isUnlockModeArg(modeArg)) {
    return {
      handled: true,
      preventAction: true,
      message:
        t("commands.unlock.invalidMode") || "Usage: /unlock [on|off|toggle]",
    };
  }

  const mode = modeArg;
  const currentUnlockMode = gameState.unlockMode ?? false;
  const enable =
    mode === "on" ? true : mode === "off" ? false : !currentUnlockMode;

  const summary = enable
    ? t("commands.unlock.enableSummary") ||
      "Unlock Mode ON: hidden information can be displayed in views."
    : t("commands.unlock.disableSummary") ||
      "Unlock Mode OFF: hidden information follows normal reveal rules.";

  const confirmMessage =
    t("commands.unlock.confirm") ||
    `⚠️ UNLOCK MODE ⚠️\n\nRequested mode: ${mode}\nResult: ${enable ? "ON" : "OFF"}\n\n${summary}\n\nContinue?`;

  return {
    handled: true,
    preventAction: true,
    action: { type: "unlock_mode", mode, enable },
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
  void args;
  void context;
  return {
    handled: true,
    preventAction: true,
    action: { type: "open_editor" },
  };
}

/**
 * /view - Open Game State Viewer
 */
function handleOpenViewer(
  args: string[],
  context: CommandContext,
): CommandResult {
  void args;
  void context;
  return {
    handled: true,
    preventAction: true,
    action: { type: "open_viewer" },
  };
}

/**
 * /sudo - Force World Update
 */
function handleForceUpdate(
  args: string[],
  context: CommandContext,
): CommandResult {
  const { t } = context;
  const prompt = args.join(" ");

  if (!prompt) {
    return {
      handled: true,
      preventAction: true,
      message: t("commands.sudo.missingPrompt") || "Usage: /sudo <instruction>",
    };
  }

  const confirmMessage =
    t("commands.sudo.confirm", { prompt }) ||
    `⚠️ FORCE UPDATE ⚠️\n\nYou are about to force the following change:\n"${prompt}"\n\nThis will bypass standard game logic and consistency checks.\n\nAre you sure?`;

  return {
    handled: true,
    preventAction: true,
    action: { type: "force_update", prompt },
    message: confirmMessage,
  };
}

/**
 * /help - Show available commands
 */
function handleHelp(args: string[], context: CommandContext): CommandResult {
  void args;
  const { t } = context;

  const fallbackHelpText = [
    "Available Commands:",
    ...COMMAND_DEFINITIONS.map(({ cmd, desc }) => {
      if (cmd === "/sudo") {
        return `${cmd} <prompt> - ${desc}`;
      }
      return `${cmd} - ${desc}`;
    }),
  ].join("\n");

  const translatedHelp = t("commands.help");
  const helpText = translatedHelp || fallbackHelpText;

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
  runtimeActions: Pick<RuntimeActions, "toggleGodMode" | "setUnlockMode">,
): void {
  void gameState;
  switch (action.type) {
    case "god_mode":
      runtimeActions.toggleGodMode(action.enable, {
        reason: "command.god_mode",
        persist: true,
      });
      break;

    case "unlock_mode":
      runtimeActions.setUnlockMode(action.enable, {
        reason: `command.unlock_mode.${action.mode}`,
        persist: true,
      });
      break;

    case "open_editor":
    case "open_viewer":
    case "force_update":
      break;

    case "none":
      break;
  }
}
