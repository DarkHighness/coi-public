import React, { useEffect, useRef, useState } from "react";
import { StorySegment } from "../types";
import { ENV_THEMES, THEMES } from "../utils/constants";
import { useTranslation } from "react-i18next";
import { MarkdownText } from "./render/MarkdownText";

interface StoryTimelineProps {
  segments: StorySegment[];
  theme: string;
  envTheme?: string;
}

export const StoryTimeline: React.FC<StoryTimelineProps> = ({
  segments,
  theme,
  envTheme,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Filter for model segments to show the narrative flow
  const narrativeSegments = segments.filter((s) => s.role === "model");
  const currentStoryTheme = THEMES[theme] || THEMES.fantasy;
  const currentEnvThemeKey = envTheme || currentStoryTheme.defaultEnvTheme;
  const currentThemeConfig =
    ENV_THEMES[currentEnvThemeKey] || ENV_THEMES.fantasy;
  const { t } = useTranslation();

  // Auto-scroll to bottom when new segments are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [narrativeSegments.length]);

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 md:border-l border-theme-border bg-theme-surface/80 backdrop-blur-sm w-full md:w-72">
      <h2
        className={`w-full text-theme-primary uppercase text-xs font-bold tracking-widest mb-6 ${currentThemeConfig.fontClass} flex items-center justify-center gap-2`}
      >
        <span className="w-8 h-px bg-theme-primary/50"></span>
        {t("timeline")}
        <span className="w-8 h-px bg-theme-primary/50"></span>
      </h2>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-0 pr-2 scroll-smooth pt-1"
      >
        {narrativeSegments.map((seg, index) => {
          const isFirst = index === 0;
          const isLast = index === narrativeSegments.length - 1;
          const isExpanded = expandedItems.has(seg.id);

          return (
            <div
              key={seg.id}
              className={`relative pl-8 pb-6 group ${isLast ? "pb-0" : ""}`}
            >
              {/* Line */}
              <div
                className={`absolute left-2 w-px bg-theme-border group-hover:bg-theme-primary/50 transition-colors
                 ${isFirst ? "top-2" : "top-0"}
                 ${isLast ? "h-2" : "bottom-0"}
              `}
              ></div>

              {/* Interactive Dot - Color indicates state */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(seg.id);
                }}
                className={`absolute left-1 top-1 w-2.5 h-2.5 rounded-full border-2 transition-all z-10 shadow-sm cursor-pointer
                  ${isLast ? "animate-pulse" : ""}
                  ${isExpanded
                    ? "border-theme-primary bg-theme-primary"
                    : "border-theme-muted bg-theme-surface hover:border-theme-primary/70"
                  }`}
                title={isExpanded ? "Click to collapse" : "Click to expand"}
              ></div>

              {/* Latest Item Indicator */}
              {isLast && (
                <div className="absolute left-0 top-0 w-4 h-4 rounded-full border-2 border-theme-primary/30 animate-ping"></div>
              )}

              {/* Content */}
              <div className="text-xs text-theme-muted group-hover:text-theme-text transition-colors relative -top-1">
                {/* Time and Location Metadata */}
                <div className="flex items-center gap-2 mb-1.5 text-[10px] opacity-60">
                  <span className="font-mono text-theme-primary/70">
                    {seg.stateSnapshot?.time || "Unknown Time"}
                  </span>
                  {seg.stateSnapshot?.currentLocation && (
                    <>
                      <span className="text-theme-muted/50">•</span>
                      <span className="text-theme-muted/80">
                        {seg.stateSnapshot.currentLocation}
                      </span>
                    </>
                  )}
                </div>

                {/* Image - Always visible */}
                {seg.imageUrl && (
                  <div className="mb-2 w-full aspect-video rounded overflow-hidden opacity-60 hover:opacity-100 transition-opacity border border-theme-border hover:border-theme-primary/30">
                    <img
                      src={seg.imageUrl}
                      alt="Moment"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Preview text when collapsed */}
                {!isExpanded && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItem(seg.id);
                    }}
                    className="line-clamp-2 leading-relaxed text-[11px] opacity-80 font-serif break-words cursor-pointer hover:opacity-100"
                  >
                    <MarkdownText content={seg.text} />
                  </div>
                )}

                {/* Full content when expanded */}
                {isExpanded && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItem(seg.id);
                    }}
                    className="leading-relaxed text-[11px] opacity-80 group-hover:opacity-100 font-serif [&_p]:mb-1 break-words overflow-hidden cursor-pointer"
                  >
                    <MarkdownText content={seg.text} />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {narrativeSegments.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-theme-muted/30 space-y-2">
            <div className="w-1 h-16 bg-linear-to-b from-transparent via-theme-muted/30 to-transparent"></div>
            <p className="text-xs italic">{t("timeline.empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
};
