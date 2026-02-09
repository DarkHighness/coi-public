import React from "react";
import { useTranslation } from "react-i18next";
import type { LogEntryBodyProps } from "../types";

/** Entry body for outline phase logs (type="outline") */
export const OutlineLogEntry: React.FC<LogEntryBodyProps> = ({ log }) => {
  const { t } = useTranslation();

  const phase = log.phase;
  const phaseNames: Record<number, string> = {
    0: t("initializing.outline.phase.0.name", "Interpreting Image"),
    1: t("initializing.outline.phase.1.name", "Master Story Plan"),
    2: t("initializing.outline.phase.2.name", "World Foundation"),
    3: t("initializing.outline.phase.3.name", "Player Actor"),
    4: t("initializing.outline.phase.4.name", "Locations"),
    5: t("initializing.outline.phase.5.name", "Factions"),
    6: t("initializing.outline.phase.6.name", "NPCs & Relationships"),
    7: t("initializing.outline.phase.7.name", "Quests & Knowledge"),
    8: t("initializing.outline.phase.8.name", "Timeline & Atmosphere"),
    9: t("initializing.outline.phase.9.name", "Opening Narrative"),
  };

  const progressPercent =
    typeof phase === "number" && phase >= 0
      ? Math.min(100, (Math.max(0, Math.min(9, phase)) / 9) * 100)
      : 0;

  return (
    <div className="space-y-3">
      {typeof phase === "number" && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-theme-primary font-bold">
              {t("logPanel.phase")} {phase}
            </span>
            <span className="text-sm font-bold text-theme-text">
              {phaseNames[phase] || `Phase ${phase}`}
            </span>
          </div>
          <div className="w-full bg-theme-surface-highlight rounded-full h-2">
            <div
              className="bg-theme-primary h-2 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {log.toolName && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-theme-muted uppercase">
            {t("logPanel.toolLabel")}
          </span>
          <span className="text-sm font-mono text-theme-text">{log.toolName}</span>
        </div>
      )}

      {log.request && (
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-green-500 font-bold">
            {t("logPanel.request") || "Request"}
          </label>
          <pre className="text-xs text-theme-muted/80 bg-black/10 rounded p-2 overflow-auto max-h-[150px] whitespace-pre-wrap break-words">
            {JSON.stringify(log.request, null, 2)}
          </pre>
        </div>
      )}

      {log.response && (
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-theme-info font-bold">
            {t("logPanel.response") || "Response"}
          </label>
          <pre className="text-xs text-theme-muted/80 bg-black/10 rounded p-2 overflow-auto max-h-[200px] whitespace-pre-wrap break-words">
            {typeof log.response === "string"
              ? log.response
              : JSON.stringify(log.response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
