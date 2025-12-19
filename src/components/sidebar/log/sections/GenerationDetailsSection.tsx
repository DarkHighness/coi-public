import React from "react";
import { useTranslation } from "react-i18next";
import type { LogEntry } from "../types";

interface GenerationDetailsSectionProps {
  details: NonNullable<LogEntry["generationDetails"]>;
}

/** Section displaying generation context details */
export const GenerationDetailsSection: React.FC<
  GenerationDetailsSectionProps
> = ({ details }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 border-b border-theme-border/30 pb-4">
      <label className="text-xs uppercase tracking-widest text-theme-primary font-bold block mb-2">
        {t("logPanel.generationContext") || "Generation Context"}
      </label>

      {details.userPrompt && (
        <div className="space-y-1">
          <span className="text-xs text-theme-muted uppercase font-bold">
            {t("logPanel.userAction") || "User Action"}
          </span>
          <div className="bg-black/10 rounded border border-theme-border/30 p-2">
            <pre className="text-xs text-theme-text whitespace-pre-wrap break-words">
              {details.userPrompt}
            </pre>
          </div>
        </div>
      )}

      {details.dynamicContext && (
        <div className="space-y-1">
          <span className="text-xs text-theme-muted uppercase font-bold">
            {t("logPanel.dynamicStoryMemory") || "Dynamic Story Memory"}
          </span>
          <div className="bg-black/10 rounded border border-theme-border/30 p-2 max-h-[150px] overflow-auto">
            <pre className="text-xs text-theme-muted/80 whitespace-pre-wrap break-words">
              {details.dynamicContext}
            </pre>
          </div>
        </div>
      )}

      {details.ragContext && (
        <div className="space-y-1">
          <span className="text-xs text-theme-muted uppercase font-bold">
            {t("logPanel.ragContext") || "RAG Context"}
          </span>
          <div className="bg-black/10 rounded border border-theme-border/30 p-2 max-h-[150px] overflow-auto">
            <pre className="text-xs text-theme-muted/80 whitespace-pre-wrap break-words">
              {details.ragContext}
            </pre>
          </div>
        </div>
      )}

      {details.injectedRules && details.injectedRules.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-purple-400 uppercase font-bold">
            {t("logPanel.injectedRules") || "Injected Rules"} (
            {details.injectedRules.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {details.injectedRules.map((rule, i) => (
              <span
                key={i}
                className="text-xs bg-purple-900/20 border border-purple-500/30 px-2 py-1 rounded text-purple-300"
              >
                {rule}
              </span>
            ))}
          </div>
        </div>
      )}

      {details.nsfwEnabled && (
        <div className="space-y-1">
          <span className="text-xs bg-red-500/20 border border-red-500/30 px-2 py-1 rounded text-red-400 font-bold uppercase">
            {t("logPanel.nsfwEnabled") || "NSFW Mode Enabled"}
          </span>
        </div>
      )}

      {details.systemPrompt && (
        <div className="space-y-1">
          <span className="text-xs text-theme-muted uppercase font-bold">
            {t("logPanel.systemPrompt") || "System Prompt"}
          </span>
          <details className="group">
            <summary className="text-xs cursor-pointer hover:text-theme-primary transition-colors select-none">
              {t("logPanel.showSystemPrompt") || "Show System Prompt"} (
              {details.systemPrompt.length} {t("logPanel.chars") || "chars"})
            </summary>
            <div className="bg-black/10 rounded border border-theme-border/30 p-2 mt-2 max-h-[200px] overflow-auto">
              <pre className="text-xs text-theme-muted/60 whitespace-pre-wrap break-words">
                {details.systemPrompt}
              </pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};
