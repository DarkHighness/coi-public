import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import {
  ActorBundle,
  NPC,
  ListState,
  Location,
  RelationEdge,
} from "../../types";
import { DetailedListModal } from "../DetailedListModal";
import { useListManagement } from "../../hooks/useListManagement";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { useOptionalRuntimeContext } from "../../runtime/context";
import { resolveLocationDisplayName } from "../../utils/entityDisplay";
import { SidebarTag } from "./SidebarTag";
import { pickFirstText } from "./panelText";

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
    affinity?: number;
    impression?: string;
  };
  unlocked?: boolean;
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
  enableDrag: boolean;
  expandedId: string | number | null;
  isEditMode: boolean;
  draggedId: string | number | null;
  onToggle: (id: string | number) => void;
  onDragStart: (e: React.DragEvent, id: string | number) => void;
  onDragEnter: (e: React.DragEvent, id: string | number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, id: string | number) => void;
  onTogglePin?: (id: string | number) => void;
  isPinned?: (id: string | number) => boolean;
  t: TFunction;
  unlockMode?: boolean;
}

const NpcItem: React.FC<NpcItemProps> = ({
  npc: rel,
  playerActorId,
  playerRelations,
  locations,
  enableDrag,
  expandedId,
  isEditMode,
  draggedId,
  onToggle,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDragEnd,
  onDrop,
  onTogglePin,
  isPinned,
  t,
  unlockMode,
}) => {
  const engine = useOptionalRuntimeContext();
  const clearHighlight = engine?.actions.clearHighlight;
  const pinned = isPinned?.(rel.id) ?? false;
  const isDragging = draggedId === rel.id;
  const isExpanded =
    expandedId !== null &&
    expandedId !== undefined &&
    expandedId.toString() === rel.id.toString();
  const [isHighlight, setIsHighlight] = useState(rel.highlight || false);

  useEffect(() => {
    setIsHighlight(rel.highlight || false);
  }, [rel.highlight]);

  const handleToggle = () => {
    onToggle(rel.id);
    if (isHighlight) {
      setIsHighlight(false);
      clearHighlight?.({ kind: "npcs", id: rel.id.toString() });
    }
  };

  const getLocationName = (locId?: string) => {
    const normalized = typeof locId === "string" ? locId.trim() : "";
    if (!normalized || normalized.toLowerCase() === "unknown") {
      return t("unknown") || "Unknown";
    }
    return (
      resolveLocationDisplayName(normalized, {
        locations: locations || [],
      }) || normalized
    );
  };

  const npcRelations = Array.isArray(rel.relations) ? rel.relations : [];
  const attitude = npcRelations.find(
    (r): r is NpcAttitudeRelation =>
      r.kind === "attitude" &&
      r.to.kind === "character" &&
      r.to.id === playerActorId,
  );

  const perception = playerRelations.find(
    (r): r is NpcPerceptionRelation =>
      r.kind === "perception" &&
      r.to.kind === "character" &&
      r.to.id === String(rel.id),
  );

  const playerKnowsNpc = Array.isArray(rel.knownBy)
    ? rel.knownBy.includes(playerActorId)
    : false;
  const npcUnlockedForPlayer = Boolean(rel.unlocked === true && playerKnowsNpc);
  const playerKnowsAttitude = Array.isArray(attitude?.knownBy)
    ? attitude.knownBy.includes(playerActorId)
    : false;
  const attitudeUnlockedForPlayer = Boolean(
    attitude?.unlocked === true && playerKnowsAttitude,
  );
  const showTrueAttitude = Boolean(unlockMode || attitudeUnlockedForPlayer);
  const trueAffinity =
    typeof attitude?.hidden?.affinity === "number"
      ? attitude.hidden.affinity
      : null;

  return (
    <div
      key={rel.id}
      className={`relative border-l-2 border-b border-theme-divider/60 transition-colors pb-2 group/item
        ${isDragging ? "opacity-60" : "opacity-100"}
        ${isExpanded ? "border-l-theme-primary/70" : "border-l-theme-divider/60 hover:border-l-theme-primary/40"}
        ${isHighlight ? "animate-pulse ring-1 ring-theme-primary/40" : ""}
      `}
      draggable={isEditMode}
      onDragStart={isEditMode ? (e) => onDragStart(e, rel.id) : undefined}
      onDragEnter={isEditMode ? (e) => onDragEnter(e, rel.id) : undefined}
      onDragOver={isEditMode ? onDragOver : undefined}
      onDragEnd={onDragEnd}
      onDrop={isEditMode ? (e) => onDrop(e, rel.id) : undefined}
      onClick={handleToggle}
    >
      <div className="flex-1 min-w-0 py-2 pl-2 pr-1 cursor-pointer hover:bg-theme-surface-highlight/20 transition-colors">
        <div className="flex justify-between items-center min-h-[1.75rem] mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <svg
              className={`w-3.5 h-3.5 text-theme-text-secondary transition-transform duration-200 ${
                isExpanded ? "rotate-90" : ""
              }`}
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
            <span
              className="font-bold text-theme-text text-xs flex items-center gap-1.5 leading-tight min-w-0 break-words whitespace-normal"
              title={rel.visible?.name || t("unknown") || "Unknown"}
            >
              <span className="ui-emoji-slot">
                {getValidIcon(rel.icon, "👤")}
              </span>
              {rel.visible?.name || t("unknown") || "Unknown"}
              {npcUnlockedForPlayer && (
                <svg
                  className="w-3.5 h-3.5 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                </svg>
              )}
            </span>
            <SidebarTag
              className="max-w-[120px] truncate cursor-help shrink-0"
              title={
                rel.visible?.roleTag ||
                rel.visible?.profession ||
                rel.visible?.title ||
                "Unknown"
              }
            >
              {rel.visible?.roleTag ||
                rel.visible?.profession ||
                rel.visible?.title ||
                "Unknown"}
            </SidebarTag>
          </div>
        </div>
        {!isExpanded && (
          <div className="pl-5 text-xs text-theme-text-secondary leading-relaxed line-clamp-2">
            {pickFirstText(
              rel.visible?.description,
              rel.visible?.status,
              rel.hidden?.realMotives,
            ) ||
              t("noDescription") ||
              "No description available."}
          </div>
        )}

        {isExpanded && (
          <div className="overflow-hidden animate-sidebar-expand">
            <div className="pl-2 pr-1 pb-3 pt-0 space-y-3">
              <div className="text-xs text-theme-text-secondary leading-relaxed border-t border-theme-divider/60 pt-2">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                    {t("description") || "Description"}
                  </span>
                  <div className="pl-1">
                    <MarkdownText
                      content={
                        rel.visible?.description ||
                        t("noDescription") ||
                        "No description available."
                      }
                      indentSize={2}
                    />
                  </div>
                </div>
                {rel.visible?.appearance && (
                  <div className="mt-2">
                    <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                      {t("appearance") || "Appearance"}
                    </span>
                    <div className="text-theme-text/90">
                      <MarkdownText
                        content={rel.visible.appearance}
                        indentSize={2}
                      />
                    </div>
                  </div>
                )}
                {rel.visible?.age && (
                  <div className="mt-2">
                    <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                      {t("apparentAge") || "Apparent Age"}
                    </span>
                    <div className="text-theme-text-secondary text-xs">
                      {rel.visible.age}
                    </div>
                  </div>
                )}
                <div className="mt-2">
                  <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                    {t("gameViewer.race") || "Race"}
                  </span>
                  <div className="text-theme-text-secondary text-xs">
                    {rel.visible?.race || t("unknown") || "Unknown"}
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                    {t("gameViewer.gender") || "Gender"}
                  </span>
                  <div className="text-theme-text-secondary text-xs">
                    {rel.visible?.gender || t("unknown") || "Unknown"}
                  </div>
                </div>
                {rel.visible.voice && (
                  <div className="mt-2">
                    <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                      {t("sidebar.npc.voice")}
                    </span>
                    <span className="text-theme-text-secondary text-xs">
                      {rel.visible.voice}
                    </span>
                  </div>
                )}
                {rel.visible.mannerism && (
                  <div className="mt-2">
                    <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                      {t("sidebar.npc.mannerism")}
                    </span>
                    <span className="text-theme-text-secondary text-xs">
                      {rel.visible.mannerism}
                    </span>
                  </div>
                )}
                {rel.visible.mood && (
                  <div className="mt-2">
                    <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                      {t("sidebar.npc.mood")}
                    </span>
                    <span className="text-theme-text-secondary text-xs">
                      {rel.visible.mood}
                    </span>
                  </div>
                )}

                {/* Perceived Status - What protagonist thinks NPC is doing */}
                {rel.visible?.status && (
                  <div className="mt-2">
                    <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                      {t("perceivedStatus") || "Currently (Your Perception)"}
                    </span>
                    <p className="text-theme-text-secondary">
                      {rel.visible.status}
                    </p>
                  </div>
                )}

                {/* Location Display */}
                <div className="mt-2">
                  <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                    {t("gameViewer.currentLocation") || "Location"}
                  </span>
                  <p className="text-theme-text-secondary">
                    {getLocationName(rel.currentLocation)}
                  </p>
                </div>

                {/* NPC -> Player attitude signals (surface, always visible) */}
                {(attitude?.visible?.signals?.length ||
                  attitude?.visible?.reputationTag ||
                  attitude?.visible?.claimedIntent) && (
                  <div className="mt-3">
                    <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                      {t("gameViewer.attitudeSignals", {
                        defaultValue: "Attitude (Signals)",
                      })}
                    </span>
                    <div className="text-theme-text-secondary text-xs space-y-1">
                      {attitude?.visible?.reputationTag && (
                        <div>
                          <span className="uppercase tracking-wider text-[10px] opacity-70">
                            {t("gameViewer.reputationTag", {
                              defaultValue: "Tag",
                            })}
                            :
                          </span>{" "}
                          {attitude.visible.reputationTag}
                        </div>
                      )}
                      {attitude?.visible?.claimedIntent && (
                        <div>
                          <span className="uppercase tracking-wider text-[10px] opacity-70">
                            {t("gameViewer.claimedIntent", {
                              defaultValue: "Claims",
                            })}
                            :
                          </span>{" "}
                          <MarkdownText
                            content={attitude.visible.claimedIntent}
                            inline
                          />
                        </div>
                      )}
                      {Array.isArray(attitude?.visible?.signals) &&
                        attitude.visible.signals.length > 0 && (
                          <ul className="list-disc list-inside space-y-0.5">
                            {attitude.visible.signals.map(
                              (s: string, i: number) => (
                                <li key={i}>
                                  <MarkdownText content={s} inline />
                                </li>
                              ),
                            )}
                          </ul>
                        )}
                    </div>
                  </div>
                )}

                {/* Player -> NPC perception (objective) */}
                {perception?.visible?.description && (
                  <div className="mt-3">
                    <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                      {t("gameViewer.myPerception", {
                        defaultValue: "My Perception",
                      })}
                    </span>
                    <div className="text-theme-text/90 text-xs">
                      <MarkdownText
                        content={perception.visible.description}
                        indentSize={2}
                      />
                      {Array.isArray(perception.visible.evidence) &&
                        perception.visible.evidence.length > 0 && (
                          <div className="mt-2">
                            <span className="text-[10px] uppercase tracking-wider text-theme-primary/70 block mb-0.5">
                              {t("gameViewer.evidence", {
                                defaultValue: "Evidence",
                              })}
                              :
                            </span>
                            <ul className="list-disc list-inside space-y-0.5">
                              {perception.visible.evidence.map(
                                (e: string, i: number) => (
                                  <li key={i}>
                                    <MarkdownText content={e} inline />
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {/* True affinity (hidden by default; shown only if unlockMode or relation.unlocked) */}
                <div className="mt-3">
                  <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                    {t("affinity") || "Affinity"}
                  </span>
                  {showTrueAttitude && trueAffinity !== null ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-theme-text">
                        {Math.round(trueAffinity)}/100
                      </span>
                      {attitude?.hidden?.impression && (
                        <span className="text-theme-text-secondary">
                          <MarkdownText
                            content={attitude.hidden.impression}
                            inline
                          />
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-theme-text-secondary text-xs italic">
                      {t("gameViewer.affinityHidden", {
                        defaultValue:
                          "True attitude is hidden unless confirmed.",
                      })}
                    </div>
                  )}
                </div>

                {/* Unlocked Hidden Truth - Outer Layer */}
                {(unlockMode || npcUnlockedForPlayer) && (
                  <div className="pt-2 mt-2">
                    <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold flex items-center gap-1 mb-1">
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {t("hidden.truth")}
                    </span>

                    {rel.hidden?.realPersonality && (
                      <div className="mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                          {t("hidden.personality")}:
                        </span>
                        <div className="leading-relaxed text-theme-text">
                          <MarkdownText
                            content={rel.hidden.realPersonality}
                            indentSize={2}
                          />
                        </div>
                      </div>
                    )}

                    {rel.hidden?.realMotives && (
                      <div className="mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                          {t("hidden.motives")}:
                        </span>
                        <div className="leading-relaxed text-theme-text">
                          <MarkdownText
                            content={rel.hidden.realMotives}
                            indentSize={2}
                          />
                        </div>
                      </div>
                    )}

                    {rel.hidden?.race && (
                      <div className="mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                          {t("gameViewer.race") || "Race"}:
                        </span>
                        <div className="leading-relaxed text-theme-text">
                          <MarkdownText
                            content={rel.hidden.race}
                            indentSize={2}
                          />
                        </div>
                      </div>
                    )}

                    {rel.hidden?.gender && (
                      <div className="mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                          {t("gameViewer.gender") || "Gender"}:
                        </span>
                        <div className="leading-relaxed text-theme-text">
                          <MarkdownText
                            content={rel.hidden.gender}
                            indentSize={2}
                          />
                        </div>
                      </div>
                    )}

                    {rel.hidden?.routine && (
                      <div className="mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                          {t("hidden.routine") || "Routine"}:
                        </span>
                        <div className="leading-relaxed text-theme-text">
                          <MarkdownText
                            content={rel.hidden.routine}
                            indentSize={2}
                          />
                        </div>
                      </div>
                    )}

                    {rel.hidden?.secrets && rel.hidden.secrets.length > 0 && (
                      <div className="mt-2">
                        <span className="text-[10px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                          {t("hidden.secrets")}:
                        </span>
                        <ul className="list-disc list-inside text-theme-text space-y-0.5">
                          {rel.hidden.secrets.map((secret, i) => (
                            <li key={i}>
                              <MarkdownText
                                content={secret}
                                indentSize={2}
                                inline
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-2">
                      {rel.hidden?.currentThought && (
                        <div className="mb-2 border-l-2 border-theme-primary/30 pl-2">
                          <div className="text-[10px] uppercase tracking-wider text-theme-primary/50 mb-0.5 flex items-center gap-1">
                            <span>💭</span> {t("sidebar.npc.currentThought")}
                          </div>
                          <div className="italic text-theme-primary/70 text-xs">
                            "{rel.hidden.currentThought}"
                          </div>
                        </div>
                      )}
                      {rel.hidden?.trueName && (
                        <div className="flex items-center gap-2 text-xs text-theme-unlocked">
                          <span className="uppercase tracking-wider text-[10px] opacity-70">
                            {t("sidebar.npc.trueName")}:
                          </span>
                          <span>{rel.hidden.trueName}</span>
                        </div>
                      )}
                    </div>

                    {rel.hidden?.status && (
                      <div className="mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                          {t("hidden.actualStatus") || "Actually Doing"}:
                        </span>
                        <div className="leading-relaxed text-theme-text">
                          <MarkdownText
                            content={rel.hidden.status}
                            indentSize={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {isEditMode && (
        <div
          className="cursor-grab active:cursor-grabbing text-theme-text-secondary hover:text-theme-primary p-2 bg-theme-surface-highlight border-l border-theme-divider/60 rounded-r touch-none absolute right-0 top-0 bottom-0 flex items-center justify-center w-8"
          title={t("dragToReorder") || "Drag to reorder"}
          draggable={true}
          onDragStart={(e) => onDragStart(e, rel.id)}
          onClick={(e) => e.stopPropagation()}
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
        </div>
      )}
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
  const playerRelations = useMemo(() => {
    const bundle = (actors || []).find(
      (b) => b?.profile?.id === resolvedPlayerActorId,
    );
    const rels = bundle?.profile?.relations;
    return Array.isArray(rels) ? rels : [];
  }, [actors, resolvedPlayerActorId]);
  const [isOpen, setIsOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localExpandedItemId, setLocalExpandedItemId] = useState<
    string | number | null
  >(null);
  const resolvedExpandedItemId =
    expandedItemId !== undefined ? expandedItemId : localExpandedItemId;

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

  useEffect(() => {
    if (onExpandItem) {
      onExpandItem(null);
      return;
    }
    setLocalExpandedItemId(null);
  }, [unlockMode, resolvedPlayerActorId]);

  // Map NPCs to include ID for useListManagement
  const npcsWithId = useMemo(() => {
    return buildNpcList(npcs, resolvedPlayerActorId, unlockMode);
  }, [npcs, resolvedPlayerActorId, unlockMode]);

  const [isLocalEditMode, setIsLocalEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | number | null>(null);
  const listManagementActive = listManagementEnabled && (isOpen || isModalOpen);
  const isEditMode = globalEditMode ?? isLocalEditMode;
  const allowPanelEditToggle = globalEditMode === undefined;

  const {
    visibleItems,
    allItems,
    togglePin,
    toggleHide,
    reorderItem,
    isPinned,
    isHidden,
  } = useListManagement(npcsWithId, listState, onUpdateList, {
    enabled: listManagementActive,
  });

  const handleDragStart = (e: React.DragEvent, id: string | number) => {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e: React.DragEvent, targetId: string | number) => {
    if (
      !isEditMode ||
      !draggedId ||
      draggedId.toString() === targetId.toString()
    )
      return;
    reorderItem(draggedId, targetId);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string | number) => {
    e.preventDefault();
    setDraggedId(null);
  };

  return (
    <div>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between cursor-pointer group ${
          isOpen ? "mb-4" : "mb-0"
        }`}
      >
        <div
          className={`flex items-center text-theme-primary uppercase text-xs font-bold tracking-widest ${themeFont}`}
        >
          <span className="flex items-center gap-2">
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              ></path>
            </svg>
            {t("npcs") || "NPCs"}
            <SidebarTag className="ml-2 text-theme-text-secondary bg-theme-surface-highlight">
              {npcsWithId.length}
            </SidebarTag>
          </span>
        </div>

        <div className="flex items-center justify-end gap-1 shrink-0 min-w-[6.5rem]">
          {allowPanelEditToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsLocalEditMode(!isEditMode);
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
          )}
          {isEditMode && npcsWithId.length > 0 && (
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
          )}

          <div className="h-8 w-8 grid place-items-center rounded text-theme-text-secondary group-hover:text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors">
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${
                isOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              ></path>
            </svg>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="space-y-2 pt-1 animate-sidebar-expand">
          {visibleItems.length === 0 ? (
            <div className="text-theme-text-secondary text-xs italic py-3 text-center border-t border-theme-divider/60">
              {t("emptyNpcs")}
            </div>
          ) : (
            visibleItems.map((rel) => (
              <NpcItem
                key={rel.id}
                npc={rel}
                playerActorId={resolvedPlayerActorId}
                playerRelations={playerRelations}
                locations={locations}
                enableDrag={true}
                expandedId={resolvedExpandedItemId}
                isEditMode={isEditMode}
                draggedId={draggedId}
                onToggle={toggleItem}
                onDragStart={handleDragStart}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                t={t}
                unlockMode={unlockMode}
              />
            ))
          )}
        </div>
      )}{" "}
      <DetailedListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("npcs")}
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
            enableDrag={dragOptions?.isEditMode || false}
            expandedId={resolvedExpandedItemId}
            isEditMode={dragOptions?.isEditMode || false}
            draggedId={dragOptions?.isDragging ? item.id.toString() : null}
            onToggle={toggleItem}
            onDragStart={dragOptions?.onDragStart || (() => {})}
            onDragEnter={dragOptions?.onDragEnter || (() => {})}
            onDragOver={dragOptions?.onDragOver || (() => {})}
            onDragEnd={dragOptions?.onDragEnd || (() => {})}
            onDrop={dragOptions?.onDrop || (() => {})}
            t={t}
            unlockMode={unlockMode}
          />
        )}
      />
    </div>
  );
};

export const NPCPanel = React.memo(NPCPanelComponent);
