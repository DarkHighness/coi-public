import React from "react";
import { useTranslation } from "react-i18next";
import type { TokenUsage } from "../../../types";

interface LogUsageFooterProps {
  usage: TokenUsage;
}

/** Token usage statistics footer */
export const LogUsageFooter: React.FC<LogUsageFooterProps> = ({ usage }) => {
  const { t } = useTranslation();

  return (
    <div className="pt-2 border-t border-theme-border/30 flex flex-wrap justify-end gap-4 text-sm text-theme-primary/80 items-center">
      <span>
        <strong className="text-theme-primary">
          {t("logPanel.prompt") || "Prompt:"}
        </strong>{" "}
        {usage.promptTokens}
      </span>
      <span>
        <strong className="text-theme-primary">
          {t("logPanel.completion") || "Completion:"}
        </strong>{" "}
        {usage.completionTokens}
      </span>
      {(usage.cacheRead || 0) > 0 && (
        <span>
          <strong className="text-theme-primary">
            {t("logPanel.cacheRead") || "Cache Read:"}
          </strong>{" "}
          {usage.cacheRead}
        </span>
      )}
      {(usage.cacheWrite || 0) > 0 && (
        <span>
          <strong className="text-theme-primary">
            {t("logPanel.cacheWrite") || "Cache Write:"}
          </strong>{" "}
          {usage.cacheWrite}
        </span>
      )}
      <span className="px-2 py-0.5 bg-theme-primary/10 border border-theme-primary/30 rounded">
        <strong className="text-theme-primary">
          {t("logPanel.total") || "Total:"}
        </strong>{" "}
        {usage.totalTokens}
      </span>
    </div>
  );
};
