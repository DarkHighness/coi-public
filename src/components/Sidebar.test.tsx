// @vitest-environment jsdom

import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";

const runtimeState = vi.hoisted(() => ({
  state: {
    gameState: {
      uiState: { showSystemFooter: true },
      isProcessing: false,
      outline: { title: "Test Story" },
      theme: "fantasy",
      time: "Day 1",
      turnNumber: 1,
      character: null,
      actors: [],
      playerActorId: "char:player",
      unlockMode: false,
      quests: [],
      currentLocation: null,
      locations: [],
      locationItemsByLocationId: {},
      npcs: [],
      inventory: [],
      knowledge: [],
      timeline: [],
      worldInfo: null,
      factions: [],
      tokenUsage: null,
    },
    currentThemeConfig: { fontClass: "font-theme" },
    aiSettings: {
      embedding: { enabled: false },
    },
  },
  actions: {
    setLanguage: vi.fn(),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("./LanguageSelector", () => ({
  LanguageSelector: () => React.createElement("div", null, "language-selector"),
}));

vi.mock("./sidebar/CharacterPanel", () => ({
  CharacterPanel: () => null,
}));

vi.mock("./sidebar/QuestPanel", () => ({
  QuestPanel: () => null,
}));

vi.mock("./sidebar/InventoryPanel", () => ({
  InventoryPanel: () => null,
}));

vi.mock("./sidebar/NPCPanel", () => ({
  NPCPanel: () => null,
}));

vi.mock("./sidebar/LocationPanel", () => ({
  LocationPanel: () => null,
}));

vi.mock("./sidebar/KnowledgePanel", () => ({
  KnowledgePanel: () => null,
}));

vi.mock("./sidebar/WorldInfoPanel", () => ({
  WorldInfoPanel: () => null,
}));

vi.mock("./sidebar/TimelineEventsPanel", () => ({
  TimelineEventsPanel: () => null,
}));

vi.mock("./sidebar/FactionPanel", () => ({
  FactionPanel: () => null,
}));

vi.mock("./sidebar/RAGPanel", () => ({
  RAGPanel: () =>
    React.createElement("div", { "data-testid": "rag-panel" }, "rag-panel"),
}));

vi.mock("../hooks/useEmbeddingStatus", () => ({
  useEmbeddingStatus: () => null,
}));

vi.mock("../runtime/context", () => ({
  useRuntimeContext: () => runtimeState,
}));

vi.mock("../utils/entityDisplay", () => ({
  resolveLocationDisplayName: () => "Nowhere",
}));

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.state.aiSettings.embedding.enabled = false;
  });

  it("does not render RAG panel when embedding is disabled", () => {
    render(
      React.createElement(Sidebar, {
        onCloseMobile: vi.fn(),
        onMagicMirror: vi.fn(),
        onNewGame: vi.fn(),
        onSettings: vi.fn(),
        onOpenSaves: vi.fn(),
        onOpenMap: vi.fn(),
        onOpenLogs: vi.fn(),
        onUpdateUIState: vi.fn(),
        onVeoScript: vi.fn(),
      }),
    );

    expect(screen.queryByTestId("rag-panel")).toBeNull();
  });

  it("renders RAG panel when embedding is enabled", () => {
    runtimeState.state.aiSettings.embedding.enabled = true;

    render(
      React.createElement(Sidebar, {
        onCloseMobile: vi.fn(),
        onMagicMirror: vi.fn(),
        onNewGame: vi.fn(),
        onSettings: vi.fn(),
        onOpenSaves: vi.fn(),
        onOpenMap: vi.fn(),
        onOpenLogs: vi.fn(),
        onUpdateUIState: vi.fn(),
        onVeoScript: vi.fn(),
      }),
    );

    expect(screen.getByTestId("rag-panel")).toBeTruthy();
  });
});
