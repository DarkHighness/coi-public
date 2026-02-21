import React, { useEffect, useRef } from "react";

interface SidebarLoadMoreSentinelProps {
  enabled: boolean;
  onVisible: () => void;
  className?: string;
}

export const SidebarLoadMoreSentinel: React.FC<
  SidebarLoadMoreSentinelProps
> = ({ enabled, onVisible, className = "" }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled || !ref.current) {
      return;
    }
    const target = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onVisible();
        }
      },
      {
        root: null,
        rootMargin: "0px 0px 180px 0px",
        threshold: 0,
      },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled, onVisible]);

  if (!enabled) {
    return null;
  }

  return <div ref={ref} className={`h-3 w-full ${className}`.trim()} />;
};
