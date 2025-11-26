import React from "react";
import { TokenUsage } from "../../types";
import { useTranslation } from "react-i18next";

interface TokenStatsProps {
  usage?: TokenUsage;
}

export const TokenStats: React.FC<TokenStatsProps> = ({ usage }) => {
  const { t } = useTranslation();
  if (!usage || usage.totalTokens === 0) return null;

  return (
    <div className="flex gap-3 text-[9px] md:text-[10px] text-theme-muted opacity-40 hover:opacity-100 transition-opacity font-mono mt-2 select-none justify-end">
      <span title={t("tokenStats.promptTokens")}>
        {t("tokenStats.in")} {usage.promptTokens}
      </span>
      <span>|</span>
      <span title={t("tokenStats.completionTokens")}>
        {t("tokenStats.out")} {usage.completionTokens}
      </span>
      <span>|</span>
      <span title={t("tokenStats.totalTokens")} className="font-bold">
        {t("tokenStats.total")} {usage.totalTokens}
      </span>
    </div>
  );
};
