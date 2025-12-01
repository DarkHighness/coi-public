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
  const isWorldSettingUnlocked =
    unlockMode || outline?.worldSettingUnlocked || false;
  const isMainGoalUnlocked = unlockMode || outline?.mainGoalUnlocked || false;

  return (
    <div>
      <div
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center justify-between cursor-pointer group ${
          expanded ? "mb-4" : "mb-0"
        }`}
      >
        <div
          className={`flex items-center text-theme-primary uppercase text-xs font-bold tracking-widest ${themeFont}`}
        >
          <span className="flex items-center gap-2">
            <svg
              className="w-5 h-5"
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
              className={`w-5 h-5 transition-transform duration-300 ${
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
        <div className="space-y-6 animate-[fade-in_0.3s_ease-in]">
          {/* Empty State Check */}
          {!history &&
            !worldSetting?.visible?.description &&
            (!factions || factions.length === 0) &&
            !isMainGoalUnlocked && (
              <div className="text-xs text-theme-muted italic text-center py-4 opacity-70 border border-dashed border-theme-border/50 rounded bg-theme-surface-highlight/10">
                {t("worldInfo.empty") || "No world information recorded yet."}
              </div>
            )}

          {/* World History */}
          {history && (
            <div className="space-y-2">
              <h4
                className={`text-xs text-theme-primary/70 uppercase tracking-wider font-bold ${themeFont}`}
              >
                {t("worldInfo.history") || "History"}
              </h4>
              <div className="text-xs text-theme-text/90 leading-relaxed pl-2 border-l-2 border-theme-border/50">
                <MarkdownText content={history} indentSize={2} />
              </div>
            </div>
          )}

          {/* World Setting (Visible) */}
          {worldSetting?.visible?.description && (
            <div className="space-y-2">
              <h4
                className={`text-xs text-theme-primary/70 uppercase tracking-wider font-bold ${themeFont}`}
              >
                {t("worldInfo.setting") || "Setting"}
              </h4>
              <div className="text-xs text-theme-text/90 leading-relaxed pl-2 border-l-2 border-theme-border/50">
                <MarkdownText
                  content={worldSetting.visible.description}
                  indentSize={2}
                />
              </div>
              {worldSetting.visible?.rules && (
                <div className="text-xs text-theme-muted mt-2 pl-2">
                  <span className="font-bold">📜 Rules:</span>{" "}
                  <MarkdownText
                    content={worldSetting.visible.rules}
                    indentSize={2}
                  />
                </div>
              )}

              {/* Hidden World Setting - shown when unlocked */}
              {isWorldSettingUnlocked && worldSetting?.hidden && (
                <div className="mt-4 pt-3 border-t border-theme-unlocked/20">
                  <div className="flex items-center gap-1 text-theme-unlocked text-[10px] uppercase tracking-wider font-bold mb-2">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t("worldInfo.hiddenTruth") || "Hidden Truth"}
                  </div>
                  {worldSetting.hidden?.hiddenRules && (
                    <div className="text-xs text-theme-danger/90 mb-2">
                      <MarkdownText
                        content={worldSetting.hidden.hiddenRules}
                        indentSize={2}
                      />
                    </div>
                  )}
                  {worldSetting.hidden?.secrets &&
                    worldSetting.hidden.secrets.length > 0 && (
                      <ul className="text-xs text-theme-danger/80 mt-2 list-disc pl-4 space-y-1">
                        {worldSetting.hidden.secrets.map((secret, idx) => (
                          <li key={idx}>
                            <MarkdownText
                              content={secret}
                              indentSize={2}
                              inline
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                </div>
              )}
            </div>
          )}

          {/* Main Goal Hidden - shown when unlocked */}
          {isMainGoalUnlocked && outline?.mainGoal?.hidden && (
            <div className="space-y-2">
              <h4
                className={`text-xs text-theme-unlocked/90 uppercase tracking-wider font-bold ${themeFont} flex items-center gap-1.5`}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z"
                    clipRule="evenodd"
                  />
                </svg>
                {t("worldInfo.secretObjective") || "Secret Objective"}
              </h4>
              <div className="text-xs text-theme-danger/90 leading-relaxed bg-theme-surface/50 p-3 rounded border border-theme-danger/20">
                {outline.mainGoal.hidden?.trueDescription && (
                  <MarkdownText
                    content={outline.mainGoal.hidden.trueDescription}
                    indentSize={2}
                  />
                )}
                {outline.mainGoal.hidden?.trueConditions && (
                  <div className="mt-2 text-xs text-theme-danger/70 border-t border-theme-danger/10 pt-2">
                    <span className="font-bold">📝 Conditions:</span>{" "}
                    <MarkdownText
                      content={outline.mainGoal.hidden.trueConditions}
                      indentSize={2}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Factions */}
          {factions && factions.length > 0 && (
            <div className="space-y-3">
              <h4
                className={`text-xs text-theme-primary/70 uppercase tracking-wider font-bold ${themeFont}`}
              >
                {t("worldInfo.factions") || "Factions"}
              </h4>
              <div className="space-y-3">
                {factions.map((faction, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-r-md border-y border-r border-l-4 bg-theme-surface/30 p-3 transition-all ${
                      faction.highlight
                        ? "border-l-theme-unlocked ring-1 ring-theme-unlocked/30"
                        : "border-l-theme-border/50 border-y-theme-border/30 border-r-theme-border/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-xs text-theme-primary flex items-center gap-2">
                        <span className="text-base">
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
                            className="w-3.5 h-3.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-theme-text/80 mb-3">
                      <MarkdownText
                        content={faction.visible?.agenda || ""}
                        indentSize={2}
                      />
                    </div>

                    {/* Visible Extended Info */}
                    <div className="mt-3 space-y-2 border-t border-theme-border/30 pt-2">
                      {faction.visible?.members &&
                        faction.visible.members.length > 0 && (
                          <div className="text-xs text-theme-muted">
                            <span className="text-theme-primary/80 font-bold block mb-1">
                              {t("faction.members") || "Members"}:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {faction.visible.members.map((member, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-theme-bg/50 rounded text-theme-text/90 border border-theme-border/50 flex items-center gap-1"
                                  title={member.title}
                                >
                                  {member.name}
                                  {member.title && (
                                    <span className="text-[10px] text-theme-muted opacity-75">
                                      ({member.title})
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      {faction.visible?.influence && (
                        <div className="text-xs text-theme-muted flex items-start gap-1">
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
                          <div className="text-xs text-theme-muted">
                            <span className="text-theme-primary/80 font-bold block mb-1">
                              {t("faction.relations") || "Relations"}:
                            </span>
                            <div className="grid grid-cols-1 gap-1 pl-1">
                              {faction.visible.relations.map((rel, idx) => (
                                <div key={idx} className="flex justify-between">
                                  <span>{rel.target}</span>
                                  <span className="text-theme-text/70">
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
                      <div className="mt-3 pt-3 border-t border-theme-unlocked/20">
                        <div className="flex items-center gap-1 text-theme-unlocked text-[10px] uppercase tracking-wider font-bold mb-2">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {t("secretAgenda") || "Secret Agenda"}
                        </div>
                        <div className="text-xs text-theme-danger/90 mb-3">
                          <MarkdownText
                            content={faction.hidden?.agenda || ""}
                            indentSize={2}
                          />
                        </div>

                        {/* Hidden Extended Info */}
                        <div className="space-y-2">
                          {faction.hidden?.members &&
                            faction.hidden.members.length > 0 && (
                              <div className="text-xs text-theme-danger/70">
                                <span className="text-theme-unlocked/80 font-bold block mb-1">
                                  {t("faction.members") || "Members"}:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {faction.hidden.members.map((member, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 bg-theme-surface/50 rounded text-theme-danger/90 border border-theme-danger/30 flex items-center gap-1"
                                      title={member.title}
                                    >
                                      {member.name}
                                      {member.title && (
                                        <span className="text-[10px] text-theme-danger/60 opacity-75">
                                          ({member.title})
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          {faction.hidden?.influence && (
                            <div className="text-xs text-theme-danger/70 flex items-start gap-1">
                              <span className="text-theme-unlocked/80 font-bold whitespace-nowrap">
                                {t("faction.influence") || "Influence"}:
                              </span>
                              <span>{faction.hidden.influence}</span>
                            </div>
                          )}
                          {faction.hidden?.relations &&
                            faction.hidden.relations.length > 0 && (
                              <div className="text-xs text-theme-danger/70">
                                <span className="text-theme-unlocked/80 font-bold block mb-1">
                                  {t("faction.relations") || "Relations"}:
                                </span>
                                <div className="grid grid-cols-1 gap-1 pl-1">
                                  {faction.hidden.relations.map((rel, idx) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between"
                                    >
                                      <span>{rel.target}</span>
                                      <span>{rel.status}</span>
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
