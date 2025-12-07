import React, {
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import { GameState, FeedLayout, StorySegment, AISettings } from "../types";
import { StoryCard } from "./StoryCard";
import { FeedHeader } from "./feed/FeedHeader";
import { StackControls } from "./feed/StackControls";
import { GenerationTimer } from "./common/GenerationTimer";
import { MarkdownText } from "./render/MarkdownText";
import { useGameEngineContext } from "../contexts/GameEngineContext";
import { useSettingsContext } from "../contexts/SettingsContext";

export interface StoryFeedRef {
  scrollToSegment: (segmentId: string) => void;
  scrollToBottom: () => void;
  jumpToPage: (page: number) => void;
}

interface StoryFeedProps {
  layout: FeedLayout;
  setLayout: (layout: FeedLayout) => void;
  onAnimate: (imageUrl: string) => void;
  onGenerateImage: (id: string) => void;
  onRetry: () => void;
  disableImages?: boolean;
  onFork?: (id: string) => void;
  onTypingComplete?: () => void;
  /** Current playing ambience key (from audio system) */
  currentAmbience?: string;
  onToggleMute?: () => void;
  onViewedSegmentChange?: (segment: StorySegment) => void;
  onAudioGenerated?: (id: string, key: string) => void;
  onImageUpload?: (id: string, imageId: string) => void;
  onImageDelete?: (id: string) => void;
  sidebarCollapsed?: boolean;
  timelineCollapsed?: boolean;
}

export const StoryFeed = forwardRef<StoryFeedRef, StoryFeedProps>(
  (
    {
      layout,
      setLayout,
      onAnimate,
      onGenerateImage,
      onRetry,
      disableImages = false,
      onFork,
      onTypingComplete,
      currentAmbience,
      onToggleMute,
      onViewedSegmentChange,
      onAudioGenerated,
      onImageUpload,
      onImageDelete,
      sidebarCollapsed = false,
      timelineCollapsed = false,
    },
    ref,
  ) => {
    const { state } = useGameEngineContext();
    const { settings, updateSettings } = useSettingsContext();
    const {
      gameState,
      currentHistory,
      aiSettings,
      currentSlotId: saveId,
      failedImageNodes,
    } = state;
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Stack pagination state
    const stackItemsPerPage = settings.stackItemsPerPage ?? 10;
    const stackShowOutline = settings.stackShowOutline ?? true;
    const [currentPage, setCurrentPage] = useState(0);

    // Legacy single-card navigation (kept for backward compatibility with non-paginated mode)
    const [activeIndex, setActiveIndex] = useState(0);

    // Track played animations to prevent re-typing
    const playedAnimations = useRef<Set<string>>(new Set());
    const isInitialMount = useRef(true);

    const { t } = useTranslation();

    // Scroll to specific segment (for timeline navigation)
    const scrollToSegment = useCallback(
      (segmentId: string) => {
        if (layout === "scroll" && scrollContainerRef.current) {
          // Use setTimeout to ensure the DOM is ready
          setTimeout(() => {
            const element = document.querySelector(
              `[data-segment-id="${segmentId}"]`,
            );
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "center" });
            } else {
              // Fallback: estimate scroll position
              const targetIndex = currentHistory.findIndex(
                (s) => s.id === segmentId,
              );
              if (targetIndex !== -1) {
                const estimatedPosition = targetIndex * 300;
                scrollContainerRef.current?.scrollTo({
                  top: estimatedPosition,
                  behavior: "smooth",
                });
              }
            }
          }, 50);
        } else if (layout === "stack") {
          // Find the segment index and navigate to it
          const index = currentHistory.findIndex((s) => s.id === segmentId);
          if (index !== -1) {
            setActiveIndex(index);
            // Calculate the page for this index
            const page = Math.floor(index / stackItemsPerPage);
            setCurrentPage(page);
          }
        }
      },
      [layout, currentHistory, stackItemsPerPage],
    );

    // Scroll to bottom (for continue game) - scroll to END of last segment
    const scrollToBottom = useCallback(() => {
      if (layout === "scroll" && scrollContainerRef.current) {
        // Use setTimeout to ensure the DOM has fully rendered
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
              top: scrollContainerRef.current.scrollHeight,
              behavior: "smooth",
            });
          }
        }, 100);
      } else if (layout === "stack" && currentHistory.length > 0) {
        setActiveIndex(currentHistory.length - 1);
        // Jump to last page
        const totalPages = Math.ceil(currentHistory.length / stackItemsPerPage);
        setCurrentPage(totalPages - 1);
      }
    }, [layout, currentHistory.length, stackItemsPerPage]);

    // Jump to specific page in stack layout
    const jumpToPage = useCallback(
      (page: number) => {
        if (layout === "stack") {
          const totalPages = Math.ceil(
            currentHistory.length / stackItemsPerPage,
          );
          const safePage = Math.max(0, Math.min(page, totalPages - 1));
          setCurrentPage(safePage);
          // Set active index to first item of the page
          setActiveIndex(safePage * stackItemsPerPage);
        }
      },
      [layout, currentHistory.length, stackItemsPerPage],
    );

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        scrollToSegment,
        scrollToBottom,
        jumpToPage,
      }),
      [scrollToSegment, scrollToBottom, jumpToPage],
    );

    // Mark all existing segments as played on initial load (prevent re-typing on game load/restore)
    // But only do this ONCE on mount, not on every re-render
    useEffect(() => {
      if (isInitialMount.current && currentHistory.length > 0) {
        currentHistory.forEach((segment) => {
          playedAnimations.current.add(segment.id);
        });
        isInitialMount.current = false;

        // Scroll to last viewed segment or bottom on initial mount (continue game scenario)
        const viewedSegmentId = gameState.uiState.viewedSegmentId;

        setTimeout(() => {
          if (viewedSegmentId) {
            // Try to scroll to the last viewed segment
            const segmentExists = currentHistory.some(
              (s) => s.id === viewedSegmentId,
            );
            if (segmentExists) {
              if (layout === "scroll" && scrollContainerRef.current) {
                const element = document.querySelector(
                  `[data-segment-id="${viewedSegmentId}"]`,
                );
                if (element) {
                  element.scrollIntoView({ behavior: "auto", block: "center" });
                  return;
                }
              } else if (layout === "stack") {
                const index = currentHistory.findIndex(
                  (s) => s.id === viewedSegmentId,
                );
                if (index !== -1) {
                  setActiveIndex(index);
                  const page = Math.floor(index / stackItemsPerPage);
                  setCurrentPage(page);
                  return;
                }
              }
            }
          }

          // Fallback: scroll to bottom if no viewed segment or segment not found
          if (layout === "scroll" && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
              top: scrollContainerRef.current.scrollHeight,
              behavior: "auto", // Use "auto" for instant scroll on load
            });
          }
        }, 150); // Slightly longer delay to ensure all content is rendered
      }
    }, []); // Empty deps - run only once on mount

    // Auto-jump to latest when history grows (new turn generated)
    useEffect(() => {
      if (currentHistory.length > 0) {
        setActiveIndex(currentHistory.length - 1);
        // Update page to show latest content
        const totalPages = Math.ceil(currentHistory.length / stackItemsPerPage);
        setCurrentPage(totalPages - 1);
      }
    }, [currentHistory.length, gameState.activeNodeId, stackItemsPerPage]);

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
          const visibleEntries = entries.filter(
            (entry) => entry.isIntersecting,
          );
          if (visibleEntries.length > 0) {
            // Sort by intersection ratio (descending)
            visibleEntries.sort(
              (a, b) => b.intersectionRatio - a.intersectionRatio,
            );
            const mostVisible = visibleEntries[0];
            const segmentId =
              mostVisible.target.getAttribute("data-segment-id");
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

    // Stack pagination calculations
    // Separate intro segment (first model segment) and the rest
    const introSegment =
      currentHistory.length > 0 && currentHistory[0].role === "model"
        ? currentHistory[0]
        : null;
    const startIdx = introSegment ? 1 : 0;

    // Get segments without intro for pagination (summary follows its associated segment)
    const paginatableSegments = currentHistory.slice(startIdx);
    const totalPages = Math.max(
      1,
      Math.ceil(paginatableSegments.length / stackItemsPerPage),
    );
    const safeCurrentPage = Math.min(currentPage, totalPages - 1);

    // Get segments for current page
    const pageStartIdx = safeCurrentPage * stackItemsPerPage;
    const pageEndIdx = Math.min(
      pageStartIdx + stackItemsPerPage,
      paginatableSegments.length,
    );
    const currentPageSegments = paginatableSegments.slice(
      pageStartIdx,
      pageEndIdx,
    );

    // Page navigation handlers
    const handlePrevPage = () => {
      setCurrentPage((prev) => Math.max(0, prev - 1));
    };

    const handleNextPage = () => {
      setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
    };

    const handlePageJump = (page: number) => {
      setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
    };

    // Calculate dynamic styling based on panel states
    const bothCollapsed = sidebarCollapsed && timelineCollapsed;
    const anyCollapsed = sidebarCollapsed || timelineCollapsed;

    // Dynamic container padding
    const containerPadding = bothCollapsed
      ? "p-6 md:p-12 lg:px-24 xl:px-32"
      : anyCollapsed
        ? "p-4 md:p-10 lg:px-16"
        : "p-4 md:p-8 lg:px-12";

    // Dynamic max-width for content
    const contentMaxWidth = bothCollapsed
      ? "max-w-5xl"
      : anyCollapsed
        ? "max-w-4xl"
        : "max-w-3xl";

    // Dynamic text scaling
    const textScaleClass = bothCollapsed ? "scale-content-expanded" : "";

    return (
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <FeedHeader
          layout={layout}
          setLayout={setLayout}
          activeIndex={activeIndex}
          totalSegments={currentHistory.length}
          atmosphere={currentHistory[activeIndex]?.atmosphere}
          currentAmbience={currentAmbience}
          theme={gameState.theme}
          isMuted={aiSettings?.audioVolume?.bgmMuted}
          onToggleMute={onToggleMute}
          isEnvThemeLocked={aiSettings?.lockEnvTheme}
          onToggleLockEnvTheme={() => {
            updateSettings({ lockEnvTheme: !aiSettings?.lockEnvTheme });
          }}
        />

        <div
          ref={scrollContainerRef}
          className={`flex-1 overflow-y-auto scroll-smooth relative transition-all duration-300 ${containerPadding} ${textScaleClass}`}
        >
          <div ref={contentRef} className="flex flex-col min-h-full">
            {/* Outline Display */}
            {gameState.outline && (
              <div
                className={`mb-8 p-6 bg-theme-surface-highlight/20 border border-theme-primary/30 rounded-lg mx-auto ${contentMaxWidth} text-center animate-fade-in transition-all duration-300`}
              >
                <h3 className="text-theme-primary font-fantasy text-xl mb-2">
                  {gameState.outline.title}
                </h3>
                <div className="text-theme-muted text-sm italic">
                  <MarkdownText
                    content={gameState.outline.premise}
                    disableIndent
                  />
                </div>
                {gameState.outline.mainGoal?.visible?.description && (
                  <div className="text-theme-text text-sm mt-4 border-t border-theme-border/30 pt-2">
                    <strong className="text-theme-primary block mb-1">
                      {t("outline.currentGoal")}:
                    </strong>
                    <MarkdownText
                      content={gameState.outline.mainGoal.visible.description}
                      disableIndent
                    />
                  </div>
                )}
              </div>
            )}

            {/* Empty History State - Show retry when outline exists but no story generated yet */}
            {gameState.outline &&
              currentHistory.length === 0 &&
              !gameState.isProcessing &&
              !gameState.error && (
                <div
                  className={`mb-8 p-6 bg-theme-surface border border-theme-border rounded-lg mx-auto ${contentMaxWidth} text-center animate-fade-in`}
                >
                  <p className="text-theme-muted mb-4">
                    {t(
                      "storyNotStarted",
                      "The story hasn't started yet. Click below to begin your adventure.",
                    )}
                  </p>
                  <button
                    onClick={onRetry}
                    className="px-6 py-2 bg-theme-primary text-theme-surface rounded-lg hover:bg-theme-primary-muted transition-colors"
                  >
                    {t("startAdventure", "Start Adventure")}
                  </button>
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
                            title={t("summary.divider")}
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
                          style={{
                            // CSS content-visibility for native browser virtualization
                            // Browser will skip rendering off-screen content but maintain layout
                            contentVisibility: index < currentHistory.length - 3 ? 'auto' : 'visible',
                            containIntrinsicSize: index < currentHistory.length - 3 ? 'auto 400px' : 'auto',
                          }}
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
                            onImageUpload={onImageUpload}
                            onImageDelete={onImageDelete}
                            gameState={gameState}
                            saveId={saveId}
                            hasFailed={failedImageNodes?.has(segment.id)}
                            maxWidthClass={contentMaxWidth}
                            onFork={
                              onFork &&
                              segment.role === "model" &&
                              index < currentHistory.length - 1
                                ? () => onFork(segment.id)
                                : undefined
                            }
                          />
                        </div>
                      </React.Fragment>
                    );
                  })}
              </>
            ) : (
              // Stack Layout - Paginated View
              <div className="flex-1 flex flex-col justify-start items-center relative min-h-[400px] w-full overflow-y-auto">
                {currentHistory.length > 0 && (
                  <div
                    className={`w-full ${contentMaxWidth} relative pb-24 transition-all duration-300 space-y-6`}
                  >
                    {/* Outline Display in Stack Mode - Controlled by setting */}
                    {stackShowOutline && gameState.outline && (
                      <div className="p-4 bg-theme-surface-highlight/20 border border-theme-primary/30 rounded-lg text-center animate-fade-in">
                        <h3 className="text-theme-primary font-fantasy text-lg mb-2">
                          {gameState.outline.title}
                        </h3>
                        <div className="text-theme-muted text-sm italic">
                          <MarkdownText
                            content={gameState.outline.premise}
                            disableIndent
                          />
                        </div>
                      </div>
                    )}

                    {/* Intro Segment - Always shown at top of first page */}
                    {introSegment && safeCurrentPage === 0 && (
                      <div
                        className="story-card-wrapper"
                        data-segment-id={introSegment.id}
                      >
                        <StoryCard
                          segment={introSegment}
                          isLast={currentHistory.length === 1}
                          isGenerating={
                            gameState.isImageGenerating &&
                            gameState.generatingNodeId === introSegment.id
                          }
                          labels={{
                            decided: t("decided"),
                            vision: t("vision"),
                            unavailable: t("unavailable"),
                          }}
                          onAnimate={
                            introSegment.imageUrl ? onAnimate : undefined
                          }
                          onGenerateImage={onGenerateImage}
                          disableImages={disableImages}
                          shouldAnimate={false}
                          aiSettings={aiSettings}
                          onTypingComplete={undefined}
                          onAudioGenerated={onAudioGenerated}
                          onImageUpload={onImageUpload}
                          onImageDelete={onImageDelete}
                          gameState={gameState}
                          saveId={saveId}
                          hasFailed={failedImageNodes?.has(introSegment.id)}
                          maxWidthClass={contentMaxWidth}
                        />
                      </div>
                    )}

                    {/* Page Divider for non-first pages */}
                    {safeCurrentPage > 0 && (
                      <div className="flex items-center justify-center gap-4 py-4">
                        <div className="h-px bg-gradient-to-r from-transparent via-theme-border to-transparent flex-1 max-w-32"></div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-theme-surface/60 border border-theme-border rounded-full">
                          <svg
                            className="w-4 h-4 text-theme-muted"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                          <span className="text-xs text-theme-muted uppercase tracking-widest font-medium">
                            {t("stackPagination.page") || "Page"}{" "}
                            {safeCurrentPage + 1}
                          </span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-theme-border via-theme-border to-transparent flex-1 max-w-32"></div>
                      </div>
                    )}

                    {/* Paginated Segments */}
                    {currentPageSegments.map((segment, pageIndex) => {
                      const globalIndex = startIdx + pageStartIdx + pageIndex;
                      const isLastSegment =
                        globalIndex === currentHistory.length - 1;

                      return (
                        <React.Fragment key={segment.id}>
                          {/* Summary divider */}
                          {segment.summarySnapshot && (
                            <div
                              className="flex items-center justify-center my-4 opacity-50 hover:opacity-100 transition-opacity group"
                              title={t("summary.divider")}
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
                            {/* Fork Button */}
                            {!isLastSegment &&
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
                              isLast={isLastSegment}
                              isGenerating={
                                gameState.isImageGenerating &&
                                gameState.generatingNodeId === segment.id
                              }
                              labels={{
                                decided: t("decided"),
                                vision: t("vision"),
                                unavailable: t("unavailable"),
                              }}
                              onAnimate={
                                segment.imageUrl ? onAnimate : undefined
                              }
                              onGenerateImage={onGenerateImage}
                              disableImages={disableImages}
                              shouldAnimate={false}
                              aiSettings={aiSettings}
                              onTypingComplete={undefined}
                              onAudioGenerated={onAudioGenerated}
                              onImageUpload={onImageUpload}
                              onImageDelete={onImageDelete}
                              gameState={gameState}
                              saveId={saveId}
                              hasFailed={failedImageNodes?.has(segment.id)}
                              maxWidthClass={contentMaxWidth}
                              onFork={
                                onFork &&
                                segment.role === "model" &&
                                !isLastSegment
                                  ? () => onFork(segment.id)
                                  : undefined
                              }
                            />
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {gameState.isProcessing && (
              <div className="flex justify-center py-8 animate-pulse flex-none">
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-2 h-2 bg-theme-primary rounded-full animate-bounce delay-75"></div>
                  <div className="flex items-center gap-2 text-theme-muted text-xs uppercase tracking-widest">
                    <span>
                      {gameState.outline
                        ? t("loading")
                        : t("outline.generating")}
                    </span>
                    <GenerationTimer isActive={true} />
                  </div>
                </div>
              </div>
            )}

            {gameState.error && (
              <div className="p-4 bg-theme-error/20 border border-theme-error text-theme-error rounded text-center mb-8">
                {gameState.error}
                <button
                  onClick={onRetry}
                  className="block mx-auto mt-2 text-sm underline hover:text-theme-error-muted"
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
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                itemsPerPage={stackItemsPerPage}
                onPrevPage={handlePrevPage}
                onNextPage={handleNextPage}
                onPageJump={handlePageJump}
                onFirstPage={() => setCurrentPage(0)}
                onLastPage={() => setCurrentPage(totalPages - 1)}
                onItemsPerPageChange={(count) => {
                  updateSettings({ stackItemsPerPage: count });
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  },
);
