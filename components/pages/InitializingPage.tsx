import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { preloadAudio } from "../../utils/audioLoader";

import { useWakeLock } from "../../hooks/useWakeLock";
import { GenerationTimer } from "../common/GenerationTimer";

interface InitializingPageProps {
  themeFont: string;
  isProcessing?: boolean;
  streamedText?: string;
}

export const InitializingPage: React.FC<InitializingPageProps> = ({
  themeFont,
  isProcessing = false,
  streamedText = "",
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [audioProgress, setAudioProgress] = useState(0);
  const [shouldCheckProcessing, setShouldCheckProcessing] = useState(false);
  const [hasEverProcessed, setHasEverProcessed] = useState(false);

  // Wake Lock
  useWakeLock(isProcessing);

  // Track if processing has ever been true
  useEffect(() => {
    if (isProcessing) {
      setHasEverProcessed(true);
    }
  }, [isProcessing]);

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

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-theme-bg text-theme-primary relative overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse z-0"></div>

      {/* Streamed Text Background (Blurred) */}
      {streamedText && (
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <div className="w-full h-full p-8 md:p-16 text-justify opacity-20 blur-[4px] select-none font-serif text-lg md:text-xl leading-relaxed text-theme-muted whitespace-pre-wrap animate-pulse overflow-hidden mask-image-fade flex items-center justify-center">
            {streamedText.slice(-2000)}{" "}
            {/* Show only last 2000 chars to prevent DOM overload and keep it relevant */}
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 z-0"></div>

      {/* Central Loader */}
      <div className="relative z-10 flex flex-col items-center gap-12 animate-fade-in">
        <div className="relative group">
          {/* Outer Ring */}
          <div className="w-32 h-32 border-[1px] border-theme-primary/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
          {/* Middle Ring */}
          <div className="absolute inset-2 border-[2px] border-t-theme-primary border-r-transparent border-b-theme-primary/50 border-l-transparent rounded-full animate-[spin_3s_linear_infinite]"></div>
          {/* Inner Ring */}
          <div className="absolute inset-6 border-[1px] border-theme-primary/80 rounded-full animate-pulse shadow-[0_0_30px_rgba(var(--theme-primary),0.5)]"></div>

          {/* Center Core */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-theme-primary rounded-full animate-ping"></div>
          </div>
        </div>

        {/* Text Content */}
        <div className="text-center space-y-4">
          <h2
            className={`text-4xl md:text-6xl ${themeFont} tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-theme-muted via-theme-primary to-theme-muted animate-shimmer bg-[length:200%_auto] font-bold`}
          >
            {t("loading")}
          </h2>

          {/* Progress Indicators */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-theme-muted/80 text-xs md:text-sm uppercase tracking-[0.3em]">
              <span className="w-8 h-[1px] bg-theme-primary/50"></span>
              <span>{t("loading")}</span>
              <span className="w-8 h-[1px] bg-theme-primary/50"></span>
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
