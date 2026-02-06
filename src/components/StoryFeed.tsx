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
import { ToolCallCarousel } from "./common/ToolCallCarousel";
import { MarkdownText } from "./render/MarkdownText";
import { useGameEngineContext } from "../contexts/GameEngineContext";
import { useSettingsContext } from "../contexts/SettingsContext";
import {
  runVisualLoop,
  VisualProgress,
} from "../services/ai/agentic/visual/visualLoop";
import { VisualProgressModal } from "./VisualProgressModal";

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
    const { state, actions } = useGameEngineContext();
    const { setGameState } = actions;
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
    const showToolCallCarousel = settings.extra?.toolCallCarousel ?? true;
    const [currentPage, setCurrentPage] = useState(0);

    // Legacy single-card navigation (kept for backward compatibility with non-paginated mode)
    const [activeIndex, setActiveIndex] = useState(0);

    // Track played animations to prevent re-typing
    const playedAnimations = useRef<Set<string>>(new Set());
    // Track which segment IDs existed when component first mounted with content
    // This allows new segments (like openingNarrative) to animate even if they arrive after mount
    const mountedSegmentIds = useRef<Set<string> | null>(null);

    // Disable content-visibility during initial load for accurate scrollHeight
    const [disableVirtualization, setDisableVirtualization] = useState(true);

    const { t } = useTranslation();

    // Visual Generation Modal State
    const [isVisualModalOpen, setIsVisualModalOpen] = useState(false);
    const [visualProgress, setVisualProgress] = useState<VisualProgress | null>(
      null,
    );
    const [visualTarget, setVisualTarget] = useState<
      "image_prompt" | "veo_script" | "both"
    >("image_prompt");

    // Scroll to specific segment (for timeline navigation)
    const scrollToSegment = useCallback(
      (segmentId: string) => {
        if (layout === "scroll" && scrollContainerRef.current) {
          // Use setTimeout to ensure the DOM is ready
          setTimeout(() => {
            const element = document.querySelector(
              `[data-segment-id="${segmentId}"]`,
            ) as HTMLElement | null;
            const container = scrollContainerRef.current;
            if (element && container) {
              // Calculate the element's position relative to the scroll container
              const containerRect = container.getBoundingClientRect();
              const elementRect = element.getBoundingClientRect();
              const relativeTop =
                elementRect.top - containerRect.top + container.scrollTop;

              container.scrollTo({
                top: relativeTop,
                behavior: "smooth",
              });
            } else if (container) {
              // Fallback: estimate scroll position
              const targetIndex = currentHistory.findIndex(
                (s) => s.id === segmentId,
              );
              if (targetIndex !== -1) {
                const estimatedPosition = targetIndex * 300;
                container.scrollTo({
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

    useEffect(() => {
      // Only capture mounted IDs once - when we first see segments
      if (mountedSegmentIds.current === null && currentHistory.length > 0) {
        // Capture all segment IDs that existed at this moment
        mountedSegmentIds.current = new Set(currentHistory.map((s) => s.id));

        // Only mark as played if there's more than one segment,
        // or if we're not at the very beginning of turn 1.
        // This allows the very first opening narrative to animate.
        const isInitialFirstTurn =
          currentHistory.length === 1 && gameState.turnNumber === 1;

        // Mark pre-existing content as already played
        currentHistory.forEach((segment) => {
          if (!isInitialFirstTurn) {
            playedAnimations.current.add(segment.id);
          }
        });

        // Scroll to last viewed segment or bottom on initial mount (continue game scenario)
        const viewedSegmentId = gameState.uiState.viewedSegmentId;
        const lastSegmentId = currentHistory[currentHistory.length - 1]?.id;

        // Determine target: use viewedSegmentId if valid, otherwise use lastSegmentId
        let targetId = viewedSegmentId;
        if (!targetId || !currentHistory.some((s) => s.id === targetId)) {
          targetId = lastSegmentId;
        }

        if (layout === "scroll" && scrollContainerRef.current) {
          const container = scrollContainerRef.current;

          // Use requestAnimationFrame for reliable DOM-based scrolling
          const scrollToEnd = () => {
            requestAnimationFrame(() => {
              // First, scroll to very bottom to force content rendering
              container.scrollTop = container.scrollHeight;

              // After a frame, try to find the target element
              requestAnimationFrame(() => {
                const element = document.querySelector(
                  `[data-segment-id="${targetId}"]`,
                ) as HTMLElement | null;
                if (element && container) {
                  // Calculate the element's position relative to the scroll container
                  const containerRect = container.getBoundingClientRect();
                  const elementRect = element.getBoundingClientRect();
                  const relativeTop =
                    elementRect.top - containerRect.top + container.scrollTop;

                  container.scrollTo({
                    top: relativeTop,
                    behavior: "auto",
                  });
                } else {
                  // Element still not found, force scroll to absolute bottom
                  container.scrollTop = container.scrollHeight;
                }
              });
            });
          };

          // Start scroll with a short delay to ensure React has rendered
          setTimeout(() => {
            scrollToEnd();
            // Re-enable virtualization after scroll is complete
            setTimeout(() => setDisableVirtualization(false), 500);
          }, 50);
        } else if (layout === "stack") {
          // Stack mode: jump to the target page
          const index = currentHistory.findIndex((s) => s.id === targetId);
          if (index !== -1) {
            setActiveIndex(index);
            const page = Math.floor(index / stackItemsPerPage);
            setCurrentPage(page);
          } else {
            const totalPages = Math.ceil(
              currentHistory.length / stackItemsPerPage,
            );
            setCurrentPage(totalPages - 1);
            setActiveIndex(currentHistory.length - 1);
          }
        }
      }
    }, [currentHistory.length]); // Watch for when history becomes available

    // Auto-jump to latest when history grows (new turn generated)
    useEffect(() => {
      if (currentHistory.length > 0) {
        setActiveIndex(currentHistory.length - 1);
        // Update page to show latest content
        const totalPages = Math.ceil(currentHistory.length / stackItemsPerPage);
        setCurrentPage(totalPages - 1);
      }
    }, [currentHistory.length, gameState.activeNodeId, stackItemsPerPage]);

    // Track if we should auto-scroll (sticky bottom behavior)
    const shouldAutoScroll = useRef(true);

    const handleScroll = () => {
      if (layout === "scroll" && scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } =
          scrollContainerRef.current;
        const dist = scrollHeight - scrollTop - clientHeight;
        // User is "at bottom" if within 50px
        shouldAutoScroll.current = dist < 50;
      }
    };

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
          // Only scroll if the user was already at the bottom (sticky)
          if (shouldAutoScroll.current) {
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

    const handleGeneratePrompt = async (id: string) => {
      setVisualTarget("image_prompt");
      setIsVisualModalOpen(true);
      setVisualProgress(null);

      try {
        const result = await runVisualLoop({
          gameState,
          segment: currentHistory.find((s) => s.id === id)!,
          settings,
          target: "image_prompt",
          language: settings.language || "English",
          onProgress: (p) => setVisualProgress(p),
        });

        if (result.imagePrompt) {
          // Update game state with the new prompt
          setGameState((prev: GameState) => {
            const node = prev.nodes[id];
            if (!node) return prev;
            return {
              ...prev,
              nodes: {
                ...prev.nodes,
                [id]: { ...node, imagePrompt: result.imagePrompt },
              },
            };
          });
        }
      } catch (error) {
        console.error("Failed to generate prompt:", error);
      } finally {
        setIsVisualModalOpen(false);
      }
    };

    const handleGenerateImageFull = async (id: string) => {
      const segment = currentHistory.find((s) => s.id === id);
      if (!segment) return;

      // If prompt already exists, just trigger image generation directly without modal
      if (segment.imagePrompt && segment.imagePrompt.trim().length > 0) {
        onGenerateImage(id);
        return;
      }

      setVisualTarget("image_prompt"); // We start with prompt generation
      setIsVisualModalOpen(true);
      setVisualProgress(null);

      try {
        // Step 1: Generate prompt
        const result = await runVisualLoop({
          gameState,
          segment,
          settings,
          target: "image_prompt",
          language: settings.language || "English",
          onProgress: (p) => setVisualProgress(p),
        });

        if (result.imagePrompt) {
          // Update prompt first
          setGameState((prev: GameState) => {
            const node = prev.nodes[id];
            if (!node) return prev;
            return {
              ...prev,
              nodes: {
                ...prev.nodes,
                [id]: { ...node, imagePrompt: result.imagePrompt },
              },
            };
          });

          // Step 2: Trigger image generation using the prompt
          onGenerateImage(id);
        }
      } catch (error) {
        console.error("Failed to generate image:", error);
      } finally {
        setIsVisualModalOpen(false);
      }
    };

    const handleGenerateCinematic = async (id: string) => {
      const segment = currentHistory.find((s) => s.id === id);
      if (!segment || !segment.imageUrl) return;

      setVisualTarget("veo_script");
      setIsVisualModalOpen(true);
      setVisualProgress(null);

      try {
        const result = await runVisualLoop({
          gameState,
          segment: currentHistory.find((s) => s.id === id)!,
          settings,
          target: "veo_script",
          language: settings.language || "English",
          onProgress: (p) => setVisualProgress(p),
        });

        if (result.veoScript) {
          // Update node with the new script
          setGameState((prev: GameState) => {
            const node = prev.nodes[id];
            if (!node) return prev;
            return {
              ...prev,
              nodes: {
                ...prev.nodes,
                [id]: { ...node, veoScript: result.veoScript },
              },
            };
          });

          // Trigger animation with the script
          onAnimate(currentHistory.find((s) => s.id === id)?.imageUrl || "");
        }
      } catch (error) {
        console.error("Failed to generate cinematic:", error);
      } finally {
        setIsVisualModalOpen(false);
      }
    };

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
          onScroll={handleScroll}
          className={`flex-1 overflow-y-auto scroll-smooth relative transition-all duration-300 ${containerPadding} ${textScaleClass}`}
        >
          {/* Subtle vignette + theme glow (game vibe, keeps text readable) */}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1200px_circle_at_50%_0%,rgba(var(--theme-primary-rgb,245_158_11),0.12),transparent_60%)]"></div>
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-theme-bg/60"></div>

          <div ref={contentRef} className="flex flex-col min-h-full">
            {/* Outline Display */}
            {gameState.outline && (
              <section
                className={`mb-10 mx-auto ${contentMaxWidth} animate-fade-in transition-all duration-300`}
              >
                <div className="flex items-center justify-center gap-4 mb-5 opacity-70">
                  <div className="h-px bg-gradient-to-r from-transparent via-theme-border to-transparent flex-1 max-w-48" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-theme-text-secondary">
                    {t("outline.title", "Story Outline")}
                  </span>
                  <div className="h-px bg-gradient-to-r from-transparent via-theme-border to-transparent flex-1 max-w-48" />
                </div>

                <h3 className="text-theme-primary font-fantasy text-2xl leading-tight text-center">
                  {gameState.outline.title}
                </h3>

                <div className="mt-4 text-theme-text-secondary text-sm md:text-[15px] leading-7 text-center italic">
                  <MarkdownText content={gameState.outline.premise} disableIndent />
                </div>

                {gameState.outline.mainGoal?.visible?.description && (
                  <div className="mt-6 pt-6 border-t border-theme-divider/60">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-theme-text-secondary text-center">
                      {t("outline.currentGoal")}
                    </div>
                    <div className="mt-2 text-theme-text text-sm md:text-[15px] leading-7 text-center">
                      <MarkdownText
                        content={gameState.outline.mainGoal.visible.description}
                        disableIndent
                      />
                    </div>
                  </div>
                )}

                <div className="mt-8 flex items-center justify-center gap-4 opacity-70">
                  <div className="h-px bg-gradient-to-r from-transparent via-theme-border to-transparent flex-1 max-w-48" />
                </div>
              </section>
            )}

            {/* Empty History State - Show retry when outline exists but no story generated yet */}
            {gameState.outline &&
              currentHistory.length === 0 &&
              !gameState.isProcessing &&
              !gameState.error && (
                <div className={`mb-8 mx-auto ${contentMaxWidth} text-center animate-fade-in`}>
                  <p className="text-theme-text-secondary mb-5 text-sm md:text-[15px] leading-7">
                    {t(
                      "storyNotStarted",
                      "The story hasn't started yet. Click below to begin your adventure.",
                    )}
                  </p>
                  <button
                    onClick={onRetry}
                    className="px-6 py-2 bg-theme-primary text-theme-surface rounded-xl hover:bg-theme-primary-muted transition-colors shadow-sm"
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
                  const isLastSegment = index === currentHistory.length - 1;

                  return (
                    <React.Fragment key={segment.id}>
                      {/* SummarySnapshot renders its own divider/title; avoid duplicate headers */}
                      <div
                        className="relative group/wrapper story-card-wrapper"
                        data-segment-id={segment.id}
                        style={{
                          // CSS content-visibility for native browser virtualization
                          // Browser will skip rendering off-screen content but maintain layout
                          // Disable content-visibility during initial load or for last 10 segments
                          contentVisibility:
                            disableVirtualization ||
                            index >= currentHistory.length - 10
                              ? "visible"
                              : "auto",
                          containIntrinsicSize:
                            disableVirtualization ||
                            index >= currentHistory.length - 10
                              ? "auto"
                              : "auto 400px",
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
                              className="absolute -left-4 md:-left-8 top-4 z-30 px-2 py-2 text-theme-text-secondary hover:text-theme-primary transition-all duration-200 cursor-pointer opacity-0 group-hover/wrapper:opacity-100"
                              title={t("tree.fork")}
                            >
                              <span className="flex items-center gap-2">
                                <span className="h-8 w-px bg-theme-divider/60 group-hover/wrapper:bg-theme-primary/60 transition-colors" />
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
                              </span>
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
                          onGeneratePrompt={handleGeneratePrompt}
                          onGenerateImageFull={handleGenerateImageFull}
                          onGenerateCinematic={handleGenerateCinematic}
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
                      <section className="text-center animate-fade-in">
                        <div className="flex items-center justify-center gap-4 mb-4 opacity-70">
                          <div className="h-px bg-gradient-to-r from-transparent via-theme-border to-transparent flex-1 max-w-32" />
                          <span className="text-[10px] uppercase tracking-[0.2em] text-theme-text-secondary">
                            {t("outline.title", "Story Outline")}
                          </span>
                          <div className="h-px bg-gradient-to-r from-transparent via-theme-border to-transparent flex-1 max-w-32" />
                        </div>
                        <h3 className="text-theme-primary font-fantasy text-xl leading-tight">
                          {gameState.outline.title}
                        </h3>
                        <div className="mt-3 text-theme-text-secondary text-sm italic leading-7">
                          <MarkdownText content={gameState.outline.premise} disableIndent />
                        </div>
                      </section>
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
                          onGeneratePrompt={handleGeneratePrompt}
                          onGenerateImageFull={handleGenerateImageFull}
                          onGenerateCinematic={handleGenerateCinematic}
                        />
                      </div>
                    )}

                    {/* Page Divider for non-first pages */}
                    {safeCurrentPage > 0 && (
                      <div className="flex items-center justify-center gap-4 py-4">
                        <div className="h-px bg-gradient-to-r from-transparent via-theme-border to-transparent flex-1 max-w-32"></div>
                        <div className="flex items-center gap-2 px-2">
                          <svg
                            className="w-4 h-4 text-theme-text-secondary"
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
                          <span className="text-[11px] text-theme-text-secondary uppercase tracking-[0.28em] font-medium">
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
                          {/* SummarySnapshot renders its own divider/title; avoid duplicate headers */}

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
                                  className="absolute -left-4 md:-left-8 top-4 z-30 p-2 text-theme-text-secondary hover:text-theme-primary bg-theme-surface/80 backdrop-blur-sm border border-theme-divider/60 rounded-full shadow-lg transition-opacity duration-200 cursor-pointer opacity-60 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg"
                                  title={t("tree.fork")}
                                  aria-label={t("tree.fork")}
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
                              onGeneratePrompt={handleGeneratePrompt}
                              onGenerateImageFull={handleGenerateImageFull}
                              onGenerateCinematic={handleGenerateCinematic}
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
              <div className="flex justify-center py-8 flex-none">
                <div className="flex flex-col items-center space-y-3 w-full max-w-2xl px-2">
                  <div className="w-2 h-2 bg-theme-primary rounded-full animate-bounce delay-75"></div>
                  <div className="flex items-center gap-2 text-theme-text-secondary text-xs uppercase tracking-widest">
                    <span>
                      {gameState.outline
                        ? t("loading")
                        : t("outline.generating")}
                    </span>
                    <GenerationTimer isActive={true} />
                  </div>
                  {showToolCallCarousel && (
                    <ToolCallCarousel
                      calls={gameState.liveToolCalls || []}
                      label={
                        t("storyFeed.toolCallCarouselLabel") ||
                        "Live Tool Calls"
                      }
                      emptyText={
                        t("storyFeed.waitingToolCalls") ||
                        "Waiting for tool calls..."
                      }
                      intervalMs={1650}
                    />
                  )}
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
        {/* Visual progress feedback */}
        <VisualProgressModal
          isOpen={isVisualModalOpen}
          progress={visualProgress}
          target={visualTarget}
          onClose={() => setIsVisualModalOpen(false)}
        />
      </div>
    );
  },
);
