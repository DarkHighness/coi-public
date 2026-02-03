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
              <div className="text-xs text-theme-muted italic py-2 pl-2 pr-1 border-t border-theme-border/25 opacity-80">
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
            <div className="space-y-2 pt-4 border-t border-theme-border/25">
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
                <div className="mt-3 pt-2 border-t border-theme-border/25 pl-2">
                  <div className="text-[10px] uppercase tracking-wider text-theme-muted mb-1">
                    📜 {t("rules.short") || "Rules"}
                  </div>
                  <div className="text-xs text-theme-text/85 leading-relaxed pl-2 border-l border-theme-border/25">
                    <MarkdownText
                      content={worldSetting.visible.rules}
                      indentSize={2}
                    />
                  </div>
                </div>
              )}

              {/* Hidden World Setting - shown when unlocked */}
              {isWorldSettingUnlocked && worldSetting?.hidden && (
                <div className="mt-4 pt-3 border-t border-theme-border/25">
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
                    <div className="text-xs text-theme-danger/90 leading-relaxed pl-2 border-l border-theme-border/25">
                      <MarkdownText
                        content={worldSetting.hidden.hiddenRules}
                        indentSize={2}
                      />
                    </div>
                  )}
                  {worldSetting.hidden?.secrets &&
                    worldSetting.hidden.secrets.length > 0 && (
                      <div className="mt-3 pl-2">
                        <div className="text-[10px] uppercase tracking-wider text-theme-unlocked/80 mb-1">
                          {t("hidden.secrets") || "Secrets"}
                        </div>
                        <ul className="text-xs text-theme-danger/80 list-disc pl-5 space-y-1">
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
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {/* Main Goal Hidden - shown when unlocked */}
          {isMainGoalUnlocked && outline?.mainGoal?.hidden && (
            <div className="space-y-2 pt-4 border-t border-theme-border/25">
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
              <div className="text-xs text-theme-danger/90 leading-relaxed pl-2 border-l-2 border-theme-border/40">
                {outline.mainGoal.hidden?.trueDescription && (
                  <MarkdownText
                    content={outline.mainGoal.hidden.trueDescription}
                    indentSize={2}
                  />
                )}
                {outline.mainGoal.hidden?.trueConditions && (
                  <div className="mt-3 pt-2 border-t border-theme-border/25">
                    <div className="text-[10px] uppercase tracking-wider text-theme-unlocked/80 mb-1">
                      📝 {t("worldInfo.conditions") || "Conditions"}
                    </div>
                    <div className="text-xs text-theme-danger/80 leading-relaxed pl-2 border-l border-theme-border/25">
                      <MarkdownText
                        content={outline.mainGoal.hidden.trueConditions}
                        indentSize={2}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Factions */}
          {factions && factions.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-theme-border/25">
              <h4
                className={`text-xs text-theme-primary/70 uppercase tracking-wider font-bold ${themeFont}`}
              >
                {t("worldInfo.factions") || "Factions"}
              </h4>
              <div className="space-y-2">
                {factions.map((faction, idx) => (
                  <div
                    key={idx}
                    className={`relative border-l-2 border-b border-theme-border/25 transition-colors pb-2 ${
                      faction.highlight
                        ? "border-l-theme-unlocked/70 bg-theme-surface-highlight/15 animate-pulse"
                        : "border-l-theme-border/50 hover:bg-theme-surface-highlight/20"
                    }`}
                  >
                    <div className="py-2 pl-2 pr-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-theme-text flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">
                            {getValidIcon(faction.icon, "⚔️")}
                          </span>
                          <span className="break-words whitespace-normal">
                            {faction.name}
                          </span>
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
                      <div className="text-xs text-theme-text/80 mt-1 leading-relaxed">
                        <MarkdownText
                          content={faction.visible?.agenda || ""}
                          indentSize={2}
                        />
                      </div>

                      {/* Visible Extended Info */}
                      {(faction.visible?.members?.length ||
                        faction.visible?.influence ||
                        faction.visible?.relations?.length) && (
                        <div className="mt-3 pt-2 border-t border-theme-border/25 space-y-3">
                          {faction.visible?.members &&
                            faction.visible.members.length > 0 && (
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-theme-muted mb-1">
                                  {t("faction.members") || "Members"}
                                </div>
                                <ul className="text-xs text-theme-text/80 space-y-1 pl-3 border-l border-theme-border/25">
                                  {faction.visible.members.map((member, idx) => (
                                    <li key={idx}>
                                      <span className="text-theme-text/90">
                                        {member.name}
                                      </span>
                                      {member.title && (
                                        <span className="text-theme-muted">
                                          {" "}
                                          ({member.title})
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                          {faction.visible?.influence && (
                            <div className="text-xs text-theme-muted">
                              <span className="text-[10px] uppercase tracking-wider block mb-1">
                                {t("faction.influence") || "Influence"}
                              </span>
                              <div className="text-xs text-theme-text/80 pl-3 border-l border-theme-border/25">
                                {faction.visible.influence}
                              </div>
                            </div>
                          )}

                          {faction.visible?.relations &&
                            faction.visible.relations.length > 0 && (
                              <div className="text-xs text-theme-muted">
                                <span className="text-[10px] uppercase tracking-wider block mb-1">
                                  {t("faction.relations") || "Relations"}
                                </span>
                                <div className="pl-3 border-l border-theme-border/25 divide-y divide-theme-border/20">
                                  {faction.visible.relations.map((rel, idx) => (
                                    <div
                                      key={idx}
                                      className="py-1 flex justify-between gap-2"
                                    >
                                      <span className="text-theme-text/80">
                                        {rel.target}
                                      </span>
                                      <span className="text-theme-text/60">
                                        {rel.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>
                      )}

                      {/* Hidden content - only shown when unlocked */}
                      {faction.unlocked && faction.hidden && (
                        <div className="mt-4 pt-3 border-t border-theme-border/25">
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
                          <div className="text-xs text-theme-danger/90 leading-relaxed pl-2 border-l border-theme-border/25">
                            <MarkdownText
                              content={faction.hidden?.agenda || ""}
                              indentSize={2}
                            />
                          </div>

                          {/* Hidden Extended Info */}
                          <div className="mt-3 space-y-3">
                            {faction.hidden?.members &&
                              faction.hidden.members.length > 0 && (
                                <div className="text-xs text-theme-danger/70">
                                  <span className="text-[10px] uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                    {t("faction.members") || "Members"}
                                  </span>
                                  <ul className="text-xs text-theme-danger/80 space-y-1 pl-3 border-l border-theme-border/25">
                                    {faction.hidden.members.map((member, idx) => (
                                      <li key={idx}>
                                        <span className="text-theme-danger/90">
                                          {member.name}
                                        </span>
                                        {member.title && (
                                          <span className="text-theme-danger/60">
                                            {" "}
                                            ({member.title})
                                          </span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            {faction.hidden?.influence && (
                              <div className="text-xs text-theme-danger/70">
                                <span className="text-[10px] uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                  {t("faction.influence") || "Influence"}
                                </span>
                                <div className="text-xs text-theme-danger/80 pl-3 border-l border-theme-border/25">
                                  {faction.hidden.influence}
                                </div>
                              </div>
                            )}
                            {faction.hidden?.relations &&
                              faction.hidden.relations.length > 0 && (
                                <div className="text-xs text-theme-danger/70">
                                  <span className="text-[10px] uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                    {t("faction.relations") || "Relations"}
                                  </span>
                                  <div className="pl-3 border-l border-theme-border/25 divide-y divide-theme-border/20">
                                    {faction.hidden.relations.map((rel, idx) => (
                                      <div
                                        key={idx}
                                        className="py-1 flex justify-between gap-2"
                                      >
                                        <span className="text-theme-danger/80">
                                          {rel.target}
                                        </span>
                                        <span className="text-theme-danger/70">
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
