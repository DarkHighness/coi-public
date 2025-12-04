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
import { getImage } from "../utils/imageStorage";

export interface TimelineExportRef {
  startExport: (
    startIndex?: number,
    endIndex?: number,
    segmentsPerImage?: number,
  ) => Promise<void>;
}

interface TimelineExportProps {
  segments: StorySegment[];
  theme: string;
  title?: string;
  subtitle?: string;
  includeUserActions?: boolean;
  onExportStart?: () => void;
  onExportEnd?: () => void;
}

export const TimelineExport = forwardRef<
  TimelineExportRef,
  TimelineExportProps
>(
  (
    {
      segments,
      theme,
      title,
      subtitle,
      includeUserActions = false,
      onExportStart,
      onExportEnd,
    },
    ref,
  ) => {
    const [exportChunk, setExportChunk] = useState<StorySegment[]>([]);
    const exportContainerRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    const currentStoryTheme = THEMES[theme] || THEMES.fantasy;
    // Use envTheme directly from story theme for consistent visual styling
    const currentEnvThemeKey = currentStoryTheme.envTheme;
    const currentThemeConfig =
      ENV_THEMES[currentEnvThemeKey] || ENV_THEMES.fantasy;

    useImperativeHandle(ref, () => ({
      startExport: async (
        startIndex?: number,
        endIndex?: number,
        segmentsPerImage?: number,
      ) => {
        if (segments.length === 0) return;

        onExportStart?.();

        // Use provided range or default to all segments
        const start = startIndex ?? 0;
        const end = endIndex ?? segments.length - 1;
        const chunkSize = segmentsPerImage ?? 10;

        // Slice to selected range
        const selectedSegments = segments.slice(start, end + 1);
        const totalChunks = Math.ceil(selectedSegments.length / chunkSize);

        try {
          for (let i = 0; i < totalChunks; i++) {
            const chunk = selectedSegments.slice(
              i * chunkSize,
              (i + 1) * chunkSize,
            );

            // Resolve image IDs to URLs
            const chunkWithImages = await Promise.all(
              chunk.map(async (seg) => {
                if (seg.imageId && !seg.imageUrl) {
                  try {
                    const blob = await getImage(seg.imageId);
                    if (blob) {
                      const url = URL.createObjectURL(blob);
                      return { ...seg, imageUrl: url, _tempUrl: true };
                    }
                  } catch (e) {
                    console.error("Failed to load image for export:", e);
                  }
                }
                return seg;
              }),
            );

            setExportChunk(chunkWithImages);

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

              // Cleanup temp URLs
              chunkWithImages.forEach((seg: any) => {
                if (seg._tempUrl && seg.imageUrl) {
                  URL.revokeObjectURL(seg.imageUrl);
                }
              });
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

    // Helper: Render choices with Markdown support
    const renderChoices = (
      choices?: (string | { text: string; consequence?: string })[],
    ) => {
      if (!choices || choices.length === 0) return null;
      return (
        <div
          className="mt-4 pt-4 border-t"
          style={{ borderColor: "rgba(71, 85, 105, 0.5)" }}
        >
          <div
            className="text-xs uppercase tracking-widest mb-2"
            style={{ color: "#94a3b8" }}
          >
            {t("timeline.choices") || "Choices"}
          </div>
          <ul
            className="list-disc list-inside space-y-1 text-sm"
            style={{ color: "#e2e8f0" }}
          >
            {choices.map((choice, idx) => {
              const choiceText =
                typeof choice === "string" ? choice : choice.text;
              const consequence =
                typeof choice === "object" ? choice.consequence : undefined;
              return (
                <li key={idx}>
                  <MarkdownText
                    content={choiceText}
                    components={{
                      p: ({ node, ...props }: any) => <span {...props} />,
                    }}
                  />
                  {consequence && (
                    <span className="ml-2 text-xs opacity-60">
                      ({consequence})
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      );
    };

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
              <div
                className={`text-3xl font-bold uppercase tracking-[0.2em] mb-3 ${currentThemeConfig.fontClass}`}
                style={{ color: "#fbbf24" }} // amber-400
              >
                <MarkdownText
                  content={
                    title ||
                    t("timeline.exportTitle") ||
                    "Chronicles of Infinity"
                  }
                  components={{
                    p: ({ node, ...props }: any) => <span {...props} />,
                  }}
                />
              </div>
              <div
                className="text-base uppercase tracking-widest font-serif italic opacity-80"
                style={{ color: "#94a3b8" }} // slate-400
              >
                <MarkdownText
                  content={
                    subtitle ||
                    t("timeline.exportSubtitle") ||
                    "Timeline Export"
                  }
                  components={{
                    p: ({ node, ...props }: any) => <span {...props} />,
                  }}
                />
              </div>
              <div
                className="text-xs tracking-widest mt-4 opacity-50 font-mono"
                style={{ color: "#64748b" }} // slate-500
              >
                {typeof window !== "undefined"
                  ? window.location.origin.replace(/^https?:\/\//, "")
                  : null}
              </div>
            </div>

            {exportChunk.map((seg, index) => {
              const isSystemRole = seg.role === "system";
              const isUserRole = seg.role === "user";
              const isCommandRole = seg.role === "command";

              // User/Command role - Chat bubble style on the right side
              if ((isUserRole || isCommandRole) && includeUserActions) {
                return (
                  <div key={seg.id} className="flex justify-end pr-4">
                    <div
                      style={{
                        maxWidth: "70%",
                        backgroundColor: isCommandRole
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(59, 130, 246, 0.15)", // red for command, blue for user
                        border: isCommandRole
                          ? "1px solid rgba(239, 68, 68, 0.3)"
                          : "1px solid rgba(59, 130, 246, 0.3)",
                        borderRadius: "12px",
                        borderBottomRightRadius: "4px",
                        padding: "12px 16px",
                      }}
                    >
                      {/* Role Label */}
                      <div
                        className="flex items-center gap-2 text-[10px] uppercase tracking-widest mb-2"
                        style={{ color: isCommandRole ? "#f87171" : "#60a5fa" }}
                      >
                        {isCommandRole ? (
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
                              d="M9 5l7 7-7 7"
                            ></path>
                          </svg>
                        ) : (
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
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            ></path>
                          </svg>
                        )}
                        <span>
                          {isCommandRole
                            ? t("timeline.command") || "Command"
                            : t("timeline.playerAction") || "Your Action"}
                        </span>
                      </div>
                      {/* Action Text */}
                      <div
                        className="text-sm leading-relaxed"
                        style={{ color: "#e2e8f0" }}
                      >
                        <MarkdownText
                          content={seg.text}
                          components={{
                            p: ({ node, ...props }: any) => (
                              <p className="mb-2 last:mb-0" {...props} />
                            ),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              // Skip user/command if not including them
              if (isUserRole || isCommandRole) {
                return null;
              }

              // System role (ForceUpdate result) - Subtle inline style matching timeline
              if (isSystemRole) {
                return (
                  <div key={seg.id} className="space-y-3">
                    {/* Header Row: Square Indicator + State Change Label */}
                    <div className="flex items-center gap-4">
                      <div
                        className="w-3.5 h-3.5 flex-shrink-0 ml-[11px]"
                        style={{
                          backgroundColor: "#0f172a", // slate-900
                          borderColor: "#64748b", // slate-500
                          borderWidth: "2px",
                          borderStyle: "solid",
                          borderRadius: "3px",
                          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                        }}
                      ></div>

                      {/* State Change Header */}
                      <div
                        className="flex items-center gap-3 text-xs uppercase tracking-widest font-medium"
                        style={{ color: "#64748b" }} // slate-500
                      >
                        <svg
                          className="w-3.5 h-3.5"
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
                        <span>
                          {t("timeline.stateChange") || "State Change"}
                        </span>
                        {seg.stateSnapshot?.time && (
                          <>
                            <span
                              className="w-1 h-1 rounded-full"
                              style={{ backgroundColor: "#475569" }}
                            ></span>
                            <span style={{ color: "#64748b" }}>
                              {seg.stateSnapshot?.time}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* System Content - Left bordered style */}
                    <div
                      style={{
                        marginLeft: "25px",
                      }}
                    >
                      <div
                        style={{
                          borderLeft: "2px solid #475569",
                          paddingLeft: "12px",
                        }}
                      >
                        <div
                          className="text-sm font-serif leading-relaxed"
                          style={{ color: "#94a3b8" }} // slate-400
                        >
                          <MarkdownText
                            content={seg.text}
                            components={{
                              p: ({ node, ...props }: any) => (
                                <p className="mb-3 last:mb-0" {...props} />
                              ),
                              strong: ({ node, ...props }: any) => (
                                <strong
                                  className="font-bold"
                                  style={{ color: "#cbd5e1" }}
                                  {...props}
                                />
                              ),
                              em: ({ node, ...props }: any) => (
                                <em
                                  className="italic"
                                  style={{ color: "rgba(148, 163, 184, 0.9)" }}
                                  {...props}
                                />
                              ),
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Regular model role - Original style
              return (
                <div key={seg.id} className="space-y-5">
                  {/* Header Row: Indicator + Metadata */}
                  <div className="flex items-center gap-4">
                    <div
                      className="w-4 h-4 rounded-full border-[3px] flex-shrink-0 ml-[10px]"
                      style={{
                        backgroundColor: "#0f172a", // slate-900
                        borderColor: "#fbbf24", // amber-400
                        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      }}
                    ></div>

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
                  </div>

                  <div className="space-y-5" style={{ marginLeft: "26px" }}>
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
                          onError={(e) =>
                            (e.currentTarget.style.display = "none")
                          }
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
                          code: ({
                            node,
                            inline,
                            className,
                            children,
                            ...props
                          }: any) => {
                            const match = /language-(\w+)/.exec(
                              className || "",
                            );
                            const isInline = inline || !match;

                            if (isInline) {
                              return (
                                <code
                                  className="px-1 py-0.5 rounded text-sm font-mono"
                                  style={{
                                    backgroundColor: "rgba(51, 65, 85, 0.6)",
                                    color: "#fde68a",
                                  }}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            }

                            return (
                              <div
                                style={{
                                  margin: "16px 0",
                                  borderRadius: "6px",
                                  overflow: "hidden",
                                  border: "1px solid rgba(148, 163, 184, 0.5)",
                                  backgroundColor: "rgba(51, 65, 85, 0.4)",
                                }}
                              >
                                <div
                                  style={{
                                    padding: "4px 12px",
                                    fontSize: "12px",
                                    color: "#94a3b8",
                                    backgroundColor: "rgba(51, 65, 85, 0.6)",
                                    borderBottom:
                                      "1px solid rgba(148, 163, 184, 0.3)",
                                    fontFamily: "monospace",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                  }}
                                >
                                  {match ? match[1] : "code"}
                                </div>
                                <div
                                  style={{ padding: "12px", overflowX: "auto" }}
                                >
                                  <code
                                    style={{
                                      fontSize: "14px",
                                      fontFamily: "monospace",
                                      color: "rgba(226, 232, 240, 0.9)",
                                    }}
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                </div>
                              </div>
                            );
                          },
                          math: ({ node, ...props }: any) => (
                            <div
                              style={{
                                margin: "16px 0",
                                textAlign: "center",
                                fontFamily: "serif",
                                fontSize: "18px",
                                color: "#fbbf24",
                                overflowX: "auto",
                                padding: "8px 0",
                              }}
                            >
                              {props.children}
                            </div>
                          ),
                          inlineMath: ({ node, ...props }: any) => (
                            <span
                              style={{
                                fontFamily: "serif",
                                color: "#fbbf24",
                                padding: "0 4px",
                              }}
                            >
                              {props.children}
                            </span>
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
                      {/* {renderChoices(seg.choices)} */}
                    </div>
                  </div>
                </div>
              );
            })}

            <div
              className="text-center pt-12 border-t text-xs uppercase tracking-widest opacity-60"
              style={{ borderColor: "#475569", color: "#94a3b8" }} // slate-600, slate-400
            >
              {t("timeline.generatedBy") ||
                "Generated by Chronicles of Infinity"}
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  },
);

TimelineExport.displayName = "TimelineExport";
