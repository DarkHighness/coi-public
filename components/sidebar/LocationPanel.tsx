import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Location, ListState } from "../../types";
import { useListManagement } from "../../hooks/useListManagement";

interface LocationPanelProps {
  currentLocation: string;
  knownLocations: string[];
  locations: Location[];
  themeFont: string;
  itemContext: string;
  listState: ListState;
  onUpdateList: (newState: ListState) => void;
}

export const LocationPanel: React.FC<LocationPanelProps> = ({
  currentLocation,
  knownLocations = [],
  locations = [],
  themeFont,
  listState,
  onUpdateList,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Filter known locations and map to objects with ID for list management
  const locationItems = useMemo(() => {
    return knownLocations.map((locName) => ({
      id: locName,
      name: locName,
      isCurrent: locName === currentLocation,
      data: locations.find((l) => l.name === locName),
    }));
  }, [knownLocations, currentLocation, locations]);

  const { visibleItems, togglePin, reorderItem, isPinned } = useListManagement(
    locationItems,
    listState,
    onUpdateList,
    5,
  );

  const handleLocationClick = (locationName: string) => {
    if (isEditMode) return;
    if (expandedLocation === locationName) {
      setExpandedLocation(null);
    } else {
      setExpandedLocation(locationName);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    // Create a ghost image that's cleaner if possible, or just let browser handle it
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

  const renderLocationItem = (item: (typeof locationItems)[0]) => {
    const isExpanded = expandedLocation === item.name;
    const locationData = item.data;
    const isCurrent = item.isCurrent;
    const pinned = isPinned(item.id);
    const isDragging = draggedId === item.id;

    return (
      <div
        key={item.id}
        className={`mb-2 transition-all duration-300 ease-in-out ${
          isExpanded ? "bg-theme-surface-highlight/30" : ""
        } ${isDragging ? "opacity-50 scale-95" : "opacity-100 scale-100"} rounded flex items-center gap-1`}
        draggable={isEditMode}
        onDragStart={
          isEditMode ? (e) => handleDragStart(e, item.id) : undefined
        }
        onDragEnter={
          isEditMode ? (e) => handleDragEnter(e, item.id) : undefined
        }
        onDragOver={isEditMode ? handleDragOver : undefined}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 min-w-0">
          <button
            onClick={() => handleLocationClick(item.name)}
            className={`w-full text-left px-3 py-2 rounded border transition-all duration-300 flex justify-between items-center ${
              isCurrent
                ? "bg-theme-surface-highlight/50 border-theme-primary/30 text-theme-text hover:bg-theme-primary/10"
                : "bg-theme-bg border-theme-border/50 text-theme-muted hover:text-theme-primary hover:border-theme-primary/50"
            }`}
          >
            <span
              className={`font-bold tracking-wide text-xs truncate mr-2 ${
                isCurrent ? "text-theme-primary" : ""
              }`}
            >
              {item.name}
            </span>
            <div className="flex items-center gap-2">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  togglePin(item.id);
                }}
                className={`p-1 rounded hover:bg-theme-bg transition-colors ${
                  pinned
                    ? "text-theme-primary"
                    : "text-theme-muted hover:text-theme-text"
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
              </div>
              {isCurrent && (
                <svg
                  className="w-3 h-3 text-theme-primary"
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
              )}
            </div>
          </button>

          {/* Inline Details */}
          <div
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="p-3 border-x border-b border-theme-border/30 rounded-b bg-black/20">
              {locationData ? (
                <div className="space-y-2 text-xs animate-fade-in">
                  <p className="text-theme-text leading-relaxed">
                    {locationData.description}
                  </p>
                  {locationData.lore && (
                    <div className="pt-2 border-t border-theme-border/20 mt-1">
                      <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                        {t("history")}
                      </span>
                      <p className="text-theme-muted italic">
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

        {isEditMode && (
          <div
            className="cursor-grab active:cursor-grabbing text-theme-muted hover:text-theme-primary p-2 bg-theme-surface-highlight border border-theme-border rounded touch-none"
            title="Drag to reorder"
            draggable={true}
            onDragStart={(e) => handleDragStart(e, item.id)}
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
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`text-left text-theme-primary uppercase text-xs font-bold tracking-widest flex items-center group ${themeFont}`}
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
          {t("locations")}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditMode(!isEditMode);
            }}
            className={`text-[10px] uppercase tracking-wider font-bold border rounded px-2 py-0.5 transition-colors ${
              isEditMode
                ? "bg-theme-primary text-theme-bg border-theme-primary"
                : "text-theme-primary border-theme-primary/50 hover:text-theme-primary-hover"
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
          <span className="text-[10px] text-theme-muted bg-theme-surface-highlight px-1.5 rounded border border-theme-border">
            {knownLocations.length}
          </span>
          <button onClick={() => setIsOpen(!isOpen)}>
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
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-2">
          {visibleItems.length === 0 ? (
            <p className="text-theme-muted text-sm italic p-2 border border-dashed border-theme-border rounded text-center opacity-50">
              {t("noKnownLocations")}
            </p>
          ) : (
            visibleItems.map((item) => renderLocationItem(item))
          )}
        </div>
      </div>
    </div>
  );
};
