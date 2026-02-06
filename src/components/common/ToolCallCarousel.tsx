import React, { useEffect, useMemo, useState } from "react";
import type { ToolCallRecord } from "../../types";

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

const toInputString = (input: Record<string, any>): string => {
  try {
    const json = JSON.stringify(input || {});
    if (!json) return "{}";
    return json.length > 140 ? `${json.slice(0, 137)}...` : json;
  } catch {
    return "{}";
  }
};

const formatCall = (call: ToolCallRecord): string => {
  return `${call.name}(${toInputString(call.input || {})})`;
};

const getCallStatus = (call: ToolCallRecord): ToolCallStatus => {
  if (call.output == null) return "running";

  if (typeof call.output === "object" && call.output !== null) {
    const output = call.output as Record<string, unknown>;
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

const getStatusTextClass = (status: ToolCallStatus): string => {
  if (status === "success") return "text-emerald-300";
  if (status === "failed") return "text-red-300";
  return "text-theme-primary/95";
};

const getStatusDotClass = (status: ToolCallStatus): string => {
  if (status === "success") return "bg-emerald-400";
  if (status === "failed") return "bg-red-400";
  return "bg-theme-primary animate-pulse";
};

const toCarouselItem = (call: ToolCallRecord, index: number): CarouselItem => {
  const status = getCallStatus(call);
  return {
    key: `${call.timestamp}-${call.name}-${index}`,
    text: `${getStatusPrefix(status)} ${formatCall(call)}`,
    status,
  };
};

export const ToolCallCarousel: React.FC<ToolCallCarouselProps> = ({
  calls,
  label,
  className = "",
  intervalMs = 1700,
  emptyText = "Waiting for tool calls...",
}) => {
  const emptyItem = useMemo<CarouselItem>(
    () => ({
      key: "empty",
      text: `● ${emptyText}`,
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
    [itemsKey, emptyItem],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  const activeItem = safeItems[activeIndex] || safeItems[0] || emptyItem;

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

  return (
    <div
      className={`w-full max-w-2xl border border-theme-primary/30 bg-theme-surface/25 backdrop-blur-md rounded-xl overflow-hidden shadow-[0_0_25px_rgba(var(--theme-primary-rgb,251,146,60),0.16)] ${className}`}
    >
      <div className="px-3 py-2 border-b border-theme-primary/20 bg-theme-surface/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full ${getStatusDotClass(activeItem.status)}`}
          />
          <span className="text-[10px] uppercase tracking-[0.22em] text-theme-primary/90 font-semibold truncate">
            {label || "Agent Tool Calls"}
          </span>
        </div>
        <span className="text-[10px] text-theme-muted font-mono">
          {activeIndex + 1}/{safeItems.length}
        </span>
      </div>

      <div className="px-3 py-3 md:px-4 min-h-14 flex items-center bg-black/10">
        <code
          key={`${activeIndex}-${activeItem.key}`}
          className={`w-full text-[11px] md:text-xs font-mono leading-relaxed break-all animate-fade-in-up ${getStatusTextClass(activeItem.status)}`}
        >
          {activeItem.text}
        </code>
      </div>

      <div className="px-3 pb-2 pt-1 flex items-center gap-1.5 flex-wrap">
        {safeItems.map((item, index) => (
          <span
            key={`${item.key}-${index}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === activeIndex
                ? `w-5 ${
                    item.status === "success"
                      ? "bg-emerald-400"
                      : item.status === "failed"
                        ? "bg-red-400"
                        : "bg-theme-primary"
                  }`
                : "w-1.5 bg-theme-primary/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
};
