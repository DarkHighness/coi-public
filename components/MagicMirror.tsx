import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { generateVeoVideo } from "../services/aiService";

interface MagicMirrorProps {
  isOpen: boolean;
  onClose: () => void;
  initialImage?: string | null;
  themeFont?: string;
}

const ANIMATION_TEMPLATES = [
  {
    id: "cinematic",
    icon: "🎥",
    prompt: "Cinematic slow zoom, high drama, detailed texture, 4k",
  },
  {
    id: "nature",
    icon: "🌿",
    prompt:
      "Wind blowing gently, leaves rustling, subtle organic movement, atmospheric",
  },
  {
    id: "magic",
    icon: "✨",
    prompt:
      "Glowing particles, swirling magical mist, ethereal energy flow, soft lighting",
  },
  {
    id: "action",
    icon: "⚡",
    prompt:
      "Dynamic camera angle, fast movement, intense energy, cinematic blur",
  },
  {
    id: "portrait",
    icon: "👤",
    prompt:
      "Subtle facial expression change, breathing, blinking, focus on eyes",
  },
];

export const MagicMirror: React.FC<MagicMirrorProps> = ({
  isOpen,
  onClose,
  initialImage,
  themeFont = "font-fantasy",
}) => {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(
    "Cinematic slow zoom, high drama, detailed texture, 4k",
  );
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      // Reset state on open
      if (initialImage) {
        setImage(initialImage);
      } else {
        setImage(null);
      }
      setVideoUrl(null);
      setError(null);
      checkKey();
    }
  }, [isOpen, initialImage]);

  const checkKey = async () => {
    try {
      // @ts-ignore - window.aistudio is injected
      const hasSelected = await window.aistudio.hasSelectedApiKey();
      setHasKey(hasSelected);
    } catch (e) {
      console.warn("Could not check API key status", e);
    }
  };

  const handleSelectKey = async () => {
    try {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      // Assume success after dialog close or wait a bit, then re-check
      setTimeout(checkKey, 1000);
    } catch (e) {
      console.error("Key selection failed", e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setVideoUrl(null); // Reset video if new image
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);

    try {
      const url = await generateVeoVideo(image, prompt);
      setVideoUrl(url);
    } catch (e) {
      console.error(e);
      if (
        e instanceof Error &&
        e.message.includes("Requested entity was not found")
      ) {
        setError("API Key invalid or expired. Please re-select.");
        setHasKey(false);
      } else {
        setError(t("genError"));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_0_60px_rgba(var(--theme-primary),0.15)] flex flex-col relative transition-colors duration-500">
        {/* Decorative Corners - Themed */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-theme-primary/60"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-theme-primary/60"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-theme-primary/60"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-theme-primary/60"></div>

        {/* Header */}
        <div className="p-6 border-b border-theme-border flex justify-between items-start bg-gradient-to-b from-theme-surface-highlight to-theme-surface">
          <div>
            <h2
              className={`text-3xl text-transparent bg-clip-text bg-gradient-to-r from-theme-text via-theme-primary to-theme-primary-hover ${themeFont} tracking-wide drop-shadow-sm`}
            >
              {t("animatorTitle")}
            </h2>
            <p className="text-theme-muted text-sm mt-1 italic">
              {t("animatorSubtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-primary transition-colors"
            title={t("close")}
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 bg-theme-surface relative overflow-hidden">
          {/* Background Texture Effect */}
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-theme-primary/20 via-transparent to-transparent"></div>

          {/* Preview Area */}
          <div className="relative aspect-video bg-black/40 rounded border border-theme-border flex items-center justify-center overflow-hidden group shadow-inner">
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                className="w-full h-full object-contain"
              />
            ) : image ? (
              <img
                src={image}
                alt="Artifact"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-8 text-theme-muted/40">
                <svg
                  className="w-16 h-16 mx-auto mb-3 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  ></path>
                </svg>
                <p className={`${themeFont} tracking-wider text-lg`}>
                  {t("dragDrop")}
                </p>
              </div>
            )}

            {/* Upload Overlay */}
            {!videoUrl && !loading && (
              <div
                className={`absolute inset-0 bg-black/70 flex items-center justify-center transition-opacity duration-500 ${image ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}
              >
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-theme-surface/80 hover:bg-theme-surface-highlight text-theme-text px-6 py-3 border border-theme-border flex items-center gap-3 shadow-lg hover:shadow-[0_0_25px_rgba(var(--theme-primary),0.3)] transition-all font-bold uppercase text-sm"
                >
                  <svg
                    className="w-5 h-5 text-theme-primary"
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
                  {t("uploadImage")}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}
          </div>

          {/* Animation Templates */}
          <div className="relative z-10">
            <label className="block text-xs uppercase tracking-widest text-theme-primary mb-2 font-bold flex items-center gap-2">
              <span className="w-1 h-1 bg-theme-primary rounded-full"></span>
              {t("animationStyles")}
              <span className="w-1 h-1 bg-theme-primary rounded-full"></span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ANIMATION_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setPrompt(tmpl.prompt)}
                  className={`px-3 py-2 border rounded text-xs font-medium transition-all flex items-center gap-2
                      ${
                        prompt === tmpl.prompt
                          ? "bg-theme-primary text-theme-bg border-theme-primary shadow-md"
                          : "bg-theme-surface-highlight border-theme-border text-theme-muted hover:text-theme-text hover:border-theme-primary/50"
                      }`}
                >
                  <span>{tmpl.icon}</span>
                  <span>{tmpl.id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div className="relative z-10">
            <label className="block text-xs uppercase tracking-widest text-theme-primary mb-2 font-bold flex items-center gap-2">
              <span className="w-1 h-1 bg-theme-primary rounded-full"></span>
              Prompt
              <span className="w-1 h-1 bg-theme-primary rounded-full"></span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t("promptPlaceholder")}
              className="w-full bg-theme-surface-highlight border border-theme-border rounded p-4 text-theme-text focus:border-theme-primary focus:ring-1 focus:ring-theme-primary outline-none resize-none h-20 italic text-sm shadow-inner placeholder-theme-muted transition-colors"
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-4 relative z-10">
            {!hasKey ? (
              <div className="bg-theme-surface-highlight border border-theme-border p-5 text-center">
                <p className="text-theme-muted text-sm mb-4">
                  {t("apiKeyRequired")}
                </p>
                <button
                  onClick={handleSelectKey}
                  className="w-full bg-theme-surface hover:bg-theme-surface-highlight text-theme-primary py-3 font-bold tracking-wider uppercase border border-theme-primary transition-colors shadow-lg"
                >
                  {t("connectKey")}
                </button>
                <div className="mt-3 text-xs text-theme-muted">
                  <a
                    href="https://ai.google.dev/gemini-api/docs/billing"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-theme-primary"
                  >
                    {t("billingInfo")}
                  </a>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={!image || loading}
                className={`w-full py-4 font-bold transition-all flex items-center justify-center gap-3 relative overflow-hidden group border ${
                  !image || loading
                    ? "bg-theme-surface border-theme-border text-theme-muted cursor-not-allowed"
                    : "bg-theme-primary hover:bg-theme-primary-hover border-theme-primary text-theme-bg shadow-[0_0_20px_rgba(var(--theme-primary),0.2)] hover:shadow-[0_0_30px_rgba(var(--theme-primary),0.4)]"
                }`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] transition-transform duration-1000 ${!loading && image ? "group-hover:translate-x-[100%]" : ""}`}
                ></div>

                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-theme-bg"
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
                    <span className={`${themeFont} tracking-widest uppercase`}>
                      {t("processing")}
                    </span>
                  </>
                ) : (
                  <>
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
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      ></path>
                    </svg>
                    <span className={`${themeFont} tracking-widest uppercase`}>
                      {t("animateAction")}
                    </span>
                  </>
                )}
              </button>
            )}

            {error && (
              <div className="text-red-400 text-sm text-center animate-pulse italic border border-red-900/30 p-2 bg-red-900/10">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
