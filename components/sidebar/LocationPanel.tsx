import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Location, ListState } from "../../types";
import { useListManagement } from "../../hooks/useListManagement";
import { getValidIcon } from "../../utils/emojiValidator";

interface LocationPanelProps {
  currentLocation: string;
  locations: Location[];
  themeFont: string;
  itemContext: string;
  listState: ListState;
  onUpdateList: (newState: ListState) => void;
}

interface LocationItemProps {
  item: {
    id: string;
    name: string;
    isCurrent: boolean;
    data: Location;
  };
  expandedLocations: Set<string>;
  isEditMode: boolean;
  draggedId: string | null;
  onLocationClick: (name: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnter: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onTogglePin: (id: string) => void;
  isPinned: (id: string) => boolean;
  t: any;
}

const LocationItem: React.FC<LocationItemProps> = ({
  item,
  expandedLocations,
  isEditMode,
  draggedId,
  onLocationClick,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDragEnd,
  onTogglePin,
  isPinned,
  t,
}) => {
  const isExpanded = expandedLocations.has(item.name);
  const locationData = item.data;
  const isCurrent = item.isCurrent;
  const pinned = isPinned(item.id);
  const isDragging = draggedId === item.id;
  const [isHighlight, setIsHighlight] = useState(
    locationData.highlight || false,
  );

  const handleToggle = () => {
    onLocationClick(item.name);
    if (isHighlight) {
      setIsHighlight(false);
    }
  };

  return (
    <div
      key={item.id}
      className={`mb-2 transition-all duration-300 ease-in-out rounded flex items-center gap-1
        ${isDragging ? "opacity-50 scale-95" : "opacity-100 scale-100"}
        ${isHighlight ? "animate-pulse ring-2 ring-theme-primary/50" : ""}
      `}
      draggable={isEditMode}
      onDragStart={isEditMode ? (e) => onDragStart(e, item.id) : undefined}
      onDragEnter={isEditMode ? (e) => onDragEnter(e, item.id) : undefined}
      onDragOver={isEditMode ? onDragOver : undefined}
      onDragEnd={onDragEnd}
    >
      <div className="flex-1 min-w-0">
        <button
          onClick={handleToggle}
          className={`w-full text-left px-3 py-2 rounded border transition-all duration-300 flex justify-between items-center ${
            isCurrent
              ? "bg-theme-surface-highlight/50 border-theme-primary/30 text-theme-text hover:bg-theme-primary/10"
              : "bg-theme-bg border-theme-border/50 text-theme-muted hover:text-theme-primary hover:border-theme-primary/50"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isCurrent && (
              <span className="w-1.5 h-1.5 rounded-full bg-theme-primary animate-pulse shrink-0"></span>
            )}
            <span
              className={`font-bold tracking-wide text-xs flex items-center gap-1 break-words whitespace-normal ${
                isCurrent ? "text-theme-primary" : ""
              }`}
            >
              <span className="mr-1">
                {getValidIcon(locationData.icon, "📍")}
              </span>
              {item.name}
              {locationData.unlocked && (
                <svg
                  className="w-3 h-3 text-theme-primary"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                </svg>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(item.id);
              }}
              className={`p-1 rounded hover:bg-theme-bg transition-colors ${
                pinned
                  ? "text-theme-primary"
                  : "text-theme-muted hover:text-theme-text"
              }`}
              title={
                pinned ? t("unpin") || "Unpin" : t("pinToTop") || "Pin to top"
              }
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
            </div>
          </div>
        </button>

        {/* Inline Details */}
        <div
          className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="p-3 border-x border-b border-theme-border/30 rounded-b bg-black/5">
              {locationData ? (
                <div className="space-y-3 text-xs animate-fade-in">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-0.5">
                      {t("description") || "Description"}
                    </span>
                    <p className="text-theme-text leading-relaxed pl-1">
                      {locationData.visible?.description ||
                        t("noDescription") ||
                        "No description available."}
                    </p>
                  </div>
                  {locationData.visible?.resources &&
                    locationData.visible.resources.length > 0 && (
                      <div className="mt-2">
                        <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                          {t("resources") || "Resources"}:
                        </span>
                        <ul className="list-disc list-inside text-theme-text space-y-0.5">
                          {locationData.visible.resources.map((res, i) => (
                            <li key={i}>{res}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  {/* Unlocked Hidden Secrets */}
                  {locationData.unlocked && (
                    <div className="mt-3 text-xs border-l-2 border-theme-primary/50 pl-3 bg-theme-primary/10 py-2 rounded-r">
                      <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold mb-1 flex items-center gap-1">
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
                        {t("hidden.secrets")}
                      </span>
                      {locationData.hidden?.fullDescription && (
                        <p className="leading-relaxed text-theme-text mb-2">
                          {locationData.hidden.fullDescription}
                        </p>
                      )}

                      {locationData.hidden?.dangers &&
                        locationData.hidden.dangers.length > 0 && (
                          <div className="mt-2 text-theme-error/90">
                            <span className="text-[9px] uppercase tracking-wider font-bold block mb-0.5 flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                              </svg>
                              {t("hidden.dangers") || "Dangers"}:
                            </span>
                            <ul className="list-disc list-inside space-y-0.5">
                              {locationData.hidden.dangers.map((danger, i) => (
                                <li key={i}>{danger}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {locationData.hidden?.hiddenFeatures &&
                        locationData.hidden.hiddenFeatures.length > 0 && (
                          <div className="mt-2">
                            <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                              {t("hidden.features")}:
                            </span>
                            <ul className="list-disc list-inside text-theme-text space-y-0.5">
                              {locationData.hidden.hiddenFeatures.map(
                                (feature, i) => (
                                  <li key={i}>{feature}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}

                      {locationData.hidden?.secrets &&
                        locationData.hidden.secrets.length > 0 && (
                          <div className="mt-2">
                            <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                              {t("hidden.secrets")}:
                            </span>
                            <ul className="list-disc list-inside text-theme-text space-y-0.5">
                              {locationData.hidden.secrets.map((secret, i) => (
                                <li key={i}>{secret}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  )}

                  {locationData.lore && (
                    <div className="pt-2 border-t border-theme-border/20 mt-1">
                      <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                        {t("history")}
                      </span>
                      <p className="text-theme-muted italic pl-1">
                        {locationData.lore}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-theme-muted italic opacity-50">
                  {t("noInfoAvailable")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isEditMode && (
        <div
          className="cursor-grab active:cursor-grabbing text-theme-muted hover:text-theme-primary p-2 bg-theme-surface-highlight border border-theme-border rounded touch-none shrink-0"
          title={t("dragToReorder") || "Drag to reorder"}
          draggable={true}
          onDragStart={(e) => onDragStart(e, item.id)}
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

export const LocationPanel: React.FC<LocationPanelProps> = ({
  currentLocation,
  locations = [],
  themeFont,
  listState,
  onUpdateList,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(
    new Set(),
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Filter known locations and map to objects with ID for list management
  const locationItems = useMemo(() => {
    return locations.map((loc) => ({
      id: loc.name, // Using name as ID for list management compatibility
      name: loc.name,
      isCurrent: loc.name === currentLocation,
      data: loc,
    }));
  }, [currentLocation, locations]);

  const { visibleItems, togglePin, reorderItem, isPinned } = useListManagement(
    locationItems,
    listState,
    onUpdateList,
    5,
  );

  const handleLocationClick = (locationName: string) => {
    if (isEditMode) return;
    setExpandedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(locationName)) {
        next.delete(locationName);
      } else {
        next.add(locationName);
      }
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e: React.DragEvent, targetId: string) => {
    if (!isEditMode || !draggedId || draggedId === targetId) return;
    reorderItem(draggedId, targetId);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <div>
      <div
        className={`flex items-center justify-between ${isOpen ? "mb-3" : "mb-0"}`}
      >
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
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            ></path>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            ></path>
          </svg>
          {t("location.known")}
          <span className="ml-2 text-[10px] text-theme-muted bg-theme-surface-highlight px-1.5 rounded border border-theme-border">
            {locations.length}
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
              <svg
                className="w-3 h-3"
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
                className="w-3 h-3"
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

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-theme-muted hover:text-theme-primary p-1"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${
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
          </button>
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-3">
            {visibleItems.length === 0 ? (
              <div className="text-theme-muted text-xs italic p-3 border border-dashed border-theme-border/50 rounded text-center bg-theme-surface-highlight/10">
                {t("noKnownLocations")}
              </div>
            ) : (
              visibleItems.map((item) => (
                <LocationItem
                  key={item.id}
                  item={item}
                  expandedLocations={expandedLocations}
                  isEditMode={isEditMode}
                  draggedId={draggedId}
                  onLocationClick={handleLocationClick}
                  onDragStart={handleDragStart}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onTogglePin={togglePin}
                  isPinned={isPinned}
                  t={t}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
