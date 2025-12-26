import React from "react";
import { StoryThemeConfig } from "../types";
import { ThemeSelectorDesktop } from "./themes/ThemeSelectorDesktop";
import { ThemeSelectorMobile } from "./themes/ThemeSelectorMobile";
import { useIsMobile } from "../hooks/useMediaQuery";

interface ThemeSelectorProps {
  themes: Record<string, StoryThemeConfig>;
  onSelect: (theme: string, protagonistFeature?: string) => void;
  onPreviewTheme?: (theme: string | null) => void;
  onBack?: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  themes,
  onSelect,
  onPreviewTheme,
  onBack,
}) => {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <ThemeSelectorDesktop
        themes={themes}
        onSelect={onSelect}
        onPreviewTheme={onPreviewTheme}
        onBack={onBack}
      />
    );
  }

  return (
    <ThemeSelectorMobile
      themes={themes}
      onSelect={onSelect}
      onPreviewTheme={onPreviewTheme}
    />
  );
};
