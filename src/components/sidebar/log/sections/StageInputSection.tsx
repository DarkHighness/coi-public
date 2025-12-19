import React from "react";
import { useTranslation } from "react-i18next";
import type { LogEntry } from "../types";

interface StageInputSectionProps {
  stageInput: NonNullable<LogEntry["stageInput"]>;
}

/** Section displaying stage debugging information */
export const StageInputSection: React.FC<StageInputSectionProps> = ({
  stageInput,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 border-t border-theme-border/30 pt-4">
      <label className="text-xs uppercase tracking-widest text-yellow-500 font-bold block mb-2">
        {t("logPanel.stageDebug") || "Stage Debug Info"}
      </label>

      {stageInput.stageInstruction && (
        <div className="space-y-1">
          <span className="text-xs text-theme-muted uppercase font-bold">
            {t("logPanel.stageInstruction") || "Stage Instruction"}
          </span>
          <div className="bg-yellow-900/10 rounded border border-yellow-500/30 p-2 max-h-[100px] overflow-auto">
            <pre className="text-xs text-theme-text whitespace-pre-wrap break-words">
              {stageInput.stageInstruction}
            </pre>
          </div>
        </div>
      )}

      {stageInput.availableTools && stageInput.availableTools.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-theme-muted uppercase font-bold">
            {t("logPanel.availableTools") || "Available Tools"}
          </span>
          <div className="flex flex-wrap gap-1">
            {stageInput.availableTools.map((tool, i) => (
              <span
                key={i}
                className="text-xs bg-theme-surface-highlight border border-theme-border/50 px-2 py-0.5 rounded text-theme-muted font-mono"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {stageInput.conversationHistory && (
        <div className="space-y-1">
          <details className="group">
            <summary className="text-xs cursor-pointer hover:text-yellow-400 transition-colors select-none text-theme-muted uppercase font-bold">
              {t("logPanel.conversationHistory") || "Conversation History"} (
              {stageInput.conversationHistory.length}{" "}
              {t("logPanel.chars") || "chars"})
            </summary>
            <div className="bg-black/10 rounded border border-theme-border/30 p-2 mt-2 max-h-[300px] overflow-auto">
              <pre className="text-xs text-theme-muted/60 whitespace-pre-wrap break-words">
                {stageInput.conversationHistory}
              </pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};
