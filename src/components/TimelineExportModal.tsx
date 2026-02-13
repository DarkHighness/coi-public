/**
 * Timeline Export Modal
 *
 * Allows users to configure timeline export options:
 * - Select start and end segments
 * - Control how many segments per image
 * - Preview the export range
 */

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { StorySegment } from "../types";
import { useImageURL } from "../hooks/useImageStorage";
import { useIsMobile } from "../hooks/useMediaQuery";
import { useOptionalRuntimeContext } from "../runtime/context";
import { resolveLocationDisplayName } from "../utils/entityDisplay";

interface TimelineExportModalProps {
  segments: StorySegment[];
  isOpen: boolean;
  onClose: () => void;
  onExport: (
    startIndex: number,
    endIndex: number,
    segmentsPerImage: number,
  ) => void;
  isExporting?: boolean;
}

// Single timeline item for selection
const TimelineSelectItem: React.FC<{
  segment: StorySegment;
  index: number;
  isSelected: boolean;
  isInRange: boolean;
  isStart: boolean;
  isEnd: boolean;
  onSelect: (index: number, type: "start" | "end") => void;
  selectionMode: "start" | "end" | null;
}> = ({
  segment,
  index,
  isSelected,
  isInRange,
  isStart,
  isEnd,
  onSelect,
  selectionMode,
}) => {
  const { url: imageUrl } = useImageURL(segment.imageId);
  const displayUrl = imageUrl || segment.imageUrl;
  const { t } = useTranslation();

  const runtime = useOptionalRuntimeContext();
  const knownLocations = runtime?.state.gameState.locations ?? [];
  const locationDisplay = segment.stateSnapshot?.currentLocation
    ? resolveLocationDisplayName(segment.stateSnapshot.currentLocation, {
        locations: knownLocations,
      })
    : "";

  const handleClick = () => {
    if (selectionMode) {
      onSelect(index, selectionMode);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer
        ${isInRange ? "bg-theme-primary/10" : "bg-theme-surface-highlight/30"}
        ${selectionMode ? "hover:bg-theme-primary/20" : ""}
        ${isStart ? "ring-2 ring-green-500/70" : ""}
        ${isEnd ? "ring-2 ring-red-500/70" : ""}
      `}
    >
      {/* Index Badge */}
      <div
        className={`
        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
        ${isInRange ? "bg-theme-primary text-theme-bg" : "bg-theme-muted/30 text-theme-muted"}
      `}
      >
        {index + 1}
      </div>

      {/* Thumbnail */}
      {displayUrl ? (
        <div className="w-12 h-8 rounded overflow-hidden shrink-0 bg-theme-bg">
          <img src={displayUrl} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-12 h-8 rounded bg-theme-bg/50 flex items-center justify-center shrink-0">
          <svg
            className="w-4 h-4 text-theme-muted/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}

      {/* Content Preview */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-[10px] text-theme-muted mb-0.5">
          <span className="font-mono">
            {segment.stateSnapshot?.time || "—"}
          </span>
          {segment.stateSnapshot?.currentLocation && (
            <>
              <span>•</span>
              <span className="truncate">{locationDisplay}</span>
            </>
          )}
        </div>
        <p className="text-xs text-theme-text line-clamp-1">
          {segment.text.slice(0, 60)}...
        </p>
      </div>

      {/* Selection Indicator */}
      {(isStart || isEnd) && (
        <div
          className={`
          px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0
          ${isStart ? "bg-green-500/20 text-green-400" : ""}
          ${isEnd ? "bg-red-500/20 text-red-400" : ""}
        `}
        >
          {isStart ? t("timelineExport.start") : t("timelineExport.end")}
        </div>
      )}
    </div>
  );
};

// Desktop range slider component
const RangeSlider: React.FC<{
  min: number;
  max: number;
  startValue: number;
  endValue: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
  segments: StorySegment[];
}> = ({
  min,
  max,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  segments,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const { t } = useTranslation();

  const getPositionFromValue = (value: number) => {
    if (max === min) return 0;
    return ((value - min) / (max - min)) * 100;
  };

  const getValueFromPosition = (clientX: number) => {
    if (!trackRef.current) return min;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width),
    );
    return Math.round(min + percent * (max - min));
  };

  const handleMouseDown = (type: "start" | "end") => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(type);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return;
      const value = getValueFromPosition(e.clientX);
      if (dragging === "start") {
        onStartChange(Math.min(value, endValue));
      } else {
        onEndChange(Math.max(value, startValue));
      }
    },
    [dragging, startValue, endValue, onStartChange, onEndChange],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Touch support
  const handleTouchStart = (type: "start" | "end") => (e: React.TouchEvent) => {
    e.preventDefault();
    setDragging(type);
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!dragging || e.touches.length === 0) return;
      const value = getValueFromPosition(e.touches[0].clientX);
      if (dragging === "start") {
        onStartChange(Math.min(value, endValue));
      } else {
        onEndChange(Math.max(value, startValue));
      }
    },
    [dragging, startValue, endValue, onStartChange, onEndChange],
  );

  const handleTouchEnd = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
      return () => {
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [dragging, handleTouchMove, handleTouchEnd]);

  const startPos = getPositionFromValue(startValue);
  const endPos = getPositionFromValue(endValue);

  return (
    <div className="space-y-4">
      {/* Slider Track */}
      <div
        ref={trackRef}
        className="relative h-3 bg-theme-bg rounded-full cursor-pointer"
        onClick={(e) => {
          const value = getValueFromPosition(e.clientX);
          // Click closer to which handle?
          const distToStart = Math.abs(value - startValue);
          const distToEnd = Math.abs(value - endValue);
          if (distToStart < distToEnd) {
            onStartChange(Math.min(value, endValue));
          } else {
            onEndChange(Math.max(value, startValue));
          }
        }}
      >
        {/* Selected Range */}
        <div
          className="absolute top-0 bottom-0 bg-theme-primary/40 rounded-full"
          style={{
            left: `${startPos}%`,
            width: `${endPos - startPos}%`,
          }}
        />

        {/* Start Handle */}
        <div
          className={`
            absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 border-2 border-white shadow-lg cursor-grab
            ${dragging === "start" ? "scale-125 cursor-grabbing" : "hover:scale-110"}
            transition-transform
          `}
          style={{
            left: `${startPos}%`,
            transform: `translateX(-50%) translateY(-50%)`,
          }}
          onMouseDown={handleMouseDown("start")}
          onTouchStart={handleTouchStart("start")}
        />

        {/* End Handle */}
        <div
          className={`
            absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow-lg cursor-grab
            ${dragging === "end" ? "scale-125 cursor-grabbing" : "hover:scale-110"}
            transition-transform
          `}
          style={{
            left: `${endPos}%`,
            transform: `translateX(-50%) translateY(-50%)`,
          }}
          onMouseDown={handleMouseDown("end")}
          onTouchStart={handleTouchStart("end")}
        />
      </div>

      {/* Range Labels */}
      <div className="flex justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-theme-muted">{t("timelineExport.start")}:</span>
          <span className="font-mono text-theme-text">{startValue + 1}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-theme-muted">{t("timelineExport.end")}:</span>
          <span className="font-mono text-theme-text">{endValue + 1}</span>
          <span className="w-3 h-3 rounded-full bg-red-500" />
        </div>
      </div>
    </div>
  );
};

export const TimelineExportModal: React.FC<TimelineExportModalProps> = ({
  segments,
  isOpen,
  onClose,
  onExport,
  isExporting = false,
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  // State
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(Math.max(0, segments.length - 1));
  const [segmentsPerImage, setSegmentsPerImage] = useState(10);
  const [selectionMode, setSelectionMode] = useState<"start" | "end" | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"slider" | "list">("slider");

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStartIndex(0);
      setEndIndex(Math.max(0, segments.length - 1));
      setSelectionMode(null);
    }
  }, [isOpen, segments.length]);

  // Calculate preview stats
  const previewStats = useMemo(() => {
    const selectedCount = endIndex - startIndex + 1;
    const imageCount = Math.ceil(selectedCount / segmentsPerImage);
    return { selectedCount, imageCount };
  }, [startIndex, endIndex, segmentsPerImage]);

  // Handle list item selection
  const handleListSelect = useCallback(
    (index: number, type: "start" | "end") => {
      if (type === "start") {
        setStartIndex(Math.min(index, endIndex));
      } else {
        setEndIndex(Math.max(index, startIndex));
      }
      setSelectionMode(null);
    },
    [startIndex, endIndex],
  );

  // Handle export
  const handleExport = () => {
    onExport(startIndex, endIndex, segmentsPerImage);
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-theme-surface border border-theme-border rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-theme-border flex justify-between items-center bg-gradient-to-r from-theme-surface-highlight/50 to-transparent shrink-0">
            <div>
              <h2 className="text-lg font-bold text-theme-primary flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                {t("timelineExport.title")}
              </h2>
              <p className="text-xs text-theme-muted mt-0.5">
                {t("timelineExport.subtitle")}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isExporting}
              className="p-2 hover:bg-theme-surface-highlight rounded-full transition-colors disabled:opacity-50"
            >
              <svg
                className="w-5 h-5 text-theme-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
            {/* View Mode Toggle (Desktop only) */}
            {!isMobile && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setViewMode("slider")}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${
                      viewMode === "slider"
                        ? "bg-theme-primary text-theme-bg"
                        : "bg-theme-surface-highlight text-theme-muted hover:text-theme-text"
                    }
                  `}
                >
                  <span className="flex items-center gap-1.5">
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
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                      />
                    </svg>
                    {t("timelineExport.sliderView")}
                  </span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${
                      viewMode === "list"
                        ? "bg-theme-primary text-theme-bg"
                        : "bg-theme-surface-highlight text-theme-muted hover:text-theme-text"
                    }
                  `}
                >
                  <span className="flex items-center gap-1.5">
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
                        d="M4 6h16M4 10h16M4 14h16M4 18h16"
                      />
                    </svg>
                    {t("timelineExport.listView")}
                  </span>
                </button>
              </div>
            )}

            {/* Range Selection */}
            <div className="bg-theme-bg/50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-theme-text">
                  {t("timelineExport.selectRange")}
                </h3>
                <span className="text-xs text-theme-muted">
                  {segments.length} {t("timelineExport.totalSegments")}
                </span>
              </div>

              {/* Slider View (Desktop) */}
              {viewMode === "slider" && !isMobile && (
                <RangeSlider
                  min={0}
                  max={segments.length - 1}
                  startValue={startIndex}
                  endValue={endIndex}
                  onStartChange={setStartIndex}
                  onEndChange={setEndIndex}
                  segments={segments}
                />
              )}

              {/* List View or Mobile */}
              {(viewMode === "list" || isMobile) && (
                <>
                  {/* Selection Mode Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setSelectionMode(
                          selectionMode === "start" ? null : "start",
                        )
                      }
                      className={`
                        flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2
                        ${
                          selectionMode === "start"
                            ? "bg-green-500/20 text-green-400 ring-2 ring-green-500/50"
                            : "bg-theme-surface-highlight text-theme-muted hover:text-theme-text"
                        }
                      `}
                    >
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      {t("timelineExport.selectStart")}
                      <span className="font-mono">#{startIndex + 1}</span>
                    </button>
                    <button
                      onClick={() =>
                        setSelectionMode(selectionMode === "end" ? null : "end")
                      }
                      className={`
                        flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2
                        ${
                          selectionMode === "end"
                            ? "bg-red-500/20 text-red-400 ring-2 ring-red-500/50"
                            : "bg-theme-surface-highlight text-theme-muted hover:text-theme-text"
                        }
                      `}
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {t("timelineExport.selectEnd")}
                      <span className="font-mono">#{endIndex + 1}</span>
                    </button>
                  </div>

                  {/* Segment List */}
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {segments.map((seg, index) => (
                      <TimelineSelectItem
                        key={seg.id}
                        segment={seg}
                        index={index}
                        isSelected={index === startIndex || index === endIndex}
                        isInRange={index >= startIndex && index <= endIndex}
                        isStart={index === startIndex}
                        isEnd={index === endIndex}
                        onSelect={handleListSelect}
                        selectionMode={selectionMode}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Segments Per Image */}
            <div className="bg-theme-bg/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-theme-text">
                  {t("timelineExport.segmentsPerImage")}
                </h3>
                <span className="text-sm font-mono text-theme-primary">
                  {segmentsPerImage}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={segmentsPerImage}
                onChange={(e) => setSegmentsPerImage(parseInt(e.target.value))}
                className="w-full h-2 bg-theme-bg rounded-lg appearance-none cursor-pointer accent-theme-primary"
              />
              <div className="flex justify-between text-[10px] text-theme-muted">
                <span>
                  {t("timelineExport.minSegmentsLabel", {
                    label: t("timelineExport.detailed"),
                  })}
                </span>
                <span>
                  {t("timelineExport.maxSegmentsLabel", {
                    label: t("timelineExport.compact"),
                  })}
                </span>
              </div>
            </div>

            {/* Preview Stats */}
            <div className="bg-theme-primary/10 border border-theme-primary/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-theme-primary mb-3">
                {t("timelineExport.preview")}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-theme-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-theme-muted">
                    {t("timelineExport.selectedSegments")}:
                  </span>
                  <span className="font-mono text-theme-text font-bold">
                    {previewStats.selectedCount}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-theme-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-theme-muted">
                    {t("timelineExport.outputImages")}:
                  </span>
                  <span className="font-mono text-theme-text font-bold">
                    {previewStats.imageCount}
                  </span>
                </div>
              </div>
              <p className="text-xs text-theme-muted mt-3">
                {t("timelineExport.previewNote", {
                  start: startIndex + 1,
                  end: endIndex + 1,
                  images: previewStats.imageCount,
                })}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-theme-border flex justify-end gap-3 shrink-0 bg-theme-surface">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 text-sm text-theme-muted hover:text-theme-text transition-colors disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || previewStats.selectedCount === 0}
              className="px-4 py-2 bg-theme-primary text-theme-bg text-sm font-medium rounded-lg hover:bg-theme-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t("timelineExport.exporting")}
                </>
              ) : (
                <>
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
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  {t("timelineExport.exportButton")}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
};

export default TimelineExportModal;
