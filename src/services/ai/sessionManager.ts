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

import type { ProviderInstance, ProviderProtocol } from "../../types";
import {
  sessionStorage,
  StoredSession,
  SessionConfig,
  ProviderCacheHint,
} from "./sessionStorage";

import type { ProviderBase } from "./provider/interfaces";
import { createProvider } from "./provider/createProvider";
// createProviderConfig is likely not needed if we use getProvider logic

// Re-export types
export type { SessionConfig, StoredSession, ProviderCacheHint };

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
  /** Provider 自己维护的 cache hint */
  cacheHint: ProviderCacheHint | null;

  /** 运行时缓存：固定 Provider 实例（不持久化） */
  runtimeProvider?: ProviderBase;

  /**
   * Checkpoint Stack (History Lengths)
   * 支持精确的回滚机制 (Undo/Retry)
   */
  checkpoints: number[];
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

  /**
   * 获取或创建会话
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
      // SANITIZATION: Remove dangling/invalid tail messages
      // This handles cases where the app exited while waiting for AI response
      let sanitizedHistory = [...stored.nativeHistory];
      let wasSanitized = false;

      while (sanitizedHistory.length > 0) {
        const last = sanitizedHistory[sanitizedHistory.length - 1] as any;

        // 1. Remove dangling user messages (Interrupted request)
        // NOTE: We only remove "user" role messages here.
        // "function" and "tool" messages are valid tool call responses and should NOT be removed.
        // If a tool message is at the end, the AI was processing the tool result when interrupted.
        // This is a valid state that can be resumed.
        if (last && last.role === "user") {
          console.warn(
            `[SessionManager] Found dangling user message in loaded session ${newSessionId}, removing.`,
          );
          sanitizedHistory.pop();
          wasSanitized = true;
          continue;
        }

        // 2. Remove empty/invalid model messages (API error or empty partial)
        if (last && (last.role === "model" || last.role === "assistant")) {
          // Gemini: Check for empty parts
          if (
            last.parts &&
            Array.isArray(last.parts) &&
            last.parts.length === 0
          ) {
            console.warn(
              `[SessionManager] Found empty model message in loaded session ${newSessionId}, removing.`,
            );
            sanitizedHistory.pop();
            wasSanitized = true;
            continue;
          }
          // OpenAI/Generic: Check for empty content (if no tool calls)
          if (
            (!last.content || last.content === "") &&
            (!last.tool_calls || last.tool_calls.length === 0)
          ) {
            // Note: Some models return empty content with tool calls, which IS valid.
            // So we only remove if NO content AND NO tool calls.
            // But usually we just check parts for Gemini.
            // For safety, let's just stick to the evident "empty parts" for now.
          }
        }

        break;
      }

      this.currentSession = {
        ...stored,
        nativeHistory: sanitizedHistory,
        dirty: wasSanitized, // Mark dirty if changed so we save the clean version later
        cacheHint: stored.cacheHint ?? null,
        // Upgrade legacy session: init checkpoints
        checkpoints: (stored as any).checkpoints || [],
      };

      // SANITIZATION: Deduplicate history
      const originalLength = this.currentSession.nativeHistory.length;
      this.currentSession.nativeHistory = this.deduplicateHistory(
        this.currentSession.nativeHistory,
      );
      if (this.currentSession.nativeHistory.length !== originalLength) {
        wasSanitized = true;
        console.log(
          `[SessionManager] Deduplicated history: ${originalLength} -> ${this.currentSession.nativeHistory.length}`,
        );
      }

      if (wasSanitized) {
        this.schedulePersist();
      }

      console.log(
        `[SessionManager] Loaded session from storage: ${newSessionId} (${this.currentSession.nativeHistory.length} messages${wasSanitized ? ", sanitized" : ""})`,
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
      dirty: true,
      cacheHint: null,
      checkpoints: [],
    };

    this.currentSession = session;
    console.log(`[SessionManager] Created new session: ${newSessionId}`);
    this.currentSlotId = config.slotId;
    this.schedulePersist();
    return this.currentSession;
  }

  /**
   * 记录检查点 (Checkpoint)
   * 标记当前回合开始时的历史长度
   */
  checkpoint(sessionId: string): void {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      console.warn(`[SessionManager] Session not current: ${sessionId}`);
      return;
    }

    const currentLen = this.currentSession.nativeHistory.length;
    // Don't push duplicate checkpoints if length hasn't changed (idempotent)
    const lastCheckpoint =
      this.currentSession.checkpoints[
        this.currentSession.checkpoints.length - 1
      ];
    if (lastCheckpoint === currentLen) return;

    this.currentSession.checkpoints.push(currentLen);
    this.currentSession.dirty = true;
    console.log(`[SessionManager] Checkpoint created at index ${currentLen}`);
    this.schedulePersist();
  }

  /**
   * 回滚到上一个检查点 (Rollback to Last Start)
   */
  rollbackToLastCheckpoint(sessionId: string): void {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      console.warn(`[SessionManager] Session not current: ${sessionId}`);
      return;
    }

    if (this.currentSession.checkpoints.length === 0) {
      console.warn(`[SessionManager] No checkpoints to rollback to.`);
      return;
    }

    const targetLen = this.currentSession.checkpoints.pop()!;
    console.log(
      `[SessionManager] Rolling back to checkpoint index ${targetLen}`,
    );

    if (targetLen <= this.currentSession.nativeHistory.length) {
      this.currentSession.nativeHistory =
        this.currentSession.nativeHistory.slice(0, targetLen);
      this.currentSession.lastAccessedAt = Date.now();
      this.currentSession.dirty = true;
      this.schedulePersist();
    }
  }

  /**
   * 获取当前会话
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * 获取/缓存当前会话关联的 Provider。
   * 设计约束：一个 Session 只能绑定一个固定 Provider（providerId + protocol）。
   */
  getProvider(sessionId: string, instance?: ProviderInstance): ProviderBase {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      throw new Error(`[SessionManager] Session not current: ${sessionId}`);
    }

    if (instance) {
      if (this.currentSession.config.providerId !== instance.id) {
        throw new Error(
          `[SessionManager] Provider mismatch for session ${sessionId}: expected ${this.currentSession.config.providerId}, got ${instance.id}`,
        );
      }
      if (this.currentSession.config.protocol !== instance.protocol) {
        throw new Error(
          `[SessionManager] Protocol mismatch for session ${sessionId}: expected ${this.currentSession.config.protocol}, got ${instance.protocol}`,
        );
      }

      if (!this.currentSession.runtimeProvider) {
        this.currentSession.runtimeProvider = createProvider(instance);
      }
    }

    if (this.currentSession.runtimeProvider) {
      return this.currentSession.runtimeProvider;
    }

    throw new Error(
      "[SessionManager] Provider instance required to initialize runtime provider",
    );
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
   * 检查会话历史是否为空
   */
  isEmpty(sessionId: string): boolean {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      return true;
    }
    return this.currentSession.nativeHistory.length === 0;
  }

  /**
   * 追加历史记录 (增量更新)
   */
  appendHistory(sessionId: string, newMessages: unknown[]): void {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      console.warn(`[SessionManager] Session not current: ${sessionId}`);
      return;
    }

    const preLength = this.currentSession.nativeHistory.length;
    const merged = [...this.currentSession.nativeHistory, ...newMessages];

    console.log(
      `[SessionManager] Appending ${newMessages.length} messages. Merged length: ${merged.length}`,
    );

    this.currentSession.nativeHistory = this.deduplicateHistory(merged);

    if (this.currentSession.nativeHistory.length !== merged.length) {
      console.log(
        `[SessionManager] Deduplication removed ${merged.length - this.currentSession.nativeHistory.length} messages.`,
      );
    }

    this.currentSession.lastAccessedAt = Date.now();
    this.currentSession.dirty = true;
    this.schedulePersist();
  }

  /**
   * 回滚历史记录 (删除最后 N 条消息)
   */

  rollbackHistory(sessionId: string, count: number): void {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      console.warn(`[SessionManager] Session not current: ${sessionId}`);
      return;
    }

    if (count <= 0) return;

    console.log(
      `[SessionManager] Rolling back ${count} messages from session ${sessionId}`,
    );
    const len = this.currentSession.nativeHistory.length;
    // Ensure we don't rollback more than exists
    const safeCount = Math.min(count, len);

    this.currentSession.nativeHistory = this.currentSession.nativeHistory.slice(
      0,
      len - safeCount,
    );
    this.currentSession.lastAccessedAt = Date.now();
    this.currentSession.dirty = true;
    this.schedulePersist();
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
    this.currentSession.cacheHint = null;
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
    this.currentSession.cacheHint = null;
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
  // ModelCapabilities Management
  // ===========================================================================

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
    forceAuto?: boolean,
  ): "auto" | "required" | "none" {
    if (forceAuto) {
      console.log(
        `[SessionManager] forceAutoToolChoice is enabled, overriding toolChoice to "auto"`,
      );
      return "auto";
    }

    return requested;
  }

  // ===========================================================================
  // Cache Hint Management
  // ===========================================================================

  getCacheHint(sessionId: string): ProviderCacheHint | null {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      return null;
    }
    return this.currentSession.cacheHint;
  }

  setCacheHint(sessionId: string, hint: ProviderCacheHint | null): void {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      console.warn(
        `[SessionManager] Cannot set cache hint: session not current: ${sessionId}`,
      );
      return;
    }

    const old = this.currentSession.cacheHint;
    const next = hint;
    const changed = JSON.stringify(old) !== JSON.stringify(next);
    if (!changed) return;

    this.currentSession.cacheHint = next;
    this.currentSession.dirty = true;
    this.schedulePersist();
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
      cacheHint: this.currentSession.cacheHint,
      checkpoints: this.currentSession.checkpoints,
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

  /**
   * 去重历史记录 (移除相邻的重复消息)
   * 使用 JSON.stringify 进行深度比较
   */
  private deduplicateHistory(history: unknown[]): unknown[] {
    if (history.length === 0) return history;

    const result: unknown[] = [history[0]];
    let lastJson = JSON.stringify(history[0]);

    for (let i = 1; i < history.length; i++) {
      const current = history[i];
      const currentJson = JSON.stringify(current);

      if (currentJson !== lastJson) {
        result.push(current);
        lastJson = currentJson;
      } else {
        // Found duplicate, skip it
        console.debug(
          "[SessionManager] Removed duplicate message at index",
          i,
          current,
        );
      }
    }

    return result;
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
