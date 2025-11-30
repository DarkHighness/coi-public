/**
 * ============================================================================
 * Context Builder - 优化的 Prompt 上下文构建器
 * ============================================================================
 *
 * 核心设计原则（针对前缀缓存优化）：
 *
 * 1. **分层结构**：按变化频率分层，静态内容在前，动态内容在后
 *    - STATIC（静态）：系统指令、世界观、角色基础设定 - 几乎不变
 *    - SEMI_STATIC（半静态）：已揭示的背景、NPC基础信息 - 偶尔变化
 *    - DYNAMIC（动态）：当前状态、最近对话、即将变化的属性 - 每回合变化
 *
 * 2. **字段可见性规则**（关键！）：
 *    - AI 作为 GM，始终能看到所有 hidden 字段（这是 GM 的特权）
 *    - `unlocked` 字段告诉 AI：玩家是否已经知道了 hidden 中的真相
 *    - INVISIBLE 字段：不应传给 AI（如 lastAccess、createdAt、highlight）
 *    - 总结：hidden → AI 可见，unlocked 指示玩家是否知情
 *
 * 3. **实体拆分**：将同一实体的静态/半静态/动态字段拆分到不同区域
 *    - 通过 ID 关联
 *    - 减少动态部分的大小
 *
 * 4. **TOON 格式**：对于数组和重复结构，使用 TOON 节省 Token
 */

import type {
  GameState,
  StoryOutline,
  StorySummary,
  StorySegment,
  InventoryItem,
  Relationship,
  Location,
  Quest,
  KnowledgeEntry,
  TimelineEvent,
  CausalChain,
  Faction,
  Skill,
  Condition,
  HiddenTrait,
  AliveEntities,
  CharacterStatus,
  VersionedTimestamp,
  AccessTimestamp,
} from "../../types";
import {
  compareVersionedTimestamp,
  createVersionedTimestamp,
  migrateFromLegacyTimestamp,
  compareAccessTimestamp,
} from "../../types";
import { toToon } from "./toon";

// ============================================================================
// 字段可见性过滤
// ============================================================================

/** 不应传给 AI 的字段（INVISIBLE） */
const INVISIBLE_FIELDS = new Set([
  "lastAccess",
  "createdAt", // 系统字段，AI 不需要
  "lastModified", // 改为 modifiedAt 的版本化时间戳
  "modifiedAt", // 版本化时间戳，AI 也不需要直接看到
  "highlight", // 纯 UI 字段
]);

/**
 * 过滤掉不可见字段
 * 注意：hidden 字段始终对 AI 可见（AI 是 GM，知道一切真相）
 * unlocked 字段用于告诉 AI 玩家是否已知道 hidden 中的信息
 */
function filterInvisibleFields<T extends Record<string, any>>(
  obj: T,
): Partial<T> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (INVISIBLE_FIELDS.has(key)) continue;
    if (value === undefined || value === null) continue;
    if (typeof value === "object" && !Array.isArray(value)) {
      result[key] = filterInvisibleFields(value);
    } else {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}

// ============================================================================
// 实体分层拆分
// ============================================================================

/**
 * 静态字段 - 创建后几乎不变
 */
interface StaticEntityFields {
  id: string;
  name?: string;
  title?: string;
  lore?: string;
  environment?: string;
  type?: string;
  category?: string;
  race?: string;
}

/**
 * 半静态字段 - 重要剧情点才会变化
 */
interface SemiStaticEntityFields {
  id: string;
  visible?: Record<string, any>;
  hidden?: Record<string, any>; // 仅 unlocked=true 时包含
}

/**
 * 动态字段 - 经常变化
 */
interface DynamicEntityFields {
  id: string;
  status?: string;
  affinity?: number;
  trueAffinity?: number;
  currentLocation?: string;
  currentImpression?: string;
  level?: string;
  duration?: number;
  isVisited?: boolean;
  unlocked?: boolean;
  known?: boolean;
  notes?: string;
  modifiedAt?: VersionedTimestamp;
}

// ============================================================================
// 物品拆分
// ============================================================================

interface ItemStatic {
  id: string;
  name: string;
  lore?: string;
  icon?: string;
}

interface ItemSemiStatic {
  id: string;
  visible: { description: string };
  hidden?: { truth: string; secrets?: string[] }; // AI 始终可见
  unlocked?: boolean; // 告诉 AI 玩家是否知道 hidden 内容
}

