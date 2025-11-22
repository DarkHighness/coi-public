import React, { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GameState, FeedLayout, StorySegment, AISettings } from "../types";
import { StoryCard } from "./StoryCard";
import { FeedHeader } from "./feed/FeedHeader";
import { StackControls } from "./feed/StackControls";

interface StoryFeedProps {
  gameState: GameState;
  currentHistory: StorySegment[];
  layout: FeedLayout;
  setLayout: (layout: FeedLayout) => void;
  onAnimate: (imageUrl: string) => void;
  onGenerateImage: (id: string) => void;
  onRetry: () => void;
  disableImages?: boolean;
  onFork?: (id: string) => void;
  aiSettings?: AISettings;
  onTypingComplete?: () => void;
  currentAmbience?: string;
  onToggleMute?: () => void;
  onViewedSegmentChange?: (segment: StorySegment) => void;
  onAudioGenerated?: (id: string, key: string) => void;
}

export const StoryFeed: React.FC<StoryFeedProps> = ({
  gameState,
  currentHistory,
  layout,
  setLayout,
  onAnimate,
  onGenerateImage,
  onRetry,
  disableImages = false,
  onFork,
  aiSettings,
  onTypingComplete,
  currentAmbience,
  onToggleMute,
  onViewedSegmentChange,
  onAudioGenerated,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Track played animations to prevent re-typing
  const playedAnimations = useRef<Set<string>>(new Set());
  const isInitialMount = useRef(true);

  const { t } = useTranslation();

  // Mark all existing segments as played on initial load (prevent re-typing on game load/restore)
  // But only do this ONCE on mount, not on every re-render
  useEffect(() => {
    if (isInitialMount.current && currentHistory.length > 0) {
      currentHistory.forEach((segment) => {
        playedAnimations.current.add(segment.id);
      });
      isInitialMount.current = false;
    }
  }, []); // Empty deps - run only once on mount

  // Auto-jump to latest when history grows (new turn generated)
  useEffect(() => {
    if (currentHistory.length > 0) {
      setActiveIndex(currentHistory.length - 1);
    }
  }, [currentHistory.length, gameState.activeNodeId]);

  // Auto-scroll for Scroll Layout
  useEffect(() => {
    if (
      layout === "scroll" &&
      scrollContainerRef.current &&
      contentRef.current
    ) {
      const container = scrollContainerRef.current;
      const content = contentRef.current;
      const observer = new ResizeObserver(() => {
        // Only scroll if we are already near bottom or if it's a new message
        // Simple check: if scroll is somewhat near bottom
        const isNearBottom =
          container.scrollHeight -
            container.scrollTop -
            container.clientHeight <
          500;
        if (isNearBottom) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        }
      });
      observer.observe(content);
      return () => observer.disconnect();
    }
  }, [layout]);

  // Intersection Observer for Scroll Layout to track viewed segment
  useEffect(() => {
    if (layout !== "scroll" || !onViewedSegmentChange) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry that is most visible
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // Sort by intersection ratio (descending)
          visibleEntries.sort(
            (a, b) => b.intersectionRatio - a.intersectionRatio,
          );
          const mostVisible = visibleEntries[0];
          const segmentId = mostVisible.target.getAttribute("data-segment-id");
          if (segmentId) {
            const segment = currentHistory.find((s) => s.id === segmentId);
            if (segment) {
              onViewedSegmentChange(segment);
            }
          }
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: [0.1, 0.5, 0.9], // Multiple thresholds for better accuracy
      },
    );

    const elements = document.querySelectorAll(".story-card-wrapper");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [layout, currentHistory, onViewedSegmentChange]);

  // Notify for Stack Layout
  useEffect(() => {
    if (layout === "stack" && onViewedSegmentChange) {
      const segment = currentHistory[activeIndex];
      if (segment) {
        onViewedSegmentChange(segment);
      }
    }
  }, [layout, activeIndex, currentHistory, onViewedSegmentChange]);

  const handlePrev = () => {
    setActiveIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => Math.min(currentHistory.length - 1, prev + 1));
  };

  const handleLatest = () => {
    setActiveIndex(currentHistory.length - 1);
  };

  // Keyboard navigation for Stack Mode
  useEffect(() => {
    if (layout !== "stack") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [layout, currentHistory.length]);

  // Ensure activeIndex is safe
  const safeActiveIndex = Math.min(
    activeIndex,
    Math.max(0, currentHistory.length - 1),
  );
  const activeSegment = currentHistory[safeActiveIndex];

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <FeedHeader
        layout={layout}
        setLayout={setLayout}
        activeIndex={activeIndex}
        totalSegments={currentHistory.length}
        environment={currentHistory[activeIndex]?.environment}
        ambience={currentAmbience}
        theme={gameState.envTheme || gameState.theme}
        isMuted={aiSettings?.audioVolume?.bgmMuted}
        onToggleMute={onToggleMute}
      />

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-12 scroll-smooth relative"
      >
        <div ref={contentRef} className="flex flex-col min-h-full">
          {/* Outline Display */}
          {gameState.outline && (
            <div className="mb-8 p-6 bg-theme-surface-highlight/20 border border-theme-primary/30 rounded-lg mx-auto max-w-3xl text-center animate-fade-in">
              <h3 className="text-theme-primary font-fantasy text-xl mb-2">
                {gameState.outline.title}
              </h3>
              <p className="text-theme-muted text-sm italic">
                {gameState.outline.premise}
              </p>
            </div>
          )}

          {layout === "scroll" ? (
            <>
              {currentHistory.map((segment, index) => {
                // Check if we should animate this card
                const isAlreadyPlayed = playedAnimations.current.has(
                  segment.id,
                );
                const shouldAnimate = !isAlreadyPlayed;

                return (
                  <React.Fragment key={segment.id}>
                    {segment.summarySnapshot && (
                      <div
                        className="flex items-center justify-center my-8 opacity-50 hover:opacity-100 transition-opacity group"
                        title="Summary"
                      >
                        <div className="h-[1px] bg-theme-border flex-1 max-w-xs"></div>
                        <span className="mx-4 text-xs text-theme-muted uppercase tracking-widest border border-theme-border rounded px-2 py-1 group-hover:text-theme-primary group-hover:border-theme-primary">
                          {t("summary.divider")}
                        </span>
                        <div className="h-[1px] bg-theme-border flex-1 max-w-xs"></div>
                      </div>
                    )}
                    <div
                      className="relative group/wrapper story-card-wrapper"
                      data-segment-id={segment.id}
                    >
                      {/* Fork Button visible on hover for past segments - Fixed Accessibility */}
                      {index < currentHistory.length - 1 &&
                        onFork &&
                        segment.role === "model" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onFork(segment.id);
                            }}
                            className="absolute -left-4 md:-left-8 top-4 z-30 p-2 text-theme-muted hover:text-theme-primary bg-theme-surface border border-theme-border rounded-full shadow-lg transition-all duration-300 cursor-pointer opacity-0 group-hover/wrapper:opacity-100"
                            title={t("tree.fork")}
                          >
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
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                              ></path>
                            </svg>
                          </button>
                        )}
                      <StoryCard
                        segment={segment}
                        isLast={index === currentHistory.length - 1}
                        isGenerating={
                          gameState.isImageGenerating &&
                          gameState.generatingNodeId === segment.id
                        }
                        labels={{
                          decided: t("decided"),
                          vision: t("vision"),
                          unavailable: t("unavailable"),
                        }}
                        onAnimate={segment.imageUrl ? onAnimate : undefined}
                        onGenerateImage={onGenerateImage}
                        disableImages={disableImages}
                        shouldAnimate={shouldAnimate}
                        aiSettings={aiSettings}
                        onTypingComplete={() => {
                          if (shouldAnimate) {
                            playedAnimations.current.add(segment.id);
                          }
                          if (
                            index === currentHistory.length - 1 &&
                            onTypingComplete
                          ) {
                            onTypingComplete();
                          }
                        }}
                        onAudioGenerated={onAudioGenerated}
                      />
                    </div>
                  </React.Fragment>
                );
              })}
            </>
          ) : (
            // Stack Layout
            <div className="flex-1 flex flex-col justify-center items-center relative min-h-[400px] w-full">
              {currentHistory.length > 0 && activeSegment && (
                <div className="w-full max-w-3xl relative pb-24">
                  {" "}
                  {/* Padding bottom for fixed controls */}
                  {/* Fork Button for Stack Mode */}
                  {safeActiveIndex < currentHistory.length - 1 &&
                    onFork &&
                    activeSegment.role === "model" && (
                      <div className="absolute -top-12 left-0 right-0 flex justify-center animate-fade-in">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFork(activeSegment.id);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-theme-primary/20 hover:bg-theme-primary text-theme-primary hover:text-theme-bg border border-theme-primary rounded-full transition-all font-bold text-sm uppercase tracking-wider shadow-[0_0_15px_rgba(var(--theme-primary),0.3)] cursor-pointer pointer-events-auto"
                        >
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
                              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                            ></path>
                          </svg>
                          {t("tree.fork")}
                        </button>
                      </div>
                    )}
                  <StoryCard
                    segment={activeSegment}
                    isLast={safeActiveIndex === currentHistory.length - 1}
                    isGenerating={
                      gameState.isImageGenerating &&
                      gameState.generatingNodeId === activeSegment.id
                    }
                    labels={{
                      decided: t("decided"),
                      vision: t("vision"),
                      unavailable: t("unavailable"),
                    }}
                    onAnimate={activeSegment.imageUrl ? onAnimate : undefined}
                    onGenerateImage={onGenerateImage}
                    disableImages={disableImages}
                    shouldAnimate={false} // Stack mode doesn't usually re-type
                    aiSettings={aiSettings}
                    onTypingComplete={undefined} // Stack mode doesn't animate typing usually
                    onAudioGenerated={onAudioGenerated}
                  />
                </div>
              )}
            </div>
          )}

          {gameState.isProcessing && (
            <div className="flex justify-center py-8 animate-pulse flex-none">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-2 h-2 bg-theme-primary rounded-full animate-bounce delay-75"></div>
                <span className="text-theme-muted text-xs uppercase tracking-widest">
                  {gameState.outline ? t("loading") : t("outline.generating")}
                </span>
              </div>
            </div>
          )}

          {gameState.error && (
            <div className="p-4 bg-red-900/20 border border-red-800 text-red-400 rounded text-center mb-8">
              {gameState.error}
              <button
                onClick={onRetry}
                className="block mx-auto mt-2 text-sm underline hover:text-red-300"
              >
                {t("tryAgain")}
              </button>
            </div>
          )}

          <div className="h-4 flex-none" />
        </div>
      </div>

      {/* Stack Controls - Fixed at bottom of feed */}
      {layout === "stack" && currentHistory.length > 0 && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-20 animate-fade-in-up">
          <div className="pointer-events-auto">
            <StackControls
              onPrev={handlePrev}
              onNext={handleNext}
              onLatest={handleLatest}
              activeIndex={safeActiveIndex}
              totalSegments={currentHistory.length}
            />
          </div>
        </div>
      )}
    </div>
  );
};
