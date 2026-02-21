import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ToolCallRecord } from "../../types";
import { pickLatestToolCallContextUsage } from "../../services/ai/contextUsage";
import {
  formatToolCallSummary,
  getToolCallRuntimeStageFallbackLabel,
  pickLatestToolCallRuntimeStage,
} from "../../utils/toolCallPresentation";

interface ToolCallCarouselProps {
  calls: ToolCallRecord[];
  label?: string;
  className?: string;
  intervalMs?: number;
  emptyText?: string;
}

type ToolCallStatus = "running" | "success" | "failed";

interface CarouselItem {
  key: string;
  text: string;
  status: ToolCallStatus;
}

const LINE_STEP_PX = 24;

const formatTokenCount = (value: number): string => value.toLocaleString();

const formatCall = (call: ToolCallRecord): string =>
  formatToolCallSummary(call);

const getCallStatus = (call: ToolCallRecord): ToolCallStatus => {
  if (call.output == null) return "running";

  if (typeof call.output === "object" && call.output !== null) {
    const output = call.output as JsonObject;
    if (output.success === false) return "failed";
    if (
      typeof output.error === "string" &&
      output.error.trim().length > 0 &&
      output.success !== true
    ) {
      return "failed";
    }
  }

  return "success";
};

const getStatusPrefix = (status: ToolCallStatus): string => {
  if (status === "success") return "✓";
  if (status === "failed") return "✕";
  return "●";
};

const getStatusClass = (status: ToolCallStatus, active: boolean): string => {
  if (status === "success") {
    return active ? "text-emerald-300" : "text-emerald-300/55";
  }
  if (status === "failed") {
    return active ? "text-red-300" : "text-red-300/55";
  }
  return active ? "text-theme-primary/90" : "text-theme-muted/70";
};

const toCarouselItem = (call: ToolCallRecord, index: number): CarouselItem => ({
  key: `${call.timestamp}-${call.name}-${index}`,
  text: formatCall(call),
  status: getCallStatus(call),
});

export const ToolCallCarousel: React.FC<ToolCallCarouselProps> = ({
  calls,
  label,
  className = "",
  intervalMs = 1700,
  emptyText = "Waiting for tool calls...",
}) => {
  const { t } = useTranslation();

  const emptyItem = useMemo<CarouselItem>(
    () => ({
      key: "empty",
      text: emptyText,
      status: "running",
    }),
    [emptyText],
  );

  const items = useMemo<CarouselItem[]>(
    () => (calls.length > 0 ? calls.map(toCarouselItem) : [emptyItem]),
    [calls, emptyItem],
  );

  const itemsKey = useMemo(
    () => items.map((item) => `${item.status}:${item.text}`).join("\u001f"),
    [items],
  );

  const safeItems = useMemo(
    () => (items.length > 0 ? items : [emptyItem]),
    [items, emptyItem],
  );
  const latestContextUsage = useMemo(
    () => pickLatestToolCallContextUsage(calls),
    [calls],
  );
  const runtimeStage = useMemo(
    () => pickLatestToolCallRuntimeStage(calls),
    [calls],
  );
  const runtimeStageLabel = runtimeStage
    ? t(
        `toolCallStage.${runtimeStage}`,
        getToolCallRuntimeStageFallbackLabel(runtimeStage),
      )
    : null;
  const usageRatioPercent = latestContextUsage
    ? Math.max(
        0,
        Math.min(100, Math.round(latestContextUsage.usageRatio * 100)),
      )
    : null;
  const thresholdPercent = latestContextUsage
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(latestContextUsage.autoCompactThreshold * 100),
        ),
      )
    : null;

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [itemsKey]);

  useEffect(() => {
    if (safeItems.length <= 1) return;
    const timerId = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % safeItems.length);
    }, intervalMs);
    return () => window.clearInterval(timerId);
  }, [safeItems.length, intervalMs]);

  const visibleLines = useMemo(() => {
    const length = safeItems.length;
    if (length === 0)
      return [] as Array<{
        offset: number;
        index: number;
        item: CarouselItem;
      }>;

    const offsets = length <= 1 ? [0] : length === 2 ? [-1, 0] : [-1, 0, 1];

    return offsets.map((offset) => {
      const index = (activeIndex + offset + length * 10) % length;
      return { offset, index, item: safeItems[index] };
    });
  }, [safeItems, activeIndex]);

  return (
    <div className={`w-full max-w-2xl ${className}`}>
      <div className="text-center mb-1">
        <span className="text-[10px] uppercase tracking-[0.2em] text-theme-muted font-medium">
          {label || "Agent Tool Calls"}
        </span>
        {runtimeStageLabel && (
          <div className="text-[10px] text-theme-primary/80 font-mono mt-0.5">
            {(t("toolCallCarousel.stage", "Loop") || "Loop") +
              ": " +
              runtimeStageLabel}
          </div>
        )}
      </div>
      {latestContextUsage && usageRatioPercent !== null && (
        <div className="mb-2 px-1">
          <div className="text-center text-[10px] font-mono text-theme-muted">
            {`Context ${usageRatioPercent}% • ${formatTokenCount(latestContextUsage.usageTokens)}/${formatTokenCount(latestContextUsage.contextWindowTokens)} • auto ${thresholdPercent}%`}
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-theme-divider/50">
            <div
              className={
                usageRatioPercent >= (thresholdPercent ?? 100)
                  ? "h-full bg-theme-warning transition-all duration-300"
                  : "h-full bg-theme-primary/80 transition-all duration-300"
              }
              style={{ width: `${usageRatioPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="relative h-20 overflow-hidden">
        {visibleLines.map(({ offset, item, index }) => {
          const isActive = offset === 0;

          return (
            <div
              key={`${item.key}-${index}-${offset}`}
              className="absolute inset-x-0 top-1/2 transition-all duration-300 ease-out"
              style={{
                transform: `translateY(calc(-50% + ${offset * LINE_STEP_PX}px))`,
                opacity: isActive ? 1 : 0.45,
              }}
            >
              <div
                className={`text-center font-mono leading-relaxed break-all px-2 ${
                  isActive
                    ? "text-[12px] md:text-sm text-theme-text"
                    : "text-[11px] md:text-xs"
                }`}
              >
                <span className={getStatusClass(item.status, isActive)}>
                  {getStatusPrefix(item.status)}
                </span>
                <span className="ml-2 text-theme-text/90">{item.text}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex items-center justify-center gap-2 text-[10px] text-theme-muted font-mono">
        <span>{activeIndex + 1}</span>
        <span>/</span>
        <span>{safeItems.length}</span>
      </div>
    </div>
  );
};
