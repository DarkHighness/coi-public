import type { VfsMount } from "./types";

const DEFAULT_MOUNTS: VfsMount[] = [
  {
    id: "mount.shared",
    kind: "canonical",
    prefix: "shared",
    description: "Canonical shared namespace.",
  },
  {
    id: "mount.forks",
    kind: "canonical",
    prefix: "forks",
    description: "Canonical fork namespace.",
  },
  {
    id: "mount.current",
    kind: "alias_current",
    prefix: "current",
    description:
      "Compatibility alias for the active fork view and shared resources.",
  },
];

export class VfsMountRegistry {
  constructor(private readonly mounts: VfsMount[] = DEFAULT_MOUNTS) {}

  public list(): VfsMount[] {
    return this.mounts.map((mount) => ({ ...mount }));
  }

  public getByPrefix(prefix: string): VfsMount | undefined {
    return this.mounts.find((mount) => mount.prefix === prefix);
  }
}

export const vfsMountRegistry = new VfsMountRegistry();
