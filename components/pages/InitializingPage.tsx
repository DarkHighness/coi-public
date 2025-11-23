import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { preloadAudio } from "../../utils/audioLoader";

interface InitializingPageProps {
  themeFont: string;
  isProcessing?: boolean;
}

export const InitializingPage: React.FC<InitializingPageProps> = ({
  themeFont,
  isProcessing = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [audioProgress, setAudioProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [shouldCheckProcessing, setShouldCheckProcessing] = useState(false);

  useEffect(() => {
    preloadAudio(setAudioProgress);

    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    // After 3 seconds, start checking if we're actually processing
    const checkTimer = setTimeout(() => {
      setShouldCheckProcessing(true);
    }, 1000);

    return () => {
      clearInterval(timer);
      clearTimeout(checkTimer);
    };
  }, []);

  // If not processing after initial delay, redirect to home
  useEffect(() => {
    if (shouldCheckProcessing && !isProcessing) {
      console.warn("InitializingPage: Not processing, redirecting to home");
      navigate("/");
    }
  }, [shouldCheckProcessing, isProcessing, navigate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-theme-bg text-theme-primary relative overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse z-0"></div>
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
              <div>Audio Preload: {audioProgress}%</div>
              <div>Time Elapsed: {formatTime(elapsedTime)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
