import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { preloadAudio } from "../../utils/audioLoader";

import { useWakeLock } from "../../hooks/useWakeLock";
import { GenerationTimer } from "../common/GenerationTimer";
import { InitializingButterflies } from "../effects/InitializingButterflies";
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
  seedImageUrl?: string | null;
}

export const InitializingPage: React.FC<InitializingPageProps> = ({
  themeFont,
  isProcessing = false,
  streamedText = "",
  phaseProgress = null,
  seedImageUrl = null,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [audioProgress, setAudioProgress] = useState(0);
  const [shouldCheckProcessing, setShouldCheckProcessing] = useState(false);
  const [hasEverProcessed, setHasEverProcessed] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(1); // For finale zoom effect
  const [isFinaleActive, setIsFinaleActive] = useState(false);

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

  // Calculate progress percentage with fractional progress within each phase
  // Each phase contributes: starting = +0.3, generating = +0.6, completed = +1.0
  const progressPercent = phaseProgress
    ? (() => {
        const baseProgress = phaseProgress.phase; // completed phases
        let phaseContribution = 0;
        if (phaseProgress.status === "starting") {
          phaseContribution = 0.3;
        } else if (phaseProgress.status === "generating") {
          phaseContribution = 0.6;
        } else if (phaseProgress.status === "completed") {
          phaseContribution = 1.0;
        }
        // For non-completed phases, add partial progress
        const effectiveProgress =
          phaseProgress.status === "completed"
            ? baseProgress
            : baseProgress - 1 + phaseContribution;
        return (
          (Math.max(0, effectiveProgress) / phaseProgress.totalPhases) * 100
        );
      })()
    : 0;

  // Calculate blur amount for seed image background
  // Start at 32px blur, decrease to 4px as progress increases
  const blurAmount = useMemo(() => {
    const maxBlur = 32;
    const minBlur = 4;
    const progress = progressPercent / 100;
    return maxBlur - (maxBlur - minBlur) * progress;
  }, [progressPercent]);

  // Trigger finale zoom effect when all phases complete (100%)
  useEffect(() => {
    if (progressPercent >= 100 && !isFinaleActive) {
      setIsFinaleActive(true);
      // Zoom out briefly then zoom in
      setZoomScale(0.9); // Zoom out
      setTimeout(() => {
        setZoomScale(1.1); // Zoom in
      }, 400);
      setTimeout(() => {
        setZoomScale(1); // Return to normal
      }, 800);
    }
  }, [progressPercent, isFinaleActive]);

  return (
    <div
      className="h-dvh w-full flex flex-col items-center justify-center bg-theme-bg text-theme-primary relative overflow-hidden"
      style={{
        transform: `scale(${zoomScale})`,
        transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Seed Image Background with Dynamic Blur */}
      {seedImageUrl && (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000 ease-out"
          style={{
            backgroundImage: `url(${seedImageUrl})`,
            filter: `blur(${blurAmount}px)`,
            transform: "scale(1.1)", // Slightly larger to avoid blur edge artifacts
          }}
        />
      )}

      {/* Dark overlay for seed image to ensure text readability */}
      {seedImageUrl && <div className="absolute inset-0 z-0 bg-black/40" />}

      {/* Animated Gradient Background - reduced opacity when seed image present */}
      <div
        className={`absolute inset-0 bg-gradient-to-br from-theme-bg via-theme-surface to-theme-bg z-0 ${seedImageUrl ? "opacity-30" : "opacity-80"}`}
      />

      {/* Animated Mesh Gradient Overlay */}
      <div className="absolute inset-0 opacity-30 z-0">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 bg-theme-primary/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "4s" }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-theme-primary/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "6s", animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-96 h-96 bg-theme-primary/15 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "5s", animationDelay: "2s" }}
        />
      </div>

      {/* Butterflies - increase with phase progress */}
      <InitializingButterflies
        currentPhase={phaseProgress?.phase ?? 1}
        totalPhases={phaseProgress?.totalPhases ?? 10}
        isComplete={progressPercent >= 100}
      />

      {/* Particle Effect */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-theme-primary/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Central Loader */}
      <div className="relative z-10 flex flex-col items-center gap-10 md:gap-14 px-4 max-w-4xl">
        {/* Pulsating Orb with Multiple Rings */}
        <div className="relative group">
          {/* Outermost Glow Ring */}
          <div
            className="absolute -inset-24 bg-theme-primary/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: "3s" }}
          />

          {/* Rotating Outer Ring */}
          <div className="w-32 h-32 md:w-40 md:h-40 relative">
            <div className="absolute inset-0 border-2 border-theme-primary/30 rounded-full animate-[spin_12s_linear_infinite]" />
            <div className="absolute inset-2 border-2 border-theme-primary/20 rounded-full animate-[spin_8s_linear_infinite_reverse]" />
          </div>

          {/* Middle Animated Ring */}
          <div className="absolute inset-4 border-[3px] border-t-theme-primary border-r-theme-primary/60 border-b-theme-primary/30 border-l-transparent rounded-full animate-[spin_2.5s_linear_infinite]" />

          {/* Inner Glow Ring */}
          <div
            className="absolute inset-8 border-2 border-theme-primary/80 rounded-full animate-pulse shadow-[0_0_40px_rgba(var(--theme-primary-rgb,251,146,60),0.6)]"
            style={{ animationDuration: "2s" }}
          />

          {/* Core Orb */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Pulsing Core */}
              <div className="w-4 h-4 bg-theme-primary rounded-full animate-ping" />
              {/* Static Core */}
              <div className="absolute inset-0 w-4 h-4 bg-theme-primary rounded-full shadow-[0_0_20px_rgba(var(--theme-primary-rgb,251,146,60),0.8)]" />
            </div>
          </div>

          {/* Orbiting Particles */}
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute inset-0"
              style={{
                animation: `spin ${3 + i}s linear infinite`,
                animationDelay: `${i * 0.5}s`,
              }}
            >
              <div className="absolute top-0 left-1/2 w-2 h-2 -ml-1 bg-theme-primary/60 rounded-full shadow-[0_0_10px_rgba(var(--theme-primary-rgb,251,146,60),0.6)]" />
            </div>
          ))}
        </div>

        {/* Text Content */}
        <div className="text-center space-y-6 w-full">
          {/* Main Text with Gradient */}
          <div className="relative">
            <h2
              className={`text-2xl md:text-3xl lg:text-4xl ${themeFont} tracking-wider text-theme-primary font-bold min-h-[4rem] leading-relaxed px-4`}
              style={{
                background: `linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-hover) 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textShadow:
                  "0 0 30px rgba(var(--theme-primary-rgb,251,146,60),0.3)",
              }}
            >
              {animatedText}
              <span className="animate-pulse ml-1">|</span>
            </h2>
          </div>

          {/* Progress Indicators */}
          <div className="space-y-4">
            {/* Phase Progress Display */}
            {phaseProgress && (
              <div className="flex flex-col items-center gap-3">
                {/* Enhanced Progress Bar */}
                <div className="w-64 md:w-80 lg:w-96 h-2 bg-theme-surface-highlight rounded-full overflow-hidden relative shadow-inner">
                  {/* Background Glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-theme-primary/10 to-transparent animate-pulse" />
                  {/* Progress Fill with Gradient */}
                  <div
                    className="h-full rounded-full relative overflow-hidden"
                    style={{
                      width: `${progressPercent}%`,
                      background: `linear-gradient(90deg, var(--theme-primary-hover) 0%, var(--theme-primary) 100%)`,
                      boxShadow:
                        "0 0 15px rgba(var(--theme-primary-rgb,251,146,60),0.6)",
                      transition:
                        "width 0.7s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease",
                    }}
                  >
                    {/* Animated Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
                  </div>
                </div>

                {/* Phase Info */}
                <div className="text-sm text-theme-text/80 font-mono flex flex-wrap items-center justify-center gap-2 backdrop-blur-sm bg-theme-surface/30 px-4 py-2 rounded-full">
                  <span className="text-theme-primary font-bold">
                    {phaseProgress.status === "completed"
                      ? phaseProgress.phase
                      : Math.max(0, phaseProgress.phase - 1)}
                  </span>
                  <span className="text-theme-muted/60">/</span>
                  <span className="text-theme-muted">
                    {phaseProgress.totalPhases}
                  </span>
                  <span className="mx-2 text-theme-primary/50">•</span>
                  <span
                    className={`${phaseProgress.status === "generating" ? "animate-pulse" : ""} max-w-[250px] truncate`}
                  >
                    {t(phaseProgress.phaseName, {
                      defaultValue: phaseProgress.phaseName,
                    })}
                  </span>
                  {phaseProgress.status === "generating" && (
                    <span className="animate-pulse text-theme-primary">
                      ...
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Loading Divider */}
            <div className="flex items-center justify-center gap-3 text-theme-text/60 text-sm md:text-base uppercase tracking-[0.3em] md:tracking-[0.4em]">
              <span className="w-8 md:w-12 h-px bg-gradient-to-r from-transparent via-theme-primary/60 to-transparent" />
              <span className="font-light">{t("loading")}</span>
              <span className="w-8 md:w-12 h-px bg-gradient-to-r from-transparent via-theme-primary/60 to-transparent" />
            </div>

            {/* Stats Card */}
            <div className="flex flex-col items-center gap-2 text-xs text-theme-muted/70 font-mono backdrop-blur-md bg-theme-surface/20 px-6 py-3 rounded-2xl border border-theme-border/20 shadow-lg transition-all duration-300 ease-in-out">
              <div className="flex items-center gap-2">
                <span className="text-theme-primary/80">◆</span>
                <span>
                  {t("initializing.audioPreload")}: {audioProgress}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-theme-primary/80">◆</span>
                <span className="flex items-center gap-2">
                  {t("initializing.timeElapsed")}:
                  <GenerationTimer isActive={true} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 0.4;
          }
          50% {
            transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px);
            opacity: 0.6;
          }
          90% {
            opacity: 0.2;
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </div>
  );
};
