import React, { useEffect, useRef } from "react";
import { deriveThemeVars } from "@/utils/theme/deriveThemeVars";

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
      const derivedVars = deriveThemeVars(themeConfig.vars);
      Object.entries(derivedVars).forEach(([key, value]) => {
        root.style.setProperty(key, value);

        // Convert hex colors to RGB channels for effects using rgba(var(--*-rgb), a)
        if (/^#[0-9a-fA-F]{6}$/.test(value)) {
          const hex = value.slice(1);
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          root.style.setProperty(`${key}-rgb`, `${r} ${g} ${b}`);
        } else {
          root.style.removeProperty(`${key}-rgb`);
        }
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
