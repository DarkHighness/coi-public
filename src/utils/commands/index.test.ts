import { describe, expect, it, vi } from "vitest";
import {
  COMMAND_DEFINITIONS,
  executeCommandAction,
  parseCommand,
  type CommandContext,
} from "./index";

function createContext(
  overrides: Partial<CommandContext> = {},
): CommandContext {
  return {
    gameState: {
      godMode: false,
    } as any,
    runtimeActions: {
      toggleGodMode: vi.fn(),
      setUnlockMode: vi.fn(),
    },
    t: () => "",
    ...overrides,
  };
}

describe("commands", () => {
  it("exports help in unified command definitions", () => {
    expect(COMMAND_DEFINITIONS.some((def) => def.cmd === "/help")).toBe(true);
  });

  it("returns unknown-command error for unsupported slash command", () => {
    const result = parseCommand("/unknown", createContext());

    expect(result).toEqual({
      handled: true,
      preventAction: true,
      message: "Unknown command: /unknown. Type /help for available commands.",
    });
  });

  it("returns usage message when /sudo prompt is missing", () => {
    const result = parseCommand("/sudo", createContext());

    expect(result.handled).toBe(true);
    expect(result.preventAction).toBe(true);
    expect(result.message).toBe("Usage: /sudo <instruction>");
  });

  it("returns fallback /help text built from command definitions", () => {
    const result = parseCommand("/help", createContext());

    expect(result.handled).toBe(true);
    expect(result.preventAction).toBe(true);
    expect(result.message).toContain("Available Commands:");
    expect(result.message).toContain("/help - Show Help");
    expect(result.message).toContain("/sudo <prompt> - Force Update");
  });

  it("parses open commands and confirm-required commands", () => {
    const context = createContext();

    const openEditor = parseCommand("/edit", context);
    expect(openEditor).toMatchObject({
      handled: true,
      preventAction: true,
      action: { type: "open_editor" },
    });

    const removedRag = parseCommand("/rag", context);
    expect(removedRag).toEqual({
      handled: true,
      preventAction: true,
      message: "Unknown command: /rag. Type /help for available commands.",
    });

    const confirmGod = parseCommand("/god", context);
    expect(confirmGod.action).toMatchObject({ type: "god_mode" });
    expect(typeof confirmGod.message).toBe("string");
    expect(confirmGod.preventAction).toBe(true);

    const unlockOn = parseCommand("/unlock on", context);
    expect(unlockOn.action).toMatchObject({
      type: "unlock_mode",
      mode: "on",
      enable: true,
    });

    const unlockOff = parseCommand(
      "/unlock off",
      createContext({ gameState: { unlockMode: true } as any }),
    );
    expect(unlockOff.action).toMatchObject({
      type: "unlock_mode",
      mode: "off",
      enable: false,
    });

    const unlockToggle = parseCommand(
      "/unlock toggle",
      createContext({ gameState: { unlockMode: false } as any }),
    );
    expect(unlockToggle.action).toMatchObject({
      type: "unlock_mode",
      mode: "toggle",
      enable: true,
    });

    const unlockBad = parseCommand("/unlock nope", context);
    expect(unlockBad.message).toContain("Usage: /unlock [on|off|toggle]");
  });

  it("executes unlock mode action via runtime setUnlockMode", () => {
    const runtimeActions = {
      toggleGodMode: vi.fn(),
      setUnlockMode: vi.fn(),
    };

    executeCommandAction(
      { type: "unlock_mode", mode: "on", enable: true },
      {} as any,
      runtimeActions as any,
    );

    expect(runtimeActions.setUnlockMode).toHaveBeenCalledWith(true, {
      reason: "command.unlock_mode.on",
      persist: true,
    });
  });
});
