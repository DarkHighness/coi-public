/**
 * CharacterTab - Character details display
 * Shows basic info, attributes, skills, conditions, and hidden traits
 */

import React from "react";
import { GameState } from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { Section, InfoRow, EmptyState, HiddenContent } from "./helpers";

interface CharacterTabProps {
  gameState: GameState;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  t: (key: string, options?: any) => string;
}

export const CharacterTab: React.FC<CharacterTabProps> = ({
  gameState,
  expandedSections,
  toggleSection,
  t,
}) => {
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
          <InfoRow label={t("gameViewer.profession")} value={char.profession} />
        )}
        {char.race && (
          <InfoRow label={t("gameViewer.race")} value={char.race} />
        )}
        {char.background && (
          <InfoRow label={t("gameViewer.background")} value={char.background} />
        )}
        {char.appearance && (
          <InfoRow label={t("gameViewer.appearance")} value={char.appearance} />
        )}
        {/* Psychology - top-level, always visible */}
        {char.psychology && (
          <div className="mt-3 pt-3 border-t border-theme-border/30">
            <span className="text-xs uppercase tracking-wider text-theme-primary font-bold block mb-2">
              🧠 {t("gameViewer.psychology") || "Psychology"}
            </span>
            <div className="space-y-1 pl-2 border-l-2 border-theme-border/30 text-sm">
              {char.psychology.coreTrauma && (
                <InfoRow
                  label={t("gameViewer.coreTrauma") || "Core Trauma"}
                  value={char.psychology.coreTrauma}
                />
              )}
              {char.psychology.copingMechanism && (
                <InfoRow
                  label={t("gameViewer.copingMechanism") || "Coping"}
                  value={char.psychology.copingMechanism}
                />
              )}
              {char.psychology.internalContradiction && (
                <InfoRow
                  label={
                    t("gameViewer.internalContradiction") || "Contradiction"
                  }
                  value={char.psychology.internalContradiction}
                />
              )}
            </div>
          </div>
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
                className="flex items-center gap-3 p-3 bg-theme-bg rounded-none border border-theme-border/40"
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
                className={`p-4 rounded-none border ${
                  skill.highlight
                    ? "bg-theme-primary/5 border-theme-primary/40"
                    : "bg-theme-bg border-theme-border/40"
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
                <div className="story-text text-theme-text/90 text-sm pl-2 border-l-2 border-theme-border/50 leading-relaxed">
                  <MarkdownText content={skill.visible.description} />
                </div>
                {skill.visible.knownEffects &&
                  skill.visible.knownEffects.length > 0 && (
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
                                {skill.hidden.hiddenEffects.map((effect, i) => (
                                  <li key={i}>
                                    <MarkdownText content={effect} inline />
                                  </li>
                                ))}
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
                className={`p-4 rounded-none border ${
                  cond.type === "buff"
                    ? "bg-green-500/10 border-green-500/30"
                    : cond.type === "debuff"
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-theme-bg border-theme-border/40"
                }`}
              >
                <span className="font-bold text-theme-text text-sm flex items-center gap-2 mb-2">
                  <span>{getValidIcon(cond.icon, "💫")}</span>
                  {cond.name}
                  {cond.type && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        cond.type === "buff"
                          ? "bg-green-500/20 text-green-400"
                          : cond.type === "debuff"
                            ? "bg-red-500/20 text-red-400"
                            : cond.type === "wound"
                              ? "bg-orange-500/20 text-orange-400"
                              : cond.type === "poison"
                                ? "bg-purple-500/20 text-purple-400"
                                : cond.type === "curse"
                                  ? "bg-violet-500/20 text-violet-400"
                                  : "bg-theme-surface text-theme-muted"
                      }`}
                    >
                      {t(`sidebar.conditionType.${cond.type}`, {
                        defaultValue: cond.type,
                      })}
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
                      {t("gameViewer.perceivedSeverity") ||
                        "Perceived Severity"}
                      :
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
                        {cond.effects?.hidden &&
                          cond.effects.hidden.length > 0 && (
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
                  className="p-4 rounded-none border bg-theme-unlocked/5 border-theme-unlocked/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-theme-text text-sm flex items-center gap-2">
                      <span>{getValidIcon(trait.icon, "🎭")}</span>
                      {trait.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-theme-unlocked/10 text-theme-unlocked rounded border border-theme-unlocked/20 uppercase tracking-wider font-bold">
                      {t("gameViewer.hiddenLabel")}
                    </span>
                  </div>
                  <div className="story-text text-theme-text/90 text-sm pl-2 border-l-2 border-theme-unlocked/30 leading-relaxed">
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
              (tr) => !(tr.unlocked || gameState.unlockMode),
            ) && (
              <EmptyState
                message={
                  t("gameViewer.noHiddenTraitsRevealed") ||
                  "No hidden traits revealed."
                }
              />
            )}
          </div>
        </Section>
      )}
    </div>
  );
};
