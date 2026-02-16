import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPhasePrompt } from "./outlinePrompts";
import type { OutlinePhaseSharedContext } from "../../../prompts";

const promptsMock = vi.hoisted(() => ({
  getOutlinePhasePreludePrompt: vi.fn(),
  getOutlinePhase0Prompt: vi.fn(),
  getOutlinePhase1Prompt: vi.fn(),
  getOutlinePhase2WorldFoundationPrompt: vi.fn(),
  getOutlinePhase2Prompt: vi.fn(),
  getOutlinePhase3Prompt: vi.fn(),
  getOutlinePhase4Prompt: vi.fn(),
  getOutlinePhase5Prompt: vi.fn(),
  getOutlinePhase7Prompt: vi.fn(),
  getOutlinePhase8Prompt: vi.fn(),
  getOutlinePhase9Prompt: vi.fn(),
}));

vi.mock("../../../prompts/index", () => ({
  getOutlinePhasePreludePrompt: promptsMock.getOutlinePhasePreludePrompt,
  getOutlinePhase0Prompt: promptsMock.getOutlinePhase0Prompt,
  getOutlinePhase1Prompt: promptsMock.getOutlinePhase1Prompt,
  getOutlinePhase2WorldFoundationPrompt:
    promptsMock.getOutlinePhase2WorldFoundationPrompt,
  getOutlinePhase2Prompt: promptsMock.getOutlinePhase2Prompt,
  getOutlinePhase3Prompt: promptsMock.getOutlinePhase3Prompt,
  getOutlinePhase4Prompt: promptsMock.getOutlinePhase4Prompt,
  getOutlinePhase5Prompt: promptsMock.getOutlinePhase5Prompt,
  getOutlinePhase7Prompt: promptsMock.getOutlinePhase7Prompt,
  getOutlinePhase8Prompt: promptsMock.getOutlinePhase8Prompt,
  getOutlinePhase9Prompt: promptsMock.getOutlinePhase9Prompt,
}));

describe("outlinePrompts", () => {
  const sharedContext: OutlinePhaseSharedContext = {
    theme: "th",
    language: "en",
    customContext: "ctx",
    hasImageContext: true,
    protagonistFeature: "feat",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    promptsMock.getOutlinePhasePreludePrompt.mockReturnValue("prelude");
    promptsMock.getOutlinePhase0Prompt.mockReturnValue("p0");
    promptsMock.getOutlinePhase1Prompt.mockReturnValue("p1");
    promptsMock.getOutlinePhase2WorldFoundationPrompt.mockReturnValue("p2");
    promptsMock.getOutlinePhase2Prompt.mockReturnValue("p3");
    promptsMock.getOutlinePhase3Prompt.mockReturnValue("p4");
    promptsMock.getOutlinePhase4Prompt.mockReturnValue("p5");
    promptsMock.getOutlinePhase5Prompt.mockReturnValue("p6");
    promptsMock.getOutlinePhase7Prompt.mockReturnValue("p7");
    promptsMock.getOutlinePhase8Prompt.mockReturnValue("p8");
    promptsMock.getOutlinePhase9Prompt.mockReturnValue("p9");
  });

  it("routes each phase to corresponding prompt builder", () => {
    expect(getPhasePrompt(0, "vfs_finish_outline_phase_0", sharedContext)).toBe(
      "prelude\n\np0",
    );
    expect(promptsMock.getOutlinePhase0Prompt).toHaveBeenCalledWith(
      "en",
      "vfs_finish_outline_phase_0",
    );
    expect(promptsMock.getOutlinePhasePreludePrompt).toHaveBeenCalledWith(
      0,
      "vfs_finish_outline_phase_0",
      sharedContext,
    );

    expect(
      getPhasePrompt(1, "vfs_finish_outline_phase_0", {
        ...sharedContext,
        language: "zh",
      }),
    ).toBe("prelude\n\np1");
    expect(promptsMock.getOutlinePhase1Prompt).toHaveBeenCalledWith(
      "th",
      "zh",
      "ctx",
      true,
      "feat",
      "vfs_finish_outline_phase_0",
      {
        culturePreference: undefined,
        culturePreferenceSource: undefined,
        cultureEffectiveCircle: undefined,
        cultureSkillPath: undefined,
        cultureHubSkillPath: undefined,
        cultureNamingPolicy: undefined,
      },
    );

    expect(
      getPhasePrompt(2, "vfs_finish_outline_phase_0", {
        ...sharedContext,
        customContext: "ctx2",
        hasImageContext: false,
        protagonistFeature: "hero",
      }),
    ).toBe("prelude\n\np2");
    expect(
      promptsMock.getOutlinePhase2WorldFoundationPrompt,
    ).toHaveBeenCalledWith(
      "th",
      "en",
      "ctx2",
      false,
      "hero",
      "vfs_finish_outline_phase_0",
    );

    expect(
      getPhasePrompt(3, "vfs_finish_outline_phase_0", {
        ...sharedContext,
        customContext: undefined,
        hasImageContext: false,
        protagonistFeature: "hero",
      }),
    ).toBe("prelude\n\np3");
    expect(promptsMock.getOutlinePhase2Prompt).toHaveBeenCalledWith(
      "hero",
      "vfs_finish_outline_phase_0",
    );

    expect(getPhasePrompt(4, "vfs_finish_outline_phase_0", sharedContext)).toBe(
      "prelude\n\np4",
    );
    expect(promptsMock.getOutlinePhase3Prompt).toHaveBeenCalledWith(
      "vfs_finish_outline_phase_0",
    );

    expect(getPhasePrompt(5, "vfs_finish_outline_phase_0", sharedContext)).toBe(
      "prelude\n\np5",
    );
    expect(getPhasePrompt(6, "vfs_finish_outline_phase_0", sharedContext)).toBe(
      "prelude\n\np6",
    );
    expect(getPhasePrompt(7, "vfs_finish_outline_phase_0", sharedContext)).toBe(
      "prelude\n\np7",
    );
    expect(getPhasePrompt(8, "vfs_finish_outline_phase_0", sharedContext)).toBe(
      "prelude\n\np8",
    );

    expect(
      getPhasePrompt(9, "vfs_finish_outline_phase_0", {
        ...sharedContext,
        customContext: undefined,
      }),
    ).toBe("prelude\n\np9");
    expect(promptsMock.getOutlinePhase9Prompt).toHaveBeenCalledWith(
      true,
      "vfs_finish_outline_phase_0",
    );
  });

  it("returns null for unknown phases", () => {
    expect(
      getPhasePrompt(99, "vfs_finish_outline_phase_0", sharedContext),
    ).toBeNull();
    expect(promptsMock.getOutlinePhasePreludePrompt).not.toHaveBeenCalled();
  });

  it("returns null when shared context is missing", () => {
    expect(getPhasePrompt(0, "vfs_finish_outline_phase_0")).toBeNull();
    expect(promptsMock.getOutlinePhasePreludePrompt).not.toHaveBeenCalled();
  });
});
