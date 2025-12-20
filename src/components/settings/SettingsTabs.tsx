import React from "react";
import { useTranslation } from "react-i18next";
import { Tab, SettingsTabProps } from "./types";
import { useTutorialContextOptional } from "../../contexts/TutorialContext";

export const SettingsTabs: React.FC<SettingsTabProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const { t } = useTranslation();
  const tutorial = useTutorialContextOptional();

  const tabs: Tab[] = [
    "providers",
    "models",
    "embedding",
    "audio",
    "appearance",
    "data",
    "extra",
  ];

  const handleTabClick = (tab: Tab) => {
    // If tutorial is on the "models-tab" step, advance it to model selection step
    if (tutorial?.isActive && tutorial.currentStep?.id === "models-tab" && tab === "models") {
      tutorial.markStepActionComplete();
      tutorial.nextStep(); // Move to model selection step
    }
    setActiveTab(tab);
  };

  return (
    <div
      className="flex border-b border-theme-border bg-theme-bg overflow-x-auto scrollbar-hide"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
      `}</style>
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => handleTabClick(tab)}
          data-tutorial-id={tab === "models" ? "models-tab-button" : undefined}
          className={`flex-1 min-w-max py-3 px-2 text-sm font-bold uppercase tracking-widest transition-colors ${
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
