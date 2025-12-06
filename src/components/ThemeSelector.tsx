import React from "react";
import { StoryThemeConfig } from "../types";
import { ThemeSelectorDesktop } from "./themes/ThemeSelectorDesktop";
import { ThemeSelectorMobile } from "./themes/ThemeSelectorMobile";
import { useIsMobile } from "../hooks/useMediaQuery";

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
  const isMobile = useIsMobile();

  if (!isMobile) {
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
