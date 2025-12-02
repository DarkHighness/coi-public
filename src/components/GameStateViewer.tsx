/**
 * GameStateViewer - A user-friendly modal for viewing game state
 * Provides a readable, organized view of all game entities
 */

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  GameState,
  Quest,
  Relationship,
  InventoryItem,
  KnowledgeEntry,
  TimelineEvent,
  StorySummary,
} from "../types";
import { useEmbeddingStatus } from "../hooks/useEmbeddingStatus";
import { getValidIcon } from "../utils/emojiValidator";
import { MarkdownText } from "./render/MarkdownText";

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
  | "lore"
  | "embedding";

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
  embedding: { icon: "🧠", labelKey: "gameViewer.embedding" },
};

// Helper: Collapsible Section
const Section = ({
  id,
  title,
  icon,
  children,
  isExpanded,
  onToggle,
}: {
  id: string;
  title: string;
  icon: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}) => {
  return (
    <div className="border border-theme-border rounded-lg overflow-hidden mb-4 bg-theme-bg/30">
      <button
        onClick={() => onToggle(id)}
        className="w-full px-4 py-3 bg-theme-bg/50 flex items-center justify-between hover:bg-theme-surface/50 transition-colors"
      >
        <span className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="font-bold text-theme-primary uppercase tracking-wider text-sm">
            {title}
          </span>
        </span>
        <svg
          className={`w-5 h-5 text-theme-muted transition-transform duration-300 ${
            isExpanded ? "rotate-180" : ""
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
          />
        </svg>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4 border-t border-theme-border bg-theme-surface/30">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper: Hidden Content Display
const HiddenContent = ({
  content,
  label,
  t,
}: {
  content: React.ReactNode;
  label?: string;
  t: any;
}) => (
  <div className="mt-3 p-3 bg-theme-surface/50 border border-theme-unlocked/30 rounded">
    <span className="text-theme-unlocked text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
      {label || t("gameViewer.hiddenRevealed")}
    </span>
    <div className="text-theme-text/90 text-sm leading-relaxed">{content}</div>
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
}) => {
  let valueStr;
  if (typeof value === "string") {
    valueStr = value;
  } else if (typeof value === "number") {
    valueStr = value.toString();
  } else {
    valueStr = JSON.stringify(value);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2 border-b border-theme-border/30 last:border-0">
      <span className="text-theme-primary text-xs uppercase tracking-wider font-bold min-w-[120px] flex-shrink-0 pt-0.5">
        {label}:
      </span>
      <div
        className={`text-sm flex-1 ${
          hidden ? "text-theme-unlocked" : "text-theme-text"
        }`}
      >
        <MarkdownText content={valueStr} />
      </div>
    </div>
  );
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
  const embeddingProgress = useEmbeddingStatus();

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
            value={currentLoc?.name || gameState.currentLocation}
          />
          {outline?.premise && (
            <InfoRow label={t("gameViewer.premise")} value={outline.premise} />
          )}
          {gameState.tokenUsage && (
            <div className="mt-3 pt-3 border-t border-theme-border/30">
              <span className="text-theme-primary text-xs uppercase tracking-wider font-bold block mb-2">
                {t("token.tokens")}
              </span>
              <div className="text-xs font-mono text-theme-text/80 grid grid-cols-2 gap-3 bg-theme-bg/30 p-2 rounded border border-theme-border/30">
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
          {char.profession && (
            <InfoRow
              label={t("gameViewer.profession")}
              value={char.profession}
            />
          )}
          {char.attributes.length > 0 && (
            <div className="mt-3 pt-2 border-t border-theme-border/30">
              <span className="text-theme-primary text-xs uppercase tracking-wider font-bold block mb-2">
                {t("gameViewer.attributes")}:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {char.attributes.map((attr, idx) => (
                  <div
                    key={attr.label || idx}
                    className="flex items-center justify-between p-2 bg-theme-bg/30 rounded border border-theme-border/30 text-sm"
                  >
                    <span className="text-theme-muted">{attr.label}:</span>
                    <span className="text-theme-text font-medium">
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
          isExpanded={expandedSections.has("activeQuests")}
          onToggle={toggleSection}
        >
          {gameState.quests.filter((q) => q.status === "active").length ===
          0 ? (
            <p className="text-theme-muted text-sm italic p-2 border border-dashed border-theme-border/50 rounded text-center">
              {t("gameViewer.noActiveQuests")}
            </p>
          ) : (
            <div className="space-y-3">
              {gameState.quests
                .filter((q) => q.status === "active")
                .map((quest, idx) => (
                  <div
                    key={quest.id || idx}
                    className="p-3 bg-theme-surface-highlight/30 rounded border border-theme-border/50"
                  >
                    <div className="font-bold text-theme-primary text-sm flex items-center gap-2 mb-1">
                      <span>{getValidIcon(quest.icon, "📜")}</span>
                      {quest.title}
                    </div>
                    <div className="text-theme-text/90 text-sm pl-6 border-l-2 border-theme-border/50 ml-1">
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
          isExpanded={expandedSections.has("worldSetting")}
          onToggle={toggleSection}
        >
          {outline?.worldSetting ? (
            <>
              <div className="text-theme-text text-sm leading-relaxed">
                <MarkdownText
                  content={outline.worldSetting.visible?.description || ""}
                />
                {outline.worldSetting.visible?.rules && (
                  <div className="mt-3 pt-2 border-t border-theme-border/30">
                    <span className="text-xs uppercase tracking-wider text-theme-primary font-bold block mb-1">
                      {t("gameViewer.rules") || "Rules"}
                    </span>
                    <MarkdownText
                      content={outline.worldSetting.visible.rules}
                    />
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
                    <span className="text-theme-primary text-xs uppercase tracking-wider font-bold block mb-2">
                      {t("gameViewer.worldHistory")}:
                    </span>
                    <div className="text-theme-text/90 text-sm pl-2 border-l-2 border-theme-border/50">
                      <MarkdownText content={outline.worldSetting.history} />
                    </div>
                  </div>
                )}
            </>
          ) : (
            <p className="text-theme-muted text-sm italic p-2 border border-dashed border-theme-border/50 rounded text-center">
              {t("gameViewer.noWorldInfo")}
            </p>
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
            <p className="text-theme-muted text-sm italic p-2 border border-dashed border-theme-border/50 rounded text-center">
              {t("gameViewer.noLocations")}
            </p>
          ) : (
            <div className="space-y-3">
              {gameState.locations.map((loc, idx) => (
                <div
                  key={loc.id || idx}
                  className={`p-4 rounded border ${
                    loc.id === gameState.currentLocation
                      ? "bg-theme-primary/10 border-theme-primary/50 ring-1 ring-theme-primary/30"
                      : "bg-theme-surface-highlight/30 border-theme-border/50"
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
                    {loc.environment && (
                      <div className="text-xs">
                        <span className="uppercase tracking-wider text-theme-primary/80">
                          {t("gameViewer.environment") || "Environment"}:
                        </span>{" "}
                        <span className="text-theme-muted">{loc.environment}</span>
                      </div>
                    )}
                    {loc.visible.knownFeatures && loc.visible.knownFeatures.length > 0 && (
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
                    {loc.visible.resources && loc.visible.resources.length > 0 && (
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
                            <MarkdownText
                              content={loc.hidden.fullDescription}
                            />
                          )}
                          {loc.hidden.dangers && loc.hidden.dangers.length > 0 && (
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
            <p className="text-theme-muted text-sm italic p-2 border border-dashed border-theme-border/50 rounded text-center">
              {t("gameViewer.noFactions")}
            </p>
          ) : (
            <div className="space-y-3">
              {gameState.factions.map((faction, idx) => (
                <div
                  key={faction.id || idx}
                  className="p-4 bg-theme-surface-highlight/30 rounded border border-theme-border/50"
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
        <Section
          id="charBasic"
          title={t("gameViewer.basicInfo")}
          icon="👤"
          isExpanded={expandedSections.has("charBasic")}
          onToggle={toggleSection}
        >
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
          <Section
            id="charAttrs"
            title={t("gameViewer.attributes")}
            icon="📊"
            isExpanded={expandedSections.has("charAttrs")}
            onToggle={toggleSection}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {char.attributes.map((attr, idx) => (
                <div
                  key={attr.label || idx}
                  className="flex items-center gap-3 p-3 bg-theme-surface-highlight/30 rounded border border-theme-border/50"
                >
                  <span className="text-theme-primary text-sm font-bold uppercase tracking-wider min-w-[80px]">
                    {attr.label}:
                  </span>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-2.5 bg-theme-bg/50 rounded-full overflow-hidden border border-theme-border/30">
                      <div
                        className={`h-full rounded-full bg-${attr.color}-500`}
                        style={{
                          width: `${(attr.value / attr.maxValue) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-theme-text text-sm font-mono font-bold min-w-[50px] text-right">
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
          <Section
            id="charSkills"
            title={t("gameViewer.skills")}
            icon="⚡"
            isExpanded={expandedSections.has("charSkills")}
            onToggle={toggleSection}
          >
            <div className="space-y-3">
              {char.skills.map((skill, idx) => (
                <div
                  key={skill.id || idx}
                  className={`p-4 rounded border ${
                    skill.highlight
                      ? "bg-theme-surface-highlight/30 border-theme-border/50 ring-2 ring-theme-primary/50"
                      : "bg-theme-surface-highlight/30 border-theme-border/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-theme-primary text-sm flex items-center gap-2">
                      <span>{getValidIcon(skill.icon, "⚡")}</span>
                      {skill.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-theme-surface rounded text-theme-muted border border-theme-border/50">
                      {skill.level}
                    </span>
                  </div>
                  <div className="text-theme-text/90 text-sm pl-2 border-l-2 border-theme-border/50">
                    <MarkdownText content={skill.visible.description} />
                  </div>
                  {skill.visible.knownEffects && skill.visible.knownEffects.length > 0 && (
                    <div className="mt-2 text-xs">
                      <span className="uppercase tracking-wider text-theme-primary/80 block mb-1">
                        {t("gameViewer.knownEffects") || "Known Effects"}:
                      </span>
                      <ul className="list-disc list-inside pl-2 text-theme-muted">
                        {skill.visible.knownEffects.map((effect, i) => (
                          <li key={i}>{effect}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {skill.category && (
                    <div className="mt-2 text-xs text-theme-muted">
                      <span className="uppercase tracking-wider text-theme-primary/80">
                        {t("gameViewer.category") || "Category"}:
                      </span>{" "}
                      {skill.category}
                    </div>
                  )}
                  {(skill.unlocked || gameState.unlockMode) && skill.hidden && (
                    <HiddenContent
                      t={t}
                      content={
                        <div className="space-y-2">
                          {skill.hidden.trueDescription && (
                            <MarkdownText
                              content={skill.hidden.trueDescription}
                            />
                          )}
                          {skill.hidden.hiddenEffects &&
                            skill.hidden.hiddenEffects.length > 0 && (
                              <div>
                                <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                  {t("gameViewer.hiddenEffects")}:
                                </span>
                                <ul className="list-disc list-inside pl-2">
                                  {skill.hidden.hiddenEffects.map(
                                    (effect, i) => (
                                      <li key={i}>
                                        <MarkdownText content={effect} inline />
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}
                          {skill.hidden.drawbacks &&
                            skill.hidden.drawbacks.length > 0 && (
                              <div>
                                <span className="text-xs uppercase tracking-wider text-theme-danger/80 block mb-1">
                                  {t("gameViewer.drawbacks")}:
                                </span>
                                <ul className="list-disc list-inside pl-2 text-theme-danger/80">
                                  {skill.hidden.drawbacks.map((drawback, i) => (
                                    <li key={i}>
                                      <MarkdownText content={drawback} inline />
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
          </Section>
        )}

        {/* Conditions */}
        {char.conditions.length > 0 && (
          <Section
            id="charConditions"
            title={t("gameViewer.conditions")}
            icon="💫"
            isExpanded={expandedSections.has("charConditions")}
            onToggle={toggleSection}
          >
            <div className="space-y-3">
              {char.conditions.map((cond, idx) => (
                <div
                  key={cond.id || idx}
                  className={`p-4 rounded border ${
                    cond.type === "buff"
                      ? "bg-green-500/10 border-green-500/30"
                      : cond.type === "debuff"
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-theme-surface-highlight/30 border-theme-border/50"
                  }`}
                >
                  <span className="font-bold text-theme-text text-sm flex items-center gap-2 mb-2">
                    <span>{getValidIcon(cond.icon, "💫")}</span>
                    {cond.name}
                    {cond.type && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        cond.type === "buff" ? "bg-green-500/20 text-green-400" :
                        cond.type === "debuff" ? "bg-red-500/20 text-red-400" :
                        cond.type === "wound" ? "bg-orange-500/20 text-orange-400" :
                        cond.type === "poison" ? "bg-purple-500/20 text-purple-400" :
                        cond.type === "curse" ? "bg-violet-500/20 text-violet-400" :
                        "bg-theme-surface text-theme-muted"
                      }`}>
                        {cond.type}
                      </span>
                    )}
                    {cond.severity && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-theme-surface text-theme-muted">
                        {cond.severity}
                      </span>
                    )}
                  </span>
                  <div className="text-theme-text/90 text-sm pl-2 border-l-2 border-theme-border/50">
                    <MarkdownText content={cond.visible.description} />
                  </div>
                  {cond.visible?.perceivedSeverity && (
                    <div className="mt-2 text-xs text-theme-muted">
                      <span className="uppercase tracking-wider text-theme-primary/80">
                        {t("gameViewer.perceivedSeverity") || "Perceived Severity"}:
                      </span>{" "}
                      {cond.visible.perceivedSeverity}
                    </div>
                  )}
                  {cond.effects?.visible && cond.effects.visible.length > 0 && (
                    <div className="mt-2 text-xs">
                      <span className="uppercase tracking-wider text-theme-primary/80 block mb-1">
                        {t("gameViewer.visibleEffects") || "Effects"}:
                      </span>
                      <ul className="list-disc list-inside pl-2 text-theme-muted">
                        {cond.effects.visible.map((effect, i) => (
                          <li key={i}>{effect}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(cond.unlocked || gameState.unlockMode) && cond.hidden && (
                    <HiddenContent
                      t={t}
                      content={
                        <div className="space-y-2">
                          {cond.hidden.trueCause && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.trueCause")}:
                              </span>
                              <MarkdownText content={cond.hidden.trueCause} />
                            </div>
                          )}
                          {cond.hidden.progression && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.progression")}:
                              </span>
                              <MarkdownText content={cond.hidden.progression} />
                            </div>
                          )}
                          {cond.hidden.cure && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.cure")}:
                              </span>
                              <MarkdownText content={cond.hidden.cure} />
                            </div>
                          )}
                          {cond.hidden.actualSeverity && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("hidden.severity")}:
                              </span>
                              <MarkdownText
                                content={cond.hidden.actualSeverity}
                              />
                            </div>
                          )}
                          {cond.effects?.hidden && cond.effects.hidden.length > 0 && (
                            <div>
                              <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                {t("gameViewer.hiddenEffects")}:
                              </span>
                              <ul className="list-disc list-inside pl-2">
                                {cond.effects.hidden.map((effect, i) => (
                                  <li key={i}>{effect}</li>
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
          </Section>
        )}

        {/* Hidden Traits */}
        {char.hiddenTraits && char.hiddenTraits.length > 0 && (
          <Section
            id="charHiddenTraits"
            title={t("gameViewer.hiddenTraits") || "Hidden Traits"}
            icon="🎭"
            isExpanded={expandedSections.has("charHiddenTraits")}
            onToggle={toggleSection}
          >
            <div className="space-y-3">
              {char.hiddenTraits.map((trait, idx) => {
                const isRevealed = trait.unlocked || gameState.unlockMode;
                if (!isRevealed) return null;

                return (
                  <div
                    key={trait.id || trait.name || idx}
                    className="p-4 rounded border bg-theme-unlocked/5 border-theme-unlocked/20"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-theme-text text-sm flex items-center gap-2">
                        <span>{getValidIcon(trait.icon, "🎭")}</span>
                        {trait.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-theme-unlocked/10 text-theme-unlocked rounded border border-theme-unlocked/20 uppercase tracking-wider font-bold">
                        {t("gameViewer.hidden")}
                      </span>
                    </div>
                    <div className="text-theme-text/90 text-sm pl-2 border-l-2 border-theme-unlocked/30">
                      <MarkdownText content={trait.description} />
                    </div>
                    {trait.effects && trait.effects.length > 0 && (
                      <div className="mt-2">
                        <span className="text-theme-unlocked/80 text-xs uppercase tracking-wider font-bold block mb-1">
                          {t("gameViewer.effects")}:
                        </span>
                        <ul className="list-disc list-inside text-sm text-theme-text/80 pl-2">
                          {trait.effects.map((effect, i) => (
                            <li key={i}>
                              <MarkdownText content={effect} inline />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
              {char.hiddenTraits.every(
                (t) => !(t.unlocked || gameState.unlockMode),
              ) && (
                <p className="text-theme-muted text-sm italic p-2 border border-dashed border-theme-border/50 rounded text-center">
                  {t("gameViewer.noHiddenTraitsRevealed") ||
                    "No hidden traits revealed."}
                </p>
              )}
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
          isExpanded={expandedSections.has("relationships")}
          onToggle={toggleSection}
        >
          {gameState.relationships.filter(
            (r) => gameState.unlockMode || r.known !== false,
          ).length === 0 ? (
            <p className="text-theme-muted text-sm italic p-2 border border-dashed border-theme-border/50 rounded text-center">
              {t("gameViewer.noRelationships")}
            </p>
          ) : (
            <div className="space-y-3">
              {gameState.relationships
                .filter((r) => gameState.unlockMode || r.known !== false)
                .map((rel, idx) => (
                  <div
                    key={rel.id || idx}
                    className="p-4 bg-theme-surface-highlight/30 rounded border border-theme-border/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-theme-primary text-base flex items-center gap-2">
                        <span>{getValidIcon(rel.icon, "👤")}</span>
                        {rel.visible.name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold ${
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
                    <div className="text-theme-text/90 text-sm pl-2 border-l-2 border-theme-border/50">
                      <MarkdownText content={rel.visible.description} />
                    </div>
                    {/* Visible Fields - Player's Perception */}
                    <div className="mt-3 space-y-2 text-sm">
                      {rel.visible.appearance && (
                        <div>
                          <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                            {t("gameViewer.appearance") || "Appearance"}:
                          </span>
                          <div className="text-theme-text/80 pl-2 border-l-2 border-theme-border/30">
                            <MarkdownText content={rel.visible.appearance} />
                          </div>
                        </div>
                      )}
                      {rel.visible.personality && (
                        <div>
                          <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                            {t("gameViewer.personality") || "Personality"}:
                          </span>
                          <div className="text-theme-text/80 pl-2 border-l-2 border-theme-border/30">
                            <MarkdownText content={rel.visible.personality} />
                          </div>
                        </div>
                      )}
                      {rel.visible.impression && (
                        <div>
                          <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                            {t("gameViewer.myImpression") || "My Impression"}:
                          </span>
                          <div className="text-theme-text/80 pl-2 border-l-2 border-theme-border/30">
                            <MarkdownText content={rel.visible.impression} />
                          </div>
                        </div>
                      )}
                      {rel.visible.status && (
                        <div>
                          <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                            {t("gameViewer.perceivedStatus") || "Currently (Perceived)"}:
                          </span>
                          <div className="text-theme-text/80 pl-2 border-l-2 border-theme-border/30">
                            <MarkdownText content={rel.visible.status} />
                          </div>
                        </div>
                      )}
                      {rel.visible.dialogueStyle && (
                        <div>
                          <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                            {t("gameViewer.dialogueStyle") || "Speech Style"}:
                          </span>
                          <div className="text-theme-text/80 pl-2 border-l-2 border-theme-border/30">
                            <MarkdownText content={rel.visible.dialogueStyle} />
                          </div>
                        </div>
                      )}
                    </div>
                    {(rel.unlocked || gameState.unlockMode) && rel.hidden && (
                      <HiddenContent
                        t={t}
                        content={
                          <div className="space-y-2">
                            {rel.hidden.trueName && (
                              <div>
                                <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                  {t("gameViewer.trueName") || "True Name"}:
                                </span>
                                <MarkdownText content={rel.hidden.trueName} />
                              </div>
                            )}
                            {rel.hidden.realPersonality && (
                              <div>
                                <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                  {t("gameViewer.realPersonality")}:
                                </span>
                                <MarkdownText
                                  content={rel.hidden.realPersonality}
                                />
                              </div>
                            )}
                            {rel.hidden.realMotives && (
                              <div>
                                <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                  {t("gameViewer.realMotives")}:
                                </span>
                                <MarkdownText
                                  content={rel.hidden.realMotives}
                                />
                              </div>
                            )}
                            {rel.hidden.secrets &&
                              rel.hidden.secrets.length > 0 && (
                                <div>
                                  <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                    {t("gameViewer.secrets")}:
                                  </span>
                                  <ul className="list-disc list-inside pl-2">
                                    {rel.hidden.secrets.map((secret, i) => (
                                      <li key={i}>
                                        <MarkdownText content={secret} inline />
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            {rel.hidden.trueAffinity !== undefined && (
                              <div>
                                <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                  {t("gameViewer.trueAffinity")}:
                                </span>
                                <p className="pl-2">
                                  {rel.hidden.trueAffinity > 0 ? "+" : ""}
                                  {rel.hidden.trueAffinity}
                                </p>
                              </div>
                            )}
                            {rel.hidden.relationshipType && (
                              <div>
                                <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                  {t("gameViewer.trueRelationship") ||
                                    "True Relationship"}
                                  :
                                </span>
                                <MarkdownText
                                  content={rel.hidden.relationshipType}
                                />
                              </div>
                            )}
                            {rel.hidden.status && (
                              <div>
                                <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                  {t("gameViewer.trueStatus") || "True Status"}:
                                </span>
                                <MarkdownText content={rel.hidden.status} />
                              </div>
                            )}
                            {rel.hidden.impression && (
                              <div>
                                <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                  {t("gameViewer.npcImpression") || "Their Impression of Me"}:
                                </span>
                                <MarkdownText content={rel.hidden.impression} />
                              </div>
                            )}
                            {rel.hidden.routine && (
                              <div>
                                <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                  {t("gameViewer.routine") || "Daily Routine"}:
                                </span>
                                <MarkdownText content={rel.hidden.routine} />
                              </div>
                            )}
                          </div>
                        }
                      />
                    )}
                    <div className="flex flex-wrap gap-2 mt-3 text-xs pt-2 border-t border-theme-border/30">
                      <span className="text-theme-muted bg-theme-surface px-2 py-0.5 rounded border border-theme-border/50">
                        {rel.visible.relationshipType}
                      </span>
                      {rel.currentLocation &&
                        rel.currentLocation !== "unknown" && (
                          <span className="text-theme-muted bg-theme-surface px-2 py-0.5 rounded border border-theme-border/50">
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
                            {t("gameViewer.trueConditions") ||
                              "True Conditions"}
                            :
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
            <p className="text-theme-muted text-sm italic p-2 border border-dashed border-theme-border/50 rounded text-center">
              {t("gameViewer.noActiveQuests")}
            </p>
          ) : (
            <div className="space-y-3">
              {activeQuests.map((quest, idx) => (
                <div
                  key={quest.id || idx}
                  className="p-4 bg-theme-surface-highlight/30 rounded border border-theme-border/50"
                >
                  <div className="font-bold text-theme-primary text-sm flex items-center gap-2 mb-2">
                    <span>{getValidIcon(quest.icon, "📜")}</span>
                    {quest.title}
                  </div>
                  <div className="text-theme-text/90 text-sm pl-2 border-l-2 border-theme-border/50">
                    <MarkdownText content={quest.visible.description} />
                  </div>
                  {quest.visible.objectives &&
                    quest.visible.objectives.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-theme-border/30">
                        <span className="text-xs uppercase tracking-wider text-theme-primary font-bold block mb-1">
                          {t("gameViewer.objectives") || "Objectives"}
                        </span>
                        <div className="space-y-1">
                          {quest.visible.objectives.map((obj, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 text-sm"
                            >
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
                            <MarkdownText
                              content={quest.hidden.trueDescription}
                            />
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
                              <MarkdownText
                                content={quest.hidden.secretOutcome}
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

  // Render Lore Tab
  const renderLore = () => {
    return (
      <div className="space-y-4">
        {/* Knowledge */}
        <Section
          id="knowledge"
          title={t("gameViewer.knowledge")}
          icon="📚"
          isExpanded={expandedSections.has("knowledge")}
          onToggle={toggleSection}
        >
          {gameState.knowledge.length === 0 ? (
            <p className="text-theme-muted text-sm italic p-2 border border-dashed border-theme-border/50 rounded text-center">
              {t("gameViewer.noKnowledge")}
            </p>
          ) : (
            <div className="space-y-3">
              {gameState.knowledge.map((entry, idx) => (
                <div
                  key={entry.id || idx}
                  className="p-4 bg-theme-surface-highlight/30 rounded border border-theme-border/50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-theme-primary text-sm flex items-center gap-2">
                      <span>{getValidIcon(entry.icon, "📚")}</span>
                      {entry.title}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-theme-surface rounded text-theme-muted border border-theme-border/50 uppercase tracking-wider">
                      {entry.category}
                    </span>
                  </div>
                  <div className="text-theme-text/90 text-sm pl-2 border-l-2 border-theme-border/50">
                    <MarkdownText content={entry.visible.description} />
                  </div>
                  {(entry.unlocked || gameState.unlockMode) && entry.hidden && (
                    <HiddenContent
                      t={t}
                      content={
                        <div className="space-y-2">
                          {entry.hidden.fullTruth && (
                            <MarkdownText content={entry.hidden.fullTruth} />
                          )}
                          {entry.hidden.misconceptions &&
                            entry.hidden.misconceptions.length > 0 && (
                              <div>
                                <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                  {t("gameViewer.misconceptions")}:
                                </span>
                                <ul className="list-disc list-inside pl-2">
                                  {entry.hidden.misconceptions.map(
                                    (misc, i) => (
                                      <li key={i}>
                                        <MarkdownText content={misc} inline />
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
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Timeline Events */}
        <Section
          id="timeline"
          title={t("gameViewer.timeline")}
          icon="⏳"
          isExpanded={expandedSections.has("timeline")}
          onToggle={toggleSection}
        >
          {gameState.timeline.filter((e) => e.known).length === 0 ? (
            <p className="text-theme-muted text-sm italic p-2 border border-dashed border-theme-border/50 rounded text-center">
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
                .map((event, idx) => (
                  <div
                    key={event.id || idx}
                    className="p-4 bg-theme-surface-highlight/30 rounded border border-theme-border/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-theme-muted font-mono">
                        {event.gameTime}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-theme-surface rounded text-theme-muted flex items-center gap-1 border border-theme-border/50 uppercase tracking-wider">
                        <span>{getValidIcon(event.icon, "⏳")}</span>
                        {event.category}
                      </span>
                    </div>
                    <div className="text-theme-text text-sm pl-2 border-l-2 border-theme-border/50">
                      <MarkdownText content={event.visible.description} />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Section>

        {/* Inventory */}
        <Section
          id="inventory"
          title={t("gameViewer.inventory")}
          icon="🎒"
          isExpanded={expandedSections.has("inventory")}
          onToggle={toggleSection}
        >
          {gameState.inventory.length === 0 ? (
            <p className="text-theme-muted text-sm italic p-2 border border-dashed border-theme-border/50 rounded text-center">
              {t("gameViewer.noItems")}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gameState.inventory.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 bg-theme-surface-highlight/30 rounded border border-theme-border/50 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {getValidIcon(item.icon, "📦")}
                    </span>
                    <div className="font-bold text-theme-text text-sm truncate">
                      {item.name}
                    </div>
                  </div>
                  <div className="text-theme-muted text-xs pl-1">
                    <MarkdownText content={item.visible.description} />
                  </div>
                  {item.visible?.usage && (
                    <div className="text-xs">
                      <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                        {t("gameViewer.usage") || "Usage"}:
                      </span>
                      <div className="text-theme-muted pl-1">
                        <MarkdownText content={item.visible.usage} />
                      </div>
                    </div>
                  )}
                  {item.lore && (
                    <div className="text-xs border-t border-theme-border/30 pt-2 mt-1">
                      <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                        {t("gameViewer.lore") || "Lore"}:
                      </span>
                      <div className="text-theme-muted pl-1 italic">
                        <MarkdownText content={item.lore} />
                      </div>
                    </div>
                  )}
                  {(item.unlocked || gameState.unlockMode) && item.hidden && (
                    <HiddenContent
                      t={t}
                      content={
                        <div className="space-y-1 text-xs">
                          {item.hidden.truth && (
                            <MarkdownText content={item.hidden.truth} />
                          )}
                          {item.hidden.secrets &&
                            item.hidden.secrets.length > 0 && (
                              <div>
                                <span className="text-xs uppercase tracking-wider text-theme-unlocked/80 block mb-1">
                                  {t("gameViewer.secrets")}:
                                </span>
                                <ul className="list-disc list-inside pl-2">
                                  {item.hidden.secrets.map((secret, i) => (
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
      </div>
    );
  };

  // Render Embedding Tab
  const renderEmbedding = () => {
    return (
      <div className="space-y-4">
        <div className="p-6 bg-theme-surface-highlight/20 rounded border border-theme-border/50 text-center">
          <div className="text-5xl mb-3">🧠</div>
          <h3 className="text-xl font-bold text-theme-primary mb-2 uppercase tracking-wider">
            {t("gameViewer.embeddingStatus") || "Embedding Status"}
          </h3>
          <p className="text-theme-muted text-sm max-w-md mx-auto">
            {t("gameViewer.embeddingDescription") ||
              "View the status of the RAG (Retrieval-Augmented Generation) system."}
          </p>
        </div>

        {embeddingProgress ? (
          <Section
            id="embeddingStats"
            title={t("gameViewer.embeddingStats") || "Statistics"}
            icon="📊"
            isExpanded={expandedSections.has("embeddingStats")}
            onToggle={toggleSection}
          >
            <div className="space-y-3">
              <InfoRow
                label={t("embedding.phase") || "Phase"}
                value={
                  t(`embedding.phase.${embeddingProgress.stage}`) ||
                  embeddingProgress.stage
                }
              />
              <InfoRow
                label={t("embedding.progress") || "Progress"}
                value={`${embeddingProgress.current} / ${embeddingProgress.total}`}
              />
              {embeddingProgress.message && (
                <div className="text-xs text-theme-muted italic mt-2 p-2 bg-theme-bg/30 rounded border border-theme-border/30">
                  {embeddingProgress.message}
                </div>
              )}
              <div className="mt-3 h-3 bg-theme-bg/50 rounded-full overflow-hidden border border-theme-border/30">
                <div
                  className="h-full bg-gradient-to-r from-theme-primary to-theme-primary-hover transition-all duration-300"
                  style={{
                    width: `${embeddingProgress.total > 0 ? (embeddingProgress.current / embeddingProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </Section>
        ) : (
          <div className="p-6 text-center text-theme-muted italic border border-dashed border-theme-border/50 rounded bg-theme-surface-highlight/10">
            {t("gameViewer.noEmbeddingActivity") ||
              "No active embedding tasks."}
          </div>
        )}
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
      case "embedding":
        return renderEmbedding();
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden ring-1 ring-theme-border/50">
        {/* Header */}
        <div className="flex-none p-5 border-b border-theme-border flex items-center justify-between bg-theme-surface-highlight/10">
          <div className="flex items-center gap-4">
            <span className="text-3xl" aria-hidden="true">
              📖
            </span>
            <div>
              <h2 className="text-2xl font-bold text-theme-primary uppercase tracking-widest">
                {t("gameViewer.title") || "Chronicle"}
              </h2>
              <p className="text-xs text-theme-muted uppercase tracking-wider font-bold">
                {t("gameViewer.subtitle") || "Your story at a glance"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-theme-muted hover:text-theme-primary hover:bg-theme-surface rounded-lg transition-colors"
          >
            <svg
              className="w-8 h-8"
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
          <div className="flex px-2">
            {(Object.keys(TAB_CONFIGS) as ViewTab[]).map((tab) => {
              const config = TAB_CONFIGS[tab];
              const isActive = tab === activeTab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-none px-6 py-4 flex items-center gap-2 transition-all whitespace-nowrap border-b-2 ${
                    isActive
                      ? "border-theme-primary text-theme-primary bg-theme-primary/5"
                      : "border-transparent text-theme-muted hover:text-theme-text hover:bg-theme-surface/50"
                  }`}
                >
                  <span className="text-lg">
                    {getValidIcon(config.icon, "📖")}
                  </span>
                  <span className="text-sm font-bold uppercase tracking-wider">
                    {t(config.labelKey) || tab}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-theme-bg/20">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="flex-none p-4 border-t border-theme-border bg-theme-surface-highlight/10 flex items-center justify-between">
          <div className="text-xs text-theme-muted font-mono">
            {t("gameViewer.turnInfo", { turn: gameState.turnNumber }) ||
              `Turn ${gameState.turnNumber}`}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 text-theme-muted hover:text-theme-text hover:bg-theme-surface rounded-lg transition-colors border border-transparent hover:border-theme-border uppercase text-xs font-bold tracking-wider"
          >
            {t("close") || "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};
