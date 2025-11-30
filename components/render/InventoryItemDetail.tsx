import React from "react";
import { useTranslation } from "react-i18next";
import { ItemLore } from "./ItemLore";

interface ItemDetails {
  description: string;
  usage?: string;
  lore: string;
  unlocked?: boolean;
  hiddenTruth?: string;
  hiddenSecrets?: string[];
}

interface InventoryItemDetailProps {
  loading: boolean;
  details: ItemDetails | null;
}

export const InventoryItemDetail: React.FC<InventoryItemDetailProps> = ({
  loading,
  details,
}) => {
  const { t } = useTranslation();

  const showMoreLabel = t("showMore");
  const showLessLabel = t("showLess");

  if (loading) {
    return (
      <span className="flex items-center gap-2 animate-pulse py-2">
        <svg
          className="animate-spin h-4 w-4 text-theme-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span className="text-theme-muted text-xs">
          {t("consultingArchives")}
        </span>
      </span>
    );
  }

  if (!details) return null;

  return (
    <div className="space-y-3">
      <div className="text-xs text-theme-muted/90 italic">
        <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
          {t("description") || "Description"}
        </span>
        <p className="leading-relaxed pl-1">{details.description}</p>
      </div>

      {details.usage && (
        <div className="text-xs text-theme-muted/90 italic">
          <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">
            {t("usage") || "Usage"}
          </span>
          <p className="leading-relaxed pl-1">{details.usage}</p>
        </div>
      )}

      {/* Unlocked Hidden Truth */}
      {details.unlocked && details.hiddenTruth && (
        <div className="text-xs border-l-2 border-theme-primary/50 pl-3 bg-theme-surface/50 py-2 rounded-r">
          <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold mb-1 flex items-center gap-1">
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
              />
            </svg>
            {t("hidden.truth")}
          </span>
          <p className="leading-relaxed text-theme-text">
            {details.hiddenTruth}
          </p>
          {details.hiddenSecrets && details.hiddenSecrets.length > 0 && (
            <div className="mt-2">
              <span className="text-[10px] uppercase tracking-wider text-theme-primary/80 font-bold block mb-1">
                {t("hidden.secrets")}:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-theme-text">
                {details.hiddenSecrets.map((secret, idx) => (
                  <li key={idx}>{secret}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {details.lore && (
        <ItemLore
          lore={details.lore}
          labelHistory={t("history")}
          labelShowMore={showMoreLabel}
          labelShowLess={showLessLabel}
        />
      )}
    </div>
  );
};
