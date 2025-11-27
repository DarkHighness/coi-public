/**
 * GameStateViewer - A user-friendly modal for viewing game state
 * Provides a readable, organized view of all game entities
 */

import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { GameState } from "../types";

interface GameStateViewerProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
}

// Tabs for different views
type ViewTab =
  | "overview"
  | "world"
  | "character"
  | "relationships"
  | "quests"
  | "lore";

interface TabConfig {
  icon: string;
  labelKey: string;
}

const TAB_CONFIGS: Record<ViewTab, TabConfig> = {
  overview: { icon: "📖", labelKey: "gameViewer.overview" },
  world: { icon: "🌍", labelKey: "gameViewer.world" },
  character: { icon: "👤", labelKey: "gameViewer.character" },
  relationships: { icon: "👥", labelKey: "gameViewer.relationships" },
  quests: { icon: "📜", labelKey: "gameViewer.quests" },
  lore: { icon: "📚", labelKey: "gameViewer.lore" },
};

export const GameStateViewer: React.FC<GameStateViewerProps> = ({
  isOpen,
  onClose,
  gameState,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ViewTab>("overview");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["basics"]),
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Helper: Collapsible Section
  const Section = ({
    id,
    title,
    icon,
    children,
  }: {
    id: string;
    title: string;
    icon: string;
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSections.has(id);
    return (
      <div className="border border-theme-border rounded-lg overflow-hidden mb-3">
        <button
          onClick={() => toggleSection(id)}
          className="w-full px-4 py-3 bg-theme-bg/50 flex items-center justify-between hover:bg-theme-surface/50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>{icon}</span>
            <span className="font-medium text-theme-text">{title}</span>
          </span>
          <span className="text-theme-muted text-lg">
            {isExpanded ? "−" : "+"}
          </span>
        </button>
        {isExpanded && (
          <div className="p-4 border-t border-theme-border bg-theme-surface/30">
            {children}
          </div>
        )}
      </div>
    );
  };

  // Helper: Hidden Content Display
  const HiddenContent = ({
    content,
    label,
  }: {
    content: React.ReactNode;
    label?: string;
  }) => (
    <div className="mt-2 p-2 bg-theme-warning/10 border border-theme-warning/30 rounded">
      <span className="text-theme-warning text-xs font-medium">
        🔓 {label || t("gameViewer.hiddenRevealed")}
      </span>
      <div className="text-theme-warning/80 text-sm mt-1">{content}</div>
    </div>
  );

  // Helper: Key-Value Row
  const InfoRow = ({
    label,
    value,
    hidden = false,
  }: {
    label: string;
    value: React.ReactNode;
    hidden?: boolean;
  }) => (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 py-1.5 border-b border-theme-border/30 last:border-0">
      <span className="text-theme-muted text-sm min-w-[120px] flex-shrink-0">
        {label}:
      </span>
      <span
        className={`text-sm ${hidden ? "text-theme-warning/80 italic" : "text-theme-text"}`}
      >
        {value || <span className="text-theme-muted italic">—</span>}
      </span>
    </div>
  );

  // Render Overview Tab
  const renderOverview = () => {
    const outline = gameState.outline;
    const char = gameState.character;
    const currentLoc = gameState.locations.find(
      (loc) => loc.id === gameState.currentLocation,
    );

    return (
      <div className="space-y-4">
        {/* Story Title & Premise */}
        <Section id="basics" title={t("gameViewer.storyBasics")} icon="📖">
          <InfoRow
            label={t("gameViewer.title")}
            value={outline?.title || gameState.theme}
          />
          <InfoRow label={t("gameViewer.turn")} value={gameState.turnNumber} />
          <InfoRow label={t("gameViewer.time")} value={gameState.time} />
          <InfoRow
            label={t("gameViewer.currentLocation")}
            value={currentLoc?.name || gameState.currentLocation}
          />
          {outline?.premise && (
            <InfoRow label={t("gameViewer.premise")} value={outline.premise} />
          )}
        </Section>

        {/* Character Quick View */}
        <Section id="charQuick" title={t("gameViewer.protagonist")} icon="👤">
          <InfoRow label={t("gameViewer.name")} value={char.name} />
          <InfoRow label={t("gameViewer.titleLabel")} value={char.title} />
          <InfoRow label={t("gameViewer.status")} value={char.status} />
          {char.profession && (
            <InfoRow
              label={t("gameViewer.profession")}
              value={char.profession}
            />
          )}
          {char.attributes.length > 0 && (
            <div className="mt-2">
              <span className="text-theme-muted text-sm block mb-2">
                {t("gameViewer.attributes")}:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {char.attributes.map((attr) => (
                  <div
                    key={attr.label}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="text-theme-muted">{attr.label}:</span>
                    <span className="text-theme-text">
                      {attr.value}/{attr.maxValue}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Active Quests */}
        <Section
          id="activeQuests"
          title={t("gameViewer.activeQuests")}
          icon="📜"
        >
          {gameState.quests.filter((q) => q.status === "active").length ===
          0 ? (
            <p className="text-theme-muted text-sm italic">
              {t("gameViewer.noActiveQuests")}
            </p>
          ) : (
            <div className="space-y-2">
              {gameState.quests
                .filter((q) => q.status === "active")
                .map((quest) => (
                  <div
                    key={quest.id}
                    className="p-2 bg-theme-bg/50 rounded border border-theme-border/50"
                  >
                    <div className="font-medium text-theme-text text-sm">
                      {quest.title}
                    </div>
                    <div className="text-theme-muted text-xs mt-1">
                      {quest.visible.description}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Section>

        {/* Atmosphere */}
        <Section id="atmosphere" title={t("gameViewer.atmosphere")} icon="🌤️">
          <InfoRow
            label={t("gameViewer.environment")}
            value={gameState.atmosphere.envTheme}
          />
          {gameState.atmosphere.ambience && (
            <InfoRow
              label={t("gameViewer.ambience")}
              value={gameState.atmosphere.ambience}
            />
          )}
        </Section>
      </div>
    );
  };

  // Render World Tab
  const renderWorld = () => {
    const outline = gameState.outline;
    return (
      <div className="space-y-4">
        {/* World Setting */}
        <Section
          id="worldSetting"
          title={t("gameViewer.worldSetting")}
          icon="🌍"
        >
          {outline?.worldSetting ? (
            <>
              <div className="prose prose-sm prose-invert max-w-none">
                <p className="text-theme-text text-sm leading-relaxed">
                  {outline.worldSetting.visible}
                </p>
              </div>
              {gameState.outline?.worldSettingUnlocked && (
                <div className="mt-3 p-3 bg-theme-warning/10 border border-theme-warning/30 rounded">
                  <span className="text-theme-warning text-xs font-medium">
                    🔓 {t("gameViewer.hiddenRevealed")}
                  </span>
                  <p className="text-theme-warning/80 text-sm mt-1">
                    {outline.worldSetting.hidden}
                  </p>
                </div>
              )}
              {gameState.outline?.worldSettingUnlocked &&
                outline.worldSetting.history && (
                  <div className="mt-3">
                    <span className="text-theme-muted text-xs">
                      {t("gameViewer.worldHistory")}:
                    </span>
                    <p className="text-theme-text/80 text-sm mt-1">
                      {outline.worldSetting.history}
                    </p>
                  </div>
                )}
            </>
          ) : (
            <p className="text-theme-muted text-sm italic">
              {t("gameViewer.noWorldInfo")}
            </p>
          )}
        </Section>

        {/* Locations */}
        <Section id="locations" title={t("gameViewer.locations")} icon="📍">
          {gameState.locations.length === 0 ? (
            <p className="text-theme-muted text-sm italic">
              {t("gameViewer.noLocations")}
            </p>
          ) : (
            <div className="space-y-3">
              {gameState.locations.map((loc) => (
                <div
                  key={loc.id}
                  className={`p-3 rounded border ${
                    loc.id === gameState.currentLocation
                      ? "bg-theme-primary/10 border-theme-primary/50"
                      : "bg-theme-bg/50 border-theme-border/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-theme-text">
                      {loc.name}
                    </span>
                    {loc.id === gameState.currentLocation && (
                      <span className="text-xs px-2 py-0.5 bg-theme-primary/20 text-theme-primary rounded">
                        {t("gameViewer.currentLabel")}
                      </span>
                    )}
                    {loc.isVisited && (
                      <span className="text-xs text-theme-muted">
                        ✓ {t("gameViewer.visited")}
                      </span>
                    )}
                  </div>
                  <p className="text-theme-muted text-sm mt-1">
                    {loc.visible.description}
                  </p>
                  {loc.unlocked && loc.hidden && (
                    <HiddenContent
                      content={
                        <div className="space-y-1">
                          {loc.hidden.fullDescription && (
                            <p>{loc.hidden.fullDescription}</p>
                          )}
                          {loc.hidden.hiddenFeatures &&
                            loc.hidden.hiddenFeatures.length > 0 && (
                              <p>
                                <span className="text-theme-warning/60">
                                  {t("gameViewer.hiddenFeatures")}:
                                </span>{" "}
                                {loc.hidden.hiddenFeatures.join(", ")}
                              </p>
                            )}
                          {loc.hidden.secrets &&
                            loc.hidden.secrets.length > 0 && (
                              <p>
                                <span className="text-theme-warning/60">
                                  {t("gameViewer.secrets")}:
                                </span>{" "}
                                {loc.hidden.secrets.join(", ")}
                              </p>
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
        <Section id="factions" title={t("gameViewer.factions")} icon="⚔️">
          {gameState.factions.length === 0 ? (
            <p className="text-theme-muted text-sm italic">
              {t("gameViewer.noFactions")}
            </p>
          ) : (
            <div className="space-y-3">
              {gameState.factions.map((faction) => (
                <div
                  key={faction.id}
                  className="p-3 bg-theme-bg/50 rounded border border-theme-border/50"
                >
                  <div className="font-medium text-theme-text">
                    {faction.name}
                  </div>
                  <p className="text-theme-muted text-sm mt-1">
                    {faction.visible.agenda}
                  </p>
                  {faction.visible.influence && (
                    <div className="text-xs text-theme-muted mt-2">
                      {t("gameViewer.influence")}: {faction.visible.influence}
                    </div>
                  )}
                  {faction.unlocked && faction.hidden && (
                    <HiddenContent
                      content={
                        <div className="space-y-1">
                          {faction.hidden.agenda && (
                            <p>
                              <span className="text-theme-warning/60">
                                {t("gameViewer.secretAgenda")}:
                              </span>{" "}
                              {faction.hidden.agenda}
                            </p>
                          )}
                          {faction.hidden.influence && (
                            <p>
                              <span className="text-theme-warning/60">
                                {t("gameViewer.trueInfluence")}:
                              </span>{" "}
                              {faction.hidden.influence}
                            </p>
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

  // Render Character Tab
  const renderCharacter = () => {
    const char = gameState.character;
    return (
      <div className="space-y-4">
        {/* Basic Info */}
        <Section id="charBasic" title={t("gameViewer.basicInfo")} icon="👤">
          <InfoRow label={t("gameViewer.name")} value={char.name} />
          <InfoRow label={t("gameViewer.titleLabel")} value={char.title} />
          <InfoRow label={t("gameViewer.status")} value={char.status} />
          {char.profession && (
            <InfoRow
              label={t("gameViewer.profession")}
              value={char.profession}
            />
          )}
          {char.race && (
            <InfoRow label={t("gameViewer.race")} value={char.race} />
          )}
          {char.background && (
            <InfoRow
              label={t("gameViewer.background")}
              value={char.background}
            />
          )}
          {char.appearance && (
            <InfoRow
              label={t("gameViewer.appearance")}
              value={char.appearance}
            />
          )}
        </Section>

        {/* Attributes */}
        {char.attributes.length > 0 && (
          <Section id="charAttrs" title={t("gameViewer.attributes")} icon="📊">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {char.attributes.map((attr) => (
                <div key={attr.label} className="flex items-center gap-2">
                  <span className="text-theme-muted text-sm min-w-[80px]">
                    {attr.label}:
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-theme-border/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-${attr.color}-500`}
                        style={{
                          width: `${(attr.value / attr.maxValue) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-theme-text text-sm min-w-[50px] text-right">
                      {attr.value}/{attr.maxValue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Skills */}
        {char.skills.length > 0 && (
          <Section id="charSkills" title={t("gameViewer.skills")} icon="⚡">
            <div className="space-y-2">
              {char.skills.map((skill) => (
                <div
                  key={skill.id}
                  className={`p-2 rounded border ${
                    skill.highlight
                      ? "bg-theme-primary/10 border-theme-primary/50"
                      : "bg-theme-bg/50 border-theme-border/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-theme-text text-sm">
                      {skill.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-theme-surface rounded text-theme-muted">
                      {skill.level}
                    </span>
                  </div>
                  <p className="text-theme-muted text-xs mt-1">
                    {skill.visible.description}
                  </p>
                  {skill.unlocked && skill.hidden && (
                    <HiddenContent
                      content={
                        <div className="space-y-1 text-xs">
                          {skill.hidden.trueDescription && (
                            <p>{skill.hidden.trueDescription}</p>
                          )}
                          {skill.hidden.hiddenEffects &&
                            skill.hidden.hiddenEffects.length > 0 && (
                              <p>
                                <span className="text-theme-warning/60">
                                  {t("gameViewer.hiddenEffects")}:
                                </span>{" "}
                                {skill.hidden.hiddenEffects.join(", ")}
                              </p>
                            )}
                          {skill.hidden.drawbacks &&
                            skill.hidden.drawbacks.length > 0 && (
                              <p>
                                <span className="text-theme-warning/60">
                                  {t("gameViewer.drawbacks")}:
                                </span>{" "}
                                {skill.hidden.drawbacks.join(", ")}
                              </p>
                            )}
                        </div>
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Conditions */}
        {char.conditions.length > 0 && (
          <Section
            id="charConditions"
            title={t("gameViewer.conditions")}
            icon="💫"
          >
            <div className="space-y-2">
              {char.conditions.map((cond) => (
                <div
                  key={cond.id}
                  className={`p-2 rounded border ${
                    cond.type === "buff"
                      ? "bg-green-500/10 border-green-500/30"
                      : cond.type === "debuff"
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-theme-bg/50 border-theme-border/50"
                  }`}
                >
                  <span className="font-medium text-theme-text text-sm">
                    {cond.name}
                  </span>
                  <p className="text-theme-muted text-xs mt-1">
                    {cond.visible.description}
                  </p>
                  {cond.unlocked && cond.hidden && (
                    <HiddenContent
                      content={
                        <div className="space-y-1 text-xs">
                          {cond.hidden.trueCause && (
                            <p>
                              <span className="text-theme-warning/60">
                                {t("gameViewer.trueCause")}:
                              </span>{" "}
                              {cond.hidden.trueCause}
                            </p>
                          )}
                          {cond.hidden.progression && (
                            <p>
                              <span className="text-theme-warning/60">
                                {t("gameViewer.progression")}:
                              </span>{" "}
                              {cond.hidden.progression}
                            </p>
                          )}
                          {cond.hidden.cure && (
                            <p>
                              <span className="text-theme-warning/60">
                                {t("gameViewer.cure")}:
                              </span>{" "}
                              {cond.hidden.cure}
                            </p>
                          )}
                        </div>
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    );
  };

  // Render Relationships Tab
  const renderRelationships = () => {
    return (
      <div className="space-y-4">
        <Section
          id="relationships"
          title={t("gameViewer.knownCharacters")}
          icon="👥"
        >
          {gameState.relationships.filter((r) => r.known !== false).length ===
          0 ? (
            <p className="text-theme-muted text-sm italic">
              {t("gameViewer.noRelationships")}
            </p>
          ) : (
            <div className="space-y-3">
              {gameState.relationships
                .filter((r) => r.known !== false)
                .map((rel) => (
                  <div
                    key={rel.id}
                    className="p-3 bg-theme-bg/50 rounded border border-theme-border/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-theme-text">
                        {rel.visible.name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          rel.visible.affinity > 50
                            ? "bg-green-500/20 text-green-400"
                            : rel.visible.affinity < -50
                              ? "bg-red-500/20 text-red-400"
                              : "bg-theme-surface text-theme-muted"
                        }`}
                      >
                        {rel.visible.affinityKnown
                          ? `${rel.visible.affinity > 0 ? "+" : ""}${rel.visible.affinity}`
                          : "?"}
                      </span>
                    </div>
                    <p className="text-theme-muted text-sm mt-1">
                      {rel.visible.description}
                    </p>
                    {rel.unlocked && rel.hidden && (
                      <HiddenContent
                        content={
                          <div className="space-y-1">
                            {rel.hidden.realPersonality && (
                              <p>
                                <span className="text-theme-warning/60">
                                  {t("gameViewer.realPersonality")}:
                                </span>{" "}
                                {rel.hidden.realPersonality}
                              </p>
                            )}
                            {rel.hidden.realMotives && (
                              <p>
                                <span className="text-theme-warning/60">
                                  {t("gameViewer.realMotives")}:
                                </span>{" "}
                                {rel.hidden.realMotives}
                              </p>
                            )}
                            {rel.hidden.secrets &&
                              rel.hidden.secrets.length > 0 && (
                                <p>
                                  <span className="text-theme-warning/60">
                                    {t("gameViewer.secrets")}:
                                  </span>{" "}
                                  {rel.hidden.secrets.join(", ")}
                                </p>
                              )}
                            {rel.hidden.trueAffinity !== undefined && (
                              <p>
                                <span className="text-theme-warning/60">
                                  {t("gameViewer.trueAffinity")}:
                                </span>{" "}
                                {rel.hidden.trueAffinity > 0 ? "+" : ""}
                                {rel.hidden.trueAffinity}
                              </p>
                            )}
                          </div>
                        }
                      />
                    )}
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      <span className="text-theme-muted">
                        {rel.visible.relationshipType}
                      </span>
                      {rel.currentLocation &&
                        rel.currentLocation !== "unknown" && (
                          <span className="text-theme-muted">
                            📍 {rel.currentLocation}
                          </span>
                        )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Section>
      </div>
    );
  };

  // Render Quests Tab
  const renderQuests = () => {
    const activeQuests = gameState.quests.filter((q) => q.status === "active");
    const completedQuests = gameState.quests.filter(
      (q) => q.status === "completed",
    );
    const failedQuests = gameState.quests.filter((q) => q.status === "failed");

    return (
      <div className="space-y-4">
        {/* Main Goal */}
        {gameState.outline?.mainGoal && (
          <Section id="mainGoal" title={t("gameViewer.mainGoal")} icon="🎯">
            <p className="text-theme-text text-sm">
              {gameState.outline.mainGoal.visible}
            </p>
            {gameState.outline.mainGoalUnlocked && (
              <div className="mt-3 p-3 bg-theme-warning/10 border border-theme-warning/30 rounded">
                <span className="text-theme-warning text-xs font-medium">
                  🔓 {t("gameViewer.hiddenRevealed")}
                </span>
                <p className="text-theme-warning/80 text-sm mt-1">
                  {gameState.outline.mainGoal.hidden}
                </p>
              </div>
            )}
          </Section>
        )}

        {/* Active Quests */}
        <Section
          id="activeQuests2"
          title={`${t("gameViewer.activeQuests")} (${activeQuests.length})`}
          icon="📜"
        >
          {activeQuests.length === 0 ? (
            <p className="text-theme-muted text-sm italic">
              {t("gameViewer.noActiveQuests")}
            </p>
          ) : (
            <div className="space-y-3">
              {activeQuests.map((quest) => (
                <div
                  key={quest.id}
                  className="p-3 bg-theme-primary/5 rounded border border-theme-primary/30"
                >
                  <div className="font-medium text-theme-text">
                    {quest.title}
                  </div>
                  <p className="text-theme-muted text-sm mt-1">
                    {quest.visible.description}
                  </p>
                  {quest.visible.objectives &&
                    quest.visible.objectives.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {quest.visible.objectives.map((obj, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span className="text-theme-muted">○</span>
                            <span className="text-theme-text">{obj}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  {quest.unlocked && quest.hidden && (
                    <HiddenContent
                      content={
                        <div className="space-y-1 text-xs">
                          {quest.hidden.trueDescription && (
                            <p>{quest.hidden.trueDescription}</p>
                          )}
                          {quest.hidden.trueObjectives &&
                            quest.hidden.trueObjectives.length > 0 && (
                              <p>
                                <span className="text-theme-warning/60">
                                  {t("gameViewer.trueObjectives")}:
                                </span>{" "}
                                {quest.hidden.trueObjectives.join(", ")}
                              </p>
                            )}
                          {quest.hidden.secretOutcome && (
                            <p>
                              <span className="text-theme-warning/60">
                                {t("gameViewer.secretOutcome")}:
                              </span>{" "}
                              {quest.hidden.secretOutcome}
                            </p>
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

        {/* Completed Quests */}
        {completedQuests.length > 0 && (
          <Section
            id="completedQuests"
            title={`${t("gameViewer.completedQuests")} (${completedQuests.length})`}
            icon="✅"
          >
            <div className="space-y-2">
              {completedQuests.map((quest) => (
                <div
                  key={quest.id}
                  className="p-2 bg-green-500/5 rounded border border-green-500/20"
                >
                  <span className="text-theme-text text-sm">{quest.title}</span>
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
          >
            <div className="space-y-2">
              {failedQuests.map((quest) => (
                <div
                  key={quest.id}
                  className="p-2 bg-red-500/5 rounded border border-red-500/20"
                >
                  <span className="text-theme-text text-sm line-through opacity-70">
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

  // Render Lore Tab
  const renderLore = () => {
    return (
      <div className="space-y-4">
        {/* Knowledge */}
        <Section id="knowledge" title={t("gameViewer.knowledge")} icon="📚">
          {gameState.knowledge.length === 0 ? (
            <p className="text-theme-muted text-sm italic">
              {t("gameViewer.noKnowledge")}
            </p>
          ) : (
            <div className="space-y-3">
              {gameState.knowledge.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 bg-theme-bg/50 rounded border border-theme-border/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-theme-text text-sm">
                      {entry.title}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-theme-surface rounded text-theme-muted">
                      {entry.category}
                    </span>
                  </div>
                  <p className="text-theme-muted text-sm mt-1">
                    {entry.visible.description}
                  </p>
                  {entry.unlocked && entry.hidden && (
                    <HiddenContent
                      content={
                        <div className="space-y-1 text-xs">
                          {entry.hidden.fullTruth && (
                            <p>{entry.hidden.fullTruth}</p>
                          )}
                          {entry.hidden.misconceptions &&
                            entry.hidden.misconceptions.length > 0 && (
                              <p>
                                <span className="text-theme-warning/60">
                                  {t("gameViewer.misconceptions")}:
                                </span>{" "}
                                {entry.hidden.misconceptions.join(", ")}
                              </p>
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

        {/* Timeline Events */}
        <Section id="timeline" title={t("gameViewer.timeline")} icon="⏳">
          {gameState.timeline.filter((e) => e.known).length === 0 ? (
            <p className="text-theme-muted text-sm italic">
              {t("gameViewer.noEvents")}
            </p>
          ) : (
            <div className="space-y-3">
              {gameState.timeline
                .filter((e) => e.known)
                .sort(
                  (a, b) =>
                    new Date(b.gameTime).getTime() -
                    new Date(a.gameTime).getTime(),
                )
                .slice(0, 20) // Show last 20 known events
                .map((event) => (
                  <div
                    key={event.id}
                    className="p-3 bg-theme-bg/50 rounded border border-theme-border/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-theme-muted">
                        {event.gameTime}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-theme-surface rounded text-theme-muted">
                        {event.category}
                      </span>
                    </div>
                    <p className="text-theme-text text-sm mt-1">
                      {event.visible.description}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </Section>

        {/* Inventory */}
        <Section id="inventory" title={t("gameViewer.inventory")} icon="🎒">
          {gameState.inventory.length === 0 ? (
            <p className="text-theme-muted text-sm italic">
              {t("gameViewer.noItems")}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {gameState.inventory.map((item) => (
                <div
                  key={item.id}
                  className="p-2 bg-theme-bg/50 rounded border border-theme-border/50 flex items-center gap-2"
                >
                  <span className="text-lg">{item.icon || "📦"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-theme-text text-sm truncate">
                      {item.name}
                    </div>
                    <div className="text-theme-muted text-xs">
                      {item.visible.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    );
  };

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return renderOverview();
      case "world":
        return renderWorld();
      case "character":
        return renderCharacter();
      case "relationships":
        return renderRelationships();
      case "quests":
        return renderQuests();
      case "lore":
        return renderLore();
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none p-4 border-b border-theme-border flex items-center justify-between bg-theme-bg/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              📖
            </span>
            <div>
              <h2 className="text-xl font-bold text-theme-primary">
                {t("gameViewer.title") || "Chronicle"}
              </h2>
              <p className="text-xs text-theme-muted">
                {t("gameViewer.subtitle") || "Your story at a glance"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-theme-muted hover:text-theme-primary hover:bg-theme-surface rounded-lg transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex-none border-b border-theme-border bg-theme-bg/30 overflow-x-auto scrollbar-hide">
          <div className="flex">
            {(Object.keys(TAB_CONFIGS) as ViewTab[]).map((tab) => {
              const config = TAB_CONFIGS[tab];
              const isActive = tab === activeTab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-none px-4 py-3 flex items-center gap-2 transition-colors whitespace-nowrap border-b-2 ${
                    isActive
                      ? "border-theme-primary text-theme-primary bg-theme-primary/10"
                      : "border-transparent text-theme-muted hover:text-theme-text hover:bg-theme-surface/50"
                  }`}
                >
                  <span>{config.icon}</span>
                  <span className="text-sm font-medium">
                    {t(config.labelKey) || tab}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">{renderTabContent()}</div>

        {/* Footer */}
        <div className="flex-none p-4 border-t border-theme-border bg-theme-bg/50 flex items-center justify-between">
          <div className="text-xs text-theme-muted">
            {t("gameViewer.turnInfo", { turn: gameState.turnNumber }) ||
              `Turn ${gameState.turnNumber}`}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-theme-muted hover:text-theme-text hover:bg-theme-surface rounded-lg transition-colors"
          >
            {t("close") || "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};
