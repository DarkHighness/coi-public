import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StorySegment } from "../types";
import { THEMES, ENV_THEMES } from "../utils/constants";
import { useTranslation } from "react-i18next";
import { MarkdownText } from "./render/MarkdownText";
import { ImageLightbox } from "./render/ImageLightbox";
import { TimelineExport, TimelineExportRef } from "./TimelineExport";

interface StoryTimelineProps {
  segments: StorySegment[];
  theme: string;
  envTheme?: string;
  title?: string;
  subtitle?: string;
}

export const StoryTimeline: React.FC<StoryTimelineProps> = ({
  segments,
  theme,
  envTheme,
  title,
  subtitle,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const timelineExportRef = useRef<TimelineExportRef>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

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

  const handleExport = () => {
    if (isExporting || narrativeSegments.length === 0) return;
    timelineExportRef.current?.startExport();
  };

  return (
    <>
      <div className="h-full flex flex-col p-2 md:p-6 md:border-l border-theme-border bg-theme-surface/60 backdrop-blur-md w-full md:w-72 relative">
        <h2
          className={`w-full text-theme-primary uppercase text-xs font-bold tracking-widest mb-6 mt-2 ${currentThemeConfig.fontClass} flex items-center justify-center gap-2 relative group`}
        >
          <span className="w-8 h-px bg-theme-primary/50"></span>
          {t("timeline")}
          <span className="w-8 h-px bg-theme-primary/50"></span>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-theme-muted hover:text-theme-primary transition-colors disabled:opacity-50"
            title={t("timeline.export") || "Export Timeline"}
          >
            {isExporting ? (
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                ></path>
              </svg>
            )}
          </button>
        </h2>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-0 px-1 scroll-smooth pt-1 pb-24 md:pb-0"
        >
          <AnimatePresence initial={false}>
            {narrativeSegments.map((seg, index) => {
              const isFirst = index === 0;
              const isLast = index === narrativeSegments.length - 1;
              const isExpanded = expandedItems.has(seg.id);
              const isHovered = hoveredSegment === seg.id;

              return (
                <motion.div
                  key={seg.id}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    layout: {
                      type: "spring",
                      stiffness: 350,
                      damping: 35,
                      mass: 0.8,
                    },
                    opacity: { duration: 0.4, ease: "easeOut" },
                    y: { type: "spring", stiffness: 300, damping: 25 },
                    scale: { duration: 0.35, ease: "easeOut" },
                  }}
                  className={`relative pl-8 pb-6 group ${isLast ? "pb-0" : ""}`}
                  onMouseEnter={() => setHoveredSegment(seg.id)}
                  onMouseLeave={() => setHoveredSegment(null)}
                >
                  {/* Line */}
                  <div
                    className={`absolute left-2 w-px transition-colors
                 ${isFirst ? "top-2" : "top-0"}
                 ${isLast ? "h-2" : "bottom-0"}
                 ${isHovered ? "bg-theme-primary/50" : "bg-theme-border"}
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
                  ${
                    isExpanded
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
                  <div className={`text-xs transition-colors relative -top-1 ${isHovered ? "text-theme-text" : "text-theme-text md:text-theme-muted"}`}>
                    {/* Time and Location Metadata */}
                    <div className={`flex items-center gap-2 mb-1.5 text-[10px] transition-opacity ${isHovered ? "opacity-100" : "opacity-100 md:opacity-60"}`}>
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
                      <div
                        className={`mb-2 w-full aspect-video rounded overflow-hidden transition-opacity border cursor-zoom-in ${isHovered ? "opacity-100 border-theme-primary/30" : "opacity-100 md:opacity-60 border-theme-border"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage(seg.imageUrl || null);
                        }}
                      >
                        <img
                          src={seg.imageUrl}
                          alt="Moment"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Preview text when collapsed */}
                    {!isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: isHovered ? 1 : 0.8, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItem(seg.id);
                        }}
                        className={`line-clamp-2 leading-relaxed text-[11px] font-serif break-words cursor-pointer transition-opacity ${isHovered ? "opacity-100" : "opacity-100 md:opacity-80"}`}
                      >
                        <MarkdownText content={seg.text} disableIndent/>
                      </motion.div>
                    )}

                    {/* Full content when expanded */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isHovered ? 1 : 0.8 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItem(seg.id);
                        }}
                        className={`leading-relaxed text-[11px] font-serif [&_p]:mb-1 break-words overflow-hidden cursor-pointer transition-opacity ${isHovered ? "opacity-100" : "opacity-100 md:opacity-80"}`}
                      >
                        <MarkdownText content={seg.text} disableIndent/>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {narrativeSegments.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-theme-muted/30 space-y-2">
              <div className="w-1 h-16 bg-linear-to-b from-transparent via-theme-muted/30 to-transparent"></div>
              <p className="text-xs italic">{t("timeline.empty")}</p>
            </div>
          )}
        </div>

        <TimelineExport
          ref={timelineExportRef}
          segments={narrativeSegments}
          theme={theme}
          envTheme={envTheme}
          title={title}
          subtitle={subtitle}
          onExportStart={() => setIsExporting(true)}
          onExportEnd={() => setIsExporting(false)}
        />
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </>
  );
};
