import React from "react";
import { useTranslation } from "react-i18next";
import { LanguageCode } from "../types";

interface LanguageSelectorProps {
  disabled?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  disabled,
}) => {
  const { i18n } = useTranslation();

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value as LanguageCode)}
      disabled={disabled}
      className="bg-theme-surface-highlight border border-theme-border text-theme-text text-xs rounded p-1 focus:outline-none focus:border-theme-primary disabled:opacity-50"
    >
      <option value="en">English</option>
      <option value="zh">中文</option>
    </select>
  );
};
