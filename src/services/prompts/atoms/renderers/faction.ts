/**
 * ============================================================================
 * Entity Rendering Atom: Faction Renderer
 * ============================================================================
 *
 * Faction 实体渲染 - 用于 RAG 和上下文构建。
 * 提供 visible/hidden/full 三个渲染变体。
 */

import type { Atom, Faction } from "../types";

export type RenderFactionInput = {
  faction: Faction;
};

/**
 * 渲染 Faction 的 visible 层
 */
export const renderFactionVisible: Atom<RenderFactionInput> = ({ faction }) => {
  const v = faction.visible;
  const lines: string[] = [`id: ${faction.id}`, `name: ${faction.name}`];

  if (v.agenda) lines.push(`agenda: ${v.agenda}`);
  if (v.influence) lines.push(`influence: ${v.influence}`);
  if (v.members?.length) lines.push(`members: ${JSON.stringify(v.members)}`);
  if (v.relations?.length)
    lines.push(`relations: ${JSON.stringify(v.relations)}`);

  return `<faction id="${faction.id}" layer="visible">
${lines.join("\n")}
</faction>`;
};

/**
 * 渲染 Faction 的 hidden 层
 */
export const renderFactionHidden: Atom<RenderFactionInput> = ({ faction }) => {
  const h = faction.hidden;
  if (!h) return "";

  const lines: string[] = [`id: ${faction.id}`];

  if (h.agenda) lines.push(`trueAgenda: ${h.agenda}`);
  if (h.influence) lines.push(`trueInfluence: ${h.influence}`);
  if (h.members?.length)
    lines.push(`secretMembers: ${JSON.stringify(h.members)}`);
  if (h.internalConflict) lines.push(`internalConflict: ${h.internalConflict}`);
  if (h.relations?.length)
    lines.push(`secretRelations: ${JSON.stringify(h.relations)}`);

  return `<faction id="${faction.id}" layer="hidden">
${lines.join("\n")}
</faction>`;
};

/**
 * 渲染 Faction 完整信息（visible + hidden）
 */
export const renderFactionFull: Atom<RenderFactionInput> = ({ faction }) => {
  const v = faction.visible;
  const h = faction.hidden;

  const visibleLines: string[] = [`name: ${faction.name}`];
  if (v.agenda) visibleLines.push(`agenda: ${v.agenda}`);
  if (v.influence) visibleLines.push(`influence: ${v.influence}`);
  if (v.members?.length)
    visibleLines.push(`members: ${JSON.stringify(v.members)}`);
  if (v.relations?.length)
    visibleLines.push(`relations: ${JSON.stringify(v.relations)}`);

  if (!h) {
    return `<faction id="${faction.id}" layer="visible">
${visibleLines.join("\n")}
</faction>`;
  }

  const hiddenLines: string[] = [];
  if (h.agenda) hiddenLines.push(`trueAgenda: ${h.agenda}`);
  if (h.influence) hiddenLines.push(`trueInfluence: ${h.influence}`);
  if (h.members?.length)
    hiddenLines.push(`secretMembers: ${JSON.stringify(h.members)}`);
  if (h.internalConflict)
    hiddenLines.push(`internalConflict: ${h.internalConflict}`);
  if (h.relations?.length)
    hiddenLines.push(`secretRelations: ${JSON.stringify(h.relations)}`);

  return `<faction id="${faction.id}" layer="full">
<visible>
${visibleLines.join("\n")}
</visible>
<hidden>
${hiddenLines.join("\n")}
</hidden>
</faction>`;
};

export default renderFactionFull;
