import React, { useEffect, useRef } from "react";

interface GlobalStylesProps {
  themeConfig: {
    vars: Record<string, string>;
  };
}

export const GlobalStyles: React.FC<GlobalStylesProps> = ({ themeConfig }) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply CSS variables directly to :root via useEffect with debounce
  useEffect(() => {
    // Clear any pending update
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the CSS variable updates
    timeoutRef.current = setTimeout(() => {
      const root = document.documentElement;
      Object.entries(themeConfig.vars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    }, 100);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [themeConfig.vars]);

  return null; // No DOM element needed
};
