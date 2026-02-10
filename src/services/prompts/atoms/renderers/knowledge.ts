/**
 * ============================================================================
 * Entity Rendering Atom: Knowledge Renderer
 * ============================================================================
 *
 * Knowledge 实体渲染 - 用于 RAG 和上下文构建。
 * 提供 visible/hidden/full 三个渲染变体。
 *
 * Schema fields:
 * - visible: description, details
 * - hidden: fullTruth, misconceptions (array), toBeRevealed (array)
 */

import type { Atom, Knowledge } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


export type RenderKnowledgeInput = {
  knowledge: Knowledge;
};

/**
 * 渲染 Knowledge 的 visible 层
 */
export const renderKnowledgeVisible: Atom<RenderKnowledgeInput> = defineAtom({ atomId: "atoms/renderers/knowledge#renderKnowledgeVisible", source: "atoms/renderers/knowledge.ts", exportName: "renderKnowledgeVisible" }, ({
  knowledge,
}) => {
  const v = knowledge.visible;
  const lines: string[] = [
    `id: ${knowledge.id}`,
    `title: ${knowledge.title}`,
    `category: ${knowledge.category}`,
  ];

  if (v.description) lines.push(`description: ${v.description}`);
  if (v.details) lines.push(`details: ${v.details}`);
  if (knowledge.discoveredAt)
    lines.push(`discoveredAt: ${knowledge.discoveredAt}`);
  if (knowledge.relatedTo?.length)
    lines.push(`relatedTo: ${JSON.stringify(knowledge.relatedTo)}`);

  return `<knowledge id="${knowledge.id}" layer="visible">
${lines.join("\n")}
</knowledge>`;
});

/**
 * 渲染 Knowledge 的 hidden 层
 */
export const renderKnowledgeHidden: Atom<RenderKnowledgeInput> = defineAtom({ atomId: "atoms/renderers/knowledge#renderKnowledgeHidden", source: "atoms/renderers/knowledge.ts", exportName: "renderKnowledgeHidden" }, ({
  knowledge,
}) => {
  const h = knowledge.hidden;
  if (!h) return "";

  const lines: string[] = [`id: ${knowledge.id}`];

  if (h.fullTruth) lines.push(`fullTruth: ${h.fullTruth}`);
  if (h.misconceptions?.length)
    lines.push(`misconceptions: ${JSON.stringify(h.misconceptions)}`);
  if (h.toBeRevealed?.length)
    lines.push(`toBeRevealed: ${JSON.stringify(h.toBeRevealed)}`);

  return `<knowledge id="${knowledge.id}" layer="hidden">
${lines.join("\n")}
</knowledge>`;
});

/**
 * 渲染 Knowledge 完整信息（visible + hidden）
 */
export const renderKnowledgeFull: Atom<RenderKnowledgeInput> = defineAtom({ atomId: "atoms/renderers/knowledge#renderKnowledgeFull", source: "atoms/renderers/knowledge.ts", exportName: "renderKnowledgeFull" }, ({
  knowledge,
}) => {
  const v = knowledge.visible;
  const h = knowledge.hidden;

  const visibleLines: string[] = [
    `title: ${knowledge.title}`,
    `category: ${knowledge.category}`,
  ];
  if (v.description) visibleLines.push(`description: ${v.description}`);
  if (v.details) visibleLines.push(`details: ${v.details}`);
  if (knowledge.discoveredAt)
    visibleLines.push(`discoveredAt: ${knowledge.discoveredAt}`);
  if (knowledge.relatedTo?.length)
    visibleLines.push(`relatedTo: ${JSON.stringify(knowledge.relatedTo)}`);

  if (!h) {
    return `<knowledge id="${knowledge.id}" layer="visible">
${visibleLines.join("\n")}
</knowledge>`;
  }

  const hiddenLines: string[] = [];
  if (h.fullTruth) hiddenLines.push(`fullTruth: ${h.fullTruth}`);
  if (h.misconceptions?.length)
    hiddenLines.push(`misconceptions: ${JSON.stringify(h.misconceptions)}`);
  if (h.toBeRevealed?.length)
    hiddenLines.push(`toBeRevealed: ${JSON.stringify(h.toBeRevealed)}`);

  return `<knowledge id="${knowledge.id}" layer="full">
<visible>
${visibleLines.join("\n")}
</visible>
<hidden>
${hiddenLines.join("\n")}
</hidden>
</knowledge>`;
});

export default renderKnowledgeFull;
