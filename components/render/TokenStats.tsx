import React from "react";
import { TokenUsage } from "../../types";

interface TokenStatsProps {
  usage?: TokenUsage;
}

export const TokenStats: React.FC<TokenStatsProps> = ({ usage }) => {
  if (!usage || usage.totalTokens === 0) return null;

  return (
    <div className="flex gap-3 text-[9px] md:text-[10px] text-theme-muted opacity-40 hover:opacity-100 transition-opacity font-mono mt-2 select-none justify-end">
      <span title="Prompt Tokens">In: {usage.promptTokens}</span>
      <span>|</span>
      <span title="Completion Tokens">Out: {usage.completionTokens}</span>
      <span>|</span>
      <span title="Total Tokens" className="font-bold">
        Total: {usage.totalTokens}
      </span>
    </div>
  );
};
