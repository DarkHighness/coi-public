type NormalizedToolArgsResult = {
  args: unknown;
  changed: boolean;
};

type NormalizedRecordArgsResult = {
  args: Record<string, unknown>;
  changed: boolean;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const stripLegacyCommitMeta = (
  args: Record<string, unknown>,
): NormalizedRecordArgsResult => {
  if (!Object.prototype.hasOwnProperty.call(args, "meta")) {
    return { args, changed: false };
  }
  const { meta: _legacyMeta, ...rest } = args;
  return { args: rest, changed: true };
};

const normalizeLegacyCommitUserAction = (
  args: Record<string, unknown>,
): NormalizedRecordArgsResult => {
  const assistant = args.assistant;
  if (!isObjectRecord(assistant)) {
    return { args, changed: false };
  }

  if (!Object.prototype.hasOwnProperty.call(assistant, "userAction")) {
    return { args, changed: false };
  }

  const nestedUserAction =
    typeof assistant.userAction === "string" ? assistant.userAction : undefined;
  const hasTopLevelUserAction = typeof args.userAction === "string";
  const { userAction: _legacyUserAction, ...assistantRest } = assistant;

  return {
    args: {
      ...args,
      assistant: assistantRest,
      ...(!hasTopLevelUserAction && nestedUserAction
        ? { userAction: nestedUserAction }
        : {}),
    },
    changed: true,
  };
};

/**
 * Normalizes known legacy tool argument shapes into the current schema shape.
 * This keeps retry-time validation and runtime dispatch behavior consistent.
 */
export const normalizeToolArgsForCompatibility = (
  name: string,
  rawArgs: unknown,
): NormalizedToolArgsResult => {
  if (!isObjectRecord(rawArgs)) {
    return { args: rawArgs, changed: false };
  }

  if (name !== "vfs_commit_turn") {
    return { args: rawArgs, changed: false };
  }

  let normalized: Record<string, unknown> = rawArgs;
  let changed = false;

  const metaNormalized = stripLegacyCommitMeta(normalized);
  normalized = metaNormalized.args;
  changed = changed || metaNormalized.changed;

  const userActionNormalized = normalizeLegacyCommitUserAction(normalized);
  normalized = userActionNormalized.args;
  changed = changed || userActionNormalized.changed;

  return { args: normalized, changed };
};
