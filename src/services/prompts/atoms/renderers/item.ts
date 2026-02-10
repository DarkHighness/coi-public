/**
 * ============================================================================
 * Entity Rendering Atom: Item Renderer
 * ============================================================================
 *
 * Item 实体渲染 - 用于 RAG 和上下文构建。
 * 提供 visible/hidden/full 三个渲染变体。
 */

import type { Atom, InventoryItem } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


export type RenderItemInput = {
  item: InventoryItem;
};

/**
 * 渲染 Item 的 visible 层
 */
export const renderItemVisible: Atom<RenderItemInput> = defineAtom({ atomId: "atoms/renderers/item#renderItemVisible", source: "atoms/renderers/item.ts", exportName: "renderItemVisible" }, ({ item }) => {
  const v = item.visible;
  const lines: string[] = [`id: ${item.id}`, `name: ${item.name}`];

  if (item.lore) lines.push(`lore: ${item.lore}`);
  if (item.emotionalWeight)
    lines.push(`emotionalWeight: ${item.emotionalWeight}`);
  if (v.description) lines.push(`description: ${v.description}`);
  if (v.usage) lines.push(`usage: ${v.usage}`);
  if (v.observation) lines.push(`observation: ${v.observation}`);
  if (v.condition) lines.push(`condition: ${v.condition}`);

  if (v.sensory) {
    const sensoryParts: string[] = [];
    if (v.sensory.texture) sensoryParts.push(`texture: ${v.sensory.texture}`);
    if (v.sensory.weight) sensoryParts.push(`weight: ${v.sensory.weight}`);
    if (v.sensory.smell) sensoryParts.push(`smell: ${v.sensory.smell}`);
    if (sensoryParts.length)
      lines.push(`sensory: { ${sensoryParts.join(", ")} }`);
  }

  return `<item id="${item.id}" layer="visible">
${lines.join("\n")}
</item>`;
});

/**
 * 渲染 Item 的 hidden 层
 */
export const renderItemHidden: Atom<RenderItemInput> = defineAtom({ atomId: "atoms/renderers/item#renderItemHidden", source: "atoms/renderers/item.ts", exportName: "renderItemHidden" }, ({ item }) => {
  const h = item.hidden;
  if (!h) return "";

  const lines: string[] = [`id: ${item.id}`];

  if (h.truth) lines.push(`truth: ${h.truth}`);
  if (h.secrets?.length) lines.push(`secrets: ${JSON.stringify(h.secrets)}`);

  return `<item id="${item.id}" layer="hidden">
${lines.join("\n")}
</item>`;
});

/**
 * 渲染 Item 完整信息（visible + hidden）
 */
export const renderItemFull: Atom<RenderItemInput> = defineAtom({ atomId: "atoms/renderers/item#renderItemFull", source: "atoms/renderers/item.ts", exportName: "renderItemFull" }, ({ item }) => {
  const v = item.visible;
  const h = item.hidden;

  const visibleLines: string[] = [`name: ${item.name}`];
  if (item.lore) visibleLines.push(`lore: ${item.lore}`);
  if (item.emotionalWeight)
    visibleLines.push(`emotionalWeight: ${item.emotionalWeight}`);
  if (v.description) visibleLines.push(`description: ${v.description}`);
  if (v.usage) visibleLines.push(`usage: ${v.usage}`);
  if (v.observation) visibleLines.push(`observation: ${v.observation}`);
  if (v.condition) visibleLines.push(`condition: ${v.condition}`);

  if (v.sensory) {
    const sensoryParts: string[] = [];
    if (v.sensory.texture) sensoryParts.push(`texture: ${v.sensory.texture}`);
    if (v.sensory.weight) sensoryParts.push(`weight: ${v.sensory.weight}`);
    if (v.sensory.smell) sensoryParts.push(`smell: ${v.sensory.smell}`);
    if (sensoryParts.length)
      visibleLines.push(`sensory: { ${sensoryParts.join(", ")} }`);
  }

  if (!h) {
    return `<item id="${item.id}" layer="visible">
${visibleLines.join("\n")}
</item>`;
  }

  const hiddenLines: string[] = [];
  if (h.truth) hiddenLines.push(`truth: ${h.truth}`);
  if (h.secrets?.length)
    hiddenLines.push(`secrets: ${JSON.stringify(h.secrets)}`);

  return `<item id="${item.id}" layer="full">
<visible>
${visibleLines.join("\n")}
</visible>
<hidden>
${hiddenLines.join("\n")}
</hidden>
</item>`;
});

export default renderItemFull;
