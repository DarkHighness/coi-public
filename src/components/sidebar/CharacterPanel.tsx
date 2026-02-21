import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActorProfile,
  CharacterCondition,
  CharacterSkill,
  CharacterStatus,
  HiddenTrait,
  Location,
} from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { resolveLocationDisplayName } from "../../utils/entityDisplay";
import { SidebarTag } from "./SidebarTag";
import { SidebarEntityRow } from "./SidebarEntityRow";
import { SidebarField, SidebarSection } from "./SidebarSections";
import { pickFirstText } from "./panelText";
import { SidebarPanelHeader } from "./SidebarPanelHeader";

interface CharacterPanelProps {
  character: CharacterStatus;
  playerProfile?: ActorProfile | null;
  unlockMode?: boolean;
  locations?: Location[];
  themeFont: string;
}

const DISPLAY_PLACEHOLDER_VALUES = new Set([
  "",
  "loading...",
  "initializing...",
  "pending",
  "unknown",
  "加载中",
  "初始化中",
  "未知",
  "待定",
]);

const normalizeDisplayText = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const isDisplayPlaceholder = (value: unknown): boolean => {
  const normalized = normalizeDisplayText(value);
  if (!normalized) {
    return true;
  }
  return DISPLAY_PLACEHOLDER_VALUES.has(normalized.toLowerCase());
};

const pickDisplayValue = (candidates: unknown[], fallback: string): string => {
  for (const candidate of candidates) {
    const normalized = normalizeDisplayText(candidate);
    if (!normalized || isDisplayPlaceholder(normalized)) {
      continue;
    }
    return normalized;
  }
  return fallback;
};

const ConditionRow: React.FC<{
  condition: CharacterCondition;
  unlockMode?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ condition, unlockMode, isExpanded, onToggle }) => {
  const { t } = useTranslation();
  const canRevealHidden = Boolean(
    (unlockMode || condition.unlocked) && condition.hidden,
  );
  return (
    <SidebarEntityRow
      title={condition.name}
      icon={getValidIcon(condition.icon, "⚡")}
      tags={
        <>
          <SidebarTag className="text-theme-text-secondary border-theme-divider/70 text-[10px]">
            {condition.type}
          </SidebarTag>
          {condition.severity ? (
            <SidebarTag className="text-theme-text-secondary border-theme-divider/70 text-[10px]">
              {condition.severity}
            </SidebarTag>
          ) : null}
          {condition.startTime ? (
            <SidebarTag className="text-theme-text-secondary border-theme-divider/70 text-[10px]">
              {condition.startTime}
            </SidebarTag>
          ) : null}
          {condition.unlocked ? (
            <SidebarTag className="text-theme-primary border-theme-primary/60">
              {t("unlocked") || "Unlocked"}
            </SidebarTag>
          ) : null}
        </>
      }
      summary={pickFirstText(
        condition.visible?.description,
        condition.hidden?.trueCause,
      )}
      isExpanded={isExpanded}
      onToggle={onToggle}
      accentClassName={
        isExpanded ? "border-l-theme-primary/70" : "border-l-theme-divider/70"
      }
    >
      <div className="pl-2 pr-1 pb-3 text-xs text-theme-text">
        <SidebarSection title={t("visible") || "Visible"} withDivider={false}>
          <SidebarField label={t("description") || "Description"}>
            <MarkdownText
              content={
                condition.visible?.description ||
                t("noDescription") ||
                "No description"
              }
              indentSize={2}
            />
          </SidebarField>

          {condition.visible?.perceivedSeverity ? (
            <SidebarField label={t("character.severity") || "Severity"}>
              {condition.visible.perceivedSeverity}
            </SidebarField>
          ) : null}

          {condition.effects?.visible?.length ? (
            <SidebarField label={t("effects") || "Effects"}>
              <ul className="list-disc list-inside space-y-1">
                {condition.effects.visible.map((effect, index) => (
                  <li key={`${effect}-${index}`}>
                    <MarkdownText content={effect} indentSize={2} inline />
                  </li>
                ))}
              </ul>
            </SidebarField>
          ) : null}
        </SidebarSection>

        {canRevealHidden ? (
          <SidebarSection
            title={t("hidden.truth") || "Hidden"}
            className="sidebar-hidden-divider"
          >
            {condition.hidden.trueCause ? (
              <SidebarField label={t("hidden.cause") || "Cause"}>
                <MarkdownText
                  content={condition.hidden.trueCause}
                  indentSize={2}
                />
              </SidebarField>
            ) : null}
            {condition.hidden.actualSeverity ? (
              <SidebarField label={t("hidden.severity") || "Actual Severity"}>
                {condition.hidden.actualSeverity}
              </SidebarField>
            ) : null}
            {condition.hidden.progression ? (
              <SidebarField label={t("hidden.progression") || "Progression"}>
                <MarkdownText
                  content={condition.hidden.progression}
                  indentSize={2}
                />
              </SidebarField>
            ) : null}
            {condition.hidden.cure ? (
              <SidebarField label={t("hidden.cure") || "Cure"}>
                <MarkdownText content={condition.hidden.cure} indentSize={2} />
              </SidebarField>
            ) : null}
            {condition.effects?.hidden?.length ? (
              <SidebarField label={t("hidden.effects") || "Hidden Effects"}>
                <ul className="list-disc list-inside space-y-1">
                  {condition.effects.hidden.map((effect, index) => (
                    <li key={`${effect}-${index}`}>
                      <MarkdownText content={effect} indentSize={2} inline />
                    </li>
                  ))}
                </ul>
              </SidebarField>
            ) : null}
          </SidebarSection>
        ) : null}

        <SidebarSection title={t("meta") || "Meta"}>
          <SidebarField label={t("id") || "ID"}>{condition.id}</SidebarField>
          {condition.unlockReason ? (
            <SidebarField label={t("unlockReason") || "Unlock Reason"}>
              <MarkdownText content={condition.unlockReason} indentSize={2} />
            </SidebarField>
          ) : null}
        </SidebarSection>
      </div>
    </SidebarEntityRow>
  );
};

