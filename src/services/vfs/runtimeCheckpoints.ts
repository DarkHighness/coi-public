import type { VfsFileMap, VfsReadFenceState } from "./types";
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
interface VfsRuntimeCheckpoint {
  files: VfsFileMap;
  readFence: VfsReadFenceState;
}

const vfsCheckpointBySessionId = new Map<string, VfsRuntimeCheckpoint>();

export function checkpointVfsSession(
  sessionId: string,
  vfsSession: VfsSession,
): void {
  vfsCheckpointBySessionId.set(sessionId, {
    files: vfsSession.snapshot(),
    readFence: vfsSession.snapshotReadFenceState(),
  });
}

export function rollbackVfsSessionToCheckpoint(
  sessionId: string,
  vfsSession: VfsSession,
): boolean {
  const snapshot = vfsCheckpointBySessionId.get(sessionId);
  if (!snapshot) return false;
  vfsSession.restore(snapshot.files);
  vfsSession.restoreReadFenceState(snapshot.readFence);
  return true;
}

export function clearVfsCheckpoint(sessionId: string): void {
  vfsCheckpointBySessionId.delete(sessionId);
}
