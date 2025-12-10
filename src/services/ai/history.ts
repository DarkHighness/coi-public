/**
 * ============================================================================
 * Conversation History Manager
 * ============================================================================
 *
 * 核心设计原则（针对 KV Cache / 前缀缓存优化）：
 *
 * 1. **统一 History**：所有 AgenticLoop（turn、forceUpdate 等）共享同一个 History[]
 * 2. **不转换格式**：直接使用 Provider 返回的消息格式，严格保持 byte-level 一致性
 * 3. **只 Append**：正常情况下只向 History 追加消息，不修改已有消息
 * 4. **按需重建**：只在以下情况重建 History：
 *    - 创建分叉（Fork）
 *    - 创建 Summary
 *    - 用户更改设置（Model、Compatibility 等）
 *    - 用户退出/加载新游戏
 *    - Provider 返回上下文长度错误
 * 5. **不持久化**：History 是临时状态，不保存到存档
 *
 * History 结构：
 * [Static Context] + ([Fresh Segment] + [Summary] 如果存在) + [Dynamic Segments...]
 *
 * - Static Context: 系统指令、世界背景、角色介绍（几乎不变）
 * - Fresh Segment: Summary 之前的最近几条记录（用于上下文连续性）
 * - Summary: 故事摘要
 * - Dynamic Segments: Tool Call、User Action、Model Response（持续追加）
 */

import type {
  GameState,
  StoryOutline,
  StorySummary,
  StorySegment,
  AISettings,
  UnifiedMessage,
} from "../../types";

import { createUserMessage, createAssistantMessage } from "../messageTypes";

import { buildLayeredContext } from "../prompts/contextBuilder";

// ============================================================================
// Types
// ============================================================================

/**
 * History 重建触发器
 */
export type HistoryInvalidationReason =
  | "fork_created" // 创建分叉
  | "summary_created" // 创建摘要
  | "settings_changed" // 设置变更（模型、兼容性等）
  | "game_loaded" // 加载新游戏/存档
  | "context_overflow" // 上下文长度超出
  | "manual_clear" // 手动清除
  | "initial"; // 初始化

/**
 * History 管理器的配置
 */
export interface HistoryManagerConfig {
  /** 是否启用 RAG */
  ragEnabled: boolean;
  /** 语言代码 */
  language: string;
  /** Fresh segment 数量（Summary 前保留的消息数） */
  freshSegmentCount: number;
}

/**
 * Static Context - 几乎不变的部分
 */
export interface StaticContext {
  /** 系统指令（已构建好的完整指令） */
  systemInstruction: string;
  /** 世界背景层 */
  worldFoundation: string;
  /** 角色介绍层 */
  characterIntro: string;
}

/**
 * History 状态
 */
export interface HistoryState {
  /** 是否已初始化 */
  initialized: boolean;
  /** 完整的消息历史（只增不减，直到重建） */
  messages: UnifiedMessage[];
  /** 当前 Static Context（用于检测是否需要重建） */
  staticContext: StaticContext | null;
  /** 上次重建的原因 */
  lastInvalidationReason: HistoryInvalidationReason | null;
  /** 当前使用的 Summary（用于检测是否需要重建） */
  currentSummaryId: string | null;
  /** 当前 Fork ID */
  forkId: number;
}

// ============================================================================
// History Manager
// ============================================================================

/**
 * 创建空的 History 状态
 */
export function createEmptyHistoryState(): HistoryState {
  return {
    initialized: false,
    messages: [],
    staticContext: null,
    lastInvalidationReason: null,
    currentSummaryId: null,
    forkId: 0,
  };
}

/**
 * 检查是否需要重建 History
 */
export function shouldRebuildHistory(
  currentState: HistoryState,
  gameState: GameState,
  newStaticContext: StaticContext,
  newSummary: StorySummary | null,
): { shouldRebuild: boolean; reason: HistoryInvalidationReason | null } {
  // 1. 未初始化
  if (!currentState.initialized) {
    return { shouldRebuild: true, reason: "initial" };
  }

  // 2. Fork 变化
  if (currentState.forkId !== gameState.forkId) {
    return { shouldRebuild: true, reason: "fork_created" };
  }

  // 3. Summary 变化（新创建了 Summary）
  const newSummaryId = newSummary
    ? `${newSummary.nodeRange?.fromIndex}-${newSummary.nodeRange?.toIndex}`
    : null;
  if (currentState.currentSummaryId !== newSummaryId) {
    return { shouldRebuild: true, reason: "summary_created" };
  }

  // 4. Static Context 变化（设置变更等）
  if (currentState.staticContext) {
    if (
      currentState.staticContext.systemInstruction !==
      newStaticContext.systemInstruction
    ) {
      return { shouldRebuild: true, reason: "settings_changed" };
    }
  }

  return { shouldRebuild: false, reason: null };
}

/**
 * 构建 Static Context
 */
export function buildStaticContext(
  systemInstruction: string,
  gameState: GameState,
): StaticContext {
  const layers = buildLayeredContext({
    outline: gameState.outline,
    gameState,
    godMode: gameState.godMode,
  });

  return {
    systemInstruction,
    worldFoundation: layers.staticLayer,
    characterIntro: "", // 已包含在 staticLayer 中
  };
}

/**
 * 构建初始 History（完全重建）
 *
 * 结构：
 * [World Foundation Ack] + [Summary + Fresh Segments 如果存在] + [Story Background Ack]
 */
