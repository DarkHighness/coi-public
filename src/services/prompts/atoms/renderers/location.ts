/**
 * ============================================================================
 * Entity Rendering Atom: Location Renderer
 * ============================================================================
 *
 * Location 实体渲染 - 用于 RAG 和上下文构建。
 * 提供 visible/hidden/full 三个渲染变体。
 */

import type { Atom, Location } from "../types";

export type RenderLocationInput = {
  location: Location;
};

/**
 * 渲染 Location 的 visible 层
 */
export const renderLocationVisible: Atom<RenderLocationInput> = ({
  location,
}) => {
  const v = location.visible;
  const lines: string[] = [`id: ${location.id}`, `name: ${location.name}`];

  if (location.lore) lines.push(`lore: ${location.lore}`);
  if (v.description) lines.push(`description: ${v.description}`);
  if (v.environment) lines.push(`environment: ${v.environment}`);
  if (v.ambience) lines.push(`ambience: ${v.ambience}`);
  if (v.weather) lines.push(`weather: ${v.weather}`);

  if (v.sensory) {
    const sensoryParts: string[] = [];
    if (v.sensory.smell) sensoryParts.push(`smell: ${v.sensory.smell}`);
    if (v.sensory.sound) sensoryParts.push(`sound: ${v.sensory.sound}`);
    if (v.sensory.lighting)
      sensoryParts.push(`lighting: ${v.sensory.lighting}`);
    if (v.sensory.temperature)
      sensoryParts.push(`temperature: ${v.sensory.temperature}`);
    if (sensoryParts.length)
      lines.push(`sensory: { ${sensoryParts.join(", ")} }`);
  }

  if (v.knownFeatures?.length)
    lines.push(`knownFeatures: ${JSON.stringify(v.knownFeatures)}`);
  if (v.resources?.length)
    lines.push(`resources: ${JSON.stringify(v.resources)}`);

  return `<location id="${location.id}" layer="visible">
${lines.join("\n")}
</location>`;
};

/**
 * 渲染 Location 的 hidden 层
 */
export const renderLocationHidden: Atom<RenderLocationInput> = ({
  location,
}) => {
  const h = location.hidden;
  if (!h) return "";

  const lines: string[] = [`id: ${location.id}`];

  if (h.fullDescription) lines.push(`fullDescription: ${h.fullDescription}`);
  if (h.hiddenFeatures?.length)
    lines.push(`hiddenFeatures: ${JSON.stringify(h.hiddenFeatures)}`);
  if (h.dangers?.length) lines.push(`dangers: ${JSON.stringify(h.dangers)}`);
  if (h.secrets?.length) lines.push(`secrets: ${JSON.stringify(h.secrets)}`);

  return `<location id="${location.id}" layer="hidden">
${lines.join("\n")}
</location>`;
};

/**
 * 渲染 Location 完整信息（visible + hidden）
 */
export const renderLocationFull: Atom<RenderLocationInput> = ({ location }) => {
  const v = location.visible;
  const h = location.hidden;

  const visibleLines: string[] = [`name: ${location.name}`];
  if (location.lore) visibleLines.push(`lore: ${location.lore}`);
  if (v.description) visibleLines.push(`description: ${v.description}`);
  if (v.environment) visibleLines.push(`environment: ${v.environment}`);
  if (v.ambience) visibleLines.push(`ambience: ${v.ambience}`);
  if (v.weather) visibleLines.push(`weather: ${v.weather}`);
  if (v.sensory) {
    const sensoryParts: string[] = [];
    if (v.sensory.smell) sensoryParts.push(`smell: ${v.sensory.smell}`);
    if (v.sensory.sound) sensoryParts.push(`sound: ${v.sensory.sound}`);
    if (v.sensory.lighting)
      sensoryParts.push(`lighting: ${v.sensory.lighting}`);
    if (v.sensory.temperature)
      sensoryParts.push(`temperature: ${v.sensory.temperature}`);
    if (sensoryParts.length)
      visibleLines.push(`sensory: { ${sensoryParts.join(", ")} }`);
  }
  if (v.knownFeatures?.length)
    visibleLines.push(`knownFeatures: ${JSON.stringify(v.knownFeatures)}`);
  if (v.resources?.length)
    visibleLines.push(`resources: ${JSON.stringify(v.resources)}`);

  if (!h) {
    return `<location id="${location.id}" layer="visible">
${visibleLines.join("\n")}
</location>`;
  }

  const hiddenLines: string[] = [];
  if (h.fullDescription)
    hiddenLines.push(`fullDescription: ${h.fullDescription}`);
  if (h.hiddenFeatures?.length)
    hiddenLines.push(`hiddenFeatures: ${JSON.stringify(h.hiddenFeatures)}`);
  if (h.dangers?.length)
    hiddenLines.push(`dangers: ${JSON.stringify(h.dangers)}`);
  if (h.secrets?.length)
    hiddenLines.push(`secrets: ${JSON.stringify(h.secrets)}`);

  return `<location id="${location.id}" layer="full">
<visible>
${visibleLines.join("\n")}
</visible>
<hidden>
${hiddenLines.join("\n")}
</hidden>
</location>`;
};

export default renderLocationFull;
