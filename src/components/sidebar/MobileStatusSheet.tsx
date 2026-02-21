import React from "react";
import { useTranslation } from "react-i18next";
import { SidebarPanelType, UIState } from "../../types";
import { useRuntimeContext } from "../../runtime/context";
import { resolveLocationDisplayName } from "../../utils/entityDisplay";
import { useEmbeddingStatus } from "../../hooks/useEmbeddingStatus";
import {
  MemoizedSidebarPanelsWorkspace,
  SIDEBAR_PANEL_LABEL_KEYS,
  SIDEBAR_PRIMARY_PANELS,
} from "./SidebarPanelsWorkspace";

interface MobileStatusSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateUIState: <K extends keyof UIState>(
    section: K,
    newState: UIState[K],
  ) => void;
}

const SNAP_HEIGHTS = ["32vh", "62vh", "88vh"] as const;
const SWIPE_THRESHOLD_PX = 56;

export const MobileStatusSheet: React.FC<MobileStatusSheetProps> = ({
  isOpen,
  onClose,
  onUpdateUIState,
}) => {
  const { t } = useTranslation();
  const { state } = useRuntimeContext();
  const { gameState, currentThemeConfig } = state;

  const ragEnabled = state.aiSettings.embedding?.enabled === true;
  const embeddingProgress = useEmbeddingStatus();

  const [snapIndex, setSnapIndex] = React.useState(1);
  const startYRef = React.useRef<number | null>(null);
  const currentYRef = React.useRef<number | null>(null);

  const playerProfile = React.useMemo(
    () =>
      gameState.actors?.find(
        (bundle) => bundle.profile.id === gameState.playerActorId,
      )?.profile ?? null,
    [gameState.actors, gameState.playerActorId],
  );

  const activeQuest = React.useMemo(
    () => gameState.quests?.find((quest) => quest.status === "active"),
    [gameState.quests],
  );

  const locationContext = resolveLocationDisplayName(
    gameState.currentLocation,
    gameState,
  );

  const itemContext = `Theme: ${gameState.theme}. Quest: ${activeQuest?.title || "None"}. Location: ${locationContext}.`;

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSnapIndex((prev) => (prev < 1 ? 1 : prev));
  }, [isOpen]);

  const handleTouchStart = (event: React.TouchEvent) => {
    startYRef.current = event.touches[0]?.clientY ?? null;
    currentYRef.current = startYRef.current;
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    currentYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = () => {
    if (startYRef.current === null || currentYRef.current === null) {
      return;
    }

    const delta = currentYRef.current - startYRef.current;

    if (delta > SWIPE_THRESHOLD_PX) {
      if (snapIndex === 0) {
        onClose();
      } else {
        setSnapIndex((prev) => Math.max(0, prev - 1));
      }
    } else if (delta < -SWIPE_THRESHOLD_PX) {
      setSnapIndex((prev) => Math.min(SNAP_HEIGHTS.length - 1, prev + 1));
    }

    startYRef.current = null;
    currentYRef.current = null;
  };

  const handleSelectOverview = () => {
    onUpdateUIState("sidebarDetailOpen", false);
    onUpdateUIState("sidebarActiveItemId", undefined);
  };

  const handleSelectPanel = (panel: SidebarPanelType) => {
    onUpdateUIState("sidebarActivePanel", panel);
    onUpdateUIState("sidebarActiveItemId", undefined);
    onUpdateUIState("sidebarDetailOpen", true);
  };

  const availableTabs = React.useMemo(() => {
    const tabs = SIDEBAR_PRIMARY_PANELS.filter((panel) => {
      if (panel === "character") {
        return Boolean(gameState.character);
      }
      return true;
    });

    if (ragEnabled) {
      tabs.push("rag");
    }

    return tabs;
  }, [gameState.character, ragEnabled]);

  const activePanel =
    gameState.uiState?.sidebarDetailOpen === true
      ? gameState.uiState?.sidebarActivePanel || null
      : null;

  const isOverviewTabActive = !activePanel;

  return (
    <div
      className={`md:hidden fixed inset-0 z-50 transition-opacity duration-200 ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
        aria-label="Close status sheet"
      />

      <section
        data-testid="mobile-status-sheet"
        data-snap-index={snapIndex}
        className={`absolute left-0 right-0 bottom-0 bg-theme-bg border-t border-theme-divider/70 transition-transform duration-200 ease-out shadow-2xl ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ height: SNAP_HEIGHTS[snapIndex] }}
      >
        <div
          data-testid="mobile-status-sheet-drag-area"
          className="px-4 pt-2 pb-2 border-b border-theme-divider/50"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-theme-divider/70" />
          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-[0.14em] text-theme-primary font-semibold">
              {t("status") || "Status"}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="h-7 w-7 grid place-items-center text-theme-text-secondary hover:text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors"
                onClick={() => setSnapIndex((prev) => Math.max(0, prev - 1))}
                aria-label="Snap down"
                title="Snap down"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="h-7 w-7 grid place-items-center text-theme-text-secondary hover:text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors"
                onClick={() =>
                  setSnapIndex((prev) =>
                    Math.min(SNAP_HEIGHTS.length - 1, prev + 1),
                  )
                }
                aria-label="Snap up"
                title="Snap up"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="h-7 w-7 grid place-items-center text-theme-text-secondary hover:text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors"
                onClick={onClose}
                aria-label="Close status"
                title="Close"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            <button
              type="button"
              onClick={handleSelectOverview}
              className={`shrink-0 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] border transition-colors ${
                isOverviewTabActive
                  ? "border-theme-primary/45 text-theme-primary bg-theme-primary/8"
                  : "border-theme-divider/70 text-theme-text-secondary hover:text-theme-primary"
              }`}
            >
              {t("overview") || "Overview"}
            </button>

            {availableTabs.map((panel) => {
              const labelKey = SIDEBAR_PANEL_LABEL_KEYS[panel];
              const label =
                t(labelKey) ||
                panel.charAt(0).toUpperCase() +
                  panel.slice(1).replace(/([A-Z])/g, " $1");
              const active = activePanel === panel;

              return (
                <button
                  key={panel}
                  type="button"
                  onClick={() => handleSelectPanel(panel)}
                  className={`shrink-0 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] border transition-colors ${
                    active
                      ? "border-theme-primary/45 text-theme-primary bg-theme-primary/8"
                      : "border-theme-divider/70 text-theme-text-secondary hover:text-theme-primary"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-[calc(100%-7.25rem)] overflow-y-auto px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] custom-scrollbar">
          <MemoizedSidebarPanelsWorkspace
            gameState={gameState}
            themeFont={currentThemeConfig.fontClass}
            itemContext={itemContext}
            playerProfile={playerProfile}
            ragEnabled={ragEnabled}
            embeddingProgress={embeddingProgress}
            onUpdateUIState={onUpdateUIState}
            listManagementEnabled={isOpen}
            mode="mobile"
          />
        </div>
      </section>
    </div>
  );
};
