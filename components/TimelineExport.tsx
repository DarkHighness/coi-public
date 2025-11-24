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
  envTheme?: string;
  title?: string;
  subtitle?: string;
  onExportStart?: () => void;
  onExportEnd?: () => void;
}

export const TimelineExport = forwardRef<TimelineExportRef, TimelineExportProps>(
  (
    {
      segments,
      theme,
      envTheme,
      title,
      subtitle,
      onExportStart,
      onExportEnd,
    },
    ref,
  ) => {
    const [exportChunk, setExportChunk] = useState<StorySegment[]>([]);
    const exportContainerRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    const currentStoryTheme = THEMES[theme] || THEMES.fantasy;
    const currentEnvThemeKey = envTheme || currentStoryTheme.defaultEnvTheme;
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
            const chunk = segments.slice(
              i * chunkSize,
              (i + 1) * chunkSize,
            );
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
                  const clonedElement = clonedDoc.getElementById("export-container");
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
        className="absolute left-[-9999px] top-0 w-[800px] p-12 bg-theme-bg text-theme-text"
        style={{
          ...currentThemeConfig.vars,
        } as React.CSSProperties}
        ref={exportContainerRef}
      >
        <div className="relative">
          {/* Continuous Vertical Line */}
          <div className="absolute left-[19px] top-32 bottom-12 w-0.5 bg-theme-border opacity-50"></div>

          <div className="space-y-12 relative z-10">
            <div className="text-center mb-12 border-b-2 border-theme-border pb-8">
              <h1
                className={`text-3xl font-bold uppercase tracking-[0.2em] mb-3 ${currentThemeConfig.fontClass} text-theme-primary`}
              >
                {title || t("timeline.exportTitle") || "Chronicles of Infinity"}
              </h1>
              <p className="text-base text-theme-muted uppercase tracking-widest font-serif italic opacity-80">
                {subtitle || t("timeline.exportSubtitle") || "Timeline Export"}
              </p>
            </div>

            {exportChunk.map((seg, index) => (
              <div key={seg.id} className="relative pl-16">
                {/* Timeline Node */}
                <div className="absolute left-[11px] top-1 w-4 h-4 rounded-full bg-theme-bg border-[3px] border-theme-primary z-10 shadow-sm ring-4 ring-theme-bg"></div>

                <div className="space-y-5">
                  {/* Metadata Header */}
                  <div className="flex items-center gap-3 text-sm uppercase tracking-widest text-theme-muted font-medium">
                    <span className="text-theme-primary font-bold">
                      {seg.stateSnapshot?.time}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-theme-border"></span>
                    <span>{seg.stateSnapshot?.currentLocation}</span>
                  </div>

                  {/* Image */}
                  {seg.imageUrl && (
                    <div className="rounded-lg overflow-hidden border border-theme-border shadow-lg">
                      <img
                        src={seg.imageUrl}
                        className="w-full h-auto object-cover"
                        onError={(e) =>
                          (e.currentTarget.style.display = "none")
                        }
                      />
                    </div>
                  )}

                  {/* Text */}
                  <div className="text-base font-serif leading-loose text-theme-text">
                    <MarkdownText content={seg.text} />
                  </div>
                </div>
              </div>
            ))}

            <div className="text-center pt-12 border-t border-theme-border text-xs text-theme-muted uppercase tracking-widest opacity-60">
              {t("timeline.generatedBy") ||
                "Generated by Chronicles of Infinity"}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }
);

TimelineExport.displayName = "TimelineExport";
