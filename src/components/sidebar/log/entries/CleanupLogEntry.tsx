import React from "react";
import { useTranslation } from "react-i18next";
import type { LogEntryBodyProps } from "../types";
import { ToolCallItem } from "../ToolCallItem";
import {
  GenerationDetailsSection,
  StageInputSection,
  RawResponseSection,
} from "../sections";

/** Entry body for cleanup logs (type="cleanup") */
export const CleanupLogEntry: React.FC<LogEntryBodyProps> = ({ log }) => {
  const { t } = useTranslation();
  const hasToolCalls = log.toolCalls && log.toolCalls.length > 0;

  return (
    <div className="space-y-4">
      {/* Cleanup Header */}
      <div className="flex items-center gap-2 p-2 bg-theme-primary/10 rounded border border-theme-primary/30">
        <svg
          className="w-5 h-5 text-theme-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        <span className="text-sm font-bold text-theme-primary">
          {t("cleanupEntities", "Entity Cleanup")}
        </span>
      </div>

      {/* Generation Details */}
      {log.generationDetails && (
        <GenerationDetailsSection details={log.generationDetails} />
      )}

      {/* Tool Calls - main content for cleanup */}
      {hasToolCalls && (
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-theme-primary font-bold block">
            {t("logPanel.toolCalls") || "Tool Calls"} ({log.toolCalls!.length})
          </label>
          <div className="space-y-2">
            {log.toolCalls!.map((call, idx) => (
              <ToolCallItem key={idx} call={call} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Stage Input Debug */}
      {log.stageInput && <StageInputSection stageInput={log.stageInput} />}

      {/* Raw Response */}
      {log.rawResponse && <RawResponseSection rawResponse={log.rawResponse} />}
    </div>
  );
};
