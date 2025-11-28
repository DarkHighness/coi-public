import React, {
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { createPortal } from "react-dom";
import { StorySegment } from "../types";
import { THEMES, ENV_THEMES } from "../utils/constants";
import { MarkdownText } from "./render/MarkdownText";
import html2canvas from "html2canvas";
import { useTranslation } from "react-i18next";

export interface TimelineExportRef {
  startExport: () => Promise<void>;
}

interface TimelineExportProps {
  segments: StorySegment[];
  theme: string;
  title?: string;
  subtitle?: string;
  onExportStart?: () => void;
  onExportEnd?: () => void;
}

export const TimelineExport = forwardRef<
  TimelineExportRef,
  TimelineExportProps
>(({ segments, theme, title, subtitle, onExportStart, onExportEnd }, ref) => {
  const [exportChunk, setExportChunk] = useState<StorySegment[]>([]);
  const exportContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const currentStoryTheme = THEMES[theme] || THEMES.fantasy;
  // Use envTheme directly from story theme for consistent visual styling
  const currentEnvThemeKey = currentStoryTheme.envTheme;
  const currentThemeConfig =
    ENV_THEMES[currentEnvThemeKey] || ENV_THEMES.fantasy;

  useImperativeHandle(ref, () => ({
    startExport: async () => {
      if (segments.length === 0) return;

      onExportStart?.();

      const chunkSize = 10;
      const totalChunks = Math.ceil(segments.length / chunkSize);

      try {
        for (let i = 0; i < totalChunks; i++) {
          const chunk = segments.slice(i * chunkSize, (i + 1) * chunkSize);
          setExportChunk(chunk);

          // Wait for render and images
          await new Promise((resolve) => setTimeout(resolve, 100)); // Short wait for React render

          if (exportContainerRef.current) {
            // Wait for images to load
            const images = Array.from(
              exportContainerRef.current.querySelectorAll("img"),
            );
            await Promise.all(
              images.map((img) => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve; // Continue even if error
                });
              }),
            );

            // Extra buffer after images load
            await new Promise((resolve) => setTimeout(resolve, 200));

            const canvas = await html2canvas(exportContainerRef.current, {
              useCORS: true,
              scale: 2,
              backgroundColor: "#1a1b26", // This will be overridden by CSS if we set it on the container
              // Explicitly set dimensions to ensure full capture
              width: 800,
              windowWidth: 1920,
              onclone: (clonedDoc) => {
                const clonedElement =
                  clonedDoc.getElementById("export-container");
                if (clonedElement) {
                  // Reset position for the capture
                  clonedElement.style.left = "0px";
                  clonedElement.style.top = "0px";
                  clonedElement.style.position = "absolute";
                }
              },
            });

            const timestamp = new Date()
              .toISOString()
              .replace(/[:.]/g, "-")
              .slice(0, 19);
            const filename = `chronicles_timeline_${timestamp}_part_${i + 1}.png`;

            canvas.toBlob((blob) => {
              if (!blob) {
                console.error("Canvas to Blob failed");
                return;
              }
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }, "image/png");
          }
        }
      } catch (error) {
        console.error("Export failed:", error);
      } finally {
        setExportChunk([]);
        onExportEnd?.();
      }
    },
  }));

  // Apply theme styles to the export container
  // We use the theme config to determine fonts and colors
  // Note: We need to ensure the background color matches the theme

  // Map theme keys to background colors if needed, or just use a standard dark bg
  // The user requested "css effect should match envTheme"
  // We can use the classes from currentThemeConfig

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      id="export-container"
      className={`absolute left-[-9999px] top-0 w-[800px] p-12 ${currentThemeConfig.fontClass}`}
      style={{
        backgroundColor: "#0f172a",
        color: "#e2e8f0",
      }}
      ref={exportContainerRef}
    >
      <div className="relative">
        {/* Continuous Vertical Line */}
        <div
          className="absolute left-[19px] top-32 bottom-12 w-0.5 opacity-50"
          style={{ backgroundColor: "#475569" }} // slate-600
        ></div>

        <div className="space-y-12 relative z-10">
          <div
            className="text-center mb-12 border-b-2 pb-8"
            style={{ borderColor: "#475569" }} // slate-600
          >
            <h1
              className={`text-3xl font-bold uppercase tracking-[0.2em] mb-3 ${currentThemeConfig.fontClass}`}
              style={{ color: "#fbbf24" }} // amber-400
            >
              {title || t("timeline.exportTitle") || "Chronicles of Infinity"}
            </h1>
            <p
              className="text-base uppercase tracking-widest font-serif italic opacity-80"
              style={{ color: "#94a3b8" }} // slate-400
            >
              {subtitle || t("timeline.exportSubtitle") || "Timeline Export"}
            </p>
          </div>

          {exportChunk.map((seg, index) => (
            <div key={seg.id} className="relative pl-16">
              {/* Timeline Node */}
              <div
                className="absolute left-[11px] top-1 w-4 h-4 rounded-full border-[3px] z-10"
                style={{
                  backgroundColor: "#0f172a", // slate-900
                  borderColor: "#fbbf24", // amber-400
                  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                }}
              ></div>

              <div className="space-y-5">
                {/* Metadata Header */}
                <div
                  className="flex items-center gap-3 text-sm uppercase tracking-widest font-medium"
                  style={{ color: "#94a3b8" }} // slate-400
                >
                  <span style={{ color: "#fbbf24", fontWeight: "bold" }}>
                    {seg.stateSnapshot?.time}
                  </span>
                  <span
                    className="w-1 h-1 rounded-full"
                    style={{ backgroundColor: "#475569" }} // slate-600
                  ></span>
                  <span>{seg.stateSnapshot?.currentLocation}</span>
                </div>

                {/* Image */}
                {seg.imageUrl && (
                  <div
                    className="rounded-lg overflow-hidden border"
                    style={{
                      borderColor: "#475569", // slate-600
                      boxShadow:
                        "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <img
                      src={seg.imageUrl}
                      className="w-full h-auto object-cover"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </div>
                )}

                {/* Text */}
                <div
                  className="text-base font-serif leading-loose"
                  style={{ color: "#e2e8f0" }} // slate-200
                >
                  <MarkdownText
                    content={seg.text}
                    components={{
                      p: ({ node, ...props }: any) => (
                        <p className="mb-4 last:mb-0 indent-8" {...props} />
                      ),
                      strong: ({ node, ...props }: any) => (
                        <strong
                          className="font-bold"
                          style={{ color: "#fbbf24" }}
                          {...props}
                        />
                      ),
                      em: ({ node, ...props }: any) => (
                        <em
                          className="italic"
                          style={{ color: "rgba(226, 232, 240, 0.9)" }}
                          {...props}
                        />
                      ),
                      code: ({ node, inline, ...props }: any) =>
                        inline ? (
                          <code
                            className="px-1 py-0.5 rounded text-sm font-mono"
                            style={{
                              backgroundColor: "rgba(51, 65, 85, 0.6)",
                              color: "#fde68a",
                            }}
                            {...props}
                          />
                        ) : (
                          <code
                            className="block p-3 rounded font-mono text-sm my-2"
                            style={{ backgroundColor: "rgba(51, 65, 85, 0.4)" }}
                            {...props}
                          />
                        ),
                      blockquote: ({ node, ...props }: any) => (
                        <blockquote
                          className="border-l-4 pl-4 my-4 italic"
                          style={{
                            borderColor: "rgba(251, 191, 36, 0.5)",
                            color: "rgba(226, 232, 240, 0.8)",
                          }}
                          {...props}
                        />
                      ),
                      ul: ({ node, ...props }: any) => (
                        <ul
                          className="list-disc list-inside my-2 space-y-1"
                          {...props}
                        />
                      ),
                      ol: ({ node, ...props }: any) => (
                        <ol
                          className="list-decimal list-inside my-2 space-y-1"
                          {...props}
                        />
                      ),
                      li: ({ node, ...props }: any) => (
                        <li className="ml-2" {...props} />
                      ),
                      h1: ({ node, ...props }: any) => (
                        <h1
                          className="text-2xl font-bold my-4"
                          style={{ color: "#fbbf24" }}
                          {...props}
                        />
                      ),
                      h2: ({ node, ...props }: any) => (
                        <h2
                          className="text-xl font-semibold my-3"
                          style={{ color: "rgba(251, 191, 36, 0.9)" }}
                          {...props}
                        />
                      ),
                      h3: ({ node, ...props }: any) => (
                        <h3
                          className="text-lg font-semibold my-2"
                          style={{ color: "rgba(251, 191, 36, 0.8)" }}
                          {...props}
                        />
                      ),
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

          <div
            className="text-center pt-12 border-t text-xs uppercase tracking-widest opacity-60"
            style={{ borderColor: "#475569", color: "#94a3b8" }} // slate-600, slate-400
          >
            {t("timeline.generatedBy") || "Generated by Chronicles of Infinity"}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
});

TimelineExport.displayName = "TimelineExport";
