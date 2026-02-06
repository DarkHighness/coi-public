import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { InventoryItem as InventoryItemType } from "../types";
import { getValidIcon } from "../utils/emojiValidator";
import { MarkdownText } from "./render/MarkdownText";
import { useOptionalRuntimeContext } from "../runtime/context";

interface InventoryItemProps {
  item: InventoryItemType;
  language: string;
  context: string;
  isPinned?: boolean;
  onPin?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isEditMode?: boolean;
  isDragging?: boolean;
}

export const InventoryItem: React.FC<InventoryItemProps> = ({
  item,
  language,
  context,
  isPinned,
  onPin,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop,
  isEditMode,
  isDragging,
}) => {
  const { t } = useTranslation();
  const engine = useOptionalRuntimeContext();
  const clearHighlight = engine?.actions.clearHighlight;
  const [isOpen, setIsOpen] = useState(false);
  const [isHighlight, setIsHighlight] = useState(item.highlight || false);

  useEffect(() => {
    if (item.highlight) {
      setIsHighlight(true);
      const timer = setTimeout(() => {
        setIsHighlight(false);
        clearHighlight?.({ kind: "inventory", id: item.id });
      }, 3000);
      return () => clearTimeout(timer);
    }
    setIsHighlight(false);
  }, [clearHighlight, item.highlight, item.id]);

  const handleClick = () => {
    if (!isEditMode) {
      setIsOpen(!isOpen);
      if (isHighlight || item.highlight) {
        setIsHighlight(false);
        clearHighlight?.({ kind: "inventory", id: item.id });
      }
    }
  };

  return (
    <div
      className={`relative border-l-2 border-b border-theme-divider/60 transition-colors pb-2 group
        ${isDragging ? "opacity-60" : "opacity-100"}
        ${isOpen ? "border-l-theme-primary/70" : "border-l-theme-divider/60 hover:border-l-theme-primary/40"}
        ${isHighlight ? "animate-pulse ring-1 ring-theme-primary/40" : ""}
      `}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDrop={onDrop}
      draggable={isEditMode}
      onDragStart={isEditMode && onDragStart ? onDragStart : undefined}
    >
      <div
        className="flex justify-between items-center py-2 pl-2 pr-1 cursor-pointer hover:bg-theme-surface-highlight/20 transition-colors"
        onClick={handleClick}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <svg
            className={`w-3.5 h-3.5 text-theme-text-secondary transition-transform duration-200 ${
              isOpen ? "rotate-90" : ""
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
          <span className="font-bold text-theme-text text-sm flex items-center gap-1 break-words whitespace-normal">
            <span className="mr-1 text-base">
              {getValidIcon(item.icon, "📦")}
            </span>
            {item.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onPin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPin();
              }}
              className={`p-1 rounded hover:bg-theme-surface-highlight/20 transition-colors ${
                isPinned
                  ? "text-theme-primary"
                  : "text-theme-text-secondary hover:text-theme-text opacity-0 group-hover:opacity-100"
              }`}
              title={isPinned ? "Unpin" : "Pin to top"}
            >
              <svg
                className="w-4 h-4"
                fill={isPinned ? "currentColor" : "none"}
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
          )}
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pl-2 pr-1 pb-3 pt-0 space-y-3">
            <div className="text-xs text-theme-text-secondary leading-relaxed border-t border-theme-divider/60 pt-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                  {t("description") || "Description"}
                </span>
                <div className="pl-1">
                  {item.visible?.description ? (
                    <div className="text-xs text-theme-text/90 mt-2 pl-2 border-l-2 border-theme-divider/60">
                      <MarkdownText content={item.visible.description} />
                    </div>
                  ) : (
                    <div className="text-xs text-theme-text-secondary mt-2 pl-2 border-l-2 border-theme-divider/60">
                      {t("noDescription") || "No description available."}
                    </div>
                  )}
                </div>
              </div>

              {/* Sensory Details */}
              {item.visible?.sensory && (
                <div className="mt-2 pl-2 border-l-2 border-theme-divider/60 space-y-1">
                  {item.visible.sensory.texture && (
                    <div className="flex gap-1 text-xs">
                      <span className="text-theme-primary/70">
                        {t("sidebar.inventory.texture")}:
                      </span>
                      <span className="text-theme-text-secondary">
                        {item.visible.sensory.texture}
                      </span>
                    </div>
                  )}
                  {item.visible.sensory.weight && (
                    <div className="flex gap-1 text-xs">
                      <span className="text-theme-primary/70">
                        {t("sidebar.inventory.weight")}:
                      </span>
                      <span className="text-theme-text-secondary">
                        {item.visible.sensory.weight}
                      </span>
                    </div>
                  )}
                  {item.visible.sensory.smell && (
                    <div className="flex gap-1 text-xs">
                      <span className="text-theme-primary/70">
                        {t("sidebar.inventory.smell")}:
                      </span>
                      <span className="text-theme-text-secondary">
                        {item.visible.sensory.smell}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {item.visible?.condition && (
                <div className="mt-2 pl-2 border-l-2 border-theme-divider/60 text-xs">
                  <span className="text-theme-primary/70">
                    {t("sidebar.inventory.condition")}:{" "}
                  </span>
                  <span className="text-theme-text-secondary">
                    {item.visible.condition}
                  </span>
                </div>
              )}

              {item.visible?.usage && (
                <div className="mt-2">
                  <div className="text-[10px] uppercase tracking-wider text-theme-primary/70 mb-1">
                    {t("sidebar.inventory.usage")}
                  </div>
                  <div className="text-xs text-theme-text/90 pl-2 border-l-2 border-theme-divider/60">
                    <MarkdownText content={item.visible.usage} />
                  </div>
                </div>
              )}

              {item.emotionalWeight && (
                <div className="mt-2">
                  <div className="text-[10px] uppercase tracking-wider text-amber-500/70 mb-1">
                    ✨ {t("emotionalWeight") || "Significance"}
                  </div>
                  <div className="text-xs text-theme-text/90 pl-2 border-l-2 border-amber-500/30">
                    <MarkdownText content={item.emotionalWeight} />
                  </div>
                </div>
              )}

              {/* Unlocked Hidden Truth - Outer Layer */}
              {item.unlocked &&
                (item.hidden?.truth ||
                  (item.hidden?.secrets && item.hidden.secrets.length > 0)) && (
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
                    {item.hidden?.truth && (
                      <div className="leading-relaxed text-theme-text mb-2">
                        <MarkdownText content={item.hidden.truth} />
                      </div>
                    )}
                    {item.hidden?.secrets && item.hidden.secrets.length > 0 && (
                      <div className="mt-2">
                        <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                          {t("hidden.secrets")}:
                        </span>
                        <ul className="list-disc list-inside text-theme-text space-y-0.5">
                          {item.hidden.secrets.map((secret, i) => (
                            <li key={i}>
                              <MarkdownText content={secret} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

              {item.lore && (
                <div className="pt-2 border-t border-theme-divider/60 mt-2">
                  <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                    {t("history")}
                  </span>
                  <div className="text-theme-text-secondary pl-1">
                    <MarkdownText content={item.lore} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isEditMode && (
        <div
          className="cursor-grab active:cursor-grabbing text-theme-text-secondary hover:text-theme-primary p-2 bg-theme-surface/10 border-l border-theme-divider/60 rounded-r touch-none absolute right-0 top-0 bottom-0 flex items-center justify-center w-8"
          title={t("dragToReorder") || "Drag to reorder"}
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
