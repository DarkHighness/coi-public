import { describe, expect, it, vi } from "vitest";
import type { TFunction } from "i18next";
import {
  createGamePageTutorialFlow,
  createStartScreenTutorialFlow,
} from "./tutorialFlows";

const makeT = (): TFunction =>
  ((key: string, defaultValue?: string) => defaultValue ?? key) as TFunction;

describe("tutorialFlows", () => {
  it("builds start screen flow with stable step order and targets", () => {
    const callbacks = {
      openSettings: vi.fn(),
      hasValidProvider: vi.fn(() => true),
      hasValidModel: vi.fn(() => true),
    };

    const flow = createStartScreenTutorialFlow(makeT(), callbacks);

    expect(flow.id).toBe("startScreen");
    expect(flow.steps.map((step) => step.id)).toEqual([
      "welcome",
      "open-settings",
      "add-provider",
      "complete-provider-modal",
      "models-tab",
      "select-model",
      "close-settings",
      "choose-theme",
    ]);
    expect(flow.steps.map((step) => step.targetId ?? null)).toEqual([
      null,
      "settings-button",
      "add-provider-button",
      "provider-template-modal",
      "models-tab-button",
      "settings-modal-content",
      "settings-close-button",
      "start-adventure-button",
    ]);
    expect(flow.steps.every((step) => step.canSkip)).toBe(true);

    expect(callbacks.openSettings).not.toHaveBeenCalled();
    expect(callbacks.hasValidProvider).not.toHaveBeenCalled();
    expect(callbacks.hasValidModel).not.toHaveBeenCalled();
  });

  it("builds game page flow with stable ids and anchor targets", () => {
    const flow = createGamePageTutorialFlow(makeT());

    expect(flow.id).toBe("gamePage");
    expect(flow.steps.map((step) => step.id)).toEqual([
      "story-feed",
      "sidebar",
      "timeline",
      "action-input",
      "menu",
    ]);
    expect(flow.steps.map((step) => step.targetId)).toEqual([
      "story-feed-area",
      "left-sidebar",
      "right-timeline",
      "action-input-area",
      "game-menu-button",
    ]);
    expect(flow.steps.map((step) => step.position)).toEqual([
      "right",
      "right",
      "left",
      "top",
      "bottom",
    ]);
  });
});
