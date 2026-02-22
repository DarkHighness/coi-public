const buildRuntimeLoopBaseline = (
  commandProtocol:
    | "turn"
    | "sudo"
    | "cleanup"
    | "player-rate"
    | "summary"
    | "compact"
    | "outline",
): readonly string[] =>
  [
    "current/skills/commands/runtime/SKILL.md",
    `current/skills/commands/runtime/${commandProtocol}/SKILL.md`,
    "current/skills/core/protocols/SKILL.md",
    "current/skills/craft/writing/SKILL.md",
  ] as const;

const playerRateBaseline = buildRuntimeLoopBaseline("player-rate");

export const LOOP_SKILL_BASELINE = {
  turn: buildRuntimeLoopBaseline("turn"),
  sudo: buildRuntimeLoopBaseline("sudo"),
  cleanup: buildRuntimeLoopBaseline("cleanup"),
  rate: playerRateBaseline,
  "player-rate": playerRateBaseline,
  summary_query: buildRuntimeLoopBaseline("summary"),
  summary_compact: buildRuntimeLoopBaseline("compact"),
  outline: buildRuntimeLoopBaseline("outline"),
} as const;

export const LOOP_RUNTIME_OPTIONAL_SKILLS = {
  god: "current/skills/commands/runtime/god/SKILL.md",
  unlock: "current/skills/commands/runtime/unlock/SKILL.md",
} as const;

export type LoopSkillBaselineKey = keyof typeof LOOP_SKILL_BASELINE;

export const toCanonicalSkillPath = (path: string): string =>
  path.replace(/^current\//, "");

export const getLoopSkillBaselinePaths = (
  key: LoopSkillBaselineKey,
): string[] => [...LOOP_SKILL_BASELINE[key]];

export const getLoopSkillBaselineCanonicalPaths = (
  key: LoopSkillBaselineKey,
): string[] => getLoopSkillBaselinePaths(key).map(toCanonicalSkillPath);

export const getLoopCommandProtocolSkillPath = (
  key: LoopSkillBaselineKey,
): string => {
  const baseline = LOOP_SKILL_BASELINE[key];
  const protocolPath = baseline.find(
    (path) =>
      path.startsWith("current/skills/commands/runtime/") &&
      path !== "current/skills/commands/runtime/SKILL.md",
  );
  return protocolPath || LOOP_SKILL_BASELINE.turn[1];
};

export const resolveRuntimeLoopBaselineKey = (mode: {
  isSudoMode?: boolean;
  isCleanupMode?: boolean;
  isPlayerRateMode?: boolean;
}): LoopSkillBaselineKey => {
  if (mode.isCleanupMode) return "cleanup";
  if (mode.isSudoMode) return "sudo";
  if (mode.isPlayerRateMode) return "rate";
  return "turn";
};

export const formatLoopSkillBaseline = (
  key: LoopSkillBaselineKey,
  opts?: { ordered?: boolean },
): string[] => {
  const entries = LOOP_SKILL_BASELINE[key];
  return entries.map((path, index) =>
    opts?.ordered ? `${index + 1}) \`${path}\`` : `- \`${path}\``,
  );
};
