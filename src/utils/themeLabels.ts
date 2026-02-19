import type { JsonObject } from "../types";

/** Special theme key that uses main translation namespace instead of themes namespace. */
export const IMAGE_BASED_THEME = "imageBased";

export const getThemeName = (
  themeKey: string | undefined | null,
  tFunc: (key: string, options?: JsonObject) => string,
  defaultValue?: string,
): string => {
  if (!themeKey || themeKey === IMAGE_BASED_THEME) {
    return tFunc("imageBased.name", {
      defaultValue: defaultValue || "Image Based",
    });
  }
  return tFunc(`${themeKey}.name`, {
    ns: "themes",
    defaultValue: defaultValue || themeKey,
  });
};

export const getThemeTranslation = (
  themeKey: string,
  field: "narrativeStyle" | "worldSetting" | "example" | "backgroundTemplate",
  tFunc: (key: string, options?: JsonObject) => string,
): string => {
  if (themeKey === IMAGE_BASED_THEME) {
    return "";
  }
  return tFunc(`${themeKey}.${field}`, { ns: "themes" });
};
