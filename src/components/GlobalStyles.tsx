import React, { useEffect } from "react";

interface GlobalStylesProps {
  themeConfig: {
    vars: Record<string, string>;
  };
}

export const GlobalStyles: React.FC<GlobalStylesProps> = ({ themeConfig }) => {
  // Apply CSS variables directly to :root via useEffect
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(themeConfig.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [themeConfig.vars]);

  return null; // No DOM element needed
};
