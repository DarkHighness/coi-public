import React from "react";
import { useTranslation } from "react-i18next";

export type MobileTab = "story" | "status" | "menu";

interface MobileNavProps {
  currentTab: MobileTab;
  setTab: (tab: MobileTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentTab, setTab }) => {
  const { t } = useTranslation();

  const tabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "story",
      label: t("mobileTabs.story"),
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          ></path>
        </svg>
      ),
    },
    {
      id: "status",
      label: t("mobileTabs.status"),
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          ></path>
        </svg>
      ),
    },
    {
      id: "menu",
      label: t("mobileTabs.menu"),
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 6h16M4 12h16m-7 6h7"
          ></path>
        </svg>
      ),
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-theme-surface border-t border-theme-border z-40 pb-safe">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center h-full transition-colors ${isActive ? "text-theme-primary" : "text-theme-muted hover:text-theme-text"}`}
            >
              {tab.icon}
              <span className="text-[10px] uppercase tracking-wide font-bold mt-1">
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-1/3 h-0.5 bg-theme-primary rounded-t-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