interface ItemDynamic {
  id: string;
  notes?: string;
}

function splitInventoryItem(item: InventoryItem): {
  static: ItemStatic;
  semiStatic: ItemSemiStatic;
  dynamic: ItemDynamic;
} {
  return {
    static: {
      id: item.id,
      name: item.name,
      lore: item.lore,
      icon: item.icon,
    },
    semiStatic: {
      id: item.id,
      visible: { description: item.visible.description },
      // AI 作为 GM 始终能看到 hidden，unlocked 告诉 AI 玩家是否知道
      hidden: item.hidden
        ? {
            truth: item.hidden.truth,
            secrets: item.hidden.secrets,
          }
        : undefined,
      unlocked: item.unlocked,
    },
    dynamic: {
      id: item.id,
      notes: item.visible.notes,
    },
  };
}

// ============================================================================
// NPC 拆分
// ============================================================================

interface NpcStatic {
  id: string;
  name: string;
  appearance?: string;
  personality?: string; // 公开人格
}

interface NpcSemiStatic {
  id: string;
  description: string;
  relationshipType: string;
  // hidden 始终对 AI 可见（AI 是 GM）
  trueName?: string;
  realPersonality?: string;
  realMotives?: string;
  secrets?: string[];
  unlocked?: boolean; // 告诉 AI 玩家是否知道 hidden 内容
}

interface NpcDynamic {
  id: string;
  affinity: number;
  affinityKnown?: boolean;
  trueAffinity?: number;
  currentLocation?: string;
  currentImpression?: string;
  hiddenRelationshipType?: string;
  hiddenStatus?: string;
  known?: boolean;
  notes?: string;
}

function splitRelationship(npc: Relationship): {
  static: NpcStatic;
  semiStatic: NpcSemiStatic;
  dynamic: NpcDynamic;
} {
  return {
    static: {
      id: npc.id,
      name: npc.visible.name,
      appearance: npc.visible.appearance,
      personality: npc.visible.personality,
    },
    semiStatic: {
      id: npc.id,
      description: npc.visible.description,
      relationshipType: npc.visible.relationshipType,
      // AI 始终能看到 hidden 信息
      trueName: npc.hidden?.trueName,
      realPersonality: npc.hidden?.realPersonality,
      realMotives: npc.hidden?.realMotives,
      secrets: npc.hidden?.secrets,
      // unlocked 告诉 AI 玩家是否知道了真相
      unlocked: npc.unlocked,
    },
    dynamic: {
      id: npc.id,
      affinity: npc.visible.affinity,
      affinityKnown: npc.visible.affinityKnown,
      // hidden 动态字段也始终对 AI 可见
      trueAffinity: npc.hidden?.trueAffinity,
      currentLocation: npc.currentLocation,
      currentImpression: npc.visible.currentImpression,
      hiddenRelationshipType: npc.hidden?.relationshipType,
      hiddenStatus: npc.hidden?.status,
      known: npc.known,
      notes: npc.notes,
    },
  };
}

// ============================================================================
// 地点拆分
// ============================================================================

interface LocationStatic {
  id: string;
  name: string;
  environment?: string;
  lore?: string;
}

interface LocationSemiStatic {
  id: string;
  description: string;
  knownFeatures: string[];
  // hidden 始终对 AI 可见
  fullDescription?: string;
  hiddenFeatures?: string[];
  secrets?: string[];
  unlocked?: boolean; // 告诉 AI 玩家是否知道 hidden 内容
}

interface LocationDynamic {
  id: string;
  isVisited?: boolean;
  notes?: string;
}

function splitLocation(loc: Location): {
  static: LocationStatic;
  semiStatic: LocationSemiStatic;
  dynamic: LocationDynamic;
} {
  return {
    static: {
      id: loc.id,
      name: loc.name,
      environment: loc.environment,
      lore: loc.lore,
    },
    semiStatic: {
      id: loc.id,
      description: loc.visible.description,
      knownFeatures: loc.visible.knownFeatures,
      // AI 始终能看到 hidden 信息
      fullDescription: loc.hidden?.fullDescription,
      hiddenFeatures: loc.hidden?.hiddenFeatures,
      secrets: loc.hidden?.secrets,
      unlocked: loc.unlocked,
    },
    dynamic: {
      id: loc.id,
      isVisited: loc.isVisited,
      notes: loc.notes,
    },
  };
}

