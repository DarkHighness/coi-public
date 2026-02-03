import type { VfsFileMap } from "./types";
import type { VfsSession } from "./vfsSession";

/**
 * Runtime-only VFS checkpoints.
 *
 * This is intentionally in-memory and NOT persisted. It is used to guarantee that:
 * - A "Retry" regenerates from a clean pre-turn VFS state.
 * - We don't keep unbounded per-turn snapshots in memory.
 *
 * Strategy: keep only the most recent checkpoint per sessionId.
 */
const vfsCheckpointBySessionId = new Map<string, VfsFileMap>();

export function checkpointVfsSession(
  sessionId: string,
  vfsSession: VfsSession | undefined,
): void {
  if (!vfsSession) return;
  vfsCheckpointBySessionId.set(sessionId, vfsSession.snapshot());
}

export function rollbackVfsSessionToCheckpoint(
  sessionId: string,
  vfsSession: VfsSession | undefined,
): boolean {
  if (!vfsSession) return false;
  const snapshot = vfsCheckpointBySessionId.get(sessionId);
  if (!snapshot) return false;
  vfsSession.restore(snapshot);
  return true;
}

export function clearVfsCheckpoint(sessionId: string): void {
  vfsCheckpointBySessionId.delete(sessionId);
}

