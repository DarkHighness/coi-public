import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Faction, StoryOutline } from "../../types";
import { MarkdownText } from "../render/MarkdownText";
import { getValidIcon } from "../../utils/emojiValidator";

interface WorldInfoPanelProps {
  history?: string;
  factions?: Faction[];
  worldSetting?: {
    visible?: {
      description?: string;
      rules?: string;
    };
    hidden?: {
      hiddenRules?: string;
      secrets?: string[];
    };
    history?: string;
  };
  themeFont: string;
  outline?: StoryOutline | null; // Full outline for hidden content
  unlockMode?: boolean; // Whether unlock mode is active
}

export const WorldInfoPanel: React.FC<WorldInfoPanelProps> = ({
  history,
  factions = [],
  worldSetting,
  themeFont,
  outline,
  unlockMode,
}) => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  // Check if world info is unlocked (either via unlock mode or story progress)
  const isWorldSettingUnlocked = unlockMode || outline?.worldSettingUnlocked || false;
  const isMainGoalUnlocked = unlockMode || outline?.mainGoalUnlocked || false;

  return (
    <div>
      <div
      onClick={() => setExpanded(!expanded)}
      className={`flex items-center justify-between cursor-pointer group ${
        expanded ? "mb-3" : "mb-0"
      }`}
    >
      <div
        className={`flex items-center text-theme-primary uppercase text-xs font-bold tracking-widest ${themeFont}`}
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
      </div>

      <div className="flex items-center gap-2">
        <div className="text-theme-muted group-hover:text-theme-primary p-1 transition-colors">
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${
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
        </div>
      </div>
    </div>

      {expanded && (
        <div className="space-y-4 pt-2 pl-2 animate-[fade-in_0.3s_ease-in]">
          {/* Empty State Check */}
          {!history &&
            !worldSetting?.visible?.description &&
            (!factions || factions.length === 0) &&
            !isMainGoalUnlocked && (
              <div className="text-xs text-theme-muted italic text-center py-2 opacity-70">
                {t("worldInfo.empty") || "No world information recorded yet."}
              </div>
            )}

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
          {worldSetting?.visible?.description && (
            <div className="space-y-1">
              <h4
                className={`text-[10px] text-theme-primary/70 uppercase tracking-wider ${themeFont}`}
              >
                {t("worldInfo.setting") || "Setting"}
              </h4>
              <div className="text-xs text-theme-text/80 font-serif leading-relaxed">
                <MarkdownText content={worldSetting.visible.description} />
              </div>
              {worldSetting.visible?.rules && (
                <div className="text-[10px] text-theme-muted mt-1">
                  📜 {worldSetting.visible.rules}
                </div>
              )}

              {/* Hidden World Setting - shown when unlocked */}
              {isWorldSettingUnlocked && worldSetting?.hidden && (
                <div className="mt-2 pt-2 border-t border-theme-unlocked/20">
                  <div className="flex items-center gap-1 text-theme-unlocked text-[9px] uppercase tracking-wider font-bold mb-1">
                    <svg
                      className="w-2.5 h-2.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t("worldInfo.hiddenTruth") || "Hidden Truth"}
                  </div>
                  {worldSetting.hidden?.hiddenRules && (
                    <div className="text-[10px] text-theme-danger/80 italic">
                      <MarkdownText content={worldSetting.hidden.hiddenRules} />
                    </div>
                  )}
                  {worldSetting.hidden?.secrets &&
                    worldSetting.hidden.secrets.length > 0 && (
                      <ul className="text-[10px] text-theme-danger/70 mt-1 list-disc pl-3">
                        {worldSetting.hidden.secrets.map((secret, idx) => (
                          <li key={idx}>{secret}</li>
                        ))}
                      </ul>
                    )}
                </div>
              )}
            </div>
          )}

          {/* Main Goal Hidden - shown when unlocked */}
          {isMainGoalUnlocked && outline?.mainGoal?.hidden && (
            <div className="space-y-1">
              <h4
                className={`text-[10px] text-theme-unlocked/90 uppercase tracking-wider ${themeFont} flex items-center gap-1`}
              >
                <svg
                  className="w-2.5 h-2.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {t("worldInfo.secretObjective") || "Secret Objective"}
              </h4>
              <div className="text-xs text-theme-danger/80 font-serif leading-relaxed italic bg-theme-danger/5 p-2 rounded border border-theme-danger/20">
                {outline.mainGoal.hidden?.trueDescription && (
                  <MarkdownText
                    content={outline.mainGoal.hidden.trueDescription}
                  />
                )}
                {outline.mainGoal.hidden?.trueConditions && (
                  <p className="mt-1 text-[10px] text-theme-danger/60">
                    📝 {outline.mainGoal.hidden.trueConditions}
                  </p>
                )}
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
                      faction.highlight
                        ? "ring-1 ring-theme-unlocked/50 bg-theme-unlocked/5"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-xs text-theme-primary">
                        <span className="mr-1">
                          {getValidIcon(faction.icon, "⚔️")}
                        </span>
                        {faction.name}
                      </span>
                      {/* Unlocked indicator */}
                      {faction.unlocked && (
                        <span
                          className="text-theme-unlocked"
                          title={t("unlocked") || "Unlocked"}
                        >
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-theme-text/70 italic">
                      {faction.visible?.agenda}
                    </div>

                    {/* Visible Extended Info */}
                    <div className="mt-2 space-y-1 border-t border-theme-border/30 pt-1">
                      {faction.visible?.members &&
                        faction.visible.members.length > 0 && (
                          <div className="text-[10px] text-theme-muted">
                            <span className="text-theme-primary/80 font-bold block mb-1">
                              {t("faction.members") || "Members"}:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {faction.visible.members.map((member, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 bg-theme-surface-highlight rounded text-theme-text/90 border border-theme-border/50 flex items-center gap-1"
                                  title={member.title}
                                >
                                  {member.name}
                                  {member.title && (
                                    <span className="text-[9px] text-theme-muted opacity-75">
                                      ({member.title})
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      {faction.visible?.influence && (
                        <div className="text-[10px] text-theme-muted flex items-start gap-1">
                          <span className="text-theme-primary/80 font-bold whitespace-nowrap">
                            {t("faction.influence") || "Influence"}:
                          </span>
                          <span className="text-theme-text/80">
                            {faction.visible.influence}
                          </span>
                        </div>
                      )}
                      {faction.visible?.relations &&
                        faction.visible.relations.length > 0 && (
                          <div className="text-[10px] text-theme-muted">
                            <span className="text-theme-primary/80 font-bold block mb-0.5">
                              {t("faction.relations") || "Relations"}:
                            </span>
                            <div className="grid grid-cols-1 gap-0.5 pl-1">
                              {faction.visible.relations.map((rel, idx) => (
                                <div key={idx} className="flex justify-between">
                                  <span>{rel.target}</span>
                                  <span className="text-theme-text/70 italic">
                                    {rel.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Hidden content - only shown when unlocked */}
                    {faction.unlocked && faction.hidden && (
                      <div className="mt-2 pt-2 border-t border-theme-unlocked/20">
                        <div className="flex items-center gap-1 text-theme-unlocked text-[9px] uppercase tracking-wider font-bold mb-1">
                          <svg
                            className="w-2.5 h-2.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {t("secretAgenda") || "Secret Agenda"}
                        </div>
                        <div className="text-[10px] text-theme-danger/80 not-italic mb-2">
                          {faction.hidden?.agenda}
                        </div>

                        {/* Hidden Extended Info */}
                        <div className="space-y-1">
                          {faction.hidden?.members &&
                            faction.hidden.members.length > 0 && (
                              <div className="text-[10px] text-theme-danger/60">
                                <span className="text-theme-unlocked/80 font-bold block mb-1">
                                  {t("faction.members") || "Members"}:
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {faction.hidden.members.map((member, idx) => (
                                    <span
                                      key={idx}
                                      className="px-1.5 py-0.5 bg-theme-danger/10 rounded text-theme-danger/90 border border-theme-danger/30 flex items-center gap-1"
                                      title={member.title}
                                    >
                                      {member.name}
                                      {member.title && (
                                        <span className="text-[9px] text-theme-danger/60 opacity-75">
                                          ({member.title})
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          {faction.hidden?.influence && (
                            <div className="text-[10px] text-theme-danger/60 flex items-start gap-1">
                              <span className="text-theme-unlocked/80 font-bold whitespace-nowrap">
                                {t("faction.influence") || "Influence"}:
                              </span>
                              <span>{faction.hidden.influence}</span>
                            </div>
                          )}
                          {faction.hidden?.relations &&
                            faction.hidden.relations.length > 0 && (
                              <div className="text-[10px] text-theme-danger/60">
                                <span className="text-theme-unlocked/80 font-bold block mb-0.5">
                                  {t("faction.relations") || "Relations"}:
                                </span>
                                <div className="grid grid-cols-1 gap-0.5 pl-1">
                                  {faction.hidden.relations.map((rel, idx) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between"
                                    >
                                      <span>{rel.target}</span>
                                      <span className="italic">
                                        {rel.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
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
