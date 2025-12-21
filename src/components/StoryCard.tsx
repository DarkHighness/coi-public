import React from "react";
import { useTranslation } from "react-i18next";
import {
  StorySegment,
  AISettings,
  Relationship,
  Location as GameLocation,
  GameState,
} from "../types";
import { getSceneImagePrompt } from "../services/prompts/index";
import { useImageStorageContext } from "../contexts/ImageStorageContext";
import { StoryImage } from "./render/StoryImage";
import { StoryText } from "./render/StoryText";
import { UserActionCard } from "./render/UserActionCard";
import { TokenStats } from "./render/TokenStats";
import { useToast } from "./Toast";
import { MarkdownText } from "./render/MarkdownText";

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
  onImageUpload?: (id: string, imageId: string) => void;
  gameState: GameState;
  saveId?: string;
  onImageDelete?: (id: string) => void;
  hasFailed?: boolean;
  /** Dynamic max width class based on sidebar states */
  maxWidthClass?: string;
  onFork?: () => void;
}

export const StoryCardComponent: React.FC<StoryCardProps> = ({
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
  onImageUpload,
  gameState,
  saveId,
  onImageDelete,
  hasFailed,
  maxWidthClass = "max-w-3xl",
  onFork,
}) => {
  const { t } = useTranslation();
  const { saveImage, deleteImage } = useImageStorageContext();
  const { showToast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Cache the full image prompt to avoid recalculating on every render
  const fullImagePromptRef = React.useRef<string | null>(null);
  const fullImagePrompt = React.useMemo(() => {
    if (!segment.imagePrompt) return undefined;

    // Only recalculate if not cached
    if (fullImagePromptRef.current === null) {
      fullImagePromptRef.current = getSceneImagePrompt(
        segment.imagePrompt,
        gameState,
        segment.stateSnapshot,
      );
    }
    return fullImagePromptRef.current;
  }, [segment.imagePrompt, segment.stateSnapshot, gameState]);

  const handleCopyPrompt = () => {
    return fullImagePrompt || "";
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !onImageUpload) return;

    // Check for existing image and confirm overwrite
    const hasExistingImage =
      !!segment.imageId ||
      (!!segment.imageUrl && segment.imageUrl.trim() !== "");

    if (hasExistingImage) {
      if (
        !window.confirm(
          t(
            "overwriteImageConfirm",
            "This segment already has an image. Do you want to overwrite it?",
          ),
        )
      ) {
        // Reset input so change event fires again if same file selected later
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    try {
      // Save to IndexedDB
      const imageId = await saveImage(file, {
        saveId: saveId || "unsaved",
        forkId: gameState.forkId,
        turnIdx: segment.segmentIdx ?? gameState.turnNumber,
        imagePrompt: "", // Requirement: imagePrompt should be empty
        storyTitle: gameState.outline?.title || undefined,
        location: gameState.currentLocation || undefined,
        storyTime: gameState.time || undefined,
      });

      onImageUpload(segment.id, imageId);
    } catch (error) {
      console.error("Failed to upload image:", error);
      showToast(t("imageUploadFailed", "Failed to upload image"), "error");
    } finally {
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteClick = async () => {
    // Allow delete if image exists OR if prompt exists (to clear placeholder)
    if (!segment.imageId && !segment.imageUrl && !segment.imagePrompt) return;

    if (
      !window.confirm(
        t("deleteImageConfirm", "Are you sure you want to delete this image?"),
      )
    ) {
      return;
    }

    try {
      // Delete from IndexedDB if we have an ID
      if (segment.imageId) {
        await deleteImage(segment.imageId);
      }

      // Update game state
      if (onImageDelete) {
        onImageDelete(segment.id);
      }
    } catch (error) {
      console.error("Failed to delete image:", error);
    }
  };

  if (segment.role === "user") {
    return <UserActionCard text={segment.text} labelDecided={labels.decided} />;
  }

  if (segment.role === "command") {
    return (
      <div
        className={`flex justify-center my-6 animate-fade-in w-full ${maxWidthClass} mx-auto px-4`}
      >
        <div className="w-full border border-theme-primary/40 rounded-md overflow-hidden shadow-lg backdrop-blur-sm group hover:border-theme-primary/60 transition-colors">
          <div className="bg-theme-primary/10 px-3 py-1 border-b border-theme-primary/20 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
            <div className="ml-2 text-[10px] font-mono text-theme-primary/60">
              /bin/zsh
            </div>
          </div>
          <div className="p-4 font-mono text-sm text-theme-primary flex items-start gap-2">
            <span className="text-theme-accent select-none shrink-0">
              $ /sudo
            </span>
            <span className="break-words whitespace-pre-wrap">
              {segment.text}
            </span>
            <span className="w-2 h-4 bg-theme-primary/50 animate-pulse inline-block ml-1 shrink-0" />
          </div>
        </div>
      </div>
    );
  }

  if (segment.role === "system") {
    return (
      <div
        className={`flex justify-center my-8 animate-fade-in ${maxWidthClass} mx-auto px-4`}
      >
        <div className="w-full text-center text-theme-muted text-sm italic border border-theme-border/30 rounded-lg py-4 px-6 bg-theme-surface/30 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-2 text-xs uppercase tracking-widest text-theme-primary/70 font-semibold">
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{t("systemMessage", "System")}</span>
          </div>
          <div className="text-theme-text/80 leading-relaxed">
            <MarkdownText content={segment.text} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col mb-16 animate-slide-in space-y-6 group/card ${maxWidthClass} mx-auto`}
    >
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
        imageId={segment.imageId}
        imageUrl={segment.imageUrl}
        imagePrompt={segment.imagePrompt}
        fullImagePrompt={fullImagePrompt}
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
        onUpload={onImageUpload ? handleUploadClick : undefined}
        onDelete={
          (segment.imageId || segment.imageUrl || segment.imagePrompt) &&
          onImageDelete
            ? handleDeleteClick
            : undefined
        }
        hasFailed={hasFailed}
      />

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

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
          onUpload={onImageUpload ? handleUploadClick : undefined}
          onFork={onFork}
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

export const StoryCard = React.memo(StoryCardComponent, (prev, next) => {
  // 1. Check if segment ID changed (different card)
  if (prev.segment.id !== next.segment.id) return false;

  // 2. Check if segment content changed (text, image, audio, etc.)
  // We can check specific fields or assume immutable updates to the segment object
  if (prev.segment !== next.segment) return false;

  // 3. Check critical props that affect rendering
  if (prev.isLast !== next.isLast) return false;
  if (prev.isGenerating !== next.isGenerating) return false;
  if (prev.hasFailed !== next.hasFailed) return false;
  if (prev.disableImages !== next.disableImages) return false;
  if (prev.shouldAnimate !== next.shouldAnimate) return false;
  if (prev.maxWidthClass !== next.maxWidthClass) return false;

  // 4. Check labels (shallow comparison)
  if (
    prev.labels.decided !== next.labels.decided ||
    prev.labels.vision !== next.labels.vision ||
    prev.labels.unavailable !== next.labels.unavailable
  ) {
    return false;
  }

  // 5. Check AI settings (deep comparison or reference check if immutable)
  // Assuming immutable updates for settings
  if (prev.aiSettings !== next.aiSettings) return false;

  // 6. IGNORE gameState changes for PAST segments
  // If it's the last segment, we might need to re-render if gameState affects it
  // But for past segments, gameState changes (like time passing) shouldn't trigger re-render
  // unless the segment itself changed (checked in step 2)
  if (next.isLast) {
    if (prev.gameState !== next.gameState) return false;
  }

  // If all checks pass, the component is the same
  return true;
});

StoryCard.displayName = "StoryCard";
