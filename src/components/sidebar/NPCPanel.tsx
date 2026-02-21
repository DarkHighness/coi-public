import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActorBundle,
  ListState,
  Location,
  NPC,
  RelationEdge,
} from "../../types";
import { DetailedListModal } from "../DetailedListModal";
import { useListManagement } from "../../hooks/useListManagement";
import { useProgressiveRender } from "../../hooks/useProgressiveRender";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { useOptionalRuntimeContext } from "../../runtime/context";
import { resolveLocationDisplayName } from "../../utils/entityDisplay";
import { SidebarTag } from "./SidebarTag";
import { SidebarEntityRow } from "./SidebarEntityRow";
import { SidebarField, SidebarSection } from "./SidebarSections";
import { SidebarLoadMoreSentinel } from "./SidebarLoadMoreSentinel";
import { pickFirstText } from "./panelText";
import { SidebarPanelHeader } from "./SidebarPanelHeader";

interface NpcPanelProps {
  npcs: NPC[];
  actors?: ActorBundle[];
  playerActorId?: string;
  locations?: Location[];
  themeFont: string;
  listState: ListState;
  onUpdateList: (newState: ListState) => void;
  unlockMode?: boolean;
  listManagementEnabled?: boolean;
  globalEditMode?: boolean;
  expandedItemId?: string | null;
  onExpandItem?: (itemId: string | null) => void;
}

export const buildNpcList = (
  npcs: NPC[],
  playerActorId: string,
  unlockMode?: boolean,
) => {
  const safeNpcs = Array.isArray(npcs) ? npcs : [];
  return safeNpcs
    .filter(
      (npc) =>
        unlockMode ||
        !Array.isArray(npc.knownBy) ||
        npc.knownBy.includes(playerActorId),
    )
    .map((npc, idx) => ({
      ...npc,
      id: npc.id || npc.visible?.name || `unknown-${idx}`,
    }));
};

type NpcAttitudeRelation = RelationEdge & {
  kind: "attitude";
  to: { kind: "character"; id: string };
  knownBy?: string[];
  visible: {
    signals?: string[];
    reputationTag?: string;
    claimedIntent?: string;
  };
  hidden?: {
    affinity?: string;
    impression?: string;
    observation?: string;
    ambivalence?: string;
    transactionalBenefit?: string;
    motives?: string;
    currentThought?: string;
  };
  unlocked?: boolean;
  unlockReason?: string;
};

type NpcPerceptionRelation = RelationEdge & {
  kind: "perception";
  to: { kind: "character"; id: string };
  visible: {
    description: string;
    evidence?: string[];
  };
};

interface NpcItemProps {
  npc: Omit<NPC, "id"> & { id: string | number };
  playerActorId: string;
  playerRelations: RelationEdge[];
  locations?: Location[];
  expandedId: string | number | null;
  isEditMode: boolean;
  isDragging: boolean;
  onToggle: (id: string | number) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onTogglePin?: () => void;
  isPinned?: boolean;
  unlockMode?: boolean;
}

