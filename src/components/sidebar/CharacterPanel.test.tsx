// @vitest-environment jsdom

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CharacterPanel } from "./CharacterPanel";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: unknown) => {
      if (typeof options === "string") return options;
      if (
        options &&
        typeof options === "object" &&
        "defaultValue" in options &&
        typeof (options as any).defaultValue === "string"
      ) {
        return (options as any).defaultValue;
      }
      return key;
    },
  }),
}));

vi.mock("../../runtime/context", () => ({
  useOptionalRuntimeContext: () => null,
}));

vi.mock("../render/MarkdownText", () => ({
  MarkdownText: ({ content }: { content: string }) =>
    React.createElement("span", null, content),
}));

const baseCharacter = {
  name: "Hero",
  title: "Scout",
  status: "Ready",
  appearance: "Lean",
  attributes: [],
  skills: [],
  conditions: [],
  hiddenTraits: [],
  age: "22",
  profession: "Ranger",
  background: "Frontier",
  race: "Human",
  gender: "Female",
  currentLocation: "loc:start",
} as any;

const playerProfile = {
  id: "char:player",
  kind: "player",
  knownBy: ["char:player"],
  currentLocation: "loc:start",
  visible: {
    name: "Hero",
    race: "Human",
    gender: "Female",
  },
  hidden: {
    trueName: "Alias Zero",
    realPersonality: "Cold strategist",
    realMotives: "Protect the timeline core",
    routine: "Tracks paradox activity nightly",
    currentThought: "Need one more clue",
    status: "Operating undercover",
    secrets: ["Knows the forbidden protocol"],
    race: "High Dimension",
    gender: "Male",
  },
  unlockReason: "Mind-link established",
  relations: [],
} as any;

describe("CharacterPanel", () => {
  it("shows visible race/gender and gates hidden identity fields", () => {
    const view = render(
      React.createElement(CharacterPanel, {
        character: baseCharacter,
        playerProfile,
        unlockMode: false,
        locations: [],
        themeFont: "font-theme",
      }),
    );

    expect(screen.getByText("Human")).toBeTruthy();
    expect(screen.getByText("Female")).toBeTruthy();
    expect(screen.queryByText("High Dimension")).toBeNull();
    expect(screen.queryByText("Male")).toBeNull();
    expect(screen.queryByText("Alias Zero")).toBeNull();
    expect(screen.queryByText("Cold strategist")).toBeNull();
    expect(screen.queryByText("Mind-link established")).toBeNull();

    view.rerender(
      React.createElement(CharacterPanel, {
        character: baseCharacter,
        playerProfile,
        unlockMode: true,
        locations: [],
        themeFont: "font-theme",
      }),
    );

    expect(screen.getByText("High Dimension")).toBeTruthy();
    expect(screen.getByText("Male")).toBeTruthy();
    expect(screen.getByText("Alias Zero")).toBeTruthy();
    expect(screen.getByText("Cold strategist")).toBeTruthy();
    expect(screen.getByText("Mind-link established")).toBeTruthy();
  });
});
