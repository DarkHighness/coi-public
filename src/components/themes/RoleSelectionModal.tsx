import React from "react";
import { useTranslation } from "react-i18next";
import { MarkdownText } from "../render/MarkdownText";

interface RoleSelectionModalProps {
  roles: string[];
  themeKey: string;
  onSelect: (role: string) => void;
  onCancel: () => void;
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  roles,
  themeKey,
  onSelect,
  onCancel,
}) => {
  const { t } = useTranslation();
  const themeName = t(`${themeKey}.name`, { ns: "themes" });
  const [customRole, setCustomRole] = React.useState("");

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customRole.trim()) {
      onSelect(customRole.trim());
    }
  };

  return (
    <div
      className="fixed inset-0 z-210 flex items-center justify-center ui-overlay backdrop-blur-md animate-fade-in p-4"
      onClick={onCancel}
    >
      <div
        className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-slide-in-up relative max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-theme-border bg-theme-surface-highlight/30 flex-shrink-0">
          <h3 className="text-2xl font-bold text-theme-text text-center tracking-wide">
            {t("selectYourIdentity", "Choose Your Identity")}
          </h3>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="h-[1px] w-8 bg-theme-primary/30"></span>
            <p className="text-sm text-theme-primary font-medium uppercase tracking-wider">
              {themeName}
            </p>
            <span className="h-[1px] w-8 bg-theme-primary/30"></span>
          </div>
        </div>

        {/* Dynamic Background Effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-theme-primary/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-theme-secondary/20 rounded-full blur-3xl"></div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Preset Roles */}
          {roles && roles.length > 0 && (
            <div className="grid gap-3">
              <div className="text-xs text-theme-muted font-bold uppercase tracking-wider mb-1">
                {t("recommendedRoles", "Recommended Roles")}
              </div>
              {roles.map((role, index) => (
                <button
                  key={index}
                  onClick={() => onSelect(role)}
                  className="group relative p-4 rounded-xl border border-theme-border bg-theme-bg/40 hover:bg-theme-surface-highlight hover:border-theme-primary/50 transition-all text-left flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="w-10 h-10 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-text/70 group-hover:text-theme-primary group-hover:border-theme-primary transition-colors font-bold text-sm shrink-0 shadow-sm">
                    {index + 1}
                  </div>
                  <span className="text-theme-text font-medium text-base group-hover:text-theme-primary transition-colors">
                    {role}
                  </span>
                  <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity text-theme-primary">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Custom Input */}
          <div className="border-t border-theme-border pt-6">
            <div className="text-xs text-theme-muted font-bold uppercase tracking-wider mb-3">
              {t("customIdentity", "Or Create Your Own")}
            </div>
            <form onSubmit={handleCustomSubmit} className="flex gap-2">
              <input
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder={t(
                  "customRolePlaceholder",
                  "e.g., A time-traveling chef...",
                )}
                className="flex-1 bg-theme-bg/50 border border-theme-border rounded-xl px-4 py-3 text-theme-text placeholder-theme-muted/50 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/50 transition-all font-medium"
              />
              <button
                type="submit"
                disabled={!customRole.trim()}
                className="bg-theme-primary text-theme-bg font-bold px-6 py-3 rounded-xl hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-theme-primary/20"
              >
                {t("confirm", "Confirm")}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-theme-border bg-theme-surface-highlight/10 flex items-center justify-between gap-4 flex-shrink-0 z-10">
          <button
            onClick={() => onSelect("")} // Pass empty string for "No Preference"
            className="text-theme-text/80 hover:text-theme-primary underline decoration-theme-primary/30 hover:decoration-theme-primary underline-offset-4 text-sm transition-all px-2"
          >
            {t("skipSelection", "Skip / No Preference")}
          </button>

          <button
            onClick={onCancel}
            className="text-theme-muted hover:text-theme-text text-sm transition-colors py-2 px-4 hover:bg-theme-surface/50 rounded-lg"
          >
            {t("back", "Back")}
          </button>
        </div>
      </div>
    </div>
  );
};
