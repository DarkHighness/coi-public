/**
 * ============================================================================
 * Session Manager - Provider-Native History Management
 * ============================================================================
 *
 * 完全自包含的会话管理系统，负责：
 * 1. 维护各 Provider 原生格式的对话历史
 * 2. 自动检测配置变更并失效旧会话
 * 3. 处理 Summary 创建、Context 溢出等事件
 * 4. 持久化会话到 IndexedDB，恢复时减少重复 Token
 *
 * 设计原则：
 * - 上层只需提供 SessionConfig，无需关心缓存失效逻辑
 * - 直接存储 Provider 原生格式，消除运行时转换开销
 * - 会话 ID 包含所有影响缓存有效性的因素
 * - 内存中只保留当前存档的会话，其他会话持久化到 IndexedDB
 */

import type { ProviderProtocol } from "../../types";
import {
  sessionStorage,
  StoredSession,
  SessionConfig,
  SessionCapabilities,
  DEFAULT_CAPABILITIES,
} from "./sessionStorage";

// Re-export types
export type { SessionConfig, StoredSession, SessionCapabilities };

// =============================================================================
// Session Types
// =============================================================================

/**
 * 会话失效原因
 */
export type InvalidationReason =
  | "provider_changed"
  | "fork_changed"
  | "summary_created"
  | "context_overflow"
  | "manual_clear";

/**
 * 会话状态（内存中）
 */
interface Session {
  /** 会话 ID */
  id: string;
  /** 会话配置快照 */
  config: SessionConfig;
  /** Provider 原生格式的对话历史 */
  nativeHistory: unknown[];
  /** 最后一次 Summary 的 ID（用于检测变更） */
  lastSummaryId: string | null;
  /** 创建时间 */
  createdAt: number;
  /** 最后访问时间 */
  lastAccessedAt: number;
  /** 是否有未持久化的变更 */
  dirty: boolean;
  /** 运行时检测到的能力标志 */
  capabilities: SessionCapabilities;
}

// =============================================================================
// Session Manager
// =============================================================================

class HistorySessionManager {
  /** 当前存档的会话（内存中只保留当前存档） */
  private currentSession: Session | null = null;
  /** 当前存档 ID */
  private currentSlotId: string | null = null;
  /** 是否已初始化 */
  private initialized = false;
  /** 持久化防抖定时器 */
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  /** 持久化防抖延迟 (ms) */
  private readonly PERSIST_DEBOUNCE = 2000;

  /**
   * 初始化 - 必须在使用前调用
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await sessionStorage.initialize();
      this.initialized = true;
      console.log("[SessionManager] Initialized with IndexedDB storage");
    } catch (error) {
      console.warn(
        "[SessionManager] IndexedDB not available, using memory only:",
        error,
      );
      this.initialized = true; // Still mark as initialized, will work without persistence
    }
  }

  /**
   * 获取或创建会话（异步）
   *
   * 自动检测配置变更：
   * - 如果 SessionConfig 变更，自动切换到新会话
   * - 旧会话保留在 IndexedDB
   *
   * @param config 会话配置
   * @returns 会话对象
   */
  async getOrCreateSession(config: SessionConfig): Promise<Session> {
    const newSessionId = this.generateSessionId(config);

    // 检查是否切换存档
    if (this.currentSlotId !== config.slotId) {
      // 持久化当前会话
      await this.persistCurrentSession();
      this.currentSlotId = config.slotId;
      this.currentSession = null;
    }

    // 检查是否切换到不同会话（同存档内）
    if (this.currentSession && this.currentSession.id !== newSessionId) {
      console.log(
        `[SessionManager] Session changed: ${this.currentSession.id} -> ${newSessionId}`,
      );
      // 持久化旧会话
      await this.persistCurrentSession();
      this.currentSession = null;
    }

    // 已有内存会话
    if (this.currentSession) {
      this.currentSession.lastAccessedAt = Date.now();
      return this.currentSession;
    }

    // 尝试从 IndexedDB 加载
    const stored = await this.loadSessionFromStorage(newSessionId);
    if (stored) {
      this.currentSession = {
        ...stored,
        dirty: false,
        // 合并默认能力值（兼容旧版本存储）
        capabilities: { ...DEFAULT_CAPABILITIES, ...stored.capabilities },
      };
      console.log(
        `[SessionManager] Loaded session from storage: ${newSessionId} (${stored.nativeHistory.length} messages)`,
      );
      return this.currentSession;
    }

    // 创建新会话
    const session: Session = {
      id: newSessionId,
      config: { ...config },
      nativeHistory: [],
      lastSummaryId: null,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      dirty: false,
      capabilities: { ...DEFAULT_CAPABILITIES },
    };

    this.currentSession = session;
    console.log(`[SessionManager] Created new session: ${newSessionId}`);

    return session;
  }

