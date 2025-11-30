import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { TimelineEvent } from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";

interface TimelineEventsPanelProps {
  events?: TimelineEvent[];
  themeFont: string;
}



// Sub-component for individual timeline events
const TimelineEventCard: React.FC<{ event: TimelineEvent }> = ({ event }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHighlight, setIsHighlight] = useState(event.highlight || false);

  const handleClick = () => {
    if (event.unlocked) {
      setIsExpanded(!isExpanded);
    }
    if (isHighlight) {
      setIsHighlight(false);
    }
  };

  return (
    <div
      className={`relative rounded border transition-all duration-300 mb-2 overflow-hidden
        ${
          isHighlight
            ? "bg-theme-surface-highlight/20 border-theme-primary/50 animate-pulse ring-1 ring-theme-primary/30"
            : "bg-theme-surface/30 border-theme-border/50 hover:bg-theme-surface-highlight/10 hover:border-theme-primary/30"
        }
        ${event.unlocked ? "cursor-pointer" : "cursor-default"}
      `}
      onClick={handleClick}
    >
      {/* Card Header / Main Content */}
      <div className="p-2.5">
        <div className="flex justify-between items-start mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-theme-muted bg-theme-bg/50 px-1.5 py-0.5 rounded border border-theme-border/30">
              {event.gameTime}
            </span>
            {event.unlocked && (
              <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-theme-primary font-bold">
                <svg
                  className="w-2.5 h-2.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                </svg>
                {t("insight") || "Insight"}
              </div>
            )}
          </div>
          {event.unlocked && (
            <svg
              className={`w-3 h-3 text-theme-muted transition-transform duration-300 ${
                isExpanded ? "rotate-180" : ""
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
          )}
        </div>

        <div className="text-xs text-theme-text/90 leading-relaxed">
          <span className="mr-1.5 inline-block">
            {getValidIcon(event.icon, "📅")}
          </span>
          {event.visible.description}
        </div>

        {event.visible.causedBy && (
          <div className="mt-2 pt-2 border-t border-theme-border/20 flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-wider text-theme-muted">
              {t("worldInfo.causedBy")}:
            </span>
            <span className="text-[10px] text-theme-text/80 italic">
              {event.visible.causedBy}
            </span>
          </div>
        )}
      </div>

      {/* Expanded Hidden Truth */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="bg-theme-surface/50 border-t border-theme-primary/20 p-2.5">
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

            <div className="space-y-2 pl-1">
              {event.hidden?.trueDescription && (
                <p className="text-[10px] text-theme-text leading-relaxed">
                  {event.hidden.trueDescription}
                </p>
              )}

              {event.hidden?.trueCausedBy && (
                <div className="text-[10px]">
                  <span className="text-theme-primary/80 font-medium mr-1">
                    {t("hidden.cause")}:
                  </span>
                  <span className="text-theme-text/80 italic">
                    {event.hidden.trueCausedBy}
                  </span>
                </div>
              )}

              {event.hidden?.consequences &&
                event.hidden.consequences.length > 0 && (
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-1">
                      {t("hidden.consequences")}:
                    </span>
                    <ul className="list-disc list-inside text-theme-text/80 space-y-0.5 text-[10px]">
                      {event.hidden.consequences.map((cons, i) => (
                        <li key={i}>{cons}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TimelineEventsPanel: React.FC<TimelineEventsPanelProps> = ({
  events,
  themeFont,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  // Show only the last 5 known events reversed (newest first)
  const recentEvents = events
    ? [...events]
        .filter((e) => e.known !== false)
        .reverse()
        .slice(0, 5)
    : [];

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
            <span className="ml-2 text-[10px] text-theme-muted bg-theme-surface-highlight px-1.5 rounded border border-theme-border">
              {events?.length || 0}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-theme-muted group-hover:text-theme-primary p-1 transition-colors">
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${
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
            <div className="text-xs text-theme-muted/60 italic pl-1">
              {t("worldInfo.noEvents") || "No recent events recorded."}
            </div>
          ) : (
            recentEvents.map((event) => (
              <TimelineEventCard key={event.id} event={event} />
            ))
          )}
        </div>
      )}
    </div>
  );
};
