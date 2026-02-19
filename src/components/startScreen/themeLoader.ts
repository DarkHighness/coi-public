import type { StoryThemeConfig } from "../../types";

type SelectableThemes = Record<string, StoryThemeConfig>;

let themesPromise: Promise<SelectableThemes> | null = null;

export const loadSelectableThemes = async (): Promise<SelectableThemes> => {
  if (!themesPromise) {
    themesPromise = import("../../utils/constants/themes").then(({ THEMES }) =>
      Object.fromEntries(
        Object.entries(THEMES).filter(([key]) => key !== "custom"),
      ),
    );
  }
  return themesPromise;
};
