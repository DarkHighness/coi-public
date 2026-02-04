import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StorySegment } from "../types";
import { useTranslation } from "react-i18next";
import { MarkdownText } from "./render/MarkdownText";
import { useImageURL } from "../hooks/useImageStorage";

interface StoryTimelineItemProps {
  segment: StorySegment;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isExpanded: boolean;
  isHovered: boolean;
  fallbackTime?: string;
  onToggle: (id: string) => void;
  onHover: (id: string | null) => void;
  onImageClick: (url: string) => void;
  onNavigateToSegment?: (segmentId: string) => void;
  /** Fork callback - only called for model role segments */
  onFork?: (segmentId: string) => void;
  /** Whether this is the currently active segment (cannot fork from current) */
  isActive?: boolean;
}

export const StoryTimelineItem: React.FC<StoryTimelineItemProps> = ({
  segment,
  index,
  isFirst,
  isLast,
  isExpanded,
  isHovered,
  fallbackTime,
  onToggle,
  onHover,
  onImageClick,
  onNavigateToSegment,
  onFork,
  isActive = false,
}) => {
  const { t } = useTranslation();
  const { url: resolvedUrl } = useImageURL(segment.imageId);
  const displayUrl = resolvedUrl || segment.imageUrl;

  const isSystemRole = segment.role === "system";
  const isModelRole = segment.role === "model";
  // Can fork from model role segments that are not the current active segment
  const canFork = isModelRole && !isActive && !!onFork;

  // Fork confirmation modal state
  const [showForkModal, setShowForkModal] = useState(false);

  // Long press detection for mobile
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const handleTouchStart = useCallback(() => {
    setIsLongPressing(false);
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true);
      // For model role segments that can fork, show fork modal instead of navigating
      if (canFork) {
        setShowForkModal(true);
      } else if (onNavigateToSegment) {
        onNavigateToSegment(segment.id);
      }
    }, 500); // 500ms for long press
  }, [segment.id, onNavigateToSegment, canFork]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsLongPressing(false);
  }, []);

  const handleTouchMove = useCallback(() => {
    // Cancel long press if finger moves
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsLongPressing(false);
  }, []);

  // System role (ForceUpdate result) - Subtle inline style that integrates with timeline flow
  if (isSystemRole) {
    return (
      <motion.div
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
        className={`relative pl-8 py-4 group ${isLast ? "pb-2" : ""} ${isLongPressing ? "opacity-70" : ""}`}
        onMouseEnter={() => onHover(segment.id)}
        onMouseLeave={() => onHover(null)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        {/* Line - uses dashed style for system updates */}
        <div
          className={`absolute left-2 w-px transition-colors
       ${isFirst ? "top-2" : "top-0"}
       ${isLast ? "h-2" : "bottom-0"}
       ${isHovered ? "bg-theme-muted/60" : "bg-theme-divider/70"}
    `}
          style={{
            backgroundImage:
              "linear-gradient(to bottom, var(--theme-divider) 50%, transparent 50%)",
            backgroundSize: "2px 6px",
          }}
        ></div>

        {/* System Indicator - Small square dot to distinguish from regular circular dots */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggle(segment.id);
          }}
          className={`absolute left-1 top-1 w-2.5 h-2.5 rounded-sm border-2 transition-all z-10 cursor-pointer
        ${isLast ? "animate-pulse" : ""}
        ${
          isExpanded
            ? "border-theme-muted bg-theme-muted"
            : "border-theme-muted/60 bg-theme-surface hover:border-theme-muted"
        }`}
          title={isExpanded ? "Click to collapse" : "Click to expand"}
        ></div>

        {/* Latest Item Indicator */}
        {isLast && (
          <div className="absolute left-0 top-0 w-4 h-4 rounded-sm border-2 border-theme-muted/30 animate-ping"></div>
        )}

        {/* System Content - Inline compact style */}
        <div className="text-xs transition-colors relative top-0.5 min-w-0">
          {/* Compact Header */}
          <div
            className={`flex items-center gap-1.5 mb-1 text-[10px] transition-opacity flex-wrap ${isHovered ? "opacity-100" : "opacity-80"}`}
          >
            <svg
              className="w-3 h-3 text-theme-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              ></path>
            </svg>
            <span className="uppercase tracking-wide text-theme-text-secondary font-medium shrink-0">
              {t("timeline.stateChange") || "State Change"}
            </span>
            {segment.stateSnapshot?.time && (
              <>
                <span className="text-theme-text-secondary/60">•</span>
                <span className="font-mono text-theme-text-secondary">
                  {segment.stateSnapshot.time}
                </span>
              </>
            )}
          </div>

          {/* Preview text when collapsed */}
          {!isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: isHovered ? 0.9 : 0.7, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(segment.id);
              }}
              className="line-clamp-2 leading-relaxed text-[11px] font-serif break-words cursor-pointer text-theme-text-secondary border-l-2 border-theme-divider/60 pl-2"
            >
              <MarkdownText content={segment.text} disableIndent />
            </motion.div>
          )}

          {/* Full content when expanded */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 0.9 : 0.8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(segment.id);
              }}
              className="leading-relaxed text-[11px] font-serif [&_p]:mb-1 break-words overflow-hidden cursor-pointer text-theme-text-secondary border-l-2 border-theme-divider/60 pl-2"
            >
              <MarkdownText content={segment.text} disableIndent />
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }

  // Regular model role - Original timeline item style
  return (
    <motion.div
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
      className={`relative pl-8 py-4 group ${isLast ? "pb-2" : ""} ${isLongPressing ? "opacity-70" : ""}`}
      onMouseEnter={() => onHover(segment.id)}
      onMouseLeave={() => onHover(null)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {/* Line */}
      <div
        className={`absolute left-2 w-px transition-colors
     ${isFirst ? "top-2" : "top-0"}
     ${isLast ? "h-2" : "bottom-0"}
     ${isHovered ? "bg-theme-primary/50" : "bg-theme-divider/70"}
  `}
      ></div>

      {/* Interactive Dot - Color indicates state */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggle(segment.id);
        }}
        className={`absolute left-1 top-1 w-2.5 h-2.5 rounded-full border-2 transition-all z-10 cursor-pointer
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
      <div
        className={`text-xs transition-colors relative top-0.5 min-w-0 ${isHovered ? "text-theme-text" : "text-theme-text md:text-theme-text-secondary"}`}
      >
        {/* Time and Location Metadata */}
        <div
          className={`flex items-center gap-2 mb-1.5 text-[10px] transition-opacity flex-wrap ${isHovered ? "opacity-100" : "opacity-100 md:opacity-70"}`}
        >
          <span className="font-mono text-theme-text-secondary shrink-0">
            {segment.stateSnapshot?.time ||
              fallbackTime ||
              t("timeline.unknown_time") ||
              "Unknown Time"}
          </span>
          {segment.stateSnapshot?.currentLocation && (
            <>
              <span className="text-theme-text-secondary/60">•</span>
              <span className="text-[10px] uppercase tracking-wide text-theme-text-secondary font-semibold">
                {t("timeline.turn")} {segment.stateSnapshot.turnNumber}
              </span>
              <span className="text-theme-text-secondary font-serif italic">
                {segment.stateSnapshot.currentLocation}
              </span>
            </>
          )}
        </div>

        {/* Image - Always visible */}
        {displayUrl && (
          <div
            className={`mb-2 w-full aspect-video overflow-hidden transition-opacity border cursor-zoom-in ${isHovered ? "opacity-100 border-theme-primary/30" : "opacity-100 md:opacity-70 border-theme-divider/60"}`}
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(displayUrl);
            }}
          >
            <img
              src={displayUrl}
              alt={t("timeline.moment")}
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
              onToggle(segment.id);
            }}
            className={`line-clamp-2 leading-relaxed text-[11px] font-serif break-words cursor-pointer transition-opacity ${isHovered ? "opacity-100" : "opacity-100 md:opacity-80"}`}
          >
            <MarkdownText content={segment.text} disableIndent />
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
              onToggle(segment.id);
            }}
            className={`leading-relaxed text-[11px] font-serif [&_p]:mb-1 break-words overflow-hidden cursor-pointer transition-opacity ${isHovered ? "opacity-100" : "opacity-100 md:opacity-80"}`}
          >
            <MarkdownText content={segment.text} disableIndent />
          </motion.div>
        )}
      </div>

      {/* Fork Confirmation Modal */}
      <AnimatePresence>
        {showForkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center ui-overlay backdrop-blur-sm"
            onClick={() => setShowForkModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-theme-surface border border-theme-divider/60 rounded-lg p-4 mx-4 max-w-sm shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-theme-primary font-bold mb-2 text-sm">
                {t("timeline.forkConfirm") || "Fork here?"}
              </h3>
              <p className="text-theme-text-secondary text-xs mb-4 line-clamp-3">
                {segment.text.slice(0, 150)}
                {segment.text.length > 150 ? "..." : ""}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowForkModal(false)}
                  className="px-3 py-1.5 text-xs text-theme-text-secondary hover:text-theme-text transition-colors"
                >
                  {t("cancel") || "Cancel"}
                </button>
                <button
                  onClick={() => {
                    setShowForkModal(false);
                    onFork?.(segment.id);
                  }}
                  className="px-3 py-1.5 text-xs bg-theme-primary text-theme-bg rounded hover:opacity-90 transition-opacity font-medium"
                >
                  {t("timeline.fork") || "Fork"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
