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
    <select
      value={i18n.language}
      onChange={(e) => {
        const lang = e.target.value as LanguageCode;
        i18n.changeLanguage(lang);
        onChange?.(lang);
      }}
      disabled={disabled}
      className="bg-theme-surface-highlight border border-theme-border text-theme-text text-xs rounded p-1 focus:outline-none focus:border-theme-primary disabled:opacity-50"
    >
      <option value="en">{t("languages.english")}</option>
      <option value="zh">{t("languages.chinese")}</option>
    </select>
  );
};
