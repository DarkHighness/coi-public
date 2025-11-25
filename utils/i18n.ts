/// <reference types="vite/client" />
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import JSON translation files directly (bundled by Vite)
import enTranslationString from "/src/locales/en/translation.json?raw";
import enThemesString from "/src/locales/en/themes.json?raw";
import zhTranslationString from "/src/locales/zh/translation.json?raw";
import zhThemesString from "/src/locales/zh/themes.json?raw";

const enTranslation = JSON.parse(enTranslationString);
const enThemes = JSON.parse(enThemesString);
const zhTranslation = JSON.parse(zhTranslationString);
const zhThemes = JSON.parse(zhThemesString);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
        themes: enThemes,
      },
      zh: {
        translation: zhTranslation,
        themes: zhThemes,
      },
    },
    ns: ["translation", "themes"],
    defaultNS: "translation",
    fallbackLng: "en",
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

export default i18n;