const NpcItem: React.FC<NpcItemProps> = ({
  npc,
  playerActorId,
  playerRelations,
  locations,
  expandedId,
  isEditMode,
  isDragging,
  onToggle,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop,
  onDragEnd,
  onTogglePin,
  isPinned,
  unlockMode,
}) => {
  const { t } = useTranslation();
  const engine = useOptionalRuntimeContext();
  const clearHighlight = engine?.actions.clearHighlight;
  const isExpanded = expandedId?.toString() === npc.id.toString();
  const [isHighlight, setIsHighlight] = useState(npc.highlight || false);

  useEffect(() => {
    setIsHighlight(npc.highlight || false);
  }, [npc.highlight]);

  const npcRelations = Array.isArray(npc.relations) ? npc.relations : [];
  const attitude = npcRelations.find(
    (relation): relation is NpcAttitudeRelation =>
      relation.kind === "attitude" &&
      relation.to.kind === "character" &&
      relation.to.id === playerActorId,
  );

  const perception = playerRelations.find(
    (relation): relation is NpcPerceptionRelation =>
      relation.kind === "perception" &&
      relation.to.kind === "character" &&
      relation.to.id === String(npc.id),
  );

  const playerKnowsNpc = Array.isArray(npc.knownBy)
    ? npc.knownBy.includes(playerActorId)
    : false;
  const npcUnlockedForPlayer = Boolean(npc.unlocked === true && playerKnowsNpc);
  const playerKnowsAttitude = Array.isArray(attitude?.knownBy)
    ? attitude.knownBy.includes(playerActorId)
    : false;
  const attitudeUnlockedForPlayer = Boolean(
    attitude?.unlocked === true && playerKnowsAttitude,
  );
  const showTrueAttitude = Boolean(unlockMode || attitudeUnlockedForPlayer);
  const trueAffinity =
    typeof attitude?.hidden?.affinity === "string" &&
    attitude.hidden.affinity.trim().length > 0
      ? attitude.hidden.affinity.trim()
      : null;

  const getLocationName = (locationId?: string) => {
    const normalized = typeof locationId === "string" ? locationId.trim() : "";
    if (!normalized || normalized.toLowerCase() === "unknown") {
      return t("unknown") || "Unknown";
    }
    return (
      resolveLocationDisplayName(normalized, {
        locations: locations || [],
      }) || normalized
    );
  };

  return (
    <div
      className={`${isDragging ? "opacity-60" : ""}`.trim()}
      draggable={Boolean(isEditMode)}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {isEditMode && onTogglePin ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          className={`absolute right-8 mt-2 z-10 p-1 rounded transition-colors ${
            isPinned
              ? "text-theme-primary"
              : "text-theme-text-secondary hover:text-theme-primary"
          }`}
          title={isPinned ? t("unpin") : t("pin")}
        >
          <svg
            className="w-3.5 h-3.5"
            fill={isPinned ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        </button>
      ) : null}

      <SidebarEntityRow
        title={npc.visible?.name || t("unknown") || "Unknown"}
        icon={getValidIcon(npc.icon, "👤")}
        tags={
          <>
            {npc.visible?.roleTag ||
            npc.visible?.profession ||
            npc.visible?.title ? (
              <SidebarTag className="text-theme-text-secondary border-theme-divider/70 text-[10px]">
                {npc.visible?.roleTag ||
                  npc.visible?.profession ||
                  npc.visible?.title}
              </SidebarTag>
            ) : null}
            {npcUnlockedForPlayer || unlockMode ? (
              <SidebarTag className="text-theme-primary border-theme-primary/60">
                {t("unlocked") || "Unlocked"}
              </SidebarTag>
            ) : null}
          </>
        }
        summary={pickFirstText(
          npc.visible?.description,
          npc.visible?.status,
          npc.hidden?.realMotives,
        )}
        isExpanded={isExpanded}
        onToggle={() => {
          if (isEditMode) {
            return;
          }
          onToggle(npc.id);
          if (isHighlight) {
            setIsHighlight(false);
            clearHighlight?.({ kind: "npcs", id: npc.id.toString() });
          }
        }}
        className={isHighlight ? "ring-1 ring-theme-primary/40" : ""}
        accentClassName={
          isExpanded ? "border-l-theme-primary/70" : "border-l-theme-divider/70"
        }
      >
        <div className="pl-2 pr-1 pb-3 text-xs text-theme-text">
          <SidebarSection title={t("visible") || "Visible"} withDivider={false}>
            <SidebarField label={t("description") || "Description"}>
              <MarkdownText
                content={
                  npc.visible?.description ||
                  t("noDescription") ||
                  "No description available."
                }
                indentSize={2}
              />
            </SidebarField>

            {npc.visible?.appearance ? (
              <SidebarField label={t("appearance") || "Appearance"}>
                <MarkdownText content={npc.visible.appearance} indentSize={2} />
              </SidebarField>
            ) : null}

            {npc.visible?.age ? (
              <SidebarField label={t("apparentAge") || "Apparent Age"}>
                {npc.visible.age}
              </SidebarField>
            ) : null}

            <SidebarField label={t("gameViewer.race") || "Race"}>
              {npc.visible?.race || t("unknown") || "Unknown"}
            </SidebarField>

            <SidebarField label={t("gameViewer.gender") || "Gender"}>
              {npc.visible?.gender || t("unknown") || "Unknown"}
            </SidebarField>

            {npc.visible?.status ? (
              <SidebarField label={t("perceivedStatus") || "Status"}>
                {npc.visible.status}
              </SidebarField>
            ) : null}

            {npc.visible?.profession ? (
              <SidebarField label={t("profession") || "Profession"}>
                {npc.visible.profession}
              </SidebarField>
            ) : null}

            {npc.visible?.title ? (
              <SidebarField label={t("title") || "Title"}>
                {npc.visible.title}
              </SidebarField>
            ) : null}

            {npc.visible?.background ? (
              <SidebarField label={t("background") || "Background"}>
                <MarkdownText content={npc.visible.background} indentSize={2} />
              </SidebarField>
            ) : null}

            {npc.visible?.voice ? (
              <SidebarField label={t("sidebar.npc.voice") || "Voice"}>
                {npc.visible.voice}
              </SidebarField>
            ) : null}

            {npc.visible?.mannerism ? (
              <SidebarField label={t("sidebar.npc.mannerism") || "Mannerism"}>
                {npc.visible.mannerism}
              </SidebarField>
            ) : null}

            {npc.visible?.mood ? (
              <SidebarField label={t("sidebar.npc.mood") || "Mood"}>
                {npc.visible.mood}
              </SidebarField>
            ) : null}

            <SidebarField label={t("gameViewer.currentLocation") || "Location"}>
              {getLocationName(npc.currentLocation)}
            </SidebarField>

            {attitude?.visible?.signals?.length ||
            attitude?.visible?.reputationTag ||
            attitude?.visible?.claimedIntent ? (
              <SidebarField
                label={t("gameViewer.attitudeSignals", {
                  defaultValue: "Attitude (Signals)",
                })}
              >
                <div className="space-y-1">
                  {attitude?.visible?.reputationTag ? (
                    <div>
                      <span className="text-theme-text-secondary mr-1">
                        {t("gameViewer.reputationTag", { defaultValue: "Tag" })}
                        :
                      </span>
                      {attitude.visible.reputationTag}
                    </div>
                  ) : null}
                  {attitude?.visible?.claimedIntent ? (
                    <div>
                      <span className="text-theme-text-secondary mr-1">
                        {t("gameViewer.claimedIntent", {
                          defaultValue: "Claims",
                        })}
                        :
                      </span>
                      <MarkdownText
                        content={attitude.visible.claimedIntent}
                        indentSize={2}
                        inline
                      />
                    </div>
                  ) : null}
                  {attitude?.visible?.signals?.length ? (
                    <ul className="list-disc list-inside space-y-1">
                      {attitude.visible.signals.map((signal, index) => (
                        <li key={`${signal}-${index}`}>
                          <MarkdownText content={signal} inline />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </SidebarField>
            ) : null}

            {perception?.visible?.description ? (
              <SidebarField
                label={t("gameViewer.myPerception", {
                  defaultValue: "My Perception",
                })}
              >
                <div className="space-y-1">
                  <MarkdownText
                    content={perception.visible.description}
                    indentSize={2}
                  />
                  {perception.visible.evidence?.length ? (
                    <ul className="list-disc list-inside space-y-1">
                      {perception.visible.evidence.map((evidence, index) => (
                        <li key={`${evidence}-${index}`}>
                          <MarkdownText content={evidence} inline />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </SidebarField>
            ) : null}
          </SidebarSection>

          {(unlockMode || npcUnlockedForPlayer) && npc.hidden ? (
            <SidebarSection
              title={t("hidden.truth") || "Hidden"}
              className="sidebar-hidden-divider"
            >
              {npc.hidden.realPersonality ? (
                <SidebarField label={t("hidden.personality") || "Personality"}>
                  <MarkdownText
                    content={npc.hidden.realPersonality}
                    indentSize={2}
                  />
                </SidebarField>
              ) : null}

              {npc.hidden.realMotives ? (
                <SidebarField label={t("hidden.motives") || "Motives"}>
                  <MarkdownText
                    content={npc.hidden.realMotives}
                    indentSize={2}
                  />
                </SidebarField>
              ) : null}

              {npc.hidden.routine ? (
                <SidebarField label={t("hidden.routine") || "Routine"}>
                  <MarkdownText content={npc.hidden.routine} indentSize={2} />
                </SidebarField>
              ) : null}

              {npc.hidden.currentThought ? (
                <SidebarField
                  label={t("sidebar.npc.currentThought") || "Current Thought"}
                >
                  <MarkdownText
                    content={npc.hidden.currentThought}
                    indentSize={2}
                  />
                </SidebarField>
              ) : null}

              {npc.hidden.status ? (
                <SidebarField
                  label={t("hidden.actualStatus") || "Actual Status"}
                >
                  <MarkdownText content={npc.hidden.status} indentSize={2} />
                </SidebarField>
              ) : null}

              {npc.hidden.race ? (
                <SidebarField label={t("gameViewer.race") || "Race"}>
                  {npc.hidden.race}
                </SidebarField>
              ) : null}

              {npc.hidden.gender ? (
                <SidebarField label={t("gameViewer.gender") || "Gender"}>
                  {npc.hidden.gender}
                </SidebarField>
              ) : null}

              {npc.hidden.trueName ? (
                <SidebarField label={t("sidebar.npc.trueName") || "True Name"}>
                  {npc.hidden.trueName}
                </SidebarField>
              ) : null}

              {npc.hidden.secrets?.length ? (
                <SidebarField label={t("hidden.secrets") || "Secrets"}>
                  <ul className="list-disc list-inside space-y-1">
                    {npc.hidden.secrets.map((secret, index) => (
                      <li key={`${secret}-${index}`}>
                        <MarkdownText content={secret} indentSize={2} inline />
                      </li>
                    ))}
                  </ul>
                </SidebarField>
              ) : null}

              {npc.unlockReason ? (
                <SidebarField label={t("unlockReason") || "Unlock Reason"}>
                  <MarkdownText content={npc.unlockReason} indentSize={2} />
                </SidebarField>
              ) : null}

              {showTrueAttitude && attitude?.hidden?.observation ? (
                <SidebarField
                  label={
                    t("sidebar.npc.observation") ||
                    t("observation") ||
                    "Observation"
                  }
                >
                  <MarkdownText
                    content={attitude.hidden.observation}
                    indentSize={2}
                  />
                </SidebarField>
              ) : null}

              {showTrueAttitude && attitude?.hidden?.ambivalence ? (
                <SidebarField
                  label={t("gameViewer.ambivalence") || "Ambivalence"}
                >
                  <MarkdownText
                    content={attitude.hidden.ambivalence}
                    indentSize={2}
                  />
                </SidebarField>
              ) : null}

              {showTrueAttitude && attitude?.hidden?.transactionalBenefit ? (
                <SidebarField
                  label={
                    t("gameViewer.transactionalBenefit") ||
                    "Transactional Benefit"
                  }
                >
                  <MarkdownText
                    content={attitude.hidden.transactionalBenefit}
                    indentSize={2}
                  />
                </SidebarField>
              ) : null}

              {showTrueAttitude && attitude?.hidden?.motives ? (
                <SidebarField label={t("hidden.motives") || "Motives"}>
                  <MarkdownText
                    content={attitude.hidden.motives}
                    indentSize={2}
                  />
                </SidebarField>
              ) : null}

              {showTrueAttitude && attitude?.hidden?.currentThought ? (
                <SidebarField
                  label={
                    t("gameViewer.currentThought") ||
                    t("sidebar.npc.currentThought") ||
                    "Current Thought"
                  }
                >
                  <MarkdownText
                    content={attitude.hidden.currentThought}
                    indentSize={2}
                  />
                </SidebarField>
              ) : null}
            </SidebarSection>
          ) : null}

          <SidebarSection title={t("meta") || "Meta"}>
            <SidebarField label={t("affinity") || "Affinity"}>
              {showTrueAttitude && trueAffinity ? (
                <MarkdownText content={trueAffinity} indentSize={2} />
              ) : (
                <span className="italic text-theme-text-secondary">
                  {t("gameViewer.affinityHidden", {
                    defaultValue: "True attitude is hidden unless confirmed.",
                  })}
                </span>
              )}
            </SidebarField>

            {showTrueAttitude && attitude?.hidden?.impression ? (
              <SidebarField label={t("gameViewer.impression") || "Impression"}>
                <MarkdownText
                  content={attitude.hidden.impression}
                  indentSize={2}
                />
              </SidebarField>
            ) : null}

            {showTrueAttitude && attitude?.unlockReason ? (
              <SidebarField label={t("unlockReason") || "Unlock Reason"}>
                <MarkdownText content={attitude.unlockReason} indentSize={2} />
              </SidebarField>
            ) : null}
          </SidebarSection>
        </div>
      </SidebarEntityRow>
    </div>
  );
};

const NPCPanelComponent: React.FC<NpcPanelProps> = ({
  npcs = [],
  actors,
  playerActorId,
  locations = [],
  themeFont,
  listState,
  onUpdateList,
  unlockMode = false,
  listManagementEnabled = true,
  globalEditMode,
  expandedItemId,
  onExpandItem,
}) => {
  const { t } = useTranslation();
  const resolvedPlayerActorId = playerActorId || "char:player";
  const [isOpen, setIsOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localExpandedItemId, setLocalExpandedItemId] = useState<
    string | number | null
  >(null);
  const resolvedExpandedItemId =
    expandedItemId !== undefined ? expandedItemId : localExpandedItemId;
  const [isLocalEditMode, setIsLocalEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | number | null>(null);

  const playerRelations = useMemo(() => {
    const bundle = (actors || []).find(
      (item) => item?.profile?.id === resolvedPlayerActorId,
    );
    const relations = bundle?.profile?.relations;
    return Array.isArray(relations) ? relations : [];
  }, [actors, resolvedPlayerActorId]);

  const npcsWithId = useMemo(
    () => buildNpcList(npcs, resolvedPlayerActorId, unlockMode),
    [npcs, resolvedPlayerActorId, unlockMode],
  );

  useEffect(() => {
    if (onExpandItem) {
      onExpandItem(null);
      return;
    }
    setLocalExpandedItemId(null);
  }, [unlockMode, resolvedPlayerActorId]);

  const listManagementActive = listManagementEnabled && (isOpen || isModalOpen);
  const isEditMode = globalEditMode ?? isLocalEditMode;
  const allowPanelEditToggle = globalEditMode === undefined;

  const {
    visibleItems: managedVisibleItems,
    allItems,
    togglePin,
    toggleHide,
    reorderItem,
    isPinned,
    isHidden,
  } = useListManagement(npcsWithId, listState, onUpdateList, {
    enabled: listManagementActive,
  });

  const { visibleItems, hasMore, loadMore } = useProgressiveRender(
    managedVisibleItems,
    30,
    isOpen,
  );

  const toggleItem = (id: string | number) => {
    const targetId = id.toString();
    const next =
      resolvedExpandedItemId?.toString() === targetId ? null : targetId;
    if (onExpandItem) {
      onExpandItem(next);
      return;
    }
    setLocalExpandedItemId(next);
  };

  const handleDragStart = (e: React.DragEvent, id: string | number) => {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (_e: React.DragEvent, targetId: string | number) => {
    if (
      !isEditMode ||
      !draggedId ||
      draggedId.toString() === targetId.toString()
    ) {
      return;
    }
    reorderItem(draggedId, targetId);
  };

  const clearDragState = () => setDraggedId(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <div>
      <SidebarPanelHeader
        title={t("npcs") || "NPCs"}
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"
            ></path>
          </svg>
        }
        count={npcsWithId.length}
        isOpen={isOpen}
        onToggle={() => setIsOpen((prev) => !prev)}
        themeFont={themeFont}
        openMarginClassName="mb-4"
        actions={
          <>
            {allowPanelEditToggle ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLocalEditMode((prev) => !prev);
                }}
                className={`h-8 w-8 grid place-items-center rounded transition-colors ${
                  isEditMode
                    ? "bg-theme-primary text-theme-bg"
                    : "text-theme-text-secondary hover:text-theme-primary hover:bg-theme-surface-highlight/15"
                }`}
                title={isEditMode ? t("done") : t("edit")}
              >
                {isEditMode ? (
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
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
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                )}
              </button>
            ) : null}
            {isEditMode && npcsWithId.length > 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModalOpen(true);
                }}
                className="h-8 w-8 grid place-items-center rounded text-theme-text-secondary hover:text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors"
                title={t("viewAll")}
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
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            ) : null}
          </>
        }
      />

      {isOpen && (
        <div className="space-y-2 animate-sidebar-expand">
          {visibleItems.length === 0 ? (
            <div className="text-theme-text-secondary text-xs italic py-3 text-center border-t border-theme-divider/60">
              {t("emptyNpcs")}
            </div>
          ) : (
            <>
              {visibleItems.map((npc) => (
                <NpcItem
                  key={npc.id}
                  npc={npc}
                  playerActorId={resolvedPlayerActorId}
                  playerRelations={playerRelations}
                  locations={locations}
                  expandedId={resolvedExpandedItemId}
                  isEditMode={isEditMode}
                  isDragging={draggedId?.toString() === npc.id.toString()}
                  onToggle={toggleItem}
                  onDragStart={
                    isEditMode ? (e) => handleDragStart(e, npc.id) : undefined
                  }
                  onDragEnter={
                    isEditMode ? (e) => handleDragEnter(e, npc.id) : undefined
                  }
                  onDragOver={isEditMode ? handleDragOver : undefined}
                  onDrop={
                    isEditMode
                      ? (e) => {
                          e.preventDefault();
                          clearDragState();
                        }
                      : undefined
                  }
                  onDragEnd={clearDragState}
                  onTogglePin={() => togglePin(npc.id)}
                  isPinned={isPinned(npc.id)}
                  unlockMode={unlockMode}
                />
              ))}
              <SidebarLoadMoreSentinel enabled={hasMore} onVisible={loadMore} />
            </>
          )}
        </div>
      )}

      <DetailedListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("npcs") || "NPCs"}
        items={allItems}
        themeFont={themeFont}
        enableEditMode={true}
        onReorderItem={reorderItem}
        onTogglePin={togglePin}
        isPinned={isPinned}
        onToggleHide={toggleHide}
        isHidden={isHidden}
        searchFilter={(item, query) =>
          (item.visible?.name || "")
            .toLowerCase()
            .includes(query.toLowerCase()) ||
          (item.visible?.description || "")
            .toLowerCase()
            .includes(query.toLowerCase())
        }
        renderItem={(item, dragOptions) => (
          <NpcItem
            key={item.id}
            npc={item}
            playerActorId={resolvedPlayerActorId}
            playerRelations={playerRelations}
            locations={locations}
            expandedId={resolvedExpandedItemId}
            isEditMode={Boolean(dragOptions?.isEditMode)}
            isDragging={Boolean(dragOptions?.isDragging)}
            onToggle={toggleItem}
            onDragStart={dragOptions?.onDragStart}
            onDragEnter={dragOptions?.onDragEnter}
            onDragOver={dragOptions?.onDragOver}
            onDrop={dragOptions?.onDrop}
            onDragEnd={dragOptions?.onDragEnd}
            unlockMode={unlockMode}
          />
        )}
      />
    </div>
  );
};

export const NPCPanel = React.memo(NPCPanelComponent);
