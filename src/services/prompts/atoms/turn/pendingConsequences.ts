/**
 * ============================================================================
 * Turn Atom: Pending Consequences
 * ============================================================================
 *
 * 挂起后果 - 显示即将触发的因果链后果。
 */

import type { Atom } from "../types";

export type PendingConsequence = {
  chainId: string;
  consequenceId: string;
  description: string;
  triggerCondition?: string;
  known: boolean;
};

export type PendingConsequencesInput = {
  consequences: PendingConsequence[];
};

/**
 * 挂起后果
 */
export const pendingConsequences: Atom<PendingConsequencesInput> = ({
  consequences,
}) => {
  if (!consequences.length) return "";

  const readyList = consequences
    .map(
      (rc) =>
        `- [${rc.chainId}/${rc.consequenceId}] ${rc.description}${
          rc.triggerCondition ? ` (trigger: ${rc.triggerCondition})` : ""
        }${rc.known ? " [player will know]" : " [hidden]"}`,
    )
    .join("\n");

  return `[SYSTEM: PENDING CONSEQUENCES]
Ready to trigger:
${readyList}

Search for 'update:causal_chain' to trigger these.`;
};

export default pendingConsequences;
