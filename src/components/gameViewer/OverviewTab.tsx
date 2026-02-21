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
import {
  Section,
  InfoRow,
  SubsectionLabel,
  EmptyState,
  EntityBlock,
} from "./helpers";

interface OverviewTabProps {
  gameState: GameState;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  t: TFunction;
  mode?: "all" | "story" | "character" | "quests" | "atmosphere";
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  gameState,
  expandedSections,
  toggleSection,
  t,
  mode = "all",
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
  const showStory = mode === "all" || mode === "story";
  const showCharacter = mode === "all" || mode === "character";
  const showQuests = mode === "all" || mode === "quests";
  const showAtmosphere = mode === "all" || mode === "atmosphere";

  return (
    <div className="space-y-4">
      {/* Story Title & Premise */}
      {showStory ? (
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
            <div className="mt-2 pt-2 border-t border-theme-divider/60">
              <SubsectionLabel>{t("token.tokens")}</SubsectionLabel>
              <InfoRow
                label={t("token.totalTokens")}
                value={gameState.tokenUsage.totalTokens.toLocaleString()}
              />
              <InfoRow
                label={t("token.promptTokens")}
                value={gameState.tokenUsage.promptTokens.toLocaleString()}
              />
              <InfoRow
                label={t("token.completionTokens")}
                value={gameState.tokenUsage.completionTokens.toLocaleString()}
              />
              {gameState.tokenUsage.cacheWrite !== undefined ? (
                <InfoRow
                  label={t("token.cacheWrite")}
                  value={gameState.tokenUsage.cacheWrite.toLocaleString()}
                />
              ) : null}
              {gameState.tokenUsage.cacheRead !== undefined ? (
                <InfoRow
                  label={t("token.cacheRead")}
                  value={gameState.tokenUsage.cacheRead.toLocaleString()}
                />
              ) : null}
            </div>
          )}
        </Section>
      ) : null}

      {/* Character Quick View */}
      {showCharacter ? (
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
          <InfoRow
            label={t("gameViewer.age")}
            value={char.age || t("unknown")}
          />
          {char.profession && (
            <InfoRow
              label={t("gameViewer.profession")}
              value={char.profession}
            />
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
            <div className="mt-2 pt-2 border-t border-theme-divider/60">
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
      ) : null}

      {/* Active Quests */}
      {showQuests ? (
        <Section
          id="activeQuests"
          title={t("gameViewer.activeQuests")}
          icon="📜"
          isExpanded={expandedSections.has("activeQuests")}
          onToggle={toggleSection}
        >
          {gameState.quests.filter((q) => q.status === "active").length ===
          0 ? (
            <EmptyState message={t("gameViewer.noActiveQuests")} />
          ) : (
            <div className="space-y-3">
              {gameState.quests
                .filter((q) => q.status === "active")
                .map((quest, idx) => (
                  <EntityBlock key={quest.id || idx}>
                    <div className="font-semibold text-theme-text text-xs flex items-center gap-2">
                      <span>{getValidIcon(quest.icon, "📜")}</span>
                      {quest.title}
                    </div>
                    <InfoRow
                      label={t("description") || "Description"}
                      value={
                        <MarkdownText content={quest.visible.description} />
                      }
                    />
                  </EntityBlock>
                ))}
            </div>
          )}
        </Section>
      ) : null}

      {/* Atmosphere */}
      {showAtmosphere ? (
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
      ) : null}
    </div>
  );
};
