import React from "react";
import { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import {
  ActorProfile,
  GameState,
  ListState,
  SidebarPanelType,
  UIState,
} from "../../types";
import { CharacterPanel } from "./CharacterPanel";
import { TimelineEventsPanel } from "./TimelineEventsPanel";
import { LocationPanel } from "./LocationPanel";
import { QuestPanel } from "./QuestPanel";
import { NPCPanel, buildNpcList } from "./NPCPanel";
import { InventoryPanel } from "./InventoryPanel";
import { KnowledgePanel } from "./KnowledgePanel";
import { WorldInfoPanel } from "./WorldInfoPanel";
import { RAGPanel } from "./RAGPanel";
import { SidebarPanelShell } from "./SidebarPanelShell";
import { SidebarDetailLayer } from "./SidebarDetailLayer";
import { EmbeddingProgress } from "../../hooks/useEmbeddingStatus";
import { resolveLocationDisplayName } from "../../utils/entityDisplay";

const DETAIL_BATCH_SIZE = 40;

const DEFAULT_LIST_STATE: ListState = {
  pinnedIds: [],
  customOrder: [],
  hiddenIds: [],
};

export const SIDEBAR_PRIMARY_PANELS: SidebarPanelType[] = [
  "character",
  "timeline",
  "location",
  "quest",
  "npc",
  "inventory",
  "knowledge",
  "worldInfo",
];

export const SIDEBAR_PANEL_LABEL_KEYS: Record<SidebarPanelType, string> = {
  character: "gameViewer.character",
  timeline: "timeline.title",
  location: "location.title",
  quest: "questPanel.title",
  npc: "npcs",
  inventory: "inventory",
  knowledge: "knowledgePanel.title",
  worldInfo: "worldInfo.title",
  rag: "rag.title",
};

interface SidebarPanelCardData {
  panel: SidebarPanelType;
  title: string;
  icon: string;
  count?: number;
  summaryLines: string[];
}

interface SidebarPanelsWorkspaceProps {
  gameState: GameState;
  themeFont: string;
  itemContext: string;
  playerProfile: ActorProfile | null;
  ragEnabled: boolean;
  embeddingProgress: EmbeddingProgress | null;
  onUpdateUIState: <K extends keyof UIState>(
    section: K,
    newState: UIState[K],
  ) => void;
  listManagementEnabled: boolean;
  mode?: "desktop" | "mobile";
}

const normalizeSnippet = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value
    .replace(/[`*_>#~\[\]-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length === 0) {
    return fallback;
  }
  return normalized;
};

const clampSnippet = (value: string, maxLength = 120): string => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const panelLabel = (
  panel: SidebarPanelType,
  t: TFunction,
  fallback: string,
): string => {
  return t(SIDEBAR_PANEL_LABEL_KEYS[panel]) || fallback;
};

export const SidebarPanelsWorkspace: React.FC<SidebarPanelsWorkspaceProps> = ({
  gameState,
  themeFont,
  itemContext,
  playerProfile,
  ragEnabled,
  embeddingProgress,
  onUpdateUIState,
  listManagementEnabled,
  mode = "desktop",
}) => {
  const { t } = useTranslation();

  const playerActorId = gameState.playerActorId || "char:player";

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

  const timelineKnown = React.useMemo(
    () =>
      (gameState.timeline || []).filter(
        (event) =>
          !Array.isArray(event.knownBy) ||
          event.knownBy.includes(playerActorId),
      ),
    [gameState.timeline, playerActorId],
  );

  const questsVisible = React.useMemo(
    () =>
      (gameState.quests || []).filter(
        (quest) => quest.status === "active" && quest.type !== "hidden",
      ),
    [gameState.quests],
  );

  const knownNpcs = React.useMemo(
    () =>
      buildNpcList(gameState.npcs || [], playerActorId, gameState.unlockMode),
    [gameState.npcs, playerActorId, gameState.unlockMode],
  );

  const recentTimelineLines = React.useMemo(
    () =>
      [...timelineKnown]
        .reverse()
        .slice(0, 3)
        .map((event) => {
          const title =
            normalizeSnippet(event.name) ||
            normalizeSnippet(
              event.visible?.description,
              t("empty") || "No details",
            );
          const gameTime = normalizeSnippet(event.gameTime, "?");
          return clampSnippet(`${gameTime} · ${title}`, 110);
        }),
    [timelineKnown, t],
  );

  const locationSummaryLines = React.useMemo(() => {
    const currentLocation = resolveLocationDisplayName(
      gameState.currentLocation,
      gameState,
    );
    const knownCount = gameState.locations?.length || 0;
    const nearbyCount = Math.max(0, knownCount - 1);

    return [
      clampSnippet(
        `${t("gameViewer.currentLocation") || "Current"}: ${currentLocation || t("unknown") || "Unknown"}`,
        115,
      ),
      clampSnippet(`${t("location.title") || "Locations"}: ${knownCount}`, 90),
      clampSnippet(`${t("nearby") || "Nearby"}: ${nearbyCount}`, 90),
    ];
  }, [gameState.currentLocation, gameState.locations?.length, gameState, t]);

  const mainQuest = React.useMemo(
    () => questsVisible.find((quest) => quest.type === "main") || null,
    [questsVisible],
  );

  const currentInteractionNpc = React.useMemo(() => {
    if (!knownNpcs.length) {
      return null;
    }

    return (
      knownNpcs.find(
        (npc) =>
          npc.currentLocation &&
          npc.currentLocation === gameState.currentLocation &&
          npc.visible?.name,
      ) || knownNpcs[0]
    );
  }, [knownNpcs, gameState.currentLocation]);

  const knowledgeCategories = React.useMemo(() => {
    const categories = new Set(
      (gameState.knowledge || []).map((entry) => entry.category || "other"),
    );
    return categories.size;
  }, [gameState.knowledge]);

  const worldRuleLine = React.useMemo(() => {
    const visibleDescription = normalizeSnippet(
      gameState.worldInfo?.worldSetting?.visible?.description,
    );
    const visibleRules = normalizeSnippet(
      gameState.worldInfo?.worldSetting?.visible?.rules,
    );

    if (visibleRules) {
      return clampSnippet(visibleRules, 110);
    }
    if (visibleDescription) {
      return clampSnippet(visibleDescription, 110);
    }
    return t("worldInfo.empty") || "No world rules discovered yet.";
  }, [gameState.worldInfo, t]);

  const panelCards = React.useMemo<SidebarPanelCardData[]>(() => {
    const cards: SidebarPanelCardData[] = [];

    if (gameState.character) {
      const characterName = normalizeSnippet(
        gameState.character.name,
        t("unknown") || "Unknown",
      );
      const status = normalizeSnippet(
        gameState.character.status,
        t("unknown") || "Unknown",
      );
      const location = resolveLocationDisplayName(
        gameState.character.currentLocation,
        gameState,
      );

      cards.push({
        panel: "character",
        title: panelLabel("character", t, "Character"),
        icon: "🧍",
        count: 1,
        summaryLines: [
          clampSnippet(`${characterName} · ${status}`, 110),
          clampSnippet(
            `${t("gameViewer.currentLocation") || "Location"}: ${location || t("unknown") || "Unknown"}`,
            110,
          ),
        ],
      });
    }

    cards.push({
      panel: "timeline",
      title: panelLabel("timeline", t, "Timeline"),
      icon: "🕒",
      count: timelineKnown.length,
      summaryLines:
        recentTimelineLines.length > 0
          ? recentTimelineLines
          : [t("worldInfo.noEvents") || "No recent events."],
    });

    cards.push({
      panel: "location",
      title: panelLabel("location", t, "Location"),
      icon: "📍",
      count: gameState.locations?.length || 0,
      summaryLines: locationSummaryLines,
    });

    cards.push({
      panel: "quest",
      title: panelLabel("quest", t, "Quests"),
      icon: "🎯",
      count: questsVisible.length,
      summaryLines: [
        clampSnippet(
          `${t("active") || "Active"}: ${questsVisible.length}`,
          100,
        ),
        clampSnippet(
          `${t("mainQuest") || "Main"}: ${mainQuest?.title || t("questPanel.empty") || "None"}`,
          115,
        ),
      ],
    });

    cards.push({
      panel: "npc",
      title: panelLabel("npc", t, "NPCs"),
      icon: "🧑‍🤝‍🧑",
      count: knownNpcs.length,
      summaryLines: [
        clampSnippet(`${t("npcs") || "NPCs"}: ${knownNpcs.length}`, 100),
        clampSnippet(
          `${t("gameViewer.currentInteraction") || "Current"}: ${currentInteractionNpc?.visible?.name || t("unknown") || "Unknown"}`,
          115,
        ),
      ],
    });

    cards.push({
      panel: "inventory",
      title: panelLabel("inventory", t, "Inventory"),
      icon: "🎒",
      count: gameState.inventory?.length || 0,
      summaryLines: [
        clampSnippet(
          `${t("inventory") || "Inventory"}: ${gameState.inventory?.length || 0}`,
          100,
        ),
        clampSnippet(
          `${t("pinned") || "Pinned"}: ${gameState.uiState?.inventory?.pinnedIds?.length || 0}`,
          100,
        ),
      ],
    });

    cards.push({
      panel: "knowledge",
      title: panelLabel("knowledge", t, "Knowledge"),
      icon: "📚",
      count: gameState.knowledge?.length || 0,
      summaryLines: [
        clampSnippet(
          `${t("categories") || "Categories"}: ${knowledgeCategories}`,
          105,
        ),
        clampSnippet(
          `${t("recent") || "Recent"}: ${
            (gameState.knowledge || [])
              .slice(-2)
              .map((entry) => entry.title)
              .filter(Boolean)
              .join(" · ") ||
            t("empty") ||
            "None"
          }`,
          120,
        ),
      ],
    });

    cards.push({
      panel: "worldInfo",
      title: panelLabel("worldInfo", t, "World"),
      icon: "🌍",
      count: gameState.factions?.length || 0,
      summaryLines: [
        worldRuleLine,
        clampSnippet(
          `${t("worldInfo.factions") || "Factions"}: ${gameState.factions?.length || 0}`,
          100,
        ),
      ],
    });

    if (ragEnabled) {
      const total = embeddingProgress?.total || 0;
      const current = embeddingProgress?.current || 0;
      cards.push({
        panel: "rag",
        title: panelLabel("rag", t, "RAG"),
        icon: "🧠",
        summaryLines: [
          clampSnippet(
            `${t("rag.status", "Status")}: ${t("embedding.phase." + (embeddingProgress?.stage || "idle"), embeddingProgress?.stage || "Idle")}`,
            110,
          ),
          clampSnippet(`${current} / ${total}`, 90),
        ],
      });
    }

    return cards;
  }, [
    currentInteractionNpc?.visible?.name,
    embeddingProgress?.current,
    embeddingProgress?.stage,
    embeddingProgress?.total,
    gameState,
    knowledgeCategories,
    knownNpcs.length,
    locationSummaryLines,
    mainQuest?.title,
    questsVisible.length,
    ragEnabled,
    recentTimelineLines,
    t,
    timelineKnown.length,
    worldRuleLine,
  ]);

  const cardTitleMap = React.useMemo(() => {
    const map = new Map<SidebarPanelType, string>();
    for (const card of panelCards) {
      map.set(card.panel, card.title);
    }
    return map;
  }, [panelCards]);

  const [visibleLimit, setVisibleLimit] = React.useState(DETAIL_BATCH_SIZE);

  const activePanel = gameState.uiState?.sidebarActivePanel || null;
  const detailOpen = Boolean(
    gameState.uiState?.sidebarDetailOpen && activePanel,
  );

  React.useEffect(() => {
    setVisibleLimit(DETAIL_BATCH_SIZE);
  }, [activePanel, detailOpen]);

  const openDetail = React.useCallback(
    (panel: SidebarPanelType, itemId?: string) => {
      onUpdateUIState("sidebarActivePanel", panel);
      onUpdateUIState("sidebarActiveItemId", itemId);
      onUpdateUIState("sidebarDetailOpen", true);
    },
    [onUpdateUIState],
  );

  const closeDetail = React.useCallback(() => {
    onUpdateUIState("sidebarDetailOpen", false);
    onUpdateUIState("sidebarActiveItemId", undefined);
  }, [onUpdateUIState]);

  const handleLoadMore = React.useCallback(() => {
    setVisibleLimit((prev) => prev + DETAIL_BATCH_SIZE);
  }, []);

  const activePanelTotal = React.useMemo(() => {
    if (!activePanel) {
      return 0;
    }

    switch (activePanel) {
      case "character":
        return gameState.character ? 1 : 0;
      case "timeline":
        return timelineKnown.length;
      case "location":
        return gameState.locations?.length || 0;
      case "quest":
        return questsVisible.length;
      case "npc":
        return knownNpcs.length;
      case "inventory":
        return gameState.inventory?.length || 0;
      case "knowledge":
        return gameState.knowledge?.length || 0;
      case "worldInfo":
        return gameState.factions?.length || 0;
      case "rag":
      default:
        return 0;
    }
  }, [
    activePanel,
    gameState.character,
    gameState.factions?.length,
    gameState.inventory?.length,
    gameState.knowledge?.length,
    gameState.locations?.length,
    knownNpcs.length,
    questsVisible.length,
    timelineKnown.length,
  ]);

  const hasMore = detailOpen && activePanelTotal > visibleLimit;

  const limitedTimeline = React.useMemo(
    () => timelineKnown.slice(0, visibleLimit),
    [timelineKnown, visibleLimit],
  );
  const limitedLocations = React.useMemo(
    () => (gameState.locations || []).slice(0, visibleLimit),
    [gameState.locations, visibleLimit],
  );
  const limitedQuests = React.useMemo(
    () => questsVisible.slice(0, visibleLimit),
    [questsVisible, visibleLimit],
  );
  const limitedNpcs = React.useMemo(
    () => knownNpcs.slice(0, visibleLimit),
    [knownNpcs, visibleLimit],
  );
  const limitedInventory = React.useMemo(
    () => (gameState.inventory || []).slice(0, visibleLimit),
    [gameState.inventory, visibleLimit],
  );
  const limitedKnowledge = React.useMemo(
    () => (gameState.knowledge || []).slice(0, visibleLimit),
    [gameState.knowledge, visibleLimit],
  );
  const limitedFactions = React.useMemo(
    () => (gameState.factions || []).slice(0, visibleLimit),
    [gameState.factions, visibleLimit],
  );

  const detailPanelContent = React.useMemo(() => {
    if (!activePanel) {
      return null;
    }

    switch (activePanel) {
      case "character":
        if (!gameState.character) {
          return (
            <p className="text-xs text-theme-text-secondary">
              {t("gameViewer.noCharacter") || "No character data."}
            </p>
          );
        }

        return (
          <CharacterPanel
            character={gameState.character}
            playerProfile={playerProfile}
            unlockMode={gameState.unlockMode}
            locations={gameState.locations || []}
            themeFont={themeFont}
          />
        );
      case "timeline":
        return (
          <TimelineEventsPanel
            events={limitedTimeline}
            gameState={timelineGameState}
            themeFont={themeFont}
          />
        );
      case "location":
        return (
          <LocationPanel
            currentLocation={gameState.currentLocation}
            locations={limitedLocations}
            locationItemsByLocationId={gameState.locationItemsByLocationId}
            themeFont={themeFont}
            itemContext={itemContext}
            listState={gameState.uiState?.locations || DEFAULT_LIST_STATE}
            onUpdateList={(nextState) =>
              onUpdateUIState("locations", nextState)
            }
            listManagementEnabled={
              listManagementEnabled && detailOpen && activePanel === "location"
            }
          />
        );
      case "quest":
        return (
          <QuestPanel
            quests={limitedQuests}
            themeFont={themeFont}
            listState={gameState.uiState?.quests || DEFAULT_LIST_STATE}
            onUpdateList={(nextState) => onUpdateUIState("quests", nextState)}
            listManagementEnabled={
              listManagementEnabled && detailOpen && activePanel === "quest"
            }
          />
        );
      case "npc":
        return (
          <NPCPanel
            npcs={limitedNpcs}
            actors={gameState.actors || []}
            playerActorId={playerActorId}
            locations={gameState.locations || []}
            themeFont={themeFont}
            listState={gameState.uiState?.npcs || DEFAULT_LIST_STATE}
            onUpdateList={(nextState) => onUpdateUIState("npcs", nextState)}
            unlockMode={gameState.unlockMode}
            listManagementEnabled={
              listManagementEnabled && detailOpen && activePanel === "npc"
            }
          />
        );
      case "inventory":
        return (
          <InventoryPanel
            inventory={limitedInventory}
            themeFont={themeFont}
            itemContext={itemContext}
            listState={gameState.uiState?.inventory || DEFAULT_LIST_STATE}
            onUpdateList={(nextState) =>
              onUpdateUIState("inventory", nextState)
            }
            listManagementEnabled={
              listManagementEnabled && detailOpen && activePanel === "inventory"
            }
          />
        );
      case "knowledge":
        return (
          <KnowledgePanel
            knowledge={limitedKnowledge}
            themeFont={themeFont}
            listState={gameState.uiState?.knowledge || DEFAULT_LIST_STATE}
            onUpdateList={(nextState) =>
              onUpdateUIState("knowledge", nextState)
            }
            listManagementEnabled={
              listManagementEnabled && detailOpen && activePanel === "knowledge"
            }
          />
        );
      case "worldInfo":
        return (
          <WorldInfoPanel
            history={gameState.worldInfo?.worldSetting?.history}
            factions={limitedFactions}
            outline={gameState.outline}
            worldSetting={gameState.worldInfo?.worldSetting}
            themeFont={themeFont}
            worldInfo={gameState.worldInfo}
            unlockMode={gameState.unlockMode}
          />
        );
      case "rag":
        return <RAGPanel progress={embeddingProgress} themeFont={themeFont} />;
      default:
        return null;
    }
  }, [
    activePanel,
    detailOpen,
    embeddingProgress,
    gameState,
    itemContext,
    limitedFactions,
    limitedInventory,
    limitedKnowledge,
    limitedLocations,
    limitedNpcs,
    limitedQuests,
    limitedTimeline,
    listManagementEnabled,
    onUpdateUIState,
    playerActorId,
    playerProfile,
    t,
    themeFont,
    timelineGameState,
  ]);

  const detailTitle = activePanel
    ? cardTitleMap.get(activePanel) || panelLabel(activePanel, t, "Details")
    : t("details") || "Details";

  return (
    <div className="relative">
      <div className={`space-y-2 ${mode === "mobile" ? "pb-3" : ""}`}>
        {panelCards.map((panelCard) => (
          <SidebarPanelShell
            key={panelCard.panel}
            panel={panelCard.panel}
            title={panelCard.title}
            icon={panelCard.icon}
            count={panelCard.count}
            summaryLines={panelCard.summaryLines}
            active={detailOpen && activePanel === panelCard.panel}
            onViewDetails={() => openDetail(panelCard.panel)}
          />
        ))}
      </div>

      <SidebarDetailLayer
        panel={activePanel}
        title={detailTitle}
        isOpen={detailOpen}
        mobile={mode === "mobile"}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        onClose={closeDetail}
      >
        {detailPanelContent}
      </SidebarDetailLayer>
    </div>
  );
};

export const MemoizedSidebarPanelsWorkspace = React.memo(
  SidebarPanelsWorkspace,
);