// ============================================================================
// 任务拆分
// ============================================================================

interface QuestStatic {
  id: string;
  title: string;
  type: "main" | "side" | "hidden";
}

interface QuestSemiStatic {
  id: string;
  description: string;
  objectives: string[];
  // hidden 始终对 AI 可见
  trueDescription?: string;
  trueObjectives?: string[];
  secretOutcome?: string;
  unlocked?: boolean; // 告诉 AI 玩家是否知道 hidden 内容
}

interface QuestDynamic {
  id: string;
  status?: "active" | "completed" | "failed";
}

function splitQuest(quest: Quest): {
  static: QuestStatic;
  semiStatic: QuestSemiStatic;
  dynamic: QuestDynamic;
} {
  return {
    static: {
      id: quest.id,
      title: quest.title,
      type: quest.type,
    },
    semiStatic: {
      id: quest.id,
      description: quest.visible.description,
      objectives: quest.visible.objectives,
      // AI 始终能看到 hidden 信息
      trueDescription: quest.hidden?.trueDescription,
      trueObjectives: quest.hidden?.trueObjectives,
      secretOutcome: quest.hidden?.secretOutcome,
      unlocked: quest.unlocked,
    },
    dynamic: {
      id: quest.id,
      status: quest.status,
    },
  };
}

// ============================================================================
// 知识拆分
// ============================================================================

interface KnowledgeStatic {
  id: string;
  title: string;
  category: string;
}

interface KnowledgeSemiStatic {
  id: string;
  description: string;
  details?: string;
  // hidden 始终对 AI 可见
  fullTruth?: string;
  misconceptions?: string[];
  unlocked?: boolean; // 告诉 AI 玩家是否知道 hidden 内容
}

interface KnowledgeDynamic {
  id: string;
  discoveredAt?: string;
  relatedTo?: string[];
}

function splitKnowledge(knowledge: KnowledgeEntry): {
  static: KnowledgeStatic;
  semiStatic: KnowledgeSemiStatic;
  dynamic: KnowledgeDynamic;
} {
  return {
    static: {
      id: knowledge.id,
      title: knowledge.title,
      category: knowledge.category,
    },
    semiStatic: {
      id: knowledge.id,
      description: knowledge.visible.description,
      details: knowledge.visible.details,
      // AI 始终能看到 hidden 信息
      fullTruth: knowledge.hidden?.fullTruth,
      misconceptions: knowledge.hidden?.misconceptions,
      unlocked: knowledge.unlocked,
    },
    dynamic: {
      id: knowledge.id,
      discoveredAt: knowledge.discoveredAt,
      relatedTo: knowledge.relatedTo,
    },
  };
}

// ============================================================================
// 技能拆分
// ============================================================================

interface SkillStatic {
  id?: string;
  name: string;
  category?: string;
}

interface SkillSemiStatic {
  id?: string;
  description: string;
  knownEffects: string[];
  // hidden 始终对 AI 可见
  trueDescription?: string;
  hiddenEffects?: string[];
  drawbacks?: string[];
  unlocked?: boolean; // 告诉 AI 玩家是否知道 hidden 内容
}

interface SkillDynamic {
  id?: string;
  level: string;
}

function splitSkill(skill: Skill): {
  static: SkillStatic;
  semiStatic: SkillSemiStatic;
  dynamic: SkillDynamic;
} {
  return {
    static: {
      id: skill.id,
      name: skill.name,
      category: skill.category,
    },
    semiStatic: {
      id: skill.id,
      description: skill.visible.description,
      knownEffects: skill.visible.knownEffects,
      // AI 始终能看到 hidden 信息
      trueDescription: skill.hidden?.trueDescription,
      hiddenEffects: skill.hidden?.hiddenEffects,
      drawbacks: skill.hidden?.drawbacks,
      unlocked: skill.unlocked,
    },
    dynamic: {
      id: skill.id,
      level: skill.level,
    },
  };
}

// ============================================================================
// 状态条件拆分
// ============================================================================

interface ConditionStatic {
  id?: string;
  name: string;
  type: string;
}

interface ConditionSemiStatic {
  id?: string;
  description: string;
  perceivedSeverity?: string;
  visibleEffects: string[];
  // hidden 始终对 AI 可见
  trueCause?: string;
  actualSeverity?: string;
  progression?: string;
  cure?: string;
  hiddenEffects?: string[];
  unlocked?: boolean; // 告诉 AI 玩家是否知道 hidden 内容
}

