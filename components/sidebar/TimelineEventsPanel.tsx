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
                className={`relative pl-3 border-l border-theme-border/50 pb-2 transition-all duration-300 ${
                  event.highlight ? "bg-theme-primary/10 -ml-1 pl-4 rounded pr-1" : ""
                }`}
              >
                <div className={`absolute left-[-1.5px] top-1.5 w-0.5 h-0.5 rounded-full ${event.highlight ? "bg-theme-primary animate-pulse scale-150" : "bg-theme-primary"}`}></div>
                <div className="text-[10px] text-theme-muted font-mono mb-0.5 flex justify-between items-center">
                  <span>{event.gameTime}</span>
                  {event.unlocked && (
                    <svg className="w-2.5 h-2.5 text-theme-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                    </svg>
                  )}
                </div>
                <div className="text-xs text-theme-text/90 leading-snug">
                  {event.visible.description}
                </div>
                {event.visible.causedBy && (
                  <div className="text-[10px] text-theme-primary/60 mt-1 italic">
                    {t("worldInfo.causedBy")}: {event.visible.causedBy}
                  </div>
                )}

                {/* Unlocked Hidden Truth */}
                {event.unlocked && (
                  <div className="mt-2 text-xs border-l-2 border-theme-primary/50 pl-2 bg-theme-primary/10 py-1.5 rounded-r">
                    <span className="text-[9px] uppercase tracking-wider text-theme-primary font-bold mb-0.5 flex items-center gap-1">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      {t("hidden.truth")}
                    </span>
                    {event.hidden?.trueDescription && (
                      <p className="leading-relaxed text-theme-text text-[10px] mb-1">{event.hidden.trueDescription}</p>
                    )}
                    {event.hidden?.trueCausedBy && (
                      <p className="text-[10px] text-theme-text italic mb-1">
                        <span className="font-semibold">{t("hidden.cause")}:</span> {event.hidden.trueCausedBy}
                      </p>
                    )}
                    {event.hidden?.consequences && event.hidden.consequences.length > 0 && (
                      <div className="mt-1">
                        <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">{t("hidden.consequences")}:</span>
                        <ul className="list-disc list-inside text-theme-text space-y-0.5 text-[10px]">
                          {event.hidden.consequences.map((cons, i) => (
                            <li key={i}>{cons}</li>
                          ))}
                        </ul>
                      </div>
                    )}
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
