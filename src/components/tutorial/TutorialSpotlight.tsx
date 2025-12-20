import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useTutorialContext } from "../../contexts/TutorialContext";
import { useIsMobile } from "../../hooks/useMediaQuery";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * TutorialSpotlight - Spotlight overlay component for guided tutorials
 *
 * Desktop: Creates a full-screen dark overlay with a transparent "spotlight" cutout
 * Mobile: Shows a simple centered modal for easier interaction
 */
export const TutorialSpotlight: React.FC = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const {
    isActive,
    currentStep,
    currentStepIndex,
    currentFlow,
    targetElement,
    nextStep,
    prevStep,
    skipTutorial,
    canSkipCurrentStep,
  } = useTutorialContext();

  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(
    null,
  );
  const [tooltipPosition, setTooltipPosition] = useState<{
    top: number;
    left: number;
    arrowPosition: "top" | "bottom" | "left" | "right";
  } | null>(null);

  // Padding around spotlight
  const SPOTLIGHT_PADDING = 8;
  const TOOLTIP_OFFSET = 16;

  // Update spotlight position when target changes (desktop only)
  const updatePositions = useCallback(() => {
    if (isMobile || !targetElement) {
      setSpotlightRect(null);
      setTooltipPosition(null);
      return;
    }

    const rect = targetElement.getBoundingClientRect();

    // Spotlight rect with padding
    const spotlight: SpotlightRect = {
      top: rect.top - SPOTLIGHT_PADDING,
      left: rect.left - SPOTLIGHT_PADDING,
      width: rect.width + SPOTLIGHT_PADDING * 2,
      height: rect.height + SPOTLIGHT_PADDING * 2,
    };
    setSpotlightRect(spotlight);

    // Calculate tooltip position
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 320;
    const tooltipHeight = 180;

    let top = 0;
    let left = 0;
    let arrowPosition: "top" | "bottom" | "left" | "right" = "top";

    const preferredPosition = currentStep?.position || "bottom";

    // Try preferred position first, then fallback
    switch (preferredPosition) {
      case "bottom":
        top = spotlight.top + spotlight.height + TOOLTIP_OFFSET;
        left = spotlight.left + spotlight.width / 2 - tooltipWidth / 2;
        arrowPosition = "top";
        if (top + tooltipHeight > viewportHeight - 20) {
          top = spotlight.top - tooltipHeight - TOOLTIP_OFFSET;
          arrowPosition = "bottom";
        }
        break;
      case "top":
        top = spotlight.top - tooltipHeight - TOOLTIP_OFFSET;
        left = spotlight.left + spotlight.width / 2 - tooltipWidth / 2;
        arrowPosition = "bottom";
        if (top < 20) {
          top = spotlight.top + spotlight.height + TOOLTIP_OFFSET;
          arrowPosition = "top";
        }
        break;
      case "right":
        top = spotlight.top + spotlight.height / 2 - tooltipHeight / 2;
        left = spotlight.left + spotlight.width + TOOLTIP_OFFSET;
        arrowPosition = "left";
        if (left + tooltipWidth > viewportWidth - 20) {
          left = spotlight.left - tooltipWidth - TOOLTIP_OFFSET;
          arrowPosition = "right";
        }
        break;
      case "left":
        top = spotlight.top + spotlight.height / 2 - tooltipHeight / 2;
        left = spotlight.left - tooltipWidth - TOOLTIP_OFFSET;
        arrowPosition = "right";
        if (left < 20) {
          left = spotlight.left + spotlight.width + TOOLTIP_OFFSET;
          arrowPosition = "left";
        }
        break;
      case "center":
      default:
        top = viewportHeight / 2 - tooltipHeight / 2;
        left = viewportWidth / 2 - tooltipWidth / 2;
        arrowPosition = "top";
        break;
    }

    // Clamp to viewport
    left = Math.max(20, Math.min(left, viewportWidth - tooltipWidth - 20));
    top = Math.max(20, Math.min(top, viewportHeight - tooltipHeight - 20));

    setTooltipPosition({ top, left, arrowPosition });
  }, [targetElement, currentStep?.position, isMobile]);

  // Update on target change and resize
  useEffect(() => {
    if (!isMobile) {
      updatePositions();

      const handleResize = () => updatePositions();
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleResize);

      const observer = new MutationObserver(updatePositions);
      if (targetElement?.parentElement) {
        observer.observe(targetElement.parentElement, {
          childList: true,
          subtree: true,
          attributes: true,
        });
      }

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleResize);
        observer.disconnect();
      };
    }
  }, [updatePositions, targetElement, isMobile]);

  if (!isActive || !currentStep || !currentFlow) {
    return null;
  }

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === currentFlow.steps.length - 1;

  // Mobile: Render simple centered modal
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70">
        <div className="bg-theme-surface border border-theme-border rounded-lg shadow-2xl w-full max-w-sm animate-fade-in">
          {/* Header */}
          <div className="p-4 border-b border-theme-border bg-gradient-to-r from-theme-surface-highlight/50 to-transparent rounded-t-lg">
            <div className="flex items-center gap-3">
              {currentStep.icon && (
                <span className="text-2xl">{currentStep.icon}</span>
              )}
              <div>
                <h3 className="font-bold text-theme-text">
                  {currentStep.title}
                </h3>
                <div className="text-xs text-theme-muted">
                  {t("tutorial.step", "Step")} {currentStepIndex + 1} /{" "}
                  {currentFlow.steps.length}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-sm text-theme-muted leading-relaxed">
              {currentStep.content}
            </p>
          </div>

          {/* Progress bar */}
          <div className="px-4 pb-2">
            <div className="h-1 bg-theme-border rounded-full overflow-hidden">
              <div
                className="h-full bg-theme-primary transition-all duration-300"
                style={{
                  width: `${((currentStepIndex + 1) / currentFlow.steps.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-theme-border flex justify-between items-center">
            <button
              onClick={prevStep}
              disabled={isFirstStep}
              className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                isFirstStep
                  ? "text-theme-muted/50 cursor-not-allowed"
                  : "text-theme-muted hover:text-theme-text hover:bg-theme-surface-highlight"
              }`}
            >
              {t("tutorial.previous", "Previous")}
            </button>

            <div className="flex items-center gap-2">
              {canSkipCurrentStep && (
                <button
                  onClick={skipTutorial}
                  className="px-3 py-2 text-xs text-theme-muted hover:text-theme-text transition-colors"
                >
                  {t("tutorial.skip", "Skip")}
                </button>
              )}
              <button
                onClick={nextStep}
                className="px-4 py-2 bg-theme-primary text-theme-bg font-bold text-sm rounded hover:opacity-90 transition-opacity"
              >
                {isLastStep
                  ? t("tutorial.done", "Done")
                  : t("tutorial.next", "Next")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop: Spotlight mode
  const isCenterMode = !targetElement || currentStep.position === "center";

  // Generate clip-path for spotlight effect
  const generateClipPath = () => {
    if (!spotlightRect || isCenterMode) {
      return "none";
    }

    const { top, left, width, height } = spotlightRect;

    return `polygon(
      0% 0%,
      0% 100%,
      ${left}px 100%,
      ${left}px ${top}px,
      ${left + width}px ${top}px,
      ${left + width}px ${top + height}px,
      ${left}px ${top + height}px,
      ${left}px 100%,
      100% 100%,
      100% 0%
    )`;
  };

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Dark overlay with spotlight cutout */}
      <div
        className="absolute inset-0 bg-black/70 pointer-events-auto transition-all duration-300"
        style={{
          clipPath: generateClipPath(),
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      />

      {/* Allow clicks on spotlight area */}
      {spotlightRect && !isCenterMode && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute pointer-events-auto bg-theme-surface/95 backdrop-blur-md border border-theme-border rounded-lg shadow-2xl w-80 animate-fade-in"
        style={{
          top: tooltipPosition?.top ?? "50%",
          left: tooltipPosition?.left ?? "50%",
          transform:
            !tooltipPosition && isCenterMode
              ? "translate(-50%, -50%)"
              : undefined,
        }}
      >
        {/* Arrow */}
        {!isCenterMode && tooltipPosition && (
          <div
            className={`absolute w-3 h-3 bg-theme-surface border-theme-border rotate-45 ${
              tooltipPosition.arrowPosition === "top"
                ? "-top-1.5 left-1/2 -translate-x-1/2 border-l border-t"
                : tooltipPosition.arrowPosition === "bottom"
                  ? "-bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b"
                  : tooltipPosition.arrowPosition === "left"
                    ? "-left-1.5 top-1/2 -translate-y-1/2 border-l border-b"
                    : "-right-1.5 top-1/2 -translate-y-1/2 border-r border-t"
            }`}
          />
        )}

        {/* Header */}
        <div className="p-4 border-b border-theme-border bg-gradient-to-r from-theme-surface-highlight/50 to-transparent rounded-t-lg">
          <div className="flex items-center gap-3">
            {currentStep.icon && (
              <span className="text-2xl">{currentStep.icon}</span>
            )}
            <div>
              <h3 className="font-bold text-theme-text">{currentStep.title}</h3>
              <div className="text-xs text-theme-muted">
                {t("tutorial.step", "Step")} {currentStepIndex + 1} /{" "}
                {currentFlow.steps.length}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-theme-muted leading-relaxed">
            {currentStep.content}
          </p>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-2">
          <div className="h-1 bg-theme-border rounded-full overflow-hidden">
            <div
              className="h-full bg-theme-primary transition-all duration-300"
              style={{
                width: `${((currentStepIndex + 1) / currentFlow.steps.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-theme-border flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={isFirstStep}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              isFirstStep
                ? "text-theme-muted/50 cursor-not-allowed"
                : "text-theme-muted hover:text-theme-text hover:bg-theme-surface-highlight"
            }`}
          >
            {t("tutorial.previous", "Previous")}
          </button>

          <div className="flex items-center gap-2">
            {canSkipCurrentStep && (
              <button
                onClick={skipTutorial}
                className="px-3 py-1.5 text-xs text-theme-muted hover:text-theme-text transition-colors"
              >
                {t("tutorial.skip", "Skip")}
              </button>
            )}
            <button
              onClick={nextStep}
              className="px-4 py-1.5 bg-theme-primary text-theme-bg font-bold text-sm rounded hover:opacity-90 transition-opacity"
            >
              {isLastStep
                ? t("tutorial.done", "Done")
                : t("tutorial.next", "Next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
