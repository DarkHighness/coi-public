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
 * │   • !userRequestedLoad → Show "Click to Gen"  │
 * │   • userRequestedLoad  → Show loading         │
 * │   • actuallyFailed = true   → Show "Failed - Retry" placeholder         │
 * │                                                                          │
 * │ Display:   Placeholder with copy prompt button (top-right)              │
 * │            Regenerate enabled if canRegenerate = true                   │
 * │                                                                          │
 * │ NOTE: userRequestedLoad tracks when user clicks "Generate" in manual    │
 * │       mode. Once clicked, we show loading state until generation        │
 * │       completes or fails.                                                │
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
 * | Prompt | URL | Provider | Generating | Manual | UserReq | Result      |
 * |--------|-----|----------|------------|--------|---------|-------------|
 * |   ❌   | ❌  |    -     |     -      |   -    |    -    | Unavailable |
 * |   ✅   | ❌  |    ❌    |     -      |   -    |    -    | null (1.2)  |
 * |   ✅   | ❌  |    ✅    |    ✅      |  ❌    |    -    | Loading     |
 * |   ✅   | ❌  |    ✅    |    ❌      |  ✅    |  ❌     | Manual      |
 * |   ✅   | ❌  |    ✅    |    ✅      |  ✅    |  ✅     | Loading     |
 * |   ✅   | ❌  |    ✅    |    ❌      |  ✅    |  ✅     | Failed*     |
 * |   ✅   | ❌  |    ✅    |    ❌      |  ❌    |    -    | Failed      |
 * |   ✅   | ✅  |    -     |     -      |   -    |    -    | Show Image  |
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * * User requested load but generation stopped without image = likely failed
 */