interface ConditionDynamic {
  id?: string;
  severity?: string;
}

function splitCondition(condition: Condition): {
  static: ConditionStatic;
  semiStatic: ConditionSemiStatic;
  dynamic: ConditionDynamic;
} {
  return {
    static: {
      id: condition.id,
      name: condition.name,
      type: condition.type,
    },
    semiStatic: {
      id: condition.id,
      description: condition.visible.description,
      perceivedSeverity: condition.visible.perceivedSeverity,
      visibleEffects: condition.effects.visible,
      // AI 始终能看到 hidden 信息
      trueCause: condition.hidden?.trueCause,
      actualSeverity: condition.hidden?.actualSeverity,
      progression: condition.hidden?.progression,
      cure: condition.hidden?.cure,
      hiddenEffects: condition.effects.hidden,
      unlocked: condition.unlocked,
    },
    dynamic: {
      id: condition.id,
      severity: condition.severity,
    },
  };
}

// ============================================================================
// 上下文构建器 - 主函数
// ============================================================================

export interface LayeredContext {
  /** 静态层 - 放在 Prompt 最前面，命中前缀缓存 */
  staticLayer: string;
  /** 半静态层 - 中间部分 */
  semiStaticLayer: string;
  /** 动态层 - 放在 Prompt 最后，每次都变化 */
  dynamicLayer: string;
}

export interface ContextBuilderOptions {
  /** 故事大纲 */
  outline: StoryOutline | null;
  /** 游戏状态 */
  gameState: GameState;
  /** 最近历史记录 */
  recentHistory: StorySegment[];
  /** 摘要列表 */
  summaries: StorySummary[];
  /** 是否为 God Mode */
  godMode?: boolean;
  /** AI 标记的活跃实体 */
  aliveEntities?: AliveEntities;
  /** 限制每个类别的实体数量 */
  limits?: {
    inventory?: number;
    relationships?: number;
    locations?: number;
    quests?: number;
    knowledge?: number;
    skills?: number;
    conditions?: number;
  };
}

const DEFAULT_LIMITS = {
  inventory: 10,
  relationships: 8,
  locations: 6,
  quests: 5,
  knowledge: 8,
  skills: 5,
  conditions: 5,
};

/**
 * 构建分层上下文
 *
 * 设计目标：
 * 1. 静态层内容在多次请求中保持完全一致，最大化前缀缓存命中
 * 2. 动态层包含最小必要信息，减少 Token 消耗
 * 3. 实体按 ID 关联，不重复传输静态信息
 */
export function buildLayeredContext(
  options: ContextBuilderOptions,
): LayeredContext {
  const {
    outline,
    gameState,
    recentHistory,
    summaries,
    godMode = false,
    aliveEntities,
    limits = DEFAULT_LIMITS,
  } = options;

  const mergedLimits = { ...DEFAULT_LIMITS, ...limits };

  // ========== 静态层 ==========
  const staticParts: string[] = [];

  // 1. 世界大纲（几乎不变）
  if (outline) {
    staticParts.push(buildOutlineContext(outline));
  }

  // 2. 角色基础信息（静态部分）
  staticParts.push(buildCharacterStaticContext(gameState.character));

  // 3. 所有已知实体的静态信息（ID + 名称 + 不变属性）
  staticParts.push(
    buildEntitiesStaticContext(gameState, mergedLimits, aliveEntities),
  );

  // ========== 半静态层 ==========
  const semiStaticParts: string[] = [];

  // 1. 实体的描述性内容（visible/hidden 层）
  semiStaticParts.push(
    buildEntitiesSemiStaticContext(gameState, mergedLimits, aliveEntities),
  );

  // 2. 历史摘要
  if (summaries && summaries.length > 0) {
    const latestSummary = summaries[summaries.length - 1];
    semiStaticParts.push(`
<story_summary>
${latestSummary.displayText}
</story_summary>`);
  }

  // ========== 动态层 ==========
  const dynamicParts: string[] = [];

  // 1. 当前状态（时间、位置等）
  dynamicParts.push(buildCurrentStateContext(gameState));

  // 2. 实体的动态属性（状态、好感度等）
  dynamicParts.push(
    buildEntitiesDynamicContext(gameState, mergedLimits, aliveEntities),
  );

  // 3. 最近对话
  if (recentHistory && recentHistory.length > 0) {
    const recentContext = recentHistory
      .map((h) => {
        if (h.role === "user" && h.text.trim().startsWith("/sudo")) {
          const commandContent = h.text.trim().replace(/^\/sudo\s*/i, "");
          return undefined; // Force update commands don't show in history - result already displayed separately
        }
        return `[${h.role}]: ${h.text}`;
      })
      .filter(Boolean)
      .join("\n");
    dynamicParts.push(`
<recent_narrative>
${recentContext}
</recent_narrative>`);
  }

  // 4. 待触发的因果链后果
  dynamicParts.push(buildPendingConsequencesContext(gameState));

  // 5. God Mode 提示
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
  // 使用 TOON 格式减少 Token
  const factionsToon = outline.factions?.length ? toToon(outline.factions) : "";
  const timelineToon = outline.timeline?.length ? toToon(outline.timeline) : "";

  return `
<world_outline>
<title>${outline.title}</title>
<premise>${outline.premise}</premise>
<main_goal>${toToon(outline.mainGoal)}</main_goal>
<world_setting>${toToon(outline.worldSetting)}</world_setting>
${factionsToon ? `<factions>\n${factionsToon}\n</factions>` : ""}
${timelineToon ? `<initial_timeline>\n${timelineToon}\n</initial_timeline>` : ""}
</world_outline>`;
}

