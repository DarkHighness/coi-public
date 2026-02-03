import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { StoryThemeConfig } from "../../types";
import { ENV_THEMES } from "../../utils/constants";
import { MarkdownText } from "../render/MarkdownText";
import { RoleSelectionModal } from "./RoleSelectionModal";
import i18n from "../../utils/i18n";

interface ThemePreviewModalProps {
  themeKey: string;
  themeConfig: StoryThemeConfig;
  onClose: () => void;
  onSelect: (key: string, protagonistFeature?: string) => void;
}

export const ThemePreviewModal: React.FC<ThemePreviewModalProps> = ({
  themeKey,
  themeConfig,
  onClose,
  onSelect,
}) => {
  const { t } = useTranslation();
  const previewName = t(`${themeKey}.name`, { ns: "themes" });
  const envTheme = ENV_THEMES[themeConfig.envTheme];
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  // Check for protagonist preferences
  // Use i18n.getResource directly to avoid Suspense issues or key missing fallbacks if possible,
  // or just use translation. The safest way with i18next to get an array is returnObjects: true
  // but we need to ensure type safety.
  // however, we added it to 'themes.json', so we access it via t().
  const protagonistPreferences = t(`${themeKey}.protagonist_preference`, {
    ns: "themes",
    returnObjects: true,
  }) as string[] | undefined;

  const hasPreferences =
    Array.isArray(protagonistPreferences) && protagonistPreferences.length > 0;

  const handleStartClick = () => {
    setShowRoleSelection(true);
  };

  const handleRoleSelect = (role: string) => {
    onSelect(themeKey, role);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-200 flex items-center justify-center ui-overlay backdrop-blur-sm animate-fade-in p-4"
        onClick={onClose}
      >
        <div
          className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90dvh] overflow-hidden flex flex-col animate-slide-in relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Dynamic Background */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${envTheme?.vars["--theme-primary"] || "#f59e0b"}, transparent)`,
            }}
          ></div>

          {/* Header */}
          <div className="relative z-10 p-5 border-b border-theme-border flex items-center justify-between bg-theme-surface/50 backdrop-blur-sm">
            <div>
              <h2
                className={`text-2xl font-bold uppercase tracking-tighter text-theme-text bg-clip-text bg-linear-to-r from-theme-text to-theme-muted ${envTheme?.fontClass || "font-sans"}`}
              >
                {previewName}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 text-theme-muted hover:text-theme-text transition-colors rounded-xl hover:bg-theme-surface-highlight/60"
              aria-label={t("close")}
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
                ></path>
              </svg>
            </button>
          </div>

          {/* Content */}
          <div
            className={`relative z-10 flex-1 p-5 overflow-y-auto custom-scrollbar space-y-5 ${envTheme?.fontClass || "font-sans"}`}
          >
            <div>
              <h3 className="text-xs text-theme-primary uppercase tracking-[0.2em] font-bold mb-2 opacity-70 font-sans">
                {t("narrativeStyle")}
              </h3>
              <div className="text-theme-muted text-sm leading-relaxed line-clamp-3 md:line-clamp-none">
                <MarkdownText
                  content={t(`${themeKey}.narrativeStyle`, { ns: "themes" })}
                  disableIndent
                  components={{
                    p: ({ node, ...props }: any) => <span {...props} />,
                  }}
                />
              </div>
            </div>

            <div>
              <h3 className="text-xs text-theme-primary uppercase tracking-[0.2em] font-bold mb-2 opacity-70 font-sans">
                {t("worldSetting")}
              </h3>
              <div className="text-theme-muted text-sm leading-relaxed line-clamp-3 md:line-clamp-none">
                <MarkdownText
                  content={t(`${themeKey}.worldSetting`, { ns: "themes" })}
                  disableIndent
                  components={{
                    p: ({ node, ...props }: any) => <span {...props} />,
                  }}
                />
              </div>
            </div>

            <div>
              <h3 className="text-xs text-theme-primary uppercase tracking-[0.2em] font-bold mb-2 opacity-70 font-sans">
                {t("themeExample")}
              </h3>
              <div className="bg-theme-bg/50 p-5 rounded-xl border border-theme-border/50 relative group">
                <div className="absolute -top-2 -left-2 text-3xl text-theme-primary/20 font-serif group-hover:text-theme-primary/30 transition-colors">
                  "
                </div>
                <div
                  className={`text-theme-text/90 leading-loose line-clamp-5 md:line-clamp-none ${
                    (envTheme?.fontClass || "font-sans") === "font-serif"
                      ? "font-serif text-base"
                      : "font-sans text-sm"
                  }`}
                >
                  <MarkdownText
                    content={t(`${themeKey}.example`, { ns: "themes" })}
                    disableIndent
                    components={{
                      p: ({ node, ...props }: any) => <span {...props} />,
                    }}
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 text-3xl text-theme-primary/20 font-serif rotate-180 group-hover:text-theme-primary/30 transition-colors">
                  "
                </div>
              </div>
            </div>

            {/* Role Preview */}
            {hasPreferences && (
              <div className="mt-8 animate-fade-in animation-delay-300">
                <h3 className="text-xs text-theme-primary uppercase tracking-[0.2em] font-bold mb-3 opacity-70 font-sans flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-theme-secondary/70"></span>
                  {t("availableRoles", { defaultValue: "Possible Identities" })}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {protagonistPreferences.slice(0, 8).map((role, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-theme-surface-highlight/30 border border-theme-border/50 rounded-lg text-theme-text/80 text-xs font-medium backdrop-blur-sm"
                    >
                      {role.split(" (")[0]}
                    </span>
                  ))}
                  {protagonistPreferences.length > 8 && (
                    <span className="px-3 py-1.5 text-theme-muted text-xs font-medium italic opacity-70">
                      +{protagonistPreferences.length - 8}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="relative z-10 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] border-t border-theme-border bg-theme-surface/50 backdrop-blur-sm shadow-[0_-10px_20px_rgba(0,0,0,0.1)]">
            <button
              onClick={handleStartClick}
              className="w-full py-3 bg-theme-primary text-theme-bg font-bold text-lg uppercase tracking-widest hover:bg-theme-primary-hover transition-all shadow-[0_0_20px_rgba(var(--theme-primary-rgb),0.3)] hover:scale-[1.01] rounded-xl flex items-center justify-center gap-2"
            >
              <span>{t("startThisAdventure")}</span>
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
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                ></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {showRoleSelection && (
        <RoleSelectionModal
          themeKey={themeKey}
          roles={
            Array.isArray(protagonistPreferences) ? protagonistPreferences : []
          }
          onSelect={handleRoleSelect}
          onCancel={() => setShowRoleSelection(false)}
        />
      )}
    </>
  );
};