import React, { useEffect, useMemo, useState } from "react";
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
  themeFont?: string;
  onUpload?: () => void;
  onDelete?: () => void;
  hasFailed?: boolean;
  onGeneratePrompt?: () => void;
  onGenerateImageFull?: () => void;
  onGenerateCinematic?: () => void;
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
  themeFont,
  onUpload,
  onDelete,
  hasFailed,
  onGeneratePrompt,
  onGenerateImageFull,
  onGenerateCinematic,
}) => {
  const { t } = useTranslation();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [displayImage, setDisplayImage] = useState<{
    url: string | null;
    isLoading: boolean;
  }>({ url: null, isLoading: false });
  // Track when user has requested image load in manual mode
  // Once user clicks "Generate", we show loading state until generation completes/fails
  const [userRequestedLoad, setUserRequestedLoad] = useState(false);

  // Resolve image URL from ID if provided
  const { url: resolvedUrl, isLoading: isResolving } = useImageURL(imageId);

  useEffect(() => {
    if (resolvedUrl) {
      setDisplayImage({ url: resolvedUrl, isLoading: isResolving });
    } else if (legacyImageUrl) {
      setDisplayImage({ url: legacyImageUrl, isLoading: false });
    } else {
      setDisplayImage({ url: null, isLoading: isResolving });
    }
  }, [resolvedUrl, isResolving, legacyImageUrl]);

  const displayUrl = displayImage.url;

  // Determine state - computed before any early returns
  const hasImage = !!displayUrl;
  const hasPrompt = !!(imagePrompt && imagePrompt.trim().length > 0);

  // Reset userRequestedLoad when image is successfully loaded
  // IMPORTANT: Must be before any conditional returns to comply with React hooks rules
  useEffect(() => {
    if (hasImage && userRequestedLoad) {
      setUserRequestedLoad(false);
    }
  }, [hasImage, userRequestedLoad]);

  // Reset userRequestedLoad on explicit failure (via hasFailed prop) so user can retry
  // IMPORTANT: Must be before any conditional returns to comply with React hooks rules
  useEffect(() => {
    if (hasFailed && userRequestedLoad) {
      setUserRequestedLoad(false);
    }
  }, [hasFailed, userRequestedLoad]);

  // Copy prompt to clipboard
  const handleCopyPrompt = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
  if (disableImages && !displayUrl) return null;

  // We show the container if:
  // 1. We have an image
  // 2. We have a prompt
  // 3. We have high-level generation handlers (on-demand mode)
  const canShowActionButtons = !!(onGeneratePrompt || onGenerateImageFull);
  if (!hasPrompt && !hasImage && !canShowActionButtons) return null;

  // Transient failure state detection (passed via props or inferred)
  const canRegenerate = !!(imageGenerationEnabled && onRegenerate);

  // Use explicit hasFailed prop if provided, otherwise fallback to inference
  // Note: In manual mode, we should NOT consider it failed just because isGenerating is false
  // after userRequestedLoad is true - we need to wait for the image generation to actually start
  // and complete (or fail). We only mark as failed if:
  // 1. hasFailed prop is explicitly true
  // 2. Or in non-manual mode: no image, not generating, can regenerate, has prompt
  const actuallyFailed =
    hasFailed ||
    (!hasImage &&
      !isGenerating &&
      canRegenerate &&
      hasPrompt &&
      hasFailed === undefined);

  // Determine if we should show generating state:
  // - Show loading when the global service is running
  // - OR when we are resolving the resulting image ID to a blob URL
  const shouldShowGenerating = isGenerating || displayImage.isLoading;

  // Handler for regenerate that also sets userRequestedLoad in manual mode
  const handleRegenerate = () => {
    setUserRequestedLoad(true);
    onRegenerate?.();
  };

  // Render content
  return (
    <>
      <div className="relative w-full aspect-video rounded-sm overflow-hidden shadow-2xl border-2 border-theme-border bg-black group">
        {hasImage ? (
          // Image Display
          <div
            className="w-full h-full cursor-zoom-in"
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
          </div>
        ) : (
          // Placeholder Display
          <div
            className={`w-full h-full ${onGenerateImageFull && !shouldShowGenerating ? "cursor-pointer" : ""}`}
            onClick={() => {
              if (!shouldShowGenerating && onGenerateImageFull) {
                onGenerateImageFull();
              }
            }}
          >
            <ImagePlaceholder
              isGenerating={shouldShowGenerating}
              hasFailed={actuallyFailed}
              labelVision={labelVision}
              labelUnavailable={labelUnavailable}
              themeFont={themeFont}
              onRegenerate={canRegenerate ? handleRegenerate : undefined}
            />
          </div>
        )}

        {/* Action Buttons Container */}
        <div className="absolute top-3 right-3 flex gap-2">
          {/* Upload Button - Always visible if handler provided */}
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

          {/* Delete Button - Visible if image exists */}
          {hasImage && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="bg-black/60 hover:bg-theme-error text-white p-2 rounded backdrop-blur-md border border-white/10 transition-all opacity-80 md:opacity-0 md:group-hover:opacity-100 md:translate-y-[-10px] md:group-hover:translate-y-0 duration-500 shadow-lg z-10"
              title={t("deleteImage", "Delete Image")}
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                ></path>
              </svg>
            </button>
          )}

          {/* Copy Prompt Button - Visible if prompt exists */}
          {hasPrompt && (
            <button
              onClick={handleCopyPrompt}
              className="bg-black/60 hover:bg-theme-primary text-white p-2 rounded backdrop-blur-md border border-white/10 transition-all opacity-80 md:opacity-0 md:group-hover:opacity-100 md:translate-y-[-10px] md:group-hover:translate-y-0 duration-500 shadow-lg z-10"
              title={
                copied
                  ? t("storyImage.promptCopied")
                  : t("storyImage.copyPrompt")
              }
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
          )}

          {/* Cinematic Animate Button - Visible if image exists and we have a way to animate it */}
          {hasImage && (onAnimate || onGenerateCinematic) && (
            <MagicMirrorButton
              onAnimate={onAnimate ? () => onAnimate(displayUrl!) : undefined}
              onGenerateCinematic={onGenerateCinematic}
              title={
                onGenerateCinematic
                  ? t("visual.cinematicAnimate")
                  : t("visual.magicMirror")
              }
            />
          )}

          {/* Action Buttons for Missing Image */}
          {!hasImage && !shouldShowGenerating && (
            <div className="flex gap-2">
              {onGeneratePrompt && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGeneratePrompt();
                  }}
                  className="bg-black/60 hover:bg-theme-primary text-white p-2 rounded backdrop-blur-md border border-white/10 transition-all opacity-80 md:opacity-0 md:group-hover:opacity-100 md:translate-y-[-10px] md:group-hover:translate-y-0 duration-500 shadow-lg z-10 flex items-center gap-1.5"
                  title={
                    hasPrompt
                      ? t("visual.regeneratePrompt")
                      : t("visual.promptGenerator")
                  }
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
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              )}
              {onGenerateImageFull && !hasPrompt && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerateImageFull();
                  }}
                  className="bg-black/60 hover:bg-theme-accent text-white p-2 rounded backdrop-blur-md border border-white/10 transition-all opacity-80 md:opacity-0 md:group-hover:opacity-100 md:translate-y-[-10px] md:group-hover:translate-y-0 duration-500 shadow-lg z-10 flex items-center gap-1.5"
                  title={t("visual.generateImageFull")}
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
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {hasImage && (
        <ImageLightbox
          imageUrl={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </>
  );
};