export function buildInitialHistory(
  staticContext: StaticContext,
  gameState: GameState,
  freshSegments: StorySegment[],
  ragContext?: string,
): UnifiedMessage[] {
  const messages: UnifiedMessage[] = [];
  const layers = buildLayeredContext({
    outline: gameState.outline,
    gameState,
    godMode: gameState.godMode,
  });

  // === 1. Static Layer: World Foundation ===
  if (layers.staticLayer) {
    messages.push(
      createUserMessage(`[CONTEXT: World Foundation]\n${layers.staticLayer}`),
    );
    messages.push(createAssistantMessage("[World foundation acknowledged.]"));
  }

  // === 2. Semi-Static Layer: Story Background (包含 Summary) ===
  if (layers.semiStaticLayer) {
    messages.push(
      createUserMessage(
        `[CONTEXT: Story Background]\n${layers.semiStaticLayer}`,
      ),
    );
    messages.push(createAssistantMessage("[Background acknowledged.]"));
  }

  // === 3. Fresh Segments (Summary 之前的最近几条) ===
  if (freshSegments.length > 0) {
    const freshContent = freshSegments
      .map((seg) => {
        const role = seg.role === "user" ? "Player" : "Narrator";
        return `[${role}]: ${seg.text}`;
      })
      .join("\n\n");

    messages.push(
      createUserMessage(`[CONTEXT: Recent Events]\n${freshContent}`),
    );
    messages.push(createAssistantMessage("[Recent events acknowledged.]"));
  }

  // === 4. RAG Context (如果启用) ===
  if (ragContext && ragContext.trim()) {
    messages.push(
      createUserMessage(
        `[CONTEXT: Relevant Lore]\n<semantic_context>\n${ragContext}\n</semantic_context>`,
      ),
    );
    messages.push(createAssistantMessage("[Lore context acknowledged.]"));
  }

  // === 5. Dynamic Layer: Current Situation ===
  messages.push(
    createUserMessage(`[CONTEXT: Current Situation]\n${layers.dynamicLayer}`),
  );
  messages.push(
    createAssistantMessage(
      "[Current situation acknowledged. Awaiting player action.]",
    ),
  );

  return messages;
}

/**
 * 追加用户动作到 History
 */
export function appendUserAction(
  history: UnifiedMessage[],
  userAction: string,
): UnifiedMessage[] {
  return [...history, createUserMessage(userAction)];
}

/**
 * 追加 AI 响应到 History（直接使用返回的消息，不转换）
 *
 * 注意：这里我们直接追加 Provider 返回的消息，不做任何转换
 * 这样可以确保 KV Cache 的前缀缓存能够命中
 */
export function appendAIResponse(
  history: UnifiedMessage[],
  response: UnifiedMessage,
): UnifiedMessage[] {
  return [...history, response];
}

/**
 * 追加多条消息到 History
 */
export function appendMessages(
  history: UnifiedMessage[],
  messages: UnifiedMessage[],
): UnifiedMessage[] {
  return [...history, ...messages];
}

/**
 * 从完整的 AgenticLoop 交互中提取新增的消息
 *
 * @param beforeHistory - AgenticLoop 开始前的 History
 * @param afterHistory - AgenticLoop 结束后的 History
 * @returns 新增的消息数组
 */
export function extractNewMessages(
  beforeHistory: UnifiedMessage[],
  afterHistory: UnifiedMessage[],
): UnifiedMessage[] {
  // 简单地取 afterHistory 中 beforeHistory 之后的部分
  return afterHistory.slice(beforeHistory.length);
}

/**
 * 创建新的 History 状态
 */
export function createHistoryState(
  messages: UnifiedMessage[],
  staticContext: StaticContext,
  gameState: GameState,
  reason: HistoryInvalidationReason,
): HistoryState {
  const latestSummary = gameState.summaries?.length
    ? gameState.summaries[gameState.summaries.length - 1]
    : null;

  return {
    initialized: true,
    messages,
    staticContext,
    lastInvalidationReason: reason,
    currentSummaryId: latestSummary
      ? `${latestSummary.nodeRange?.fromIndex}-${latestSummary.nodeRange?.toIndex}`
      : null,
    forkId: gameState.forkId ?? 0,
  };
}

/**
 * 更新 History 状态（追加消息后）
 */
export function updateHistoryState(
  state: HistoryState,
  newMessages: UnifiedMessage[],
): HistoryState {
  return {
    ...state,
    messages: [...state.messages, ...newMessages],
  };
}

// ============================================================================
// Context Overflow Handling
// ============================================================================

/**
 * 处理上下文溢出
 *
 * 当 Provider 返回上下文长度错误时，我们需要：
 * 1. 标记 History 需要重建
 * 2. 触发 Summary 创建（由调用者处理）
 *
 * 注意：我们不估计上下文长度，而是依赖 Provider 的错误返回
 */
export function handleContextOverflow(state: HistoryState): {
  state: HistoryState;
  needsSummary: boolean;
} {
  return {
    state: {
      ...state,
      initialized: false, // 标记需要重建
      lastInvalidationReason: "context_overflow",
    },
    needsSummary: true,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 获取 Fresh Segments（Summary 之前的最近几条记录）
 */
export function getFreshSegments(
  currentFork: StorySegment[],
  summarizedIndex: number,
  freshCount: number,
): StorySegment[] {
  if (summarizedIndex <= 0) return [];

  const startIndex = Math.max(0, summarizedIndex - freshCount);
  return currentFork.slice(startIndex, summarizedIndex);
}

/**
 * 获取 Dynamic Segments（Summary 之后的记录）
 */
export function getDynamicSegments(
  currentFork: StorySegment[],
  summarizedIndex: number,
): StorySegment[] {
  return currentFork.slice(summarizedIndex);
}
