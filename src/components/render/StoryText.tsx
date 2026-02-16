import React from "react";
import { useTranslation } from "react-i18next";
import { TypewriterText } from "../TypewriterText";
import { useStoryAudio } from "../../hooks/useStoryAudio";
import { AISettings, PlayerRate, PlayerRateInput } from "../../types";
import { StoryTextHeader } from "./StoryTextHeader";
import { MarkdownText } from "./MarkdownText";
import { useSettings } from "../../hooks/useSettings";
import { normalizeNarrativeMarkdown } from "./storyTextNormalization";

interface StoryTextProps {
  text: string;
  isLast: boolean;
  shouldAnimate?: boolean;
  aiSettings: AISettings;
  onTypingComplete?: () => void;
  narrativeTone?: string;
  segmentId?: string;
  audioKey?: string;
  onAudioGenerated?: (key: string) => void;
  onCopyPrompt?: () => string | Promise<string>;
  onUpload?: () => void;
  onFork?: () => void;
  playerRate?: PlayerRate;
  onRate?: (rate: PlayerRateInput) => void;
}

export const StoryText: React.FC<StoryTextProps> = ({
  text,
  isLast,
  shouldAnimate = true,
  aiSettings,
  onTypingComplete,
  narrativeTone,
  segmentId,
  audioKey,
  onAudioGenerated,
  onCopyPrompt,
  onUpload,
  onFork,
  playerRate,
  onRate,
}) => {
  const { t } = useTranslation();
  const [warning, setWarning] = React.useState<string | null>(null);
  const { themeMode } = useSettings();
  const isDarkMode =
    themeMode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : themeMode === "night";
  const normalizedText = React.useMemo(
    () => normalizeNarrativeMarkdown(text),
    [text],
  );

  const { isPlaying, isLoadingAudio, playAudio } = useStoryAudio(
    normalizedText,
    aiSettings,
    aiSettings.audioVolume?.ttsVolume ?? 1.0,
    aiSettings.audioVolume?.ttsMuted ?? false,
    (msg) => setWarning(msg),
    narrativeTone,
    segmentId,
    audioKey,
    onAudioGenerated,
  );

  return (
    <div className="relative px-2 md:px-6 group">
      {warning && (
        <div className="absolute top-0 left-0 right-0 z-50 flex justify-center -mt-10 animate-fade-in">
          <div className="bg-red-500/90 text-white px-4 py-2 rounded shadow-lg text-sm font-bold backdrop-blur">
            {warning}
            <button
              onClick={() => setWarning(null)}
              className="ml-2 opacity-80 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        {/* Show tools on all segments (desktop: hover for past segments, mobile: only last) */}
        {(isLast || onCopyPrompt || onUpload || onFork) && (
          <StoryTextHeader
            isPlaying={isPlaying}
            isLoading={isLoadingAudio}
            onPlay={playAudio}
            label={t("readAloud")}
            onCopyPrompt={onCopyPrompt}
            onUpload={onUpload}
            onFork={onFork}
            playerRate={playerRate}
            onRate={onRate}
            showOnHover={!isLast}
          />
        )}

        <div
          className={`mx-auto max-w-[72ch] prose prose-lg max-w-none text-theme-text font-serif leading-7 md:leading-8
            prose-p:my-4 md:prose-p:my-5
            prose-headings:font-semibold prose-headings:tracking-wide prose-headings:text-theme-text
            prose-strong:text-theme-text prose-em:text-theme-text/90
            prose-hr:my-6 prose-hr:border-theme-border/25
            prose-a:text-theme-primary prose-a:no-underline hover:prose-a:underline
            prose-blockquote:my-5 prose-blockquote:border-l-2 prose-blockquote:border-theme-border/35 prose-blockquote:pl-4 prose-blockquote:text-theme-text/85 prose-blockquote:not-italic
            prose-code:text-theme-text prose-code:bg-theme-surface/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-theme-surface/10 prose-pre:border prose-pre:border-theme-border/25
            ${isDarkMode ? "prose-invert" : ""}`}
        >
          {isLast ? (
            <TypewriterText
              text={normalizedText}
              speed={aiSettings.typewriterSpeed ?? 15}
              instant={!shouldAnimate}
              onComplete={onTypingComplete}
              enableMarkdown={true}
            />
          ) : (
            <MarkdownText content={normalizedText} />
          )}
        </div>
      </div>
    </div>
  );
};
