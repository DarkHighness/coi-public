export type ToolArgPathSegment = string | number;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toArrayIndex = (segment: ToolArgPathSegment): number | null => {
  if (
    typeof segment === "number" &&
    Number.isInteger(segment) &&
    segment >= 0
  ) {
    return segment;
  }
  if (typeof segment === "string" && /^[0-9]+$/.test(segment)) {
    return Number.parseInt(segment, 10);
  }
  return null;
};

export const formatIssuePath = (path: readonly ToolArgPathSegment[]): string =>
  path.length > 0 ? path.map((segment) => String(segment)).join(".") : "(root)";

export const getValueAtPath = (
  root: unknown,
  path: readonly ToolArgPathSegment[],
): { found: boolean; value: unknown } => {
  if (path.length === 0) {
    return { found: true, value: root };
  }

  let current: unknown = root;

  for (const segment of path) {
    if (Array.isArray(current)) {
      const index = toArrayIndex(segment);
      if (index === null || index < 0 || index >= current.length) {
        return { found: false, value: undefined };
      }
      current = current[index];
      continue;
    }

    if (!isRecord(current)) {
      return { found: false, value: undefined };
    }

    const key = String(segment);
    if (!Object.prototype.hasOwnProperty.call(current, key)) {
      return { found: false, value: undefined };
    }
    current = current[key];
  }

  return { found: true, value: current };
};

export const replaceValueAtPath = (
  root: unknown,
  path: readonly ToolArgPathSegment[],
  nextValue: unknown,
): { root: unknown; applied: boolean } => {
  if (path.length === 0) {
    return { root: nextValue, applied: true };
  }

  if (root === null || typeof root !== "object") {
    return { root, applied: false };
  }

  let current: unknown = root;

  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];

    if (Array.isArray(current)) {
      const arrayIndex = toArrayIndex(segment);
      if (
        arrayIndex === null ||
        arrayIndex < 0 ||
        arrayIndex >= current.length ||
        current[arrayIndex] === undefined
      ) {
        return { root, applied: false };
      }
      current = current[arrayIndex];
      continue;
    }

    if (!isRecord(current)) {
      return { root, applied: false };
    }

    const key = String(segment);
    if (!Object.prototype.hasOwnProperty.call(current, key)) {
      return { root, applied: false };
    }
    current = current[key];
  }

  const tail = path[path.length - 1];
  if (Array.isArray(current)) {
    const arrayIndex = toArrayIndex(tail);
    if (arrayIndex === null || arrayIndex < 0 || arrayIndex >= current.length) {
      return { root, applied: false };
    }
    current[arrayIndex] = nextValue;
    return { root, applied: true };
  }

  if (!isRecord(current)) {
    return { root, applied: false };
  }

  const key = String(tail);
  if (!Object.prototype.hasOwnProperty.call(current, key)) {
    return { root, applied: false };
  }
  current[key] = nextValue;
  return { root, applied: true };
};
