import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { GameState, TimelineEvent } from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { useOptionalRuntimeContext } from "../../runtime/context";
import { resolveEntityDisplayName } from "../../utils/entityDisplay";
import { SidebarTag } from "./SidebarTag";
import { pickFirstText } from "./panelText";

interface TimelineEventsPanelProps {
  events?: TimelineEvent[];
  gameState: Pick<
    GameState,
    | "playerActorId"
    | "character"
    | "actors"
    | "npcs"
    | "locations"
    | "quests"
    | "knowledge"
    | "factions"
    | "timeline"
    | "inventory"
  >;
  themeFont: string;
  expandedItemId?: string | null;
  onExpandItem?: (itemId: string | null) => void;
}

// Sub-component for individual timeline events
const TimelineEventCard: React.FC<{
  event: TimelineEvent;
  gameState: TimelineEventsPanelProps["gameState"];
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ event, gameState, isExpanded, onToggle }) => {
  const { t } = useTranslation();
  const engine = useOptionalRuntimeContext();
  const clearHighlight = engine?.actions.clearHighlight;
  const [isHighlight, setIsHighlight] = useState(event.highlight || false);

  useEffect(() => {
    setIsHighlight(event.highlight || false);
  }, [event.highlight]);

  const handleClick = () => {
    if (event.unlocked) {
      onToggle();
    }
    if (isHighlight) {
      setIsHighlight(false);
      clearHighlight?.({ kind: "timeline", id: event.id });
    }
  };

  const resolvedCausedBy = event.visible.causedBy
    ? resolveEntityDisplayName(event.visible.causedBy, gameState)
    : null;
  const resolvedTrueCausedBy = event.hidden?.trueCausedBy
    ? resolveEntityDisplayName(event.hidden.trueCausedBy, gameState)
    : null;

  return (
    <div
      className={`relative border-l-2 border-b border-theme-divider/60 transition-colors mb-2 pb-2
        ${
          isHighlight
            ? "border-l-theme-primary/70 bg-theme-surface-highlight/15 animate-pulse"
            : "border-l-theme-divider/60 hover:bg-theme-surface-highlight/20"
        }
        ${event.unlocked ? "cursor-pointer" : "cursor-default opacity-90"}
      `}
      onClick={handleClick}
    >
      {/* Card Header / Main Content */}
      <div className="py-2 pl-2 pr-1">
        <div className="flex justify-between items-start gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-theme-text-secondary">
              {event.gameTime}
            </span>
            {event.category && (
              <SidebarTag className="text-theme-text-secondary">
                {t(`timeline.categories.${event.category}`, {
                  defaultValue: event.category.replace("_", " "),
                })}
              </SidebarTag>
            )}
            {event.unlocked && (
              <SidebarTag className="gap-1">
                <svg
                  className="w-2.5 h-2.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                </svg>
                {t("insight") || "Insight"}
              </SidebarTag>
            )}
          </div>
        </div>

        {/* Event Name (if available) */}
        {event.name && (
          <div className="text-xs font-bold text-theme-text mb-1 break-words whitespace-normal">
            <span className="ui-emoji-slot mr-1.5 align-middle">
              {getValidIcon(event.icon, "📅")}
            </span>
            {event.name}
          </div>
        )}

        {!isExpanded && (
          <div className="text-xs text-theme-text/90 leading-relaxed line-clamp-2">
            {!event.name && (
              <span className="ui-emoji-slot mr-1.5 align-middle">
                {getValidIcon(event.icon, "📅")}
              </span>
            )}
            {pickFirstText(
              event.visible.description,
              event.hidden?.trueDescription,
            )}
          </div>
        )}

        {isExpanded && (
          <div className="text-xs text-theme-text/90 leading-relaxed">
            {!event.name && (
              <span className="ui-emoji-slot mr-1.5 align-middle">
                {getValidIcon(event.icon, "📅")}
              </span>
            )}
            <MarkdownText
              content={event.visible.description}
              inline
              className="inline"
            />
          </div>
        )}

        {resolvedCausedBy && (
          <div className="mt-2 pt-2 border-t border-theme-divider/60 flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-theme-text-secondary">
              {t("worldInfo.causedBy")}:
            </span>
            <span className="text-[10px] text-theme-text/80 italic">
              <MarkdownText
                content={resolvedCausedBy}
                inline
                className="inline"
              />
            </span>
          </div>
        )}

        {/* Involved Entities */}
        {event.involvedEntities && event.involvedEntities.length > 0 && (
          <div className="mt-2 pt-2 border-t border-theme-divider/60">
            <span className="text-[10px] uppercase tracking-wider text-theme-text-secondary block mb-1">
              {t("timeline.involved") || "Involved"}:
            </span>
            <div className="flex flex-wrap gap-1">
              {event.involvedEntities.map((entityId, idx) => (
                <span key={idx} className="text-[10px] text-theme-text/70 px-1">
                  {resolveEntityDisplayName(entityId, gameState)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Chain ID */}
        {event.chainId && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-theme-text-secondary">
              {t("timeline.chain") || "Chain"}:
            </span>
            <span className="text-[10px] text-theme-primary/70 font-mono">
              {event.chainId}
            </span>
          </div>
        )}
      </div>

      {/* Expanded Hidden Truth */}
      {isExpanded && (
        <div className="overflow-hidden animate-sidebar-expand">
          <div className="border-t border-theme-divider/60 pt-2 pl-2 pr-1">
            <div className="flex items-center gap-1.5 mb-2">
              <svg
                className="w-3 h-3 text-theme-primary"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold">
                {t("hidden.truth")}
              </span>
            </div>

            <div className="space-y-2">
              {event.hidden?.trueDescription && (
                <div className="text-[10px] text-theme-text leading-relaxed">
                  <MarkdownText
                    content={event.hidden.trueDescription}
                    indentSize={2}
                  />
                </div>
              )}

              {resolvedTrueCausedBy && (
                <div className="text-[10px]">
                  <span className="text-theme-primary/80 font-medium mr-1">
                    {t("hidden.cause")}:
                  </span>
                  <span className="text-theme-text/80 italic">
                    <MarkdownText
                      content={resolvedTrueCausedBy}
                      inline
                      className="inline"
                    />
                  </span>
                </div>
              )}

              {event.hidden?.consequences &&
                Array.isArray(event.hidden.consequences) &&
                event.hidden.consequences.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-theme-primary/80 block mb-1">
                      {t("hidden.consequences")}:
                    </span>
                    <ul className="list-disc list-inside text-theme-text/80 space-y-0.5 text-[10px]">
                      {event.hidden.consequences.map((cons, i) => (
                        <li key={i}>
                          <MarkdownText
                            content={cons}
                            inline
                            className="inline"
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TimelineEventsPanelComponent: React.FC<TimelineEventsPanelProps> = ({
  events,
  gameState,
  themeFont,
  expandedItemId,
  onExpandItem,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [localExpandedEventId, setLocalExpandedEventId] = useState<
    string | null
  >(null);
  const expandedEventId =
    expandedItemId !== undefined ? expandedItemId : localExpandedEventId;

  // Show only the last 5 known events reversed (newest first)
  const playerId = "char:player";
  const recentEvents = useMemo(
    () =>
      events
        ? [...events]
            .filter(
              (event) =>
                !Array.isArray(event.knownBy) ||
                event.knownBy.includes(playerId),
            )
            .reverse()
            .slice(0, 5)
        : [],
    [events],
  );

  return (
    <div className="space-y-2">
      <div
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center justify-between cursor-pointer group ${
          expanded ? "mb-3" : "mb-0"
        }`}
      >
        <div
          className={`flex items-center text-theme-primary uppercase text-xs font-bold tracking-widest ${themeFont}`}
        >
          <span className="flex items-center gap-2">
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            {t("timeline.title") || "Timeline Events"}
            <span className="ml-2 text-[10px] text-theme-text-secondary font-mono">
              {events?.length || 0}
            </span>
          </span>
        </div>

        <div className="flex items-center justify-end shrink-0 min-w-8">
          <div className="h-8 w-8 grid place-items-center rounded text-theme-text-secondary group-hover:text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors">
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${
                expanded ? "rotate-180" : ""
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

      {expanded && (
        <div className="space-y-2 animate-slide-in">
          {recentEvents.length === 0 ? (
            <div className="text-xs text-theme-text-secondary italic pl-1">
              {t("worldInfo.noEvents") || "No recent events recorded."}
            </div>
          ) : (
            recentEvents.map((event) => (
              <TimelineEventCard
                key={event.id}
                event={event}
                gameState={gameState}
                isExpanded={expandedEventId === event.id}
                onToggle={() => {
                  const next = expandedEventId === event.id ? null : event.id;
                  if (onExpandItem) {
                    onExpandItem(next);
                    return;
                  }
                  setLocalExpandedEventId(next);
                }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const TimelineEventsPanel = React.memo(TimelineEventsPanelComponent);
