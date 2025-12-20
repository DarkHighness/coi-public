/**
 * QuestsTab - Quest tracking display
 * Shows main goal, active quests, completed and failed quests
 */

import React from "react";
import { GameState, Quest } from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { Section, EmptyState, HiddenContent } from "./helpers";

interface QuestsTabProps {
  gameState: GameState;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  t: (key: string, options?: any) => string;
}

// Quest card component for active quests
const QuestCard: React.FC<{
  quest: Quest;
  gameState: GameState;
  t: (key: string, options?: any) => string;
}> = ({ quest, gameState, t }) => (
  <div className="p-4 bg-theme-surface-highlight/30 rounded border border-theme-border/50">
    <div className="font-bold text-theme-primary text-sm flex items-center gap-2 mb-2">
      <span>{getValidIcon(quest.icon, "📜")}</span>
      {quest.title}
    </div>
    <div className="text-theme-text/90 text-sm pl-2 border-l-2 border-theme-border/50">
      <MarkdownText content={quest.visible.description} />
    </div>
    {quest.visible.objectives && quest.visible.objectives.length > 0 && (
      <div className="mt-3 pt-2 border-t border-theme-border/30">
        <span className="text-xs uppercase tracking-wider text-theme-primary font-bold block mb-1">
          {t("gameViewer.objectives") || "Objectives"}
        </span>
        <div className="space-y-1">
          {quest.visible.objectives.map((obj, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              <span className="text-theme-muted mt-1">○</span>
              <span className="text-theme-text">
                <MarkdownText content={obj} />
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
    {(quest.unlocked || gameState.unlockMode) && quest.hidden && (
      <HiddenContent
        t={t}
        content={
          <div className="space-y-2">
            {quest.hidden.trueDescription && (
              <MarkdownText content={quest.hidden.trueDescription} />
            )}
            {quest.hidden.trueObjectives &&
              quest.hidden.trueObjectives.length > 0 && (
                <div>
                  <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                    {t("gameViewer.trueObjectives")}:
                  </span>
                  <ul className="list-disc list-inside pl-2">
                    {quest.hidden.trueObjectives.map((obj, i) => (
                      <li key={i}>
                        <MarkdownText content={obj} inline />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            {quest.hidden.secretOutcome && (
              <div>
                <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                  {t("gameViewer.secretOutcome")}:
                </span>
                <MarkdownText content={quest.hidden.secretOutcome} />
              </div>
            )}
          </div>
        }
      />
    )}
  </div>
);

export const QuestsTab: React.FC<QuestsTabProps> = ({
  gameState,
  expandedSections,
  toggleSection,
  t,
}) => {
  const activeQuests = gameState.quests.filter((q) => q.status === "active");
  const completedQuests = gameState.quests.filter(
    (q) => q.status === "completed",
  );
  const failedQuests = gameState.quests.filter((q) => q.status === "failed");

  return (
    <div className="space-y-4">
      {/* Main Goal */}
      {gameState.outline?.mainGoal && (
        <Section
          id="mainGoal"
          title={t("gameViewer.mainGoal")}
          icon="🎯"
          isExpanded={expandedSections.has("mainGoal")}
          onToggle={toggleSection}
        >
          <div className="text-theme-text text-sm leading-relaxed">
            <MarkdownText
              content={gameState.outline.mainGoal.visible?.description || ""}
            />
          </div>
          {gameState.outline.mainGoal.visible?.conditions && (
            <div className="mt-3 pt-2 border-t border-theme-border/30">
              <span className="text-xs uppercase tracking-wider text-theme-primary font-bold block mb-1">
                {t("gameViewer.conditions") || "Conditions"}
              </span>
              <div className="text-theme-muted text-sm pl-2 border-l-2 border-theme-border/50">
                <MarkdownText
                  content={gameState.outline.mainGoal.visible.conditions}
                />
              </div>
            </div>
          )}
          {(gameState.outline.mainGoalUnlocked || gameState.unlockMode) &&
            gameState.outline.mainGoal.hidden && (
              <HiddenContent
                t={t}
                content={
                  <div className="space-y-2">
                    {gameState.outline.mainGoal.hidden.trueDescription && (
                      <MarkdownText
                        content={
                          gameState.outline.mainGoal.hidden.trueDescription
                        }
                      />
                    )}
                    {gameState.outline.mainGoal.hidden.trueConditions && (
                      <div>
                        <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                          {t("gameViewer.trueConditions") || "True Conditions"}:
                        </span>
                        <MarkdownText
                          content={
                            gameState.outline.mainGoal.hidden.trueConditions
                          }
                        />
                      </div>
                    )}
                  </div>
                }
              />
            )}
        </Section>
      )}

      {/* Active Quests */}
      <Section
        id="activeQuests2"
        title={`${t("gameViewer.activeQuests")} (${activeQuests.length})`}
        icon="📜"
        isExpanded={expandedSections.has("activeQuests2")}
        onToggle={toggleSection}
      >
        {activeQuests.length === 0 ? (
          <EmptyState message={t("gameViewer.noActiveQuests")} />
        ) : (
          <div className="space-y-3">
            {activeQuests.map((quest, idx) => (
              <QuestCard
                key={quest.id || idx}
                quest={quest}
                gameState={gameState}
                t={t}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Completed Quests */}
      {completedQuests.length > 0 && (
        <Section
          id="completedQuests"
          title={`${t("gameViewer.completedQuests")} (${completedQuests.length})`}
          icon="✅"
          isExpanded={expandedSections.has("completedQuests")}
          onToggle={toggleSection}
        >
          <div className="space-y-2">
            {completedQuests.map((quest, idx) => (
              <div
                key={quest.id || idx}
                className="p-3 bg-green-500/5 rounded border border-green-500/20"
              >
                <span className="text-theme-text text-sm flex items-center gap-2 font-medium">
                  <span>{getValidIcon(quest.icon, "✅")}</span>
                  {quest.title}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Failed Quests */}
      {failedQuests.length > 0 && (
        <Section
          id="failedQuests"
          title={`${t("gameViewer.failedQuests")} (${failedQuests.length})`}
          icon="❌"
          isExpanded={expandedSections.has("failedQuests")}
          onToggle={toggleSection}
        >
          <div className="space-y-2">
            {failedQuests.map((quest, idx) => (
              <div
                key={quest.id || idx}
                className="p-3 bg-red-500/5 rounded border border-red-500/20"
              >
                <span className="text-theme-text text-sm line-through opacity-70 flex items-center gap-2 font-medium">
                  <span>{getValidIcon(quest.icon, "❌")}</span>
                  {quest.title}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};
