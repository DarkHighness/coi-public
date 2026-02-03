import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  CharacterStatus,
  CharacterSkill,
  CharacterCondition,
  HiddenTrait,
} from "../../types";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { useOptionalGameEngineContext } from "../../contexts/GameEngineContext";

interface CharacterPanelProps {
  character: CharacterStatus;
  themeFont: string;
}

const colorMap: Record<string, string> = {
  red: "from-red-600 to-red-500",
  blue: "from-blue-600 to-blue-400",
  green: "from-green-600 to-green-400",
  yellow: "from-yellow-600 to-yellow-400",
  purple: "from-purple-600 to-purple-400",
  gray: "from-gray-600 to-gray-400",
};

const getStatusConfig = (condition: CharacterCondition) => {
  const matchedKey = condition.type;

  switch (matchedKey) {
    case "poison":
      return {
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M23 12c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-4 9c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-4-18c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-6.1 1.1c.4-.8 1.2-1.1 2.1-.7.8.4 1.1 1.2.7 2.1-.4.8-1.2 1.1-2.1.7-.8-.4-1.1-1.2-.7-2.1zM3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm3.9 7.9c-.4.8-1.2 1.1-2.1.7-.8-.4-1.1-1.2-.7-2.1.4-.8 1.2-1.1 2.1-.7.8.4 1.1 1.2.7 2.1zM12 6a6 6 0 100 12 6 6 0 000-12z"
            ></path>
          </svg>
        ),
        accentText: "text-purple-400",
        accentBorder: "border-l-purple-400/60",
      };
    case "wound":
    case "debuff":
      return {
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            ></path>
          </svg>
        ),
        accentText: "text-red-400",
        accentBorder: "border-l-red-400/60",
      };
    case "normal":
      return {
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            ></path>
          </svg>
        ),
        accentText: "text-emerald-400",
        accentBorder: "border-l-emerald-400/60",
      };
    case "buff":
      return {
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            ></path>
          </svg>
        ),
        accentText: "text-amber-400",
        accentBorder: "border-l-amber-400/60",
      };
    case "dead":
    case "unconscious":
      return {
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            ></path>
          </svg>
        ),
        accentText: "text-gray-400",
        accentBorder: "border-l-gray-400/50",
      };
    case "tired":
      return {
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
        ),
        accentText: "text-orange-400",
        accentBorder: "border-l-orange-400/60",
      };
    case "mental":
      return {
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            ></path>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            ></path>
          </svg>
        ),
        accentText: "text-theme-primary",
        accentBorder: "border-l-theme-primary/60",
      };
    case "curse":
      return {
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            ></path>
          </svg>
        ),
        accentText: "text-pink-400",
        accentBorder: "border-l-pink-400/60",
      };
    case "stun":
      return {
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            ></path>
          </svg>
        ),
        accentText: "text-yellow-400",
        accentBorder: "border-l-yellow-400/60",
      };
    default:
      // Default generic
      return {
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
        ),
        accentText: "text-theme-primary",
        accentBorder: "border-l-theme-border/40",
      };
  }
};

