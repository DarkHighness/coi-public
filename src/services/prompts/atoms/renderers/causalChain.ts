/**
 * ============================================================================
 * Entity Rendering Atom: Causal Chain Renderer
 * ============================================================================
 *
 * CausalChain 实体渲染 - 用于 RAG 和上下文构建。
 * 提供 visible/hidden/full 三个渲染变体。
 *
 * Schema fields:
 * - chainId: string
 * - rootCause: { eventId, description }
 * - events: TimelineEvent[]
 * - status: 'active' | 'resolved' | 'interrupted'
 * - pendingConsequences: PendingConsequence[]
 */

import type { Atom, CausalChain } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


const PLAYER_ID = "char:player";

export type RenderCausalChainInput = {
  chain: CausalChain;
};

/**
 * 渲染 CausalChain 的 visible 层（玩家所知的因果链）
 */
export const renderCausalChainVisible: Atom<RenderCausalChainInput> = defineAtom({ atomId: "atoms/renderers/causalChain#renderCausalChainVisible", source: "atoms/renderers/causalChain.ts", exportName: "renderCausalChainVisible" }, ({
  chain,
}) => {
  const lines: string[] = [
    `chainId: ${chain.chainId}`,
    `status: ${chain.status}`,
  ];

  if (chain.rootCause) {
    lines.push(`rootCause: ${chain.rootCause.description}`);
  }

  // Only show consequences the protagonist knows exist
  const knownConsequences =
    chain.pendingConsequences?.filter((c) => c.knownBy?.includes(PLAYER_ID)) ||
    [];
  if (knownConsequences.length > 0) {
    const conseqStrs = knownConsequences.map(
      (c) => `[${c.id}] ${c.description}${c.triggered ? " (triggered)" : ""}`,
    );
    lines.push(`knownConsequences: ${conseqStrs.join("; ")}`);
  }

  return `<causal_chain id="${chain.chainId}" layer="visible">
${lines.join("\n")}
</causal_chain>`;
});

/**
 * 渲染 CausalChain 的 hidden 层（所有后果，包括未知的）
 */
export const renderCausalChainHidden: Atom<RenderCausalChainInput> = defineAtom({ atomId: "atoms/renderers/causalChain#renderCausalChainHidden", source: "atoms/renderers/causalChain.ts", exportName: "renderCausalChainHidden" }, ({
  chain,
}) => {
  const lines: string[] = [`chainId: ${chain.chainId}`];

  if (chain.rootCause) {
    lines.push(
      `rootCause: { eventId: ${chain.rootCause.eventId}, description: ${chain.rootCause.description} }`,
    );
  }

  if (chain.pendingConsequences?.length) {
    const conseqStrs = chain.pendingConsequences.map(
      (c) =>
        `[${c.id}] ${c.description} | trigger: ${c.triggerCondition || "none"} | severity: ${c.severity || "normal"} | knownBy: ${JSON.stringify(
          c.knownBy || [],
        )} | triggered: ${c.triggered}`,
    );
    lines.push(`allConsequences:\n  ${conseqStrs.join("\n  ")}`);
  }

  return `<causal_chain id="${chain.chainId}" layer="hidden">
${lines.join("\n")}
</causal_chain>`;
});

/**
 * 渲染 CausalChain 完整信息（visible + hidden）
 */
export const renderCausalChainFull: Atom<RenderCausalChainInput> = defineAtom({ atomId: "atoms/renderers/causalChain#renderCausalChainFull", source: "atoms/renderers/causalChain.ts", exportName: "renderCausalChainFull" }, ({
  chain,
}) => {
  const visibleLines: string[] = [`status: ${chain.status}`];
  if (chain.rootCause) {
    visibleLines.push(`rootCause: ${chain.rootCause.description}`);
  }

  const hiddenLines: string[] = [];
  if (chain.rootCause) {
    hiddenLines.push(`rootCauseEventId: ${chain.rootCause.eventId}`);
  }
  if (chain.pendingConsequences?.length) {
    hiddenLines.push(
      `pendingConsequences: ${JSON.stringify(chain.pendingConsequences, null, 2)}`,
    );
  }

  return `<causal_chain id="${chain.chainId}" layer="full">
<visible>
${visibleLines.join("\n")}
</visible>
<hidden>
${hiddenLines.join("\n")}
</hidden>
</causal_chain>`;
});

export default renderCausalChainFull;
