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

// ============================================================================
// Skill Output Types - 用于 VFS skill 多文件生成
// ============================================================================

/**
 * Before/After example for skills
 */
export interface SkillExample {
  /** 场景描述 */
  scenario?: string;
  /** 错误做法 */
  wrong: string;
  /** 正确做法 */
  right: string;
}

/**
 * SkillOutput - Skill 的结构化输出
 *
 * 用于 VFS skill 生成器，产生多个文件：
 * - SKILL.md (main content)
 * - CHECKLIST.md (optional)
 * - EXAMPLES.md (optional)
 */
export interface SkillOutput {
  /** 主内容 - 用于 SKILL.md */
  main: string;

  /** Quick Start - 60秒工作流（可选，嵌入 SKILL.md） */
  quickStart?: string;

  /** 检查清单 - 用于 CHECKLIST.md（可选） */
  checklist?: string[];

  /** Before/After 示例 - 用于 EXAMPLES.md（可选） */
  examples?: SkillExample[];

  /** 参考资料 - 用于 references/*.md（可选） */
  references?: Record<string, string>;
}

/**
 * SkillAtom - 返回结构化输出的 Skill 原子
 *
 * @template TInput - 原子的输入类型
 * @returns SkillOutput 结构化内容
 *
 * @example
 * const gmKnowledgeSkill: SkillAtom<void> = () => ({
 *   main: `# GM Knowledge Model\n...`,
 *   checklist: ['Player has definitive proof?', 'Revelation is complete?'],
 *   examples: [{ wrong: 'Unlock on suspicion', right: 'Unlock on proof' }]
 * });
 */
export type SkillAtom<TInput = void> = (input: TInput) => SkillOutput;

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
