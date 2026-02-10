import React, {
  useState,
  useRef,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "./LanguageSelector";
import { THEMES } from "../utils/constants";
import { ThemeSelector } from "./ThemeSelector";
import { CustomGameModal } from "./CustomGameModal";
import { CustomContextModal } from "./CustomContextModal";
import { ImageUploadModal } from "./ImageUploadModal";
import { SaveSlot, ImportResult } from "../types";
import { ButterflyBackground } from "./effects/ButterflyBackground";
import { MarkdownText } from "./render/MarkdownText";
import { BUILD_INFO } from "../utils/constants/buildInfo";
import { getImage } from "../utils/imageStorage";
import { getThemeName } from "../services/ai/utils";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { IMAGE_BASED_THEME } from "../services/ai/utils";
import { useSettings } from "../hooks/useSettings";
import { useTutorialContextOptional } from "../contexts/TutorialContext";
import { useTutorialTarget } from "../hooks/useTutorial";
import { createStartScreenTutorialFlow } from "./tutorial/tutorialFlows";

// Lazy load PhotoGalleryModal for code splitting
const PhotoGalleryModal = lazy(() =>
  import("./PhotoGalleryModal").then((module) => ({
    default: module.PhotoGalleryModal,
  })),
);

// Helper component for async image loading
const PreviewBackground: React.FC<{ imageId: string }> = ({ imageId }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        // Check if it's a legacy data URL
        if (imageId.startsWith("data:")) {
          if (active) setImageUrl(imageId);
          return;
        }

        // Load from IndexedDB
        const blob = await getImage(imageId);
        if (blob && active) {
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
          return () => URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error("Failed to load preview image:", err);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [imageId]);

  if (!imageUrl) return null;

  return (
    <div
      className="absolute inset-0 bg-cover bg-center opacity-20 blur-md transition-opacity duration-1000 pointer-events-none animate-fade-in"
      style={{ backgroundImage: `url(${imageUrl})` }}
    />
  );
};

// Lazy load SaveManager to enable proper code splitting (also dynamically imported in App.tsx)
const SaveManager = lazy(() =>
  import("./SaveManager").then((module) => ({
    default: module.SaveManager,
  })),
);

interface StartScreenProps {
  onStart: (
    theme: string,
    customContext?: string,
    seedImage?: Blob,
    protagonistFeature?: string,
  ) => void;
  onContinue: () => void;
  onLoad: (file: File) => void;
  onSettings: () => void;
  latestSave?: SaveSlot;
  onThemePreview?: (theme: string | null) => void;
  setLanguage: (lang: any) => void;
  saveSlots?: SaveSlot[];
  onSwitchSlot?: (id: string) => void;
  onDeleteSlot?: (id: string) => void;
  onRenameSlot?: (id: string, name: string) => Promise<boolean>;
  onRefreshSlots?: () => Promise<SaveSlot[]>;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStart,
  onContinue,
  onLoad,
  onSettings,
  latestSave,
  onThemePreview,
  setLanguage,
  saveSlots = [],
  onSwitchSlot,
  onDeleteSlot,
  onRenameSlot,
  onRefreshSlots,
}) => {
  const [mode, setMode] = useState<"main" | "theme_select">("main");
  const [customContext, setCustomContext] = useState("");
  const [isCustomGameModalOpen, setIsCustomGameModalOpen] = useState(false);
  const [isCustomContextModalOpen, setIsCustomContextModalOpen] =
    useState(false);
  const [isImageUploadOpen, setIsImageUploadOpen] = useState(false);
  const [seedImage, setSeedImage] = useState<Blob | null>(null);
  const [isSaveManagerOpen, setIsSaveManagerOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startTimerRef = useRef<number | null>(null);
  const { t } = useTranslation();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isShortViewport = useMediaQuery("(max-height: 740px)");
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const { settings, themeMode } = useSettings();
  const tutorial = useTutorialContextOptional();
  const selectableThemes = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(THEMES).filter(([key]) => key !== "custom"),
      ),
    [],
  );

  // Tutorial target refs
  const settingsButtonRef =
    useTutorialTarget<HTMLButtonElement>("settings-button");
  const startButtonRef = useTutorialTarget<HTMLButtonElement>(
    "start-adventure-button",
  );

  // Check if valid provider and model are configured
  const hasValidProvider = () => {
    const providers = settings.providers?.instances || [];
    return providers.some(
      (p) => p.enabled && p.apiKey && p.apiKey.trim() !== "",
    );
  };

  const hasValidModel = () => {
    return (
      settings.story?.modelId &&
      settings.story.modelId.trim() !== "" &&
      settings.story?.providerId &&
      settings.story.providerId.trim() !== ""
    );
  };

  // Start tutorial on mount if not completed
  useEffect(() => {
    if (
      tutorial &&
      !tutorial.isActive &&
      settings.extra?.tutorialStartScreenCompleted !== true
    ) {
      const flow = createStartScreenTutorialFlow(t, {
        openSettings: onSettings,
        hasValidProvider,
        hasValidModel,
      });
      tutorial.startTutorial(flow);
    }
  }, [tutorial, settings.extra?.tutorialStartScreenCompleted, t, onSettings]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onLoad(file);
  };

  const [isZooming, setIsZooming] = useState(false);

  const clearStartTimer = useCallback(() => {
    if (startTimerRef.current !== null) {
      window.clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearStartTimer();
    };
  }, [clearStartTimer]);

  const scheduleStart = useCallback(
    (callback: () => void) => {
      clearStartTimer();
      setIsZooming(true);
      startTimerRef.current = window.setTimeout(() => {
        startTimerRef.current = null;
        callback();
      }, 1500);
    },
    [clearStartTimer],
  );

  // Enter theme selection mode and set to fantasy preview
  const enterThemeSelect = () => {
    setMode("theme_select");
    onThemePreview?.("fantasy"); // Set to fantasy as default
  };

  // Exit theme selection mode without selecting - restore original theme
  const exitThemeSelect = () => {
    setMode("main");
    onThemePreview?.(null); // Reset to original (null means no preview override)
  };

  const handleStart = (
    theme: string,
    customContext?: string,
    protagonistFeature?: string,
  ) => {
    scheduleStart(() => {
      onStart(theme, customContext, seedImage || undefined, protagonistFeature);
    });
  };

  // Handle image upload confirmation - start game directly (image IS the theme)
  const handleImageConfirm = (imageBlob: Blob) => {
    setSeedImage(imageBlob);
    setIsImageUploadOpen(false);
    // When starting from image, we bypass theme selection entirely
    // The image itself provides all the context via Phase 0
    scheduleStart(() => {
      onStart(IMAGE_BASED_THEME, undefined, imageBlob);
    });
  };

  // Dynamic background style
  const activeThemeVar = "#ffffff";
  const isNightMode =
    themeMode === "night" || (themeMode === "system" && prefersDark);
  const panelToneClass = isNightMode
    ? "bg-black/72 border-white/20"
    : "bg-white/80 border-slate-300/85";
  const dividerClass = isNightMode ? "border-white/20" : "border-slate-300/85";
  const textPrimaryClass = isNightMode ? "text-white" : "text-slate-900";
  const textSecondaryClass = isNightMode ? "text-white/72" : "text-slate-600";
  const textMutedClass = isNightMode ? "text-white/55" : "text-slate-500";
  const hoverRowClass = isNightMode
    ? "hover:bg-white/10"
    : "hover:bg-slate-900/5";
  const iconToneClass = isNightMode ? "text-white/65" : "text-slate-500";
  const softSurfaceClass = isNightMode ? "bg-white/5" : "bg-slate-900/[0.03]";
  const heroPrimaryTextClass = "text-white";
  const heroSecondaryTextClass = "text-white/78";
  const heroQuoteTextClass = "text-white/68";
  const isShortMobileViewport = !isDesktop && isShortViewport;
  const heroLayoutClass =
    mode === "theme_select"
      ? "hidden lg:flex"
      : isShortMobileViewport
        ? "flex h-[36%] min-h-[236px] sm:h-[40%] sm:min-h-[252px] lg:h-full"
        : "flex h-[42%] min-h-[292px] sm:h-[44%] lg:h-full";
  const menuLayoutClass =
    mode === "theme_select"
      ? "h-full w-full"
      : isShortMobileViewport
        ? "h-[64%] sm:h-[60%]"
        : "h-[58%] sm:h-[56%]";
  const heroPaddingClass = isShortMobileViewport
    ? "px-5 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5"
    : "px-6 pb-4 pt-6 sm:px-8 sm:pb-5 sm:pt-7";
  const heroLogoSizeClass = isShortMobileViewport
    ? "max-w-[196px] sm:max-w-[228px] md:max-w-[254px] lg:max-w-[420px]"
    : "max-w-[248px] sm:max-w-[278px] md:max-w-[308px] lg:max-w-[430px]";
  const heroTitleSizeClass = isShortMobileViewport
    ? "text-[1.7rem] sm:text-[1.9rem] lg:text-5xl xl:text-6xl"
    : "text-2xl sm:text-3xl lg:text-5xl xl:text-6xl";
  const heroSubtitleSizeClass = isShortMobileViewport
    ? "text-sm tracking-[0.16em] sm:text-base lg:text-2xl"
    : "text-base tracking-[0.2em] sm:text-lg lg:text-2xl";
  const heroTextContainerClass = isShortMobileViewport
    ? "mt-2 space-y-1 text-center lg:mt-6 lg:space-y-3 lg:text-left animate-fade-in-up"
    : "mt-3 space-y-2 text-center lg:mt-6 lg:space-y-3 lg:text-left animate-fade-in-up";
  const heroOverlayBaseClass = isNightMode
    ? "bg-black/78 backdrop-blur-[1.5px]"
    : "bg-black/42 backdrop-blur-[0.5px]";
  const heroOverlayAccentClass = isNightMode
    ? "bg-[radial-gradient(circle_at_26%_22%,rgba(255,255,255,0.10),transparent_36%),radial-gradient(circle_at_74%_24%,rgba(255,255,255,0.16),transparent_46%),radial-gradient(circle_at_50%_72%,rgba(15,23,42,0.34),transparent_72%)]"
    : "bg-[radial-gradient(circle_at_24%_22%,rgba(255,255,255,0.20),transparent_35%),radial-gradient(circle_at_74%_22%,rgba(255,255,255,0.22),transparent_48%),radial-gradient(circle_at_50%_76%,rgba(15,23,42,0.24),transparent_74%)]";
  const heroOverlayDustClass = isNightMode
    ? "opacity-32 mix-blend-screen"
    : "opacity-62 mix-blend-screen";
  const heroOverlayDepthClass = isNightMode
    ? "bg-[radial-gradient(circle_at_50%_38%,rgba(0,0,0,0.05),rgba(0,0,0,0.22)_56%,rgba(0,0,0,0.45)_100%)]"
    : "bg-[radial-gradient(circle_at_50%_40%,rgba(0,0,0,0.01),rgba(0,0,0,0.10)_56%,rgba(0,0,0,0.22)_100%)]";
  const heroOverlayVignetteClass = isNightMode
    ? "bg-gradient-to-b from-black/24 via-black/40 to-black/84"
    : "bg-gradient-to-b from-black/8 via-black/20 to-black/48";
  const logoFinalMaskStyle: React.CSSProperties = {
    WebkitMaskImage:
      "radial-gradient(ellipse 62% 56% at 50% 36%, rgba(0,0,0,1) 40%, rgba(0,0,0,0.94) 57%, rgba(0,0,0,0.28) 72%, rgba(0,0,0,0) 90%)",
    maskImage:
      "radial-gradient(ellipse 62% 56% at 50% 36%, rgba(0,0,0,1) 40%, rgba(0,0,0,0.94) 57%, rgba(0,0,0,0.28) 72%, rgba(0,0,0,0) 90%)",
  };

  return (
    <div
      className={`relative h-dvh w-full overflow-hidden font-sans transition-all duration-1000 ${isNightMode ? "bg-[#030409] text-theme-text" : "bg-[#edf2f8] text-slate-900"} ${isZooming ? "scale-[3] opacity-0 blur-sm" : "scale-100 opacity-100"}`}
    >
      {/* Global Background */}
      <div
        className={`absolute inset-0 z-0 ${isNightMode ? "bg-[#030409]" : "bg-[#edf2f8]"}`}
      ></div>
      <div
        className="absolute inset-0 z-0 transition-colors duration-1000 ease-linear"
        style={{
          background: isNightMode
            ? `radial-gradient(circle at 52% 30%, ${activeThemeVar}66, transparent 62%)`
            : `radial-gradient(circle at 52% 30%, ${activeThemeVar}45, transparent 68%)`,
        }}
      ></div>
      <div
        className={`absolute inset-0 z-0 ${
          isNightMode
            ? "bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.18),transparent_48%)]"
            : "bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.72),transparent_45%)]"
        }`}
      ></div>
      <div
        className={`absolute inset-0 z-0 bg-[url('/img/stardust.png')] animate-pulse motion-reduce:animate-none ${
          isNightMode
            ? "opacity-30 mix-blend-screen"
            : "opacity-12 mix-blend-multiply"
        }`}
      ></div>
      <div
        className={`absolute inset-0 z-0 ${
          isNightMode
            ? "bg-gradient-to-b from-black/5 via-black/30 to-black/85"
            : "bg-gradient-to-b from-white/5 via-white/35 to-slate-200/75"
        }`}
      ></div>
      <ButterflyBackground />

      <div className="relative z-20 flex h-full w-full flex-col lg:flex-row">
        <div
          className={`relative overflow-hidden flex items-center justify-center ${heroPaddingClass} lg:w-7/12 lg:px-16 lg:py-12 ${heroLayoutClass}`}
        >
          <div className={`absolute inset-0 ${heroOverlayBaseClass}`}></div>
          <div className={`absolute inset-0 ${heroOverlayAccentClass}`}></div>
          <div
            className={`absolute inset-0 bg-[url('/img/stardust.png')] ${heroOverlayDustClass}`}
          ></div>
          <div className={`absolute inset-0 ${heroOverlayDepthClass}`}></div>
          <div className={`absolute inset-0 ${heroOverlayVignetteClass}`}></div>

          <div className="pointer-events-none relative z-10 w-full max-w-2xl">
            <div
              className={`relative mx-auto w-full ${heroLogoSizeClass} animate-fade-in`}
            >
              <div className="absolute -inset-2 rounded-[50%] bg-[radial-gradient(circle,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_52%,transparent_74%)] blur-xl"></div>
              <div className="relative z-10 isolate overflow-visible">
                <div className="absolute inset-[9%] rounded-[48%] bg-[radial-gradient(ellipse_at_50%_64%,rgba(0,0,0,0.32),rgba(0,0,0,0.08)_42%,transparent_68%)] blur-lg"></div>
                <img
                  src="/app-448-alpha-glow.png"
                  alt={t("title")}
                  width={448}
                  height={448}
                  style={logoFinalMaskStyle}
                  className="relative z-10 w-full select-none pointer-events-none opacity-[0.93] drop-shadow-[0_0_20px_rgba(255,255,255,0.22)]"
                />
              </div>
            </div>

            <div className={heroTextContainerClass}>
              <h1
                className={`${heroTitleSizeClass} font-fantasy tracking-tight ${heroPrimaryTextClass}`}
              >
                {t("titlePart1")}
              </h1>
              <h2
                className={`${heroSubtitleSizeClass} font-scifi uppercase ${heroSecondaryTextClass}`}
              >
                {t("titlePart2")}
              </h2>
              {!isShortMobileViewport && (
                <p
                  className={`mx-auto mt-2 max-w-xl text-xs sm:text-sm lg:mx-0 lg:mt-4 lg:text-base ${heroQuoteTextClass}`}
                >
                  "{t("startQuote")}"
                </p>
              )}
            </div>
          </div>
        </div>

        <div
          className={`relative z-20 lg:w-5/12 ${menuLayoutClass} lg:h-full border-t lg:border-t-0 lg:border-l ${dividerClass} ${panelToneClass} flex flex-col overflow-hidden transition-all duration-500`}
        >
          {latestSave?.previewImage && (
            <PreviewBackground imageId={latestSave.previewImage} />
          )}

          <div
            className={`pointer-events-none absolute inset-0 ${
              isNightMode
                ? "bg-gradient-to-b from-white/[0.03] via-transparent to-black/35"
                : "bg-gradient-to-b from-white/30 via-transparent to-slate-200/25"
            }`}
          ></div>

          {/* Top Bar */}
          <div className="relative z-10 flex justify-end items-center gap-3 p-6 lg:p-8">
            <button
              ref={settingsButtonRef}
              onClick={() => {
                if (
                  tutorial?.isActive &&
                  tutorial.currentStep?.id === "open-settings"
                ) {
                  tutorial.markStepActionComplete();
                  tutorial.nextStep();
                }
                onSettings();
              }}
              data-tutorial-id="settings-button"
              className={`p-2.5 transition-colors ${textMutedClass} ${hoverRowClass}`}
              title={t("settings.title")}
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
            <LanguageSelector onChange={setLanguage} />
          </div>

          {/* Menu Content */}
          <div className="relative z-10 flex-1 flex flex-col px-8 lg:px-16 max-w-xl mx-auto w-full overflow-hidden">
            {mode === "main" ? (
              <div className="space-y-4 animate-slide-in flex flex-col justify-center h-full overflow-y-auto custom-scrollbar px-2">
                {latestSave && (
                  <div className={`mb-2 border-y ${dividerClass}`}>
                    <button
                      onClick={onContinue}
                      className={`w-full py-5 px-2 text-left transition-colors ${hoverRowClass}`}
                    >
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-theme-primary font-bold uppercase tracking-widest text-sm">
                          {t("continueGame")}
                        </span>
                        <span
                          className={`text-[11px] font-mono ${textMutedClass}`}
                        >
                          {new Date(latestSave.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div
                        className={`mt-2 text-sm story-text line-clamp-2 [&_p]:mb-0 ${
                          isNightMode ? "text-white/90" : "text-slate-700"
                        }`}
                      >
                        <MarkdownText
                          content={
                            latestSave.summary || t("continueLastAdventure")
                          }
                          disableIndent
                        />
                      </div>
                      <div
                        className={`mt-2 text-xs tracking-wide ${textMutedClass}`}
                      >
                        {getThemeName(latestSave?.theme, t)}
                      </div>
                    </button>
                  </div>
                )}

                <button
                  ref={startButtonRef}
                  onClick={enterThemeSelect}
                  data-tutorial-id="start-adventure-button"
                  className={`w-full min-h-12 py-4 px-2 border-b ${dividerClass} hover:border-theme-primary/40 font-bold text-lg tracking-wide transition-colors flex items-center justify-between group ${hoverRowClass} ${
                    !latestSave
                      ? `border-t ${dividerClass} text-theme-primary hover:text-theme-primary-hover`
                      : `${textPrimaryClass} hover:text-theme-primary`
                  }`}
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

                <button
                  onClick={() => setIsCustomGameModalOpen(true)}
                  className={`w-full min-h-12 py-3 px-2 border-b ${dividerClass} transition-colors flex items-center justify-between gap-4 ${textPrimaryClass} ${hoverRowClass} hover:text-theme-primary`}
                >
                  <span className="flex items-center gap-3">
                    <svg
                      className={`w-4 h-4 ${iconToneClass}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                      />
                    </svg>
                    <span>{t("customGame.open")}</span>
                  </span>
                  <svg
                    className={`w-5 h-5 ${iconToneClass}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>

                <button
                  onClick={() => setIsImageUploadOpen(true)}
                  className={`w-full min-h-12 py-3 px-2 border-b ${dividerClass} transition-colors flex items-center justify-between gap-4 ${textPrimaryClass} ${hoverRowClass} hover:text-theme-primary`}
                >
                  <span className="flex items-center gap-3">
                    <svg
                      className={`w-4 h-4 ${iconToneClass}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>{t("startFromImage")}</span>
                  </span>
                  <svg
                    className={`w-5 h-5 ${iconToneClass}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>

                <div className="pt-6 flex justify-center gap-6">
                  <button
                    onClick={() => setIsSaveManagerOpen(true)}
                    className={`text-sm tracking-wide transition-colors flex items-center gap-2 border-b border-transparent ${textSecondaryClass} hover:border-current`}
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
                    onClick={() => setIsGalleryOpen(true)}
                    className={`text-sm tracking-wide transition-colors flex items-center gap-2 border-b border-transparent ${textSecondaryClass} hover:border-current`}
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
                        strokeWidth="1.5"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {t("gallery.title")}
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`text-sm tracking-wide transition-colors flex items-center gap-2 border-b border-transparent ${textSecondaryClass} hover:border-current`}
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
                    {t("import.shortTitle")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full animate-slide-in">
                <div
                  className={`flex items-center justify-between mb-4 shrink-0 border-b pb-3.5 ${dividerClass}`}
                >
                  <div className="flex items-center gap-4">
                    <button
                      onClick={exitThemeSelect}
                      className={`h-9 w-9 grid place-items-center rounded-xl border ${dividerClass} ${textSecondaryClass} transition-colors ${hoverRowClass}`}
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
                          d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        ></path>
                      </svg>
                    </button>
                    <h3
                      className={`text-[11px] uppercase tracking-[0.14em] ${textSecondaryClass}`}
                    >
                      {t("selectTheme")}
                    </h3>
                  </div>

                  <button
                    onClick={() => setIsCustomContextModalOpen(true)}
                    className={`relative h-9 px-3.5 rounded-xl border ${dividerClass} ${softSurfaceClass} ${textSecondaryClass} transition-colors text-[11px] uppercase tracking-[0.1em] font-semibold flex items-center gap-2 ${hoverRowClass}`}
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
                  {!isDesktop && (
                    <ThemeSelector
                      themes={selectableThemes}
                      onSelect={(theme, role) =>
                        handleStart(theme, customContext, role)
                      }
                      onPreviewTheme={onThemePreview}
                      onBack={exitThemeSelect}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className={`relative z-10 p-6 text-center text-xs tracking-wide shrink-0 ${textMutedClass}`}
          >
            {t("version")} : {BUILD_INFO.buildTime} {BUILD_INFO.gitHash}
          </div>
        </div>
      </div>

      {/* Desktop Full Screen Theme Selector Overlay */}
      {isDesktop && mode === "theme_select" && (
        <div
          className={`absolute inset-0 z-50 animate-fade-in ${
            isNightMode ? "bg-black/45" : "bg-slate-100/80"
          }`}
        >
          <ThemeSelector
            themes={selectableThemes}
            onSelect={(theme, role) => handleStart(theme, customContext, role)}
            onPreviewTheme={onThemePreview}
            onBack={exitThemeSelect}
          />
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".json,.gz,.zip"
        onChange={handleFileChange}
      />

      {/* Custom Game Modal */}
      <CustomGameModal
        isOpen={isCustomGameModalOpen}
        onClose={() => setIsCustomGameModalOpen(false)}
        onStart={({ customContext, protagonistRole }) => {
          setIsCustomGameModalOpen(false);
          handleStart("custom", customContext, protagonistRole);
        }}
      />

      {/* Custom Context Modal */}
      <CustomContextModal
        isOpen={isCustomContextModalOpen}
        onClose={() => setIsCustomContextModalOpen(false)}
        customContext={customContext}
        setCustomContext={setCustomContext}
      />

      {/* Image Upload Modal */}
      <ImageUploadModal
        isOpen={isImageUploadOpen}
        onClose={() => setIsImageUploadOpen(false)}
        onConfirm={handleImageConfirm}
      />

      {/* Save Manager Modal */}
      {isSaveManagerOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-white rounded-full" />
            </div>
          }
        >
          <SaveManager
            slots={saveSlots}
            currentSlotId={null}
            onSwitch={(id) => {
              onSwitchSlot?.(id);
              setIsSaveManagerOpen(false);
            }}
            onDelete={onDeleteSlot || (() => {})}
            onRename={onRenameSlot}
            onClose={() => setIsSaveManagerOpen(false)}
            onImportComplete={async (result: ImportResult) => {
              if (result.success && onRefreshSlots) {
                await onRefreshSlots();
              }
            }}
          />
        </Suspense>
      )}

      {/* Photo Gallery Modal */}
      {isGalleryOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
              <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <PhotoGalleryModal
            isOpen={isGalleryOpen}
            onClose={() => setIsGalleryOpen(false)}
            saveSlots={saveSlots}
          />
        </Suspense>
      )}
      {/* Tutorial is now handled by TutorialContext and TutorialSpotlight in App.tsx */}
    </div>
  );
};