  /**
   * 获取当前会话
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * 替换整个历史记录
   */
  setHistory(sessionId: string, history: unknown[]): void {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      console.warn(`[SessionManager] Session not current: ${sessionId}`);
      return;
    }
    this.currentSession.nativeHistory = [...history];
    this.currentSession.lastAccessedAt = Date.now();
    this.currentSession.dirty = true;
    this.schedulePersist();
  }

  /**
   * 获取历史记录
   */
  getHistory(sessionId: string): unknown[] {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      return [];
    }
    return this.currentSession.nativeHistory;
  }

  /**
   * 获取历史记录长度
   */
  getHistoryLength(sessionId: string): number {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      return 0;
    }
    return this.currentSession.nativeHistory.length;
  }

  /**
   * 通知 Summary 创建 - 清空会话历史并从存储删除
   */
  async onSummaryCreated(sessionId: string, summaryId: string): Promise<void> {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      console.warn(
        `[SessionManager] Cannot notify summary: session not current: ${sessionId}`,
      );
      return;
    }

    console.log(
      `[SessionManager] Summary created (${summaryId}), clearing history for session: ${sessionId}`,
    );
    this.currentSession.nativeHistory = [];
    this.currentSession.lastSummaryId = summaryId;
    this.currentSession.lastAccessedAt = Date.now();
    this.currentSession.dirty = true;

    // 从存储中删除（历史已失效）
    try {
      await sessionStorage.deleteSession(sessionId);
    } catch (error) {
      console.warn(
        "[SessionManager] Failed to delete session from storage:",
        error,
      );
    }
  }

  /**
   * 通知 Context 溢出 - 清空会话历史并从存储删除
   */
  async onContextOverflow(
    sessionId: string,
  ): Promise<{ needsSummary: boolean }> {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      console.warn(
        `[SessionManager] Cannot handle overflow: session not current: ${sessionId}`,
      );
      return { needsSummary: true };
    }

    console.log(
      `[SessionManager] Context overflow, clearing history for session: ${sessionId}`,
    );
    this.currentSession.nativeHistory = [];
    this.currentSession.lastAccessedAt = Date.now();
    this.currentSession.dirty = true;

    // 从存储中删除
    try {
      await sessionStorage.deleteSession(sessionId);
    } catch (error) {
      console.warn(
        "[SessionManager] Failed to delete session from storage:",
        error,
      );
    }

    return { needsSummary: true };
  }

  /**
   * 手动失效会话 - 清空历史并删除存储
   */
  async invalidate(
    sessionId: string,
    reason: InvalidationReason,
  ): Promise<void> {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      console.warn(
        `[SessionManager] Cannot invalidate: session not current: ${sessionId}`,
      );
      return;
    }

    console.log(
      `[SessionManager] Session invalidated: ${sessionId}, reason: ${reason}`,
    );
    this.currentSession.nativeHistory = [];
    this.currentSession.lastAccessedAt = Date.now();
    this.currentSession.dirty = true;

    // 从存储中删除
    try {
      await sessionStorage.deleteSession(sessionId);
    } catch (error) {
      console.warn(
        "[SessionManager] Failed to delete session from storage:",
        error,
      );
    }
  }

  /**
   * 删除存档的所有会话缓存
   */
  async deleteSlotSessions(slotId: string): Promise<number> {
    // 如果是当前存档，清空内存
    if (this.currentSlotId === slotId) {
      this.currentSession = null;
      this.currentSlotId = null;
    }

    // 从存储删除
    try {
      const count = await sessionStorage.deleteSlotSessions(slotId);
      console.log(
        `[SessionManager] Deleted ${count} sessions for slot: ${slotId}`,
      );
      return count;
    } catch (error) {
      console.warn("[SessionManager] Failed to delete slot sessions:", error);
      return 0;
    }
  }

  /**
   * 清除所有会话缓存
   */
  async clearAll(): Promise<void> {
    this.currentSession = null;
    this.currentSlotId = null;

    try {
      await sessionStorage.clearAll();
      console.log("[SessionManager] Cleared all sessions");
    } catch (error) {
      console.warn("[SessionManager] Failed to clear storage:", error);
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStats(): Promise<{
    currentSessionId: string | null;
    currentHistoryLength: number;
    persistedSessionCount: number;
    totalHistoryItems: number;
  }> {
    const storageStats = await sessionStorage.getStats().catch(() => ({
      sessionCount: 0,
      totalHistoryItems: 0,
    }));

    return {
      currentSessionId: this.currentSession?.id || null,
      currentHistoryLength: this.currentSession?.nativeHistory.length || 0,
      persistedSessionCount: storageStats.sessionCount,
      totalHistoryItems: storageStats.totalHistoryItems,
    };
  }

  /**
   * 强制持久化当前会话（用于退出前保存）
   */
  async flush(): Promise<void> {
    await this.persistCurrentSession();
  }

  // ===========================================================================
  // Capability Management
  // ===========================================================================

  /**
   * 获取会话能力标志
   */
  getCapability<K extends keyof SessionCapabilities>(
    sessionId: string,
    key: K,
  ): SessionCapabilities[K] {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      return DEFAULT_CAPABILITIES[key];
    }
    return this.currentSession.capabilities[key];
  }

  /**
   * 设置会话能力标志（自动触发持久化）
   */
  setCapability<K extends keyof SessionCapabilities>(
    sessionId: string,
    key: K,
    value: SessionCapabilities[K],
  ): void {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      console.warn(
        `[SessionManager] Cannot set capability: session not current: ${sessionId}`,
      );
      return;
    }

    const oldValue = this.currentSession.capabilities[key];
    if (oldValue !== value) {
      console.log(
        `[SessionManager] Capability ${key} changed: ${oldValue} -> ${value}`,
      );
      this.currentSession.capabilities[key] = value;
      this.currentSession.dirty = true;
      this.schedulePersist();
    }
  }

  /**
   * 获取有效的 toolChoice（考虑会话能力）
   *
   * @param sessionId 会话 ID
   * @param requested 请求的 tool choice
   * @returns 实际应该使用的 tool choice
   */
  getEffectiveToolChoice(
    sessionId: string,
    requested: "auto" | "required" | "none",
  ): "auto" | "required" | "none" {
    if (requested !== "required") {
      return requested;
    }

    // 如果请求 required，检查会话是否支持
    const supportsRequired = this.getCapability(
      sessionId,
      "supportsRequiredToolChoice",
    );

    if (!supportsRequired) {
      console.log(
        `[SessionManager] Downgrading toolChoice from "required" to "auto" (not supported)`,
      );
      return "auto";
    }

    return "required";
  }
  // Private Methods
  // ===========================================================================

  /**
   * 生成会话 ID
   */
  private generateSessionId(config: SessionConfig): string {
    return `${config.slotId}:${config.forkId}:${config.providerId}:${config.modelId}`;
  }

  /**
   * 从存储加载会话
   */
  private async loadSessionFromStorage(
    sessionId: string,
  ): Promise<StoredSession | undefined> {
    try {
      return await sessionStorage.getSession(sessionId);
    } catch (error) {
      console.warn(
        "[SessionManager] Failed to load session from storage:",
        error,
      );
      return undefined;
    }
  }

  /**
   * 持久化当前会话到存储
   */
  private async persistCurrentSession(): Promise<void> {
    if (!this.currentSession || !this.currentSession.dirty) return;

    // 只持久化有历史的会话
    if (this.currentSession.nativeHistory.length === 0) {
      this.currentSession.dirty = false;
      return;
    }

    const stored: StoredSession = {
      id: this.currentSession.id,
      slotId: this.currentSession.config.slotId,
      config: this.currentSession.config,
      nativeHistory: this.currentSession.nativeHistory,
      lastSummaryId: this.currentSession.lastSummaryId,
      createdAt: this.currentSession.createdAt,
      lastAccessedAt: this.currentSession.lastAccessedAt,
      capabilities: this.currentSession.capabilities,
    };

    try {
      await sessionStorage.saveSession(stored);
      this.currentSession.dirty = false;
      console.log(
        `[SessionManager] Persisted session: ${stored.id} (${stored.nativeHistory.length} messages)`,
      );

      // 执行 LRU 清理
      await sessionStorage.enforceLruLimit();
    } catch (error) {
      console.warn("[SessionManager] Failed to persist session:", error);
    }
  }

  /**
   * 调度延迟持久化（防抖）
   */
  private schedulePersist(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      this.persistCurrentSession().catch(console.error);
    }, this.PERSIST_DEBOUNCE);
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * 全局会话管理器实例
 *
 * 使用方式:
 * ```typescript
 * import { sessionManager } from './sessionManager';
 *
 * // 初始化（应用启动时调用一次）
 * await sessionManager.initialize();
 *
 * // 获取或创建会话（异步）
 * const session = await sessionManager.getOrCreateSession({
 *   slotId: 'save-1',
 *   forkId: 0,
 *   providerId: 'provider-1',
 *   modelId: 'gpt-4',
 *   protocol: 'openai',
 * });
 *
 * // 同步操作历史
 * sessionManager.setHistory(session.id, newHistory);
 * const history = sessionManager.getHistory(session.id);
 *
 * // Summary 创建后清空（异步）
 * await sessionManager.onSummaryCreated(session.id, 'summary-123');
 *
 * // 删除存档时清理缓存
 * await sessionManager.deleteSlotSessions('save-1');
 * ```
 */
export const sessionManager = new HistorySessionManager();

// 导出类型供测试使用
export type { Session };