function buildCharacterStaticContext(character: CharacterStatus): string {
  // 角色静态信息 - 创建后不变
  return `
<character_base>
name: ${character.name}
title: ${character.title}
race: ${character.race}
profession: ${character.profession}
appearance: ${character.appearance}
background: ${character.background}
</character_base>`;
}

function buildEntitiesStaticContext(
  gameState: GameState,
  limits: typeof DEFAULT_LIMITS,
  aliveEntities?: AliveEntities,
): string {
  const parts: string[] = [];
  const alive = aliveEntities || createEmptyAliveEntities();

  // 选择优先实体
  const priorityItems = selectPriorityEntities(
    gameState.inventory,
    alive.inventory,
    limits.inventory,
  );
  const priorityNpcs = selectPriorityEntities(
    gameState.relationships,
    alive.relationships,
    limits.relationships,
  );
  const priorityLocations = selectPriorityEntities(
    gameState.locations,
    alive.locations,
    limits.locations,
  );
  const priorityQuests = selectPriorityEntities(
    gameState.quests.filter((q) => q.status === "active"),
    alive.quests,
    limits.quests,
  );
  const priorityKnowledge = selectPriorityEntities(
    gameState.knowledge || [],
    alive.knowledge,
    limits.knowledge,
  );

  // 物品静态信息
  if (priorityItems.length > 0) {
    const itemsStatic = priorityItems.map((i) => splitInventoryItem(i).static);
    parts.push(`<items_static>\n${toToon(itemsStatic)}\n</items_static>`);
  }

  // NPC 静态信息
  if (priorityNpcs.length > 0) {
    const npcsStatic = priorityNpcs.map((n) => splitRelationship(n).static);
    parts.push(`<npcs_static>\n${toToon(npcsStatic)}\n</npcs_static>`);
  }

  // 地点静态信息
  if (priorityLocations.length > 0) {
    const locsStatic = priorityLocations.map((l) => splitLocation(l).static);
    parts.push(
      `<locations_static>\n${toToon(locsStatic)}\n</locations_static>`,
    );
  }

  // 任务静态信息
  if (priorityQuests.length > 0) {
    const questsStatic = priorityQuests.map((q) => splitQuest(q).static);
    parts.push(`<quests_static>\n${toToon(questsStatic)}\n</quests_static>`);
  }

  // 知识静态信息
  if (priorityKnowledge.length > 0) {
    const knowledgeStatic = priorityKnowledge.map(
      (k) => splitKnowledge(k).static,
    );
    parts.push(
      `<knowledge_static>\n${toToon(knowledgeStatic)}\n</knowledge_static>`,
    );
  }

  // 技能静态信息
  const prioritySkills = selectPriorityEntities(
    gameState.character.skills || [],
    alive.skills,
    limits.skills,
  );
  if (prioritySkills.length > 0) {
    const skillsStatic = prioritySkills.map((s) => splitSkill(s).static);
    parts.push(`<skills_static>\n${toToon(skillsStatic)}\n</skills_static>`);
  }

  // 状态静态信息
  const priorityConditions = selectPriorityEntities(
    gameState.character.conditions || [],
    alive.conditions,
    limits.conditions,
  );
  if (priorityConditions.length > 0) {
    const conditionsStatic = priorityConditions.map(
      (c) => splitCondition(c).static,
    );
    parts.push(
      `<conditions_static>\n${toToon(conditionsStatic)}\n</conditions_static>`,
    );
  }

  return parts.length > 0
    ? `\n<entities_static>\n${parts.join("\n")}\n</entities_static>`
    : "";
}

