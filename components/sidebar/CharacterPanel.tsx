import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CharacterStatus,
  CharacterSkill,
  CharacterCondition,
} from "../../types";

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

const textMap: Record<string, string> = {
  red: "text-red-400",
  blue: "text-blue-400",
  green: "text-green-400",
  yellow: "text-yellow-400",
  purple: "text-purple-400",
  gray: "text-gray-400",
};

const getStatusConfig = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized.includes("poison") || normalized.includes("toxic")) {
    return {
      icon: (
        <svg
          className="w-3 h-3"
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
      style: "bg-purple-900/20 text-purple-400 border-purple-500/30",
    };
  }
  if (
    normalized.includes("wound") ||
    normalized.includes("injur") ||
    normalized.includes("bleed") ||
    normalized.includes("hurt")
  ) {
    return {
      icon: (
        <svg
          className="w-3 h-3"
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
      style: "bg-red-900/20 text-red-400 border-red-500/30",
    };
  }
  if (
    normalized.includes("health") ||
    normalized.includes("fine") ||
    normalized.includes("good")
  ) {
    return {
      icon: (
        <svg
          className="w-3 h-3"
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
      style: "bg-green-900/20 text-green-400 border-green-500/30",
    };
  }
  if (
    normalized.includes("empower") ||
    normalized.includes("buff") ||
    normalized.includes("strong")
  ) {
    return {
      icon: (
        <svg
          className="w-3 h-3"
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
      style: "bg-yellow-900/20 text-yellow-400 border-yellow-500/30",
    };
  }
  if (
    normalized.includes("dead") ||
    normalized.includes("dying") ||
    normalized.includes("unconscious")
  ) {
    return {
      icon: (
        <svg
          className="w-3 h-3"
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
      style: "bg-gray-800 text-gray-400 border-gray-600/30",
    };
  }
  if (
    normalized.includes("tired") ||
    normalized.includes("exhaust") ||
    normalized.includes("fatigue")
  ) {
    return {
      icon: (
        <svg
          className="w-3 h-3"
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
      style: "bg-orange-900/20 text-orange-300 border-orange-500/30",
    };
  }
  if (
    normalized.includes("terrified") ||
    normalized.includes("fear") ||
    normalized.includes("panic")
  ) {
    return {
      icon: (
        <svg
          className="w-3 h-3"
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
      style: "bg-indigo-900/20 text-indigo-300 border-indigo-500/30",
    };
  }
  if (normalized.includes("curs") || normalized.includes("hex")) {
    return {
      icon: (
        <svg
          className="w-3 h-3"
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
      style: "bg-fuchsia-900/20 text-fuchsia-400 border-fuchsia-500/30",
    };
  }
  if (normalized.includes("stun") || normalized.includes("paraly")) {
    return {
      icon: (
        <svg
          className="w-3 h-3"
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
      style: "bg-yellow-900/20 text-yellow-200 border-yellow-500/30",
    };
  }

  // Default generic
  return {
    icon: (
      <svg
        className="w-3 h-3"
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
    style: "bg-theme-surface-highlight text-theme-primary border-theme-border",
  };
};

// Sub-component for individual skills to handle expansion state
const SkillItem: React.FC<{ skill: CharacterSkill }> = ({ skill }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHighlight, setIsHighlight] = useState(skill.highlight || false);

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    if (isHighlight) {
      setIsHighlight(false);
    }
  };

  return (
    <div
      className={`bg-theme-surface/50 rounded border border-theme-border/50 transition-all duration-300 cursor-pointer group w-full
        ${isExpanded ? "bg-theme-surface-highlight/30 border-theme-primary/30" : "hover:bg-theme-surface-highlight/20 hover:border-theme-primary/20"}
        ${isHighlight ? "animate-pulse ring-2 ring-theme-primary/50" : ""}
      `}
      onClick={handleClick}
    >
      <div className="flex justify-between items-center px-2 py-1.5">
        <span className="text-xs text-theme-text font-medium flex items-center gap-1">
          {skill.name}
          {skill.unlocked && (
            <svg
              className="w-3 h-3 text-theme-primary"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
            </svg>
          )}
        </span>
        {skill.level && (
          <span className="text-[10px] text-theme-primary bg-theme-primary/10 px-1.5 rounded border border-theme-primary/20 whitespace-nowrap ml-2">
            {skill.level}
          </span>
        )}
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
        <div className="px-2 pb-2 pt-0">
          <p className="text-[10px] text-theme-muted italic leading-snug border-t border-theme-border/30 pt-1 mt-1">
            {skill.visible?.description || t("noDescription") || "No description"}
          </p>

          {/* Unlocked Hidden Truth */}
          {skill.unlocked && skill.hidden?.trueDescription && (
            <div className="mt-2 text-xs border-l-2 border-theme-primary/50 pl-2 bg-theme-primary/10 py-1.5 rounded-r">
              <span className="text-[9px] uppercase tracking-wider text-theme-primary font-bold flex items-center gap-1 mb-0.5">
                <svg
                  className="w-2.5 h-2.5"
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
              <p className="leading-relaxed text-theme-text text-[10px]">
                {skill.hidden.trueDescription}
              </p>
              {skill.hidden.hiddenEffects &&
                skill.hidden.hiddenEffects.length > 0 && (
                  <div className="mt-1.5">
                    <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                      {t("hidden.effects")}:
                    </span>
                    <ul className="list-disc list-inside text-theme-text space-y-0.5 text-[10px]">
                      {skill.hidden.hiddenEffects.map((effect, i) => (
                        <li key={i}>{effect}</li>
                      ))}
                    </ul>
                  </div>
                )}
              {skill.hidden.drawbacks && skill.hidden.drawbacks.length > 0 && (
                <div className="mt-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                    {t("hidden.drawbacks")}:
                  </span>
                  <ul className="list-disc list-inside text-theme-text space-y-0.5 text-[10px]">
                    {skill.hidden.drawbacks.map((drawback, i) => (
                      <li key={i}>{drawback}</li>
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHighlight, setIsHighlight] = useState(condition.highlight || false);

  const { icon, style } = getStatusConfig(condition.name);

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    if (isHighlight) {
      setIsHighlight(false);
    }
  };

  return (
    <div
      className={`rounded border text-xs cursor-pointer transition-all duration-300 ${style}
        ${isHighlight ? "animate-pulse ring-2 ring-theme-primary/50" : ""}
      `}
      onClick={handleClick}
    >
      <div className="p-2">
        <div className="flex justify-between items-center mb-0.5">
          <span className="font-bold flex items-center gap-1">
            {icon}
            {condition.name}
            {condition.unlocked && (
              <svg
                className="w-3 h-3 text-theme-primary"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
              </svg>
            )}
          </span>
          {condition.duration && (
            <span className="text-[10px] opacity-70">{condition.duration}</span>
          )}
        </div>

        {condition.visible?.description && (
          <p className="text-[11px] opacity-80">
            {condition.visible.description}
          </p>
        )}

        {/* Expanded content with unlocked information */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-current/20">
            {condition.visible?.perceivedSeverity && (
              <p className="text-[10px] opacity-70">
                <span className="font-semibold">
                  {t("character.severity") || "Severity:"}
                </span>{" "}
                {condition.visible.perceivedSeverity}
              </p>
            )}

            {/* Unlocked Hidden Information */}
            {condition.unlocked && (
              <div className="mt-2 text-xs border-l-2 border-theme-primary/50 pl-2 bg-theme-primary/10 py-1.5 rounded-r">
                <span className="text-[9px] uppercase tracking-wider text-theme-primary font-bold flex items-center gap-1 mb-0.5">
                  <svg
                    className="w-2.5 h-2.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {t("hidden.cause")}
                </span>
                {condition.hidden?.trueCause && (
                  <p className="leading-relaxed text-theme-text text-[10px] mb-1">
                    {condition.hidden.trueCause}
                  </p>
                )}
                {condition.hidden?.actualSeverity && (
                  <p className="text-[10px] text-theme-text">
                    <span className="font-semibold">
                      {t("hidden.severity")}:
                    </span>{" "}
                    {condition.hidden.actualSeverity}
                  </p>
                )}
                {condition.hidden?.progression && (
                  <p className="text-[10px] text-theme-text mt-1">
                    <span className="font-semibold">
                      {t("hidden.progression")}:
                    </span>{" "}
                    {condition.hidden.progression}
                  </p>
                )}
                {condition.hidden?.cure && (
                  <p className="text-[10px] text-theme-text mt-1">
                    <span className="font-semibold">{t("hidden.cure")}:</span>{" "}
                    {condition.hidden.cure}
                  </p>
                )}
                {condition.effects?.hidden &&
                  condition.effects.hidden.length > 0 && (
                    <div className="mt-1.5">
                      <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
                        {t("hidden.effects")}:
                      </span>
                      <ul className="list-disc list-inside text-theme-text space-y-0.5 text-[10px]">
                        {condition.effects.hidden.map((effect, i) => (
                          <li key={i}>{effect}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  character,
  themeFont,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);

  if (!character) return null;

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-theme-primary uppercase text-xs font-bold tracking-widest group ${themeFont} ${isOpen ? "mb-3" : "mb-0"}`}
      >
        <div className="flex items-center">
          <svg
            className="w-4 h-4 mr-2"
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
          {t("character.title")}
        </div>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
      </button>

      {isOpen && (
        <div className="space-y-4 animate-[fade-in_0.3s_ease-in]">
          {/* Header Info */}
          <div className="bg-theme-surface-highlight/30 p-3 rounded border border-theme-border">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3
                  className={`text-lg font-bold text-theme-primary ${themeFont}`}
                >
                  {character.name}
                </h3>
                <span className="text-xs font-bold text-theme-muted uppercase tracking-wider">
                  {t("character.severity") || "Severity:"}
                </span>
              </div>
              {character.race && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-theme-bg border border-theme-border text-theme-text-secondary">
                  {character.race}
                </span>
              )}
            </div>

            {/* Status & Profession */}
            <div className="flex flex-col gap-1 text-xs mt-2">
              {character.profession && (
                <div className="flex items-center gap-2 text-theme-text">
                  <span className="text-theme-muted w-12">
                    {t("role") || "Role"}:
                  </span>
                  <span>{character.profession}</span>
                </div>
              )}
              {character.status && (
                <div className="flex items-center gap-2 text-theme-text">
                  <span className="text-theme-muted w-12">
                    {t("status") || "Status"}:
                  </span>
                  <span className="text-theme-primary font-medium">
                    {character.status}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Attributes Grid */}
          {character.attributes && character.attributes.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {character.attributes.map((attr, idx) => (
                <div
                  key={idx}
                  className="bg-theme-surface-highlight/20 p-2 rounded border border-theme-border/50 flex flex-col"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-theme-muted uppercase tracking-wider truncate">
                      {attr.label}
                    </span>
                    <span className="text-xs font-bold text-theme-text">
                      {attr.value}
                      {attr.maxValue ? `/${attr.maxValue}` : ""}
                    </span>
                  </div>
                  {attr.maxValue && (
                    <div className="h-1 w-full bg-theme-bg rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          colorMap[attr.color || "gray"]
                            ? `bg-linear-to-r ${colorMap[attr.color || "gray"]}`
                            : "bg-gray-500"
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(0, (attr.value / attr.maxValue) * 100))}%`,
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Skills List */}
          {character.skills && character.skills.length > 0 && (
            <div>
              <h4 className="text-[10px] text-theme-muted uppercase tracking-wider mb-2 font-bold">
                {t("skills")}
              </h4>
              <div className="flex flex-col gap-1">
                {character.skills.map((skill, idx) => (
                  <SkillItem key={idx} skill={skill} />
                ))}
              </div>
            </div>
          )}

          {/* Conditions List */}
          {character.conditions && character.conditions.length > 0 && (
            <div>
              <h4 className="text-[10px] text-theme-muted uppercase tracking-wider mb-2 font-bold mt-3">
                {t("conditions") || "Conditions"}
              </h4>
              <div className="flex flex-col gap-1">
                {character.conditions.map((cond, idx) => (
                  <ConditionItem key={idx} condition={cond} />
                ))}
              </div>
            </div>
          )}

          {/* Hidden Traits (Only Unlocked) */}
          {character.hiddenTraits &&
            character.hiddenTraits.length > 0 &&
            character.hiddenTraits.some((t) => t.unlocked) && (
              <div>
                <h4 className="text-[10px] text-theme-primary uppercase tracking-wider mb-2 font-bold mt-3 flex items-center gap-1">
                  <svg
                    className="w-3 h-3 shrink-0"
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
                <div className="flex flex-col gap-1">
                  {character.hiddenTraits
                    .filter((t) => t.unlocked)
                    .map((trait, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded border bg-theme-primary/10 border-theme-primary/20 text-theme-text text-xs ${
                          trait.highlight
                            ? "animate-pulse ring-2 ring-theme-primary/50"
                            : ""
                        }`}
                      >
                        <div className="font-bold mb-0.5">{trait.name}</div>
                        {trait.description && (
                          <p className="text-[10px] opacity-80">
                            {trait.description}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

          {/* Appearance (Collapsible) */}
          {character.appearance && (
            <details className="group text-xs">
              <summary className="cursor-pointer text-theme-muted hover:text-theme-primary transition-colors list-none flex items-center gap-1">
                <span className="uppercase tracking-wider text-[10px] font-bold">
                  {t("appearance") || "Appearance"}
                </span>
                <svg
                  className="w-3 h-3 transition-transform group-open:rotate-90"
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
              <p className="mt-2 text-theme-text-secondary italic leading-relaxed pl-2 border-l-2 border-theme-border">
                {character.appearance}
              </p>
            </details>
          )}
        </div>
      )}
    </div>
  );
};
