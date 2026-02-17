import React from "react";
import { useTranslation } from "react-i18next";
import type { PlayerRate, PlayerRateInput } from "../../types";

interface StoryTextHeaderProps {
  isPlaying: boolean;
  isLoading: boolean;
  onPlay: () => void;
  label: string;
  onCopyPrompt?: () => string | Promise<string>;
  onUpload?: () => void;
  onFork?: () => void;
  showOnHover?: boolean;
  playerRate?: PlayerRate;
  onRate?: (rate: PlayerRateInput) => void;
}

export const StoryTextHeader: React.FC<StoryTextHeaderProps> = ({
  isPlaying,
  isLoading,
  onPlay,
  label,
  onCopyPrompt,
  onUpload,
  onFork,
  showOnHover = false,
  playerRate,
  onRate,
}) => {
  const { t } = useTranslation();
  const [showCopied, setShowCopied] = React.useState(false);
  const [isRateDialogOpen, setIsRateDialogOpen] = React.useState(false);
  const [draftVote, setDraftVote] = React.useState<PlayerRateInput["vote"]>(
    playerRate?.vote ?? "up",
  );
  const [draftPreset, setDraftPreset] = React.useState(
    playerRate?.preset || "",
  );
  const [draftComment, setDraftComment] = React.useState(
    playerRate?.comment || "",
  );

  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const longPressTriggeredRef = React.useRef(false);

  React.useEffect(() => {
    if (!playerRate) return;
    setDraftVote(playerRate.vote);
    setDraftPreset(playerRate.preset || "");
    setDraftComment(playerRate.comment || "");
  }, [playerRate]);

  const handleCopyPrompt = async () => {
    if (onCopyPrompt) {
      const prompt = await onCopyPrompt();
      if (prompt) {
        navigator.clipboard.writeText(prompt);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }
    }
  };

  const ratingPresets = [
    t("rating.presets.aiFlavorHeavy", "AI flavor too strong"),
    t("rating.presets.tooVerbose", "Too verbose"),
    t("rating.presets.goodPacing", "Good pacing"),
    t("rating.presets.inCharacter", "In-character"),
  ];

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const openRateDialog = (vote?: PlayerRateInput["vote"]) => {
    if (vote) {
      setDraftVote(vote);
    }
    setDraftPreset(playerRate?.preset || "");
    setDraftComment(playerRate?.comment || "");
    setIsRateDialogOpen(true);
  };

  const startLongPress = (vote: PlayerRateInput["vote"]) => {
    if (!onRate) return;
    longPressTriggeredRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      openRateDialog(vote);
    }, 500);
  };

  const cancelLongPress = () => {
    clearLongPressTimer();
  };

  const handleQuickRate = (vote: PlayerRateInput["vote"]) => {
    if (!onRate) return;
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    onRate({ vote });
  };

  const handleRateSubmit = () => {
    if (!onRate) return;
    onRate({
      vote: draftVote,
      preset: draftPreset.trim() || undefined,
      comment: draftComment.trim() || undefined,
    });
    setIsRateDialogOpen(false);
  };

  return (
    <>
      <div
        className={`mb-3 gap-3 ${
          showOnHover
            ? "hidden md:flex md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            : "flex"
        } justify-between items-start`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-theme-primary font-bold uppercase tracking-widest opacity-50">
            {t("narrator")}
          </span>
          {playerRate && (
            <span className="text-[10px] text-theme-muted uppercase tracking-wide">
              {playerRate.vote === "up"
                ? t("rating.status.up", "Liked")
                : t("rating.status.down", "Disliked")}
              {playerRate.processedAt
                ? ` · ${t("rating.status.processed", "Processed")}`
                : ""}
            </span>
          )}
          {onFork && (
            <button
              onClick={onFork}
              className="md:hidden h-9 px-2.5 text-[10px] uppercase tracking-wider font-bold text-theme-muted hover:text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg"
              title={t("tree.fork") || "Create Fork"}
              aria-label={t("tree.fork") || "Create Fork"}
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
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                ></path>
              </svg>
              <span className="uppercase tracking-widest text-[9px]">
                {t("common.branch")}
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRate && (
            <>
              <button
                onClick={() => handleQuickRate("up")}
                onMouseDown={() => startLongPress("up")}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => startLongPress("up")}
                onTouchEnd={cancelLongPress}
                onTouchCancel={cancelLongPress}
                className={`flex items-center justify-center h-9 w-9 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg ${
                  playerRate?.vote === "up"
                    ? "text-theme-success bg-theme-success/15"
                    : "text-theme-muted hover:text-theme-text hover:bg-theme-surface-highlight/15"
                }`}
                title={t("rating.like", "Like")}
                aria-label={t("rating.like", "Like")}
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
                    d="M14 9V5a3 3 0 00-6 0v4m-4 0h16l-1 10a2 2 0 01-2 2H7a2 2 0 01-2-2L4 9z"
                  />
                </svg>
              </button>

              <button
                onClick={() => handleQuickRate("down")}
                onMouseDown={() => startLongPress("down")}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => startLongPress("down")}
                onTouchEnd={cancelLongPress}
                onTouchCancel={cancelLongPress}
                className={`flex items-center justify-center h-9 w-9 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg ${
                  playerRate?.vote === "down"
                    ? "text-theme-error bg-theme-error/15"
                    : "text-theme-muted hover:text-theme-text hover:bg-theme-surface-highlight/15"
                }`}
                title={t("rating.dislike", "Dislike")}
                aria-label={t("rating.dislike", "Dislike")}
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
                    d="M10 15v4a3 3 0 006 0v-4m4 0H4l1-10a2 2 0 012-2h10a2 2 0 012 2l1 10z"
                  />
                </svg>
              </button>

              <button
                onClick={() => openRateDialog()}
                className="flex items-center justify-center h-9 px-2 text-[10px] uppercase tracking-wide text-theme-muted hover:text-theme-text hover:bg-theme-surface-highlight/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg"
                title={t("rating.openReview", "Open review dialog")}
                aria-label={t("rating.openReview", "Open review dialog")}
              >
                {t("rating.review", "Review")}
              </button>
            </>
          )}

          {onUpload && (
            <button
              onClick={onUpload}
              className="flex items-center justify-center h-9 w-9 text-theme-muted hover:text-theme-text hover:bg-theme-surface-highlight/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg"
              title={t("uploadImage", "Upload Image")}
              aria-label={t("uploadImage", "Upload Image")}
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
                />
              </svg>
            </button>
          )}

          {onCopyPrompt && (
            <button
              onClick={handleCopyPrompt}
              className="flex items-center justify-center h-9 w-9 text-theme-muted hover:text-theme-text hover:bg-theme-surface-highlight/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg"
              title={t("copyImagePrompt", "Copy Image Prompt")}
              aria-label={t("copyImagePrompt", "Copy Image Prompt")}
            >
              {showCopied ? (
                <span className="text-[10px] font-bold text-theme-success">
                  {t("copied", "Copied!")}
                </span>
              ) : (
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </button>
          )}

          <button
            onClick={onPlay}
            disabled={isLoading}
            className={`flex items-center justify-center h-9 w-9 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg ${
              isPlaying
                ? "text-theme-primary animate-pulse"
                : "text-theme-muted hover:text-theme-text hover:bg-theme-surface-highlight/15"
            }`}
            title={label}
            aria-label={label}
          >
            {isLoading ? (
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
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
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                ></path>
              </svg>
            )}
          </button>
        </div>
      </div>

      {isRateDialogOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-lg border border-theme-border bg-theme-bg p-4 shadow-xl">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-theme-text">
                {t("rating.dialogTitle", "Rate This Turn")}
              </h3>
              <p className="mt-1 text-xs text-theme-muted">
                {t(
                  "rating.dialogHint",
                  "Long press from thumbs or click this review entry to leave detailed feedback.",
                )}
              </p>
            </div>

            <div className="mb-3 flex items-center gap-2">
              <button
                onClick={() => setDraftVote("up")}
                className={`h-8 px-3 text-xs rounded border transition-colors ${
                  draftVote === "up"
                    ? "border-theme-success text-theme-success bg-theme-success/10"
                    : "border-theme-border text-theme-muted hover:text-theme-text"
                }`}
              >
                {t("rating.like", "Like")}
              </button>
              <button
                onClick={() => setDraftVote("down")}
                className={`h-8 px-3 text-xs rounded border transition-colors ${
                  draftVote === "down"
                    ? "border-theme-error text-theme-error bg-theme-error/10"
                    : "border-theme-border text-theme-muted hover:text-theme-text"
                }`}
              >
                {t("rating.dislike", "Dislike")}
              </button>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {ratingPresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDraftPreset(preset)}
                  className={`rounded border px-2 py-1 text-[11px] transition-colors ${
                    draftPreset === preset
                      ? "border-theme-primary text-theme-primary bg-theme-primary/10"
                      : "border-theme-border text-theme-muted hover:text-theme-text"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              value={draftComment}
              onChange={(event) => setDraftComment(event.target.value)}
              placeholder={t(
                "rating.commentPlaceholder",
                "Optional details for this turn...",
              )}
              className="mb-3 h-24 w-full resize-none rounded border border-theme-border bg-theme-surface p-2 text-xs text-theme-text placeholder:text-theme-muted/70 focus:outline-none focus:ring-1 focus:ring-theme-primary"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsRateDialogOpen(false)}
                className="h-8 px-3 text-xs rounded border border-theme-border text-theme-muted hover:text-theme-text"
              >
                {t("rating.cancel", "Cancel")}
              </button>
              <button
                onClick={handleRateSubmit}
                className="h-8 px-3 text-xs rounded bg-theme-primary text-theme-bg hover:opacity-90"
              >
                {t("rating.submit", "Submit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
