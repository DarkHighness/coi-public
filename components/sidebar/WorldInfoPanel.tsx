import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Faction } from "../../types";
import { MarkdownText } from "../render/MarkdownText";

interface WorldInfoPanelProps {
  history?: string;
  factions?: Faction[];
  worldSetting?: {
    visible: string;
    hidden: string;
  };
  themeFont: string;
}

export const WorldInfoPanel: React.FC<WorldInfoPanelProps> = ({
  history,
  factions,
  worldSetting,
  themeFont,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (!history && (!factions || factions.length === 0) && !worldSetting) {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-xs uppercase tracking-widest text-theme-muted hover:text-theme-primary transition-colors py-1"
      >
        <span className="flex items-center gap-2">
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          {t("worldInfo.title") || "World Info"}
        </span>
        <svg
          className={`w-3 h-3 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </button>

      {expanded && (
        <div className="space-y-4 pt-2 pl-2 animate-slide-in">
          {/* World History */}
          {history && (
            <div className="space-y-1">
              <h4
                className={`text-[10px] text-theme-primary/70 uppercase tracking-wider ${themeFont}`}
              >
                {t("worldInfo.history") || "History"}
              </h4>
              <div className="text-xs text-theme-text/80 font-serif leading-relaxed">
                <MarkdownText content={history} />
              </div>
            </div>
          )}

          {/* World Setting (Visible) */}
          {worldSetting?.visible && (
            <div className="space-y-1">
              <h4
                className={`text-[10px] text-theme-primary/70 uppercase tracking-wider ${themeFont}`}
              >
                {t("worldInfo.setting") || "Setting"}
              </h4>
              <div className="text-xs text-theme-text/80 font-serif leading-relaxed">
                <MarkdownText content={worldSetting.visible} />
              </div>
            </div>
          )}

          {/* Factions */}
          {factions && factions.length > 0 && (
            <div className="space-y-2">
              <h4
                className={`text-[10px] text-theme-primary/70 uppercase tracking-wider ${themeFont}`}
              >
                {t("worldInfo.factions") || "Factions"}
              </h4>
              <div className="space-y-2">
                {factions.map((faction, idx) => (
                  <div
                    key={idx}
                    className="bg-theme-surface/40 border border-theme-border/50 rounded p-2"
                  >
                    <div className="font-bold text-xs text-theme-primary mb-1">
                      {faction.name}
                    </div>
                    <div className="text-[10px] text-theme-text/70 italic">
                      {faction.visible}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
