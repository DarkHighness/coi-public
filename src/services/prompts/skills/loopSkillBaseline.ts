export const LOOP_SKILL_BASELINE = {
  turn: [
    "current/skills/commands/runtime/SKILL.md",
    "current/skills/commands/runtime/turn/SKILL.md",
    "current/skills/core/protocols/SKILL.md",
    "current/skills/craft/writing/SKILL.md",
  ],
  cleanup: [
    "current/skills/commands/runtime/SKILL.md",
    "current/skills/commands/runtime/cleanup/SKILL.md",
    "current/skills/core/protocols/SKILL.md",
    "current/skills/craft/writing/SKILL.md",
  ],
  summary_query: [
    "current/skills/commands/runtime/SKILL.md",
    "current/skills/commands/runtime/summary/SKILL.md",
    "current/skills/core/protocols/SKILL.md",
    "current/skills/craft/writing/SKILL.md",
  ],
  summary_compact: [
    "current/skills/commands/runtime/SKILL.md",
    "current/skills/commands/runtime/compact/SKILL.md",
    "current/skills/core/protocols/SKILL.md",
    "current/skills/craft/writing/SKILL.md",
  ],
  outline: [
    "current/skills/commands/runtime/SKILL.md",
    "current/skills/commands/runtime/outline/SKILL.md",
    "current/skills/core/protocols/SKILL.md",
    "current/skills/craft/writing/SKILL.md",
  ],
} as const;

export type LoopSkillBaselineKey = keyof typeof LOOP_SKILL_BASELINE;

export const formatLoopSkillBaseline = (
  key: LoopSkillBaselineKey,
  opts?: { ordered?: boolean },
): string[] => {
  const entries = LOOP_SKILL_BASELINE[key];
  return entries.map((path, index) =>
    opts?.ordered ? `${index + 1}) ${path}` : `- ${path}`,
  );
};

