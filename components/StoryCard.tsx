import React from "react";
import { useTranslation } from "react-i18next";
import { StorySegment, AISettings } from "../types";
import { StoryImage } from "./render/StoryImage";
import { StoryText } from "./render/StoryText";
import { UserActionCard } from "./render/UserActionCard";
import { TokenStats } from "./render/TokenStats";

interface StoryCardLabels {
  decided: string;
  vision: string;
  unavailable: string;
}

export interface StoryCardProps {
  segment: StorySegment;
  isLast: boolean;
  isGenerating?: boolean;
  labels: StoryCardLabels;
  onAnimate?: (imageUrl: string) => void;
  disableImages?: boolean;
  shouldAnimate?: boolean;
  onGenerateImage?: (id: string) => void;
  aiSettings?: AISettings;
  onTypingComplete?: () => void;
  onAudioGenerated?: (id: string, key: string) => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  segment,
  isLast,
  isGenerating,
  labels,
  onAnimate,
  disableImages = false,
  shouldAnimate = true,
  onGenerateImage,
  aiSettings,
  onTypingComplete,
  onAudioGenerated,
}) => {
  const { t } = useTranslation();

  if (segment.role === "user") {
    return <UserActionCard text={segment.text} labelDecided={labels.decided} />;
  }

  return (
    <div className="flex flex-col mb-16 animate-slide-in space-y-6 group/card max-w-3xl mx-auto">
      {/* Summary Snapshot Display */}
      {segment.summarySnapshot && (
        <div className="flex justify-center my-6 animate-fade-in">
          <div className="bg-theme-surface/40 border border-theme-border/40 rounded-lg p-6 max-w-xl text-center backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-theme-primary/80 mb-3 font-semibold">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span>{t("summarySnapshot")}</span>
            </div>
            <div className="text-sm text-theme-text/90 italic font-serif leading-relaxed">
              {segment.summarySnapshot}
            </div>
          </div>
        </div>
      )}

      <StoryImage
        imageUrl={segment.imageUrl}
        imagePrompt={segment.imagePrompt}
        isGenerating={isGenerating}
        labelVision={labels.vision}
        labelUnavailable={labels.unavailable}
        onAnimate={onAnimate}
        onRegenerate={
          segment.imagePrompt && onGenerateImage
            ? () => onGenerateImage(segment.id)
            : undefined
        }
        disableImages={disableImages}
        imageGenerationEnabled={aiSettings?.image?.enabled !== false}
        manualImageGen={aiSettings?.manualImageGen}
        imageSkipped={segment.imageSkipped}
      />

      {/* Manual Image Generation Button */}
      {/* {!segment.imageUrl && segment.imagePrompt && onGenerateImage && !disableImages && (
          <div className="flex justify-center -mt-4 mb-4 relative z-10">
             <button
               onClick={() => onGenerateImage(segment.id)}
               className="flex items-center gap-2 px-3 py-1 bg-theme-surface/80 hover:bg-theme-primary/20 border border-theme-border hover:border-theme-primary rounded-full text-xs text-theme-muted hover:text-theme-primary transition-all backdrop-blur"
               title="Visualize this moment"
             >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                Paint Scene
             </button>
          </div>
      )} */}

      <div className="flex flex-col">
        <StoryText
          text={segment.text}
          isLast={isLast}
          shouldAnimate={shouldAnimate}
          aiSettings={aiSettings}
          onTypingComplete={onTypingComplete}
          narrativeTone={segment.narrativeTone}
          segmentId={segment.id}
          audioKey={segment.audioKey}
          onAudioGenerated={(key) => onAudioGenerated?.(segment.id, key)}
        />
        <div className="px-6">
          <TokenStats usage={segment.usage} />
        </div>
      </div>
    </div>
  );
};