function buildEntitiesSemiStaticContext(
  gameState: GameState,
  limits: typeof DEFAULT_LIMITS,
  aliveEntities?: AliveEntities,
): string {
  const parts: string[] = [];
  const alive = aliveEntities || createEmptyAliveEntities();

  // 选择优先实体
  const priorityItems = selectPriorityEntities(
    gameState.inventory,
    alive.inventory,
    limits.inventory,
  );
  const priorityNpcs = selectPriorityEntities(
    gameState.relationships,
    alive.relationships,
    limits.relationships,
  );
  const priorityLocations = selectPriorityEntities(
    gameState.locations,
    alive.locations,
    limits.locations,
  );
  const priorityQuests = selectPriorityEntities(
    gameState.quests.filter((q) => q.status === "active"),
    alive.quests,
    limits.quests,
  );
  const priorityKnowledge = selectPriorityEntities(
    gameState.knowledge || [],
    alive.knowledge,
    limits.knowledge,
  );

  // 物品半静态信息（描述）
  if (priorityItems.length > 0) {
    const itemsSemiStatic = priorityItems.map(
      (i) => splitInventoryItem(i).semiStatic,
    );
    parts.push(`<items_desc>\n${toToon(itemsSemiStatic)}\n</items_desc>`);
  }

  // NPC 半静态信息
  if (priorityNpcs.length > 0) {
    const npcsSemiStatic = priorityNpcs.map(
      (n) => splitRelationship(n).semiStatic,
    );
    parts.push(`<npcs_desc>\n${toToon(npcsSemiStatic)}\n</npcs_desc>`);
  }

  // 地点半静态信息
  if (priorityLocations.length > 0) {
    const locsSemiStatic = priorityLocations.map(
      (l) => splitLocation(l).semiStatic,
    );
    parts.push(
      `<locations_desc>\n${toToon(locsSemiStatic)}\n</locations_desc>`,
    );
  }

  // 任务半静态信息
  if (priorityQuests.length > 0) {
    const questsSemiStatic = priorityQuests.map(
      (q) => splitQuest(q).semiStatic,
    );
    parts.push(`<quests_desc>\n${toToon(questsSemiStatic)}\n</quests_desc>`);
  }

  // 知识半静态信息
  if (priorityKnowledge.length > 0) {
    const knowledgeSemiStatic = priorityKnowledge.map(
      (k) => splitKnowledge(k).semiStatic,
    );
    parts.push(
      `<knowledge_desc>\n${toToon(knowledgeSemiStatic)}\n</knowledge_desc>`,
    );
  }

  // 技能半静态信息
  const prioritySkills = selectPriorityEntities(
    gameState.character.skills || [],
    alive.skills,
    limits.skills,
  );
  if (prioritySkills.length > 0) {
    const skillsSemiStatic = prioritySkills.map(
      (s) => splitSkill(s).semiStatic,
    );
    parts.push(`<skills_desc>\n${toToon(skillsSemiStatic)}\n</skills_desc>`);
  }

  // 状态半静态信息
  const priorityConditions = selectPriorityEntities(
    gameState.character.conditions || [],
    alive.conditions,
    limits.conditions,
  );
  if (priorityConditions.length > 0) {
    const conditionsSemiStatic = priorityConditions.map(
      (c) => splitCondition(c).semiStatic,
    );
    parts.push(
      `<conditions_desc>\n${toToon(conditionsSemiStatic)}\n</conditions_desc>`,
    );
  }

  return parts.length > 0
    ? `\n<entities_descriptions>\n${parts.join("\n")}\n</entities_descriptions>`
    : "";
}

