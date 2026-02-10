/**
 * ============================================================================
 * Entity Rendering Atom: NPC Renderer
 * ============================================================================
 *
 * NPC 实体渲染 - 用于 RAG 和上下文构建。
 * 提供 visible/hidden/full 三个渲染变体。
 */

import type { Atom, NPC } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


export type RenderNpcInput = {
  npc: NPC;
};

/**
 * 渲染 NPC 的 visible 层
 */
export const renderNpcVisible: Atom<RenderNpcInput> = defineAtom({ atomId: "atoms/renderers/npc#renderNpcVisible", source: "atoms/renderers/npc.ts", exportName: "renderNpcVisible" }, ({ npc }) => {
  const v = npc.visible;
  const lines: string[] = [`id: ${npc.id}`, `name: ${v.name}`];

  if (v.title) lines.push(`title: ${v.title}`);
  if (v.age) lines.push(`age: ${v.age}`);
  if (v.race) lines.push(`race: ${v.race}`);
  if (v.profession) lines.push(`profession: ${v.profession}`);
  if (v.background) lines.push(`background: ${v.background}`);
  if (v.description) lines.push(`description: ${v.description}`);
  if (v.appearance) lines.push(`appearance: ${v.appearance}`);
  if (v.status) lines.push(`status: ${v.status}`);
  if (v.roleTag) lines.push(`roleTag: ${v.roleTag}`);
  if (v.voice) lines.push(`voice: ${v.voice}`);
  if (v.mannerism) lines.push(`mannerism: ${v.mannerism}`);
  if (v.mood) lines.push(`mood: ${v.mood}`);
  if (npc.currentLocation)
    lines.push(`currentLocation: ${npc.currentLocation}`);
  if (Array.isArray(npc.relations) && npc.relations.length > 0) {
    lines.push(`relations: ${JSON.stringify(npc.relations)}`);
  }

  return `<npc id="${npc.id}" layer="visible">
${lines.join("\n")}
</npc>`;
});

/**
 * 渲染 NPC 的 hidden 层
 */
export const renderNpcHidden: Atom<RenderNpcInput> = defineAtom({ atomId: "atoms/renderers/npc#renderNpcHidden", source: "atoms/renderers/npc.ts", exportName: "renderNpcHidden" }, ({ npc }) => {
  const h = npc.hidden;
  if (!h) return "";

  const lines: string[] = [`id: ${npc.id}`];

  if (h.trueName) lines.push(`trueName: ${h.trueName}`);
  if (h.realPersonality) lines.push(`realPersonality: ${h.realPersonality}`);
  if (h.realMotives) lines.push(`realMotives: ${h.realMotives}`);
  if (h.routine) lines.push(`routine: ${h.routine}`);
  if (h.currentThought) lines.push(`currentThought: ${h.currentThought}`);
  if (h.secrets?.length) lines.push(`secrets: ${JSON.stringify(h.secrets)}`);
  if (h.status) lines.push(`trueStatus: ${h.status}`);

  return `<npc id="${npc.id}" layer="hidden">
${lines.join("\n")}
</npc>`;
});

/**
 * 渲染 NPC 完整信息（visible + hidden）
 */
export const renderNpcFull: Atom<RenderNpcInput> = defineAtom({ atomId: "atoms/renderers/npc#renderNpcFull", source: "atoms/renderers/npc.ts", exportName: "renderNpcFull" }, ({ npc }, trace) => {
  const visiblePart = trace.record(renderNpcVisible, { npc });
  const hiddenPart = trace.record(renderNpcHidden, { npc });

  if (!hiddenPart) return visiblePart;

  return `<npc id="${npc.id}" layer="full">
<visible>
${renderNpcVisibleContent({ npc })}
</visible>
<hidden>
${renderNpcHiddenContent({ npc })}
</hidden>
</npc>`;
});

// Internal helpers for full rendering
const renderNpcVisibleContent: Atom<RenderNpcInput> = ({ npc }) => {
  const v = npc.visible;
  const lines: string[] = [`name: ${v.name}`];

  if (v.title) lines.push(`title: ${v.title}`);
  if (v.age) lines.push(`age: ${v.age}`);
  if (v.race) lines.push(`race: ${v.race}`);
  if (v.profession) lines.push(`profession: ${v.profession}`);
  if (v.background) lines.push(`background: ${v.background}`);
  if (v.description) lines.push(`description: ${v.description}`);
  if (v.appearance) lines.push(`appearance: ${v.appearance}`);
  if (v.status) lines.push(`status: ${v.status}`);
  if (v.roleTag) lines.push(`roleTag: ${v.roleTag}`);
  if (v.voice) lines.push(`voice: ${v.voice}`);
  if (v.mannerism) lines.push(`mannerism: ${v.mannerism}`);
  if (v.mood) lines.push(`mood: ${v.mood}`);
  if (Array.isArray(npc.relations) && npc.relations.length > 0) {
    lines.push(`relations: ${JSON.stringify(npc.relations)}`);
  }

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
  if (h.currentThought) lines.push(`currentThought: ${h.currentThought}`);
  if (h.secrets?.length) lines.push(`secrets: ${JSON.stringify(h.secrets)}`);
  if (h.status) lines.push(`trueStatus: ${h.status}`);

  return lines.join("\n");
};

export default renderNpcFull;
