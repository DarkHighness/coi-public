/**
 * CharacterTab - Character details display
 * Shows basic info, skills, conditions, and hidden traits
 */

import React from "react";
import type { TFunction } from "i18next";
import { GameState } from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import {
  Section,
  InfoRow,
  EmptyState,
  HiddenContent,
  SubsectionLabel,
  EntityBlock,
} from "./helpers";

interface CharacterTabProps {
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

export const CharacterTab: React.FC<CharacterTabProps> = ({
  gameState,
  expandedSections,
  toggleSection,
  t,
}) => {
  const char = gameState.character;
  const playerProfile = gameState.actors.find(
    (bundle) => bundle.profile.id === gameState.playerActorId,
  )?.profile;
  const visible = playerProfile?.visible;
  const hidden = playerProfile?.hidden;
  const hasHiddenContent = Boolean(
    hidden &&
    (hidden.trueName ||
      hidden.race ||
      hidden.gender ||
      hidden.status ||
      hidden.realPersonality ||
      hidden.realMotives ||
      hidden.routine ||
      hidden.currentThought ||
      (Array.isArray(hidden.secrets) && hidden.secrets.length > 0)),
  );
  const showHiddenBlock = Boolean(
    (gameState.unlockMode || playerProfile?.unlocked) && hasHiddenContent,
  );
  const unknownText = t("unknown") || "Unknown";

  return (
    <div className="space-y-4">
      <Section
        id="charBasic"
        title={t("gameViewer.basicInfo")}
        icon="👤"
        isExpanded={expandedSections.has("charBasic")}
        onToggle={toggleSection}
      >
        <InfoRow
          label={t("gameViewer.name")}
          value={visible?.name || char.name}
        />
        <InfoRow
          label={t("gameViewer.titleLabel")}
          value={visible?.title || char.title || unknownText}
        />
        <InfoRow
          label={t("gameViewer.status")}
          value={visible?.status || char.status || unknownText}
        />
        <InfoRow
          label={t("gameViewer.age")}
          value={visible?.age || char.age || unknownText}
        />
        <InfoRow
          label={t("gameViewer.profession")}
          value={visible?.profession || char.profession || unknownText}
        />
        <InfoRow
          label={t("gameViewer.race")}
          value={visible?.race || char.race || unknownText}
        />
        <InfoRow
          label={t("gameViewer.gender")}
          value={visible?.gender || char.gender || unknownText}
        />
        {visible?.roleTag ? (
          <InfoRow label={t("gameViewer.roleTag")} value={visible.roleTag} />
        ) : null}
        {visible?.voice ? (
          <InfoRow label={t("gameViewer.voice")} value={visible.voice} />
        ) : null}
        {visible?.mannerism ? (
          <InfoRow
            label={t("gameViewer.mannerism")}
            value={visible.mannerism}
          />
        ) : null}
        {visible?.mood ? (
          <InfoRow label={t("gameViewer.mood")} value={visible.mood} />
        ) : null}
        <InfoRow
          label={t("gameViewer.background")}
          value={visible?.background || char.background || unknownText}
        />
        <InfoRow
          label={t("gameViewer.appearance")}
          value={visible?.appearance || char.appearance || unknownText}
        />
        {visible?.description ? (
          <InfoRow
            label={t("description") || "Description"}
            value={<MarkdownText content={visible.description} />}
          />
        ) : null}

        {char.psychology ? (
          <div className="pt-2 mt-2">
            <SubsectionLabel>
              {`🧠 ${t("gameViewer.psychology") || "Psychology"}`}
            </SubsectionLabel>
            {char.psychology.coreTrauma ? (
              <InfoRow
                label={t("gameViewer.coreTrauma") || "Core Trauma"}
                value={char.psychology.coreTrauma}
              />
            ) : null}
            {char.psychology.copingMechanism ? (
              <InfoRow
                label={t("gameViewer.copingMechanism") || "Coping"}
                value={char.psychology.copingMechanism}
              />
            ) : null}
            {char.psychology.internalContradiction ? (
              <InfoRow
                label={t("gameViewer.internalContradiction") || "Contradiction"}
                value={char.psychology.internalContradiction}
              />
            ) : null}
          </div>
        ) : null}

        {showHiddenBlock && hidden ? (
          <HiddenContent
            t={t}
            label={t("gameViewer.hiddenLabel") || "Hidden"}
            content={
              <>
                {hidden.trueName ? (
                  <InfoRow
                    label={t("gameViewer.trueName")}
                    value={hidden.trueName}
                  />
                ) : null}
                {hidden.race ? (
                  <InfoRow label={t("gameViewer.race")} value={hidden.race} />
                ) : null}
                {hidden.gender ? (
                  <InfoRow
                    label={t("gameViewer.gender")}
                    value={hidden.gender}
                  />
                ) : null}
                {hidden.status ? (
                  <InfoRow
                    label={t("gameViewer.trueStatus")}
                    value={hidden.status}
                  />
                ) : null}
                {hidden.realPersonality ? (
                  <InfoRow
                    label={t("gameViewer.realPersonality")}
                    value={hidden.realPersonality}
                  />
                ) : null}
                {hidden.realMotives ? (
                  <InfoRow
                    label={t("gameViewer.realMotives")}
                    value={hidden.realMotives}
                  />
                ) : null}
                {hidden.routine ? (
                  <InfoRow
                    label={t("gameViewer.routine")}
                    value={hidden.routine}
                  />
                ) : null}
                {hidden.currentThought ? (
                  <InfoRow
                    label={t("gameViewer.currentThought")}
                    value={hidden.currentThought}
                  />
                ) : null}
                {Array.isArray(hidden.secrets) && hidden.secrets.length > 0 ? (
                  <InfoRow
                    label={t("gameViewer.secrets")}
                    value={renderMarkdownList(hidden.secrets)}
                  />
                ) : null}
              </>
            }
          />
        ) : null}
      </Section>

      {char.skills.length > 0 ? (
        <Section
          id="charSkills"
          title={t("gameViewer.skills")}
          icon="⚡"
          isExpanded={expandedSections.has("charSkills")}
          onToggle={toggleSection}
        >
          <div className="space-y-3">
            {char.skills.map((skill, idx) => (
              <EntityBlock
                key={skill.id || idx}
                className={`border-b ${skill.highlight ? "border-theme-primary/45" : "border-theme-divider/70"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-theme-text text-xs flex items-center gap-2">
                    <span>{getValidIcon(skill.icon, "⚡")}</span>
                    {skill.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 text-theme-text-secondary border border-theme-divider/70">
                    {skill.level}
                  </span>
                </div>

                <InfoRow
                  label={t("description") || "Description"}
                  value={<MarkdownText content={skill.visible.description} />}
                />

                {skill.category ? (
                  <InfoRow
                    label={t("gameViewer.category") || "Category"}
                    value={skill.category}
                  />
                ) : null}

                {Array.isArray(skill.visible.knownEffects) &&
                skill.visible.knownEffects.length > 0 ? (
                  <InfoRow
                    label={t("gameViewer.knownEffects") || "Known Effects"}
                    value={renderMarkdownList(skill.visible.knownEffects)}
                  />
                ) : null}

                {(skill.unlocked || gameState.unlockMode) && skill.hidden ? (
                  <HiddenContent
                    t={t}
                    content={
                      <>
                        {skill.hidden.trueDescription ? (
                          <InfoRow
                            label={t("gameViewer.trueDescription", {
                              defaultValue: "True Description",
                            })}
                            value={
                              <MarkdownText
                                content={skill.hidden.trueDescription}
                              />
                            }
                          />
                        ) : null}
                        {Array.isArray(skill.hidden.hiddenEffects) &&
                        skill.hidden.hiddenEffects.length > 0 ? (
                          <InfoRow
                            label={t("gameViewer.hiddenEffects")}
                            value={renderMarkdownList(
                              skill.hidden.hiddenEffects,
                            )}
                          />
                        ) : null}
                        {Array.isArray(skill.hidden.drawbacks) &&
                        skill.hidden.drawbacks.length > 0 ? (
                          <InfoRow
                            label={t("gameViewer.drawbacks")}
                            value={renderMarkdownList(skill.hidden.drawbacks)}
                          />
                        ) : null}
                      </>
                    }
                  />
                ) : null}
              </EntityBlock>
            ))}
          </div>
        </Section>
      ) : null}

      {char.conditions.length > 0 ? (
        <Section
          id="charConditions"
          title={t("gameViewer.conditions")}
          icon="💫"
          isExpanded={expandedSections.has("charConditions")}
          onToggle={toggleSection}
        >
          <div className="space-y-3">
            {char.conditions.map((cond, idx) => (
              <EntityBlock
                key={cond.id || idx}
                className={`border-b ${
                  cond.type === "buff" || cond.type === "debuff"
                    ? "border-theme-primary/45"
                    : "border-theme-divider/70"
                }`}
              >
                <div className="font-semibold text-theme-text text-xs flex items-center gap-2 mb-2">
                  <span>{getValidIcon(cond.icon, "💫")}</span>
                  <span>{cond.name}</span>
                  {cond.type ? (
                    <span className="text-[10px] px-1.5 py-0.5 border border-theme-divider/70 uppercase tracking-[0.08em] text-theme-text-secondary">
                      {t(`sidebar.conditionType.${cond.type}`, {
                        defaultValue: cond.type,
                      })}
                    </span>
                  ) : null}
                  {cond.severity ? (
                    <span className="text-[10px] px-1.5 py-0.5 border border-theme-divider/70 text-theme-text-secondary">
                      {cond.severity}
                    </span>
                  ) : null}
                </div>

                <InfoRow
                  label={t("description") || "Description"}
                  value={<MarkdownText content={cond.visible.description} />}
                />

                {cond.visible?.perceivedSeverity ? (
                  <InfoRow
                    label={
                      t("gameViewer.perceivedSeverity") || "Perceived Severity"
                    }
                    value={cond.visible.perceivedSeverity}
                  />
                ) : null}

                {Array.isArray(cond.effects?.visible) &&
                cond.effects.visible.length > 0 ? (
                  <InfoRow
                    label={t("gameViewer.visibleEffects") || "Effects"}
                    value={renderMarkdownList(cond.effects.visible)}
                  />
                ) : null}

                {(cond.unlocked || gameState.unlockMode) && cond.hidden ? (
                  <HiddenContent
                    t={t}
                    content={
                      <>
                        {cond.hidden.trueCause ? (
                          <InfoRow
                            label={t("gameViewer.trueCause")}
                            value={
                              <MarkdownText content={cond.hidden.trueCause} />
                            }
                          />
                        ) : null}
                        {cond.hidden.progression ? (
                          <InfoRow
                            label={t("gameViewer.progression")}
                            value={
                              <MarkdownText content={cond.hidden.progression} />
                            }
                          />
                        ) : null}
                        {cond.hidden.cure ? (
                          <InfoRow
                            label={t("gameViewer.cure")}
                            value={<MarkdownText content={cond.hidden.cure} />}
                          />
                        ) : null}
                        {cond.hidden.actualSeverity ? (
                          <InfoRow
                            label={t("hidden.severity")}
                            value={
                              <MarkdownText
                                content={cond.hidden.actualSeverity}
                              />
                            }
                          />
                        ) : null}
                        {Array.isArray(cond.effects?.hidden) &&
                        cond.effects.hidden.length > 0 ? (
                          <InfoRow
                            label={t("gameViewer.hiddenEffects")}
                            value={renderMarkdownList(cond.effects.hidden)}
                          />
                        ) : null}
                      </>
                    }
                  />
                ) : null}
              </EntityBlock>
            ))}
          </div>
        </Section>
      ) : null}

      {Array.isArray(char.hiddenTraits) && char.hiddenTraits.length > 0 ? (
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
                <EntityBlock
                  key={trait.id || trait.name || idx}
                  className="border-b border-theme-primary/45"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-theme-text text-xs flex items-center gap-2">
                      <span>{getValidIcon(trait.icon, "🎭")}</span>
                      {trait.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 border border-theme-divider/70 text-theme-text-secondary uppercase tracking-[0.08em] font-semibold">
                      {t("gameViewer.hiddenLabel")}
                    </span>
                  </div>

                  <InfoRow
                    label={t("description") || "Description"}
                    value={<MarkdownText content={trait.description} />}
                  />

                  {Array.isArray(trait.effects) && trait.effects.length > 0 ? (
                    <InfoRow
                      label={t("gameViewer.effects")}
                      value={renderMarkdownList(trait.effects)}
                    />
                  ) : null}
                </EntityBlock>
              );
            })}

            {char.hiddenTraits.every(
              (tr) => !(tr.unlocked || gameState.unlockMode),
            ) ? (
              <EmptyState
                message={
                  t("gameViewer.noHiddenTraitsRevealed") ||
                  "No hidden traits revealed."
                }
              />
            ) : null}
          </div>
        </Section>
      ) : null}
    </div>
  );
};
