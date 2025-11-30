/**
 * StoryImage Component - Handles image display logic for story segments
 *
 * SIMPLIFIED STATE HANDLING LOGIC (in priority order):
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Priority 0: Global Disable
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Condition: disableImages = true                                         │
 * │ Action:    return null (no image container at all)                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Priority 1: No Provider Configured (Case 1.2)
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Condition: imagePrompt exists BUT imageGenerationEnabled = false        │
 * │ Action:    return null (copy button shows in StoryTextHeader instead)   │
 * │ Note:      If no provider is configured, image generation is impossible │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Priority 2: Image Successfully Generated
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Condition: imageUrl exists AND imagePrompt exists                       │
 * │ Display:   Full image with action buttons:                              │
 * │            • Copy prompt button (top-right)                              │
 * │            • Regenerate button (if onRegenerate provided)                │
 * │            • Magic Mirror button (if onAnimate provided)                 │
 * │ Features:  Click to zoom (lightbox), hover effects                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Priority 3: Waiting for Generation / Failed (Case 1.3 & 1.4)
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Condition: imagePrompt exists BUT !imageUrl                             │
 * │ Scenarios:                                                               │
 * │   • isGenerating = true     → Show loading placeholder                  │
 * │   • manualImageGen = true   → Show "Click to Generate" placeholder      │
 * │   • actuallyFailed = true   → Show "Failed - Retry" placeholder         │
 * │                                                                          │
 * │ Display:   Placeholder with copy prompt button (top-right)              │
 * │            Regenerate enabled if canRegenerate = true                   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Priority 4: No Image Intended (Case 1.1)
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Condition: !imagePrompt AND !imageUrl                                   │
 * │ Display:   Simple "Image Unavailable" placeholder                       │
 * │ Note:      If AI doesn't want image, it won't provide imagePrompt       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * STATE COMBINATION TABLE:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * | Prompt | URL | Provider | Generating | Manual | Result      |
 * |--------|-----|----------|------------|--------|-------------|
 * |   ❌   | ❌  |    -     |     -      |   -    | Unavailable |
 * |   ✅   | ❌  |    ❌    |     -      |   -    | null (1.2)  |
 * |   ✅   | ❌  |    ✅    |    ✅      |  ❌    | Loading     |
 * |   ✅   | ❌  |    ✅    |    ❌      |  ✅    | Manual      |
 * |   ✅   | ❌  |    ✅    |    ✅      |  ✅    | Manual*     |
 * |   ✅   | ❌  |    ✅    |    ❌      |  ❌    | Failed      |
 * |   ✅   | ✅  |    -     |     -      |   -    | Show Image  |
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * * Manual mode overrides generating state (new segments show "Click to Generate")
 */

import React from "react";
import { MagicMirrorButton } from "./MagicMirrorButton";
import { ImagePlaceholder } from "./ImagePlaceholder";
import { ImageLightbox } from "./ImageLightbox";
import { useTranslation } from "react-i18next";
import { useImageURL } from "../../hooks/useImageStorage";

interface StoryImageProps {
  imageId?: string; // New prop for IndexedDB image ID
  imageUrl?: string; // Legacy/Fallback URL
  imagePrompt?: string;
  /** The full styled prompt used for image generation (includes context, style, etc.) */
  fullImagePrompt?: string;
  isGenerating?: boolean;
  labelVision: string;
  labelUnavailable: string;
  onAnimate?: (url: string) => void;
  onRegenerate?: () => void;
  disableImages: boolean;
  imageGenerationEnabled: boolean;
  manualImageGen?: boolean;
  themeFont?: string;
  onUpload?: () => void;
}

