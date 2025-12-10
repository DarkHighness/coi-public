/**
 * ============================================================================
 * Context Builder - 最小化静态上下文构建器
 * ============================================================================
 *
 * 核心设计原则：
 *
 * 1. **仅静态内容**：只提供模型必须知道的、不变的基础信息
 *    - 世界观基础（标题、前提、主要目标）
 *    - 角色基础设定（姓名、种族、职业、外貌、背景）
 *
 * 2. **动态内容通过 Tool Call 获取**：
 *    - 当前状态（时间、位置、HP）→ query_turn
 *    - 物品、任务、关系 → query_* 或 search_tool
 *    - 历史摘要 → query_summary
 *    - NPC 信息 → query_* 或 search_tool
 *
 * 3. **字段可见性规则**：
 *    - AI 作为 GM，通过查询可以看到 hidden 字段
 *    - `unlocked` 字段告诉 AI：玩家是否已经知道了 hidden 中的真相
 *    - INVISIBLE 字段：不应传给 AI（lastAccess、createdAt、highlight）
 */

import type { GameState, StoryOutline, CharacterStatus } from "../../types";
import { toToon } from "./toon";

// ============================================================================
// 上下文构建器 - 主函数
// ============================================================================

export interface LayeredContext {
  /** 静态层 - 世界观和角色基础，几乎不变 */
  staticLayer: string;
  /** 半静态层 - 保留但默认为空，摘要通过 tool call 获取 */
  semiStaticLayer: string;
  /** 动态层 - 保留但默认为空，状态通过 tool call 获取 */
  dynamicLayer: string;
}

export interface ContextBuilderOptions {
  /** 故事大纲 */
  outline: StoryOutline | null;
  /** 游戏状态 */
  gameState: GameState;
  /** 是否为 God Mode */
  godMode?: boolean;
}

/**
 * 构建最小化静态上下文
 *
 * 设计目标：
 * 1. 只提供不变的基础信息
 * 2. 所有动态信息通过 tool call 获取
 * 3. 最大化前缀缓存命中
 */
export function buildLayeredContext(
  options: ContextBuilderOptions,
): LayeredContext {
  const { outline, gameState, godMode = false } = options;

  // ========== 静态层：只有基础信息 ==========
  const staticParts: string[] = [];

  // 1. 世界大纲基础（标题、前提、目标）
  if (outline) {
    staticParts.push(buildOutlineContext(outline));
  }

  // 2. 角色基础信息（姓名、种族、职业、外貌、背景）
  staticParts.push(buildCharacterStaticContext(gameState.character));

  // ========== 半静态层：空（摘要通过 query_summary 获取）==========
  const semiStaticParts: string[] = [];

  // ========== 动态层：只有 God Mode 提示 ==========
  const dynamicParts: string[] = [];

  if (godMode) {
    dynamicParts.push(buildGodModeContext());
  }

  return {
    staticLayer: staticParts.filter(Boolean).join("\n"),
    semiStaticLayer: semiStaticParts.filter(Boolean).join("\n"),
    dynamicLayer: dynamicParts.filter(Boolean).join("\n"),
  };
}

// ============================================================================
// 各层构建函数
// ============================================================================

function buildOutlineContext(outline: StoryOutline): string {
  // 只保留核心世界观信息
  return `
<world_foundation>
<title>${outline.title}</title>
<premise>${outline.premise}</premise>
<main_goal>${toToon(outline.mainGoal)}</main_goal>
<world_setting>${toToon(outline.worldSetting)}</world_setting>
</world_foundation>`;
}

function buildCharacterStaticContext(character: CharacterStatus): string {
  // 角色静态信息 - 创建后不变
  return `
<protagonist>
name: ${character.name}
title: ${character.title}
race: ${character.race}
profession: ${character.profession}
appearance: ${character.appearance}
background: ${character.background}
</protagonist>`;
}

function buildGodModeContext(): string {
  return `
<god_mode>
GOD MODE ACTIVE: Player has absolute power. All actions succeed. NPCs obey unconditionally.
</god_mode>`;
}

// ============================================================================
// 导出完整的 Prompt 构建函数
// ============================================================================

/**
 * 构建优化的完整 Prompt
 *
 * 结构：
 * [System Instruction]
 * [World Foundation] - 静态
 * [Protagonist Base] - 静态
 * [God Mode] - 可选
 *
 * 注意：所有动态内容（状态、物品、任务、关系、摘要）必须通过 tool call 获取
 */
export function buildOptimizedPrompt(
  systemInstruction: string,
  options: ContextBuilderOptions,
): string {
  const layers = buildLayeredContext(options);

  // 只有静态内容时直接拼接
  const parts = [systemInstruction, layers.staticLayer];

  if (layers.semiStaticLayer) {
    parts.push(layers.semiStaticLayer);
  }

  if (layers.dynamicLayer) {
    parts.push(layers.dynamicLayer);
  }

  return parts.filter(Boolean).join("\n\n");
}
