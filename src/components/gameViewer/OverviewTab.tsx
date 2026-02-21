/**
 * OverviewTab - Story overview and quick status
 * Displays story basics, character summary, active quests, and atmosphere
 */

import React from "react";
import type { TFunction } from "i18next";
import { GameState } from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { resolveLocationDisplayName } from "../../utils/entityDisplay";
import { Section, InfoRow, SubsectionLabel, EmptyState } from "./helpers";

interface OverviewTabProps {
  gameState: GameState;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  t: TFunction;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  gameState,
  expandedSections,
  toggleSection,
  t,
}) => {
  const outline = gameState.outline;
  const char = gameState.character;
  const playerProfile = gameState.actors.find(
    (bundle) => bundle.profile.id === gameState.playerActorId,
  )?.profile;
  const hiddenRace = playerProfile?.hidden?.race;
  const hiddenGender = playerProfile?.hidden?.gender;
  const showHiddenIdentity = Boolean(
    (gameState.unlockMode || playerProfile?.unlocked) &&
    (hiddenRace || hiddenGender),
  );
  const currentLocationDisplay = resolveLocationDisplayName(
    gameState.currentLocation,
    gameState,
  );

  return (
    <div className="space-y-4">
      {/* Story Title & Premise */}
      <Section
        id="basics"
        title={t("gameViewer.storyBasics")}
        icon="📖"
        isExpanded={expandedSections.has("basics")}
        onToggle={toggleSection}
      >
        <InfoRow
          label={t("gameViewer.title")}
          value={outline?.title || gameState.theme}
        />
        <InfoRow label={t("gameViewer.turn")} value={gameState.turnNumber} />
        <InfoRow label={t("gameViewer.time")} value={gameState.time} />
        <InfoRow
          label={t("gameViewer.currentLocation")}
          value={currentLocationDisplay}
        />
        {outline?.premise && (
          <InfoRow label={t("gameViewer.premise")} value={outline.premise} />
        )}
        {gameState.tokenUsage && (
          <div className="mt-3 pt-3 border-t border-theme-border/30">
            <SubsectionLabel>{t("token.tokens")}</SubsectionLabel>
            <div className="text-xs font-mono text-theme-text/80 grid grid-cols-2 gap-3 bg-theme-bg p-3 rounded-none border border-theme-border/30">
              <div>
                {t("token.totalTokens")}:{" "}
                {gameState.tokenUsage.totalTokens.toLocaleString()}
              </div>
              <div>
                {t("token.promptTokens")}:{" "}
                {gameState.tokenUsage.promptTokens.toLocaleString()}
              </div>
              <div>
                {t("token.completionTokens")}:{" "}
                {gameState.tokenUsage.completionTokens.toLocaleString()}
              </div>
              {gameState.tokenUsage.cacheWrite !== undefined && (
                <div className="text-theme-success/80">
                  {t("token.cacheWrite")}:{" "}
                  {gameState.tokenUsage.cacheWrite.toLocaleString()}
                </div>
              )}
              {gameState.tokenUsage.cacheRead !== undefined && (
                <div className="text-theme-success/80">
                  {t("token.cacheRead")}:{" "}
                  {gameState.tokenUsage.cacheRead.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* Character Quick View */}
      <Section
        id="charQuick"
        title={t("gameViewer.protagonist")}
        icon="👤"
        isExpanded={expandedSections.has("charQuick")}
        onToggle={toggleSection}
      >
        <InfoRow label={t("gameViewer.name")} value={char.name} />
        <InfoRow label={t("gameViewer.titleLabel")} value={char.title} />
        <InfoRow label={t("gameViewer.status")} value={char.status} />
        <InfoRow label={t("gameViewer.age")} value={char.age || t("unknown")} />
        {char.profession && (
          <InfoRow label={t("gameViewer.profession")} value={char.profession} />
        )}
        <InfoRow
          label={t("gameViewer.race")}
          value={char.race || t("unknown")}
        />
        <InfoRow
          label={t("gameViewer.gender")}
          value={char.gender || t("unknown")}
        />
        {showHiddenIdentity && (
          <div className="mt-3 pt-2 border-t border-theme-border/30">
            <SubsectionLabel>{t("gameViewer.hiddenLabel")}:</SubsectionLabel>
            {hiddenRace && (
              <InfoRow label={t("gameViewer.race")} value={hiddenRace} />
            )}
            {hiddenGender && (
              <InfoRow label={t("gameViewer.gender")} value={hiddenGender} />
            )}
          </div>
        )}
      </Section>

      {/* Active Quests */}
      <Section
        id="activeQuests"
        title={t("gameViewer.activeQuests")}
        icon="📜"
        isExpanded={expandedSections.has("activeQuests")}
        onToggle={toggleSection}
      >
        {gameState.quests.filter((q) => q.status === "active").length === 0 ? (
          <EmptyState message={t("gameViewer.noActiveQuests")} />
        ) : (
          <div className="space-y-3">
            {gameState.quests
              .filter((q) => q.status === "active")
              .map((quest, idx) => (
                <div
                  key={quest.id || idx}
                  className="p-3 bg-theme-bg rounded-none border border-theme-border/40"
                >
                  <div className="font-bold text-theme-primary text-sm flex items-center gap-2 mb-1">
                    <span>{getValidIcon(quest.icon, "📜")}</span>
                    {quest.title}
                  </div>
                  <div className="story-text text-theme-text/90 text-sm pl-6 border-l-2 border-theme-border/50 ml-1 leading-relaxed">
                    <MarkdownText content={quest.visible.description} />
                  </div>
                </div>
              ))}
          </div>
        )}
      </Section>

      {/* Atmosphere */}
      <Section
        id="atmosphere"
        title={t("gameViewer.atmosphere")}
        icon="🌤️"
        isExpanded={expandedSections.has("atmosphere")}
        onToggle={toggleSection}
      >
        <InfoRow
          label={t("gameViewer.environment")}
          value={t(`envThemeNames.${gameState.atmosphere.envTheme}`, {
            defaultValue: gameState.atmosphere.envTheme,
          })}
        />
        {gameState.atmosphere.ambience && (
          <InfoRow
            label={t("gameViewer.ambience")}
            value={t(`ambienceNames.${gameState.atmosphere.ambience}`, {
              defaultValue: gameState.atmosphere.ambience,
            })}
          />
        )}
        {gameState.atmosphere.weather && (
          <InfoRow
            label={t("gameViewer.weather")}
            value={t(`weatherNames.${gameState.atmosphere.weather}`, {
              defaultValue: gameState.atmosphere.weather,
            })}
          />
        )}
      </Section>
    </div>
  );
};
