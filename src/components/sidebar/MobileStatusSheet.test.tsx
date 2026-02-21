// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileStatusSheet } from "./MobileStatusSheet";

const runtimeState = vi.hoisted(() => ({
  state: {
    gameState: {
      uiState: {
        sidebarDetailOpen: false,
        sidebarActivePanel: undefined,
        sidebarActiveItemId: undefined,
      },
      actors: [],
      playerActorId: "char:player",
      quests: [],
      currentLocation: "loc:start",
      theme: "fantasy",
      character: {
        name: "Hero",
      },
    },
    currentThemeConfig: { fontClass: "font-theme" },
    aiSettings: {
      embedding: { enabled: false },
    },
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("../../runtime/context", () => ({
  useRuntimeContext: () => runtimeState,
}));

vi.mock("../../utils/entityDisplay", () => ({
  resolveLocationDisplayName: () => "Nowhere",
}));

vi.mock("../../hooks/useEmbeddingStatus", () => ({
  useEmbeddingStatus: () => null,
}));

vi.mock("./SidebarPanelsWorkspace", () => ({
  MemoizedSidebarPanelsWorkspace: () =>
    React.createElement("div", { "data-testid": "mobile-status-workspace" }),
  SIDEBAR_PRIMARY_PANELS: [
    "character",
    "timeline",
    "quest",
    "knowledge",
    "worldInfo",
  ],
  SIDEBAR_PANEL_LABEL_KEYS: {
    character: "gameViewer.character",
    timeline: "timeline.title",
    location: "location.title",
    quest: "questPanel.title",
    npc: "npcs",
    inventory: "inventory",
    knowledge: "knowledgePanel.title",
    worldInfo: "worldInfo.title",
    rag: "rag.title",
  },
}));

describe("MobileStatusSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.state.aiSettings.embedding.enabled = false;
    runtimeState.state.gameState.uiState.sidebarDetailOpen = false;
    runtimeState.state.gameState.uiState.sidebarActivePanel = undefined;
    runtimeState.state.gameState.uiState.sidebarActiveItemId = undefined;
  });

  it("supports snap controls and swipe gestures", () => {
    const onClose = vi.fn();

    render(
      React.createElement(MobileStatusSheet, {
        isOpen: true,
        onClose,
        onUpdateUIState: vi.fn(),
      }),
    );

    const sheet = screen.getByTestId("mobile-status-sheet");
    expect(sheet.getAttribute("data-snap-index")).toBe("1");

    fireEvent.click(screen.getByLabelText("Snap up"));
    expect(sheet.getAttribute("data-snap-index")).toBe("2");

    fireEvent.click(screen.getByLabelText("Snap down"));
    fireEvent.click(screen.getByLabelText("Snap down"));
    expect(sheet.getAttribute("data-snap-index")).toBe("0");

    const dragArea = screen.getByTestId("mobile-status-sheet-drag-area");
    fireEvent.touchStart(dragArea, {
      touches: [{ clientY: 100 }],
    });
    fireEvent.touchMove(dragArea, {
      touches: [{ clientY: 190 }],
    });
    fireEvent.touchEnd(dragArea);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("switches between overview and detail tabs", () => {
    const onUpdateUIState = vi.fn();

    render(
      React.createElement(MobileStatusSheet, {
        isOpen: true,
        onClose: vi.fn(),
        onUpdateUIState,
      }),
    );

    fireEvent.click(screen.getByText("gameViewer.character"));

    expect(onUpdateUIState).toHaveBeenCalledWith(
      "sidebarActivePanel",
      "character",
    );
    expect(onUpdateUIState).toHaveBeenCalledWith(
      "sidebarActiveItemId",
      undefined,
    );
    expect(onUpdateUIState).toHaveBeenCalledWith("sidebarDetailOpen", true);

    fireEvent.click(screen.getByText("overview"));

    expect(onUpdateUIState).toHaveBeenCalledWith("sidebarDetailOpen", false);
  });

  it("closes when backdrop is pressed", () => {
    const onClose = vi.fn();

    render(
      React.createElement(MobileStatusSheet, {
        isOpen: true,
        onClose,
        onUpdateUIState: vi.fn(),
      }),
    );

    fireEvent.click(screen.getByLabelText("Close status sheet"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
