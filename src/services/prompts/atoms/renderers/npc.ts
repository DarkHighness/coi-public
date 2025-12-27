/**
 * ============================================================================
 * Entity Rendering Atom: NPC Renderer
 * ============================================================================
 *
 * NPC 实体渲染 - 用于 RAG 和上下文构建。
 * 提供 visible/hidden/full 三个渲染变体。
 */

import type { Atom, NPC } from "../types";

export type RenderNpcInput = {
  npc: NPC;
};

/**
 * 渲染 NPC 的 visible 层
 */
export const renderNpcVisible: Atom<RenderNpcInput> = ({ npc }) => {
  const v = npc.visible;
  const lines: string[] = [
    `id: ${npc.id}`,
    `name: ${v.name}`,
  ];

  if (v.description) lines.push(`description: ${v.description}`);
  if (v.appearance) lines.push(`appearance: ${v.appearance}`);
  if (v.npcType) lines.push(`npcType: ${v.npcType}`);
  if (v.impression) lines.push(`impression: ${v.impression}`);
  if (v.status) lines.push(`status: ${v.status}`);
  if (v.personality) lines.push(`personality: ${v.personality}`);
  if (v.dialogueStyle) lines.push(`dialogueStyle: ${v.dialogueStyle}`);
  if (v.affinity !== undefined) lines.push(`affinity: ${v.affinity}`);
  if (npc.currentLocation) lines.push(`currentLocation: ${npc.currentLocation}`);

  return `<npc id="${npc.id}" layer="visible">
${lines.join("\n")}
</npc>`;
};

/**
 * 渲染 NPC 的 hidden 层
 */
export const renderNpcHidden: Atom<RenderNpcInput> = ({ npc }) => {
  const h = npc.hidden;
  if (!h) return "";

  const lines: string[] = [`id: ${npc.id}`];

  if (h.trueName) lines.push(`trueName: ${h.trueName}`);
  if (h.realPersonality) lines.push(`realPersonality: ${h.realPersonality}`);
  if (h.realMotives) lines.push(`realMotives: ${h.realMotives}`);
  if (h.routine) lines.push(`routine: ${h.routine}`);
  if (h.secrets?.length) lines.push(`secrets: ${JSON.stringify(h.secrets)}`);
  if (h.npcType) lines.push(`trueNpcType: ${h.npcType}`);
  if (h.status) lines.push(`trueStatus: ${h.status}`);
  if (h.ambivalence) lines.push(`ambivalence: ${h.ambivalence}`);
  if (h.transactionalBenefit) lines.push(`transactionalBenefit: ${h.transactionalBenefit}`);
  if (h.loveExpression) lines.push(`loveExpression: ${h.loveExpression}`);
  if (h.unspokenSacrifice) lines.push(`unspokenSacrifice: ${h.unspokenSacrifice}`);

  return `<npc id="${npc.id}" layer="hidden">
${lines.join("\n")}
</npc>`;
};

/**
 * 渲染 NPC 完整信息（visible + hidden）
 */
export const renderNpcFull: Atom<RenderNpcInput> = ({ npc }) => {
  const visiblePart = renderNpcVisible({ npc });
  const hiddenPart = renderNpcHidden({ npc });

  if (!hiddenPart) return visiblePart;

  return `<npc id="${npc.id}" layer="full">
<visible>
${renderNpcVisibleContent({ npc })}
</visible>
<hidden>
${renderNpcHiddenContent({ npc })}
</hidden>
</npc>`;
};

// Internal helpers for full rendering
const renderNpcVisibleContent: Atom<RenderNpcInput> = ({ npc }) => {
  const v = npc.visible;
  const lines: string[] = [`name: ${v.name}`];

  if (v.description) lines.push(`description: ${v.description}`);
  if (v.appearance) lines.push(`appearance: ${v.appearance}`);
  if (v.npcType) lines.push(`npcType: ${v.npcType}`);
  if (v.impression) lines.push(`impression: ${v.impression}`);
  if (v.status) lines.push(`status: ${v.status}`);
  if (v.personality) lines.push(`personality: ${v.personality}`);
  if (v.dialogueStyle) lines.push(`dialogueStyle: ${v.dialogueStyle}`);
  if (v.affinity !== undefined) lines.push(`affinity: ${v.affinity}`);

  return lines.join("\n");
};

const renderNpcHiddenContent: Atom<RenderNpcInput> = ({ npc }) => {
  const h = npc.hidden;
  if (!h) return "";

  const lines: string[] = [];

  if (h.trueName) lines.push(`trueName: ${h.trueName}`);
  if (h.realPersonality) lines.push(`realPersonality: ${h.realPersonality}`);
  if (h.realMotives) lines.push(`realMotives: ${h.realMotives}`);
  if (h.routine) lines.push(`routine: ${h.routine}`);
  if (h.secrets?.length) lines.push(`secrets: ${JSON.stringify(h.secrets)}`);
  if (h.npcType) lines.push(`trueNpcType: ${h.npcType}`);
  if (h.status) lines.push(`trueStatus: ${h.status}`);
  if (h.ambivalence) lines.push(`ambivalence: ${h.ambivalence}`);
  if (h.transactionalBenefit) lines.push(`transactionalBenefit: ${h.transactionalBenefit}`);
  if (h.loveExpression) lines.push(`loveExpression: ${h.loveExpression}`);
  if (h.unspokenSacrifice) lines.push(`unspokenSacrifice: ${h.unspokenSacrifice}`);

  return lines.join("\n");
};

export default renderNpcFull;