// Sub-component for individual skills to handle expansion state
const SkillItem: React.FC<{ skill: CharacterSkill }> = ({ skill }) => {
  const { t } = useTranslation();
  const engine = useOptionalGameEngineContext();
  const clearHighlight = engine?.actions.clearHighlight;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHighlight, setIsHighlight] = useState(skill.highlight || false);

  useEffect(() => {
    setIsHighlight(skill.highlight || false);
  }, [skill.highlight]);

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    if (isHighlight) {
      setIsHighlight(false);
      clearHighlight?.({
        kind: "characterSkills",
        id: skill.id,
        name: skill.name,
      });
    }
  };

  return (
    <div
      className={`relative border-l-2 border-b border-theme-border/25 transition-colors mb-2 pb-2 group w-full cursor-pointer
        ${isExpanded ? "border-l-theme-primary/70 bg-theme-surface-highlight/15" : "border-l-theme-border/50 hover:bg-theme-surface-highlight/20"}
        ${isHighlight ? "border-l-theme-primary animate-pulse" : ""}
      `}
      onClick={handleClick}
    >
      <div className="py-2 pl-2 pr-1 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none shrink-0">
              {getValidIcon(skill.icon, "⭐")}
            </span>
            <span className="text-xs text-theme-text font-bold break-words whitespace-normal">
              {skill.name}
            </span>
            {skill.unlocked && (
              <span
                className="text-theme-primary shrink-0"
                title={t("unlocked") || "Unlocked"}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                </svg>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {skill.category && (
            <span className="text-[10px] text-theme-muted uppercase tracking-wider whitespace-nowrap">
              {skill.category}
            </span>
          )}
          {skill.level && (
            <span className="text-[10px] text-theme-primary uppercase tracking-wider whitespace-nowrap">
              {skill.level}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-theme-muted transition-transform duration-200 mt-0.5 ${isExpanded ? "rotate-180" : ""}`}
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
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pl-3 pr-2 pb-3 pt-0 space-y-3">
            <div className="text-xs text-theme-muted leading-relaxed border-t border-theme-border/30 pt-2">
              <MarkdownText
                content={
                  skill.visible?.description ||
                  t("noDescription") ||
                  "No description"
                }
                indentSize={2}
              />
            </div>

            {/* Unlocked Hidden Truth - Outer Layer */}
            {skill.unlocked && skill.hidden?.trueDescription && (
              <div className="pt-2 border-l border-theme-border/25 pl-3">
                <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold flex items-center gap-1 mb-1">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {t("hidden.truth")}
                </span>
                <div className="text-xs text-theme-text leading-relaxed">
                  <MarkdownText
                    content={skill.hidden.trueDescription}
                    indentSize={2}
                  />
                </div>
                {skill.hidden.hiddenEffects &&
                  skill.hidden.hiddenEffects.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[10px] uppercase tracking-wider text-theme-primary block mb-1">
                        {t("hidden.effects")}:
                      </span>
                      <ul className="list-disc list-inside text-theme-text space-y-1 text-xs">
                        {skill.hidden.hiddenEffects.map((effect, i) => (
                          <li key={i}>
                            <MarkdownText
                              content={effect}
                              indentSize={2}
                              inline
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                {skill.hidden.drawbacks &&
                  skill.hidden.drawbacks.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[10px] uppercase tracking-wider text-theme-primary block mb-1">
                        {t("hidden.drawbacks")}:
                      </span>
                      <ul className="list-disc list-inside text-theme-text space-y-1 text-xs">
                        {skill.hidden.drawbacks.map((drawback, i) => (
                          <li key={i}>
                            <MarkdownText
                              content={drawback}
                              indentSize={2}
                              inline
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-component for individual conditions to handle expansion state
const ConditionItem: React.FC<{ condition: CharacterCondition }> = ({
  condition,
}) => {
  const { t } = useTranslation();
  const engine = useOptionalGameEngineContext();
  const clearHighlight = engine?.actions.clearHighlight;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHighlight, setIsHighlight] = useState(condition.highlight || false);

  const { icon, accentBorder, accentText } = getStatusConfig(condition);

  useEffect(() => {
    setIsHighlight(condition.highlight || false);
  }, [condition.highlight]);

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    if (isHighlight) {
      setIsHighlight(false);
      clearHighlight?.({
        kind: "characterConditions",
        id: condition.id,
        name: condition.name,
      });
    }
  };

  return (
    <div
      className={`relative border-l-2 border-b border-theme-border/25 transition-colors mb-2 pb-2 cursor-pointer
        ${accentBorder} ${accentText}
        ${isExpanded ? "bg-theme-surface-highlight/15" : "hover:bg-theme-surface-highlight/20"}
        ${isHighlight ? "border-l-theme-primary animate-pulse" : ""}
      `}
      onClick={handleClick}
    >
      <div className="py-2 pl-2 pr-1">
        <div className="flex justify-between items-start gap-2">
          <span className="font-bold flex items-center gap-2 text-xs text-theme-text">
            {condition.icon && getValidIcon(condition.icon, "") ? (
              <span className="mr-1 text-base">
                {getValidIcon(condition.icon, "")}
              </span>
            ) : (
              <span className="opacity-90">{icon}</span>
            )}
            {condition.name}
            {condition.unlocked && (
              <span
                className="text-theme-primary shrink-0"
                title={t("unlocked") || "Unlocked"}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                </svg>
              </span>
            )}
          </span>

          <div className="flex items-center gap-2 text-[10px] text-theme-muted uppercase tracking-wider whitespace-nowrap shrink-0">
            {condition.duration && <span>{condition.duration}</span>}
            {condition.startTime && <span>{condition.startTime}</span>}
            {condition.severity && <span>{condition.severity}</span>}
            <svg
              className={`w-4 h-4 text-theme-muted transition-transform duration-200 mt-0.5 ${isExpanded ? "rotate-180" : ""}`}
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
          </div>
        </div>

        {condition.visible?.description && (
          <div className="text-xs leading-relaxed opacity-90 text-theme-muted mt-1">
            <MarkdownText
              content={condition.visible.description}
              indentSize={2}
            />
          </div>
        )}

        {/* Expanded content */}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ${
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="pt-2 border-t border-theme-border/30 mt-2 space-y-3 pl-3 border-l border-theme-border/25">
              {condition.visible?.perceivedSeverity && (
                <p className="text-xs opacity-80">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    {t("character.severity") || "Severity:"}
                  </span>{" "}
                  {condition.visible.perceivedSeverity}
                </p>
              )}

              {/* Visible Effects */}
              {condition.effects?.visible &&
                condition.effects.visible.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider opacity-80 block mb-1">
                      {t("effects") || "Effects"}:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-xs opacity-90">
                      {condition.effects.visible.map((effect, i) => (
                        <li key={i}>
                          <MarkdownText
                            content={effect}
                            indentSize={2}
                            inline
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Unlocked Hidden Information - Outer Layer */}

              {/* Unlocked Hidden Information - Outer Layer */}
              {condition.unlocked && (
                <div className="pt-1 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold flex items-center gap-1 mb-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t("hidden.truth")}
                  </span>

                  {condition.hidden?.trueCause && (
                    <div className="text-xs text-theme-text leading-relaxed">
                      <MarkdownText
                        content={condition.hidden.trueCause}
                        indentSize={2}
                      />
                    </div>
                  )}
                  {condition.hidden?.actualSeverity && (
                    <p className="text-xs text-theme-text">
                      <span className="font-semibold text-theme-primary">
                        {t("hidden.severity")}:
                      </span>{" "}
                      {condition.hidden.actualSeverity}
                    </p>
                  )}
                  {condition.hidden?.progression && (
                    <div className="text-xs text-theme-text">
                      <span className="font-semibold text-theme-primary block mb-0.5">
                        {t("hidden.progression")}:
                      </span>{" "}
                      <MarkdownText
                        content={condition.hidden.progression}
                        indentSize={2}
                      />
                    </div>
                  )}
                  {condition.hidden?.cure && (
                    <div className="text-xs text-theme-text">
                      <span className="font-semibold text-theme-primary block mb-0.5">
                        {t("hidden.cure")}:
                      </span>{" "}
                      <MarkdownText
                        content={condition.hidden.cure}
                        indentSize={2}
                      />
                    </div>
                  )}
                  {condition.effects?.hidden &&
                    condition.effects.hidden.length > 0 && (
                      <div className="mt-2">
                        <span className="text-[10px] uppercase tracking-wider text-theme-primary block mb-1">
                          {t("hidden.effects")}:
                        </span>
                        <ul className="list-disc list-inside text-theme-text space-y-1 text-xs">
                          {condition.effects.hidden.map((effect, i) => (
                            <li key={i}>
                              <MarkdownText
                                content={effect}
                                indentSize={2}
                                inline
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-component for individual traits to handle expansion state
const TraitItem: React.FC<{ trait: HiddenTrait }> = ({ trait }) => {
  const { t } = useTranslation();
  const engine = useOptionalGameEngineContext();
  const clearHighlight = engine?.actions.clearHighlight;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHighlight, setIsHighlight] = useState(trait.highlight || false);

  useEffect(() => {
    setIsHighlight(trait.highlight || false);
  }, [trait.highlight]);

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    if (isHighlight) {
      setIsHighlight(false);
      clearHighlight?.({
        kind: "characterTraits",
        id: trait.id,
        name: trait.name,
      });
    }
  };

  return (
    <div
      className={`relative border-l-2 border-b border-theme-border/25 transition-colors mb-2 pb-2 cursor-pointer
        ${isExpanded ? "border-l-theme-primary/70 bg-theme-surface-highlight/15" : "border-l-theme-border/50 hover:bg-theme-surface-highlight/20"}
        ${isHighlight ? "border-l-theme-primary animate-pulse" : ""}
      `}
      onClick={handleClick}
    >
      <div className="py-2 pl-2 pr-1">
        <div className="flex justify-between items-start gap-2">
          <span className="font-bold flex items-center gap-2 text-xs text-theme-text min-w-0">
            {trait.icon && (
              <span className="mr-1 text-base">
                {getValidIcon(trait.icon, "🧩")}
              </span>
            )}
            <span className="break-words whitespace-normal">{trait.name}</span>
          </span>
          <svg
            className={`w-4 h-4 text-theme-muted transition-transform duration-200 mt-0.5 ${
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
            ></path>
          </svg>
        </div>

        {trait.description && (
          <div className="text-xs text-theme-muted leading-relaxed mt-1">
            <MarkdownText content={trait.description} indentSize={2} />
          </div>
        )}

        <div
          className={`grid transition-[grid-template-rows] duration-300 ${
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="pt-2 border-t border-theme-border/30 mt-2 space-y-3 pl-3 border-l border-theme-border/25">
              {trait.effects && trait.effects.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-theme-primary block mb-1">
                    {t("effects") || "Effects"}:
                  </span>
                  <ul className="list-disc list-inside text-theme-text space-y-1 text-xs">
                    {trait.effects.map((effect, i) => (
                      <li key={i}>
                        <MarkdownText content={effect} indentSize={2} inline />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {trait.triggerConditions &&
                trait.triggerConditions.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-theme-primary block mb-1">
                      {t("triggerConditions") || "Triggers"}:
                    </span>
                    <ul className="list-disc list-inside text-theme-text space-y-1 text-xs">
                      {trait.triggerConditions.map((cond, i) => (
                        <li key={i}>
                          <MarkdownText content={cond} indentSize={2} inline />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  character,
  themeFont,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);

  if (!character) return null;

  return (
    <div>
      <div
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center justify-between cursor-pointer group ${
          expanded ? "mb-4" : "mb-0"
        }`}
      >
        <div
          className={`flex items-center text-theme-primary uppercase text-xs font-bold tracking-widest ${themeFont}`}
        >
          <span className="flex items-center gap-2">
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
            {t("gameViewer.character") || "Character"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-theme-muted group-hover:text-theme-primary p-1 transition-colors">
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${
                expanded ? "rotate-180" : ""
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
              ></path>
            </svg>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="space-y-6 animate-[fade-in_0.3s_ease-in]">
          {/* Header Info */}
          <div className="border-l-2 border-theme-border/50 border-b border-theme-border/25 pb-2">
            <div className="py-3 pl-2 pr-1 space-y-3">
              <h3
                className={`text-sm font-bold text-theme-text leading-snug break-words whitespace-normal ${themeFont}`}
              >
                {character.name}
              </h3>

              <div className="border-t border-theme-border/25 divide-y divide-theme-border/20">
                <div className="py-2 flex items-start justify-between gap-3">
                  <span className="text-[10px] uppercase tracking-wider text-theme-muted shrink-0">
                    {t("gameViewer.titleLabel") || "Title"}
                  </span>
                  <span className="text-xs text-theme-primary font-semibold text-right break-words whitespace-normal">
                    {character.title}
                  </span>
                </div>

                <div className="py-2 flex items-start justify-between gap-3">
                  <span className="text-[10px] uppercase tracking-wider text-theme-muted shrink-0">
                    {t("gameViewer.profession") || t("role") || "Role"}
                  </span>
                  <span className="text-xs text-theme-text text-right break-words whitespace-normal">
                    {character.profession}
                  </span>
                </div>

                <div className="py-2 flex items-start justify-between gap-3">
                  <span className="text-[10px] uppercase tracking-wider text-theme-muted shrink-0">
                    {t("gameViewer.race") || t("race") || "Race"}
                  </span>
                  <span className="text-xs text-theme-text text-right break-words whitespace-normal">
                    {character.race}
                  </span>
                </div>

                <div className="py-2 flex items-start justify-between gap-3">
                  <span className="text-[10px] uppercase tracking-wider text-theme-muted shrink-0">
                    {t("gameViewer.age") || t("age") || "Age"}
                  </span>
                  <span className="text-xs text-theme-text text-right break-words whitespace-normal">
                    {character.age}
                  </span>
                </div>

                <div className="py-2 flex items-start justify-between gap-3">
                  <span className="text-[10px] uppercase tracking-wider text-theme-muted shrink-0">
                    {t("gameViewer.status") || t("status") || "Status"}
                  </span>
                  <span className="text-xs text-theme-primary font-medium text-right break-words whitespace-normal">
                    {character.status}
                  </span>
                </div>

                {character.currentLocation && (
                  <div className="py-2 flex items-start justify-between gap-3">
                    <span className="text-[10px] uppercase tracking-wider text-theme-muted shrink-0">
                      {t("gameViewer.currentLocation") || "Location"}
                    </span>
                    <span className="text-xs text-theme-text text-right break-words whitespace-normal inline-flex items-center justify-end gap-1.5">
                      <svg
                        className="w-3.5 h-3.5 text-theme-primary shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {character.currentLocation}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Attributes Grid */}
          {character.attributes && character.attributes.length > 0 && (
            <div className="pt-4 border-t border-theme-border/25">
              <h4 className="text-xs text-theme-muted uppercase tracking-wider mb-2 font-bold">
                {t("gameViewer.attributes") || t("attributes") || "Attributes"}
              </h4>
              <div className="border-t border-theme-border/25">
                {character.attributes.map((attr, idx) => (
                  <div
                    key={attr.label || `attr-${idx}`}
                    className="py-2.5 flex items-center gap-3 border-b border-theme-border/25"
                  >
                    <span className="text-sm leading-none shrink-0 w-4 text-center opacity-90">
                      {getValidIcon(attr.icon, "📊")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-theme-muted uppercase tracking-wider truncate">
                          {attr.label}
                        </span>
                        <span className="text-xs font-bold text-theme-text whitespace-nowrap">
                          {attr.value}
                          {attr.maxValue ? `/${attr.maxValue}` : ""}
                        </span>
                      </div>
                      {attr.maxValue && (
                        <div className="mt-1 h-1 w-full bg-theme-border/20 overflow-hidden">
                          <div
                            className={`h-full ${
                              colorMap[attr.color || "gray"]
                                ? `bg-linear-to-r ${colorMap[attr.color || "gray"]}`
                                : "bg-gray-500"
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(0, (attr.value / attr.maxValue) * 100))}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills List */}
          {character.skills && character.skills.length > 0 && (
            <div className="pt-4 border-t border-theme-border/25">
              <h4 className="text-xs text-theme-muted uppercase tracking-wider mb-3 font-bold">
                {t("gameViewer.skills") || t("skills")}
              </h4>
              <div className="flex flex-col">
                {character.skills.map((skill, idx) => (
                  <SkillItem
                    key={skill.id || skill.name || `skill-${idx}`}
                    skill={skill}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Conditions List */}
          <div className="pt-4 border-t border-theme-border/25">
            <h4 className="text-xs text-theme-muted uppercase tracking-wider mb-3 font-bold">
              {t("gameViewer.conditions") || t("conditions") || "Conditions"}
            </h4>
            {character.conditions && character.conditions.length > 0 ? (
              <div className="flex flex-col">
                {character.conditions.map((cond, idx) => (
                  <ConditionItem
                    key={cond.id || cond.name || `cond-${idx}`}
                    condition={cond}
                  />
                ))}
              </div>
            ) : (
              <div className="text-theme-muted text-xs italic py-2 pl-2 pr-1 border-t border-theme-border/25">
                {t("noConditions") || "No active conditions."}
              </div>
            )}
          </div>

          {/* Hidden Traits (Only Unlocked) */}
          {character.hiddenTraits &&
            character.hiddenTraits.length > 0 &&
            character.hiddenTraits.some((t) => t.unlocked) && (
              <div className="pt-4 border-t border-theme-border/25">
                <h4 className="text-xs text-theme-primary uppercase tracking-wider mb-3 font-bold flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  {t("traits") || "Traits"}
                </h4>
                <div className="flex flex-col">
                  {character.hiddenTraits
                    .filter((t) => t.unlocked)
                    .map((trait, idx) => (
                      <TraitItem
                        key={trait.id || trait.name || `trait-${idx}`}
                        trait={trait}
                      />
                    ))}
                </div>
              </div>
            )}

          {/* Appearance (Collapsible) */}
          {character.appearance && (
            <details className="group text-xs pt-4 border-t border-theme-border/25">
              <summary className="cursor-pointer text-theme-muted hover:text-theme-primary transition-colors list-none flex items-center gap-2">
                <span className="uppercase tracking-wider text-xs font-bold">
                  🧐 {t("appearance") || "Appearance"}
                </span>
                <svg
                  className="w-4 h-4 transition-transform group-open:rotate-90"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </summary>
              <div className="mt-3 text-theme-text-secondary leading-relaxed pl-3 border-l-2 border-theme-border">
                <MarkdownText content={character.appearance} indentSize={2} />
              </div>
            </details>
          )}

          {/* Psychology (Collapsible) - Always visible as it's a top-level field */}
          {character.psychology && (
            <details className="group text-xs pt-4 border-t border-theme-border/25">
              <summary className="cursor-pointer text-theme-muted hover:text-theme-primary transition-colors list-none flex items-center gap-2">
                <span className="uppercase tracking-wider text-xs font-bold">
                  🧠 {t("gameViewer.psychology") || "Psychology"}
                </span>
                <svg
                  className="w-4 h-4 transition-transform group-open:rotate-90"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </summary>
              <div className="mt-3 space-y-2 pl-3 border-l-2 border-theme-border">
                {character.psychology.coreTrauma && (
                  <div className="text-xs text-theme-text">
                    <span className="font-semibold text-theme-primary">
                      {t("gameViewer.coreTrauma") || "Core Trauma"}:
                    </span>{" "}
                    {character.psychology.coreTrauma}
                  </div>
                )}
                {character.psychology.copingMechanism && (
                  <div className="text-xs text-theme-text">
                    <span className="font-semibold text-theme-primary">
                      {t("gameViewer.copingMechanism") || "Coping"}:
                    </span>{" "}
                    {character.psychology.copingMechanism}
                  </div>
                )}
                {character.psychology.internalContradiction && (
                  <div className="text-xs text-theme-text">
                    <span className="font-semibold text-amber-500">
                      {t("gameViewer.internalContradiction") || "Contradiction"}
                      :
                    </span>{" "}
                    {character.psychology.internalContradiction}
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};
