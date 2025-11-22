import React from "react";
import { useTranslation } from "react-i18next";
import { Tab, SettingsTabProps } from "./types";

export const SettingsTabs: React.FC<SettingsTabProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const { t } = useTranslation();
  const tabs: Tab[] = ["credentials", "models", "audio", "appearance", "data"];

  return (
    <div className="flex border-b border-theme-border bg-theme-bg">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
            activeTab === tab
              ? "bg-theme-surface text-theme-primary border-b-2 border-theme-primary"
              : "text-theme-muted hover:text-theme-text hover:bg-theme-surface-highlight"
          }`}
        >
          {t(`tabs.${tab}`) || tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  );
};
