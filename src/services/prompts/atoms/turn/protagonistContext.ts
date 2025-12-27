/**
 * ============================================================================
 * Turn Atom: Protagonist Context
 * ============================================================================
 *
 * 主角上下文 - 用于 Turn 生成时的主角信息注入。
 */

import type { Atom, Character } from "../types";

export type ProtagonistContextInput = {
  character: Character;
};

/**
 * 主角上下文
 */
export const protagonistContext: Atom<ProtagonistContextInput> = ({
  character,
}) => {
  const lines: string[] = [
    `name: ${character.name}`,
    `title: ${character.title}`,
    `race: ${character.race}`,
    `profession: ${character.profession}`,
    `appearance: ${character.appearance}`,
    `background: ${character.background}`,
  ];

  if (character.age) lines.push(`age: ${character.age}`);
  if (character.status) lines.push(`status: ${character.status}`);
  if (character.currentLocation) lines.push(`currentLocation: ${character.currentLocation}`);

  return `<protagonist>
${lines.join("\n")}
</protagonist>`;
};

export default protagonistContext;