export const StoryImage: React.FC<StoryImageProps> = ({
  imageId,
  imageUrl: legacyImageUrl,
  imagePrompt,
  fullImagePrompt,
  isGenerating,
  labelVision,
  labelUnavailable,
  onAnimate,
  onRegenerate,
  disableImages,
  imageGenerationEnabled,
  manualImageGen,
  themeFont,
  onUpload,
}) => {
  const { t } = useTranslation();
  const [lightboxImage, setLightboxImage] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Resolve image URL from ID if provided
  const { url: resolvedUrl, isLoading } = useImageURL(imageId);

  // Use resolved URL or legacy URL
  const displayUrl = resolvedUrl || legacyImageUrl;

  // Copy prompt to clipboard
  const handleCopyPrompt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Prefer fullImagePrompt if available, otherwise use imagePrompt
    const promptToCopy = fullImagePrompt || imagePrompt;
    if (!promptToCopy) return;

    try {
      await navigator.clipboard.writeText(promptToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy prompt:", err);
    }
  };

  // Early return: Global image disable
  if (disableImages) return null;

  // If no image prompt and no image (ID or URL) and no upload handler, don't show anything
  // But if we have an upload handler, we might want to show the placeholder to allow uploading
  if ((!imagePrompt || imagePrompt.trim() === "") && !displayUrl && !onUpload)
    return null;

  // Copy Prompt Button Component (defined early for use in multiple states)
  const CopyPromptButton = () => (
    <button
      onClick={handleCopyPrompt}
      className="bg-black/60 hover:bg-theme-primary text-white p-2 rounded backdrop-blur-md border border-white/10 transition-all opacity-80 md:opacity-0 md:group-hover:opacity-100 md:translate-y-[-10px] md:group-hover:translate-y-0 duration-500 shadow-lg z-10"
      title={copied ? t("storyImage.promptCopied") : t("storyImage.copyPrompt")}
    >
      {copied ? (
        <svg
          className="w-5 h-5 text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
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
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );

  // Case 1.2: Has imagePrompt but NO image provider configured
  // Don't show image container - copy button will be shown on StoryCard header instead
  if (imagePrompt && imagePrompt.trim().length > 0 && !imageGenerationEnabled) {
    return null;
  }

  // State 3: Has imagePrompt AND imageUrl - Show image with action buttons
  if (displayUrl && imagePrompt) {
    return (
      <>
        <div
          className="relative w-full aspect-video rounded-sm overflow-hidden shadow-2xl border-2 border-theme-border bg-black group cursor-zoom-in"
          onClick={() => setLightboxImage(displayUrl)}
        >
          <img
            src={displayUrl}
            alt={t("storyImage.sceneVisualization")}
            className="w-full h-full object-cover transition-transform duration-[2000ms] ease-in-out group-hover:scale-105 opacity-90 hover:opacity-100 animate-[blur-in_1s_ease-out]"
            style={{
              animation: "blur-in 1s ease-out forwards",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-theme-bg via-transparent to-transparent opacity-30 pointer-events-none"></div>

          {/* Action Buttons Container */}
          <div className="absolute top-3 right-3 flex gap-2">
            {/* Upload Button */}
            {onUpload && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpload();
                }}
                className="bg-black/60 hover:bg-theme-primary text-white p-2 rounded backdrop-blur-md border border-white/10 transition-all opacity-80 md:opacity-0 md:group-hover:opacity-100 md:translate-y-[-10px] md:group-hover:translate-y-0 duration-500 shadow-lg z-10"
                title={t("uploadImage", "Upload Image")}
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  ></path>
                </svg>
              </button>
            )}

            {/* Copy Prompt Button - Show if imagePrompt exists */}
            {imagePrompt && <CopyPromptButton />}

            {/* Regenerate Button - Only show if onRegenerate callback exists */}
            {onRegenerate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRegenerate();
                }}
                className="bg-black/60 hover:bg-theme-primary text-white p-2 rounded backdrop-blur-md border border-white/10 transition-all opacity-80 md:opacity-0 md:group-hover:opacity-100 md:translate-y-[-10px] md:group-hover:translate-y-0 duration-500 shadow-lg z-10"
                title={t("storyImage.regenerate")}
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
              <MagicMirrorButton onAnimate={() => onAnimate(displayUrl)} />
            )}
          </div>
        </div>

        <ImageLightbox
          imageUrl={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      </>
    );
  }

  // State 2: Has imagePrompt but NO imageUrl - Provider is enabled, show placeholder
  if (imagePrompt && !displayUrl) {
    const canRegenerate = !!(imageGenerationEnabled && onRegenerate);
    // Manual mode: waiting for user to click generate
    // Failed mode: generation attempted but failed (not generating, not manual mode)
    const actuallyFailed = !isGenerating && canRegenerate && !manualImageGen;
    // When manualImageGen is enabled, never show "generating" state for new segments
    const shouldShowGenerating = isGenerating && !manualImageGen;

    return (
      <div className="relative w-full aspect-video rounded-sm overflow-hidden shadow-2xl border-2 border-theme-border bg-black group">
        <ImagePlaceholder
          isGenerating={shouldShowGenerating}
          hasFailed={actuallyFailed}
          labelVision={labelVision}
          labelUnavailable={labelUnavailable}
          themeFont={themeFont}
          onRegenerate={canRegenerate ? onRegenerate : undefined}
        />
        {/* Copy Prompt Button - Always available when imagePrompt exists */}
        <div className="absolute top-3 right-3 flex gap-2">
          {/* Upload Button */}
          {onUpload && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpload();
              }}
              className="bg-black/60 hover:bg-theme-primary text-white p-2 rounded backdrop-blur-md border border-white/10 transition-all opacity-80 md:opacity-0 md:group-hover:opacity-100 md:translate-y-[-10px] md:group-hover:translate-y-0 duration-500 shadow-lg z-10"
              title={t("uploadImage", "Upload Image")}
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                ></path>
              </svg>
            </button>
          )}
          <CopyPromptButton />
        </div>
      </div>
    );
  }

  // State 1: No imagePrompt and No imageUrl - Image was never intended
  // If we have onUpload, show a placeholder with the upload button
  return (
    <div className="relative w-full aspect-video rounded-sm overflow-hidden shadow-2xl border-2 border-theme-border bg-black group">
      <ImagePlaceholder
        isGenerating={false}
        hasFailed={false}
        labelVision={labelVision}
        labelUnavailable={labelUnavailable}
        themeFont={themeFont}
        onRegenerate={undefined}
      />
      {/* Upload Button */}
      {onUpload && (
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpload();
            }}
            className="bg-black/60 hover:bg-theme-primary text-white p-2 rounded backdrop-blur-md border border-white/10 transition-all opacity-80 md:opacity-0 md:group-hover:opacity-100 md:translate-y-[-10px] md:group-hover:translate-y-0 duration-500 shadow-lg z-10"
            title={t("uploadImage", "Upload Image")}
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              ></path>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
