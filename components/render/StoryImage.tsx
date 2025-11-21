import React from "react";
import { MagicMirrorButton } from "./MagicMirrorButton";
import { ImagePlaceholder } from "./ImagePlaceholder";

interface StoryImageProps {
  imageUrl?: string;
  imagePrompt?: string;
  isGenerating?: boolean;
  labelVision: string;
  labelUnavailable: string;
  onAnimate?: (url: string) => void;
  onRegenerate?: () => void;
  disableImages: boolean;
  imageGenerationEnabled: boolean;
  manualImageGen?: boolean;
  themeFont?: string;
  imageSkipped?: boolean;
}

export const StoryImage: React.FC<StoryImageProps> = ({
  imageUrl,
  imagePrompt,
  isGenerating,
  labelVision,
  labelUnavailable,
  onAnimate,
  onRegenerate,
  disableImages,
  imageGenerationEnabled,
  manualImageGen,
  themeFont,
  imageSkipped,
}) => {
  if (disableImages) return null;

  // If image was intentionally skipped by AI, do not render anything
  if (imageSkipped && !imageUrl && !isGenerating) return null;

  // State 3: Has imagePrompt AND imageUrl - Show image with action buttons
  if (imageUrl && imagePrompt) {
    return (
      <div className="relative w-full aspect-video rounded-sm overflow-hidden shadow-2xl border-2 border-theme-border bg-black group">
        <img
          src={imageUrl}
          alt="Scene visualization"
          className="w-full h-full object-cover transition-transform duration-[2000ms] ease-in-out group-hover:scale-105 opacity-90 hover:opacity-100 animate-[blur-in_1s_ease-out]"
          style={{
            animation: "blur-in 1s ease-out forwards",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-theme-bg via-transparent to-transparent opacity-30 pointer-events-none"></div>

        {/* Action Buttons Container */}
        <div className="absolute top-3 right-3 flex gap-2">
          {/* Regenerate Button - Only show if onRegenerate callback exists */}
          {onRegenerate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
              }}
              className="bg-black/60 hover:bg-theme-primary text-white p-2 rounded backdrop-blur-md border border-white/10 transition-all opacity-80 md:opacity-0 md:group-hover:opacity-100 md:translate-y-[-10px] md:group-hover:translate-y-0 duration-500 shadow-lg z-10"
              title="Regenerate Image"
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                ></path>
              </svg>
            </button>
          )}

          {/* Magic Mirror Button */}
          {onAnimate && (
            <MagicMirrorButton onAnimate={() => onAnimate(imageUrl)} />
          )}
        </div>
      </div>
    );
  }

  // State 2: Has imagePrompt but NO imageUrl - Generation was intended but may have failed
  // Show regenerate button if generation is enabled, otherwise show unavailable
  if (imagePrompt && !imageUrl) {
    const canRegenerate = !!(imageGenerationEnabled && onRegenerate);
    // Only show as "failed" if it's not manual mode (in manual mode, it's just waiting for click)
    const actuallyFailed = !isGenerating && canRegenerate && !manualImageGen;

    return (
      <div className="relative w-full aspect-video rounded-sm overflow-hidden shadow-2xl border-2 border-theme-border bg-black">
        <ImagePlaceholder
          isGenerating={isGenerating || false}
          hasFailed={actuallyFailed}
          labelVision={labelVision}
          labelUnavailable={labelUnavailable}
          themeFont={themeFont}
          onRegenerate={canRegenerate ? onRegenerate : undefined}
        />
      </div>
    );
  }

  // State 1: No imagePrompt and No imageUrl - Image was never intended
  // Show unavailable message (no button)
  return (
    <div className="relative w-full aspect-video rounded-sm overflow-hidden shadow-2xl border-2 border-theme-border bg-black">
      <ImagePlaceholder
        isGenerating={false}
        hasFailed={false}
        labelVision={labelVision}
        labelUnavailable={labelUnavailable}
        themeFont={themeFont}
        onRegenerate={undefined}
      />
    </div>
  );
};
