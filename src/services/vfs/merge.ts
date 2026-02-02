const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const cloneValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item));
  }
  if (isPlainObject(value)) {
    return { ...value };
  }
  return value;
};

export const deepMergeJson = (
  base: unknown,
  patch: unknown,
): Record<string, unknown> | unknown => {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return cloneValue(patch);
  }

  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const existing = result[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      result[key] = deepMergeJson(existing, value);
      continue;
    }
    result[key] = cloneValue(value);
  }

  return result;
};
