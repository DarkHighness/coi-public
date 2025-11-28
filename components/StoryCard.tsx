import React from "react";
import { useTranslation } from "react-i18next";
import {
  StorySegment,
  AISettings,
  ImageGenerationContext,
  Relationship,
  Location as GameLocation,
  GameState,
} from "../types";
import {
  getSceneImagePrompt,
  createImageGenerationContext,
} from "../services/prompts";
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
  gameState: GameState;
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
  gameState,
}) => {
  const { t } = useTranslation();

  const handleCopyPrompt = () => {
    if (!segment.imagePrompt) return "";

    // If we have a snapshot, reconstruct the full prompt context
    if (segment.stateSnapshot) {
      const imageContext = createImageGenerationContext(
        gameState,
        segment.stateSnapshot,
      );
      return getSceneImagePrompt(segment.imagePrompt, imageContext);
    }

    // Fallback if no snapshot available
    return segment.imagePrompt;
  };

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
              {segment.summarySnapshot?.displayText || "No Summary Yet."}
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
          onCopyPrompt={segment.imagePrompt ? handleCopyPrompt : undefined}
        />

        {/* Ending Banner */}
        {segment.ending && segment.ending !== "continue" && (
          <div
            className={`mx-6 my-4 p-4 rounded-lg border-2 text-center animate-fade-in ${
              segment.ending === "death"
                ? "bg-theme-surface border-theme-error/60 text-theme-error"
                : segment.ending === "victory"
                  ? "bg-theme-surface border-theme-success/60 text-theme-success"
                  : segment.ending === "true_ending"
                    ? "bg-theme-surface border-theme-unlocked/60 text-theme-unlocked"
                    : segment.ending === "bad_ending"
                      ? "bg-theme-surface border-theme-secret/60 text-theme-secret"
                      : "bg-theme-surface border-theme-border text-theme-muted"
            }`}
          >
            <div className="text-3xl mb-2">
              {segment.ending === "death" && "💀"}
              {segment.ending === "victory" && "🏆"}
              {segment.ending === "true_ending" && "⭐"}
              {segment.ending === "bad_ending" && "💔"}
              {segment.ending === "neutral_ending" && "⚖️"}
            </div>
            <div className="text-lg font-bold uppercase tracking-widest">
              {segment.ending === "death" && (t("gameOver") || "GAME OVER")}
              {segment.ending === "victory" && (t("victory") || "VICTORY")}
              {segment.ending === "true_ending" &&
                (t("trueEnding") || "TRUE ENDING")}
              {segment.ending === "bad_ending" && (t("badEnding") || "BAD END")}
              {segment.ending === "neutral_ending" &&
                (t("ending") || "THE END")}
            </div>
            <div className="text-xs mt-2 opacity-70">
              {segment.forceEnd
                ? t("endingFinal") || "This story has reached its conclusion"
                : t("endingHint") ||
                  "You can fork from an earlier point to try a different path"}
            </div>
          </div>
        )}

        <div className="px-6">
          <TokenStats usage={segment.usage} />
        </div>
      </div>
    </div>
  );
};
