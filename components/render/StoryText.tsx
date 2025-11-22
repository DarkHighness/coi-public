import React from "react";
import { useTranslation } from "react-i18next";
import { TypewriterText } from "../TypewriterText";
import { useStoryAudio } from "../../hooks/useStoryAudio";
import { AISettings } from "../../types";
import { StoryTextHeader } from "./StoryTextHeader";
import { Toast } from "../Toast";

interface StoryTextProps {
  text: string;
  isLast: boolean;
  shouldAnimate?: boolean;
  aiSettings?: AISettings;
  onTypingComplete?: () => void;
  narrativeTone?: string;
  segmentId?: string;
  audioKey?: string;
  onAudioGenerated?: (key: string) => void;
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
}) => {
  const { t } = useTranslation();
  const [warning, setWarning] = React.useState<string | null>(null);

  const { isPlaying, isLoadingAudio, playAudio } = useStoryAudio(
    text,
    aiSettings?.audioVolume?.ttsVolume ?? 1.0,
    aiSettings?.audioVolume?.ttsMuted ?? false,
    (msg) => setWarning(msg),
    narrativeTone,
    segmentId,
    audioKey,
    onAudioGenerated,
  );

  return (
    <div className="relative px-2 md:px-6">
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
      {/* Decorative side line */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-theme-primary/50 via-theme-primary/10 to-transparent opacity-50"></div>

      <StoryTextHeader
        isPlaying={isPlaying}
        isLoading={isLoadingAudio}
        onPlay={playAudio}
        label={t("readAloud")}
      />

      <div className="prose prose-invert prose-lg max-w-none text-theme-text leading-8 font-serif">
        {isLast ? (
          <TypewriterText
            text={text}
            speed={15}
            instant={!shouldAnimate}
            onComplete={onTypingComplete}
          />
        ) : (
          <div className="whitespace-pre-line">{text}</div>
        )}
      </div>
    </div>
  );
};