const SkillRow: React.FC<{
  skill: CharacterSkill;
  unlockMode?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ skill, unlockMode, isExpanded, onToggle }) => {
  const { t } = useTranslation();
  const canRevealHidden = Boolean(
    (unlockMode || skill.unlocked) && skill.hidden,
  );
  return (
    <SidebarEntityRow
      title={skill.name}
      icon={getValidIcon(skill.icon, "⭐")}
      tags={
        <>
          {skill.category ? (
            <SidebarTag className="text-theme-text-secondary border-theme-divider/70 text-[10px]">
              {skill.category}
            </SidebarTag>
          ) : null}
          {skill.level ? (
            <SidebarTag className="text-theme-text-secondary border-theme-divider/70 text-[10px]">
              {skill.level}
            </SidebarTag>
          ) : null}
          {skill.unlocked ? (
            <SidebarTag className="text-theme-primary border-theme-primary/60">
              {t("unlocked") || "Unlocked"}
            </SidebarTag>
          ) : null}
        </>
      }
      summary={pickFirstText(
        skill.visible?.description,
        skill.hidden?.trueDescription,
      )}
      isExpanded={isExpanded}
      onToggle={onToggle}
      accentClassName={
        isExpanded ? "border-l-theme-primary/70" : "border-l-theme-divider/70"
      }
    >
      <div className="pl-2 pr-1 pb-3 text-xs text-theme-text">
        <SidebarSection title={t("visible") || "Visible"} withDivider={false}>
          <SidebarField label={t("description") || "Description"}>
            <MarkdownText
              content={
                skill.visible?.description ||
                t("noDescription") ||
                "No description"
              }
              indentSize={2}
            />
          </SidebarField>

          {skill.visible?.knownEffects?.length ? (
            <SidebarField
              label={t("knownEffects") || t("effects") || "Known Effects"}
            >
              <ul className="list-disc list-inside space-y-1">
                {skill.visible.knownEffects.map((effect, index) => (
                  <li key={`${effect}-${index}`}>
                    <MarkdownText content={effect} indentSize={2} inline />
                  </li>
                ))}
              </ul>
            </SidebarField>
          ) : null}
        </SidebarSection>

        {canRevealHidden ? (
          <SidebarSection
            title={t("hidden.truth") || "Hidden"}
            className="sidebar-hidden-divider"
          >
            {skill.hidden.trueDescription ? (
              <SidebarField label={t("hidden.truth") || "Truth"}>
                <MarkdownText
                  content={skill.hidden.trueDescription}
                  indentSize={2}
                />
              </SidebarField>
            ) : null}
            {skill.hidden.hiddenEffects?.length ? (
              <SidebarField label={t("hidden.effects") || "Hidden Effects"}>
                <ul className="list-disc list-inside space-y-1">
                  {skill.hidden.hiddenEffects.map((effect, index) => (
                    <li key={`${effect}-${index}`}>
                      <MarkdownText content={effect} indentSize={2} inline />
                    </li>
                  ))}
                </ul>
              </SidebarField>
            ) : null}
            {skill.hidden.drawbacks?.length ? (
              <SidebarField label={t("hidden.drawbacks") || "Drawbacks"}>
                <ul className="list-disc list-inside space-y-1">
                  {skill.hidden.drawbacks.map((effect, index) => (
                    <li key={`${effect}-${index}`}>
                      <MarkdownText content={effect} indentSize={2} inline />
                    </li>
                  ))}
                </ul>
              </SidebarField>
            ) : null}
          </SidebarSection>
        ) : null}

        <SidebarSection title={t("meta") || "Meta"}>
          <SidebarField label={t("id") || "ID"}>{skill.id}</SidebarField>
          {skill.unlockReason ? (
            <SidebarField label={t("unlockReason") || "Unlock Reason"}>
              <MarkdownText content={skill.unlockReason} indentSize={2} />
            </SidebarField>
          ) : null}
        </SidebarSection>
      </div>
    </SidebarEntityRow>
  );
};

