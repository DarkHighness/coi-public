/**
 * ============================================================================
 * Session Storage - IndexedDB Persistence Layer
 * ============================================================================
 *
 * 为 SessionManager 提供 IndexedDB 持久化支持
 * - 使用原生 IndexedDB API（避免额外依赖）
 * - 支持 LRU 清理策略
 * - 存储会话历史以减少重复 Token 开销
 */

import type { ProviderProtocol } from "../../types";

// =============================================================================
// Types
// =============================================================================

export interface SessionConfig {
  slotId: string;
  forkId: number;
  providerId: string;
  modelId: string;
  protocol: ProviderProtocol;
}

/**
 * ModelCapabilities - 记录 Provider/Model 支持的功能。
 *
 * 这些标志在运行时检测并持久化，避免重复尝试不支持的功能。
 */
export interface ModelCapabilities {
  /** 是否支持 tool_choice: "required" (强制调用工具) */
  supportsRequiredToolChoice: boolean;
  /** 是否支持 tools (function calling) */
  supportsTools: boolean;
  /** 是否支持并行工具调用 */
  supportsParallelTools: boolean;
  /** 是否支持图像生成 */
  supportsImage: boolean;
  /** 是否支持视频生成 */
  supportsVideo: boolean;
  /** 是否支持语音/TTS */
  supportsAudio: boolean;
  /** 是否支持 Embedding */
  supportsEmbedding: boolean;
}

/** ProviderCacheHint - 每个 Provider 自己维护的 KV cache / prefix cache hint。 */
export type ProviderCacheHint =
  | { protocol: "gemini"; cachedContentName?: string }
  | { protocol: "openai"; cacheKey?: string }
  | { protocol: "openrouter"; cacheKey?: string }
  | { protocol: "claude"; cacheKey?: string };

/** 默认能力值 (乐观假设，直到检测到不支持) */
export const DEFAULT_MODEL_CAPABILITIES: ModelCapabilities = {
  supportsRequiredToolChoice: true,
  supportsTools: true,
  supportsParallelTools: true,
  supportsImage: false,
  supportsVideo: false,
  supportsAudio: false,
  supportsEmbedding: false,
};

export interface StoredSession {
  id: string;
  slotId: string;
  config: SessionConfig;
  nativeHistory: unknown[];
  lastSummaryId: string | null;
  createdAt: number;
  lastAccessedAt: number;
  /** 运行时检测到的模型能力 */
  modelCapabilities: ModelCapabilities;
  /** Provider 自己维护的 cache hint */
  cacheHint: ProviderCacheHint | null;
  /** Checkpoint Stack (History Lengths) */
  checkpoints?: number[];
}

// =============================================================================
// Constants
// =============================================================================

const DB_NAME = "coi-session-cache";
// NOTE: 彻底重构后，不做迁移；升级版本并在 onupgradeneeded 中重建 store 来清空旧数据。
const DB_VERSION = 2;
const STORE_NAME = "sessions";
const MAX_SESSIONS = 100;

// =============================================================================
// SessionStorage Class
// =============================================================================

class SessionStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error(
          "[SessionStorage] Failed to open database:",
          request.error,
        );
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log("[SessionStorage] Database opened successfully");
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 彻底重构：直接清空旧数据（不做迁移）。
        if (db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
        }

        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("slotId", "slotId", { unique: false });
        store.createIndex("lastAccessedAt", "lastAccessedAt", {
          unique: false,
        });
        console.log(
          "[SessionStorage] Recreated sessions store (cleared old data)",
        );
      };
    });

    return this.initPromise;
  }

  /**
   * Ensure database is ready
   */
  private async ensureDb(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return this.db;
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<StoredSession | undefined> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(sessionId);

      request.onsuccess = () => {
        resolve(request.result as StoredSession | undefined);
      };
      request.onerror = () => {
        console.error("[SessionStorage] Failed to get session:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Save a session (insert or update)
   */
  async saveSession(session: StoredSession): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(session);

      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        console.error(
          "[SessionStorage] Failed to save session:",
          request.error,
        );
        reject(request.error);
      };
    });
  }

  /**
   * Delete a session by ID
   */
  async deleteSession(sessionId: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(sessionId);

      request.onsuccess = () => {
        console.log(`[SessionStorage] Deleted session: ${sessionId}`);
        resolve();
      };
      request.onerror = () => {
        console.error(
          "[SessionStorage] Failed to delete session:",
          request.error,
        );
        reject(request.error);
      };
    });
  }

  /**
   * Delete all sessions for a specific slot
   */
  async deleteSlotSessions(slotId: string): Promise<number> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("slotId");
      const request = index.openCursor(IDBKeyRange.only(slotId));
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.log(
            `[SessionStorage] Deleted ${deletedCount} sessions for slot: ${slotId}`,
          );
          resolve(deletedCount);
        }
      };
      request.onerror = () => {
        console.error(
          "[SessionStorage] Failed to delete slot sessions:",
          request.error,
        );
        reject(request.error);
      };
    });
  }

  /**
   * Clear all sessions
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log("[SessionStorage] Cleared all sessions");
        resolve();
      };
      request.onerror = () => {
        console.error(
          "[SessionStorage] Failed to clear sessions:",
          request.error,
        );
        reject(request.error);
      };
    });
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    sessionCount: number;
    totalHistoryItems: number;
  }> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const countRequest = store.count();
      const allRequest = store.getAll();

      let sessionCount = 0;
      let totalHistoryItems = 0;

      countRequest.onsuccess = () => {
        sessionCount = countRequest.result;
      };

      allRequest.onsuccess = () => {
        const sessions = allRequest.result as StoredSession[];
        totalHistoryItems = sessions.reduce(
          (sum, s) => sum + (s.nativeHistory?.length || 0),
          0,
        );
        resolve({ sessionCount, totalHistoryItems });
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  /**
   * Enforce LRU limit - delete oldest sessions if over limit
   */
  async enforceLruLimit(): Promise<number> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        const count = countRequest.result;
        if (count <= MAX_SESSIONS) {
          resolve(0);
          return;
        }

        const toDelete = count - MAX_SESSIONS;
        const index = store.index("lastAccessedAt");
        const cursorRequest = index.openCursor();
        let deletedCount = 0;

        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>)
            .result;
          if (cursor && deletedCount < toDelete) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            console.log(
              `[SessionStorage] LRU evicted ${deletedCount} sessions`,
            );
            resolve(deletedCount);
          }
        };

        cursorRequest.onerror = () => {
          reject(cursorRequest.error);
        };
      };

      countRequest.onerror = () => {
        reject(countRequest.error);
      };
    });
  }

  /**
   * Check if database is available
   */
  isAvailable(): boolean {
    return typeof indexedDB !== "undefined";
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const sessionStorage = new SessionStorage();
