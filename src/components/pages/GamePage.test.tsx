// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.hoisted(() => vi.fn());
const issueEditorSessionToken = vi.hoisted(() => vi.fn(() => "editor-token-1"));
const revokeEditorSessionToken = vi.hoisted(() => vi.fn());
const showToast = vi.hoisted(() => vi.fn());

const runtimeState = vi.hoisted(() => ({
  state: {
    gameState: {
      outline: { id: "outline" },
      outlineConversation: null,
      uiState: { feedLayout: "scroll" },
      logs: [],
      nodes: {},
      activeNodeId: null,
      theme: "fantasy",
      isProcessing: false,
    },
    currentHistory: [],
    language: "en",
    isTranslating: false,
    aiSettings: {
      audioVolume: {
        bgmVolume: 0.5,
        bgmMuted: false,
      },
    },
    saveSlots: [],
    currentSlotId: "slot-1",
    failedImageNodes: [],
    themeFont: "font-theme",
    vfsSession: {},
  },
  actions: {
    setLanguage: vi.fn(),
    handleAction: vi.fn(async () => ({ ok: true })),
    handleSaveSettings: vi.fn(),
    navigateToNode: vi.fn(),
    generateImageForNode: vi.fn(),
    loadSlot: vi.fn(),
    deleteSlot: vi.fn(),
    triggerSave: vi.fn(),
    handleForceUpdate: vi.fn(),
    rebuildContext: vi.fn(),
    invalidateSession: vi.fn(),
    updateUiState: vi.fn(),
    updateNodeMeta: vi.fn(),
    setVeoScript: vi.fn(),
    applyVfsMutation: vi.fn(),
  },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("../../hooks/useAmbience", () => ({
  useAmbience: () => ({ resumeAudio: vi.fn() }),
}));

vi.mock("../../hooks/useMediaQuery", () => ({
  useIsMobile: () => false,
}));

vi.mock("../../hooks/useWakeLock", () => ({
  useWakeLock: () => undefined,
}));

vi.mock("../Toast", () => ({
  useToast: () => ({
    showToast,
    pushStateChangeToasts: vi.fn(),
  }),
}));

vi.mock("../../runtime/context", () => ({
  useRuntimeContext: () => runtimeState,
}));

vi.mock("../../hooks/useSettings", () => ({
  useSettings: () => ({
    settings: { extra: {} },
    updateSettings: vi.fn(),
  }),
}));

vi.mock("../../contexts/TutorialContext", () => ({
  useTutorialContextOptional: () => null,
}));

vi.mock("../../services/vfs/core/elevation", () => ({
  vfsElevationTokenManager: {
    issueEditorSessionToken,
    revokeEditorSessionToken,
  },
}));

vi.mock("../layout/DesktopGameLayout", () => ({
  DesktopGameLayout: (props: any) =>
    React.createElement(
      "div",
      null,
      React.createElement(
        "button",
        { onClick: props.onSettings },
        "open-settings",
      ),
      React.createElement(
        "button",
        { onClick: props.onOpenSaves },
        "open-saves",
      ),
      React.createElement(
        "button",
        { onClick: props.onOpenStateEditor },
        "open-state-editor",
      ),
    ),
}));

vi.mock("../layout/MobileGameLayout", () => ({
  MobileGameLayout: () => React.createElement("div", null, "mobile-layout"),
}));

vi.mock("../MagicMirror", () => ({
  MagicMirror: () => null,
}));

vi.mock("../VeoScriptModal", () => ({
  VeoScriptModal: () => null,
}));

vi.mock("../DestinyMap", () => ({
  DestinyMap: () => null,
}));

vi.mock("../sidebar/LogPanel", () => ({
  LogPanel: () => null,
}));

vi.mock("../StateEditor", () => ({
  StateEditor: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? React.createElement("div", null, "state-editor-open") : null,
}));

vi.mock("../ragDebugger", () => ({
  RAGDebugger: () => null,
}));

vi.mock("../GameStateViewer", () => ({
  GameStateViewer: () => null,
}));

vi.mock("../PhotoGalleryModal", () => ({
  PhotoGalleryModal: () => null,
}));

import { GamePage } from "./GamePage";

describe("GamePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.state.gameState.outline = { id: "outline" };
    runtimeState.state.gameState.outlineConversation = null;
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
  });

  it("redirects to home when outline is missing", () => {
    runtimeState.state.gameState.outline = null;
    runtimeState.state.gameState.outlineConversation = null;

    render(
      React.createElement(GamePage, {
        onViewedSegmentChange: vi.fn(),
        onOpenSettings: vi.fn(),
        onOpenSaves: vi.fn(),
      }),
    );

    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("forwards settings and saves actions to parent callbacks", async () => {
    const onOpenSettings = vi.fn();
    const onOpenSaves = vi.fn();

    render(
      React.createElement(GamePage, {
        onViewedSegmentChange: vi.fn(),
        onOpenSettings,
        onOpenSaves,
      }),
    );

    fireEvent.click(await screen.findByText("open-settings"));
    fireEvent.click(await screen.findByText("open-saves"));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(onOpenSaves).toHaveBeenCalledTimes(1);
  });

  it("opens state editor after confirmation", async () => {
    render(
      React.createElement(GamePage, {
        onViewedSegmentChange: vi.fn(),
        onOpenSettings: vi.fn(),
        onOpenSaves: vi.fn(),
      }),
    );

    fireEvent.click(await screen.findByText("open-state-editor"));

    expect(issueEditorSessionToken).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("state-editor-open")).toBeTruthy();
  });
});
