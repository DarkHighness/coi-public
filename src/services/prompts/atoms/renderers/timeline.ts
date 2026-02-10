/**
 * ============================================================================
 * Entity Rendering Atom: Timeline Renderer
 * ============================================================================
 *
 * Timeline 实体渲染 - 用于 RAG 和上下文构建。
 * 提供 visible/hidden/full 三个渲染变体。
 */

import type { Atom, TimelineEvent } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


export type RenderTimelineInput = {
  event: TimelineEvent;
};

/**
 * 渲染 Timeline 的 visible 层
 */
export const renderTimelineVisible: Atom<RenderTimelineInput> = defineAtom({ atomId: "atoms/renderers/timeline#renderTimelineVisible", source: "atoms/renderers/timeline.ts", exportName: "renderTimelineVisible" }, ({ event }) => {
  const v = event.visible;
  const lines: string[] = [
    `id: ${event.id}`,
    `name: ${event.name}`,
    `gameTime: ${event.gameTime}`,
    `category: ${event.category}`,
  ];

  if (v.description) lines.push(`description: ${v.description}`);
  if (v.causedBy) lines.push(`causedBy: ${v.causedBy}`);

  return `<timeline_event id="${event.id}" layer="visible">
${lines.join("\n")}
</timeline_event>`;
});

/**
 * 渲染 Timeline 的 hidden 层
 */
export const renderTimelineHidden: Atom<RenderTimelineInput> = defineAtom({ atomId: "atoms/renderers/timeline#renderTimelineHidden", source: "atoms/renderers/timeline.ts", exportName: "renderTimelineHidden" }, ({ event }) => {
  const h = event.hidden;
  if (!h) return "";

  const lines: string[] = [`id: ${event.id}`];

  if (h.trueDescription) lines.push(`trueDescription: ${h.trueDescription}`);
  if (h.trueCausedBy) lines.push(`trueCausedBy: ${h.trueCausedBy}`);
  if (h.consequences) lines.push(`consequences: ${h.consequences}`);

  return `<timeline_event id="${event.id}" layer="hidden">
${lines.join("\n")}
</timeline_event>`;
});

/**
 * 渲染 Timeline 完整信息（visible + hidden）
 */
export const renderTimelineFull: Atom<RenderTimelineInput> = defineAtom({ atomId: "atoms/renderers/timeline#renderTimelineFull", source: "atoms/renderers/timeline.ts", exportName: "renderTimelineFull" }, ({ event }) => {
  const v = event.visible;
  const h = event.hidden;

  const visibleLines: string[] = [
    `name: ${event.name}`,
    `gameTime: ${event.gameTime}`,
    `category: ${event.category}`,
  ];
  if (v.description) visibleLines.push(`description: ${v.description}`);
  if (v.causedBy) visibleLines.push(`causedBy: ${v.causedBy}`);

  if (!h) {
    return `<timeline_event id="${event.id}" layer="visible">
${visibleLines.join("\n")}
</timeline_event>`;
  }

  const hiddenLines: string[] = [];
  if (h.trueDescription)
    hiddenLines.push(`trueDescription: ${h.trueDescription}`);
  if (h.trueCausedBy) hiddenLines.push(`trueCausedBy: ${h.trueCausedBy}`);
  if (h.consequences) hiddenLines.push(`consequences: ${h.consequences}`);

  return `<timeline_event id="${event.id}" layer="full">
<visible>
${visibleLines.join("\n")}
</visible>
<hidden>
${hiddenLines.join("\n")}
</hidden>
</timeline_event>`;
});

export default renderTimelineFull;