function buildEntitiesDynamicContext(
  gameState: GameState,
  limits: typeof DEFAULT_LIMITS,
  aliveEntities?: AliveEntities,
): string {
  const parts: string[] = [];
  const alive = aliveEntities || createEmptyAliveEntities();

  // 选择优先实体
  const priorityItems = selectPriorityEntities(
    gameState.inventory,
    alive.inventory,
    limits.inventory,
  );
  const priorityNpcs = selectPriorityEntities(
    gameState.relationships,
    alive.relationships,
    limits.relationships,
  );
  const priorityLocations = selectPriorityEntities(
    gameState.locations,
    alive.locations,
    limits.locations,
  );
  const priorityQuests = selectPriorityEntities(
    gameState.quests.filter((q) => q.status === "active"),
    alive.quests,
    limits.quests,
  );
  const priorityKnowledge = selectPriorityEntities(
    gameState.knowledge || [],
    alive.knowledge,
    limits.knowledge,
  );

  // 只包含有动态变化的字段
  // 物品动态信息
  const itemsDynamic = priorityItems
    .map((i) => splitInventoryItem(i).dynamic)
    .filter((d) => d.notes); // notes 是唯一的动态字段
  if (itemsDynamic.length > 0) {
    parts.push(`<items_state>\n${toToon(itemsDynamic)}\n</items_state>`);
  }

  // NPC 动态信息（好感度等）
  const npcsDynamic = priorityNpcs.map((n) => splitRelationship(n).dynamic);
  if (npcsDynamic.length > 0) {
    parts.push(`<npcs_state>\n${toToon(npcsDynamic)}\n</npcs_state>`);
  }

  // 地点动态信息
  const locsDynamic = priorityLocations
    .map((l) => splitLocation(l).dynamic)
    .filter((d) => d.isVisited || d.notes); // unlocked 已移到 semiStatic
  if (locsDynamic.length > 0) {
    parts.push(`<locations_state>\n${toToon(locsDynamic)}\n</locations_state>`);
  }

  // 任务动态信息
  const questsDynamic = priorityQuests.map((q) => splitQuest(q).dynamic);
  if (questsDynamic.length > 0) {
    parts.push(`<quests_state>\n${toToon(questsDynamic)}\n</quests_state>`);
  }

  // 知识动态信息
  const knowledgeDynamic = priorityKnowledge
    .map((k) => splitKnowledge(k).dynamic)
    .filter((d) => d.relatedTo); // unlocked 已移到 semiStatic
  if (knowledgeDynamic.length > 0) {
    parts.push(
      `<knowledge_state>\n${toToon(knowledgeDynamic)}\n</knowledge_state>`,
    );
  }

  // 技能动态信息
  const prioritySkills = selectPriorityEntities(
    gameState.character.skills || [],
    alive.skills,
    limits.skills,
  );
  const skillsDynamic = prioritySkills.map((s) => splitSkill(s).dynamic);
  if (skillsDynamic.length > 0) {
    parts.push(`<skills_state>\n${toToon(skillsDynamic)}\n</skills_state>`);
  }

  // 状态动态信息
  const priorityConditions = selectPriorityEntities(
    gameState.character.conditions || [],
    alive.conditions,
    limits.conditions,
  );
  const conditionsDynamic = priorityConditions.map(
    (c) => splitCondition(c).dynamic,
  );
  if (conditionsDynamic.length > 0) {
    parts.push(
      `<conditions_state>\n${toToon(conditionsDynamic)}\n</conditions_state>`,
    );
  }

  // 角色属性（高度动态）
  if (gameState.character.attributes?.length > 0) {
    const attrs = gameState.character.attributes.map((a) => ({
      label: a.label,
      value: a.value,
      max: a.maxValue,
    }));
    parts.push(
      `<character_attributes>\n${toToon(attrs)}\n</character_attributes>`,
    );
  }

  return parts.length > 0
    ? `\n<entities_state>\n${parts.join("\n")}\n</entities_state>`
    : "";
}

function buildCurrentStateContext(gameState: GameState): string {
  const currentLoc = gameState.locations.find(
    (l) =>
      l.id === gameState.currentLocation ||
      l.name === gameState.currentLocation,
  );

  return `
<current_state>
<turn>${gameState.turnNumber}</turn>
<fork>${gameState.forkId}</fork>
<time>${gameState.time || "Unknown"}</time>
<location id="${gameState.currentLocation}">${currentLoc?.name || gameState.currentLocation}</location>
<atmosphere>${toToon(gameState.atmosphere)}</atmosphere>
</current_state>`;
}

