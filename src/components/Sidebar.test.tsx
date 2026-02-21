// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";

const knowledgePanelMock = vi.hoisted(() => vi.fn());

const runtimeState = vi.hoisted(() => ({
  state: {
    gameState: {
      uiState: {
        showSystemFooter: true,
        sidebarDetailOpen: false,
        sidebarActivePanel: undefined,
        sidebarActiveItemId: undefined,
      },
      isProcessing: false,
      outline: { title: "Test Story" },
      theme: "fantasy",
      time: "Day 1",
      turnNumber: 1,
      character: {
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
      },
      actors: [],
      playerActorId: "char:player",
      unlockMode: false,
      quests: [
        {
          id: "quest:main",
          status: "active",
          type: "main",
          title: "Find the archive",
          icon: "🎯",
          visible: { description: "Locate the hidden records" },
        },
      ],
      currentLocation: "loc:start",
      locations: [
        {
          id: "loc:start",
          name: "Camp",
          visible: { description: "Quiet camp" },
        },
      ],
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
  CharacterPanel: () =>
    React.createElement(
      "div",
      { "data-testid": "detail-character" },
      "detail-character",
    ),
}));

vi.mock("./sidebar/QuestPanel", () => ({
  QuestPanel: () =>
    React.createElement(
      "div",
      { "data-testid": "detail-quest" },
      "detail-quest",
    ),
}));

vi.mock("./sidebar/InventoryPanel", () => ({
  InventoryPanel: () => null,
}));

vi.mock("./sidebar/NPCPanel", () => ({
  buildNpcList: () => [],
  NPCPanel: () => null,
}));

vi.mock("./sidebar/LocationPanel", () => ({
  LocationPanel: () => null,
}));

vi.mock("./sidebar/KnowledgePanel", () => ({
  KnowledgePanel: (props: any) => {
    knowledgePanelMock(props);
    return React.createElement(
      "div",
      { "data-testid": "knowledge-detail-count" },
      String(props.knowledge.length),
    );
  },
}));

vi.mock("./sidebar/WorldInfoPanel", () => ({
  WorldInfoPanel: () => null,
}));

vi.mock("./sidebar/TimelineEventsPanel", () => ({
  TimelineEventsPanel: () => null,
}));

vi.mock("./sidebar/RAGPanel", () => ({
  RAGPanel: () => React.createElement("div", null, "rag-detail"),
}));

vi.mock("./sidebar/SidebarPanelShell", () => ({
  SidebarPanelShell: (props: any) =>
    React.createElement(
      "article",
      { "data-testid": `sidebar-summary-${props.panel}` },
      React.createElement(
        "button",
        { onClick: props.onViewDetails },
        `View details: ${props.title}`,
      ),
    ),
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
    runtimeState.state.gameState.uiState.sidebarDetailOpen = false;
    runtimeState.state.gameState.uiState.sidebarActivePanel = undefined;
    runtimeState.state.gameState.uiState.sidebarActiveItemId = undefined;
    runtimeState.state.gameState.knowledge = [];
  });

  it("does not render RAG summary when embedding is disabled", () => {
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

    expect(screen.queryByTestId("sidebar-summary-rag")).toBeNull();
  });

  it("renders RAG summary when embedding is enabled", () => {
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

    expect(screen.getByTestId("sidebar-summary-rag")).toBeTruthy();
  });

  it("does not mount detail panel content in summary mode", () => {
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

    expect(screen.queryByTestId("detail-character")).toBeNull();
    expect(screen.queryByTestId("detail-quest")).toBeNull();
  });

  it("activates only one detail context at a time", () => {
    const onUpdateUIState = vi.fn();

    render(
      React.createElement(Sidebar, {
        onCloseMobile: vi.fn(),
        onMagicMirror: vi.fn(),
        onNewGame: vi.fn(),
        onSettings: vi.fn(),
        onOpenSaves: vi.fn(),
        onOpenMap: vi.fn(),
        onOpenLogs: vi.fn(),
        onUpdateUIState,
        onVeoScript: vi.fn(),
      }),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "View details: gameViewer.character",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "View details: questPanel.title" }),
    );

    expect(onUpdateUIState).toHaveBeenCalledWith(
      "sidebarActivePanel",
      "character",
    );
    expect(onUpdateUIState).toHaveBeenCalledWith("sidebarActivePanel", "quest");
    expect(onUpdateUIState).toHaveBeenCalledWith("sidebarDetailOpen", true);
  });

  it("grows detail items by progressive batches", async () => {
    runtimeState.state.gameState.uiState.sidebarDetailOpen = true;
    runtimeState.state.gameState.uiState.sidebarActivePanel = "knowledge";
    runtimeState.state.gameState.knowledge = Array.from(
      { length: 95 },
      (_, index) => ({
        id: `knowledge:${index + 1}`,
        title: `Knowledge ${index + 1}`,
        category: "history",
        visible: { description: `Description ${index + 1}` },
      }),
    );

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

    expect(screen.getByTestId("knowledge-detail-count").textContent).toBe("40");

    const scrollBox = screen.getByTestId("sidebar-detail-scroll");
    Object.defineProperty(scrollBox, "clientHeight", {
      value: 280,
      configurable: true,
    });
    Object.defineProperty(scrollBox, "scrollHeight", {
      value: 1100,
      configurable: true,
    });
    Object.defineProperty(scrollBox, "scrollTop", {
      value: 920,
      configurable: true,
      writable: true,
    });
    fireEvent.scroll(scrollBox);

    await waitFor(() => {
      expect(screen.getByTestId("knowledge-detail-count").textContent).toBe(
        "80",
      );
    });
  });
});
