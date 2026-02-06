import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGodModeContext,
  buildProtagonist,
  buildWorldFoundation,
} from "../worldContext";

const renderersMock = vi.hoisted(() => ({
  renderWorldFoundation: vi.fn(),
  renderGodMode: vi.fn(),
  renderCharacterFull: vi.fn(),
}));

vi.mock("../../../../../prompts/atoms/renderers", () => ({
  renderWorldFoundation: renderersMock.renderWorldFoundation,
  renderGodMode: renderersMock.renderGodMode,
  renderCharacterFull: renderersMock.renderCharacterFull,
}));

describe("worldContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    renderersMock.renderWorldFoundation.mockReturnValue("<world-foundation />");
    renderersMock.renderCharacterFull.mockReturnValue("<protagonist />");
    renderersMock.renderGodMode.mockReturnValue("<god-mode />");
  });

  it("builds world foundation with outline passthrough", () => {
    const gameState = {
      outline: { title: "Demo", premise: "test" },
    } as any;

    const value = buildWorldFoundation(gameState);

    expect(renderersMock.renderWorldFoundation).toHaveBeenCalledWith({
      outline: gameState.outline,
    });
    expect(value).toBe("<world-foundation />");
  });

  it("builds protagonist block only when character exists", () => {
    const withCharacter = {
      character: { name: "Hero", title: "Scout" },
    } as any;

    const withValue = buildProtagonist(withCharacter);
    expect(renderersMock.renderCharacterFull).toHaveBeenCalledWith({
      character: withCharacter.character,
    });
    expect(withValue).toBe("<protagonist />");

    const withoutCharacter = { character: null } as any;
    const emptyValue = buildProtagonist(withoutCharacter);
    expect(emptyValue).toBe("");
    expect(renderersMock.renderCharacterFull).toHaveBeenCalledTimes(1);
  });

  it("builds god mode context using game state flag", () => {
    const gameState = { godMode: true } as any;

    const value = buildGodModeContext(gameState);

    expect(renderersMock.renderGodMode).toHaveBeenCalledWith({ godMode: true });
    expect(value).toBe("<god-mode />");
  });
});
