import React, { useState, useEffect } from "react";
import { StoryThemeConfig } from "../types";
import { ThemeSelectorDesktop } from "./themes/ThemeSelectorDesktop";
import { ThemeSelectorMobile } from "./themes/ThemeSelectorMobile";

interface ThemeSelectorProps {
  themes: Record<string, StoryThemeConfig>;
  onSelect: (theme: string) => void;
  onHover: (theme: string) => void;
  onBack?: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  themes,
  onSelect,
  onHover,
  onBack,
}) => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    setIsDesktop(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  if (isDesktop) {
    return (
      <ThemeSelectorDesktop
        themes={themes}
        onSelect={onSelect}
        onHover={onHover}
        onBack={onBack}
      />
    );
  }

  return (
    <ThemeSelectorMobile
      themes={themes}
      onSelect={onSelect}
      onHover={onHover}
    />
  );
};
