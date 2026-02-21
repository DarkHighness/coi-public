import React from "react";
import { useTranslation } from "react-i18next";
import { UIState } from "../types";
import { LanguageSelector } from "./LanguageSelector";
import { CharacterPanel } from "./sidebar/CharacterPanel";
import { QuestPanel } from "./sidebar/QuestPanel";
import { InventoryPanel } from "./sidebar/InventoryPanel";
import { NPCPanel } from "./sidebar/NPCPanel";
import { LocationPanel } from "./sidebar/LocationPanel";
import { KnowledgePanel } from "./sidebar/KnowledgePanel";
import { WorldInfoPanel } from "./sidebar/WorldInfoPanel";
import { TimelineEventsPanel } from "./sidebar/TimelineEventsPanel";
import { RAGPanel } from "./sidebar/RAGPanel";
import { useEmbeddingStatus } from "../hooks/useEmbeddingStatus";
import { useRuntimeContext } from "../runtime/context";
import { resolveLocationDisplayName } from "../utils/entityDisplay";
import { BUILD_INFO } from "../utils/constants";

type ExpandableSidebarPanel =
  | "quests"
  | "timeline"
  | "locations"
  | "npcs"
  | "inventory"
  | "knowledge";

interface SidebarProps {
  // Callbacks only - state comes from context
  onCloseMobile: () => void;
  onMagicMirror: () => void;
  onNewGame: () => void;
  onSettings: () => void;
  onOpenSaves: () => void;
  onOpenMap: () => void;
  onOpenLogs: () => void;
  onOpenViewer?: () => void;
  onOpenGallery?: () => void;
  onUpdateUIState: <K extends keyof UIState>(
    section: K,
    newState: UIState[K],
  ) => void;
  onVeoScript: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onCloseMobile,
  onMagicMirror,
  onNewGame,
  onSettings,
  onOpenSaves,
  onOpenMap,
  onOpenLogs,
  onOpenViewer,
  onOpenGallery,
  onUpdateUIState,
  onVeoScript,
}) => {
  const { t } = useTranslation();

  // Get state from context
  const { state, actions } = useRuntimeContext();
  const { gameState, currentThemeConfig } = state;
  const ragEnabled = state.aiSettings.embedding?.enabled === true;
  const { setLanguage } = actions;
  const isMobileViewport =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 767px)").matches;

  const { character } = gameState;
  const showDesktopMenu = gameState.uiState?.showSystemFooter !== false;
  const listManagementEnabled =
    isMobileViewport || gameState.uiState?.sidebarCollapsed !== true;
  const [globalEditMode, setGlobalEditMode] = React.useState(
    gameState.uiState?.sidebarGlobalEditMode ?? false,
  );
  const [expandedByPanel, setExpandedByPanel] = React.useState<
    Partial<Record<ExpandableSidebarPanel, string | null>>
  >({});

  React.useEffect(() => {
    setGlobalEditMode(gameState.uiState?.sidebarGlobalEditMode ?? false);
  }, [gameState.uiState?.sidebarGlobalEditMode]);

  const activeQuest = gameState.quests?.find((q) => q.status === "active");
  const locationContext = resolveLocationDisplayName(
    gameState.currentLocation,
    gameState,
  );
  const itemContext = `Theme: ${gameState.theme}. Quest: ${activeQuest?.title || "None"}. Location: ${locationContext}.`;
  const playerProfile = React.useMemo(
    () =>
      gameState.actors?.find(
        (bundle) => bundle.profile.id === gameState.playerActorId,
      )?.profile ?? null,
    [gameState.actors, gameState.playerActorId],
  );
  const timelineGameState = React.useMemo(
    () => ({
      playerActorId: gameState.playerActorId,
      character: gameState.character,
      actors: gameState.actors,
      npcs: gameState.npcs,
      locations: gameState.locations,
      quests: gameState.quests,
      knowledge: gameState.knowledge,
      factions: gameState.factions,
      timeline: gameState.timeline,
      inventory: gameState.inventory,
    }),
    [
      gameState.playerActorId,
      gameState.character,
      gameState.actors,
      gameState.npcs,
      gameState.locations,
      gameState.quests,
      gameState.knowledge,
      gameState.factions,
      gameState.timeline,
      gameState.inventory,
    ],
  );

  const handleLocationListUpdate = React.useCallback(
    (newState: UIState["locations"]) => onUpdateUIState("locations", newState),
    [onUpdateUIState],
  );
  const handleQuestListUpdate = React.useCallback(
    (newState: UIState["quests"]) => onUpdateUIState("quests", newState),
    [onUpdateUIState],
  );
  const handleNpcListUpdate = React.useCallback(
    (newState: UIState["npcs"]) => onUpdateUIState("npcs", newState),
    [onUpdateUIState],
  );
  const handleInventoryListUpdate = React.useCallback(
    (newState: UIState["inventory"]) => onUpdateUIState("inventory", newState),
    [onUpdateUIState],
  );
  const handleKnowledgeListUpdate = React.useCallback(
    (newState: UIState["knowledge"]) => onUpdateUIState("knowledge", newState),
    [onUpdateUIState],
  );
  const handleToggleSystemFooter = React.useCallback(
    () => onUpdateUIState("showSystemFooter", !showDesktopMenu),
    [onUpdateUIState, showDesktopMenu],
  );
  const handleToggleGlobalEditMode = React.useCallback(() => {
    const next = !globalEditMode;
    setGlobalEditMode(next);
    onUpdateUIState("sidebarGlobalEditMode", next);
  }, [globalEditMode, onUpdateUIState]);
  const handleExpandInPanel = React.useCallback(
    (panel: ExpandableSidebarPanel, itemId: string | null) => {
      setExpandedByPanel((prev) => ({
        ...prev,
        [panel]: itemId,
      }));
    },
    [],
  );

  const embeddingProgress = useEmbeddingStatus();

  return (
    <div className="flex flex-col h-full relative">
      <div className="relative px-4 py-3 md:px-5 md:py-4 border-b border-theme-divider/60 bg-theme-surface/5 shrink-0 min-h-[76px]">
        <div className="w-full flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center rounded-full border border-theme-divider/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-theme-primary font-semibold">
                {t("titleShort")}
              </span>
            </div>
            <h1
              className={`mt-2 text-sm md:text-base text-theme-primary ${currentThemeConfig.fontClass} tracking-wide leading-snug pr-2 truncate`}
              title={gameState.outline?.title || t("title")}
            >
              {gameState.outline?.title || t("title")}
            </h1>
            <div className="mt-2 h-px w-20 bg-theme-divider/70"></div>
          </div>

          <div className="hidden md:flex shrink-0 items-center">
            <LanguageSelector
              variant="compact"
              disabled={gameState.isProcessing}
              onChange={setLanguage}
            />
          </div>
        </div>

        <div className="absolute right-3 top-3 md:hidden flex items-center gap-1">
          <LanguageSelector
            variant="compact"
            disabled={gameState.isProcessing}
            onChange={setLanguage}
          />
          <button
            className="h-9 w-9 grid place-items-center text-theme-text-secondary hover:text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors"
            onClick={onCloseMobile}
            title={t("close") || "Close"}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 md:pb-6 scroll-smooth custom-scrollbar">
        <div className="px-4 divide-y divide-theme-divider/45">
          <section className="py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2.5 text-xs">
                <span
                  className={`text-theme-primary uppercase tracking-widest font-bold ${currentThemeConfig.fontClass}`}
                >
                  {t("gameViewer.time") || "Time"}
                </span>
                <span className="font-mono text-theme-text-secondary truncate">
                  {gameState.time}
                </span>
              </div>
              <button
                onClick={handleToggleGlobalEditMode}
                className={`h-8 px-2.5 border border-theme-divider/70 text-xs uppercase tracking-wide transition-colors ${
                  globalEditMode
                    ? "bg-theme-primary/15 text-theme-primary"
                    : "text-theme-text-secondary hover:text-theme-primary hover:bg-theme-surface-highlight/15"
                }`}
                title={globalEditMode ? t("done") : t("edit")}
              >
                {globalEditMode ? t("done") : t("edit")}
              </button>
            </div>
          </section>

          {character && (
            <section className="py-3">
              <CharacterPanel
                character={character}
                playerProfile={playerProfile}
                unlockMode={gameState.unlockMode}
                locations={gameState.locations || []}
                themeFont={currentThemeConfig.fontClass}
              />
            </section>
          )}

          <section className="py-3">
            <InventoryPanel
              inventory={gameState.inventory || []}
              themeFont={currentThemeConfig.fontClass}
              itemContext={itemContext}
              listState={gameState.uiState?.inventory}
              onUpdateList={handleInventoryListUpdate}
              listManagementEnabled={listManagementEnabled}
              globalEditMode={globalEditMode}
              expandedItemId={expandedByPanel.inventory ?? null}
              onExpandItem={(itemId) =>
                handleExpandInPanel("inventory", itemId)
              }
            />
          </section>

          <section className="py-3">
            <NPCPanel
              npcs={gameState.npcs || []}
              actors={gameState.actors || []}
              playerActorId={gameState.playerActorId}
              locations={gameState.locations || []}
              themeFont={currentThemeConfig.fontClass}
              listState={gameState.uiState?.npcs}
              onUpdateList={handleNpcListUpdate}
              unlockMode={gameState.unlockMode}
              listManagementEnabled={listManagementEnabled}
              globalEditMode={globalEditMode}
              expandedItemId={expandedByPanel.npcs ?? null}
              onExpandItem={(itemId) => handleExpandInPanel("npcs", itemId)}
            />
          </section>

          <section className="py-3">
            <QuestPanel
              quests={gameState.quests || []}
              themeFont={currentThemeConfig.fontClass}
              listState={gameState.uiState?.quests}
              onUpdateList={handleQuestListUpdate}
              listManagementEnabled={listManagementEnabled}
              globalEditMode={globalEditMode}
              expandedItemId={expandedByPanel.quests ?? null}
              onExpandItem={(itemId) => handleExpandInPanel("quests", itemId)}
            />
          </section>

          <section className="py-3">
            <LocationPanel
              currentLocation={gameState.currentLocation}
              locations={gameState.locations || []}
              locationItemsByLocationId={gameState.locationItemsByLocationId}
              themeFont={currentThemeConfig.fontClass}
              itemContext={itemContext}
              listState={gameState.uiState?.locations}
              onUpdateList={handleLocationListUpdate}
              listManagementEnabled={listManagementEnabled}
              globalEditMode={globalEditMode}
              expandedItemId={expandedByPanel.locations ?? null}
              onExpandItem={(itemId) =>
                handleExpandInPanel("locations", itemId)
              }
            />
          </section>

          <section className="py-3">
            <KnowledgePanel
              knowledge={gameState.knowledge || []}
              themeFont={currentThemeConfig.fontClass}
              listState={gameState.uiState?.knowledge}
              onUpdateList={handleKnowledgeListUpdate}
              listManagementEnabled={listManagementEnabled}
              globalEditMode={globalEditMode}
              expandedItemId={expandedByPanel.knowledge ?? null}
              onExpandItem={(itemId) =>
                handleExpandInPanel("knowledge", itemId)
              }
            />
          </section>

          <section className="py-3">
            <TimelineEventsPanel
              events={gameState.timeline}
              gameState={timelineGameState}
              themeFont={currentThemeConfig.fontClass}
              expandedItemId={expandedByPanel.timeline ?? null}
              onExpandItem={(itemId) => handleExpandInPanel("timeline", itemId)}
            />
          </section>

          <section className="py-3">
            <WorldInfoPanel
              history={gameState.worldInfo?.worldSetting?.history}
              factions={gameState.factions}
              outline={gameState.outline}
              worldSetting={gameState.worldInfo?.worldSetting}
              themeFont={currentThemeConfig.fontClass}
              worldInfo={gameState.worldInfo}
              unlockMode={gameState.unlockMode}
            />
          </section>

          {ragEnabled && (
            <section className="py-3">
              <RAGPanel
                progress={embeddingProgress}
                themeFont={currentThemeConfig.fontClass}
              />
            </section>
          )}

          {/* Token Usage Panel - Mobile Only */}
          <section className="py-3 md:hidden">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wide text-theme-text-secondary">
                {t("sidebar.tokens")}
              </span>
              <span className="text-xs font-mono text-theme-text">
                {(gameState.tokenUsage?.totalTokens || 0).toLocaleString()}
                {gameState.tokenUsage && (
                  <span className="opacity-70 ml-1">
                    ({gameState.tokenUsage.promptTokens.toLocaleString()} +{" "}
                    {gameState.tokenUsage.completionTokens.toLocaleString()})
                  </span>
                )}
              </span>
            </div>
          </section>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-theme-surface/10 text-[11px] text-theme-text-secondary py-2 px-3 flex justify-between items-center border-t border-theme-divider/60 font-mono">
        <span>
          {t("sidebar.tokens")}{" "}
          {(gameState.tokenUsage?.totalTokens || 0).toLocaleString()}
          {gameState.tokenUsage && (
            <span className="hidden md:inline opacity-70 ml-1">
              ({gameState.tokenUsage.promptTokens.toLocaleString()} +{" "}
              {gameState.tokenUsage.completionTokens.toLocaleString()})
            </span>
          )}
        </span>
        <div className="flex items-center divide-x divide-theme-divider/60">
          <button
            onClick={handleToggleSystemFooter}
            className="hidden md:grid h-8 w-8 place-items-center text-theme-text-secondary hover:text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors"
            title={showDesktopMenu ? t("hideSystem") : t("showSystem")}
            aria-label={showDesktopMenu ? t("hideSystem") : t("showSystem")}
          >
            <svg
              className={`w-4 h-4 transition-transform ${showDesktopMenu ? "rotate-180" : "rotate-0"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 7h16M4 12h16M4 17h16"
              />
            </svg>
          </button>
          <button
            onClick={onOpenLogs}
            className="grid h-8 w-8 place-items-center text-theme-text-secondary hover:text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors"
            title={t("viewLogs")}
            aria-label={t("viewLogs")}
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
                d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`shrink-0 px-6 pt-3 pb-3 border-t border-theme-divider/60 bg-theme-surface/10 hidden ${showDesktopMenu ? "md:block" : "md:hidden"}`}
      >
        <div className="text-[10px] uppercase tracking-[0.16em] text-theme-text-secondary mb-2">
          {t("menu")}
        </div>
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            showDesktopMenu
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-y border-theme-divider/60 divide-y divide-theme-divider/60">
              <button
                onClick={onNewGame}
                className="w-full py-2.5 pl-2 pr-1 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/20 transition-colors text-theme-text"
                title={t("mainMenu")}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <svg
                    className="w-4 h-4 text-theme-primary shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  <span className="text-sm truncate">{t("mainMenu")}</span>
                </span>
                <svg
                  className="w-4 h-4 text-theme-text-secondary shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              <button
                onClick={onOpenSaves}
                className="w-full py-2.5 pl-2 pr-1 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/20 transition-colors text-theme-text"
                title={t("saveGame")}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <svg
                    className="w-4 h-4 text-theme-primary shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                  <span className="text-sm truncate">{t("saveGame")}</span>
                </span>
                <svg
                  className="w-4 h-4 text-theme-text-secondary shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              <button
                onClick={onSettings}
                className="w-full py-2.5 pl-2 pr-1 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/20 transition-colors text-theme-text"
                title={t("settings.title")}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <svg
                    className="w-4 h-4 text-theme-primary shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-sm truncate">
                    {t("settings.title")}
                  </span>
                </span>
                <svg
                  className="w-4 h-4 text-theme-text-secondary shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              <button
                onClick={onOpenMap}
                data-tutorial-id="game-menu-button"
                className="w-full py-2.5 pl-2 pr-1 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/20 transition-colors text-theme-text"
                title={t("tree.viewMap")}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <svg
                    className="w-4 h-4 text-theme-primary shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7"
                    ></path>
                  </svg>
                  <span className="text-sm truncate">{t("tree.viewMap")}</span>
                </span>
                <svg
                  className="w-4 h-4 text-theme-text-secondary shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              {onOpenViewer && (
                <button
                  onClick={onOpenViewer}
                  className="w-full py-2.5 pl-2 pr-1 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/20 transition-colors text-theme-text"
                  title={t("gameViewer.title") || "Game State"}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <svg
                      className="w-4 h-4 text-theme-primary shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      ></path>
                    </svg>
                    <span className="text-sm truncate">
                      {t("gameViewer.title") || "State"}
                    </span>
                  </span>
                  <svg
                    className="w-4 h-4 text-theme-text-secondary shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}

              {onOpenGallery && (
                <button
                  onClick={onOpenGallery}
                  className="w-full py-2.5 pl-2 pr-1 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/20 transition-colors text-theme-text"
                  title={t("gallery.title")}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <svg
                      className="w-4 h-4 text-theme-primary shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-sm truncate">
                      {t("gallery.title")}
                    </span>
                  </span>
                  <svg
                    className="w-4 h-4 text-theme-text-secondary shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}

              <button
                onClick={onMagicMirror}
                className="w-full py-2.5 pl-2 pr-1 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/20 transition-colors text-theme-text"
                title={t("magicMirror.title")}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <svg
                    className="w-4 h-4 text-theme-primary shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm truncate">
                    {t("magicMirror.title")}
                  </span>
                </span>
                <svg
                  className="w-4 h-4 text-theme-text-secondary shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              <button
                onClick={onVeoScript}
                className="w-full py-2.5 pl-2 pr-1 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/20 transition-colors text-theme-text"
                title={t("veoScript.title")}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <svg
                    className="w-4 h-4 text-theme-primary shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-sm truncate">
                    {t("veoScript.title")}
                  </span>
                </span>
                <svg
                  className="w-4 h-4 text-theme-text-secondary shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-2 pt-2 border-t border-theme-divider/60 text-[10px] text-theme-text-secondary text-center">
              {t("builtWith")}
              <div className="opacity-60 mt-1 font-mono">
                {BUILD_INFO.gitHash} ({BUILD_INFO.buildTime})
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