function buildPendingConsequencesContext(gameState: GameState): string {
  const activeCausalChains = (gameState.causalChains || []).filter(
    (c) =>
      c.status === "active" && c.pendingConsequences?.some((p) => !p.triggered),
  );

  if (activeCausalChains.length === 0) return "";

  const pendingInfo = activeCausalChains
    .map((chain) => ({
      chainId: chain.chainId,
      rootCause: chain.rootCause.description,
      pending: chain.pendingConsequences
        ?.filter(
          (p) => !p.triggered && p.readyAfterTurn < (gameState.turnNumber || 0),
        )
        .map((p) => ({
          id: p.id,
          description: p.description,
          readyAfter: p.readyAfterTurn,
          conditions: p.conditions,
        })),
    }))
    .filter((c) => c.pending && c.pending.length > 0);

  if (pendingInfo.length === 0) return "";

  return `
<pending_consequences>
${toToon(pendingInfo)}
</pending_consequences>`;
}

function buildGodModeContext(): string {
  return `
<god_mode>
GOD MODE ACTIVE: Player has absolute power. All actions succeed. NPCs obey unconditionally.
</god_mode>`;
}

// ============================================================================
// 辅助函数
// ============================================================================

function createEmptyAliveEntities(): AliveEntities {
  return {
    inventory: [],
    relationships: [],
    locations: [],
    quests: [],
    knowledge: [],
    timeline: [],
    skills: [],
    conditions: [],
    hiddenTraits: [],
    causalChains: [],
  };
}

/**
 * 选择优先实体
 * 1. alive 中标记的实体优先
 * 2. 剩余按 lastAccess 排序填充到限制
 *
 * 注意：lastAccess 可能是新的 AccessTimestamp 格式或旧的 number 格式
 */
function selectPriorityEntities<
  T extends {
    id?: string;
    lastAccess?: AccessTimestamp | Partial<AccessTimestamp>;
  },
>(items: T[], aliveIds: string[], limit: number): T[] {
  const aliveSet = new Set(aliveIds);

  // 分离 alive 和非 alive 实体
  const aliveItems = items.filter((item) => aliveSet.has(item.id || ""));
  const nonAliveItems = items
    .filter((item) => !aliveSet.has(item.id || ""))
    .sort((a, b) => {
      // 兼容旧数据：将 Partial<AccessTimestamp> 转换为完整类型用于比较
      const aAccess = a.lastAccess as AccessTimestamp | undefined;
      const bAccess = b.lastAccess as AccessTimestamp | undefined;
      return compareAccessTimestamp(bAccess, aAccess);
    });

  // 如果 alive 已超过限制，返回所有 alive
  if (aliveItems.length >= limit) {
    return aliveItems;
  }

  // 填充剩余空间
  const remainingSlots = limit - aliveItems.length;
  return [...aliveItems, ...nonAliveItems.slice(0, remainingSlots)];
}

// ============================================================================
// 导出完整的 Prompt 构建函数
// ============================================================================

/**
 * 构建优化的完整 Prompt
 *
 * 结构：
 * [System Instruction] - 静态
 * [World Outline] - 静态
 * [Character Base] - 静态
 * [Entities Static] - 静态
 * --- 前缀缓存分界线 ---
 * [Story Summary] - 半静态
 * [Entities Descriptions] - 半静态
 * --- 半静态分界线 ---
 * [Current State] - 动态
 * [Entities State] - 动态
 * [Recent Narrative] - 动态
 * [Pending Consequences] - 动态
 */
export function buildOptimizedPrompt(
  systemInstruction: string,
  options: ContextBuilderOptions,
): string {
  const layers = buildLayeredContext(options);

  return `${systemInstruction}

<!-- STATIC CONTEXT START - Prefix Cache Friendly -->
${layers.staticLayer}
<!-- STATIC CONTEXT END -->

<!-- SEMI-STATIC CONTEXT START -->
${layers.semiStaticLayer}
<!-- SEMI-STATIC CONTEXT END -->

<!-- DYNAMIC CONTEXT START -->
${layers.dynamicLayer}
<!-- DYNAMIC CONTEXT END -->`;
}
