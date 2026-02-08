import {
  resolveVfsPath,
  toCanonicalVfsPath,
  toCurrentDisplayPath,
  toLogicalVfsPath,
} from "./core/pathResolver";

export const toCurrentPath = (
  path: string,
  options?: { activeForkId?: number },
): string => toCurrentDisplayPath(path, { activeForkId: options?.activeForkId });

export const stripCurrentPath = (
  path?: string,
  options?: { activeForkId?: number },
): string => {
  const input = path ?? "current";
  return toLogicalVfsPath(input, { activeForkId: options?.activeForkId });
};

export const toCanonicalPath = (
  path: string,
  options?: { activeForkId?: number },
): string => toCanonicalVfsPath(path, { activeForkId: options?.activeForkId });

export const resolveCurrentPath = (
  path: string,
  options?: { activeForkId?: number },
): ReturnType<typeof resolveVfsPath> =>
  resolveVfsPath(path, { activeForkId: options?.activeForkId });
