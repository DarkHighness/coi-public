/**
 * ============================================================================
 * Entity Rendering Atom: Condition Renderer
 * ============================================================================
 *
 * Condition 实体渲染 - 用于 RAG 和上下文构建。
 * 提供 visible/hidden/full 三个渲染变体。
 *
 * Schema fields:
 * - visible: description, perceivedSeverity
 * - hidden: trueCause, actualSeverity, progression, cure
 * - effects: { visible: string[], hidden: string[] }
 */

import type { Atom, Condition } from "../types";

export type RenderConditionInput = {
  condition: Condition;
};

/**
 * 渲染 Condition 的 visible 层
 */
export const renderConditionVisible: Atom<RenderConditionInput> = ({ condition }) => {
  const v = condition.visible;
  const lines: string[] = [
    `id: ${condition.id}`,
    `name: ${condition.name}`,
    `type: ${condition.type}`,
  ];

  if (condition.startTime) lines.push(`startTime: ${condition.startTime}`);
  if (condition.severity) lines.push(`severity: ${condition.severity}`);
  if (v.description) lines.push(`description: ${v.description}`);
  if (v.perceivedSeverity) lines.push(`perceivedSeverity: ${v.perceivedSeverity}`);

  // Visible effects
  if (condition.effects?.visible?.length) {
    lines.push(`visibleEffects: ${JSON.stringify(condition.effects.visible)}`);
  }

  return `<condition id="${condition.id}" layer="visible">
${lines.join("\n")}
</condition>`;
};

/**
 * 渲染 Condition 的 hidden 层
 */
export const renderConditionHidden: Atom<RenderConditionInput> = ({ condition }) => {
  const h = condition.hidden;
  if (!h) return "";

  const lines: string[] = [`id: ${condition.id}`];

  if (h.trueCause) lines.push(`trueCause: ${h.trueCause}`);
  if (h.actualSeverity) lines.push(`actualSeverity: ${h.actualSeverity}`);
  if (h.progression) lines.push(`progression: ${h.progression}`);
  if (h.cure) lines.push(`cure: ${h.cure}`);

  // Hidden effects
  if (condition.effects?.hidden?.length) {
    lines.push(`hiddenEffects: ${JSON.stringify(condition.effects.hidden)}`);
  }

  return `<condition id="${condition.id}" layer="hidden">
${lines.join("\n")}
</condition>`;
};

/**
 * 渲染 Condition 完整信息（visible + hidden）
 */
export const renderConditionFull: Atom<RenderConditionInput> = ({ condition }) => {
  const v = condition.visible;
  const h = condition.hidden;

  const visibleLines: string[] = [
    `name: ${condition.name}`,
    `type: ${condition.type}`,
  ];
  if (condition.startTime) visibleLines.push(`startTime: ${condition.startTime}`);
  if (condition.severity) visibleLines.push(`severity: ${condition.severity}`);
  if (v.description) visibleLines.push(`description: ${v.description}`);
  if (v.perceivedSeverity) visibleLines.push(`perceivedSeverity: ${v.perceivedSeverity}`);
  if (condition.effects?.visible?.length) {
    visibleLines.push(`visibleEffects: ${JSON.stringify(condition.effects.visible)}`);
  }

  if (!h) {
    return `<condition id="${condition.id}" layer="visible">
${visibleLines.join("\n")}
</condition>`;
  }

  const hiddenLines: string[] = [];
  if (h.trueCause) hiddenLines.push(`trueCause: ${h.trueCause}`);
  if (h.actualSeverity) hiddenLines.push(`actualSeverity: ${h.actualSeverity}`);
  if (h.progression) hiddenLines.push(`progression: ${h.progression}`);
  if (h.cure) hiddenLines.push(`cure: ${h.cure}`);
  if (condition.effects?.hidden?.length) {
    hiddenLines.push(`hiddenEffects: ${JSON.stringify(condition.effects.hidden)}`);
  }

  return `<condition id="${condition.id}" layer="full">
<visible>
${visibleLines.join("\n")}
</visible>
<hidden>
${hiddenLines.join("\n")}
</hidden>
</condition>`;
};

export default renderConditionFull;
