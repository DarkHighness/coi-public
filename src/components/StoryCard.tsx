import React from "react";
import { useTranslation } from "react-i18next";
import {
  StorySegment,
  AISettings,
  NPC,
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
  onGeneratePrompt?: (id: string) => void;
  onGenerateImageFull?: (id: string) => void;
  onGenerateCinematic?: (id: string) => void;
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
  onGeneratePrompt,
  onGenerateImageFull,
  onGenerateCinematic,
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
    return (
      <UserActionCard text={segment.text} labelDecided={t("you") || "You"} />
    );
  }

  if (segment.role === "command") {
    return (
      <div
        className={`flex justify-center my-6 animate-fade-in w-full ${maxWidthClass} mx-auto px-4`}
      >
        <div className="w-full max-w-[72ch]">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-theme-border/50 to-transparent opacity-70" />
          <div className="py-4">
            <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-theme-muted mb-2">
              <span className="text-theme-primary font-bold">/sudo</span>
              <span className="font-mono opacity-70">/bin/zsh</span>
            </div>
            <pre className="text-xs md:text-sm font-mono text-theme-text/90 leading-relaxed whitespace-pre-wrap pl-3 border-l border-theme-border/25">
              {segment.text}
            </pre>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-theme-border/50 to-transparent opacity-70" />
        </div>
      </div>
    );
  }

  if (segment.role === "system") {
    return (
      <div
        className={`flex justify-center my-8 animate-fade-in ${maxWidthClass} mx-auto px-4`}
      >
        <div className="w-full max-w-[72ch]">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-theme-border/50 to-transparent opacity-70" />
          <div className="py-4">
            <div className="flex items-center justify-center gap-2 mb-2 text-[10px] uppercase tracking-widest text-theme-muted">
              <svg
                className="w-4 h-4 text-theme-primary"
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
            <div className="text-theme-text/80 leading-relaxed pl-3 border-l border-theme-border/25 text-sm italic">
              <MarkdownText content={segment.text} />
            </div>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-theme-border/50 to-transparent opacity-70" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full animate-slide-in ${maxWidthClass} mx-auto`}
    >
      {/* Summary Snapshot Display */}
	      {segment.summarySnapshot && (
	        <div className="flex justify-center my-6 animate-fade-in">
	          <div className="w-full max-w-[72ch]">
	            <div className="h-px w-full bg-gradient-to-r from-transparent via-theme-border/50 to-transparent opacity-70" />
	            <div className="py-4">
	              <div className="flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest text-theme-muted mb-3">
	                <span className="h-px w-10 bg-theme-border/45" />
	                <span className="font-serif italic tracking-wide text-theme-text/80">
	                  {t("summarySnapshot")}
	                </span>
	                <span className="h-px w-10 bg-theme-border/45" />
	              </div>
	              <div className="text-sm text-theme-text/85 font-serif leading-relaxed">
	                {segment.summarySnapshot?.displayText || "No Summary Yet."}
	              </div>
	            </div>
	            <div className="h-px w-full bg-gradient-to-r from-transparent via-theme-border/50 to-transparent opacity-70" />
	          </div>
	        </div>
	      )}

      <div className="flex flex-col gap-4 md:gap-5 py-5 md:py-6">
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
          onUpload={onImageUpload ? handleUploadClick : undefined}
          onDelete={
            (segment.imageId || segment.imageUrl || segment.imagePrompt) &&
            onImageDelete
              ? handleDeleteClick
              : undefined
          }
          hasFailed={hasFailed}
          onGeneratePrompt={
            onGeneratePrompt ? () => onGeneratePrompt(segment.id) : undefined
          }
          onGenerateImageFull={
            onGenerateImageFull
              ? () => onGenerateImageFull(segment.id)
              : undefined
          }
          onGenerateCinematic={
            onGenerateCinematic
              ? () => onGenerateCinematic(segment.id)
              : undefined
          }
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
              className={`mx-2 md:mx-6 my-6 text-center animate-fade-in ${
                segment.ending === "death"
                  ? "text-theme-error"
                  : segment.ending === "victory"
                    ? "text-theme-success"
                    : segment.ending === "true_ending"
                      ? "text-theme-unlocked"
                      : segment.ending === "bad_ending"
                        ? "text-theme-secret"
                        : "text-theme-muted"
              }`}
            >
              <div className="h-px w-full bg-gradient-to-r from-transparent via-theme-border/60 to-transparent opacity-70 mb-4" />
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
                {segment.ending === "bad_ending" &&
                  (t("badEnding") || "BAD END")}
                {segment.ending === "neutral_ending" &&
                  (t("ending") || "THE END")}
              </div>
              <div className="text-xs mt-3 opacity-70 max-w-[60ch] mx-auto leading-relaxed">
                {segment.forceEnd
                  ? t("endingFinal") || "This story has reached its conclusion"
                  : t("endingHint") ||
                    "You can fork from an earlier point to try a different path"}
              </div>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-theme-border/60 to-transparent opacity-70 mt-4" />
            </div>
          )}

          <div className="px-2 md:px-6">
            <TokenStats usage={segment.usage} />
          </div>
        </div>
      </div>

      {!isLast && (
        <div className="flex items-center justify-center py-3">
          <div className="h-px w-full max-w-3xl bg-gradient-to-r from-transparent via-theme-border/60 to-transparent opacity-35" />
        </div>
      )}
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
