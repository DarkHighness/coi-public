import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { NPC, ListState, Location } from "../../types";
import { DetailedListModal } from "../DetailedListModal";
import { useListManagement } from "../../hooks/useListManagement";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { useOptionalGameEngineContext } from "../../contexts/GameEngineContext";

interface NpcPanelProps {
  npcs: NPC[];
  locations?: Location[];
  themeFont: string;
  listState: ListState;
  onUpdateList: (newState: ListState) => void;
  unlockMode?: boolean;
}

export const buildNpcList = (npcs: NPC[], unlockMode?: boolean) => {
  const safeNpcs = Array.isArray(npcs) ? npcs : [];
  return safeNpcs
    .filter((npc) => unlockMode || npc.known !== false)
    .map((npc, idx) => ({
      ...npc,
      id: npc.id || npc.visible?.name || `unknown-${idx}`,
    }));
};

interface NpcItemProps {
  npc: Omit<NPC, "id"> & { id: string | number };
  locations?: Location[];
  enableDrag: boolean;
  expandedItems: Set<string | number>;
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
  getAffinityColor: (val: number) => string;
  t: TFunction;
}

const NpcItem: React.FC<NpcItemProps> = ({
  npc: rel,
  locations,
  enableDrag,
  expandedItems,
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
  getAffinityColor,
  t,
}) => {
  const engine = useOptionalGameEngineContext();
  const clearHighlight = engine?.actions.clearHighlight;
  const isUnknown = rel.visible?.affinityKnown === false;
  const pinned = isPinned?.(rel.id) ?? false;
  const isDragging = draggedId === rel.id;
  const isExpanded = expandedItems.has(rel.id);
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
    if (!locId || locId === "unknown") return t("unknown") || "Unknown";
    const loc = locations?.find((l) => l.id === locId || l.name === locId);
    return loc ? loc.name : locId;
  };

  return (
    <div
      key={rel.id}
      className={`relative rounded-r-md border-y border-r border-l-4 bg-theme-surface/30 transition-all duration-300 ease-in-out mb-3 group/item
        ${isDragging ? "opacity-50 scale-95" : "opacity-100 scale-100"}
        ${isExpanded ? "border-l-theme-primary border-y-theme-border border-r-theme-border" : "border-l-theme-border/50 border-y-theme-border/30 border-r-theme-border/30 hover:border-l-theme-primary/50"}
        ${isHighlight ? "animate-pulse ring-2 ring-theme-primary/50" : ""}
      `}
      draggable={isEditMode}
      onDragStart={isEditMode ? (e) => onDragStart(e, rel.id) : undefined}
      onDragEnter={isEditMode ? (e) => onDragEnter(e, rel.id) : undefined}
      onDragOver={isEditMode ? onDragOver : undefined}
      onDragEnd={onDragEnd}
      onDrop={isEditMode ? (e) => onDrop(e, rel.id) : undefined}
      onClick={handleToggle}
    >
      <div className="flex-1 min-w-0 p-3 cursor-pointer">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <svg
              className={`w-3.5 h-3.5 text-theme-muted transition-transform duration-200 ${
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
              className="font-bold text-theme-text text-xs flex items-center gap-1 break-words whitespace-normal"
              title={rel.visible?.name || t("unknown") || "Unknown"}
            >
              <span className="mr-1 text-base">
                {getValidIcon(rel.icon, "👤")}
              </span>
              {rel.visible?.name || t("unknown") || "Unknown"}
              {rel.unlocked && (
                <svg
                  className="w-3.5 h-3.5 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                </svg>
              )}
            </span>
            <span
              className="text-[10px] uppercase tracking-wider bg-theme-bg px-2 py-0.5 rounded text-theme-primary border border-theme-border max-w-[120px] truncate cursor-help"
              title={rel.visible?.npcType || "Unknown"}
            >
              {rel.visible?.npcType || "Unknown"}
            </span>
          </div>
        </div>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-3 pb-3 pt-0 space-y-3">
              <div className="text-xs text-theme-muted leading-relaxed border-t border-theme-border/30 pt-2">
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
                    <div className="text-theme-muted/80">
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
                    <div className="text-theme-muted/80 text-xs">
                      {rel.visible.age}
                    </div>
                  </div>
                )}
                {rel.visible?.dialogueStyle && (
                  <div className="mt-2">
                    <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                      {t("sidebar.npc.dialogueStyle")}
                    </span>
                    <span className="text-theme-muted/80 text-xs">
                      {rel.visible.dialogueStyle}
                    </span>
                  </div>
                )}
                {rel.visible.voice && (
                  <div className="mt-2">
                    <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                      {t("sidebar.npc.voice")}
                    </span>
                    <span className="text-theme-muted/80 text-xs">
                      {rel.visible.voice}
                    </span>
                  </div>
                )}
                {rel.visible.mannerism && (
                  <div className="mt-2">
                    <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                      {t("sidebar.npc.mannerism")}
                    </span>
                    <span className="text-theme-muted/80 text-xs">
                      {rel.visible.mannerism}
                    </span>
                  </div>
                )}
                {rel.visible.mood && (
                  <div className="mt-2">
                    <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                      {t("sidebar.npc.mood")}
                    </span>
                    <span className="text-theme-muted/80 text-xs">
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
                    <p className="text-theme-muted/80">{rel.visible.status}</p>
                  </div>
                )}

                {/* Location Display */}
                <div className="mt-2">
                  <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                    {t("location.current") || "Location"}
                  </span>
                  <p className="text-theme-muted/80">
                    {getLocationName(rel.currentLocation)}
                  </p>
                </div>

                {/* Unlocked Hidden Truth - Outer Layer */}
                {rel.unlocked && (
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
                        <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
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
                        <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
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

                    {rel.hidden?.routine && (
                      <div className="mb-2">
                        <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
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
                        <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
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
                      {rel.hidden.currentThought && (
                        <div className="mb-2 border-l-2 border-theme-primary/30 pl-2">
                          <div className="text-[10px] uppercase tracking-wider text-theme-primary/50 mb-0.5 flex items-center gap-1">
                            <span>💭</span> {t("sidebar.npc.currentThought")}
                          </div>
                          <div className="italic text-theme-primary/70 text-xs">
                            "{rel.hidden.currentThought}"
                          </div>
                        </div>
                      )}
                      {rel.hidden.trueName && (
                        <div className="flex items-center gap-2 text-xs text-theme-unlocked">
                          <span className="uppercase tracking-wider text-[10px] opacity-70">
                            {t("sidebar.npc.trueName")}:
                          </span>
                          <span>{rel.hidden.trueName}</span>
                        </div>
                      )}
                      {rel.hidden.realAge && (
                        <div className="flex items-center gap-2 text-xs text-theme-unlocked">
                          <span className="uppercase tracking-wider text-[10px] opacity-70">
                            {t("realAge") || "Real Age"}:
                          </span>
                          <span>{rel.hidden.realAge}</span>
                        </div>
                      )}
                    </div>

                    {rel.hidden?.trueAffinity !== undefined && (
                      <div className="mt-2 text-[10px] flex items-center gap-2">
                        <span className="text-[9px] uppercase tracking-wider text-theme-primary/80">
                          {t("hidden.affinity")}:
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            (rel.hidden.trueAffinity || 0) >
                            (rel.visible?.affinity || 0)
                              ? "text-theme-success"
                              : (rel.hidden.trueAffinity || 0) <
                                  (rel.visible?.affinity || 0)
                                ? "text-theme-error"
                                : "text-theme-text"
                          }`}
                        >
                          {rel.hidden.trueAffinity}%
                        </span>
                      </div>
                    )}

                    {rel.hidden?.impression && (
                      <div className="mb-2">
                        <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                          {t("hidden.npcImpression") ||
                            "NPC's Impression of You"}
                          :
                        </span>
                        <div className="leading-relaxed text-theme-text">
                          <MarkdownText
                            content={rel.hidden.impression}
                            indentSize={2}
                          />
                        </div>
                      </div>
                    )}

                    {rel.hidden?.status && (
                      <div className="mb-2">
                        <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
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

                    {rel.hidden?.ambivalence && (
                      <div className="mb-2">
                        <span className="text-[9px] uppercase tracking-wider text-amber-500/80 block mb-0.5">
                          💔 {t("gameViewer.ambivalence") || "Ambivalence"}:
                        </span>
                        <div className="leading-relaxed text-theme-text">
                          <MarkdownText
                            content={rel.hidden.ambivalence}
                            indentSize={2}
                          />
                        </div>
                      </div>
                    )}

                    {rel.hidden?.transactionalBenefit && (
                      <div className="mb-2">
                        <span className="text-[9px] uppercase tracking-wider text-amber-500/80 block mb-0.5">
                          🤝{" "}
                          {t("gameViewer.transactionalBenefit") ||
                            "Transactional Benefit"}
                          :
                        </span>
                        <div className="leading-relaxed text-theme-text">
                          <MarkdownText
                            content={rel.hidden.transactionalBenefit}
                            indentSize={2}
                          />
                        </div>
                      </div>
                    )}

                    {rel.hidden?.loveExpression && (
                      <div className="mb-2">
                        <span className="text-[9px] uppercase tracking-wider text-pink-500/80 block mb-0.5">
                          💕{" "}
                          {t("gameViewer.loveExpression") ||
                            "How They Show Care"}
                          :
                        </span>
                        <div className="leading-relaxed text-theme-text">
                          <MarkdownText
                            content={rel.hidden.loveExpression}
                            indentSize={2}
                          />
                        </div>
                      </div>
                    )}

                    {rel.hidden?.unspokenSacrifice && (
                      <div className="mb-2">
                        <span className="text-[9px] uppercase tracking-wider text-purple-500/80 block mb-0.5">
                          🎭{" "}
                          {t("gameViewer.unspokenSacrifice") ||
                            "Unspoken Sacrifice"}
                          :
                        </span>
                        <div className="leading-relaxed text-theme-text">
                          <MarkdownText
                            content={rel.hidden.unspokenSacrifice}
                            indentSize={2}
                          />
                        </div>
                      </div>
                    )}

                    {rel.hidden?.inventory &&
                      rel.hidden.inventory.length > 0 && (
                        <div className="mt-2">
                          <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                            {t("hidden.inventory") || "Possessions"}:
                          </span>
                          <ul className="list-disc list-inside text-theme-text space-y-0.5">
                            {rel.hidden.inventory.map((item, i) => (
                              <li key={i}>
                                <MarkdownText
                                  content={item}
                                  indentSize={2}
                                  inline
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Affinity Bar */}
              <div className="flex items-center gap-2 text-[10px] pt-2 border-t border-theme-border/30">
                <span className="text-theme-muted font-bold">
                  {t("affinity") || "Affinity"}
                </span>
                <div className="flex-1 h-1.5 bg-theme-bg rounded-full overflow-hidden border border-theme-border/50 relative">
                  {isUnknown ? (
                    <div className="w-full h-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')] opacity-20"></div>
                  ) : (
                    <div
                      className={`h-full ${getAffinityColor(rel.visible?.affinity || 0)} transition-all duration-500`}
                      style={{ width: `${rel.visible?.affinity || 0}%` }}
                    ></div>
                  )}
                </div>
                <span className="text-theme-text w-8 text-right font-mono">
                  {isUnknown ? t("unknown") : `${rel.visible?.affinity || 0}%`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isEditMode && (
        <div
          className="cursor-grab active:cursor-grabbing text-theme-muted hover:text-theme-primary p-2 bg-theme-surface-highlight border-l border-theme-border rounded-r touch-none absolute right-0 top-0 bottom-0 flex items-center justify-center w-8"
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

export const NPCPanel: React.FC<NpcPanelProps> = ({
  npcs = [],
  locations = [],
  themeFont,
  listState,
  onUpdateList,
  unlockMode = false,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string | number>>(
    new Set(),
  );

  const toggleItem = (id: string | number) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedItems(newSet);
  };

  // Map NPCs to include ID for useListManagement
  const npcsWithId = useMemo(() => {
    return buildNpcList(npcs, unlockMode);
  }, [npcs, unlockMode]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | number | null>(null);

  const {
    visibleItems,
    allItems,
    togglePin,
    toggleHide,
    reorderItem,
    isPinned,
    isHidden,
  } = useListManagement(npcsWithId, listState, onUpdateList);

  const getAffinityColor = (val: number) => {
    if (val >= 80) return "bg-green-500"; // Love/Loyal
    if (val >= 60) return "bg-blue-400"; // Friendly
    if (val >= 40) return "bg-yellow-500"; // Neutral
    if (val >= 20) return "bg-orange-500"; // Dislike
    return "bg-red-600"; // Hated/Enemy
  };

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
            <span className="ml-2 text-[10px] text-theme-muted bg-theme-surface-highlight px-1.5 rounded border border-theme-border">
              {npcsWithId.length}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditMode(!isEditMode);
            }}
            className={`p-1 rounded transition-colors ${
              isEditMode
                ? "bg-theme-primary text-theme-bg"
                : "text-theme-muted hover:text-theme-primary"
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

          {allItems.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="text-theme-muted hover:text-theme-primary p-1"
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

          <div className="text-theme-muted group-hover:text-theme-primary p-1 transition-colors">
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
      <div
        className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 pt-1">
            {visibleItems.length === 0 ? (
              <div className="text-theme-muted text-xs italic p-3 border border-dashed border-theme-border/50 rounded text-center bg-theme-surface-highlight/10">
                {t("emptyNpcs")}
              </div>
            ) : (
              visibleItems.map((rel, idx) => (
                <NpcItem
                  key={rel.id}
                  npc={rel}
                  locations={locations}
                  enableDrag={true}
                  expandedItems={expandedItems}
                  isEditMode={isEditMode}
                  draggedId={draggedId}
                  onToggle={toggleItem}
                  onDragStart={handleDragStart}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop}
                  getAffinityColor={getAffinityColor}
                  t={t}
                />
              ))
            )}
          </div>
        </div>
      </div>{" "}
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
            locations={locations}
            enableDrag={dragOptions?.isEditMode || false}
            expandedItems={expandedItems}
            isEditMode={dragOptions?.isEditMode || false}
            draggedId={dragOptions?.isDragging ? item.id.toString() : null}
            onToggle={toggleItem}
            onDragStart={dragOptions?.onDragStart || (() => {})}
            onDragEnter={dragOptions?.onDragEnter || (() => {})}
            onDragOver={dragOptions?.onDragOver || (() => {})}
            onDragEnd={dragOptions?.onDragEnd || (() => {})}
            onDrop={dragOptions?.onDrop || (() => {})}
            getAffinityColor={getAffinityColor}
            t={t}
          />
        )}
      />
    </div>
  );
};
