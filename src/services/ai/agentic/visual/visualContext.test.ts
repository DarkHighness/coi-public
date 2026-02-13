import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildVisualContextMessages,
  buildVisualInitialContext,
  getVisualSystemInstruction,
} from "./visualContext";

const culturalMock = vi.hoisted(() => ({
  languageEnforcement: vi.fn(),
}));

vi.mock("@/services/prompts/atoms/cultural", () => ({
  languageEnforcement: culturalMock.languageEnforcement,
}));

const createGameState = (overrides: Record<string, unknown> = {}) =>
  ({
    theme: "fantasy",
    currentLocation: "Old Ruins",
    time: "Night",
    atmosphere: {
      envTheme: "dark-fantasy",
      ambience: "mist",
      weather: "rain",
    },
    character: {
      name: "Luna",
      appearance: "silver hair",
    },
    npcs: [
      {
        id: "npc:1",
        visible: { name: "Aria", appearance: "red cloak" },
      },
      {
        id: "npc:2",
        visible: { name: "Borin", appearance: "armor" },
      },
    ],
    ...overrides,
  }) as any;

describe("visualContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    culturalMock.languageEnforcement.mockReturnValue(
      "<language_enforcement />",
    );
  });

  it("builds system instruction per target and language", () => {
    const image = getVisualSystemInstruction("en", "image_prompt");
    expect(image).toContain("detailed image prompt for a static scene");
    expect(image).toContain("Output in en");
    expect(image).toContain("<language_enforcement />");

    const veo = getVisualSystemInstruction("zh", "veo_script");
    expect(veo).toContain("cinematic video script (VEO script)");

    const both = getVisualSystemInstruction("ja", "both");
    expect(both).toContain(
      "both a detailed image prompt and a cinematic video script",
    );
  });

  it("builds initial context with protagonist and mentioned NPCs", () => {
    const gameState = createGameState();
    const segment = {
      text: "Aria appears in the rain and guides the hero forward.",
    } as any;

    const context = buildVisualInitialContext(gameState, segment);

    expect(context).toContain("<current_narrative>");
    expect(context).toContain("<theme>fantasy</theme>");
    expect(context).toContain("<weather>rain</weather>");
    expect(context).toContain("<protagonist>");
    expect(context).toContain("<name>Aria</name>");
    expect(context).not.toContain("<name>Borin</name>");
  });

  it("uses clear weather fallback and omits protagonist when missing", () => {
    const gameState = createGameState({
      atmosphere: {
        envTheme: "forest",
        ambience: "silent",
      },
      character: null,
    });
    const segment = { text: "No one is visible." } as any;

    const context = buildVisualInitialContext(gameState, segment);

    expect(context).toContain("<weather>Clear</weather>");
    expect(context).not.toContain("<protagonist>");
  });

  it("creates one user context message with task prefix", () => {
    const messages = buildVisualContextMessages(createGameState(), {
      text: "Aria enters.",
    } as any);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.role).toBe("user");
    expect(messages[0]?.content?.[0]).toMatchObject({
      type: "text",
    });
    const text = (messages[0]?.content?.[0] as any)?.text ?? "";
    expect(text).toContain("[CONTEXT: Visual Generation Task]");
    expect(text).toContain("<current_narrative>");
  });
});
