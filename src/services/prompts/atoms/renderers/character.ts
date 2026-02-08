/**
 * ============================================================================
 * Entity Rendering Atom: Character Renderer
 * ============================================================================
 *
 * Character (Protagonist) entity rendering - for RAG and context building.
 * Protagonist usually only has visible layer (player fully knows themselves), but hiddenTraits needs special handling.
 */

import type { Atom, Character } from "../types";

export type RenderCharacterInput = {
  character: Character;
};

/**
 * Render Character's visible layer (basic info)
 */
export const renderCharacterVisible: Atom<RenderCharacterInput> = ({
  character,
}) => {
  const lines: string[] = [
    `name: ${character.name}`,
    `title: ${character.title}`,
    `race: ${character.race}`,
    `profession: ${character.profession}`,
  ];

  if (character.age) lines.push(`age: ${character.age}`);
  if (character.status) lines.push(`status: ${character.status}`);
  if (character.appearance) lines.push(`appearance: ${character.appearance}`);
  if (character.background) lines.push(`background: ${character.background}`);
  if (character.currentLocation)
    lines.push(`currentLocation: ${character.currentLocation}`);

  // Attributes
  if (character.attributes?.length) {
    const attrStrs = character.attributes.map(
      (a) => `${a.label}: ${a.value}/${a.maxValue}`,
    );
    lines.push(`attributes: ${attrStrs.join(", ")}`);
  }

  // Psychology
  if (character.psychology) {
    const psych = character.psychology;
    if (psych.coreTrauma) lines.push(`coreTrauma: ${psych.coreTrauma}`);
    if (psych.copingMechanism)
      lines.push(`copingMechanism: ${psych.copingMechanism}`);
    if (psych.internalContradiction)
      lines.push(`internalContradiction: ${psych.internalContradiction}`);
  }

  return `<protagonist layer="visible">
${lines.join("\n")}
</protagonist>`;
};

/**
 * Render Character's hidden layer (hiddenTraits and unlocked abilities)
 */
export const renderCharacterHidden: Atom<RenderCharacterInput> = ({
  character,
}) => {
  const lines: string[] = [];

  // Hidden traits
  if (character.hiddenTraits?.length) {
    const traitStrs = character.hiddenTraits.map((t) => {
      const effects = t.effects?.join(", ") || "";
      const triggers = t.triggerConditions?.join(", ") || "";
      return `[${t.name}] ${t.description} | effects: ${effects} | triggers: ${triggers} | unlocked: ${t.unlocked}`;
    });
    lines.push(`hiddenTraits:\n  ${traitStrs.join("\n  ")}`);
  }

  // Skills with hidden effects
  if (character.skills?.length) {
    const skillsWithHidden = character.skills.filter((s) => s.hidden);
    if (skillsWithHidden.length) {
      const skillStrs = skillsWithHidden.map(
        (s) => `[${s.name}] hidden: ${JSON.stringify(s.hidden)}`,
      );
      lines.push(`skillsWithHiddenEffects:\n  ${skillStrs.join("\n  ")}`);
    }
  }

  if (lines.length === 0) return "";

  return `<protagonist layer="hidden">
${lines.join("\n")}
</protagonist>`;
};

/**
 * Render full Character info (visible + hidden)
 */
export const renderCharacterFull: Atom<RenderCharacterInput> = ({
  character,
}) => {
  const visibleContent = renderCharacterVisible({ character });
  const hiddenContent = renderCharacterHidden({ character });

  if (!hiddenContent) return visibleContent;

  return `<protagonist layer="full">
<visible>
name: ${character.name}
title: ${character.title}
race: ${character.race}
profession: ${character.profession}
${character.age ? `age: ${character.age}` : ""}
${character.status ? `status: ${character.status}` : ""}
${character.appearance ? `appearance: ${character.appearance}` : ""}
${character.background ? `background: ${character.background}` : ""}
${character.currentLocation ? `currentLocation: ${character.currentLocation}` : ""}
</visible>
<hidden>
${character.hiddenTraits?.length ? `hiddenTraits: ${JSON.stringify(character.hiddenTraits)}` : ""}
</hidden>
</protagonist>`;
};

export default renderCharacterFull;
