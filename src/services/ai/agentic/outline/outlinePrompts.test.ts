import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPhasePrompt } from "./outlinePrompts";

const promptsMock = vi.hoisted(() => ({
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
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(getPhasePrompt(0, "th", "en", "vfs_commit_outline_phase_0")).toBe("p0");
    expect(promptsMock.getOutlinePhase0Prompt).toHaveBeenCalledWith(
      "en",
      "vfs_commit_outline_phase_0",
    );

    expect(
      getPhasePrompt(
        1,
        "th",
        "zh",
        "vfs_commit_outline_phase_1",
        "ctx",
        true,
        "feat",
      ),
    ).toBe("p1");
    expect(promptsMock.getOutlinePhase1Prompt).toHaveBeenCalledWith(
      "th",
      "zh",
      "ctx",
      true,
      "feat",
      "vfs_commit_outline_phase_1",
    );

    expect(
      getPhasePrompt(
        2,
        "th",
        "en",
        "vfs_commit_outline_phase_2",
        "ctx2",
        false,
        "hero",
      ),
    ).toBe("p2");
    expect(promptsMock.getOutlinePhase2WorldFoundationPrompt).toHaveBeenCalledWith(
      "th",
      "en",
      "ctx2",
      false,
      "hero",
      "vfs_commit_outline_phase_2",
    );

    expect(
      getPhasePrompt(
        3,
        "th",
        "en",
        "vfs_commit_outline_phase_3",
        undefined,
        false,
        "hero",
      ),
    ).toBe("p3");
    expect(promptsMock.getOutlinePhase2Prompt).toHaveBeenCalledWith(
      "hero",
      "vfs_commit_outline_phase_3",
    );

    expect(getPhasePrompt(4, "th", "en", "vfs_commit_outline_phase_4")).toBe(
      "p4",
    );
    expect(promptsMock.getOutlinePhase3Prompt).toHaveBeenCalledWith(
      "vfs_commit_outline_phase_4",
    );

    expect(getPhasePrompt(5, "th", "en", "vfs_commit_outline_phase_5")).toBe(
      "p5",
    );
    expect(getPhasePrompt(6, "th", "en", "vfs_commit_outline_phase_6")).toBe(
      "p6",
    );
    expect(getPhasePrompt(7, "th", "en", "vfs_commit_outline_phase_7")).toBe(
      "p7",
    );
    expect(getPhasePrompt(8, "th", "en", "vfs_commit_outline_phase_8")).toBe(
      "p8",
    );

    expect(
      getPhasePrompt(
        9,
        "th",
        "en",
        "vfs_commit_outline_phase_9",
        undefined,
        true,
      ),
    ).toBe("p9");
    expect(promptsMock.getOutlinePhase9Prompt).toHaveBeenCalledWith(
      true,
      "vfs_commit_outline_phase_9",
    );
  });

  it("returns null for unknown phases", () => {
    expect(getPhasePrompt(99, "th", "en", "vfs_commit_outline_phase_99")).toBeNull();
  });
});
