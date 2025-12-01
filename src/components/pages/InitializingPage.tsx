import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { preloadAudio } from "../../utils/audioLoader";

import { useWakeLock } from "../../hooks/useWakeLock";
import { GenerationTimer } from "../common/GenerationTimer";
import type { OutlinePhaseProgress } from "../../services/aiService";

// Phase descriptions for animated display
const PHASE_DESCRIPTIONS: Record<number, string[]> = {
  1: [
    "Weaving the fabric of reality...",
    "Establishing the laws of magic and nature...",
    "Shaping mountains, rivers, and forgotten ruins...",
    "Breathing life into ancient legends...",
    "Defining the boundaries between light and shadow...",
  ],
  2: [
    "Sculpting the hero's destiny...",
    "Inscribing hidden traits and secret powers...",
    "Forging bonds of fate and fortune...",
    "Awakening dormant memories...",
    "Setting the stage for legendary deeds...",
  ],
  3: [
    "Mapping the known world...",
    "Charting dangerous territories...",
    "Revealing hidden sanctuaries...",
    "Describing the lay of the land...",
    "Uncovering ancient ruins...",
  ],
  4: [
    "Identifying major powers...",
    "Tracing lines of influence...",
    "Uncovering secret societies...",
    "Defining political landscapes...",
    "Establishing power dynamics...",
  ],
  5: [
    "Weaving social webs...",
    "Introducing key figures...",
    "Defining friends and foes...",
    "Establishing personal connections...",
    "Revealing hidden agendas...",
  ],
  6: [
    "Gathering starting equipment...",
    "Forging unique items...",
    "Discovering ancient artifacts...",
    "Packing essential supplies...",
    "Unlocking hidden potential...",
  ],
  7: [
    "Outlining the hero's journey...",
    "Setting initial challenges...",
    "Defining the path ahead...",
    "Creating opportunities for adventure...",
    "Establishing the call to action...",
  ],
  8: [
    "Compiling world lore...",
    "Recording ancient history...",
    "Gathering rumors and legends...",
    "Defining common knowledge...",
    "Uncovering forgotten truths...",
  ],
  9: [
    "Setting the mood and tone...",
    "Establishing the timeline...",
    "Creating the atmosphere...",
    "Finalizing the world state...",
    "Preparing for the adventure...",
  ],
};

interface InitializingPageProps {
  themeFont: string;
  isProcessing?: boolean;
  streamedText?: string;
  phaseProgress?: OutlinePhaseProgress | null;
}

