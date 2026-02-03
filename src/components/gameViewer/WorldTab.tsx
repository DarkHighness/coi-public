/**
 * WorldTab - World information display
 * Shows world setting, locations, and factions
 */

import React from "react";
import { GameState } from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import {
  Section,
  InfoRow,
  SubsectionLabel,
  ContentBlock,
  EmptyState,
  HiddenContent,
} from "./helpers";

interface WorldTabProps {
  gameState: GameState;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  t: (key: string, options?: any) => string;
}

export const WorldTab: React.FC<WorldTabProps> = ({
  gameState,
  expandedSections,
  toggleSection,
  t,
}) => {
  const outline = gameState.outline;

  return (
    <div className="space-y-4">
      {/* World Setting */}
      <Section
        id="worldSetting"
        title={t("gameViewer.worldSetting")}
        icon="🌍"
        isExpanded={expandedSections.has("worldSetting")}
        onToggle={toggleSection}
      >
        {outline?.worldSetting ? (
          <>
            <div className="story-text text-theme-text text-sm leading-relaxed">
              <MarkdownText
                content={outline.worldSetting.visible?.description || ""}
              />
              {outline.worldSetting.visible?.rules && (
                <div className="mt-3 pt-2 border-t border-theme-border/30">
                  <span className="text-xs uppercase tracking-wider text-theme-primary font-bold block mb-1">
                    {t("gameViewer.rules") || "Rules"}
                  </span>
                  <MarkdownText content={outline.worldSetting.visible.rules} />
                </div>
              )}
            </div>
            {(gameState.outline?.worldSettingUnlocked ||
              gameState.unlockMode) &&
              outline.worldSetting.hidden && (
                <HiddenContent
                  t={t}
                  content={
                    <div className="space-y-2">
                      {outline.worldSetting.hidden.hiddenRules && (
                        <div>
                          <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                            {t("gameViewer.hiddenRules") || "Hidden Rules"}:
                          </span>
                          <MarkdownText
                            content={outline.worldSetting.hidden.hiddenRules}
                          />
                        </div>
                      )}
                      {outline.worldSetting.hidden.secrets &&
                        outline.worldSetting.hidden.secrets.length > 0 && (
                          <div>
                            <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                              {t("gameViewer.secrets")}:
                            </span>
                            <ul className="list-disc list-inside space-y-1 pl-2">
                              {outline.worldSetting.hidden.secrets.map(
                                (secret, idx) => (
                                  <li key={idx}>
                                    <MarkdownText content={secret} inline />
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}
                    </div>
                  }
                />
              )}
            {(gameState.outline?.worldSettingUnlocked ||
              gameState.unlockMode) &&
              outline.worldSetting.history && (
                <div className="mt-4 pt-3 border-t border-theme-border/30">
                  <SubsectionLabel>
                    {t("gameViewer.worldHistory")}:
                  </SubsectionLabel>
                  <ContentBlock>
                    <MarkdownText content={outline.worldSetting.history} />
                  </ContentBlock>
                </div>
              )}
          </>
        ) : (
          <EmptyState message={t("gameViewer.noWorldInfo")} />
        )}
      </Section>

      {/* Locations */}
      <Section
        id="locations"
        title={t("gameViewer.locations")}
        icon="📍"
        isExpanded={expandedSections.has("locations")}
        onToggle={toggleSection}
      >
        {gameState.locations.length === 0 ? (
          <EmptyState message={t("gameViewer.noLocations")} />
        ) : (
          <div className="space-y-3">
            {gameState.locations.map((loc, idx) => (
              <div
                key={loc.id || idx}
                className={`p-4 rounded-none border ${
                  loc.id === gameState.currentLocation
                    ? "bg-theme-primary/10 border-theme-primary/50"
                    : "bg-theme-bg border-theme-border/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-theme-primary text-base flex items-center gap-2">
                    <span>{getValidIcon(loc.icon, "📍")}</span>
                    {loc.name}
                  </span>
                  {loc.id === gameState.currentLocation && (
                    <span className="text-xs px-2 py-0.5 bg-theme-primary/20 text-theme-primary rounded font-bold uppercase tracking-wider">
                      {t("gameViewer.currentLabel")}
                    </span>
                  )}
                  {loc.isVisited && (
                    <span className="text-xs text-theme-muted bg-theme-surface px-2 py-0.5 rounded border border-theme-border/50">
                      ✓ {t("gameViewer.visited")}
                    </span>
                  )}
                </div>
                <div className="text-theme-text/90 text-sm pl-2 border-l-2 border-theme-border/50">
                  <MarkdownText content={loc.visible.description} />
                </div>
                {/* Visible Details */}
                <div className="mt-2 space-y-2 text-sm">
                  {/* Textual descriptions */}
                  {loc.visible?.environment && (
                    <div className="text-xs">
                      <span className="uppercase tracking-wider text-theme-primary/80">
                        {t("gameViewer.environment") || "Environment"}:
                      </span>{" "}
                      <span className="text-theme-text/90">
                        {loc.visible.environment}
                      </span>
                    </div>
                  )}
                  {loc.visible?.ambience && (
                    <div className="text-xs">
                      <span className="uppercase tracking-wider text-theme-primary/80">
                        {t("gameViewer.ambience") || "Ambience"}:
                      </span>{" "}
                      <span className="text-theme-text/90">
                        {loc.visible.ambience}
                      </span>
                    </div>
                  )}
                  {loc.visible?.weather && (
                    <div className="text-xs">
                      <span className="uppercase tracking-wider text-theme-primary/80">
                        {t("gameViewer.weather") || "Weather"}:
                      </span>{" "}
                      <span className="text-theme-text/90">
                        {loc.visible.weather}
                      </span>
                    </div>
                  )}
                  {/* Atmosphere */}
                  {loc.visible?.atmosphere && (
                    <div className="mt-2">
                      <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                        {t("gameViewer.atmosphere") || "Atmosphere"}
                      </span>
                      <div className="pl-2 border-l-2 border-theme-border/30 space-y-1">
                        {loc.visible.atmosphere.weather && (
                          <InfoRow
                            label={t("gameViewer.weather") || "Weather"}
                            value={t(
                              `weatherNames.${loc.visible.atmosphere.weather}`,
                              {
                                defaultValue: loc.visible.atmosphere.weather,
                              },
                            )}
                          />
                        )}
                        {loc.visible.atmosphere.ambience && (
                          <InfoRow
                            label={t("gameViewer.ambience") || "Ambience"}
                            value={t(
                              `ambienceNames.${loc.visible.atmosphere.ambience}`,
                              {
                                defaultValue: loc.visible.atmosphere.ambience,
                              },
                            )}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sensory Details */}
                  {loc.visible?.sensory && (
                    <div className="mt-2">
                      <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                        {t("gameViewer.sensory") || "Sensory Details"}
                      </span>
                      <div className="pl-2 border-l-2 border-theme-border/30 space-y-1">
                        {loc.visible.sensory.smell && (
                          <InfoRow
                            label={t("gameViewer.smell") || "Smell"}
                            value={loc.visible.sensory.smell}
                          />
                        )}
                        {loc.visible.sensory.sound && (
                          <InfoRow
                            label={t("gameViewer.sound") || "Sound"}
                            value={loc.visible.sensory.sound}
                          />
                        )}
                        {loc.visible.sensory.lighting && (
                          <InfoRow
                            label={t("gameViewer.lighting") || "Lighting"}
                            value={loc.visible.sensory.lighting}
                          />
                        )}
                        {loc.visible.sensory.temperature && (
                          <InfoRow
                            label={t("gameViewer.temperature") || "Temperature"}
                            value={loc.visible.sensory.temperature}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Interactables */}
                  {loc.visible?.interactables &&
                    loc.visible.interactables.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                          {t("gameViewer.interactables") || "Interactables"}
                        </span>
                        <div className="pl-2 text-theme-muted text-sm">
                          <ul className="list-disc list-inside">
                            {loc.visible.interactables.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                  {loc.visible.knownFeatures &&
                    loc.visible.knownFeatures.length > 0 && (
                      <div className="text-xs">
                        <span className="uppercase tracking-wider text-theme-primary/80 block mb-1">
                          {t("gameViewer.knownFeatures") || "Known Features"}:
                        </span>
                        <ul className="list-disc list-inside pl-2 text-theme-muted">
                          {loc.visible.knownFeatures.map((feature, i) => (
                            <li key={i}>{feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  {loc.visible.resources &&
                    loc.visible.resources.length > 0 && (
                      <div className="text-xs">
                        <span className="uppercase tracking-wider text-theme-primary/80 block mb-1">
                          {t("gameViewer.resources") || "Resources"}:
                        </span>
                        <ul className="list-disc list-inside pl-2 text-theme-muted">
                          {loc.visible.resources.map((resource, i) => (
                            <li key={i}>{resource}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  {loc.lore && (
                    <div className="text-xs border-t border-theme-border/30 pt-2">
                      <span className="uppercase tracking-wider text-theme-primary/80 block mb-1">
                        {t("gameViewer.lore") || "Lore"}:
                      </span>
                      <div className="text-theme-muted italic pl-1">
                        <MarkdownText content={loc.lore} />
                      </div>
                    </div>
                  )}
                </div>
                {(loc.unlocked || gameState.unlockMode) && loc.hidden && (
                  <HiddenContent
                    t={t}
                    content={
                      <div className="space-y-2">
                        {loc.hidden.fullDescription && (
                          <MarkdownText content={loc.hidden.fullDescription} />
                        )}
                        {loc.hidden.dangers &&
                          loc.hidden.dangers.length > 0 && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.dangers") || "Dangers"}:
                              </span>
                              <ul className="list-disc list-inside pl-2">
                                {loc.hidden.dangers.map((danger, i) => (
                                  <li key={i}>{danger}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        {loc.hidden.hiddenFeatures &&
                          loc.hidden.hiddenFeatures.length > 0 && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.hiddenFeatures")}:
                              </span>
                              <ul className="list-disc list-inside pl-2">
                                {loc.hidden.hiddenFeatures.map((feature, i) => (
                                  <li key={i}>{feature}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        {loc.hidden.secrets &&
                          loc.hidden.secrets.length > 0 && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.secrets")}:
                              </span>
                              <ul className="list-disc list-inside pl-2">
                                {loc.hidden.secrets.map((secret, i) => (
                                  <li key={i}>
                                    <MarkdownText content={secret} inline />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    }
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Factions */}
      <Section
        id="factions"
        title={t("gameViewer.factions")}
        icon="⚔️"
        isExpanded={expandedSections.has("factions")}
        onToggle={toggleSection}
      >
        {gameState.factions.length === 0 ? (
          <EmptyState message={t("gameViewer.noFactions")} />
        ) : (
          <div className="space-y-3">
            {gameState.factions.map((faction, idx) => (
              <div
                key={faction.id || idx}
                className="p-4 bg-theme-bg rounded-none border border-theme-border/40"
              >
                <div className="font-bold text-theme-primary text-base flex items-center gap-2 mb-2">
                  <span>{getValidIcon(faction.icon, "⚔️")}</span>
                  {faction.name}
                </div>
                <div className="text-theme-text/90 text-sm pl-2 border-l-2 border-theme-border/50">
                  <MarkdownText content={faction.visible.agenda} />
                </div>
                {faction.visible.influence && (
                  <div className="text-xs text-theme-muted mt-2 pl-2">
                    <span className="font-bold uppercase tracking-wider">
                      {t("gameViewer.influence")}:
                    </span>{" "}
                    {faction.visible.influence}
                  </div>
                )}
                {(faction.unlocked || gameState.unlockMode) &&
                  faction.hidden && (
                    <HiddenContent
                      t={t}
                      content={
                        <div className="space-y-2">
                          {faction.hidden.agenda && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.secretAgenda")}:
                              </span>
                              <MarkdownText content={faction.hidden.agenda} />
                            </div>
                          )}
                          {faction.hidden.influence && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.trueInfluence")}:
                              </span>
                              <MarkdownText
                                content={faction.hidden.influence}
                              />
                            </div>
                          )}
                          {faction.hidden.internalConflict && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-amber-500/80 block mb-1">
                                ⚠️{" "}
                                {t("gameViewer.internalConflict") ||
                                  "Internal Conflict"}
                                :
                              </span>
                              <MarkdownText
                                content={faction.hidden.internalConflict}
                              />
                            </div>
                          )}
                        </div>
                      }
                    />
                  )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};
