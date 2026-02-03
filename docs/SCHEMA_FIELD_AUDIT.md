# ZodSchema 字段使用情况审计报告

> 生成日期: 2025-12-02
> 更新日期: 2025-12-02
> 审计范围: zodSchemas.ts 中定义的所有实体字段在 Tools, RAG, Sidebar UI, GameStateViewer 中的使用情况

## 目录

- [总体评估](#总体评估)
- [发现的问题](#发现的问题)
- [已修复的问题](#已修复的问题)
- [各实体字段详细分析](#各实体字段详细分析)
  - [InventoryItem (物品)](#inventoryitem-物品)
  - [Relationship (NPC关系)](#relationship-npc关系)
  - [Location (地点)](#location-地点)
  - [Quest (任务)](#quest-任务)
  - [Skill (技能)](#skill-技能)
  - [Condition (状态)](#condition-状态)
  - [KnowledgeEntry (知识)](#knowledgeentry-知识)
  - [TimelineEvent (时间线事件)](#timelineevent-时间线事件)
  - [Faction (阵营)](#faction-阵营)
  - [HiddenTrait (隐藏特质)](#hiddentrait-隐藏特质)
  - [CharacterAttribute (角色属性)](#characterattribute-角色属性)
- [运行良好的部分](#运行良好的部分)
- [最佳实践建议](#最佳实践建议)

---

## 总体评估

✅ **大部分 schema 字段都被正确使用**

经过详细审计，发现：

- 所有核心实体的双层结构 (visible/hidden) 在各组件中正确实现
- `unlocked` 机制在所有面板中正确工作
- `tools.ts` 和 `gameDatabase.ts` 完整覆盖了所有字段的 CRUD 操作
- `GameStateViewer.tsx` 提供了完整的状态查看功能

---

## 发现的问题

### 🔴 UI 字段缺失 (已修复)

| 组件                                 | 缺失字段                                  | 状态      |
| ------------------------------------ | ----------------------------------------- | --------- |
| `RelationshipPanel.tsx`              | `hidden.inventory`                        | ✅ 已修复 |
| `CharacterPanel.tsx` - SkillItem     | `category`                                | ✅ 已修复 |
| `CharacterPanel.tsx` - ConditionItem | `effects.visible`                         | ✅ 已修复 |
| `TimelineEventsPanel.tsx`            | `category`, `involvedEntities`, `chainId` | ✅ 已修复 |

### 🔴 RAG 提取函数缺失 (已修复)

| 实体类型             | 状态                                    |
| -------------------- | --------------------------------------- |
| `Skill`              | ✅ 已添加 `extractSkillContent()`       |
| `Condition`          | ✅ 已添加 `extractConditionContent()`   |
| `HiddenTrait`        | ✅ 已添加 `extractHiddenTraitContent()` |
| `CharacterAttribute` | ✅ 已添加 `extractAttributeContent()`   |
| `Faction`            | ✅ 已添加 `extractFactionContent()`     |

### 🟡 RAG 字段缺失 (已修复)

所有实体的 `icon` 字段已被添加到 RAG 文档提取中：

- `extractNPCContent()` - ✅ 已添加 `<icon>`
- `extractLocationContent()` - ✅ 已添加 `<icon>`
- `extractItemContent()` - ✅ 已添加 `<icon>`
- `extractKnowledgeContent()` - ✅ 已添加 `<icon>`
- `extractQuestContent()` - ✅ 已添加 `<icon>`
- `extractEventContent()` - ✅ 已添加 `<icon>`, `<involved_entities>`, `<chain_id>`

### 🟡 Tools 字段缺失 (已修复)

| 工具                               | 缺失字段 | 状态      |
| ---------------------------------- | -------- | --------- |
| `UPDATE_FACTION_TOOL` (add action) | `icon`   | ✅ 已修复 |

### 🟡 翻译缺失 (已修复)

| 翻译键              | 中文     | 英文        | 状态      |
| ------------------- | -------- | ----------- | --------- |
| `timeline.involved` | 涉及实体 | Involved    | ✅ 已添加 |
| `timeline.chain`    | 因果链   | Chain       | ✅ 已添加 |
| `hidden.inventory`  | 已知物品 | Possessions | ✅ 已添加 |

---

## 已修复的问题

### 1. RelationshipPanel - hidden.inventory ✅

**文件**: `src/components/sidebar/RelationshipPanel.tsx`

**修复内容**: 在 NPC 隐藏信息区域添加了 `hidden.inventory` 的显示

```tsx
{
  rel.hidden?.inventory && rel.hidden.inventory.length > 0 && (
    <div className="mt-2">
      <span className="text-[9px] uppercase tracking-wider text-theme-primary/80 block mb-0.5">
        {t("hidden.inventory") || "Possessions"}:
      </span>
      <ul className="list-disc list-inside text-theme-text space-y-0.5">
        {rel.hidden.inventory.map((item, i) => (
          <li key={i}>
            <MarkdownText content={item} indentSize={2} inline />
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 2. CharacterPanel - Skill category ✅

**文件**: `src/components/sidebar/CharacterPanel.tsx`

**修复内容**: 在 SkillItem 组件中添加了 `category` 字段的显示

```tsx
<div className="flex items-center gap-2">
  {skill.category && (
    <span className="text-[10px] text-theme-muted bg-theme-bg/50 px-1.5 py-0.5 rounded border border-theme-border/30 whitespace-nowrap">
      {skill.category}
    </span>
  )}
  {skill.level && (
    <span className="text-xs text-theme-primary ...">{skill.level}</span>
  )}
</div>
```

### 3. CharacterPanel - Condition effects.visible ✅

**文件**: `src/components/sidebar/CharacterPanel.tsx`

**修复内容**: 在 ConditionItem 组件中添加了 `effects.visible` 字段的显示

> **注意**: `duration` 字段只存在于 `gameResponseSchema.characterUpdates.conditions` 中用于更新时传递，
> 但不存在于基础的 `conditionSchema` 类型中，因此 UI 不应显示该字段。

```tsx
{
  /* Visible Effects */
}
{
  condition.effects?.visible && condition.effects.visible.length > 0 && (
    <div>
      <span className="text-[10px] uppercase tracking-wider opacity-80 block mb-1">
        {t("effects") || "Effects"}:
      </span>
      <ul className="list-disc list-inside space-y-0.5 text-xs opacity-90">
        {condition.effects.visible.map((effect, i) => (
          <li key={i}>
            <MarkdownText content={effect} indentSize={2} inline />
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 4. TimelineEventsPanel - category, involvedEntities, chainId ✅

**文件**: `src/components/sidebar/TimelineEventsPanel.tsx`

**修复内容**:

- 添加了 `category` 显示在时间戳旁边
- 添加了 `involvedEntities` 列表显示
- 添加了 `chainId` 显示

```tsx
{
  /* Category Badge */
}
{
  event.category && (
    <span className="text-[9px] uppercase tracking-wider text-theme-muted bg-theme-surface/50 px-1.5 py-0.5 rounded border border-theme-border/20">
      {event.category.replace("_", " ")}
    </span>
  );
}

{
  /* Involved Entities */
}
{
  event.involvedEntities && event.involvedEntities.length > 0 && (
    <div className="mt-2 pt-2 border-t border-theme-border/20">
      <span className="text-[9px] uppercase tracking-wider text-theme-muted block mb-1">
        {t("timeline.involved") || "Involved"}:
      </span>
      <div className="flex flex-wrap gap-1">
        {event.involvedEntities.map((entityId, idx) => (
          <span
            key={idx}
            className="text-[10px] text-theme-text/70 bg-theme-bg/30 px-1.5 py-0.5 rounded border border-theme-border/20"
          >
            {entityId}
          </span>
        ))}
      </div>
    </div>
  );
}

{
  /* Chain ID */
}
{
  event.chainId && (
    <div className="mt-1 flex items-center gap-1.5">
      <span className="text-[9px] uppercase tracking-wider text-theme-muted">
        {t("timeline.chain") || "Chain"}:
      </span>
      <span className="text-[10px] text-theme-primary/70 font-mono">
        {event.chainId}
      </span>
    </div>
  );
}
```

### 5. RAG 提取函数补全 ✅

**文件**: `src/hooks/useRAG.ts`

**修复内容**:

1. **添加新的实体类型支持**:
   - `extractSkillContent()` - 提取技能信息
   - `extractConditionContent()` - 提取状态/条件信息
   - `extractHiddenTraitContent()` - 提取隐藏特质信息
   - `extractAttributeContent()` - 提取角色属性信息
   - `extractFactionContent()` - 提取阵营/派系信息

2. **补充 icon 字段到所有现有提取函数**:
   - `extractNPCContent()` - 添加 `<icon>` 标签
   - `extractLocationContent()` - 添加 `<icon>` 标签
   - `extractItemContent()` - 添加 `<icon>` 标签
   - `extractKnowledgeContent()` - 添加 `<icon>` 标签
   - `extractQuestContent()` - 添加 `<icon>` 标签
   - `extractEventContent()` - 添加 `<icon>`, `<involved_entities>`, `<chain_id>` 标签

3. **更新 `extractDocumentsFromState()` 添加新的 case 处理**:
   - `skill:*` - 技能提取
   - `cond:*` / `condition:*` - 状态提取
   - `trait:*` - 隐藏特质提取
   - `attr:*` / `attribute:*` - 属性提取
   - `fac:*` / `faction:*` - 阵营提取

### 6. Tools.ts 修复 ✅

**文件**: `src/services/tools.ts`

**修复内容**: 在 `UPDATE_FACTION_TOOL` 的 `add` action 中添加了缺失的 `icon` 字段

```typescript
// Add action - 添加 icon 字段
z.object({
  action: z.literal("add"),
  // ...其他字段
  icon: z
    .string()
    .optional()
    .describe("A single emoji representing this faction."),
}),
```

### 7. 翻译文件补全 ✅

**文件**: `src/locales/en/translation.json` 和 `src/locales/zh/translation.json`

**修复内容**: 添加了缺失的翻译键

- `timeline.involved` - 涉及实体 / Involved
- `timeline.chain` - 因果链 / Chain
- `hidden.inventory` - 已知物品 / Possessions

---

## 各实体字段详细分析

### InventoryItem (物品)

| Schema 字段              |  Tools   |     RAG     | Sidebar UI | GameStateViewer |
| ------------------------ | :------: | :---------: | :--------: | :-------------: |
| `id`                     |    ✅    |     ✅      |     ✅     |       ✅        |
| `name`                   |    ✅    |     ✅      |     ✅     |       ✅        |
| `visible.description`    |    ✅    |     ✅      |     ✅     |       ✅        |
| `visible.quantity`       |    ✅    |     ✅      |     ✅     |       ✅        |
| `visible.equippable`     |    ✅    |     ✅      |     ✅     |       ✅        |
| `visible.category`       |    ✅    |     ✅      |     ✅     |       ✅        |
| `hidden.trueDescription` |    ✅    |     ✅      |     ✅     |       ✅        |
| `hidden.properties`      |    ✅    |     ✅      |     ✅     |       ✅        |
| `hidden.origin`          |    ✅    |     ✅      |     ✅     |       ✅        |
| `lore`                   |    ✅    |     ✅      |     ✅     |       ✅        |
| `unlocked`               |    ✅    |     ✅      |     ✅     |       ✅        |
| `icon`                   |    ✅    | ✅ (已修复) |     ✅     |       ✅        |
| `highlight`              |   N/A    |     N/A     |     ✅     |       ✅        |
| `createdAt`              | 系统自动 |     N/A     |     -      |        -        |
| `modifiedAt`             | 系统自动 |     N/A     |     -      |        -        |
| `lastAccess`             | 系统自动 |     N/A     |     -      |        -        |

### Relationship (NPC关系)

| Schema 字段                | Tools |     RAG     | Sidebar UI  | GameStateViewer |
| -------------------------- | :---: | :---------: | :---------: | :-------------: |
| `id`                       |  ✅   |     ✅      |     ✅      |       ✅        |
| `visible.name`             |  ✅   |     ✅      |     ✅      |       ✅        |
| `visible.description`      |  ✅   |     ✅      |     ✅      |       ✅        |
| `visible.relationshipType` |  ✅   |     ✅      |     ✅      |       ✅        |
| `visible.affinity`         |  ✅   |     ✅      |     ✅      |       ✅        |
| `visible.currentLocation`  |  ✅   |     ✅      |     ✅      |       ✅        |
| `hidden.status`            |  ✅   |     ✅      |     ✅      |       ✅        |
| `hidden.trueDisposition`   |  ✅   |     ✅      |     ✅      |       ✅        |
| `hidden.secrets`           |  ✅   |     ✅      |     ✅      |       ✅        |
| `hidden.goals`             |  ✅   |     ✅      |     ✅      |       ✅        |
| `hidden.background`        |  ✅   |     ✅      |     ✅      |       ✅        |
| `hidden.inventory`         |  ✅   |     ✅      | ✅ (已修复) |       ✅        |
| `notes`                    |  ✅   |     ✅      |     ✅      |       ✅        |
| `unlocked`                 |  ✅   |     ✅      |     ✅      |       ✅        |
| `known`                    |  ✅   |     ✅      |  ✅ (过滤)  |       ✅        |
| `icon`                     |  ✅   | ✅ (已修复) |     ✅      |       ✅        |
| `highlight`                |  N/A  |     N/A     |     ✅      |       ✅        |

### Location (地点)

| Schema 字段             | Tools |     RAG     | Sidebar UI | GameStateViewer |
| ----------------------- | :---: | :---------: | :--------: | :-------------: |
| `id`                    |  ✅   |     ✅      |     ✅     |       ✅        |
| `name`                  |  ✅   |     ✅      |     ✅     |       ✅        |
| `visible.description`   |  ✅   |     ✅      |     ✅     |       ✅        |
| `visible.features`      |  ✅   |     ✅      |     ✅     |       ✅        |
| `visible.atmosphere`    |  ✅   |     ✅      |     ✅     |       ✅        |
| `hidden.secrets`        |  ✅   |     ✅      |     ✅     |       ✅        |
| `hidden.dangers`        |  ✅   |     ✅      |     ✅     |       ✅        |
| `hidden.hiddenFeatures` |  ✅   |     ✅      |     ✅     |       ✅        |
| `hidden.connections`    |  ✅   |     ✅      |     ✅     |       ✅        |
| `lore`                  |  ✅   |     ✅      |     ✅     |       ✅        |
| `environment`           |  ✅   |     ✅      |     ✅     |       ✅        |
| `notes`                 |  ✅   |     ✅      |     ✅     |       ✅        |
| `unlocked`              |  ✅   |     ✅      |     ✅     |       ✅        |
| `isVisited`             |  ✅   |     ✅      | ✅ (过滤)  |       ✅        |
| `icon`                  |  ✅   | ✅ (已修复) |     ✅     |       ✅        |

### Quest (任务)

| Schema 字段            | Tools |     RAG     | Sidebar UI | GameStateViewer |
| ---------------------- | :---: | :---------: | :--------: | :-------------: |
| `id`                   |  ✅   |     ✅      |     ✅     |       ✅        |
| `title`                |  ✅   |     ✅      |     ✅     |       ✅        |
| `type`                 |  ✅   |     ✅      |     ✅     |       ✅        |
| `visible.description`  |  ✅   |     ✅      |     ✅     |       ✅        |
| `visible.objectives`   |  ✅   |     ✅      |     ✅     |       ✅        |
| `visible.rewards`      |  ✅   |     ✅      |     ✅     |       ✅        |
| `hidden.trueObjective` |  ✅   |     ✅      |     ✅     |       ✅        |
| `hidden.consequences`  |  ✅   |     ✅      |     ✅     |       ✅        |
| `hidden.secretRewards` |  ✅   |     ✅      |     ✅     |       ✅        |
| `status`               |  ✅   |     ✅      |     ✅     |       ✅        |
| `unlocked`             |  ✅   |     ✅      |     ✅     |       ✅        |
| `icon`                 |  ✅   | ✅ (已修复) |     ✅     |       ✅        |

### Skill (技能)

| Schema 字段              | Tools |     RAG     | Sidebar UI  | GameStateViewer |
| ------------------------ | :---: | :---------: | :---------: | :-------------: |
| `id`                     |  ✅   | ✅ (已添加) |      -      |       ✅        |
| `name`                   |  ✅   | ✅ (已添加) |     ✅      |       ✅        |
| `level`                  |  ✅   | ✅ (已添加) |     ✅      |       ✅        |
| `visible.description`    |  ✅   | ✅ (已添加) |     ✅      |       ✅        |
| `hidden.trueDescription` |  ✅   | ✅ (已添加) |     ✅      |       ✅        |
| `hidden.hiddenEffects`   |  ✅   | ✅ (已添加) |     ✅      |       ✅        |
| `hidden.drawbacks`       |  ✅   | ✅ (已添加) |     ✅      |       ✅        |
| `category`               |  ✅   | ✅ (已添加) | ✅ (已修复) |       ✅        |
| `unlocked`               |  ✅   | ✅ (已添加) |     ✅      |       ✅        |
| `icon`                   |  ✅   | ✅ (已添加) |     ✅      |       ✅        |
| `highlight`              |  N/A  |     N/A     |     ✅      |       ✅        |

### Condition (状态)

| Schema 字段                 | Tools | RAG | Sidebar UI  | GameStateViewer |
| --------------------------- | :---: | :-: | :---------: | :-------------: |
| `id`                        |  ✅   | ✅  |      -      |       ✅        |
| `name`                      |  ✅   | ✅  |     ✅      |       ✅        |
| `type`                      |  ✅   | ✅  |  ✅ (样式)  |       ✅        |
| `visible.description`       |  ✅   | ✅  |     ✅      |       ✅        |
| `visible.perceivedSeverity` |  ✅   | ✅  |     ✅      |       ✅        |
| `hidden.trueCause`          |  ✅   | ✅  |     ✅      |       ✅        |
| `hidden.actualSeverity`     |  ✅   | ✅  |     ✅      |       ✅        |
| `hidden.progression`        |  ✅   | ✅  |     ✅      |       ✅        |
| `hidden.cure`               |  ✅   | ✅  |     ✅      |       ✅        |
| `effects.visible`           |  ✅   | ✅  | ✅ (已修复) |       ✅        |
| `effects.hidden`            |  ✅   | ✅  |     ✅      |       ✅        |
| `startTime`                 |  ✅   | ✅  |     ✅      |       ✅        |
| `severity`                  |  ✅   | ✅  |     ✅      |       ✅        |
| `unlocked`                  |  ✅   | ✅  |     ✅      |       ✅        |
| `icon`                      |  ✅   | ✅  |     ✅      |       ✅        |
| `highlight`                 |  N/A  | N/A |     ✅      |       ✅        |

> **注意**: `duration` 字段仅存在于 `gameResponseSchema.characterUpdates.conditions` 中，用于 AI 更新 condition 时传递持续时间信息，但不存在于基础的 `conditionSchema` 类型中。

### KnowledgeEntry (知识)

| Schema 字段             | Tools |     RAG     | Sidebar UI | GameStateViewer |
| ----------------------- | :---: | :---------: | :--------: | :-------------: |
| `id`                    |  ✅   |     ✅      |     ✅     |       ✅        |
| `title`                 |  ✅   |     ✅      |     ✅     |       ✅        |
| `category`              |  ✅   |     ✅      |     ✅     |       ✅        |
| `visible.summary`       |  ✅   |     ✅      |     ✅     |       ✅        |
| `visible.details`       |  ✅   |     ✅      |     ✅     |       ✅        |
| `hidden.fullTruth`      |  ✅   |     ✅      |     ✅     |       ✅        |
| `hidden.misconceptions` |  ✅   |     ✅      |     ✅     |       ✅        |
| `hidden.toBeRevealed`   |  ✅   |     ✅      |     ✅     |       ✅        |
| `discoveredAt`          |  ✅   |     ✅      |     ✅     |       ✅        |
| `relatedTo`             |  ✅   |     ✅      |     ✅     |       ✅        |
| `unlocked`              |  ✅   |     ✅      |     ✅     |       ✅        |
| `icon`                  |  ✅   | ✅ (已修复) |     ✅     |       ✅        |

### TimelineEvent (时间线事件)

| Schema 字段              | Tools |     RAG     | Sidebar UI  | GameStateViewer |
| ------------------------ | :---: | :---------: | :---------: | :-------------: |
| `id`                     |  ✅   |     ✅      |     ✅      |       ✅        |
| `gameTime`               |  ✅   |     ✅      |     ✅      |       ✅        |
| `category`               |  ✅   |     ✅      | ✅ (已修复) |       ✅        |
| `visible.description`    |  ✅   |     ✅      |     ✅      |       ✅        |
| `visible.causedBy`       |  ✅   |     ✅      |     ✅      |       ✅        |
| `hidden.trueDescription` |  ✅   |     ✅      |     ✅      |       ✅        |
| `hidden.trueCausedBy`    |  ✅   |     ✅      |     ✅      |       ✅        |
| `hidden.consequences`    |  ✅   |     ✅      |     ✅      |       ✅        |
| `involvedEntities`       |  ✅   | ✅ (已修复) | ✅ (已修复) |       ✅        |
| `chainId`                |  ✅   | ✅ (已修复) | ✅ (已修复) |       ✅        |
| `unlocked`               |  ✅   |     ✅      |     ✅      |       ✅        |
| `known`                  |  ✅   |     ✅      |  ✅ (过滤)  |       ✅        |
| `icon`                   |  ✅   | ✅ (已修复) |     ✅      |       ✅        |

### Faction (阵营)

| Schema 字段         |    Tools    | RAG | Sidebar UI | GameStateViewer |
| ------------------- | :---------: | :-: | :--------: | :-------------: |
| `id`                |     ✅      | ✅  |     -      |       ✅        |
| `name`              |     ✅      | ✅  |     ✅     |       ✅        |
| `visible.agenda`    |     ✅      | ✅  |     ✅     |       ✅        |
| `visible.members`   |     ✅      | ✅  |     ✅     |       ✅        |
| `visible.influence` |     ✅      | ✅  |     ✅     |       ✅        |
| `visible.relations` |     ✅      | ✅  |     ✅     |       ✅        |
| `hidden.agenda`     |     ✅      | ✅  |     ✅     |       ✅        |
| `hidden.members`    |     ✅      | ✅  |     ✅     |       ✅        |
| `hidden.influence`  |     ✅      | ✅  |     ✅     |       ✅        |
| `hidden.relations`  |     ✅      | ✅  |     ✅     |       ✅        |
| `unlocked`          |     ✅      | ✅  |     ✅     |       ✅        |
| `icon`              | ✅ (已修复) | ✅  |     ✅     |       ✅        |
| `highlight`         |     N/A     | N/A |     ✅     |       ✅        |

### HiddenTrait (隐藏特质)

| Schema 字段         | Tools |     RAG     | Sidebar UI | GameStateViewer |
| ------------------- | :---: | :---------: | :--------: | :-------------: |
| `id`                |  ✅   | ✅ (已添加) |     -      |       ✅        |
| `name`              |  ✅   | ✅ (已添加) |     ✅     |       ✅        |
| `description`       |  ✅   | ✅ (已添加) |     ✅     |       ✅        |
| `effects`           |  ✅   | ✅ (已添加) |     ✅     |       ✅        |
| `triggerConditions` |  ✅   | ✅ (已添加) |     ✅     |       ✅        |
| `unlocked`          |  ✅   | ✅ (已添加) | ✅ (过滤)  |       ✅        |
| `icon`              |  ✅   | ✅ (已添加) |     ✅     |       ✅        |
| `highlight`         |  N/A  |     N/A     |     ✅     |       ✅        |

### CharacterAttribute (角色属性)

| Schema 字段 | Tools |     RAG     | Sidebar UI | GameStateViewer |
| ----------- | :---: | :---------: | :--------: | :-------------: |
| `label`     |  ✅   | ✅ (已添加) |     ✅     |       ✅        |
| `value`     |  ✅   | ✅ (已添加) |     ✅     |       ✅        |
| `maxValue`  |  ✅   | ✅ (已添加) |     ✅     |       ✅        |
| `color`     |  ✅   | ✅ (已添加) |     ✅     |       ✅        |
| `icon`      |  ✅   | ✅ (已添加) |     ✅     |       ✅        |

---

## 运行良好的部分

### ✅ 核心架构

1. **zodSchemas.ts**:
   - 完整的 schema 定义 (~1200 行)
   - 双层结构 (visible/hidden) 设计良好
   - 预编译的 Gemini/OpenAI schemas

2. **tools.ts**:
   - VFS 文件工具（`vfs_*`）
   - 总结工具（`summary_query_*` / `finish_summary`）

3. **gameDatabase.ts**:
   - 完整的 CRUD 操作
   - `mergeWithNullDeletion` 支持增量更新
   - 版本化时间戳追踪

4. **GameStateViewer.tsx**:
   - 完整的状态查看 (~2000 行)
   - 支持所有实体类型
   - 隐藏/可见层切换

### ✅ UI 组件设计

1. **双层信息展示**: 所有面板正确实现了 visible/hidden 切换
2. **Unlocked 机制**: 根据 `unlocked` 状态显示隐藏信息
3. **Highlight 动画**: 新增/修改的实体有脉冲高亮效果
4. **展开/收起**: 所有面板支持内容折叠

---

## 最佳实践建议

### 添加新字段时的检查清单

当在 `zodSchemas.ts` 中添加新字段时，请确保：

1. [ ] **tools.ts**: 在相关的查询/更新工具中添加字段支持
2. [ ] **gameDatabase.ts**: 在对应的 modify 函数中处理字段
3. [ ] **useRAG.ts**: 在对应的 extract 函数中添加字段
4. [ ] **Sidebar Panel**: 在对应的 UI 组件中显示字段
5. [ ] **GameStateViewer.tsx**: 在完整视图中显示字段
6. [ ] **翻译文件**: 在 `locales/en/translation.json` 和 `locales/zh/translation.json` 中添加字段标签

### 字段类型说明

| 字段类型    | 说明                        | 例子                                             |
| ----------- | --------------------------- | ------------------------------------------------ |
| 系统字段    | 自动生成，AI 不设置         | `id`, `createdAt`, `modifiedAt`, `lastAccess`    |
| AI 控制字段 | AI 决定值                   | `visible.*`, `hidden.*`, `unlocked`, `highlight` |
| 混合字段    | AI 设置初始值，系统可能覆盖 | `status`, `affinity`                             |

---

> **维护说明**: 此文档应在每次 schema 变更后更新。建议在 CI/CD 中添加自动化检查脚本。
