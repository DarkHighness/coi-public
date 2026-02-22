// @vitest-environment jsdom

import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StoryText } from "./StoryText";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../../hooks/useSettings", () => ({
  useSettings: () => ({
    themeMode: "day",
  }),
}));

vi.mock("../../hooks/useStoryAudio", () => ({
  useStoryAudio: () => ({
    isPlaying: false,
    isLoadingAudio: false,
    playAudio: vi.fn(),
  }),
}));

describe("StoryText", () => {
  const baseSettings = {
    audioVolume: {
      ttsVolume: 1,
      ttsMuted: false,
    },
    typewriterSpeed: 10,
  } as any;

  it("sets story font scale css variable for levels 1, 3, and 5", () => {
    const { container, rerender } = render(
      React.createElement(StoryText, {
        text: "Hello",
        isLast: false,
        aiSettings: {
          ...baseSettings,
          storyFontScaleLevel: 1,
        },
      }),
    );

    let storyTextRoot = container.querySelector(".story-main-text");
    expect(storyTextRoot).toBeTruthy();
    expect(
      (storyTextRoot as HTMLElement).style.getPropertyValue(
        "--story-font-scale",
      ),
    ).toBe("0.6");

    rerender(
      React.createElement(StoryText, {
        text: "Hello",
        isLast: false,
        aiSettings: {
          ...baseSettings,
          storyFontScaleLevel: 3,
        },
      }),
    );

    storyTextRoot = container.querySelector(".story-main-text");
    expect(
      (storyTextRoot as HTMLElement).style.getPropertyValue(
        "--story-font-scale",
      ),
    ).toBe("1");

    rerender(
      React.createElement(StoryText, {
        text: "Hello",
        isLast: false,
        aiSettings: {
          ...baseSettings,
          storyFontScaleLevel: 5,
        },
      }),
    );

    storyTextRoot = container.querySelector(".story-main-text");
    expect(
      (storyTextRoot as HTMLElement).style.getPropertyValue(
        "--story-font-scale",
      ),
    ).toBe("1.4");
  });
});
