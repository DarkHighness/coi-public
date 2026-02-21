/**
 * QuestsTab - Quest tracking display
 * Shows main goal, active quests, completed and failed quests
 */

import React from "react";
import type { TFunction } from "i18next";
import { GameState, Quest } from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import {
  Section,
  EmptyState,
  HiddenContent,
  InfoRow,
  EntityBlock,
} from "./helpers";

interface QuestsTabProps {
  gameState: GameState;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  t: TFunction;
}

const renderMarkdownList = (items: string[]) => (
  <ul className="list-disc list-inside space-y-1">
    {items.map((item, idx) => (
      <li key={`${item}-${idx}`}>
        <MarkdownText content={item} inline />
      </li>
    ))}
  </ul>
);

const QuestCard: React.FC<{
  quest: Quest;
  gameState: GameState;
  t: TFunction;
}> = ({ quest, gameState, t }) => (
  <EntityBlock className="border-b border-theme-divider/70">
    <div className="flex items-center justify-between gap-2 mb-2">
      <div className="font-semibold text-theme-text text-xs flex items-center gap-2">
        <span>{getValidIcon(quest.icon, "📜")}</span>
        {quest.title}
      </div>
      <span className="text-[10px] uppercase tracking-[0.08em] text-theme-text-secondary px-2 py-0.5 border border-theme-divider/70">
        {t(`questType.${quest.type}`, {
          defaultValue: quest.type,
        })}
      </span>
    </div>

    <InfoRow
      label={t("description") || "Description"}
      value={<MarkdownText content={quest.visible.description} />}
    />

    {Array.isArray(quest.visible.objectives) &&
    quest.visible.objectives.length > 0 ? (
      <InfoRow
        label={t("gameViewer.objectives") || "Objectives"}
        value={renderMarkdownList(quest.visible.objectives)}
      />
    ) : null}

    {(quest.unlocked || gameState.unlockMode) && quest.hidden ? (
      <HiddenContent
        t={t}
        content={
          <>
            {quest.unlockReason ? (
              <InfoRow
                label={t("gameViewer.unlockReason", {
                  defaultValue: "Unlock Reason",
                })}
                value={quest.unlockReason}
              />
            ) : null}
            {quest.hidden.trueDescription ? (
              <InfoRow
                label={t("gameViewer.trueDescription", {
                  defaultValue: "True Description",
                })}
                value={<MarkdownText content={quest.hidden.trueDescription} />}
              />
            ) : null}
            {Array.isArray(quest.hidden.trueObjectives) &&
            quest.hidden.trueObjectives.length > 0 ? (
              <InfoRow
                label={t("gameViewer.trueObjectives")}
                value={renderMarkdownList(quest.hidden.trueObjectives)}
              />
            ) : null}
            {quest.hidden.secretOutcome ? (
              <InfoRow
                label={t("gameViewer.secretOutcome")}
                value={<MarkdownText content={quest.hidden.secretOutcome} />}
              />
            ) : null}
            {quest.hidden.twist ? (
              <InfoRow
                label={t("gameViewer.twist") || "Twist"}
                value={<MarkdownText content={quest.hidden.twist} />}
              />
            ) : null}
          </>
        }
      />
    ) : null}
  </EntityBlock>
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
      {gameState.worldInfo?.mainGoal ? (
        <Section
          id="mainGoal"
          title={t("gameViewer.mainGoal")}
          icon="🎯"
          isExpanded={expandedSections.has("mainGoal")}
          onToggle={toggleSection}
        >
          <InfoRow
            label={t("description") || "Description"}
            value={
              <MarkdownText
                content={
                  gameState.worldInfo.mainGoal.visible?.description || ""
                }
              />
            }
          />

          {gameState.worldInfo.mainGoal.visible?.conditions ? (
            <InfoRow
              label={t("gameViewer.conditions") || "Conditions"}
              value={
                <MarkdownText
                  content={gameState.worldInfo.mainGoal.visible.conditions}
                />
              }
            />
          ) : null}

          {(gameState.worldInfo.mainGoalUnlocked || gameState.unlockMode) &&
          gameState.worldInfo.mainGoal.hidden ? (
            <HiddenContent
              t={t}
              content={
                <>
                  {gameState.worldInfo.mainGoalUnlockReason ? (
                    <InfoRow
                      label={t("gameViewer.unlockReason", {
                        defaultValue: "Unlock Reason",
                      })}
                      value={gameState.worldInfo.mainGoalUnlockReason}
                    />
                  ) : null}
                  {gameState.worldInfo.mainGoal.hidden.trueDescription ? (
                    <InfoRow
                      label={t("gameViewer.trueDescription", {
                        defaultValue: "True Description",
                      })}
                      value={
                        <MarkdownText
                          content={
                            gameState.worldInfo.mainGoal.hidden.trueDescription
                          }
                        />
                      }
                    />
                  ) : null}
                  {gameState.worldInfo.mainGoal.hidden.trueConditions ? (
                    <InfoRow
                      label={
                        t("gameViewer.trueConditions") || "True Conditions"
                      }
                      value={
                        <MarkdownText
                          content={
                            gameState.worldInfo.mainGoal.hidden.trueConditions
                          }
                        />
                      }
                    />
                  ) : null}
                </>
              }
            />
          ) : null}
        </Section>
      ) : null}

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

      {completedQuests.length > 0 ? (
        <Section
          id="completedQuests"
          title={`${t("gameViewer.completedQuests")} (${completedQuests.length})`}
          icon="✅"
          isExpanded={expandedSections.has("completedQuests")}
          onToggle={toggleSection}
        >
          <div className="space-y-2">
            {completedQuests.map((quest, idx) => (
              <EntityBlock key={quest.id || idx}>
                <span className="text-theme-text text-xs flex items-center gap-2 font-medium">
                  <span>{getValidIcon(quest.icon, "✅")}</span>
                  {quest.title}
                </span>
              </EntityBlock>
            ))}
          </div>
        </Section>
      ) : null}

      {failedQuests.length > 0 ? (
        <Section
          id="failedQuests"
          title={`${t("gameViewer.failedQuests")} (${failedQuests.length})`}
          icon="❌"
          isExpanded={expandedSections.has("failedQuests")}
          onToggle={toggleSection}
        >
          <div className="space-y-2">
            {failedQuests.map((quest, idx) => (
              <EntityBlock key={quest.id || idx}>
                <span className="text-theme-text text-xs line-through opacity-70 flex items-center gap-2 font-medium">
                  <span>{getValidIcon(quest.icon, "❌")}</span>
                  {quest.title}
                </span>
              </EntityBlock>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
};
