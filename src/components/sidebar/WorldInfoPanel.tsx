import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { StoryOutline, WorldInfo } from "../../types";
import { MarkdownText } from "../render/MarkdownText";
import { SidebarSection, SidebarField } from "./SidebarSections";
import { SidebarPanelHeader } from "./SidebarPanelHeader";

interface WorldInfoPanelProps {
  history?: string;
  outline?: StoryOutline | null;
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
  worldInfo?: WorldInfo | null;
  unlockMode?: boolean;
}

const WorldInfoPanelComponent: React.FC<WorldInfoPanelProps> = ({
  history,
  outline,
  worldSetting,
  themeFont,
  worldInfo,
  unlockMode,
}) => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  const resolvedWorldSetting = worldInfo?.worldSetting || worldSetting;
  const resolvedMainGoal = worldInfo?.mainGoal || outline?.mainGoal;
  const resolvedHistory =
    resolvedWorldSetting?.history || history || worldInfo?.premise || undefined;

  const isWorldSettingUnlocked = Boolean(
    unlockMode || worldInfo?.worldSettingUnlocked,
  );
  const isMainGoalUnlocked = Boolean(unlockMode || worldInfo?.mainGoalUnlocked);

  return (
    <div>
      <SidebarPanelHeader
        title={t("worldInfo.title") || "World Info"}
        icon={
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
        }
        isOpen={expanded}
        onToggle={() => setExpanded(!expanded)}
        themeFont={themeFont}
        openMarginClassName="mb-4"
      />

      {expanded ? (
        <div className="space-y-3 animate-sidebar-expand">
          <SidebarSection title={t("visible") || "Visible"} withDivider={false}>
            {worldInfo?.title ? (
              <SidebarField label={t("title") || "Title"}>
                {worldInfo.title}
              </SidebarField>
            ) : null}

            {worldInfo?.premise ? (
              <SidebarField label={t("worldInfo.premise") || "Premise"}>
                <MarkdownText content={worldInfo.premise} indentSize={2} />
              </SidebarField>
            ) : null}

            {worldInfo?.narrativeScale ? (
              <SidebarField label={t("worldInfo.narrativeScale") || "Scale"}>
                {worldInfo.narrativeScale}
              </SidebarField>
            ) : null}

            {resolvedHistory ? (
              <SidebarField label={t("worldInfo.history") || "History"}>
                <MarkdownText content={resolvedHistory} indentSize={2} />
              </SidebarField>
            ) : null}

            {resolvedWorldSetting?.visible?.description ? (
              <SidebarField label={t("worldInfo.setting") || "Setting"}>
                <MarkdownText
                  content={resolvedWorldSetting.visible.description}
                  indentSize={2}
                />
              </SidebarField>
            ) : null}

            {resolvedWorldSetting?.visible?.rules ? (
              <SidebarField label={t("rules.short") || "Rules"}>
                <MarkdownText
                  content={resolvedWorldSetting.visible.rules}
                  indentSize={2}
                />
              </SidebarField>
            ) : null}

            {resolvedMainGoal?.visible?.description ? (
              <SidebarField label={t("worldInfo.goal") || "Goal"}>
                <MarkdownText
                  content={resolvedMainGoal.visible.description}
                  indentSize={2}
                />
              </SidebarField>
            ) : null}

            {resolvedMainGoal?.visible?.conditions ? (
              <SidebarField label={t("worldInfo.conditions") || "Conditions"}>
                <MarkdownText
                  content={resolvedMainGoal.visible.conditions}
                  indentSize={2}
                />
              </SidebarField>
            ) : null}
          </SidebarSection>

          {isWorldSettingUnlocked || isMainGoalUnlocked ? (
            <SidebarSection
              title={t("hidden.truth") || "Hidden"}
              className="sidebar-hidden-divider"
            >
              {isWorldSettingUnlocked &&
              resolvedWorldSetting?.hidden?.hiddenRules ? (
                <SidebarField
                  label={t("worldInfo.hiddenRules") || "Hidden Rules"}
                >
                  <MarkdownText
                    content={resolvedWorldSetting.hidden.hiddenRules}
                    indentSize={2}
                  />
                </SidebarField>
              ) : null}

              {isWorldSettingUnlocked &&
              resolvedWorldSetting?.hidden?.secrets?.length ? (
                <SidebarField label={t("hidden.secrets") || "Secrets"}>
                  <ul className="list-disc list-inside space-y-1">
                    {resolvedWorldSetting.hidden.secrets.map((secret, idx) => (
                      <li key={`${secret}-${idx}`}>
                        <MarkdownText content={secret} indentSize={2} inline />
                      </li>
                    ))}
                  </ul>
                </SidebarField>
              ) : null}

              {isMainGoalUnlocked &&
              resolvedMainGoal?.hidden?.trueDescription ? (
                <SidebarField
                  label={t("worldInfo.secretObjective") || "Secret Objective"}
                >
                  <MarkdownText
                    content={resolvedMainGoal.hidden.trueDescription}
                    indentSize={2}
                  />
                </SidebarField>
              ) : null}

              {isMainGoalUnlocked &&
              resolvedMainGoal?.hidden?.trueConditions ? (
                <SidebarField label={t("worldInfo.conditions") || "Conditions"}>
                  <MarkdownText
                    content={resolvedMainGoal.hidden.trueConditions}
                    indentSize={2}
                  />
                </SidebarField>
              ) : null}
            </SidebarSection>
          ) : null}

          <SidebarSection title={t("meta") || "Meta"}>
            {worldInfo?.worldSettingUnlockReason ? (
              <SidebarField
                label={
                  t("worldInfo.worldSettingUnlockReason") || "Setting Unlock"
                }
              >
                <MarkdownText
                  content={worldInfo.worldSettingUnlockReason}
                  indentSize={2}
                />
              </SidebarField>
            ) : null}
            {worldInfo?.mainGoalUnlockReason ? (
              <SidebarField
                label={t("worldInfo.mainGoalUnlockReason") || "Goal Unlock"}
              >
                <MarkdownText
                  content={worldInfo.mainGoalUnlockReason}
                  indentSize={2}
                />
              </SidebarField>
            ) : null}
          </SidebarSection>
        </div>
      ) : null}
    </div>
  );
};

export const WorldInfoPanel = React.memo(WorldInfoPanelComponent);
