import React, { useState } from "react";
import { useTranslation } from "react-i18next";

export interface TutorialStep {
  title: string;
  content: string;
  /**
   * Optional icon to display (emoji or text)
   */
  icon?: string;
}

interface TutorialOverlayProps {
  /**
   * Title displayed at the top of the tutorial
   */
  title: string;
  /**
   * Array of steps to display
   */
  steps: TutorialStep[];
  /**
   * Callback when tutorial is completed or skipped
   */
  onComplete: () => void;
  /**
   * Optional theme font class
   */
  themeFont?: string;
}

/**
 * TutorialOverlay - A modal overlay for onboarding tutorials
 *
 * Displays step-by-step instructions with navigation controls.
 * Uses glassmorphism styling consistent with the app's design.
 */
export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  title,
  steps,
  onComplete,
  themeFont = "",
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-theme-surface/95 border border-theme-border rounded-lg w-full max-w-md shadow-[0_0_60px_rgba(var(--theme-primary),0.3)] relative overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-theme-border bg-gradient-to-r from-theme-surface-highlight/50 to-transparent">
          <div className="flex items-center justify-between">
            <h2
              className={`text-xl font-bold text-theme-primary ${themeFont}`}
            >
              {title}
            </h2>
            <button
              onClick={handleSkip}
              className="text-xs text-theme-muted hover:text-theme-text transition-colors px-2 py-1 rounded hover:bg-theme-surface-highlight"
            >
              {t("tutorial.skip", "Skip")}
            </button>
          </div>
          {/* Step indicator */}
          <div className="flex gap-1.5 mt-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? "bg-theme-primary"
                    : index < currentStep
                      ? "bg-theme-primary/50"
                      : "bg-theme-border"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[180px]">
          <div className="flex items-start gap-4">
            {step.icon && (
              <div className="text-3xl flex-shrink-0">{step.icon}</div>
            )}
            <div className="flex-1">
              <h3 className="text-lg font-bold text-theme-text mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-theme-muted leading-relaxed">
                {step.content}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-theme-border bg-theme-surface/50 flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={isFirstStep}
            className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
              isFirstStep
                ? "text-theme-muted/50 cursor-not-allowed"
                : "text-theme-muted hover:text-theme-text hover:bg-theme-surface-highlight"
            }`}
          >
            {t("tutorial.previous", "Previous")}
          </button>

          <span className="text-xs text-theme-muted">
            {currentStep + 1} / {steps.length}
          </span>

          <button
            onClick={handleNext}
            className="px-6 py-2 bg-theme-primary text-theme-bg font-bold text-sm rounded hover:opacity-90 transition-opacity"
          >
            {isLastStep
              ? t("tutorial.done", "Got it!")
              : t("tutorial.next", "Next")}
          </button>
        </div>
      </div>
    </div>
  );
};
