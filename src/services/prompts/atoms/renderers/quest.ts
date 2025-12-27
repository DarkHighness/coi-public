/**
 * ============================================================================
 * Entity Rendering Atom: Quest Renderer
 * ============================================================================
 *
 * Quest 实体渲染 - 用于 RAG 和上下文构建。
 * 提供 visible/hidden/full 三个渲染变体。
 */

import type { Atom, Quest } from "../types";

export type RenderQuestInput = {
  quest: Quest;
};

/**
 * 渲染 Quest 的 visible 层
 */
export const renderQuestVisible: Atom<RenderQuestInput> = ({ quest }) => {
  const v = quest.visible;
  const lines: string[] = [
    `id: ${quest.id}`,
    `title: ${quest.title}`,
    `type: ${quest.type}`,
    `status: ${quest.status}`,
  ];

  if (v.description) lines.push(`description: ${v.description}`);
  if (v.objectives?.length)
    lines.push(`objectives: ${JSON.stringify(v.objectives)}`);

  return `<quest id="${quest.id}" layer="visible">
${lines.join("\n")}
</quest>`;
};

/**
 * 渲染 Quest 的 hidden 层
 */
export const renderQuestHidden: Atom<RenderQuestInput> = ({ quest }) => {
  const h = quest.hidden;
  if (!h) return "";

  const lines: string[] = [`id: ${quest.id}`];

  if (h.trueDescription) lines.push(`trueDescription: ${h.trueDescription}`);
  if (h.trueObjectives?.length)
    lines.push(`trueObjectives: ${JSON.stringify(h.trueObjectives)}`);
  if (h.secretOutcome) lines.push(`secretOutcome: ${h.secretOutcome}`);
  if (h.twist) lines.push(`twist: ${h.twist}`);

  return `<quest id="${quest.id}" layer="hidden">
${lines.join("\n")}
</quest>`;
};

/**
 * 渲染 Quest 完整信息（visible + hidden）
 */
export const renderQuestFull: Atom<RenderQuestInput> = ({ quest }) => {
  const v = quest.visible;
  const h = quest.hidden;

  const visibleLines: string[] = [
    `title: ${quest.title}`,
    `type: ${quest.type}`,
    `status: ${quest.status}`,
  ];
  if (v.description) visibleLines.push(`description: ${v.description}`);
  if (v.objectives?.length)
    visibleLines.push(`objectives: ${JSON.stringify(v.objectives)}`);

  if (!h) {
    return `<quest id="${quest.id}" layer="visible">
${visibleLines.join("\n")}
</quest>`;
  }

  const hiddenLines: string[] = [];
  if (h.trueDescription)
    hiddenLines.push(`trueDescription: ${h.trueDescription}`);
  if (h.trueObjectives?.length)
    hiddenLines.push(`trueObjectives: ${JSON.stringify(h.trueObjectives)}`);
  if (h.secretOutcome) hiddenLines.push(`secretOutcome: ${h.secretOutcome}`);
  if (h.twist) hiddenLines.push(`twist: ${h.twist}`);

  return `<quest id="${quest.id}" layer="full">
<visible>
${visibleLines.join("\n")}
</visible>
<hidden>
${hiddenLines.join("\n")}
</hidden>
</quest>`;
};

export default renderQuestFull;
