import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "./LanguageSelector";
import { THEMES, ENV_THEMES } from "../utils/constants";
import { ThemeSelector } from "./ThemeSelector";
import { CustomContextModal } from "./CustomContextModal";
import { SaveSlot } from "../types";
import { ButterflyBackground } from "./effects/ButterflyBackground";

interface StartScreenProps {
  onStart: (theme: string, customContext?: string) => void;
  onContinue: () => void;
  onLoad: (file: File) => void;
  onOpenSaves: () => void;
  onSettings: () => void;
  latestSave?: SaveSlot;
  onThemePreview?: (theme: string | null) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStart,
  onContinue,
  onLoad,
  onOpenSaves,
  onSettings,
  latestSave,
  onThemePreview,
}) => {
  const [mode, setMode] = useState<"main" | "theme_select">("main");
  const [hoveredTheme, setHoveredTheme] = useState<string>("fantasy");
  const [customContext, setCustomContext] = useState("");
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, i18n } = useTranslation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onLoad(file);
  };

  const [isZooming, setIsZooming] = useState(false);

  // Notify parent of theme hover for global style preview
  React.useEffect(() => {
    if (onThemePreview && mode === "theme_select") {
      onThemePreview(hoveredTheme);
    } else if (onThemePreview) {
      onThemePreview(null);
    }
  }, [hoveredTheme, mode, onThemePreview]);

  const handleStart = (theme: string, customContext?: string) => {
    setIsZooming(true);
    setTimeout(() => {
      onStart(theme, customContext);
    }, 1500); // Match animation duration
  };

  // Dynamic background style based on hovered theme
  const activeThemeVar =
    ENV_THEMES[THEMES[hoveredTheme]?.defaultEnvTheme]?.vars[
      "--theme-primary"
    ] || "#f59e0b";

  return (
    <div
      className={`relative h-dvh w-full overflow-hidden flex flex-col lg:flex-row bg-theme-bg text-theme-text font-sans transition-all duration-1000 ${isZooming ? "scale-[3] opacity-0 filter blur-sm" : "scale-100 opacity-100"}`}
    >
      {/* Global Background Effect */}
      <div
        className="absolute inset-0 z-0 transition-colors duration-1000 ease-linear opacity-20"
        style={{
          background: `radial-gradient(circle at 20% 50%, ${activeThemeVar}, transparent 70%)`,
        }}
      ></div>
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 animate-pulse"></div>
      <ButterflyBackground />

      {/* Left Panel: Branding & Atmosphere - Hidden on mobile when in theme select mode to give space */}
      <div
        className={`relative z-10 lg:w-6/12 h-1/3 lg:h-full flex flex-col justify-center p-8 lg:p-20 pointer-events-none ${mode === "theme_select" ? "hidden lg:flex" : "flex"}`}
      >
        <div className="space-y-4 lg:space-y-6 animate-fade-in-up">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-fantasy tracking-tighter text-text-theme-primary/80 bg-clip-text bg-linear-to-r from-theme-text to-theme-muted drop-shadow-lg transition-all duration-300">
            {t("titlePart1")}
          </h1>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl xl:text-6xl font-scifi uppercase tracking-[0.2em] text-theme-primary/80 transition-all duration-300">
            {t("titlePart2")}
          </h2>
          <p className="hidden lg:block text-lg text-theme-muted max-w-md border-l-4 border-theme-primary pl-6 italic mt-8">
            "{t("startQuote")}"
          </p>
        </div>
      </div>

      {/* Right Panel: Interaction */}
      <div
        className={`relative z-20 lg:w-6/12 ${mode === "theme_select" ? "h-full w-full" : "h-2/3"} lg:h-full bg-theme-surface/80 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-theme-border/50 shadow-2xl flex flex-col overflow-hidden transition-all duration-500`}
      >
        {/* Save Preview Background */}
        {latestSave?.previewImage && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20 blur-md transition-opacity duration-1000 pointer-events-none"
            style={{ backgroundImage: `url(${latestSave.previewImage})` }}
          />
        )}

        {/* Top Bar */}
        <div className="relative z-10 flex justify-end items-center gap-4 p-6 lg:p-8">
          <button
            onClick={onSettings}
            className="p-2 text-theme-muted hover:text-theme-primary transition-colors rounded-full hover:bg-theme-surface-highlight/50"
            title={t("settings")}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              ></path>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              ></path>
            </svg>
          </button>
          <LanguageSelector />
        </div>

        {/* Menu Content */}
        <div className="relative z-10 flex-1 flex flex-col px-8 lg:px-16 max-w-xl mx-auto w-full pb-12 overflow-hidden">
          {mode === "main" ? (
            <div className="space-y-4 animate-slide-in flex flex-col justify-center h-full overflow-y-auto custom-scrollbar px-2">
              {latestSave && (
                <div className="mb-4 group relative">
                  <div className="absolute -inset-0.5 bg-linear-to-r from-theme-primary to-theme-primary-hover rounded-lg blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                  <button
                    onClick={onContinue}
                    className="relative w-full py-5 bg-theme-surface border border-theme-primary text-theme-text font-bold text-xl uppercase tracking-widest hover:bg-theme-surface-highlight transition-all shadow-xl hover:scale-[1.02] transform rounded-lg flex flex-col items-center overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-theme-primary/5 group-hover:bg-theme-primary/10 transition-colors"></div>
                    <span className="relative z-10 text-theme-primary">
                      {t("continueGame")}
                    </span>
                    <span className="relative z-10 text-xs normal-case opacity-80 mt-2 font-normal max-w-[90%] truncate text-theme-muted">
                      {latestSave.summary || t("continueLastAdventure")}
                    </span>
                    <div className="relative z-10 text-[10px] mt-2 text-theme-muted/70 uppercase tracking-wider">
                      {new Date(latestSave.timestamp).toLocaleString()} •{" "}
                      {t(`themes.${latestSave.theme}.name`, latestSave.theme)}
                    </div>
                  </button>
                </div>
              )}

              <button
                onClick={() => setMode("theme_select")}
                className={`w-full py-4 border-2 border-theme-text/10 hover:border-theme-primary text-theme-text font-bold text-lg uppercase tracking-widest hover:bg-theme-surface-highlight transition-all rounded-sm flex items-center justify-center gap-3 group ${!latestSave ? "bg-theme-primary text-theme-bg border-theme-primary hover:bg-theme-primary-hover hover:border-theme-primary-hover" : ""}`}
              >
                <span>{t("startTitle")}</span>
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  ></path>
                </svg>
              </button>

              <div className="pt-6 flex justify-center gap-6">
                <button
                  onClick={onOpenSaves}
                  className="text-theme-muted hover:text-theme-text text-sm uppercase tracking-wide transition-colors flex items-center gap-2 border-b border-transparent hover:border-theme-muted"
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
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    ></path>
                  </svg>
                  {t("saves.load")}
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-theme-muted hover:text-theme-text text-sm uppercase tracking-wide transition-colors flex items-center gap-2 border-b border-transparent hover:border-theme-muted"
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
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    ></path>
                  </svg>
                  {t("import")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full animate-slide-in">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setMode("main")}
                    className="text-theme-muted hover:text-theme-text transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      ></path>
                    </svg>
                  </button>
                  <h3 className="text-sm uppercase tracking-widest text-theme-muted">
                    {t("selectTheme")}
                  </h3>
                </div>

                {/* Customize Button */}
                <button
                  onClick={() => setIsCustomModalOpen(true)}
                  className="relative px-3 py-2 border border-theme-border hover:border-theme-primary text-theme-muted hover:text-theme-primary transition-all rounded-lg text-xs uppercase tracking-wider font-bold flex items-center gap-2"
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    ></path>
                  </svg>
                  <span>{t("customize")}</span>
                  {customContext && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-theme-primary rounded-full animate-pulse"></span>
                  )}
                </button>
              </div>

              <div className="flex-1 relative min-h-0">
                <ThemeSelector
                  themes={THEMES}
                  onSelect={(theme) => handleStart(theme, customContext)}
                  onHover={setHoveredTheme}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 p-6 text-center text-xs text-theme-muted/50 uppercase tracking-widest shrink-0">
          v1.0.1 • Powered by Gemini 3 Pro
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".json,.gz"
        onChange={handleFileChange}
      />

      {/* Custom Context Modal */}
      <CustomContextModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        customContext={customContext}
        setCustomContext={setCustomContext}
      />
    </div>
  );
};
