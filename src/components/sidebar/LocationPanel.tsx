import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { InventoryItem, Location, ListState } from "../../types";
import { useListManagement } from "../../hooks/useListManagement";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { DetailedListModal } from "../DetailedListModal";
import { useOptionalRuntimeContext } from "../../runtime/context";

interface LocationPanelProps {
  currentLocation: string;
  locations: Location[];
  locationItemsByLocationId?: Record<string, InventoryItem[]>;
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
    itemsHere?: InventoryItem[];
  };
  expandedLocations: Set<string>;
  isEditMode: boolean;
  draggedId: string | null;
  onLocationClick: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnter: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onTogglePin?: (id: string) => void;
  isPinned?: (id: string) => boolean;
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
  const engine = useOptionalRuntimeContext();
  const clearHighlight = engine?.actions.clearHighlight;
  const isExpanded = expandedLocations.has(item.id);
  const locationData = item.data;
  const isCurrent = item.isCurrent;
  const pinned = isPinned?.(item.id) ?? false;
  const isDragging = draggedId === item.id;
  const [isHighlight, setIsHighlight] = useState(
    locationData.highlight || false,
  );

  useEffect(() => {
    setIsHighlight(locationData.highlight || false);
  }, [locationData.highlight]);

  const handleToggle = () => {
    onLocationClick(item.id);
    if (isHighlight) {
      setIsHighlight(false);
      clearHighlight?.({ kind: "locations", id: item.id });
    }
  };

  return (
    <div
      key={item.id}
      className={`relative border-l-2 border-b border-theme-divider/60 transition-colors pb-2
        ${isDragging ? "opacity-60" : "opacity-100"}
        ${isExpanded ? "border-l-theme-primary/70" : "border-l-theme-divider/60 hover:border-l-theme-primary/40"}
        ${isHighlight ? "animate-pulse ring-1 ring-theme-primary/40" : ""}
        ${isCurrent ? "border-l-theme-primary/70" : ""}
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
          className={`w-full text-left pl-2 pr-1 py-2 min-h-[2.25rem] flex justify-between items-center focus:outline-none hover:bg-theme-surface-highlight/20 transition-colors ${
            isCurrent ? "text-theme-primary" : ""
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isCurrent && (
              <span className="w-1.5 h-1.5 rounded-full bg-theme-primary animate-pulse shrink-0"></span>
            )}
            <span
              className={`font-bold tracking-wide text-xs flex items-center gap-1.5 leading-tight min-w-0 break-words whitespace-normal ${
                isCurrent ? "text-theme-primary" : "text-theme-text"
              }`}
            >
              <span className="ui-emoji-slot">
                {getValidIcon(locationData.icon, "📍")}
              </span>
              {item.name}
              {locationData.unlocked && (
                <svg
                  className="w-3.5 h-3.5 text-theme-primary"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                </svg>
              )}
            </span>
          </div>
        </button>

        {/* Inline Details */}
        <div
          className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="pl-2 pr-1 pb-3 pt-0 space-y-3">
              {locationData ? (
                <div className="text-xs animate-fade-in border-t border-theme-divider/60 pt-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                      {t("description") || "Description"}
                    </span>
                    <div className="text-theme-text leading-relaxed pl-1">
                      <MarkdownText
                        content={
                          locationData.visible?.description ||
                          t("noDescription") ||
                          "No description available."
                        }
                        indentSize={2}
                      />
                    </div>
                  </div>

                  {/* Textual descriptions */}
                  {locationData.visible?.environment && (
                    <div className="mt-2">
                      <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                        {t("sidebar.location.environment") || "Environment"}:
                      </span>
                      <div className="text-theme-text leading-relaxed pl-1">
                        <MarkdownText
                          content={locationData.visible.environment}
                          indentSize={2}
                        />
                      </div>
                    </div>
                  )}

                  {locationData.visible?.ambience && (
                    <div className="mt-2">
                      <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                        {t("sidebar.location.ambience") || "Ambience"}:
                      </span>
                      <div className="text-theme-text leading-relaxed pl-1">
                        <MarkdownText
                          content={locationData.visible.ambience}
                          indentSize={2}
                        />
                      </div>
                    </div>
                  )}

                  {locationData.visible?.weather && (
                    <div className="mt-2">
                      <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                        {t("sidebar.location.weather") || "Weather"}:
                      </span>
                      <div className="text-theme-text leading-relaxed pl-1">
                        <MarkdownText
                          content={locationData.visible.weather}
                          indentSize={2}
                        />
                      </div>
                    </div>
                  )}

                  {/* Atmosphere */}
                  {locationData.visible?.atmosphere && (
                    <div className="mt-3 space-y-2">
                      {locationData.visible.atmosphere.weather && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-theme-primary/70 shrink-0 w-16 uppercase tracking-wider text-[10px] pt-0.5">
                            {t("sidebar.location.weather")}:
                          </span>
                          <span className="text-theme-text/90">
                            {t(
                              `weatherNames.${locationData.visible.atmosphere.weather}`,
                              {
                                defaultValue:
                                  locationData.visible.atmosphere.weather,
                              },
                            )}
                          </span>
                        </div>
                      )}
                      {locationData.visible.atmosphere.ambience && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-theme-primary/70 shrink-0 w-16 uppercase tracking-wider text-[10px] pt-0.5">
                            {t("sidebar.location.ambience")}:
                          </span>
                          <span className="text-theme-text/90">
                            {t(
                              `ambienceNames.${locationData.visible.atmosphere.ambience}`,
                              {
                                defaultValue:
                                  locationData.visible.atmosphere.ambience,
                              },
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sensory Details */}
                  {locationData.visible?.sensory && (
                    <div className="mt-3 space-y-1">
                      {locationData.visible.sensory.smell && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-theme-primary/70 shrink-0 w-16 uppercase tracking-wider text-[10px] pt-0.5">
                            {t("sidebar.location.smell")}:
                          </span>
                          <span className="text-theme-text/90 italic">
                            {locationData.visible.sensory.smell}
                          </span>
                        </div>
                      )}
                      {locationData.visible.sensory.sound && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-theme-primary/70 shrink-0 w-16 uppercase tracking-wider text-[10px] pt-0.5">
                            {t("sidebar.location.sound")}:
                          </span>
                          <span className="text-theme-text/90 italic">
                            {locationData.visible.sensory.sound}
                          </span>
                        </div>
                      )}
                      {locationData.visible.sensory.lighting && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-theme-primary/70 shrink-0 w-16 uppercase tracking-wider text-[10px] pt-0.5">
                            {t("sidebar.location.lighting")}:
                          </span>
                          <span className="text-theme-text/90">
                            {locationData.visible.sensory.lighting}
                          </span>
                        </div>
                      )}
                      {locationData.visible.sensory.temperature && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-theme-primary/70 shrink-0 w-16 uppercase tracking-wider text-[10px] pt-0.5">
                            {t("sidebar.location.temperature")}:
                          </span>
                          <span className="text-theme-text/90">
                            {locationData.visible.sensory.temperature}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dropped/placed items in this location */}
                  {Array.isArray(item.itemsHere) && item.itemsHere.length > 0 && (
                    <div className="mt-3">
                      <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                        {t("sidebar.location.itemsHere", {
                          defaultValue: "Items here",
                        })}
                      </span>
                      <ul className="list-disc list-inside text-theme-text space-y-0.5">
                        {item.itemsHere.map((it) => (
                          <li key={it.id}>
                            <span className="mr-1">
                              {getValidIcon(it.icon, "📦")}
                            </span>
                            <span className="font-semibold">{it.name}</span>
                            {it.visible?.condition && (
                              <span className="text-theme-text-secondary">
                                {" "}
                                ({it.visible.condition})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Interactables */}
                  {locationData.visible?.interactables &&
                    locationData.visible.interactables.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[10px] uppercase tracking-wider text-theme-primary/70 mb-1">
                          {t("sidebar.location.interactables")}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {locationData.visible.interactables.map((item, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 bg-theme-bg/50 rounded border border-theme-divider/60 text-theme-text-secondary"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {locationData.visible?.knownFeatures &&
                    locationData.visible.knownFeatures.length > 0 && (
                      <div className="mt-2">
                        <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                          {t("sidebar.location.knownFeatures") ||
                            "Known Features"}
                          :
                        </span>
                        <ul className="list-disc list-inside text-theme-text space-y-0.5">
                          {locationData.visible.knownFeatures.map(
                            (feature, i) => (
                              <li key={i}>
                                <MarkdownText
                                  content={feature}
                                  indentSize={2}
                                  inline
                                />
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  {locationData.visible?.resources &&
                    locationData.visible.resources.length > 0 && (
                      <div className="mt-2">
                        <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                          {t("resources") || "Resources"}:
                        </span>
                        <ul className="list-disc list-inside text-theme-text space-y-0.5">
                          {locationData.visible.resources.map((res, i) => (
                            <li key={i}>
                              <MarkdownText
                                content={res}
                                indentSize={2}
                                inline
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* Unlocked Hidden Secrets - Outer Layer */}
                  {locationData.unlocked && (
                    <div className="mt-2 pt-2">
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
                        <div className="leading-relaxed text-theme-text mb-2">
                          <MarkdownText
                            content={locationData.hidden.fullDescription}
                            indentSize={2}
                          />
                        </div>
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
                                <li key={i}>
                                  <MarkdownText
                                    content={danger}
                                    indentSize={2}
                                    inline
                                  />
                                </li>
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
                                  <li key={i}>
                                    <MarkdownText
                                      content={feature}
                                      indentSize={2}
                                      inline
                                    />
                                  </li>
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
                    </div>
                  )}

                  {locationData.lore && (
                    <div className="pt-2 border-t border-theme-divider/60 mt-2">
                      <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
                        {t("history")}
                      </span>
                      <div className="text-theme-text-secondary pl-1">
                        <MarkdownText
                          content={locationData.lore}
                          indentSize={2}
                        />
                      </div>
                    </div>
                  )}

                  {/* {locationData.notes && (
                    <div className="pt-2 border-t border-theme-divider/60 mt-2">
                      <span className="text-[10px] uppercase tracking-wider text-theme-text-secondary font-bold block mb-1">
                        {t("notes") || "Notes"}
                      </span>
                      <div className="text-theme-text-secondary pl-1 italic">
                        <MarkdownText
                          content={locationData.notes}
                          indentSize={2}
                        />
                      </div>
                    </div>
                  )} */}
                </div>
              ) : (
                <div className="text-xs text-theme-text-secondary italic opacity-70">
                  {t("noInfoAvailable")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isEditMode && (
        <div
          className="cursor-grab active:cursor-grabbing text-theme-text-secondary hover:text-theme-primary p-2 bg-theme-surface-highlight border-l border-theme-divider/60 rounded-r touch-none absolute right-0 top-0 bottom-0 flex items-center justify-center w-8"
          title={t("dragToReorder") || "Drag to reorder"}
          draggable={true}
          onDragStart={(e) => onDragStart(e, item.id)}
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

export const LocationPanel: React.FC<LocationPanelProps> = ({
  currentLocation,
  locations = [],
  locationItemsByLocationId,
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalExpandedLocations, setModalExpandedLocations] = useState<
    Set<string>
  >(new Set());

  // Filter known locations and map to objects with ID for list management
  const locationItems = useMemo(() => {
    return locations.map((loc) => ({
      id: loc.id || loc.name, // Use ID, fallback to name for compatibility
      name: loc.name,
      isCurrent: loc.id === currentLocation || loc.name === currentLocation,
      data: loc,
      itemsHere: locationItemsByLocationId?.[loc.id] ?? [],
    }));
  }, [currentLocation, locations, locationItemsByLocationId]);

  const {
    visibleItems,
    allItems,
    togglePin,
    toggleHide,
    reorderItem,
    isPinned,
    isHidden,
  } = useListManagement(locationItems, listState, onUpdateList);

  const handleLocationClick = (locationId: string) => {
    if (isEditMode) return;
    setExpandedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
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
        className={`flex items-center justify-between ${isOpen ? "mb-4" : "mb-0"}`}
      >
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center text-theme-primary uppercase text-xs font-bold tracking-widest group cursor-pointer ${themeFont}`}
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
          {t("location.title") || "Location"}
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
                : "text-theme-text-secondary hover:text-theme-primary"
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
              className="text-theme-text-secondary hover:text-theme-primary p-1"
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

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-theme-text-secondary hover:text-theme-primary p-1"
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
          <div className="space-y-2">
            {visibleItems.length === 0 ? (
              <div className="text-theme-text-secondary text-xs italic py-3 text-center border-t border-theme-divider/60">
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
                  t={t}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <DetailedListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("location.title") || "Locations"}
        items={allItems}
        themeFont={themeFont}
        enableEditMode={true}
        onReorderItem={reorderItem}
        onTogglePin={togglePin}
        isPinned={isPinned}
        onToggleHide={toggleHide}
        isHidden={isHidden}
        searchFilter={(item, query) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          (item.data.visible?.description || "")
            .toLowerCase()
            .includes(query.toLowerCase())
        }
        renderItem={(item, dragOptions) => (
          <LocationItem
            key={item.id}
            item={item}
            expandedLocations={modalExpandedLocations}
            isEditMode={dragOptions?.isEditMode || false}
            draggedId={dragOptions?.isDragging ? item.id : null}
            onLocationClick={(id) => {
              setModalExpandedLocations((prev) => {
                const next = new Set(prev);
                if (next.has(id)) {
                  next.delete(id);
                } else {
                  next.add(id);
                }
                return next;
              });
            }}
            onDragStart={(e, id) => dragOptions?.onDragStart?.(e)}
            onDragEnter={(e, id) => dragOptions?.onDragEnter?.(e)}
            onDragOver={dragOptions?.onDragOver || (() => {})}
            onDragEnd={dragOptions?.onDragEnd || (() => {})}
            t={t}
          />
        )}
      />
    </div>
  );
};
