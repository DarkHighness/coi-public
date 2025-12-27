/**
 * ============================================================================
 * Atom Types - 原子类型定义
 * ============================================================================
 *
 * Atom（原子）是最小不可分割的 prompt 片段。
 * 每个 Atom 是一个函数，接收自定义的输入类型，返回渲染后的 prompt 字符串。
 *
 * 设计原则：
 * 1. 每个 Atom 定义自己的输入类型，无统一 Context
 * 2. 逻辑分离：逻辑上不连贯的内容拆分为独立 Atom
 * 3. 可组合：多个 Atom 可以组合成更大的 prompt
 */

/**
 * Atom - 最小不可分割的 prompt 片段
 *
 * @template TInput - 原子的输入类型，每个原子自定义
 * @param input - 渲染此原子所需的参数
 * @returns 渲染后的 prompt 字符串
 *
 * @example
 * // 定义一个简单的 Atom
 * type GreetingInput = { name: string; language: string };
 * const greeting: Atom<GreetingInput> = ({ name, language }) =>
 *   language === 'zh' ? `你好，${name}！` : `Hello, ${name}!`;
 *
 * @example
 * // 无参数的 Atom
 * const dualLayerReality: Atom<void> = () => `
 * <dual_layer_reality>
 * Every entity has TWO layers: Visible and Hidden.
 * </dual_layer_reality>`;
 */
export type Atom<TInput = void> = (input: TInput) => string;

/**
 * AtomDefinition - 原子的元数据定义（用于注册和文档）
 *
 * @template TInput - 原子的输入类型
 */
export interface AtomDefinition<TInput = void> {
  /** 唯一标识符，如 'dual_layer_reality', 'render_npc_visible' */
  id: string;

  /** 人类可读名称 */
  name: string;

  /** 用途描述 */
  description: string;

  /** 原子函数 */
  atom: Atom<TInput>;

  /** 预估 token 数（用于预算计算） */
  estimatedTokens?: number;

  /** 依赖的其他原子 ID（用于自动加载） */
  dependencies?: string[];

  /** 标签，用于分类和搜索 */
  tags?: string[];
}

// ============================================================================
// Re-export common types from main types file for convenience
// ============================================================================

export type {
  NPC,
  Location,
  InventoryItem,
  Quest,
  Faction,
  KnowledgeEntry as Knowledge,
  TimelineEvent,
  Condition,
  CausalChain,
  CharacterStatus as Character,
  GameState,
} from "../../../types";
