import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Faction, StoryOutline } from "../../types";
import { MarkdownText } from "../render/MarkdownText";

interface WorldInfoPanelProps {
  history?: string;
  factions?: Faction[];
  worldSetting?: {
    visible: string;
    hidden: string;
  };
  themeFont: string;
  outline?: StoryOutline | null; // Full outline for hidden content
  unlockMode?: boolean; // Whether unlock mode is active
}

export const WorldInfoPanel: React.FC<WorldInfoPanelProps> = ({
  history,
  factions,
  worldSetting,
  themeFont,
  outline,
  unlockMode,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  // Check if world info is unlocked (either via unlock mode or story progress)
  const isWorldSettingUnlocked = unlockMode || outline?.worldSettingUnlocked;
  const isMainGoalUnlocked = unlockMode || outline?.mainGoalUnlocked;

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

              {/* Hidden World Setting - shown when unlocked */}
              {isWorldSettingUnlocked && worldSetting.hidden && (
                <div className="mt-2 pt-2 border-t border-yellow-500/20">
                  <div className="flex items-center gap-1 text-yellow-500 text-[9px] uppercase tracking-wider font-bold mb-1">
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    {t("worldInfo.hiddenTruth") || "Hidden Truth"}
                  </div>
                  <div className="text-[10px] text-red-300/80 italic">
                    <MarkdownText content={worldSetting.hidden} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main Goal Hidden - shown when unlocked */}
          {isMainGoalUnlocked && outline?.mainGoal?.hidden && (
            <div className="space-y-1">
              <h4
                className={`text-[10px] text-yellow-500/90 uppercase tracking-wider ${themeFont} flex items-center gap-1`}
              >
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                {t("worldInfo.secretObjective") || "Secret Objective"}
              </h4>
              <div className="text-xs text-red-300/80 font-serif leading-relaxed italic bg-red-500/5 p-2 rounded border border-red-500/20">
                <MarkdownText content={outline.mainGoal.hidden} />
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
                    className={`bg-theme-surface/40 border border-theme-border/50 rounded p-2 transition-all ${
                      faction.highlight ? "ring-1 ring-yellow-400/50 bg-yellow-500/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-xs text-theme-primary">
                        {faction.name}
                      </span>
                      {/* Unlocked indicator */}
                      {faction.unlocked && (
                        <span className="text-yellow-500" title={t("unlocked") || "Unlocked"}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-theme-text/70 italic">
                      {faction.visible}
                    </div>

                    {/* Hidden content - only shown when unlocked */}
                    {faction.unlocked && faction.hidden && (
                      <div className="mt-2 pt-2 border-t border-yellow-500/20">
                        <div className="flex items-center gap-1 text-yellow-500 text-[9px] uppercase tracking-wider font-bold mb-1">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          {t("secretAgenda") || "Secret Agenda"}
                        </div>
                        <div className="text-[10px] text-red-300/80 not-italic">
                          {faction.hidden}
                        </div>
                      </div>
                    )}
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
