import React from "react";
import { useTranslation } from "react-i18next";
import type { LogEntryBodyProps } from "../types";
import { ToolCallItem } from "../ToolCallItem";
import {
  GenerationDetailsSection,
  StageInputSection,
  RawResponseSection,
} from "../sections";

/** Entry body for turn logs with multiple tool calls (type="turn") */
export const TurnLogEntry: React.FC<LogEntryBodyProps> = ({ log }) => {
  const { t } = useTranslation();
  const hasToolCalls = log.toolCalls && log.toolCalls.length > 0;

  return (
    <div className="space-y-4">
      {/* Generation Details */}
      {log.generationDetails && (
        <GenerationDetailsSection details={log.generationDetails} />
      )}

      {/* Tool Calls */}
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
