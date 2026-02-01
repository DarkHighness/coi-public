import { normalizeVfsPath } from "./utils";

const CURRENT_ROOT = "current";

export const toCurrentPath = (path: string): string => {
  const normalized = normalizeVfsPath(path);
  return normalized ? `${CURRENT_ROOT}/${normalized}` : CURRENT_ROOT;
};

export const stripCurrentPath = (path?: string): string => {
  const normalized = normalizeVfsPath(path ?? CURRENT_ROOT);
  if (normalized === CURRENT_ROOT) {
    return "";
  }
  if (normalized.startsWith(`${CURRENT_ROOT}/`)) {
    return normalized.slice(CURRENT_ROOT.length + 1);
  }
  throw new Error(`Path must be under ${CURRENT_ROOT}/`);
};
