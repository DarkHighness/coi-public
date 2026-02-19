export const OUTLINE_PHASE_READ_ROOTS = [
  "outline/phases",
  "shared/narrative/outline/phases",
] as const;

export const getOutlineDefaultReadOnlyAllowPrefixes = (
  _theme: string,
  _isImageBasedFlow: boolean,
): string[] => {
  // Keep defaults simple and not overly strict:
  // - `skills/**` is a built-in read-only library intended to improve generation quality.
  // - `refs/**` is a read-only reference pack(s) seeded into VFS (e.g. atmosphere).
  return ["skills", "refs", ...OUTLINE_PHASE_READ_ROOTS];
};
