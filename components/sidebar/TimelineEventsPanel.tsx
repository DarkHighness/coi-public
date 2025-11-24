import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { TimelineEvent } from "../../types";

interface TimelineEventsPanelProps {
  events?: TimelineEvent[];
  themeFont: string;
}

export const TimelineEventsPanel: React.FC<TimelineEventsPanelProps> = ({
  events,
  themeFont,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  // Show only the last 5 events reversed (newest first)
  const recentEvents = events ? [...events].reverse().slice(0, 5) : [];

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-xs uppercase tracking-widest text-theme-muted hover:text-theme-primary transition-colors py-1"
      >
        <span className="flex items-center gap-2">
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          {t("worldInfo.recentEvents") || "Recent Events"}
        </span>
        <svg
          className={`w-3 h-3 transition-transform ${
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
      </button>

      {expanded && (
        <div className="space-y-3 pt-2 pl-2 animate-slide-in">
          {recentEvents.length === 0 ? (
            <div className="text-xs text-theme-muted/60 italic pl-3">
              {t("worldInfo.noEvents") || "No recent events recorded."}
            </div>
          ) : (
            recentEvents.map((event) => (
              <div
                key={event.id}
                className="relative pl-3 border-l border-theme-border/50 pb-1"
              >
                <div className="absolute left-[-1.5px] top-1.5 w-0.5 h-0.5 bg-theme-primary rounded-full"></div>
                <div className="text-[10px] text-theme-muted font-mono mb-0.5">
                  {event.gameTime}
                </div>
                <div className="text-xs text-theme-text/90 leading-snug">
                  {event.visible.description}
                </div>
                {event.visible.causedBy && (
                  <div className="text-[10px] text-theme-primary/60 mt-1 italic">
                    {t("worldInfo.causedBy")}: {event.visible.causedBy}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
