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

const colorMap: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  purple: "#8b5cf6",
  gray: "#94a3b8",
};

const ConditionRow: React.FC<{
  condition: CharacterCondition;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ condition, isExpanded, onToggle }) => {
  const { t } = useTranslation();
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

        {condition.unlocked && condition.hidden ? (
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
      </div>
    </SidebarEntityRow>
  );
};

const SkillRow: React.FC<{
  skill: CharacterSkill;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ skill, isExpanded, onToggle }) => {
  const { t } = useTranslation();
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

        {skill.unlocked && skill.hidden ? (
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
  const titleText = pickDisplayValue([character.title], unknownText);
  const professionText = pickDisplayValue([character.profession], unknownText);
  const raceText = pickDisplayValue(
    [character.race, playerProfile?.visible?.race],
    unknownText,
  );
  const genderText = pickDisplayValue(
    [character.gender, playerProfile?.visible?.gender],
    unknownText,
  );
  const ageText = normalizeDisplayText(character.age) ?? unknownText;
  const statusText = pickDisplayValue([character.status], unknownText);

  const hiddenRaceText =
    normalizeDisplayText(playerProfile?.hidden?.race) ?? "";
  const hiddenGenderText =
    normalizeDisplayText(playerProfile?.hidden?.gender) ?? "";
  const showHiddenIdentity = Boolean(
    (unlockMode || playerProfile?.unlocked) &&
    (hiddenRaceText || hiddenGenderText),
  );

  const currentLocationText = useMemo(() => {
    if (!character.currentLocation) {
      return "";
    }
    return resolveLocationDisplayName(character.currentLocation, {
      locations: locations || [],
    });
  }, [character.currentLocation, locations]);

  const unlockedTraits = (character.hiddenTraits || []).filter(
    (trait) => trait.unlocked,
  );

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

            {character.appearance ? (
              <SidebarField label={t("appearance") || "Appearance"}>
                <MarkdownText content={character.appearance} indentSize={2} />
              </SidebarField>
            ) : null}

            {character.background ? (
              <SidebarField label={t("background") || "Background"}>
                <MarkdownText content={character.background} indentSize={2} />
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
              </div>
            ) : null}
          </SidebarSection>

          {character.attributes?.length ? (
            <SidebarSection
              title={
                t("gameViewer.attributes") || t("attributes") || "Attributes"
              }
            >
              <div className="space-y-2">
                {character.attributes.map((attr, idx) => (
                  <div key={`${attr.label}-${idx}`} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-theme-text flex items-center gap-1.5 min-w-0">
                        <span className="ui-emoji-slot">
                          {getValidIcon(attr.icon, "📊")}
                        </span>
                        <span className="truncate">{attr.label}</span>
                      </span>
                      <span className="text-[11px] font-mono text-theme-text-secondary">
                        {attr.value}
                        {attr.maxValue ? `/${attr.maxValue}` : ""}
                      </span>
                    </div>
                    {attr.maxValue ? (
                      <div className="h-1.5 w-full bg-theme-divider/60 overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, (attr.value / attr.maxValue) * 100),
                            )}%`,
                            backgroundColor:
                              colorMap[attr.color || "gray"] || colorMap.gray,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </SidebarSection>
          ) : null}

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

          {unlockedTraits.length ? (
            <SidebarSection title={t("traits") || "Traits"}>
              <div className="space-y-2">
                {unlockedTraits.map((trait) => (
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
