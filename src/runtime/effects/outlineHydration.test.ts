import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildOpeningNarrativeSegment,
  persistOutlineCheckpoint,
} from "./outlineHydration";

const seedVfsSessionFromOutlineMock = vi.hoisted(() => vi.fn());
const clearOutlineProgressMock = vi.hoisted(() => vi.fn());
const writeOutlineFileMock = vi.hoisted(() => vi.fn());
const writeConversationIndexMock = vi.hoisted(() => vi.fn());
const writeTurnFileMock = vi.hoisted(() => vi.fn());

vi.mock("../../services/vfs/seed", () => ({
  seedVfsSessionFromOutline: seedVfsSessionFromOutlineMock,
}));

vi.mock("../../services/vfs/outline", () => ({
  clearOutlineProgress: clearOutlineProgressMock,
  writeOutlineFile: writeOutlineFileMock,
}));

vi.mock("../../services/vfs/conversation", () => ({
  writeConversationIndex: writeConversationIndexMock,
  writeTurnFile: writeTurnFileMock,
}));

describe("outlineHydration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when openingNarrative is missing", () => {
    expect(() =>
      buildOpeningNarrativeSegment({
        outline: {},
        baseState: {} as any,
        theme: "fantasy",
        t: ((key: string) => key) as any,
      }),
    ).toThrow("Missing opening narrative from Phase 9");
  });

  it("persists outline checkpoint files and turn-0 metadata", async () => {
    const vfsSession = {
      writeFile: vi.fn(),
    } as any;
    const saveToSlot = vi.fn(async () => true);

    const outline = {
      openingNarrative: {
        narrative: "Opening scene",
        choices: [{ text: "Go" }],
        atmosphere: { envTheme: "fantasy", ambience: "quiet" },
      },
      initialTime: "Day 1",
      initialAtmosphere: { envTheme: "fantasy", ambience: "quiet" },
      locations: [{ id: "loc:start" }],
      narrativeScale: "regional",
    } as any;

    const themeConfig = {
      name: "Fantasy",
      narrativeStyle: "heroic",
      worldSetting: "kingdom",
      backgroundTemplate: "bg",
      example: "ex",
      isRestricted: false,
    } as any;

    const nextState = { id: "next" } as any;

    await persistOutlineCheckpoint({
      outline,
      themeConfig,
      theme: "fantasy",
      language: "en",
      customContext: "ctx",
      saveId: "slot-1",
      nextState,
      vfsSession,
      saveToSlot,
      seedImageId: "seed-1",
    });

    expect(seedVfsSessionFromOutlineMock).toHaveBeenCalledWith(
      vfsSession,
      outline,
      expect.objectContaining({
        theme: "fantasy",
        time: "Day 1",
        currentLocation: "loc:start",
        language: "en",
        customContext: "ctx",
        seedImageId: "seed-1",
        narrativeScale: "regional",
      }),
    );
    expect(vfsSession.writeFile).toHaveBeenCalledWith(
      "world/theme_config.json",
      JSON.stringify(themeConfig),
      "application/json",
    );
    expect(writeOutlineFileMock).toHaveBeenCalledWith(vfsSession, outline);
    expect(clearOutlineProgressMock).toHaveBeenCalledWith(vfsSession);
    expect(writeConversationIndexMock).toHaveBeenCalledWith(
      vfsSession,
      expect.objectContaining({
        activeForkId: 0,
        activeTurnId: "fork-0/turn-0",
      }),
    );
    expect(writeTurnFileMock).toHaveBeenCalledWith(
      vfsSession,
      0,
      0,
      expect.objectContaining({
        turnId: "fork-0/turn-0",
        assistant: expect.objectContaining({
          narrative: "Opening scene",
          choices: [{ text: "Go" }],
        }),
      }),
    );
    expect(saveToSlot).toHaveBeenCalledWith("slot-1", nextState);
  });
});
