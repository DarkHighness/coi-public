import React from "react";
import { useTranslation } from "react-i18next";
import { LanguageCode } from "../types";

interface LanguageSelectorProps {
  disabled?: boolean;
  onChange?: (lang: LanguageCode) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  disabled,
  onChange,
}) => {
  const { i18n, t } = useTranslation();

  return (
    <div className="relative inline-flex items-center">
      <select
        aria-label="Language"
        value={i18n.language}
        onChange={(e) => {
          const lang = e.target.value as LanguageCode;
          i18n.changeLanguage(lang);
          onChange?.(lang);
        }}
        disabled={disabled}
        className="appearance-none bg-transparent text-[10px] uppercase tracking-wider font-bold text-theme-muted hover:text-theme-primary transition-colors pr-6 pl-2 py-2 border-b border-theme-border/35 focus:outline-none focus:border-theme-primary disabled:opacity-50"
      >
        <option value="en">{t("languages.english")}</option>
        <option value="zh">{t("languages.chinese")}</option>
      </select>
      <svg
        className="pointer-events-none absolute right-1.5 w-4 h-4 text-theme-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>
  );
};
