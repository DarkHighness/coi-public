import React, { useEffect, useRef } from "react";
import { StorySegment } from "../types";
import { ENV_THEMES, THEMES } from "../utils/constants";
import { useTranslation } from "react-i18next";

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

  return (
    <div className="h-full flex flex-col p-6 border-l border-theme-border bg-theme-surface/80 backdrop-blur-sm w-72">
      <h2
        className={`text-theme-primary uppercase text-xs font-bold tracking-widest mb-6 text-center ${currentThemeConfig.fontClass} flex items-center justify-center`}
      >
        <span className="w-8 h-[1px] bg-theme-primary/50 mr-2"></span>
        {t("timeline")}
        <span className="w-8 h-[1px] bg-theme-primary/50 ml-2"></span>
      </h2>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-0 pr-2 scroll-smooth pt-1"
      >
        {narrativeSegments.map((seg, index) => {
          const isFirst = index === 0;
          const isLast = index === narrativeSegments.length - 1;

          return (
            <div
              key={seg.id}
              className={`relative pl-6 pb-6 group ${isLast ? "pb-0" : ""}`}
            >
              {/* Line */}
              <div
                className={`absolute left-0 w-[1px] bg-theme-border group-hover:bg-theme-primary/50 transition-colors
                 ${isFirst ? "top-2" : "top-0"}
                 ${isLast ? "h-2" : "bottom-0"}
              `}
              ></div>

              {/* Dot */}
              <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-theme-surface border-2 border-theme-muted group-hover:border-theme-primary group-hover:bg-theme-primary transition-all z-10 shadow-sm"></div>

              {/* Content */}
              <div className="text-xs text-theme-muted group-hover:text-theme-text transition-colors cursor-default relative -top-1">
                {seg.imageUrl && (
                  <div className="mb-2 w-full aspect-video rounded overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity border border-theme-border group-hover:border-theme-primary/30">
                    <img
                      src={seg.imageUrl}
                      alt="Moment"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <p className="line-clamp-3 leading-relaxed text-[11px] opacity-80 group-hover:opacity-100 font-serif">
                  {seg.text}
                </p>
              </div>
            </div>
          );
        })}

        {narrativeSegments.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-theme-muted/30 space-y-2">
            <div className="w-1 h-16 bg-gradient-to-b from-transparent via-theme-muted/30 to-transparent"></div>
            <p className="text-xs italic">{t("timeline.empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
};
