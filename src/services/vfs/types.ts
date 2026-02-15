export type VfsContentType =
  | "application/json"
  | "application/jsonl"
  | "text/plain"
  | "text/markdown";

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

export interface VfsSnapshotFileRef {
  path: string;
  blobId: string;
  contentType: VfsContentType;
  size: number;
  updatedAt: number;
  legacyHash?: string;
}

export type VfsSnapshotFileRefMap = Record<string, VfsSnapshotFileRef>;

export interface VfsBlobRecord {
  id: string;
  saveId: string;
  blobId: string;
  content: string;
  contentType: VfsContentType;
  size: number;
  refCount: number;
  updatedAt: number;
}

export interface VfsStoredSnapshotV2 {
  version: 2;
  saveId: string;
  forkId: number;
  turn: number;
  createdAt: number;
  fileRefs: VfsSnapshotFileRefMap;
}

export type VfsStoredSnapshot = VfsStoredSnapshotV2;

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
  accessedFilesByEpoch?: Record<string, number>;
  accessedScopesByEpoch?: Record<string, number>;
  boundConversationSessionId: string | null;
}