const TraitRow: React.FC<{
  trait: HiddenTrait;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ trait, isExpanded, onToggle }) => {
  const { t } = useTranslation();
  return (
    <SidebarEntityRow
      title={trait.name}
      icon={getValidIcon(trait.icon, "🧩")}
      tags={
        trait.unlocked ? (
          <SidebarTag className="text-theme-primary border-theme-primary/60">
            {t("unlocked") || "Unlocked"}
          </SidebarTag>
        ) : undefined
      }
      summary={pickFirstText(trait.description)}
      isExpanded={isExpanded}
      onToggle={onToggle}
      accentClassName={
        isExpanded ? "border-l-theme-primary/70" : "border-l-theme-divider/70"
      }
    >
      <div className="pl-2 pr-1 pb-3 text-xs text-theme-text">
        <SidebarSection title={t("visible") || "Visible"} withDivider={false}>
          <SidebarField label={t("description") || "Description"}>
            <MarkdownText
              content={
                trait.description || t("noDescription") || "No description"
              }
              indentSize={2}
            />
          </SidebarField>

          {trait.effects?.length ? (
            <SidebarField label={t("effects") || "Effects"}>
              <ul className="list-disc list-inside space-y-1">
                {trait.effects.map((effect, index) => (
                  <li key={`${effect}-${index}`}>
                    <MarkdownText content={effect} indentSize={2} inline />
                  </li>
                ))}
              </ul>
            </SidebarField>
          ) : null}

          {trait.triggerConditions?.length ? (
            <SidebarField label={t("triggerConditions") || "Triggers"}>
              <ul className="list-disc list-inside space-y-1">
                {trait.triggerConditions.map((trigger, index) => (
                  <li key={`${trigger}-${index}`}>
                    <MarkdownText content={trigger} indentSize={2} inline />
                  </li>
                ))}
              </ul>
            </SidebarField>
          ) : null}
        </SidebarSection>

        <SidebarSection title={t("meta") || "Meta"}>
          <SidebarField label={t("id") || "ID"}>{trait.id}</SidebarField>
          <SidebarField label={t("status") || "Status"}>
            {trait.unlocked ? t("unlocked") || "Unlocked" : "Locked"}
          </SidebarField>
          {trait.unlockReason ? (
            <SidebarField label={t("unlockReason") || "Unlock Reason"}>
              <MarkdownText content={trait.unlockReason} indentSize={2} />
            </SidebarField>
          ) : null}
        </SidebarSection>
      </div>
    </SidebarEntityRow>
  );
};

