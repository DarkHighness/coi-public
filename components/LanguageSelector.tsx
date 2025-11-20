import React from 'react';
import { LanguageCode } from '../types';

interface LanguageSelectorProps {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  disabled?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ language, setLanguage, disabled }) => (
  <select
    value={language}
    onChange={(e) => setLanguage(e.target.value as LanguageCode)}
    disabled={disabled}
    className="bg-theme-surface-highlight border border-theme-border text-theme-text text-xs rounded p-1 focus:outline-none focus:border-theme-primary disabled:opacity-50"
  >
    <option value="en">English</option>
    <option value="zh">中文</option>
  </select>
);
