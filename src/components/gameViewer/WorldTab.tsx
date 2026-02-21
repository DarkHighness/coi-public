/**
 * WorldTab - World information display
 * Shows world setting, locations, and factions
 */

import React from "react";
import type { TFunction } from "i18next";
import { GameState } from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import {
  isSameEntityRef,
  resolveEntityDisplayName,
} from "../../utils/entityDisplay";
import {
  Section,
  InfoRow,
  SubsectionLabel,
  EmptyState,
  HiddenContent,
} from "./helpers";

interface WorldTabProps {
  gameState: GameState;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  t: TFunction;
  mode?: "all" | "world" | "locations" | "factions";
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

export const WorldTab: React.FC<WorldTabProps> = ({
  gameState,
  expandedSections,
  toggleSection,
  t,
  mode = "all",
}) => {
  const worldInfo = gameState.worldInfo;
  const showWorld = mode === "all" || mode === "world";
  const showLocations = mode === "all" || mode === "locations";
  const showFactions = mode === "all" || mode === "factions";

  return (
    <div className="space-y-4">
      {/* World Setting */}
      {showWorld ? (
        <Section
          id="worldSetting"
          title={t("gameViewer.worldSetting")}
          icon="🌍"
          isExpanded={expandedSections.has("worldSetting")}
          onToggle={toggleSection}
        >
          {worldInfo?.worldSetting ? (
            <>
              <InfoRow
                label={t("description") || "Description"}
                value={
                  <MarkdownText
                    content={worldInfo.worldSetting.visible?.description || ""}
                  />
                }
              />
              {worldInfo.worldSetting.visible?.rules ? (
                <InfoRow
                  label={t("gameViewer.rules") || "Rules"}
                  value={
                    <MarkdownText
                      content={worldInfo.worldSetting.visible.rules}
                    />
                  }
                />
              ) : null}
              {(worldInfo.worldSettingUnlocked || gameState.unlockMode) &&
                worldInfo.worldSetting.hidden && (
                  <HiddenContent
                    t={t}
                    content={
                      <>
                        {worldInfo.worldSettingUnlockReason ? (
                          <InfoRow
                            label={t("gameViewer.unlockReason", {
                              defaultValue: "Unlock Reason",
                            })}
                            value={worldInfo.worldSettingUnlockReason}
                          />
                        ) : null}
                        {worldInfo.worldSetting.hidden.hiddenRules ? (
                          <InfoRow
                            label={
                              t("gameViewer.hiddenRules") || "Hidden Rules"
                            }
                            value={
                              <MarkdownText
                                content={
                                  worldInfo.worldSetting.hidden.hiddenRules
                                }
                              />
                            }
                          />
                        ) : null}
                        {Array.isArray(worldInfo.worldSetting.hidden.secrets) &&
                        worldInfo.worldSetting.hidden.secrets.length > 0 ? (
                          <InfoRow
                            label={t("gameViewer.secrets")}
                            value={renderMarkdownList(
                              worldInfo.worldSetting.hidden.secrets,
                            )}
                          />
                        ) : null}
                      </>
                    }
                  />
                )}
              {(worldInfo.worldSettingUnlocked || gameState.unlockMode) &&
              worldInfo.worldSetting.history ? (
                <InfoRow
                  label={t("gameViewer.worldHistory")}
                  value={
                    <MarkdownText content={worldInfo.worldSetting.history} />
                  }
                />
              ) : null}
            </>
          ) : (
            <EmptyState message={t("gameViewer.noWorldInfo")} />
          )}
        </Section>
      ) : null}

      {/* Locations */}
      {showLocations ? (
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
              {gameState.locations.map((loc, idx) => {
                const isCurrentLocation =
                  isSameEntityRef(loc.id, gameState.currentLocation) ||
                  loc.name === gameState.currentLocation;
                return (
                  <div
                    key={loc.id || idx}
                    className={`py-2.5 pl-2 pr-1 border-l border-b ${
                      isCurrentLocation
                        ? "bg-theme-primary/10 border-theme-primary/50"
                        : "border-theme-divider/70"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-theme-primary text-xs flex items-center gap-2">
                        <span>{getValidIcon(loc.icon, "📍")}</span>
                        {loc.name}
                      </span>
                      {isCurrentLocation && (
                        <span className="text-xs px-2 py-0.5 font-semibold text-theme-primary border border-theme-primary/45 font-bold uppercase tracking-[0.08em]">
                          {t("gameViewer.currentLabel")}
                        </span>
                      )}
                      {loc.isVisited && (
                        <span className="text-xs text-theme-text-secondary border border-theme-divider/70 px-2 py-0.5">
                          ✓ {t("gameViewer.visited")}
                        </span>
                      )}
                    </div>
                    <div className="text-theme-text text-xs pl-2">
                      <InfoRow
                        label={t("description") || "Description"}
                        value={
                          <MarkdownText content={loc.visible.description} />
                        }
                      />
                    </div>
                    {/* Visible Details */}
                    <div className="mt-2 space-y-2 text-xs">
                      {/* Textual descriptions */}
                      {loc.visible?.environment ? (
                        <InfoRow
                          label={t("gameViewer.environment") || "Environment"}
                          value={loc.visible.environment}
                        />
                      ) : null}
                      {loc.visible?.ambience ? (
                        <InfoRow
                          label={t("gameViewer.ambience") || "Ambience"}
                          value={loc.visible.ambience}
                        />
                      ) : null}
                      {loc.visible?.weather ? (
                        <InfoRow
                          label={t("gameViewer.weather") || "Weather"}
                          value={loc.visible.weather}
                        />
                      ) : null}
                      {/* Atmosphere */}
                      {loc.visible?.atmosphere && (
                        <div className="mt-2">
                          <SubsectionLabel>
                            {t("gameViewer.atmosphere") || "Atmosphere"}
                          </SubsectionLabel>
                          <div className="pl-2 space-y-1">
                            {loc.visible.atmosphere.weather && (
                              <InfoRow
                                label={t("gameViewer.weather") || "Weather"}
                                value={t(
                                  `weatherNames.${loc.visible.atmosphere.weather}`,
                                  {
                                    defaultValue:
                                      loc.visible.atmosphere.weather,
                                  },
                                )}
                              />
                            )}
                            {loc.visible.atmosphere.envTheme && (
                              <InfoRow
                                label={t("gameViewer.environmentTheme", {
                                  defaultValue: "Environment Theme",
                                })}
                                value={t(
                                  `envThemeNames.${loc.visible.atmosphere.envTheme}`,
                                  {
                                    defaultValue:
                                      loc.visible.atmosphere.envTheme,
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
                                    defaultValue:
                                      loc.visible.atmosphere.ambience,
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
                          <SubsectionLabel>
                            {t("gameViewer.sensory") || "Sensory Details"}
                          </SubsectionLabel>
                          <div className="pl-2 space-y-1">
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
                                label={
                                  t("gameViewer.temperature") || "Temperature"
                                }
                                value={loc.visible.sensory.temperature}
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Interactables */}
                      {loc.visible?.interactables &&
                        loc.visible.interactables.length > 0 && (
                          <InfoRow
                            label={
                              t("gameViewer.interactables") || "Interactables"
                            }
                            value={renderMarkdownList(
                              loc.visible.interactables,
                            )}
                          />
                        )}

                      {loc.visible.knownFeatures &&
                        loc.visible.knownFeatures.length > 0 && (
                          <InfoRow
                            label={
                              t("gameViewer.knownFeatures") || "Known Features"
                            }
                            value={renderMarkdownList(
                              loc.visible.knownFeatures,
                            )}
                          />
                        )}
                      {loc.visible.resources &&
                        loc.visible.resources.length > 0 && (
                          <InfoRow
                            label={t("gameViewer.resources") || "Resources"}
                            value={renderMarkdownList(loc.visible.resources)}
                          />
                        )}
                      {loc.lore && (
                        <InfoRow
                          label={t("gameViewer.lore") || "Lore"}
                          value={<MarkdownText content={loc.lore} />}
                        />
                      )}
                      {typeof loc.discoveredAt === "number" &&
                        Number.isFinite(loc.discoveredAt) && (
                          <InfoRow
                            label={t("gameViewer.discoveredAt", {
                              defaultValue: "Discovered",
                            })}
                            value={new Date(loc.discoveredAt).toLocaleString()}
                          />
                        )}
                    </div>
                    {(loc.unlocked || gameState.unlockMode) && loc.hidden && (
                      <HiddenContent
                        t={t}
                        content={
                          <>
                            {loc.unlockReason ? (
                              <InfoRow
                                label={t("gameViewer.unlockReason", {
                                  defaultValue: "Unlock Reason",
                                })}
                                value={loc.unlockReason}
                              />
                            ) : null}
                            {loc.hidden.fullDescription ? (
                              <InfoRow
                                label={t("gameViewer.fullDescription", {
                                  defaultValue: "Full Description",
                                })}
                                value={
                                  <MarkdownText
                                    content={loc.hidden.fullDescription}
                                  />
                                }
                              />
                            ) : null}
                            {Array.isArray(loc.hidden.dangers) &&
                            loc.hidden.dangers.length > 0 ? (
                              <InfoRow
                                label={t("gameViewer.dangers") || "Dangers"}
                                value={renderMarkdownList(loc.hidden.dangers)}
                              />
                            ) : null}
                            {Array.isArray(loc.hidden.hiddenFeatures) &&
                            loc.hidden.hiddenFeatures.length > 0 ? (
                              <InfoRow
                                label={t("gameViewer.hiddenFeatures")}
                                value={renderMarkdownList(
                                  loc.hidden.hiddenFeatures,
                                )}
                              />
                            ) : null}
                            {Array.isArray(loc.hidden.secrets) &&
                            loc.hidden.secrets.length > 0 ? (
                              <InfoRow
                                label={t("gameViewer.secrets")}
                                value={renderMarkdownList(loc.hidden.secrets)}
                              />
                            ) : null}
                          </>
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      ) : null}

      {/* Factions */}
      {showFactions ? (
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
                  className="py-2.5 pl-2 pr-1 border-l border-b border-theme-divider/70"
                >
                  <div className="font-bold text-theme-primary text-xs flex items-center gap-2 mb-2">
                    <span>{getValidIcon(faction.icon, "⚔️")}</span>
                    {faction.name}
                  </div>
                  <InfoRow
                    label={t("gameViewer.agenda", { defaultValue: "Agenda" })}
                    value={<MarkdownText content={faction.visible.agenda} />}
                  />
                  {faction.visible.influence ? (
                    <InfoRow
                      label={t("gameViewer.influence")}
                      value={faction.visible.influence}
                    />
                  ) : null}
                  {Array.isArray(faction.visible.members) &&
                    faction.visible.members.length > 0 && (
                      <InfoRow
                        label={t("gameViewer.members", {
                          defaultValue: "Members",
                        })}
                        value={renderMarkdownList(
                          faction.visible.members.map(
                            (member) =>
                              `${member.name}${member.title ? ` (${member.title})` : ""}`,
                          ),
                        )}
                      />
                    )}
                  {Array.isArray(faction.visible.relations) &&
                    faction.visible.relations.length > 0 && (
                      <InfoRow
                        label={t("gameViewer.relations", {
                          defaultValue: "Relations",
                        })}
                        value={renderMarkdownList(
                          faction.visible.relations.map(
                            (relation) =>
                              `${resolveEntityDisplayName(relation.target, gameState)}: ${relation.status}`,
                          ),
                        )}
                      />
                    )}
                  {(faction.unlocked || gameState.unlockMode) &&
                    faction.hidden && (
                      <HiddenContent
                        t={t}
                        content={
                          <>
                            {faction.unlockReason ? (
                              <InfoRow
                                label={t("gameViewer.unlockReason", {
                                  defaultValue: "Unlock Reason",
                                })}
                                value={faction.unlockReason}
                              />
                            ) : null}
                            {faction.hidden.agenda ? (
                              <InfoRow
                                label={t("gameViewer.secretAgenda")}
                                value={
                                  <MarkdownText
                                    content={faction.hidden.agenda}
                                  />
                                }
                              />
                            ) : null}
                            {faction.hidden.influence ? (
                              <InfoRow
                                label={t("gameViewer.trueInfluence")}
                                value={
                                  <MarkdownText
                                    content={faction.hidden.influence}
                                  />
                                }
                              />
                            ) : null}
                            {faction.hidden.internalConflict ? (
                              <InfoRow
                                label={
                                  t("gameViewer.internalConflict") ||
                                  "Internal Conflict"
                                }
                                value={
                                  <MarkdownText
                                    content={faction.hidden.internalConflict}
                                  />
                                }
                              />
                            ) : null}
                            {Array.isArray(faction.hidden.members) &&
                            faction.hidden.members.length > 0 ? (
                              <InfoRow
                                label={t("gameViewer.hiddenMembers", {
                                  defaultValue: "Hidden Members",
                                })}
                                value={renderMarkdownList(
                                  faction.hidden.members.map(
                                    (member) =>
                                      `${member.name}${member.title ? ` (${member.title})` : ""}`,
                                  ),
                                )}
                              />
                            ) : null}
                            {Array.isArray(faction.hidden.relations) &&
                            faction.hidden.relations.length > 0 ? (
                              <InfoRow
                                label={t("gameViewer.hiddenRelations", {
                                  defaultValue: "Hidden Relations",
                                })}
                                value={renderMarkdownList(
                                  faction.hidden.relations.map(
                                    (relation) =>
                                      `${resolveEntityDisplayName(relation.target, gameState)}: ${relation.status}`,
                                  ),
                                )}
                              />
                            ) : null}
                          </>
                        }
                      />
                    )}
                </div>
              ))}
            </div>
          )}
        </Section>
      ) : null}
    </div>
  );
};
