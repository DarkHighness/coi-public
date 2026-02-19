/// <reference types="vite/client" />
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Bootstrap only default locale eagerly; load other locales on demand.
import enTranslationString from "/src/locales/en/translation.json?raw";
import enThemesString from "/src/locales/en/themes.json?raw";

const enTranslation = JSON.parse(enTranslationString);
const enThemes = JSON.parse(enThemesString);

const SUPPORTED_LANGUAGES = new Set(["en", "zh"] as const);
type SupportedLanguage = "en" | "zh";

let zhResourcesPromise: Promise<void> | null = null;

export async function ensureLanguageResources(lang: string): Promise<void> {
  if (lang === "en") {
    return;
  }

  if (lang !== "zh") {
    return;
  }

  if (
    i18n.hasResourceBundle(lang, "translation") &&
    i18n.hasResourceBundle(lang, "themes")
  ) {
    return;
  }

  if (!zhResourcesPromise) {
    zhResourcesPromise = Promise.all([
      import("/src/locales/zh/translation.json?raw"),
      import("/src/locales/zh/themes.json?raw"),
    ])
      .then(([translationModule, themesModule]) => {
        const zhTranslation = JSON.parse(translationModule.default);
        const zhThemes = JSON.parse(themesModule.default);

        i18n.addResourceBundle("zh", "translation", zhTranslation, true, true);
        i18n.addResourceBundle("zh", "themes", zhThemes, true, true);
      })
      .catch((error) => {
        zhResourcesPromise = null;
        throw error;
      });
  }

  await zhResourcesPromise;
}

const readPreferredLanguage = (): SupportedLanguage => {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = window.localStorage.getItem("chronicles_language");
  if (stored && SUPPORTED_LANGUAGES.has(stored as SupportedLanguage)) {
    return stored as SupportedLanguage;
  }

  const browserLanguage = window.navigator.language.toLowerCase();
  return browserLanguage.startsWith("zh") ? "zh" : "en";
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
        themes: enThemes,
      },
    },
    ns: ["translation", "themes"],
    defaultNS: "translation",
    fallbackLng: "en",
    lng: "en",
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    detection: {
      order: ["localStorage"],
      caches: ["localStorage"],
      lookupLocalStorage: "chronicles_language",
    },
  });

const preferredLanguage = readPreferredLanguage();
if (preferredLanguage !== "en") {
  void ensureLanguageResources(preferredLanguage)
    .then(() => i18n.changeLanguage(preferredLanguage))
    .catch((error) => {
      console.warn(
        `[i18n] Failed to load language resources for ${preferredLanguage}:`,
        error,
      );
    });
}

export default i18n;
