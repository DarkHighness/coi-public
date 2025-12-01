import React, { useState } from "react";
import { motion } from "framer-motion";
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
  onToggle: (id: string) => void;
  onHover: (id: string | null) => void;
  onImageClick: (url: string) => void;
}

export const StoryTimelineItem: React.FC<StoryTimelineItemProps> = ({
  segment,
  index,
  isFirst,
  isLast,
  isExpanded,
  isHovered,
  onToggle,
  onHover,
  onImageClick,
}) => {
  const { t } = useTranslation();
  const { url: resolvedUrl } = useImageURL(segment.imageId);
  const displayUrl = resolvedUrl || segment.imageUrl;

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
      className={`relative pl-8 pb-6 group ${isLast ? "pb-0" : ""}`}
      onMouseEnter={() => onHover(segment.id)}
      onMouseLeave={() => onHover(null)}
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
          onToggle(segment.id);
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
      <div
        className={`text-xs transition-colors relative -top-1 ${isHovered ? "text-theme-text" : "text-theme-text md:text-theme-muted"}`}
      >
        {/* Time and Location Metadata */}
        <div
          className={`flex items-center gap-2 mb-1.5 text-[10px] transition-opacity ${isHovered ? "opacity-100" : "opacity-100 md:opacity-60"}`}
        >
          <span className="font-mono text-theme-primary/70">
            {segment.stateSnapshot?.time ||
              t("timeline.unknown_time") ||
              "Unknown Time"}
          </span>
          {segment.stateSnapshot?.currentLocation && (
            <>
              <span className="text-theme-muted/50">•</span>
              <span className="text-[10px] uppercase tracking-wider text-theme-muted font-bold">
                {t("timeline.moment")} {index + 1}
              </span>
              <span className="text-theme-muted/80">
                {segment.stateSnapshot.currentLocation}
              </span>
            </>
          )}
        </div>

        {/* Image - Always visible */}
        {displayUrl && (
          <div
            className={`mb-2 w-full aspect-video rounded overflow-hidden transition-opacity border cursor-zoom-in ${isHovered ? "opacity-100 border-theme-primary/30" : "opacity-100 md:opacity-60 border-theme-border"}`}
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
    </motion.div>
  );
};