export const InitializingPage: React.FC<InitializingPageProps> = ({
  themeFont,
  isProcessing = false,
  streamedText = "",
  phaseProgress = null,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [audioProgress, setAudioProgress] = useState(0);
  const [shouldCheckProcessing, setShouldCheckProcessing] = useState(false);
  const [hasEverProcessed, setHasEverProcessed] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  // Wake Lock
  useWakeLock(isProcessing);

  // Track if processing has ever been true
  useEffect(() => {
    if (isProcessing) {
      setHasEverProcessed(true);
    }
  }, [isProcessing]);

  // Get current phase texts - using i18n translations
  const currentPhaseTexts = useMemo(() => {
    if (!phaseProgress) {
      return (
        (t("initializing.phaseDescriptions.1", {
          returnObjects: true,
        }) as string[]) || PHASE_DESCRIPTIONS[1]
      );
    }
    const phaseKey = `initializing.phaseDescriptions.${phaseProgress.phase}`;
    const translatedTexts = t(phaseKey, { returnObjects: true }) as string[];
    // Fallback to English if translation not available
    return Array.isArray(translatedTexts)
      ? translatedTexts
      : PHASE_DESCRIPTIONS[phaseProgress.phase] || PHASE_DESCRIPTIONS[1];
  }, [phaseProgress?.phase, t]);

  // Typewriter effect for phase descriptions
  useEffect(() => {
    if (!phaseProgress || phaseProgress.status === "error") return;

    const currentText = currentPhaseTexts[textIndex % currentPhaseTexts.length];

    if (charIndex < currentText.length) {
      // Type next character
      const timer = setTimeout(
        () => {
          setDisplayedText(currentText.slice(0, charIndex + 1));
          setCharIndex((prev) => prev + 1);
        },
        30 + Math.random() * 20,
      ); // Variable speed for natural feel
      return () => clearTimeout(timer);
    } else {
      // Wait then move to next text
      const timer = setTimeout(() => {
        setTextIndex((prev) => prev + 1);
        setCharIndex(0);
        setDisplayedText("");
      }, 1500); // Pause between texts
      return () => clearTimeout(timer);
    }
  }, [phaseProgress, currentPhaseTexts, textIndex, charIndex]);

  // Reset text animation when phase changes
  useEffect(() => {
    setTextIndex(0);
    setCharIndex(0);
    setDisplayedText("");
  }, [phaseProgress?.phase]);

  // This file is just the view. The logic for `startNewGame` is likely in StartScreen.tsx or similar.
  // I need to find where `startNewGame` is called.
  // Let me check StartScreen.tsx first.
  useEffect(() => {
    preloadAudio(setAudioProgress);

    // After 3 seconds, start checking if we're actually processing
    const checkTimer = setTimeout(() => {
      setShouldCheckProcessing(true);
    }, 3000);

    return () => {
      clearTimeout(checkTimer);
    };
  }, []);

  // If not processing after initial delay AND never processed, redirect to home
  useEffect(() => {
    if (shouldCheckProcessing && !isProcessing && !hasEverProcessed) {
      console.warn("InitializingPage: Not processing, redirecting to home");
      navigate("/");
    }
  }, [shouldCheckProcessing, isProcessing, hasEverProcessed, navigate]);

  // Combine streamed text with phase description animation
  const animatedText = streamedText || displayedText;

  return (
    <div className="h-dvh w-full flex flex-col items-center justify-center bg-theme-bg text-theme-primary relative overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0 bg-[url('/img/stardust.png')] opacity-20 animate-pulse z-0"></div>

      {/* Central Loader */}
      <div className="relative z-10 flex flex-col items-center gap-8 md:gap-12 animate-fade-in px-4">
        <div className="relative group">
          {/* Outer Ring */}
          <div className="w-24 h-24 md:w-32 md:h-32 border border-theme-primary/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
          {/* Middle Ring */}
          <div className="absolute inset-2 border-2 border-t-theme-primary border-r-transparent border-b-theme-primary/50 border-l-transparent rounded-full animate-[spin_3s_linear_infinite]"></div>
          {/* Inner Ring */}
          <div className="absolute inset-6 border border-theme-primary/80 rounded-full animate-pulse shadow-[0_0_30px_rgba(var(--theme-primary),0.5)]"></div>

          {/* Center Core */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-theme-primary rounded-full animate-ping"></div>
          </div>
        </div>

        {/* Text Content */}
        <div className="text-center space-y-4">
          <h2
            className={`text-xl md:text-2xl lg:text-3xl ${themeFont} tracking-widest uppercase text-theme-primary font-bold min-h-[3rem]`}
          >
            {animatedText}
            <span className="animate-pulse">|</span>
          </h2>

          {/* Progress Indicators */}
          <div className="space-y-3">
            {/* Phase Progress Display */}
            {phaseProgress && (
              <div className="flex flex-col items-center gap-2 mb-4">
                {/* Phase Progress Bar */}
                <div className="w-48 md:w-64 h-1.5 bg-theme-primary/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-theme-primary rounded-full transition-all duration-500 ease-out"
                    style={{
                      // Show completed phases: if generating phase N, show (N-1) completed
                      // If phase N is completed, show N completed
                      width: `${
                        ((phaseProgress.status === "completed"
                          ? phaseProgress.phase
                          : phaseProgress.phase - 1) /
                          phaseProgress.totalPhases) *
                        100
                      }%`,
                    }}
                  />
                </div>
                {/* Phase Info */}
                <div className="text-xs text-theme-muted/80 font-mono flex flex-wrap items-center justify-center gap-1">
                  {/* Show completed count / total, not "current phase / total" */}
                  <span className="text-theme-primary">
                    {phaseProgress.status === "completed"
                      ? phaseProgress.phase
                      : phaseProgress.phase - 1}
                  </span>
                  <span>/</span>
                  <span>{phaseProgress.totalPhases}</span>
                  <span className="mx-1">·</span>
                  <span
                    className={`${phaseProgress.status === "generating" ? "animate-pulse" : ""} max-w-[200px] truncate`}
                  >
                    {/* Use the i18n key from phaseName directly */}
                    {t(phaseProgress.phaseName, {
                      defaultValue: phaseProgress.phaseName,
                    })}
                  </span>
                  {phaseProgress.status === "generating" && (
                    <span className="animate-pulse">...</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-theme-muted/80 text-xs md:text-sm uppercase tracking-[0.2em] md:tracking-[0.3em]">
              <span className="w-6 md:w-8 h-px bg-theme-primary/50"></span>
              <span>{t("loading")}</span>
              <span className="w-6 md:w-8 h-px bg-theme-primary/50"></span>
            </div>

            <div className="flex flex-col items-center gap-1 text-[10px] text-theme-muted font-mono">
              <div>
                {t("initializing.audioPreload")}: {audioProgress}%
              </div>
              <div className="flex items-center gap-2">
                <span>{t("initializing.timeElapsed")}:</span>
                <GenerationTimer isActive={true} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
