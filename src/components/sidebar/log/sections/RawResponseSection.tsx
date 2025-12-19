import React from "react";
import { useTranslation } from "react-i18next";

interface RawResponseSectionProps {
  rawResponse: string;
}

/** Section displaying raw AI response */
export const RawResponseSection: React.FC<RawResponseSectionProps> = ({
  rawResponse,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-1 border-t border-theme-border/30 pt-4">
      <details className="group">
        <summary className="text-xs cursor-pointer hover:text-cyan-400 transition-colors select-none text-cyan-500 uppercase font-bold">
          {t("logPanel.rawResponse") || "Raw AI Response"} ({rawResponse.length}{" "}
          {t("logPanel.chars") || "chars"})
        </summary>
        <div className="bg-cyan-900/10 rounded border border-cyan-500/30 p-2 mt-2 max-h-[300px] overflow-auto">
          <pre className="text-xs text-theme-muted/80 whitespace-pre-wrap break-words">
            {rawResponse}
          </pre>
        </div>
      </details>
    </div>
  );
};
