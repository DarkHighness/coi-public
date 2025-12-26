# Rule Priority System (规则优先级)

> 当规则冲突时，高层级优先。这是本体论层级。

## 层级定义

| Level  | 名称        | 描述                    | 覆盖条件          | 示例                     |
| ------ | ----------- | ----------------------- | ----------------- | ------------------------ |
| **L0** | METAPHYSICS | 不可撤销的公理          | Nothing           | 时间单向、因果律、同一律 |
| **L1** | PHYSICS     | 世界设定决定的物理规则  | 魔法系统/体裁设定 | 重力、材料交互、能量守恒 |
| **L2** | BIOLOGY     | 种族/物种决定的生理规则 | 物种特性          | 饥饿、疲劳、死亡         |
| **L3** | PSYCHOLOGY  | 个体决定的心理规则      | 角色特质          | 动机、记忆、情绪         |
| **L4** | SOCIETY     | 文化决定的社会规则      | 情境/文化         | 阶级、契约、禁忌         |
| **L5** | NARRATIVE   | 风格决定的叙事规则      | 总是最低优先级    | 节奏、张力、美学         |

---

## 冲突解决原则

### 示例 1: 史诗场面 vs 物理规则

- **场景**: 主角想跳过50米的悬崖以达成史诗效果
- **冲突**: NARRATIVE (L5) vs PHYSICS (L1)
- **解决**: L1 优先 → 主角无法跳过，必须找其他方法

### 示例 2: 角色动机 vs 生物需求

- **场景**: 饥饿的 NPC 想要帮助主角，但食物在敌人手中
- **冲突**: PSYCHOLOGY (L3) vs BIOLOGY (L2)
- **解决**: L2 优先 → NPC 可能优先考虑生存，但这不是绝对的

### 示例 3: 社会规范 vs 个人情感

- **场景**: 王子爱上平民，但皇室禁止通婚
- **冲突**: PSYCHOLOGY (L3) vs SOCIETY (L4)
- **解决**: 这是个人选择 → 创造戏剧张力，但不自动解决

---

## 规则分布索引

### Level 0: METAPHYSICS

- `temporal.ts`: 时间不可逆性、因果律
- `core_rules.ts`: 本体论层级定义

### Level 1: PHYSICS

- `core_rules.ts`: 世界一致性、物理规则
- `mechanics.ts`: 伤害一致性

### Level 2: BIOLOGY

- `npc_logic.ts`: 生物需求 (饥饿/疲劳)
- `mechanics.ts`: 疼痛物理化

### Level 3: PSYCHOLOGY

- `npc_logic.ts`: NPC 心理、动机、记忆
- `identity.ts`: 主角心理约束

### Level 4: SOCIETY

- `core_rules.ts`: 社会动态、阶级系统
- `npc_logic.ts`: 社交网络、声誉

### Level 5: NARRATIVE

- `writing_craft.ts`: 所有叙事规则
- `mechanics.ts`: 氛围、对话风格
