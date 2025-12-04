import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { StorySegment } from "../types";
import { THEMES, ENV_THEMES } from "../utils/constants";
import { useTranslation } from "react-i18next";
import { MarkdownText } from "./render/MarkdownText";
import { ImageLightbox } from "./render/ImageLightbox";
import { TimelineExport, TimelineExportRef } from "./TimelineExport";
import { TimelineExportModal } from "./TimelineExportModal";
import { StoryTimelineItem } from "./StoryTimelineItem";
import { useGameEngineContext } from "../contexts/GameEngineContext";
import { useSettingsContext } from "../contexts/SettingsContext";

interface StoryTimelineProps {
  title?: string;
  subtitle?: string;
  onNavigateToSegment?: (segmentId: string) => void;
}

export const StoryTimeline: React.FC<StoryTimelineProps> = ({
  title,
  subtitle,
  onNavigateToSegment,
}) => {
  const { state } = useGameEngineContext();
  const { settings } = useSettingsContext();
  const { currentHistory: segments, gameState } = state;
  const theme = gameState.theme;
  const exportIncludeUserActions = settings.exportIncludeUserActions ?? false;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const timelineExportRef = useRef<TimelineExportRef>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // Filter for model and system segments to show the narrative flow
  const narrativeSegments = segments.filter(
    (s) => s.role === "model" || s.role === "system",
  );
  // Get export segments based on settings
  const exportSegments = exportIncludeUserActions ? segments : narrativeSegments;

  const currentStoryTheme = THEMES[theme] || THEMES.fantasy;
  // Use envTheme directly from story theme for consistent visual styling
  const currentEnvThemeKey = currentStoryTheme.envTheme;
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

  const handleExportClick = () => {
    if (isExporting || exportSegments.length === 0) return;
    setShowExportModal(true);
  };

  const handleExport = (startIndex: number, endIndex: number, segmentsPerImage: number) => {
    setShowExportModal(false);
    timelineExportRef.current?.startExport(startIndex, endIndex, segmentsPerImage);
  };

  return (
    <>
      <div className="h-full flex flex-col p-2 md:p-6 md:border-l border-theme-border bg-theme-surface/60 backdrop-blur-md w-full md:w-72 relative">
        <h2
          className={`w-full text-theme-primary uppercase text-xs font-bold tracking-widest mb-6 mt-2 ${currentThemeConfig.fontClass} flex items-center justify-center gap-2 relative group`}
        >
          <span className="w-8 h-px bg-theme-primary/50"></span>
          {t("timeline.title")}
          <span className="w-8 h-px bg-theme-primary/50"></span>

          {/* Export Button */}
          <button
            onClick={handleExportClick}
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
                <StoryTimelineItem
                  key={seg.id}
                  segment={seg}
                  index={index}
                  isFirst={isFirst}
                  isLast={isLast}
                  isExpanded={isExpanded}
                  isHovered={isHovered}
                  onToggle={toggleItem}
                  onHover={setHoveredSegment}
                  onImageClick={setSelectedImage}
                  onNavigateToSegment={onNavigateToSegment}
                />
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
          segments={exportSegments}
          theme={theme}
          title={title}
          subtitle={subtitle}
          includeUserActions={exportIncludeUserActions}
          onExportStart={() => setIsExporting(true)}
          onExportEnd={() => setIsExporting(false)}
        />
      </div>

      {/* Export Options Modal */}
      <TimelineExportModal
        segments={exportSegments}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Image Lightbox */}
      <ImageLightbox
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </>
  );
};
