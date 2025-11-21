import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CharacterStatus, Skill } from "../../types";

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
const SkillItem: React.FC<{ skill: Skill }> = ({ skill }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`bg-theme-surface/50 rounded border border-theme-border/50 transition-all duration-300 cursor-pointer group
        ${isExpanded ? "bg-theme-surface-highlight/30 border-theme-primary/30" : "hover:bg-theme-surface-highlight/20 hover:border-theme-primary/20"}
      `}
      onClick={() => setIsExpanded(!isExpanded)}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex justify-between items-center px-2 py-1.5">
        <span className="text-xs text-theme-text font-medium">
          {skill.name}
        </span>
        <span className="text-[10px] text-theme-primary bg-theme-primary/10 px-1.5 rounded border border-theme-primary/20 whitespace-nowrap ml-2">
          {skill.level}
        </span>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ${isExpanded && skill.description ? "max-h-20 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="px-2 pb-2 pt-0">
          <p className="text-[10px] text-theme-muted italic leading-snug border-t border-theme-border/30 pt-1 mt-1">
            {skill.description}
          </p>
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
  const [isOpen, setIsOpen] = useState(true);

  const attributes = character.attributes || [];
  // Handle optional skills array (for backward compatibility)
  const skills = character.skills || [];
  const statusConfig = getStatusConfig(character.status);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <div className="animate-fade-in mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left text-theme-primary uppercase text-xs font-bold tracking-widest mb-4 flex items-center justify-between group ${themeFont}`}
      >
        <span className="flex items-center">
          <span className="w-2 h-2 bg-theme-primary rounded-full mr-2"></span>
          {t("character")}
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
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

      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="bg-theme-surface-highlight/30 p-4 rounded border border-theme-border space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="font-bold text-lg text-theme-text tracking-wide">
              {character.name}
            </span>
            <span className="text-xs text-theme-muted uppercase tracking-wider">
              {character.title}
            </span>
          </div>

          {/* Details Toggle */}
          <button
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className="w-full text-left text-[10px] uppercase tracking-widest text-theme-muted hover:text-theme-primary transition-colors flex items-center justify-between border-b border-theme-border/30 pb-1"
          >
            <span>{t("details")}</span>
            <svg
              className={`w-3 h-3 transition-transform duration-300 ${isDetailsOpen ? "rotate-180" : ""}`}
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

          {/* Collapsible Details Section */}
          <div
            className={`overflow-hidden transition-all duration-300 ${isDetailsOpen ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"}`}
          >
            <div className="space-y-2 pt-2 text-xs text-theme-muted/80">
              {character.race && (
                <div>
                  <span className="text-theme-primary/70 font-bold block mb-0.5">
                    {t("race")}
                  </span>
                  <p>{character.race}</p>
                </div>
              )}
              {character.appearance && (
                <div>
                  <span className="text-theme-primary/70 font-bold block mb-0.5">
                    {t("appearance")}
                  </span>
                  <p className="italic leading-relaxed">
                    {character.appearance}
                  </p>
                </div>
              )}
              {character.profession && (
                <div>
                  <span className="text-theme-primary/70 font-bold block mb-0.5">
                    {t("profession")}
                  </span>
                  <p>{character.profession}</p>
                </div>
              )}
              {character.background && (
                <div>
                  <span className="text-theme-primary/70 font-bold block mb-0.5">
                    {t("background")}
                  </span>
                  <p className="italic leading-relaxed">
                    {character.background}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Attributes */}
          {attributes.map((attr, idx) => {
            const rawColor = attr.color?.toLowerCase().trim() || "gray";
            const gradientClass = colorMap[rawColor];
            const textColorClass = textMap[rawColor] || "text-theme-text";

            const percentage =
              attr.maxValue > 0
                ? Math.max(0, Math.min(100, (attr.value / attr.maxValue) * 100))
                : 0;

            return (
              <div key={idx}>
                <div className="flex justify-between text-xs mb-1">
                  <span
                    className={`font-bold ${textColorClass}`}
                    style={!gradientClass ? { color: attr.color } : {}}
                  >
                    {attr.label}
                  </span>
                  <span className="text-theme-muted">
                    {attr.value}/{attr.maxValue}
                  </span>
                </div>
                <div className="w-full h-2 bg-theme-surface-highlight rounded-full overflow-hidden border border-theme-border/50">
                  <div
                    className={`h-full ${gradientClass || ""} transition-all duration-700 ease-out bg-linear-to-r`}
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: gradientClass ? undefined : attr.color,
                    }}
                  ></div>
                </div>
              </div>
            );
          })}

          {attributes.length === 0 && (
            <div className="text-xs text-theme-muted italic text-center py-2">
              {character.status === "Unknown" ? "..." : character.status}
            </div>
          )}

          {/* Skills Section */}
          <div className="pt-3 border-t border-theme-border/50">
            <h4 className="text-[10px] uppercase tracking-widest text-theme-muted mb-2 font-bold">
              {t("skills")}
            </h4>
            {skills.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {skills.map((skill, idx) => (
                  <SkillItem key={idx} skill={skill} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-theme-muted italic">
                {t("emptySkills")}
              </p>
            )}
          </div>

          {/* Status Condition */}
          <div className="pt-2 border-t border-theme-border/50 flex items-center gap-2">
            <span className="text-xs text-theme-muted uppercase">
              {t("status")}:
            </span>
            <span
              className={`text-xs px-2 py-1 rounded flex items-center gap-1.5 border ${statusConfig.style}`}
            >
              {statusConfig.icon}
              <span className="font-medium">{character.status}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
