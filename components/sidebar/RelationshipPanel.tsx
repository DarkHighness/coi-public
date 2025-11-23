import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Relationship, ListState } from "../../types";
import { DetailedListModal } from "../DetailedListModal";
import { useListManagement } from "../../hooks/useListManagement";

interface RelationshipPanelProps {
  relationships: Relationship[];
  themeFont: string;
  listState: ListState;
  onUpdateList: (newState: ListState) => void;
}

export const RelationshipPanel: React.FC<RelationshipPanelProps> = ({
  relationships = [],
  themeFont,
  listState,
  onUpdateList,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const safeRelationships = Array.isArray(relationships) ? relationships : [];
  const DISPLAY_LIMIT = 5;

  // Map relationships to include ID for useListManagement
  const relationshipsWithId = useMemo(() => {
    return safeRelationships.map((r) => ({ ...r, id: r.id || r.name }));
  }, [safeRelationships]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | number | null>(null);

  const { visibleItems, allItems, togglePin, reorderItem, isPinned } =
    useListManagement(
      relationshipsWithId,
      listState,
      onUpdateList,
      DISPLAY_LIMIT,
    );

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
    if (!isEditMode || !draggedId || draggedId.toString() === targetId.toString()) return;
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

  const renderRelationship = (
    rel: Omit<Relationship, "id"> & { id: string | number },
    idx: number,
    enableDrag: boolean = false,
  ) => {
    const isUnknown = rel.affinityKnown === false;
    const pinned = isPinned(rel.id);
    const isDragging = draggedId === rel.id;

    return (
      <div
        key={rel.id}
        className={`bg-theme-surface-highlight/30 rounded border border-theme-border transition-all duration-300 ease-in-out mb-2 group/item flex items-center gap-1 ${
          isDragging ? "opacity-50 scale-95" : "opacity-100 scale-100"
        }`}
        draggable={isEditMode}
        onDragStart={isEditMode ? (e) => handleDragStart(e, rel.id) : undefined}
        onDragEnter={isEditMode ? (e) => handleDragEnter(e, rel.id) : undefined}
        onDragOver={isEditMode ? handleDragOver : undefined}
        onDragEnd={handleDragEnd}
        onDrop={isEditMode ? (e) => handleDrop(e, rel.id) : undefined}
      >
        <div className="flex-1 min-w-0 p-3">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-bold text-theme-text text-sm truncate">
                {rel.name}
              </span>
              <span
                className="text-[10px] uppercase tracking-wider bg-theme-bg px-2 py-0.5 rounded text-theme-primary border border-theme-border max-w-20 truncate cursor-help"
                title={rel.visible?.status || "Unknown"}
              >
                {rel.visible?.status || "Unknown"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePin(rel.id);
                }}
                className={`p-1 rounded hover:bg-theme-bg transition-colors ${
                  pinned
                    ? "text-theme-primary"
                    : "text-theme-muted hover:text-theme-text opacity-0 group-hover/item:opacity-100"
                }`}
                title={pinned ? "Unpin" : "Pin to top"}
              >
                <svg
                  className="w-3 h-3"
                  fill={pinned ? "currentColor" : "none"}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  ></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="text-xs text-theme-muted italic mb-2 leading-snug space-y-2">
             <div>
               <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-0.5">{t("description") || "Description"}</span>
               <p className="pl-1">{rel.visible?.description || t("noDescription") || "No description available."}</p>
             </div>
             {rel.visible?.appearance && (
               <div>
                 <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-0.5">{t("appearance") || "Appearance"}</span>
                 <p className="text-theme-muted/80 border-l-2 border-theme-border pl-2">
                   {rel.visible.appearance}
                 </p>
               </div>
             )}
             {rel.visible?.currentImpression && (
               <div>
                 <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-0.5">{t("currentImpression") || "Current Impression"}</span>
                 <p className="text-theme-muted/80 border-l-2 border-theme-border pl-2 italic text-theme-accent">
                   {rel.visible.currentImpression}
                 </p>
               </div>
             )}
          </div>

          {/* Affinity Bar */}
          <div className="flex items-center gap-2 text-[10px] pt-2 border-t border-theme-border/30">
            <span className="text-theme-muted font-bold">{t("affinity") || "Affinity"}</span>
            <div className="flex-1 h-1.5 bg-theme-bg rounded-full overflow-hidden border border-theme-border/50 relative">
              {isUnknown ? (
                <div className="w-full h-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')] opacity-20"></div>
              ) : (
                <div
                  className={`h-full ${getAffinityColor(rel.affinity)} transition-all duration-500`}
                  style={{ width: `${rel.affinity}%` }}
                ></div>
              )}
            </div>
            <span className="text-theme-text w-8 text-right font-mono">
              {isUnknown ? t("unknown") : `${rel.affinity}%`}
            </span>
          </div>
        </div>

        {isEditMode && (
          <div
            className="cursor-grab active:cursor-grabbing text-theme-muted hover:text-theme-primary p-2 bg-theme-surface-highlight border-l border-theme-border rounded-r touch-none self-stretch flex items-center justify-center"
            title="Drag to reorder"
            draggable={true}
            onDragStart={(e) => handleDragStart(e, rel.id)}
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

  return (
    <div>
      <div className={`flex items-center justify-between ${isOpen ? "mb-3" : "mb-0"}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center text-theme-primary uppercase text-xs font-bold tracking-widest group ${themeFont}`}
        >
          <svg
            className="w-4 h-4 mr-2"
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
          {t("relationships")}
          <span className="ml-2 text-[10px] text-theme-muted bg-theme-surface-highlight px-1.5 rounded border border-theme-border">
            {allItems.length}
          </span>
        </button>

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
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            )}
          </button>

          {allItems.length > DISPLAY_LIMIT && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="text-theme-muted hover:text-theme-primary p-1"
              title={t("viewAll")}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <button onClick={() => setIsOpen(!isOpen)} className="text-theme-muted hover:text-theme-primary p-1">
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
        </div>
      </div>
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="space-y-3">
          {visibleItems.length === 0 ? (
            <div className="text-theme-muted text-xs italic p-3 border border-dashed border-theme-border/50 rounded text-center bg-theme-surface-highlight/10">
              {t("emptyRelationships")}
            </div>
          ) : (
            visibleItems.map((rel, idx) => renderRelationship(rel, idx, true))
          )}
        </div>
      </div>{" "}
      <DetailedListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("relationships")}
        items={allItems}
        themeFont={themeFont}
        searchFilter={(item, query) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          (item.visible?.description || "").toLowerCase().includes(query.toLowerCase())
        }
        renderItem={(item) => renderRelationship(item, Math.random(), false)}
      />
    </div>
  );
};
