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

const LINE_STEP_PX = 24;
const MAX_VISIBLE_DISTANCE = 2.2;

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

const getActiveStatusTextClass = (status: ToolCallStatus): string => {
  if (status === "success") return "text-emerald-300";
  if (status === "failed") return "text-red-300";
  return "text-theme-primary/95";
};

const getInactiveStatusTextClass = (status: ToolCallStatus): string => {
  if (status === "success") return "text-emerald-300/45";
  if (status === "failed") return "text-red-300/45";
  return "text-theme-muted/60";
};

const getActiveGlowStyle = (status: ToolCallStatus): React.CSSProperties => {
  if (status === "success") {
    return {
      textShadow:
        "0 0 10px rgba(52, 211, 153, 0.7), 0 0 20px rgba(16, 185, 129, 0.38)",
    };
  }
  if (status === "failed") {
    return {
      textShadow:
        "0 0 10px rgba(248, 113, 113, 0.72), 0 0 20px rgba(239, 68, 68, 0.38)",
    };
  }
  return {
    textShadow:
      "0 0 10px rgba(var(--theme-primary-rgb,251,146,60),0.72), 0 0 20px rgba(var(--theme-primary-rgb,251,146,60),0.36)",
  };
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

  const positionedLines = useMemo(() => {
    const length = safeItems.length;

    return safeItems.map((item, index) => {
      let offset = index - activeIndex;
      if (length > 1) {
        const half = length / 2;
        if (offset > half) offset -= length;
        if (offset < -half) offset += length;
      }

      const distance = Math.abs(offset);
      return {
        item,
        index,
        offset,
        distance,
      };
    });
  }, [safeItems, activeIndex]);

  return (
    <div className={`w-full max-w-2xl ${className}`}>
      <div className="text-center mb-2">
        <span className="text-[10px] uppercase tracking-[0.24em] text-theme-primary/80 font-semibold">
          {label || "Agent Tool Calls"}
        </span>
      </div>

      <div className="relative h-28 md:h-32 overflow-hidden">
        <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 h-10 rounded-xl bg-theme-primary/10 blur-md" />
        <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-theme-primary/70 to-transparent" />

        <div className="relative h-full">
          {positionedLines.map(({ item, index, offset, distance }) => {
            const isActive = distance < 0.001;
            const isVisible = distance <= MAX_VISIBLE_DISTANCE;
            if (!isVisible) return null;

            const opacity =
              distance === 0
                ? 1
                : distance <= 1
                  ? 0.48
                  : distance <= 2
                    ? 0.2
                    : 0;
            const scale =
              distance === 0 ? 1 : distance <= 1 ? 0.97 : 0.94;

            const textClass = isActive
              ? getActiveStatusTextClass(item.status)
              : getInactiveStatusTextClass(item.status);

            return (
              <div
                key={`${item.key}-${index}`}
                className="absolute inset-x-0 top-1/2 px-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  transform: `translateY(calc(-50% + ${offset * LINE_STEP_PX}px)) scale(${scale})`,
                  opacity,
                }}
              >
                <code
                  className={`block text-center font-mono leading-relaxed break-all select-none ${isActive ? "text-[12px] md:text-sm" : "text-[11px] md:text-xs"} ${textClass}`}
                >
                  <span
                    className={isActive ? "tool-call-lyrics-breathe" : ""}
                    style={isActive ? getActiveGlowStyle(item.status) : undefined}
                  >
                    {item.text}
                  </span>
                </code>
              </div>
            );
          })}
        </div>

      </div>

      <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-theme-muted font-mono">
        <span>{activeIndex + 1}</span>
        <span>/</span>
        <span>{safeItems.length}</span>
      </div>

      <style>{`
        @keyframes tool-call-lyrics-breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.035);
            opacity: 0.92;
          }
        }

        .tool-call-lyrics-breathe {
          display: inline-block;
          transform-origin: center;
          animation: tool-call-lyrics-breathe 2.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
