export type VfsContentType = "application/json" | "text/plain" | "text/markdown";

export type VfsReadEpochReason =
  | "summary_created"
  | "context_overflow"
  | "manual_invalidate"
  | "session_switch"
  | "snapshot_restore";

export interface VfsFile {
  path: string;
  content: string;
  contentType: VfsContentType;
  hash: string;
  size: number;
  updatedAt: number;
}

export type VfsFileMap = Record<string, VfsFile>;

export interface VfsSnapshot {
  saveId: string;
  forkId: number;
  turn: number;
  createdAt: number;
  files: VfsFileMap;
}

export interface VfsIndexEntry {
  path: string;
  hash: string;
  size: number;
}

export interface VfsIndex {
  saveId: string;
  forkId: number;
  turn: number;
  createdAt: number;
  files: VfsIndexEntry[];
}

export interface VfsReadFenceState {
  currentReadEpoch: number;
  seenByEpoch: Record<string, number>;
  boundConversationSessionId: string | null;
}