const CharacterPanelComponent: React.FC<CharacterPanelProps> = ({
  character,
  playerProfile,
  unlockMode,
  locations,
  themeFont,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [expandedConditionId, setExpandedConditionId] = useState<string | null>(
    null,
  );
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [expandedTraitId, setExpandedTraitId] = useState<string | null>(null);

  if (!character) {
    return null;
  }

  const unknownText = t("unknown") || "Unknown";
  const titleText = pickDisplayValue(
    [character.title, playerProfile?.visible?.title],
    unknownText,
  );
  const professionText = pickDisplayValue(
    [character.profession, playerProfile?.visible?.profession],
    unknownText,
  );
  const raceText = pickDisplayValue(
    [character.race, playerProfile?.visible?.race],
    unknownText,
  );
  const genderText = pickDisplayValue(
    [character.gender, playerProfile?.visible?.gender],
    unknownText,
  );
  const ageText = pickDisplayValue(
    [character.age, playerProfile?.visible?.age],
    unknownText,
  );
  const statusText = pickDisplayValue(
    [character.status, playerProfile?.visible?.status],
    unknownText,
  );
  const roleTagText =
    normalizeDisplayText(playerProfile?.visible?.roleTag) ?? "";
  const voiceText = normalizeDisplayText(playerProfile?.visible?.voice) ?? "";
  const mannerismText =
    normalizeDisplayText(playerProfile?.visible?.mannerism) ?? "";
  const moodText = normalizeDisplayText(playerProfile?.visible?.mood) ?? "";
  const visibleDescriptionText =
    normalizeDisplayText(playerProfile?.visible?.description) ?? "";
  const profileAppearance = pickFirstText(
    character.appearance,
    playerProfile?.visible?.appearance,
  );
  const profileBackground = pickFirstText(
    character.background,
    playerProfile?.visible?.background,
  );

  const hiddenRaceText =
    normalizeDisplayText(playerProfile?.hidden?.race) ?? "";
  const hiddenGenderText =
    normalizeDisplayText(playerProfile?.hidden?.gender) ?? "";
  const hiddenTrueNameText =
    normalizeDisplayText(playerProfile?.hidden?.trueName) ?? "";
  const hiddenRealPersonalityText =
    normalizeDisplayText(playerProfile?.hidden?.realPersonality) ?? "";
  const hiddenRealMotivesText =
    normalizeDisplayText(playerProfile?.hidden?.realMotives) ?? "";
  const hiddenRoutineText =
    normalizeDisplayText(playerProfile?.hidden?.routine) ?? "";
  const hiddenCurrentThoughtText =
    normalizeDisplayText(playerProfile?.hidden?.currentThought) ?? "";
  const hiddenStatusText =
    normalizeDisplayText(playerProfile?.hidden?.status) ?? "";
  const hiddenSecrets = Array.isArray(playerProfile?.hidden?.secrets)
    ? playerProfile.hidden.secrets
    : [];
  const playerUnlockReason =
    normalizeDisplayText(playerProfile?.unlockReason) ?? "";
  const showHiddenIdentity = Boolean(
    (unlockMode || playerProfile?.unlocked) &&
    (hiddenTrueNameText ||
      hiddenRaceText ||
      hiddenGenderText ||
      hiddenRealPersonalityText ||
      hiddenRealMotivesText ||
      hiddenRoutineText ||
      hiddenCurrentThoughtText ||
      hiddenStatusText ||
      hiddenSecrets.length > 0),
  );

  const currentLocationText = useMemo(() => {
    if (!character.currentLocation) {
      return "";
    }
    return resolveLocationDisplayName(character.currentLocation, {
      locations: locations || [],
    });
  }, [character.currentLocation, locations]);

  const allTraits = character.hiddenTraits || [];

  return (
    <div>
      <SidebarPanelHeader
        title={t("gameViewer.character") || "Character"}
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
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            ></path>
          </svg>
        }
        isOpen={expanded}
        onToggle={() => setExpanded((prev) => !prev)}
        themeFont={themeFont}
        openMarginClassName="mb-4"
      />

      {expanded ? (
        <div className="space-y-3 animate-sidebar-expand">
          <SidebarSection
            title={t("gameViewer.profile") || "Profile"}
            withDivider={false}
          >
            <SidebarField label={t("name") || "Name"}>
              {character.name}
            </SidebarField>
            <SidebarField label={t("gameViewer.titleLabel") || "Title"}>
              {titleText}
            </SidebarField>
            <SidebarField label={t("profession") || t("role") || "Role"}>
              {professionText}
            </SidebarField>
            <SidebarField
              label={t("gameViewer.status") || t("status") || "Status"}
            >
              {statusText}
            </SidebarField>
            {roleTagText ? (
              <SidebarField
                label={t("gameViewer.roleTag") || t("role") || "Role"}
              >
                {roleTagText}
              </SidebarField>
            ) : null}
            <SidebarField label={t("gameViewer.race") || t("race") || "Race"}>
              {raceText}
            </SidebarField>
            <SidebarField label={t("gameViewer.gender") || "Gender"}>
              {genderText}
            </SidebarField>
            <SidebarField label={t("gameViewer.age") || t("age") || "Age"}>
              {ageText}
            </SidebarField>
            {currentLocationText ? (
              <SidebarField
                label={t("gameViewer.currentLocation") || "Location"}
              >
                {currentLocationText}
              </SidebarField>
            ) : null}

            {profileAppearance ? (
              <SidebarField label={t("appearance") || "Appearance"}>
                <MarkdownText content={profileAppearance} indentSize={2} />
              </SidebarField>
            ) : null}

            {profileBackground ? (
              <SidebarField label={t("background") || "Background"}>
                <MarkdownText content={profileBackground} indentSize={2} />
              </SidebarField>
            ) : null}

            {visibleDescriptionText ? (
              <SidebarField label={t("description") || "Description"}>
                <MarkdownText content={visibleDescriptionText} indentSize={2} />
              </SidebarField>
            ) : null}

            {voiceText ? (
              <SidebarField label={t("gameViewer.voice") || "Voice"}>
                {voiceText}
              </SidebarField>
            ) : null}

            {mannerismText ? (
              <SidebarField label={t("gameViewer.mannerism") || "Mannerism"}>
                {mannerismText}
              </SidebarField>
            ) : null}

            {moodText ? (
              <SidebarField label={t("gameViewer.mood") || "Mood"}>
                {moodText}
              </SidebarField>
            ) : null}

            {character.psychology ? (
              <SidebarField label={t("gameViewer.psychology") || "Psychology"}>
                <div className="space-y-1">
                  {character.psychology.coreTrauma ? (
                    <div>
                      <span className="text-theme-text-secondary mr-1">
                        {t("gameViewer.coreTrauma") || "Core Trauma"}:
                      </span>
                      {character.psychology.coreTrauma}
                    </div>
                  ) : null}
                  {character.psychology.copingMechanism ? (
                    <div>
                      <span className="text-theme-text-secondary mr-1">
                        {t("gameViewer.copingMechanism") || "Coping"}:
                      </span>
                      {character.psychology.copingMechanism}
                    </div>
                  ) : null}
                  {character.psychology.internalContradiction ? (
                    <div>
                      <span className="text-theme-text-secondary mr-1">
                        {t("gameViewer.internalContradiction") ||
                          "Contradiction"}
                        :
                      </span>
                      {character.psychology.internalContradiction}
                    </div>
                  ) : null}
                </div>
              </SidebarField>
            ) : null}

            {showHiddenIdentity ? (
              <div className="pt-2 mt-2 border-t border-theme-divider/60 space-y-2">
                <div className="text-[10px] uppercase tracking-[0.14em] text-theme-primary font-semibold">
                  {t("gameViewer.hiddenLabel") || "Hidden"}
                </div>
                {hiddenTrueNameText ? (
                  <SidebarField
                    label={
                      t("gameViewer.trueName") ||
                      t("sidebar.npc.trueName") ||
                      "True Name"
                    }
                  >
                    {hiddenTrueNameText}
                  </SidebarField>
                ) : null}
                {hiddenRaceText ? (
                  <SidebarField label={t("gameViewer.race") || "Race"}>
                    {hiddenRaceText}
                  </SidebarField>
                ) : null}
                {hiddenGenderText ? (
                  <SidebarField label={t("gameViewer.gender") || "Gender"}>
                    {hiddenGenderText}
                  </SidebarField>
                ) : null}
                {hiddenStatusText ? (
                  <SidebarField
                    label={t("hidden.actualStatus") || "Actual Status"}
                  >
                    {hiddenStatusText}
                  </SidebarField>
                ) : null}
                {hiddenRealPersonalityText ? (
                  <SidebarField
                    label={
                      t("hidden.personality") ||
                      t("gameViewer.realPersonality") ||
                      "Personality"
                    }
                  >
                    <MarkdownText
                      content={hiddenRealPersonalityText}
                      indentSize={2}
                    />
                  </SidebarField>
                ) : null}
                {hiddenRealMotivesText ? (
                  <SidebarField
                    label={
                      t("hidden.motives") ||
                      t("gameViewer.realMotives") ||
                      "Motives"
                    }
                  >
                    <MarkdownText
                      content={hiddenRealMotivesText}
                      indentSize={2}
                    />
                  </SidebarField>
                ) : null}
                {hiddenRoutineText ? (
                  <SidebarField label={t("hidden.routine") || "Routine"}>
                    <MarkdownText content={hiddenRoutineText} indentSize={2} />
                  </SidebarField>
                ) : null}
                {hiddenCurrentThoughtText ? (
                  <SidebarField
                    label={
                      t("gameViewer.currentThought") ||
                      t("sidebar.npc.currentThought") ||
                      "Current Thought"
                    }
                  >
                    <MarkdownText
                      content={hiddenCurrentThoughtText}
                      indentSize={2}
                    />
                  </SidebarField>
                ) : null}
                {hiddenSecrets.length ? (
                  <SidebarField label={t("hidden.secrets") || "Secrets"}>
                    <ul className="list-disc list-inside space-y-1">
                      {hiddenSecrets.map((secret, index) => (
                        <li key={`${secret}-${index}`}>
                          <MarkdownText
                            content={secret}
                            indentSize={2}
                            inline
                          />
                        </li>
                      ))}
                    </ul>
                  </SidebarField>
                ) : null}
                {playerUnlockReason ? (
                  <SidebarField label={t("unlockReason") || "Unlock Reason"}>
                    <MarkdownText content={playerUnlockReason} indentSize={2} />
                  </SidebarField>
                ) : null}
              </div>
            ) : null}
          </SidebarSection>

          <SidebarSection
            title={
              t("gameViewer.conditions") || t("conditions") || "Conditions"
            }
          >
            {character.conditions?.length ? (
              <div className="space-y-2">
                {character.conditions.map((condition) => (
                  <ConditionRow
                    key={condition.id || condition.name}
                    condition={condition}
                    unlockMode={unlockMode}
                    isExpanded={expandedConditionId === condition.id}
                    onToggle={() =>
                      setExpandedConditionId((prev) =>
                        prev === condition.id ? null : condition.id,
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="text-theme-text-secondary text-xs italic py-2">
                {t("noConditions") || "No active conditions."}
              </div>
            )}
          </SidebarSection>

          {character.skills?.length ? (
            <SidebarSection
              title={t("gameViewer.skills") || t("skills") || "Skills"}
            >
              <div className="space-y-2">
                {character.skills.map((skill) => (
                  <SkillRow
                    key={skill.id || skill.name}
                    skill={skill}
                    unlockMode={unlockMode}
                    isExpanded={expandedSkillId === skill.id}
                    onToggle={() =>
                      setExpandedSkillId((prev) =>
                        prev === skill.id ? null : skill.id,
                      )
                    }
                  />
                ))}
              </div>
            </SidebarSection>
          ) : null}

          {allTraits.length ? (
            <SidebarSection title={t("traits") || "Traits"}>
              <div className="space-y-2">
                {allTraits.map((trait) => (
                  <TraitRow
                    key={trait.id || trait.name}
                    trait={trait}
                    isExpanded={expandedTraitId === trait.id}
                    onToggle={() =>
                      setExpandedTraitId((prev) =>
                        prev === trait.id ? null : trait.id,
                      )
                    }
                  />
                ))}
              </div>
            </SidebarSection>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export const CharacterPanel = React.memo(CharacterPanelComponent);
